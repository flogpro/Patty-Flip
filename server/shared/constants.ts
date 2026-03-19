/** Shared constants and types for Patty Flipper (client + server). */

/** API: Cooked = bun, Raw = patty (uncooked). */
export const OUTCOME_COOKED = 'bun';
export const OUTCOME_BURNT = 'patty';

export const BURGERS_PER_RUN = 100;
export const GRID_SIZE = 5;

export type Outcome = 'bun' | 'patty';

/** Per-row/per-column score when all active in that row/column are correct: 100 * n² */
export function rowColPayout(n: number): number {
  if (n < 1) return 0;
  return 100 * n * n;
}
