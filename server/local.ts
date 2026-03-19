/**
 * Local development server. Mocks Reddit context and Redis so you can run
 * the app on localhost. Use LOCAL_USERNAME or header x-mock-username to set user.
 */
import express from 'express';
import { BURGERS_PER_RUN, OUTCOME_COOKED, OUTCOME_BURNT, type Outcome } from './shared/constants.js';
import { randomOutcome, computeTurnScore, countCountingAndCorrect, BONUS_TRIGGER_THRESHOLD } from './shared/gameLogic.js';

const PORT = Number(process.env.LOCAL_API_PORT) || 3001;
// Vite proxy must match: see vite.config.ts server.proxy['/api'].target

const app = express();
app.use(express.json());

const RUN_KEY_PREFIX = 'run:';
const LB_SCORES_KEY = 'lb:scores';

type RunState = {
  burgersUsed: number;
  totalScore: number;
  bestTurnScore: number;
  runId: number;
  /** Set when bonus is triggered; used by POST /api/run/bonus to apply multiplier. */
  pendingBonusTurnScore?: number;
};

type LeaderboardScoreEntry = {
  username: string;
  score: number;
  burgersUsed: number;
  bestTurnScore: number;
  timestamp: number;
};

function getMockUsername(req: express.Request): string {
  const fromHeader = req.headers['x-mock-username'] as string | undefined;
  if (fromHeader) return fromHeader;
  return process.env.LOCAL_USERNAME || 'local_test_user';
}

const runMap = new Map<string, string>();
let scoreLeaderboard: LeaderboardScoreEntry[] = [];

const redis = {
  get: async (key: string): Promise<string | undefined> => {
    if (key.startsWith(RUN_KEY_PREFIX)) return runMap.get(key) ?? undefined;
    if (key === LB_SCORES_KEY) return JSON.stringify(scoreLeaderboard);
    return undefined;
  },
  set: async (key: string, value: string): Promise<string> => {
    if (key.startsWith(RUN_KEY_PREFIX)) runMap.set(key, value);
    if (key === LB_SCORES_KEY) scoreLeaderboard = JSON.parse(value);
    return 'OK';
  },
  del: async (...keys: string[]): Promise<number> => {
    for (const key of keys) runMap.delete(key);
    return keys.length;
  },
};

/** POST /api/run/start */
app.post('/api/run/start', async (req, res) => {
  try {
    const username = getMockUsername(req);
    const runId = Date.now();
    const state: RunState = { burgersUsed: 0, totalScore: 0, bestTurnScore: 0, runId };
    await redis.set(`${RUN_KEY_PREFIX}${username}`, JSON.stringify(state));
    res.json({ runId, burgersRemaining: BURGERS_PER_RUN });
  } catch (e) {
    console.error('run/start error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/run */
app.get('/api/run', async (req, res) => {
  try {
    const username = getMockUsername(req);
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

/** POST /api/run/turn - body: { activeCells: { r, c }[], guesses: Outcome[] } */
app.post('/api/run/turn', async (req, res) => {
  try {
    const username = getMockUsername(req);
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
    for (let i = 0; i < burgersThisTurn; i++) outcomes.push(randomOutcome());
    const turnScore = computeTurnScore(activeCells, guesses, outcomes);
    const countingCorrect = countCountingAndCorrect(activeCells, guesses, outcomes);
    const bonusTriggered = countingCorrect >= BONUS_TRIGGER_THRESHOLD;
    if (bonusTriggered) state.pendingBonusTurnScore = turnScore;

    state.burgersUsed += burgersThisTurn;
    state.totalScore += turnScore;
    if (turnScore > state.bestTurnScore) state.bestTurnScore = turnScore;

    const runOver = state.burgersUsed >= BURGERS_PER_RUN;
    if (runOver && !bonusTriggered) {
      const list = [...scoreLeaderboard, {
        username,
        score: state.totalScore,
        burgersUsed: state.burgersUsed,
        bestTurnScore: state.bestTurnScore,
        timestamp: Date.now(),
      }];
      list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.burgersUsed !== b.burgersUsed) return a.burgersUsed - b.burgersUsed;
        return b.bestTurnScore - a.bestTurnScore;
      });
      scoreLeaderboard = list.slice(0, 10);
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

/** POST /api/run/bonus - apply bonus multiplier (1 + stacked items). Body: { multiplier: number }. */
app.post('/api/run/bonus', async (req, res) => {
  try {
    const username = getMockUsername(req);
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
      const list = [...scoreLeaderboard, {
        username: getMockUsername(req),
        score: state.totalScore,
        burgersUsed: state.burgersUsed,
        bestTurnScore: state.bestTurnScore,
        timestamp: Date.now(),
      }];
      list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.burgersUsed !== b.burgersUsed) return a.burgersUsed - b.burgersUsed;
        return b.bestTurnScore - a.bestTurnScore;
      });
      scoreLeaderboard = list.slice(0, 10);
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

/** GET /api/leaderboard - Patty Flipper top 10 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const entries = scoreLeaderboard.map((e, i) => ({
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

const server = app.listen(PORT, () => {
  console.log(`[local] Patty Flipper API at http://localhost:${PORT}`);
  console.log(`[local] Mock user: ${process.env.LOCAL_USERNAME || 'local_test_user'} (set LOCAL_USERNAME or x-mock-username)`);
});
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[local] Port ${PORT} is already in use. Stop the other process (e.g. \`lsof -ti :${PORT} | xargs kill -9\`) or set LOCAL_API_PORT to another port (e.g. 3002).`);
  } else {
    console.error('[local] Server error:', err);
  }
  process.exit(1);
});
