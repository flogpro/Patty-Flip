# Patty Flipper (Reddit Devvit)

A quick guessing game for Reddit, built with [Devvit](https://developers.reddit.com/docs/). Activate patties on a 5×5 grill, guess **Cooked (C)** or **Raw (R)** for each, then flip. Each **perfect row** or **perfect column** of active patties (all guesses correct for that line) scores **100×n²** points (n = number of active patties in that row or column). Compete on the leaderboard by total score.

## Features

- **Game**: 100 burgers per run. Each turn: select active patties (any pattern), guess C or R, flip. Perfect **rows and columns** score (100×n² each; a cell can contribute to both a row and a column score).
- **Bonus**: Strong turns can trigger a bonus mini-game; the client applies a multiplier via `POST /api/run/bonus`.
- **Leaderboard**: Top 10 by total score (tie-break: fewer burgers used, then best single turn).

## Prerequisites

- Node.js v22.2.0+
- A Reddit account and a test subreddit you moderate
- [Devvit CLI](https://developers.reddit.com/docs/) set up (`npx devvit login`)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Build**

   ```bash
   npm run build
   ```

3. **Configure** (optional)
   - Set `dev.subreddit` in `devvit.json` for a default playtest subreddit, or use `DEVVIT_SUBREDDIT` in a `.env` file.
   - Copy `.env.example` to `.env` if you want documented env vars in one place (optional).

## Local testing (run on your machine)

You can run the game in your browser with a mock API (no Reddit/Redis required):

1. **Start both the React app and the local API server**

   ```bash
   npm run dev
   ```

   This starts:
   - **Client** at [http://localhost:5173](http://localhost:5173) (Vite dev server)
   - **API** at http://localhost:3001 (in-memory mock; run state and leaderboard reset when you stop the server)

   Both are required for the game to work. If the API isn't running, the app will show a connection error when you play or open the leaderboard.

2. Open **http://localhost:5173** in your browser. Play the game and check the leaderboard.

3. **Optional**: Set a mock Reddit username for local testing:
   - `LOCAL_USERNAME=myuser npm run dev`, or
   - Send header `x-mock-username: myuser` with API requests.

   If port 3001 is in use, run with a different API port: `LOCAL_API_PORT=3002 npm run dev`.

## Development

- **Build client and server**: `npm run build`
- **Local dev**: `npm run dev` (client + local API with hot reload)
- **Lint**: `npm run lint` (ESLint for `src/` and `server/`, excludes `src/devvit.tsx` — Devvit blocks use separate JSX)
- **Format**: `npm run format` (Prettier) · **check only**: `npm run format:check`
- **Typecheck**: `npm run check` (web client only; `src/devvit.tsx` is excluded — see `tsconfig.json`)
- **Scoring sanity check**: `npm run test:logic`
- **Full gate before upload**: `npm run verify` (lint, format check, typecheck, logic test, build)
- **Playtest on Reddit**: From the project root, run `npx devvit playtest <subreddit>` (e.g. `npx devvit playtest mytestsub`). This uses your built `webroot/` and `dist/server/`; run `npm run build` first.

## Deploy to Reddit

1. Run `npm run verify` then `npx devvit upload`.
2. Install the app on your subreddit from the Reddit developer portal or subreddit settings.
3. Create a custom post with the Patty Flipper app to play.

## Project layout

| Area              | Purpose                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `devvit.json`     | App config: name, post (`webroot`), server (`dist/server`), Redis       |
| `src/`            | React client; `src/api/pattyFlipper.ts` wraps `/api/*` fetch calls      |
| `src/devvit.tsx`  | Devvit blocks entry (custom post + menu); not typechecked with Vite app |
| `server/index.ts` | Production Express app (Devvit Web + Redis)                             |
| `server/local.ts` | Local mock API (in-memory Redis)                                        |
| `server/shared/`  | Shared routes (`registerPattyRoutes.ts`), game logic, constants         |
| `webroot/`        | Built React client (`npm run build:client`)                             |
| `dist/server/`    | Compiled server (`npm run build:server`)                                |

## API (server)

- `POST /api/run/start` — Start a new run. Returns `{ runId, burgersRemaining }`.
- `GET /api/run` — Current run state. Returns `{ burgersUsed, totalScore, bestTurnScore, burgersRemaining, runId }` or **404** if no run.
- `POST /api/run/turn` — Body: `{ activeCells: { r, c }[], guesses: ("bun"|"patty")[] }` (same length; UI labels: Cooked = `bun`, Raw = `patty`). Returns `{ outcomes, turnScore, totalScore, burgersUsed, burgersRemaining, runOver, bonusTriggered? }`.
- `POST /api/run/bonus` — Body: `{ multiplier: number }` (integer 1–200). Applies bonus to the pending turn score. Returns `{ totalScore, bonusPoints?, burgersUsed, burgersRemaining }`.
- `GET /api/leaderboard` — Top 10. Returns `{ entries: { rank, username, score, burgersUsed, bestTurnScore }[] }`.

## References

- [Games on Reddit](https://developers.reddit.com/docs/introduction/intro-games)
- [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/)
- [Redis](https://developers.reddit.com/docs/redis)
