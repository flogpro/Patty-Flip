# Bonus Feature Plan (slot-machine style)

## Trigger: “6 counting and correct” in one turn

### Definitions
- **Correct:** User’s guess (cooked/raw) matches the outcome for that patty.
- **Counting:** That correct patty is in at least one **perfect** row or column (all active patties in that row or column are correct).
  - Correct patties in a row/column where any patty is wrong → **do not** count.
  - Only correct patties that lie in at least one fully correct row or column count.

### Trigger condition
**Bonus triggers when:** In a **single turn**, the number of patties that are both correct and counting is **≥ 6**.

- Count **unique** patties that are (1) correct and (2) in at least one perfect row or column.
- Same patty can be in both a perfect row and a perfect column; it is still counted once.

### Implementation (trigger only)
- **Server:** After computing turn score, compute the set of “counting and correct” patty indices; if set size ≥ 6, include a `bonusTriggered: true` (or similar) in the turn response.
- **Client:** When `turnResult` has `bonusTriggered === true`, show the bonus experience (see below).

---

## Bonus game: Burger stacking

### Result (multiplier-based)
- **Starting multiplier:** 1×.
- **If the player fails** (stack collapses): they receive **turn score × 1** for that round (no bonus).
- **If the player succeeds** (finishes the 60s with stack intact): they receive **turn score × multiplier**, where **multiplier = 1 + (number of successfully stacked items)**.  
  - Example: 5 balanced items at end of 60s → multiplier 6× → turn score × 6.

### Concept
- **Burger stacking game:** user has **30 seconds** to stack as many burgers, ingredients, and condiments as possible. **Bun is movable** (arrow keys or swipe); **items fall from top to bottom**. User positions the bun to catch items and avoid **bombs** (if a bomb lands on the bun, the round ends).
- **Collapse:** If the stack falls due to inaccurate stacking, or a **bomb** lands on the bun, the bonus round ends; player gets turn score × 1.
- **Success:** If the timer reaches 0 with the stack still balanced, player gets turn score × (1 + stacked items).

### Flow
1. Bonus trigger fires (6+ counting-and-correct in one turn).
2. **Full-screen modal** covers the screen.
3. Modal shows a **“Start bonus”** (or similar) button.
4. User taps to start → bonus round begins.
5. **Bun** is at the **bottom** and **movable** (left/right arrow keys on desktop, swipe on mobile).
6. **Items** (burgers, toppings, vegetables, condiments) and **bombs** fall **vertically** from top to bottom.
7. User **moves the bun** to **catch** items (stack on the bun) and **avoid bombs**. If a bomb lands on the bun, the round ends.
8. **Each successfully stacked item** increases the bonus multiplier by 1× (e.g. 5 stacked = 5×).
9. **Timer:** 30 seconds total. When time runs out with stack still balanced, round ends and multiplier is applied. Stacked items are shown thin so the stack never exceeds 1/4 of the game area.
10. **Collapse:** If the stack falls at any point, round ends; player receives turn score × 1.

### Speed ramp
- **Every 15 seconds**, the horizontal scroll speed of items **increases** (e.g. 0–15s = base speed, 15–30s = faster, 30–45s = faster, 45–60s = fastest).

### Collapse mechanism (to design)
- We need a **rule for when the stack is considered “fallen”** (e.g. item not correctly centered on the bun, or too far off center).
- Options to consider: horizontal offset threshold (e.g. item center vs bun center), cumulative tilt, or physics-style balance. Exact formula TBD during implementation.

### Implementation notes
- **Client:** Bonus game is a new UI flow (modal → stacking game with timer, scroll, tap-to-drop, stack rendering, collapse detection).
- **Server:** Turn response already includes `turnScore`. We may need to accept a **final multiplier** (or stacked count) from the client after the bonus round and apply: `totalScore += turnScore * multiplier` (or overwrite that turn’s contribution). Alternatively, client sends multiplier and server recomputes the bonus for that turn.

---

## Flow (trigger → bonus)

- Trigger is evaluated **after** the turn result is known (we have `turnResult`, outcomes, guesses, active cells).
- When `bonusTriggered === true`, show the bonus modal; user starts the bonus round from there. After bonus (success or collapse), apply multiplier and continue (e.g. show updated score, then “Next turn”).

---

## Status

| Item                              | Status   |
|-----------------------------------|----------|
| Trigger logic (server)            | Done     |
| Trigger logic (client flag)       | Done     |
| Bonus modal + start button        | Done     |
| Burger stacking game (scroll, tap, stack, timer) | Done     |
| Speed ramp (every 15s)            | Done     |
| Collapse detection mechanism     | Done (horizontal offset threshold) |
| Bonus multiplier → score (server) | Done     |
