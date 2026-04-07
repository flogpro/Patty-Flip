/**
 * Shared Express routes for Patty Flipper (Devvit production server + local mock API).
 */
import { Router, type Request, type Response } from 'express';
import { BURGERS_PER_RUN, OUTCOME_COOKED, OUTCOME_BURNT, type Outcome } from './constants.js';
import { isFirstRoundBonusEligible } from './bonusTrigger.js';
import { randomOutcome, evaluateTurn } from './gameLogic.js';

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

export type PattyRedis = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<string>;
  /** Devvit client returns void; local mock returns key count. */
  del(...keys: string[]): Promise<number | void>;
};

function sortLeaderboard(a: LeaderboardScoreEntry, b: LeaderboardScoreEntry): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.burgersUsed !== b.burgersUsed) return a.burgersUsed - b.burgersUsed;
  return b.bestTurnScore - a.bestTurnScore;
}

async function mergeLeaderboard(redis: PattyRedis, entry: LeaderboardScoreEntry): Promise<void> {
  const lbRaw = await redis.get(LB_SCORES_KEY);
  let list: LeaderboardScoreEntry[] = lbRaw ? JSON.parse(lbRaw) : [];
  list.push(entry);
  list.sort(sortLeaderboard);
  list = list.slice(0, 10);
  await redis.set(LB_SCORES_KEY, JSON.stringify(list));
}

function parseTurnBody(
  activeCells: unknown,
  guesses: unknown,
  res: Response
): { activeCells: { r: number; c: number }[]; guesses: Outcome[] } | null {
  if (
    !Array.isArray(activeCells) ||
    !Array.isArray(guesses) ||
    activeCells.length !== guesses.length
  ) {
    res
      .status(400)
      .json({ error: 'Invalid turn; need activeCells array and guesses array of same length' });
    return null;
  }
  if (activeCells.length === 0 || activeCells.length > BURGERS_PER_RUN) {
    res.status(400).json({ error: 'Active cells must be between 1 and 100' });
    return null;
  }
  const cells: { r: number; c: number }[] = [];
  for (let i = 0; i < activeCells.length; i++) {
    const cell = activeCells[i] as { r?: unknown; c?: unknown };
    const r = cell.r;
    const c = cell.c;
    if (
      typeof r !== 'number' ||
      typeof c !== 'number' ||
      !Number.isInteger(r) ||
      r < 0 ||
      r > 4 ||
      !Number.isInteger(c) ||
      c < 0 ||
      c > 4
    ) {
      res.status(400).json({ error: 'Each cell must have r and c in 0-4 (5×5 grid)' });
      return null;
    }
    cells.push({ r, c });
  }
  const gArr: Outcome[] = [];
  for (let i = 0; i < guesses.length; i++) {
    const g = guesses[i];
    if (g !== OUTCOME_COOKED && g !== OUTCOME_BURNT) {
      res.status(400).json({ error: 'Each guess must be Cooked or Raw (internal: bun or patty)' });
      return null;
    }
    gArr.push(g);
  }
  return { activeCells: cells, guesses: gArr };
}

export function createPattyFlipperRouter(options: {
  getUsername: (req: Request) => string | null;
  redis: PattyRedis;
}): Router {
  const { getUsername, redis } = options;
  const router = Router();

  router.post('/run/start', async (_req: Request, res: Response) => {
    try {
      const username = getUsername(_req);
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

  router.get('/run', async (req: Request, res: Response) => {
    try {
      const username = getUsername(req);
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

  router.post('/run/turn', async (req: Request, res: Response) => {
    try {
      const username = getUsername(req);
      if (!username) {
        res.status(401).json({ error: 'Not logged in' });
        return;
      }
      const parsed = parseTurnBody(req.body?.activeCells, req.body?.guesses, res);
      if (!parsed) return;
      const { activeCells, guesses } = parsed;

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
      const { turnScore } = evaluateTurn(activeCells, guesses, outcomes);
      const bonusTriggered = isFirstRoundBonusEligible(guesses, outcomes);
      if (bonusTriggered) state.pendingBonusTurnScore = turnScore;

      state.burgersUsed += burgersThisTurn;
      state.totalScore += turnScore;
      if (turnScore > state.bestTurnScore) state.bestTurnScore = turnScore;

      const runOver = state.burgersUsed >= BURGERS_PER_RUN;
      if (runOver && !bonusTriggered) {
        await mergeLeaderboard(redis, {
          username,
          score: state.totalScore,
          burgersUsed: state.burgersUsed,
          bestTurnScore: state.bestTurnScore,
          timestamp: Date.now(),
        });
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
        bonusTriggered,
      });
    } catch (e) {
      console.error('run/turn error', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/run/bonus', async (req: Request, res: Response) => {
    try {
      const username = getUsername(req);
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
        await mergeLeaderboard(redis, {
          username,
          score: state.totalScore,
          burgersUsed: state.burgersUsed,
          bestTurnScore: state.bestTurnScore,
          timestamp: Date.now(),
        });
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

  router.get('/leaderboard', async (_req: Request, res: Response) => {
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

  return router;
}
