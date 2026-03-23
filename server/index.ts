import express from 'express';
import { createServer, context, getServerPort, redis } from '@devvit/web/server';
import { createPattyFlipperRouter } from './shared/registerPattyRoutes.js';

const app = express();
app.use(express.json());
app.use(
  '/api',
  createPattyFlipperRouter({
    getUsername: () => context.username ?? null,
    redis,
  })
);

const server = createServer(app);
const port = getServerPort();
server.listen(port, () => {
  console.log(`Patty Flipper server listening on port ${port}`);
});
