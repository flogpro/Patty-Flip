/** Client-only constants. Use shared/constants for run/grid/outcome values. */

/** Patty image paths (served from public/). Cooked = done; Raw = uncooked. */
export const PATTY_COOKED_URL = '/patty-burnt.png';
export const PATTY_RAW_URL = '/patty-raw.png';

/** Stagger (ms) between each patty when suspenseful flip is on. Next patty starts after the previous result is shown (flip duration ~700ms). */
export const FLIP_STAGGER_MS = 750;

/** Duration (ms) of one patty flip animation; used to delay correct/wrong reveal in Regular mode. */
export const FLIP_DURATION_MS = 700;

/** Bonus stacking game: total time (ms) and speed increase interval (ms). */
export const BONUS_GAME_DURATION_MS = 30_000;
export const BONUS_SPEED_INTERVAL_MS = 15_000;
/** Max horizontal offset (px) from stack center before collapse. */
export const BONUS_STACK_OFFSET_THRESHOLD = 28;
/** Delay (ms) after turn result before showing the bonus modal. */
export const BONUS_MODAL_DELAY_MS = 3000;
/** Duration (ms) to show "Bonus round complete" screen before closing modal and returning to game. */
export const BONUS_END_SCREEN_DURATION_MS = 2800;
/** Bonus game: bun movement (px per keypress); higher = more sensitive. */
export const BONUS_BUN_MOVE_PX = 24;
/** Bonus game: fall speed (px per second) base; increases every 15s. */
export const BONUS_FALL_SPEED_BASE = 90;
/** Bonus game: spawn interval (ms) between new items. */
export const BONUS_SPAWN_INTERVAL_MS = 1200;
/** Bonus game: chance (0–1) that a spawned object is a bomb. */
export const BONUS_BOMB_CHANCE = 0.18;

/** Number of correct patties in a turn (in a perfect row/column) needed to trigger the bonus round. Must match server shared/gameLogic BONUS_TRIGGER_THRESHOLD. */
export const BONUS_TRIGGER_THRESHOLD = 6;

/** Round 2 (flip onto bun): minimum items caught in round 1 to unlock (≥ 16). */
export const BONUS_ROUND2_ITEM_THRESHOLD = 16;
/** Round 2 bun multipliers: [closest, middle, furthest] (2.5×, 5×, 10×). */
export const BONUS_ROUND2_MULTIPLIERS = [2.5, 5, 10] as const;
