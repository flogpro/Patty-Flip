# Patty Flipper: Code Cleanup, Performance & Reddit Submission Plan

This plan covers **code cleanup**, **performance improvements**, and **Reddit/Devvit submission requirements**. Work is split into phases so we can execute incrementally and verify at each step.

---

## Phase 1: Reddit/Devvit submission readiness

**Goal:** Meet Reddit’s requirements so the app can be submitted (unlisted or public).

### 1.1 App description file (required for publish)

- **Requirement:** Reddit expects an app description file (overview, usage, changelogs).
- **Action:** Add an app description at project root, e.g. `app_description.md` or use the format expected by `devvit publish` (check CLI for exact filename).
- **Content:** App overview, how to play (short), usage instructions, and a changelog section (e.g. “Initial release: 5×5 grid, run/turn, leaderboard”).

### 1.2 Custom splash (games)

- **Requirement:** Games should include a custom splash screen.
- **Action:** Confirm whether the current “Patty Flipper” title + “Play” / “Leaderboard” / “How to Play” counts as splash, or add a dedicated splash screen (e.g. logo/title before main UI) per Devvit games guidance.

### 1.3 Responsive & self-explanatory

- **Action:** Review viewport behavior (e.g. 380px max-width, padding) on narrow mobile and wider desktop; ensure “How to Play” explains rules so the game is self-explanatory.
- **Action:** Fix **How to Play scoring table** in `App.tsx`: it currently shows `[0, 1, 4, 12, 32, 80][k]` for k=1..5; actual formula is **100×n²**, so values should be **100, 400, 900, 1600, 2500**.

### 1.4 Moderation & policy

- **Action:** Ensure in-app content (usernames, leaderboard) is suitable for moderation and complies with Reddit Developer Terms (no hardcoded policy text needed in repo; just a checklist item).

---

## Phase 2: Code cleanup

**Goal:** Consistent structure, remove dead code, fix docs, align naming and types.

### 2.1 Remove or isolate legacy API (optional but recommended)

- **Current:** `server/index.ts` and `server/local.ts` expose legacy **`/api/flip`** and **`/api/me`** (streak-based). The client only uses **run/turn** and **leaderboard**.
- **Action:** Either remove `/api/flip` and `/api/me` from both servers or mark them clearly as deprecated and document in README. If kept, ensure they don’t add confusion (e.g. different leaderboard semantics).

### 2.2 Shared constants and types

- **Current:** `OUTCOME_COOKED` / `OUTCOME_BURNT`, `BURGERS_PER_RUN`, `GRID_SIZE`, and outcome types are duplicated (client in `Game.tsx`, server in `index.ts` and `local.ts`).
- **Action:** Introduce a small **shared** module (e.g. `shared/constants.ts` or `src/constants.ts` + server imports from a path both can use). Export outcome literals, grid size, burgers per run, and any shared types. Client and both servers import from there to avoid drift.

### 2.3 Server duplication (index vs local)

- **Current:** `server/index.ts` (Devvit/Redis) and `server/local.ts` (in-memory mock) duplicate run/turn, leaderboard, and run state logic.
- **Action:** Extract shared **route handlers** and **game logic** (e.g. `rowColPayout`, turn scoring, validation) into a common module (e.g. `server/gameLogic.ts` or `server/shared.ts`). Both `index.ts` and `local.ts` import and use it; only auth (context vs mock user) and storage (Redis vs in-memory) differ.

### 2.4 README and API docs

- **Current:** README still describes old API (`POST /api/flip`, streak, time-windowed leaderboard).
- **Action:** Update README to match current behavior: **run-based game** (start run → select grid → guess → flip → turn summary), endpoints **`POST /api/run/start`**, **`GET /api/run`**, **`POST /api/run/turn`**, **`GET /api/leaderboard`**. Remove or clearly mark legacy flip/streak/me if kept.

### 2.5 Naming and small cleanups

- **Action:** Use consistent naming: e.g. “Patty Flipper” everywhere (README, `index.html` title, devvit app name). Ensure `index.html` title matches app name.
- **Action:** Add or tighten TypeScript strictness if not already (no new `any`, proper types for API responses). Ensure `Outcome` and request/response shapes are consistent between client and server.

---

## Phase 3: Performance improvements

**Goal:** Smoother UI and smaller/maintainable bundle without breaking behavior.

