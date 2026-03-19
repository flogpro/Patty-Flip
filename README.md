# Patty Flipper (Reddit Devvit)

A quick guessing game for Reddit, built with [Devvit](https://developers.reddit.com/docs/). Activate patties on a 5×5 grill, guess **Cooked (C)** or **Raw (R)** for each, then flip. Perfect columns score 100×n² points; compete on the leaderboard by total score.

## Features

- **Game**: 100 burgers per run. Each turn: select active patties (any pattern), guess C or R (cooked or raw), flip. Only perfect columns score (100×n² pts).
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
- **Playtest on Reddit**: From the project root, run `npx devvit playtest <subreddit>` (e.g. `npx devvit playtest mytestsub`). This uses your built `webroot/` and `dist/server/`; run `npm run build` first.

## Deploy to Reddit

1. Run `npm run verify` (typecheck + build) or `npm run build`. Then run `npx devvit upload`.
2. Install the app on your subreddit from the Reddit developer portal or subreddit settings.
3. Create a custom post with the Patty Flipper app to play.

## Project layout

| Area            | Purpose                                              |
|-----------------|------------------------------------------------------|
| `devvit.json`   | App config: name, post (webroot), server, Redis      |
| `webroot/`      | Built React client (from `src/`, `index.html`)       |
| `server/`       | Express server: run, turn, leaderboard APIs           |
| `dist/server/`  | Compiled server bundle                               |

## API (server)

- `POST /api/run/start` — Start a new run. Returns `{ runId, burgersRemaining }`.
- `GET /api/run` — Current run state. Returns `{ burgersUsed, totalScore, bestTurnScore, burgersRemaining }` or 404 if no run.
- `POST /api/run/turn` — Body: `{ activeCells: { r, c }[], guesses: ("bun"|"patty")[] }` (same length). Returns `{ outcomes, turnScore, totalScore, burgersUsed, burgersRemaining, runOver }`.
- `GET /api/leaderboard` — Top 10. Returns `{ entries: { rank, username, score, burgersUsed, bestTurnScore }[] }`.

## References

- [Games on Reddit](https://developers.reddit.com/docs/introduction/intro-games)
- [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/)
- [Redis](https://developers.reddit.com/docs/redis)
