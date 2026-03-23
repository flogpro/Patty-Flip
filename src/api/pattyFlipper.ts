/**
 * Typed wrappers for Patty Flipper HTTP API (same routes in production and local mock).
 */
import type { Outcome } from 'shared/constants';
import { BURGERS_PER_RUN } from 'shared/constants';

export const SERVER_UNREACHABLE =
  "Can't reach the game server. If you're running locally, start the API with npm run dev:server, or run npm run dev to start both client and API.";

export const SERVER_UNREACHABLE_SHORT = "Can't reach the game server.";

type ApiErrorBody = { error?: string };

async function readJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export type RunApiPayload = {
  burgersUsed: number;
  totalScore: number;
  bestTurnScore: number;
  burgersRemaining: number;
};

/** GET /api/run — 404 means no active run (show start screen). */
export async function getRun(): Promise<
  { ok: true; data: RunApiPayload } | { ok: false; notFound: true } | { ok: false; network: true }
> {
  try {
    const res = await fetch('/api/run');
    if (!res.ok) {
      return { ok: false, notFound: true };
    }
    const d = await readJson<
      RunApiPayload & { burgersRemaining?: number; bestTurnScore?: number; runId?: number }
    >(res);
    return {
      ok: true,
      data: {
        burgersUsed: d.burgersUsed,
        totalScore: d.totalScore,
        bestTurnScore: d.bestTurnScore ?? 0,
        burgersRemaining: d.burgersRemaining ?? BURGERS_PER_RUN - d.burgersUsed,
      },
    };
  } catch {
    return { ok: false, network: true };
  }
}

/** POST /api/run/start */
export async function postStartRun(): Promise<
  { ok: true } | { ok: false; message: string } | { ok: false; network: true }
> {
  try {
    const res = await fetch('/api/run/start', { method: 'POST' });
    const data = await readJson<ApiErrorBody>(res);
    if (!res.ok) {
      return { ok: false, message: data.error || 'Failed to start run' };
    }
    return { ok: true };
  } catch {
    return { ok: false, network: true };
  }
}

export type TurnApiResponse = {
  outcomes: Outcome[];
  turnScore: number;
  totalScore: number;
  burgersUsed: number;
  burgersRemaining: number;
  runOver: boolean;
  bonusTriggered?: boolean;
};

/** POST /api/run/turn */
export async function postTurn(body: {
  activeCells: { r: number; c: number }[];
  guesses: Outcome[];
}): Promise<
  | { ok: true; data: TurnApiResponse }
  | { ok: false; message: string }
  | { ok: false; network: true }
> {
  try {
    const res = await fetch('/api/run/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await readJson<TurnApiResponse & ApiErrorBody>(res);
    if (!res.ok) {
      return { ok: false, message: data.error || 'Turn failed' };
    }
    return {
      ok: true,
      data: {
        outcomes: data.outcomes,
        turnScore: data.turnScore,
        totalScore: data.totalScore,
        burgersUsed: data.burgersUsed,
        burgersRemaining: data.burgersRemaining,
        runOver: data.runOver,
        bonusTriggered: data.bonusTriggered,
      },
    };
  } catch {
    return { ok: false, network: true };
  }
}

export type BonusApiResponse = {
  totalScore: number;
  burgersUsed: number;
  burgersRemaining: number;
  bonusPoints?: number;
};

/** POST /api/run/bonus */
export async function postBonus(
  multiplier: number
): Promise<
  | { ok: true; data: BonusApiResponse }
  | { ok: false; message: string }
  | { ok: false; network: true }
> {
  try {
    const res = await fetch('/api/run/bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiplier }),
    });
    const data = await readJson<BonusApiResponse & ApiErrorBody>(res);
    if (!res.ok) {
      return { ok: false, message: data.error || 'Bonus failed' };
    }
    return {
      ok: true,
      data: {
        totalScore: data.totalScore,
        burgersUsed: data.burgersUsed,
        burgersRemaining: data.burgersRemaining,
        bonusPoints: data.bonusPoints,
      },
    };
  } catch {
    return { ok: false, network: true };
  }
}

export type LeaderboardEntryDto = {
  rank: number;
  username: string;
  score: number;
  burgersUsed: number;
  bestTurnScore: number;
};

/** GET /api/leaderboard */
export async function getLeaderboard(): Promise<
  | { ok: true; entries: LeaderboardEntryDto[] }
  | { ok: false; message: string }
  | { ok: false; network: true }
> {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await readJson<{ entries?: LeaderboardEntryDto[] } & ApiErrorBody>(res);
    if (!res.ok) {
      return { ok: false, message: data.error || 'Failed to load leaderboard' };
    }
    return { ok: true, entries: data.entries ?? [] };
  } catch {
    return { ok: false, network: true };
  }
}
