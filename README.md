# Patty Flipper (Reddit Devvit)

A quick guessing game for Reddit, built with [Devvit](https://developers.reddit.com/docs/). Activate patties on a 5×5 grill, guess **Cooked (C)** or **Raw (R)** for each, then flip. Each **perfect row** or **perfect column** of active patties (all guesses correct for that line) scores **100×n²** points (n = number of active patties in that row or column). Compete on the leaderboard by total score.

This app is **Devvit Web only** (React client in `webroot/` + Node server). It does **not** use deprecated **`Devvit.addCustomPostType`** (Blocks). Reddit is deprecating Blocks custom posts ([changelog](https://developers.reddit.com/docs/changelog); see also [r/Devvit announcement](https://www.reddit.com/r/Devvit/comments/1r3xcm2/devvit_web_and_the_future_of_devvit/)). The interactive post is defined by `devvit.json` → `post.entrypoints` and created with **`reddit.submitCustomPost`** from the menu handler.

## Features

- **Game**: 100 burgers per run. Each turn: select active patties (any pattern), guess C or R, flip. Perfect **rows and columns** score (100×n² each; a cell can contribute to both a row and a column score).
- **Bonus**: Strong turns can trigger a bonus mini-game; the client applies a multiplier via `POST /api/run/bonus`.
- **Leaderboard**: Top 10 by total score (tie-break: fewer burgers used, then best single turn).

## For moderators (installing Patty Flipper)

Patty Flipper is a **Devvit** community game. After the app is **approved and listed** in the Reddit [App Directory](https://developers.reddit.com/apps), moderators can install it on subreddits they manage (same flow as other Devvit apps).

1. **Install** the app on your subreddit from the App Directory or your developer / mod tools, following Reddit’s current install UI.
2. **Permissions this app requests**
   - **Redis** — stores per-user run state and leaderboard entries for the game.
   - **Reddit (submit post)** — used so the subreddit **⋯** menu can create a **Patty Flipper** custom post (see `devvit.json` → `menu.items`).
3. **Starting a game for your community** — In the subreddit, open the **⋯** menu and choose **Create Patty Flipper post** (wording matches the installed app). That creates a custom post; members play inside the post.
4. **Rules & safety** — The game is a light skill/guessing experience. Ensure it fits your subreddit rules and [Devvit / Reddit policies](https://developers.reddit.com/docs/devvit_rules).

Questions about Devvit itself: [r/Devvit](https://www.reddit.com/r/Devvit/).

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

## `npm run dev` vs `npx devvit playtest` (what support is asking)

| Command                               | What it does                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`npm run dev`**                     | **Local only:** Vite + mock API on your machine. **Reddit never loads your app** here, so you will **not** see subreddit menu actions (e.g. “Create Patty Flipper post”) in the real Reddit UI. Use this to iterate on UI and game logic quickly.                                                                                                                        |
| **`npx devvit playtest <subreddit>`** | **Reddit test install:** Uses your project’s `devvit.json` build, uploads/wires the app into the **playtest subreddit** you name (or `dev.subreddit` in config). This is how you verify **menu items**, **custom posts**, and server routes **inside Reddit**. Run `npm run build` first (or let playtest trigger the build defined in `devvit.json` → `scripts.build`). |

If the **⋯** menu on the subreddit does not show your app’s action: confirm the app is **installed** on that subreddit, run **`npx devvit upload`** with the latest code (no Blocks `addCustomPostType`), then **playtest** or reinstall so Reddit picks up the new `menu` config.

## Development

- **Build client and server**: `npm run build`
- **Local dev**: `npm run dev` (client + local API with hot reload)
- **Lint**: `npm run lint` (ESLint for `src/` and `server/`)
- **Format**: `npm run format` (Prettier) · **check only**: `npm run format:check`
- **Typecheck**: `npm run check` (Vite React client)
- **Scoring sanity check**: `npm run test:logic`
- **Full gate before upload**: `npm run verify` (lint, format check, typecheck, logic test, build)
- **Playtest on Reddit**: `npx devvit playtest <subreddit>` — see table above; not the same as `npm run dev`.

## Deploy to Reddit

### Upload / playtest (moderated subreddit)

1. Run `npm run verify` then `npx devvit upload`.
2. Install the app on your subreddit from the Reddit developer portal or subreddit settings.
3. From a subreddit’s **⋯** menu, choose **Create Patty Flipper post** (see [Menu actions](https://developers.reddit.com/docs/capabilities/client/menu-actions)).

### Submit for App Directory (public listing)

To request listing so **any moderator** can install Patty Flipper:

1. Complete playtesting on web and mobile; keep the **For moderators** and **Changelog** sections in this README up to date.
2. Run `npm run verify`.
3. Run `npx devvit publish --public` (see [Launch your app](https://developers.reddit.com/docs/guides/launch/launch-guide)). The CLI normally asks whether to **upload a source zip** for review (generated from your project, respecting `.gitignore`)—choose **Continue**, or set `DEVVIT_ALLOW_SOURCE_UPLOAD=1` for that run (see `.env.example`) to skip the prompt.
4. Wait for Reddit’s review notification by email. After approval, the app can appear in the [App Directory](https://developers.reddit.com/apps).

Each new version you want live requires publishing again (and review). Prefer batching non-urgent changes into fewer releases.

## Changelog

### 1.0.0

- Devvit Web game: 5×5 grill, cooked/raw guesses, row/column scoring, optional bonus round, top-10 leaderboard.
- Subreddit menu action creates Patty Flipper custom posts (`reddit.submitCustomPost`).

## Project layout

| Area              | Purpose                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `devvit.json`     | App config: `post` (inline webview → `index.html`), `menu`, server, Redis — no `blocks` entry |
| `src/`            | React source; `src/api/pattyFlipper.ts` wraps `/api/*` fetch calls                            |
| `server/index.ts` | Production Express: game APIs + Devvit menu `UiResponse` routes                               |
| `server/local.ts` | Local mock API (in-memory Redis)                                                              |
| `server/shared/`  | Shared routes (`registerPattyRoutes.ts`), game logic, constants                               |
| `webroot/`        | Built React client (`npm run build:client`)                                                   |
| `dist/server/`    | Compiled server (`npm run build:server`)                                                      |

## API (server)

- `POST /api/run/start` — Start a new run. Returns `{ runId, burgersRemaining }`.
- `GET /api/run` — Current run state. Returns `{ burgersUsed, totalScore, bestTurnScore, burgersRemaining, runId }` or **404** if no run.
- `POST /api/run/turn` — Body: `{ activeCells: { r, c }[], guesses: ("bun"|"patty")[] }` (same length; UI labels: Cooked = `bun`, Raw = `patty`). Returns `{ outcomes, turnScore, totalScore, burgersUsed, burgersRemaining, runOver, bonusTriggered? }`.
- `POST /api/run/bonus` — Body: `{ multiplier: number }` (integer 1–200). Applies bonus to the pending turn score. Returns `{ totalScore, bonusPoints?, burgersUsed, burgersRemaining }`.
- `GET /api/leaderboard` — Top 10. Returns `{ entries: { rank, username, score, burgersUsed, bestTurnScore }[] }`.

### Menu actions (Devvit Web)

- `POST /internal/menu/create-patty-flipper-post` — Subreddit menu only (declared in `devvit.json` → `menu.items`). Body: `MenuItemRequest`. Response: [`UiResponse`](https://developers.reddit.com/docs/capabilities/client/menu-actions) (e.g. `showToast`). Creates the custom post via `reddit.submitCustomPost`.

## References

- [Games on Reddit](https://developers.reddit.com/docs/introduction/intro-games)
- [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/)
- [Menu actions](https://developers.reddit.com/docs/capabilities/client/menu-actions)
- [Redis](https://developers.reddit.com/docs/redis)
