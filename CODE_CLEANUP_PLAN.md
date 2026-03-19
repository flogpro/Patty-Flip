# Patty Flipper — Code Cleanup Plan

This plan covers **modularization**, **best practices**, **size reduction**, and **Reddit/Devvit games compliance** without changing functionality, design, or look and feel. Execute only after review and approval.

References:
- [Games on Reddit (Devvit)](https://developers.reddit.com/docs/introduction/intro-games) — standard web tech (React), client/server, hosting, Reddit Developer Funds.
- Existing: `devvit.json`, `CLEANUP_AND_SUBMISSION_PLAN.md` (Phases 1–4 done).

---

## 1. Reddit/Devvit Guidelines (Do Not Break)

These must remain unchanged so the app continues to meet Reddit’s game builder setup:

| Item | Current | Action |
|------|--------|--------|
| **Post config** | `devvit.json` → `post.dir: "webroot"`, `entrypoints.default.entry: "index.html"`, `height: "tall"`, `inline: true` | **No change** |
| **Server config** | `server.dir: "dist/server"`, `server.entry: "index.js"` | **No change** |
| **Permissions** | `redis`, `reddit` | **No change** |
| **Build** | `npm run build` → build:client then build:server; output in `webroot/` and `dist/server/` | **No change** |
| **Client/server split** | Vite builds client; TypeScript compiles server; `shared` alias for server/shared | **No change** |
| **API surface** | `/api/run`, `/api/run/turn`, `/api/leaderboard` | **No change** |

Any new files or refactors must keep:
- `index.html` as the client entry.
- `webroot/` as the client build output.
- `dist/server/index.js` as the server entry.
- Imports of `shared/constants` (and shared types) from `server/shared` via the existing Vite alias.

---

## 2. Modularization (Ease of Development)

### 2.1 Extract game types (client)

- **Current:** `RunState`, `TurnResult`, `GamePhase`, and `Props` live in `Game.tsx`.
- **Action:** Add `src/types/game.ts` and move these types (and any shared UI types used only by the game). Export from one place so `Game.tsx` and new components import from `src/types/game.ts`.
- **Benefit:** Single place for game state shapes; easier to add phases or API types later.

### 2.2 Extract flip-related components and hooks

- **Current:** `PattyFlip`, `FlipCellWithDelayedResult`, and `useRevealAfter` are defined at the top of `Game.tsx` (~120 lines).
- **Action:**
  - Add `src/hooks/useRevealAfter.ts` for the hook.
  - Add `src/components/PattyFlip.tsx` for the single-patty flip animation (import outcome constants from `shared/constants`; patty asset URLs can be a small constant in the component or in `src/constants.ts`).
  - Add `src/components/FlipCellWithDelayedResult.tsx` (uses `PattyFlip` and `useRevealAfter`).
- **Benefit:** Flip behavior is isolated and testable; `Game.tsx` shrinks and focuses on flow.

### 2.3 Extract layout-grid component

- **Current:** The select-grid UI (row/column multipliers, 5×5 patty buttons, “100” labels, raw patty image for inactive) is inline in `Game.tsx` (~95 lines).
- **Action:** Add `src/components/LayoutGrid.tsx`. Props: `activeCells`, `gridMultipliers` (or rowCounts/colCounts), `onToggleCell`, `GRID_SIZE`. Render the grid and multipliers only; no game phase or API logic.
- **Benefit:** Layout screen is one component; changes to layout UI stay in one file.

### 2.4 Extract play-view header

- **Current:** Score, burgers, back button, Fast/Regular toggle are inline in the play view (~55 lines).
- **Action:** Add `src/components/PlayViewHeader.tsx`. Props: `phase`, `run`, `loading`, `suspensefulFlip`, `onBack`, `onSetSuspensefulFlip`, `BURGERS_PER_RUN`. Purely presentational + callbacks.
- **Benefit:** Header layout and copy live in one place; easier to tweak for Reddit embed.

### 2.5 Extract result grid and action buttons (optional)

- **Current:** The guessing/flipping/turnSummary grid (per-cell guess, flip, correct/wrong) and the bottom action buttons (Confirm layout, Flip, Next turn, etc.) are inline in `Game.tsx`.
- **Action (optional in Phase 1):**
  - `ResultGrid.tsx`: given `phase`, `turnResult`, `guesses`, `activeCellsForTurn`, `getIndexForCell`, `suspensefulFlip`, `revealedCount`, `onReveal`, `onGuess` — renders the 5×5 result/guess grid only.
  - Keep action buttons in `Game.tsx` for now (they’re tightly coupled to phase and submit handlers). Can extract to `GameActions.tsx` in a later pass if desired.
- **Benefit:** Smaller `Game.tsx`; result/guess UI can be refined without touching orchestration.

### 2.6 Keep Game.tsx as orchestrator

- **After extractions:** `Game.tsx` should mostly:
  - Import shared constants and game types.
  - Hold state (phase, run, activeCells, guesses, turnResult, loading, suspensefulFlip, revealedCount).
  - Compose `<PlayViewHeader>`, `<LayoutGrid>` or result grid, and action buttons.
  - Handle `startRun`, `startTurn`, `submitTurn`, `toggleCell`, `setGuess`, and Next turn / run over navigation.
- **Target:** Reduce `Game.tsx` from ~598 lines to roughly 250–350, with no behavior or visual change.

---

## 3. Constants and Config

### 3.1 Client-only constants

- **Current:** `PATTY_COOKED_URL`, `PATTY_RAW_URL`, `FLIP_STAGGER_MS`, `FLIP_DURATION_MS` live in `Game.tsx`.
- **Action:** Add `src/constants.ts` (or `src/config.ts`) for client-only values: patty asset URLs, flip stagger/duration. Import in `PattyFlip`, `FlipCellWithDelayedResult`, and `Game.tsx` as needed. Keep `BURGERS_PER_RUN`, `GRID_SIZE`, and outcome types from `shared/constants` (no duplication).
- **Benefit:** One place to change timings or asset paths; clear split between shared (server+client) and client-only.

### 3.2 Server shared (no structural change)

- **Current:** `server/shared/constants.ts`, `server/shared/gameLogic.ts`; client uses `shared/constants` via Vite alias.
- **Action:** No file moves. Optional: re-export `GRID_SIZE` from shared constants if any new client component needs it, and keep using the alias.

---

## 4. Size Reduction (Without Affecting Behavior or Design)

### 4.1 Bundle size

- **Current:** Leaderboard is lazy-loaded; Tailwind is used for styles.
- **Action:**
  - After modularization, ensure no accidental duplicate imports of `shared/constants` or heavy deps in new components.
  - Run `npm run build` and confirm `webroot` bundle size is similar or smaller (no new runtime deps).
- **Benefit:** Avoid regressions and keep Reddit embed load small.

### 4.2 Source and repo size

- **Current:** `dist/` and `webroot/` are in `.gitignore`; test file `server/shared/gameLogic.test.ts` is committed.
- **Action:**
  - Keep `gameLogic.test.ts`; it’s server-only and useful for CI/verification. No need to ship it in the client bundle.
  - Do not commit `dist/` or `webroot/` (already ignored).
  - Remove any dead code found during extraction (e.g. unused variables or branches in `Game.tsx`). Do not remove or change any used logic.
- **Benefit:** Smaller, clearer source tree; same runtime behavior.

### 4.3 Duplication and dead code

- **Action:** While extracting, remove duplicate comments or redundant helpers. Ensure “Perfect column or row” and scoring copy in `App.tsx` (How to Play) match current rules (100×n² for perfect column or row). Fix the How to Play line if it still says “per perfect column” only (update to “per perfect column or row”).
- **Benefit:** One source of truth for rules and copy.

---

## 5. Best Practices

### 5.1 File and naming

- **Components:** PascalCase files (`PattyFlip.tsx`, `LayoutGrid.tsx`, `PlayViewHeader.tsx`).
- **Hooks:** camelCase with `use` prefix (`useRevealAfter.ts`).
- **Types:** `src/types/game.ts`; types in PascalCase.
- **Constants:** `src/constants.ts` or `src/config.ts`; UPPER_SNAKE for true constants.

### 5.2 Component patterns

- Keep presentational components dumb where possible (props in, callbacks out).
- Keep `memo` on `PattyFlip` and `FlipCellWithDelayedResult` when moving to their own files.
- Use existing patterns: `useCallback` for handlers passed to children, `useMemo` for derived data (e.g. grid multipliers).

### 5.3 Imports and paths

- Use the existing `shared` alias for `server/shared` from the client (e.g. `import { BURGERS_PER_RUN } from 'shared/constants'`).
- No circular dependencies: `types/game.ts` and `constants.ts` should not import from `Game.tsx` or heavy components.

### 5.4 Accessibility and a11y

- Preserve existing `aria-label`, `title`, and `aria-hidden` where already used; add no new a11y regressions.

---

## 6. Execution Order (Recommended)

| Step | Description | Risk |
|------|-------------|------|
| 1 | Add `src/types/game.ts` and move game types from `Game.tsx` | Low |
| 2 | Add `src/constants.ts` (client-only); move patty URLs and flip timings | Low |
| 3 | Add `src/hooks/useRevealAfter.ts`; use in `Game.tsx` (then move to components) | Low |
| 4 | Add `src/components/PattyFlip.tsx` and `FlipCellWithDelayedResult.tsx`; update `Game.tsx` imports | Low |
| 5 | Add `src/components/LayoutGrid.tsx`; wire into `Game.tsx` | Low |
| 6 | Add `src/components/PlayViewHeader.tsx`; wire into `Game.tsx` | Low |
| 7 | (Optional) Extract result/guess grid into `ResultGrid.tsx` | Medium |
| 8 | Fix How to Play in `App.tsx`: “per perfect column or row” if still column-only | Low |
| 9 | Run `npm run verify` and manual playtest (layout, guess, flip, score, next turn, leaderboard) | — |

---

## 7. Out of Scope (No Change)

- **devvit.json:** No change to post/server/permissions/scripts.
- **API routes or request/response shapes:** No change.
- **server/shared:** No structural change; only optional comment/doc tweaks.
- **Design, colors, layout, copy (beyond How to Play fix):** No intentional change.
- **New features or gameplay:** Not part of this cleanup.

---

## 8. Success Criteria

- All existing functionality works (start run, layout, guess, flip, scoring, next turn, run over, leaderboard, How to Play).
- Visual and UX unchanged (same layout, buttons, flip animation, score display).
- `Game.tsx` is shorter and composed of smaller components/hooks.
- Reddit/Devvit layout and build (webroot + dist/server) unchanged.
- `npm run verify` passes; manual test on a play and a full run passes.

---

## 9. Checklist Before Starting

- [ ] Plan reviewed and approved.
- [ ] No uncommitted changes that would conflict (or commit/stash first).
- [ ] `npm run verify` passes and a quick playtest is done to establish baseline.

Once approved, execution can proceed step-by-step with verification after each step.
