import express from 'express';
import {
  createServer,
  context,
  getServerPort,
  redis,
} from '@devvit/web/server';
import { BURGERS_PER_RUN, OUTCOME_COOKED, OUTCOME_BURNT, type Outcome } from './shared/constants.js';
import { randomOutcome, computeTurnScore, countCountingAndCorrect, BONUS_TRIGGER_THRESHOLD } from './shared/gameLogic.js';

const app = express();
app.use(express.json());

const RUN_KEY_PREFIX = 'run:';
const LB_SCORES_KEY = 'lb:scores';

type RunState = {
  burgersUsed: number;
  totalScore: number;
  bestTurnScore: number;
  runId: number;
  pendingBonusTurnScore?: number;
};

type LeaderboardScoreEntry = {
  username: string;
  score: number;
  burgersUsed: number;
  bestTurnScore: number;
  timestamp: number;
};

/** POST /api/run/start - start a new Patty Flipper run */
app.post('/api/run/start', async (req, res) => {
  try {
    const username = context.username;
    if (!username) {
      res.status(401).json({ error: 'Not logged in' });
      return;
    }
    const runId = Date.now();
    const state: RunState = {
      burgersUsed: 0,
      totalScore: 0,
      bestTurnScore: 0,
      runId,
    };
    await redis.set(`${RUN_KEY_PREFIX}${username}`, JSON.stringify(state));
    res.json({ runId, burgersRemaining: BURGERS_PER_RUN });
  } catch (e) {
    console.error('run/start error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/run - current run state */
app.get('/api/run', async (req, res) => {
  try {
    const username = context.username;
    if (!username) {
      res.status(401).json({ error: 'Not logged in' });
      return;
    }
    const raw = await redis.get(`${RUN_KEY_PREFIX}${username}`);
    if (!raw) {
      res.status(404).json({ error: 'No active run' });
      return;
    }
    const state = JSON.parse(raw) as RunState;
    res.json({
      burgersUsed: state.burgersUsed,
      totalScore: state.totalScore,
      bestTurnScore: state.bestTurnScore,
      runId: state.runId,
      burgersRemaining: BURGERS_PER_RUN - state.burgersUsed,
    });
  } catch (e) {
    console.error('run get error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/run/turn - body: { activeCells: { r, c }[], guesses: Outcome[] } (5×5 grid, r,c 0-4) */
app.post('/api/run/turn', async (req, res) => {
  try {
    const username = context.username;
    if (!username) {
      res.status(401).json({ error: 'Not logged in' });
      return;
    }
    const activeCells = req.body?.activeCells as { r: number; c: number }[] | undefined;
    const guesses = req.body?.guesses as Outcome[] | undefined;
    if (!Array.isArray(activeCells) || !Array.isArray(guesses) || activeCells.length !== guesses.length) {
      res.status(400).json({ error: 'Invalid turn; need activeCells array and guesses array of same length' });
      return;
    }
    if (activeCells.length === 0 || activeCells.length > BURGERS_PER_RUN) {
      res.status(400).json({ error: 'Active cells must be between 1 and 100' });
      return;
    }
    for (let i = 0; i < activeCells.length; i++) {
      const { r, c } = activeCells[i];
      if (!Number.isInteger(r) || r < 0 || r > 4 || !Number.isInteger(c) || c < 0 || c > 4) {
        res.status(400).json({ error: 'Each cell must have r and c in 0-4 (5×5 grid)' });
        return;
      }
    }
    for (let i = 0; i < guesses.length; i++) {
      if (guesses[i] !== OUTCOME_COOKED && guesses[i] !== OUTCOME_BURNT) {
        res.status(400).json({ error: 'Each guess must be "bun" or "patty"' });
        return;
      }
    }

    const runKey = `${RUN_KEY_PREFIX}${username}`;
    const raw = await redis.get(runKey);
    if (!raw) {
      res.status(404).json({ error: 'No active run; start one first' });
      return;
    }
    const state = JSON.parse(raw) as RunState;
    const burgersThisTurn = activeCells.length;
    if (state.burgersUsed + burgersThisTurn > BURGERS_PER_RUN) {
      res.status(400).json({ error: 'Not enough burgers remaining' });
      return;
    }

    const outcomes: Outcome[] = [];
    for (let i = 0; i < burgersThisTurn; i++) {
      outcomes.push(randomOutcome());
    }
    const turnScore = computeTurnScore(activeCells, guesses, outcomes);
    const countingCorrect = countCountingAndCorrect(activeCells, guesses, outcomes);
    const bonusTriggered = countingCorrect >= BONUS_TRIGGER_THRESHOLD;
    if (bonusTriggered) state.pendingBonusTurnScore = turnScore;

    state.burgersUsed += burgersThisTurn;
    state.totalScore += turnScore;
    if (turnScore > state.bestTurnScore) state.bestTurnScore = turnScore;

    const runOver = state.burgersUsed >= BURGERS_PER_RUN;
    if (runOver && !bonusTriggered) {
      const lbRaw = await redis.get(LB_SCORES_KEY);
      let list: LeaderboardScoreEntry[] = lbRaw ? JSON.parse(lbRaw) : [];
      list.push({
        username,
        score: state.totalScore,
        burgersUsed: state.burgersUsed,
        bestTurnScore: state.bestTurnScore,
        timestamp: Date.now(),
      });
      list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.burgersUsed !== b.burgersUsed) return a.burgersUsed - b.burgersUsed;
        return b.bestTurnScore - a.bestTurnScore;
      });
      list = list.slice(0, 10);
      await redis.set(LB_SCORES_KEY, JSON.stringify(list));
      await redis.del(runKey);
    } else {
      await redis.set(runKey, JSON.stringify(state));
    }

    res.json({
      outcomes,
      turnScore,
      totalScore: state.totalScore,
      burgersUsed: state.burgersUsed,
      burgersRemaining: BURGERS_PER_RUN - state.burgersUsed,
      runOver,
      bonusTriggered: bonusTriggered || undefined,
    });
  } catch (e) {
    console.error('run/turn error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/run/bonus - apply bonus multiplier. Body: { multiplier: number }. */
app.post('/api/run/bonus', async (req, res) => {
  try {
    const username = context.username;
    if (!username) {
      res.status(401).json({ error: 'Not logged in' });
      return;
    }
    const multiplier = Number(req.body?.multiplier);
    if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 200) {
      res.status(400).json({ error: 'Invalid multiplier (1–200)' });
      return;
    }
    const runKey = `${RUN_KEY_PREFIX}${username}`;
    const raw = await redis.get(runKey);
    if (!raw) {
      res.status(404).json({ error: 'No active run' });
      return;
    }
    const state = JSON.parse(raw) as RunState;
    const pending = state.pendingBonusTurnScore;
    if (pending == null) {
      res.status(400).json({ error: 'No pending bonus for this run' });
      return;
    }
    const bonusPoints = pending * (multiplier - 1);
    state.totalScore += bonusPoints;
    delete state.pendingBonusTurnScore;
    const runOver = state.burgersUsed >= BURGERS_PER_RUN;
    if (runOver) {
      const lbRaw = await redis.get(LB_SCORES_KEY);
      let list: LeaderboardScoreEntry[] = lbRaw ? JSON.parse(lbRaw) : [];
      list.push({
        username,
        score: state.totalScore,
        burgersUsed: state.burgersUsed,
        bestTurnScore: state.bestTurnScore,
        timestamp: Date.now(),
      });
      list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.burgersUsed !== b.burgersUsed) return a.burgersUsed - b.burgersUsed;
        return b.bestTurnScore - a.bestTurnScore;
      });
      list = list.slice(0, 10);
      await redis.set(LB_SCORES_KEY, JSON.stringify(list));
      await redis.del(runKey);
    } else {
      await redis.set(runKey, JSON.stringify(state));
    }
    res.json({
      totalScore: state.totalScore,
      bonusPoints,
      burgersUsed: state.burgersUsed,
      burgersRemaining: BURGERS_PER_RUN - state.burgersUsed,
    });
  } catch (e) {
    console.error('run/bonus error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/leaderboard - Patty Flipper top 10 by score (tie-break: burgersUsed asc, bestTurnScore desc) */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const raw = await redis.get(LB_SCORES_KEY);
    const list: LeaderboardScoreEntry[] = raw ? JSON.parse(raw) : [];
    const entries = list.map((e, i) => ({
      rank: i + 1,
      username: e.username,
      score: e.score,
      burgersUsed: e.burgersUsed,
      bestTurnScore: e.bestTurnScore,
    }));
    res.json({ entries });
  } catch (e) {
    console.error('leaderboard error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

const server = createServer(app);
const port = getServerPort();
server.listen(port, () => {
  console.log(`Patty Flipper server listening on port ${port}`);
});
