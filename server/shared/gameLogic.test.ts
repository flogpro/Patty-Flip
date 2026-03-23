/**
 * Quick verification: run with `npx tsx server/shared/gameLogic.test.ts`
 * Expected: Score 600 for scenario: row1 with 2 correct, row2 with 1 correct, col1 with 1 correct; col3 has 2 patties but one wrong.
 */
import { OUTCOME_COOKED, OUTCOME_BURNT, type Outcome } from './constants.js';
import { computeTurnScore } from './gameLogic.js';

// activeCells in row-major order (same as client buildActiveList): (1,1), (1,3), (2,3), (3,3).
// Row 1: (1,1),(1,3) both correct → 100×2² = 400. Row 2: (2,3) correct → 100×1² = 100. Row 3: (3,3) wrong → 0.
// Col 1: (1,1) correct → 100. Col 3: (2,3) correct, (3,3) wrong → not perfect → 0. Total = 600.
const activeCells = [
  { r: 1, c: 1 },
  { r: 1, c: 3 },
  { r: 2, c: 3 },
  { r: 3, c: 3 },
];
const outcomes: Outcome[] = [OUTCOME_COOKED, OUTCOME_COOKED, OUTCOME_COOKED, OUTCOME_BURNT]; // (3,3) landed raw
const guesses: Outcome[] = [OUTCOME_COOKED, OUTCOME_COOKED, OUTCOME_COOKED, OUTCOME_COOKED]; // user guessed cooked for (3,3) → wrong

const score = computeTurnScore(activeCells, guesses, outcomes);
console.log('Expected 600, got', score);
if (score !== 600) {
  console.error('FAIL: scoring mismatch');
  process.exit(1);
}
console.log('OK: scoring correct');
process.exit(0);