### 3.1 React: avoid unnecessary re-renders

- **Game.tsx:** `buildActiveList` is recreated every render; `getIndexForCell` depends on `activeCellsForTurn`. Memoize `buildActiveList` with `useCallback` (deps: `activeCells`) or derive active list only where needed (e.g. at start of turn).
- **Game.tsx:** Select-grid multiplier math (rowCounts, colCounts, rowMultipliers, colMultipliers) runs in render inside an IIFE. Extract to `useMemo` with deps `[activeCells]` so it only recomputes when selection changes.
- **Game.tsx:** Consider `React.memo` for `PattyFlip` (it already receives stable `outcome` and `delayMs`); ensure parent doesn’t pass new object refs every time.
- **Leaderboard.tsx:** Already uses `useCallback` for fetch; ensure list items have stable keys (e.g. `username` + `rank` or a unique id if available).

### 3.2 Bundle size and build

- **Action:** Run a production build and inspect bundle (e.g. `vite build` and Rollup output or `vite-plugin-visualizer`). Ensure no large accidental dependencies; tree-shake Tailwind if config allows.
- **Action:** Lazy-load **Leaderboard** with `React.lazy` + `Suspense` so the leaderboard view is in a separate chunk and initial load stays minimal (good for Reddit embed).

### 3.3 Accessibility and perceived performance

- **Action:** Ensure loading states (e.g. “Starting…”, “Flipping…”, “Loading…”) are clear and buttons are disabled where appropriate to avoid double submissions.
- **Action:** Optional: add `aria-live` for score/turn result updates so screen readers get feedback without extra clicks.

---

## Phase 4: Final checks and build

**Goal:** One clear path to run and ship.

### 4.1 Scripts and devvit.json

- **Action:** Confirm `npm run build` produces up-to-date `webroot/` and `dist/server/` and that `devvit.json` points to the correct entry (e.g. `dist/server/index.js`). Ensure playtest instructions in README match (`npm run build` then `npx devvit playtest <subreddit>`).

### 4.2 Environment and secrets

- **Action:** No API keys or secrets in client bundle or in repo. Reddit/Devvit context and Redis are server-side only; local mock uses env vars (e.g. `LOCAL_USERNAME`, `LOCAL_API_PORT`) documented in README.

### 4.3 Lint and typecheck

- **Action:** Run `npm run check` (or equivalent) and fix any TypeScript/lint errors. Optionally add a pre-publish script that runs `check` + `build`.

---

## Execution order (recommended)

1. **Phase 1** – Submission readiness (description file, How to Play fix, splash/responsive check).
2. **Phase 2** – Cleanup (shared constants/types, server shared logic, README, optional legacy API removal).
3. **Phase 3** – Performance (useMemo/useCallback in Game, lazy Leaderboard, bundle check).
4. **Phase 4** – Final checks (build, scripts, lint/typecheck).

Each phase can be done in smaller steps (e.g. 1.3 then 1.1 then 1.2) if you prefer. After each step we can run the app and playtest to confirm nothing regresses.

---

## Summary checklist

| Item | Phase | Status |
|------|--------|--------|
| App description file (overview, usage, changelog) | 1 | **Done** |
| Custom splash (if required for games) | 1 | **Done** (header + nav as identity; add dedicated splash if review requests) |
| How to Play scoring table: 100×n² (100, 400, …) | 1 | **Done** |
| Responsive / self-explanatory check | 1 | **Done** (viewport, max-width, How to Play updated) |
| Remove or deprecate /api/flip, /api/me | 2 | **Done** |
| Shared constants + types (client + server) | 2 | **Done** |
| Shared server game logic (index + local) | 2 | **Done** |
| README updated to run/turn API | 2 | **Done** |
| Consistent “Patty Flipper” naming | 2 | **Done** |
| useMemo for grid multipliers; useCallback where needed | 3 | **Done** |
| React.memo(PattyFlip) (optional) | 3 | **Done** |
| Lazy-load Leaderboard | 3 | **Done** |
| Bundle size / build check | 3 | **Done** (Leaderboard chunk 1.75 kB; main ~160 kB) |
| Build + devvit.json + playtest path verified | 4 | **Done** |
| Lint/typecheck clean | 4 | **Done** |

Phases 1–4 complete. Run `npm run verify` then `npx devvit upload` to deploy.
