# Patty Flipper — App Description

## Overview

**Patty Flipper** is a quick guessing game for Reddit: you have a 5×5 grill and 100 burgers per run. Each turn you choose which patties to activate (any pattern of rows and columns), guess whether each will land **Cooked (C)** or **Raw (R)**, then flip. Only **perfect** columns score: 100×n² points per perfect column (n = number of active patties in that column). Compete on the leaderboard by total score (tie-break: fewer burgers used, then best single turn).

## Usage

1. **Install** the app on a subreddit (moderator or via Apps directory).
2. **Open** a post that uses the Patty Flipper app (custom post with the app attached).
3. **Play**: tap **Play** → **Start run** → tap patties to activate (green) → **Confirm layout** → set each active patty to C or R (cooked or raw) → **Flip** → see results and continue or start a new run when you run out of burgers.
4. **Leaderboard**: tap **Leaderboard** to see top 10 scores. Tap **How to Play** for full rules.

No account beyond Reddit login is required. All state is per Reddit user and stored server-side (Redis on Reddit).

## Changelog

### Initial release

- Patty Flipper: 5×5 grid with per-cell activation.
- Run-based game: start run, select active patties each turn, guess C/R (cooked or raw), flip; scoring 100×n² per perfect column.
- Leaderboard: top 10 by total score (tie-break: burgers used, best turn).
- Responsive layout for Reddit embed (~380px width); works on mobile and desktop.
