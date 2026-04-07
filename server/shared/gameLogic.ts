/** Shared game logic for Patty Flipper (run/turn scoring). */
import crypto from 'node:crypto';
import {
  OUTCOME_COOKED,
  OUTCOME_BURNT,
  GRID_SIZE,
  rowColPayout,
  type Outcome,
} from './constants.js';

/** 50/50 outcome using crypto RNG. */
export function randomOutcome(): Outcome {
  return crypto.randomInt(0, 2) === 0 ? OUTCOME_COOKED : OUTCOME_BURNT;
}

/** Bucket active patty indices by column and row (single pass). */
function indicesByColAndRow(activeCells: { r: number; c: number }[]) {
  const byCol: number[][] = Array.from({ length: GRID_SIZE }, () => []);
  const byRow: number[][] = Array.from({ length: GRID_SIZE }, () => []);
  for (let i = 0; i < activeCells.length; i++) {
    const { r, c } = activeCells[i];
    byCol[c].push(i);
    byRow[r].push(i);
  }
  return { byCol, byRow };
}

/**
 * Turn score in one pass over rows/columns (shared hot path).
 * Perfect columns and perfect rows each score 100×n² (n = active count in that line).
 */
export function evaluateTurn(
  activeCells: { r: number; c: number }[],
  guesses: Outcome[],
  outcomes: Outcome[]
): { turnScore: number; countingCorrect: number } {
  const { byCol, byRow } = indicesByColAndRow(activeCells);
  let turnScore = 0;
  const countingIndices = new Set<number>();

  for (let col = 0; col < GRID_SIZE; col++) {
    const idx = byCol[col];
    if (idx.length === 0) continue;
    const allCorrect = idx.every((i) => guesses[i] === outcomes[i]);
    if (allCorrect) {
      turnScore += rowColPayout(idx.length);
      for (const i of idx) countingIndices.add(i);
    }
  }
  for (let row = 0; row < GRID_SIZE; row++) {
    const idx = byRow[row];
    if (idx.length === 0) continue;
    const allCorrect = idx.every((i) => guesses[i] === outcomes[i]);
    if (allCorrect) {
      turnScore += rowColPayout(idx.length);
      for (const i of idx) countingIndices.add(i);
    }
  }
  return { turnScore, countingCorrect: countingIndices.size };
}

/**
 * Compute turn score from active cells, guesses, and outcomes.
 * Perfect columns and perfect rows each score 100×n² (n = active count in that column/row).
 */
export function computeTurnScore(
  activeCells: { r: number; c: number }[],
  guesses: Outcome[],
  outcomes: Outcome[]
): number {
  return evaluateTurn(activeCells, guesses, outcomes).turnScore;
}

export { BONUS_TRIGGER_THRESHOLD } from './constants.js';

/**
 * Count patties that are both correct and in at least one perfect row or column ("counting").
 * (Scoring / feedback only — first-round bonus uses {@link isFirstRoundBonusEligible} in bonusTrigger.ts.)
 */
export function countCountingAndCorrect(
  activeCells: { r: number; c: number }[],
  guesses: Outcome[],
  outcomes: Outcome[]
): number {
  return evaluateTurn(activeCells, guesses, outcomes).countingCorrect;
}
