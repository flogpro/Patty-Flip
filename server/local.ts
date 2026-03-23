/**
 * Local development server. Mocks Reddit context and Redis so you can run
 * the app on localhost. Use LOCAL_USERNAME or header x-mock-username to set user.
 */
import express from 'express';
import { createPattyFlipperRouter, type PattyRedis } from './shared/registerPattyRoutes.js';

const PORT = Number(process.env.LOCAL_API_PORT) || 3001;
// Vite proxy must match: see vite.config.ts server.proxy['/api'].target

const app = express();
app.use(express.json());

const RUN_KEY_PREFIX = 'run:';
const LB_SCORES_KEY = 'lb:scores';

const runMap = new Map<string, string>();

type LBRow = {
  username: string;
  score: number;
  burgersUsed: number;
  bestTurnScore: number;
  timestamp: number;
};
let leaderboardRows: LBRow[] = [];

function getMockUsername(req: express.Request): string {
  const fromHeader = req.headers['x-mock-username'] as string | undefined;
  if (fromHeader) return fromHeader;
  return process.env.LOCAL_USERNAME || 'local_test_user';
}

const redis: PattyRedis = {
  get: async (key: string): Promise<string | undefined> => {
    if (key.startsWith(RUN_KEY_PREFIX)) return runMap.get(key) ?? undefined;
    if (key === LB_SCORES_KEY) return JSON.stringify(leaderboardRows);
    return undefined;
  },
  set: async (key: string, value: string): Promise<string> => {
    if (key.startsWith(RUN_KEY_PREFIX)) runMap.set(key, value);
    if (key === LB_SCORES_KEY) leaderboardRows = JSON.parse(value) as LBRow[];
    return 'OK';
  },
  del: async (...keys: string[]): Promise<number> => {
    for (const key of keys) runMap.delete(key);
    return keys.length;
  },
};

app.use(
  '/api',
  createPattyFlipperRouter({
    getUsername: (req) => getMockUsername(req),
    redis,
  })
);

const server = app.listen(PORT, () => {
  console.log(`[local] Patty Flipper API at http://localhost:${PORT}`);
  console.log(
    `[local] Mock user: ${process.env.LOCAL_USERNAME || 'local_test_user'} (set LOCAL_USERNAME or x-mock-username)`
  );
});
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[local] Port ${PORT} is already in use. Stop the other process (e.g. \`lsof -ti :${PORT} | xargs kill -9\`) or set LOCAL_API_PORT to another port (e.g. 3002).`
    );
  } else {
    console.error('[local] Server error:', err);
  }
  process.exit(1);
});
