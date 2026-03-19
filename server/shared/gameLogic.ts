/** Shared game logic for Patty Flipper (run/turn scoring). */
import crypto from 'node:crypto';
import { OUTCOME_COOKED, OUTCOME_BURNT, GRID_SIZE, rowColPayout, type Outcome } from './constants.js';

/** 50/50 outcome using crypto RNG. */
export function randomOutcome(): Outcome {
  return crypto.randomInt(0, 2) === 0 ? OUTCOME_COOKED : OUTCOME_BURNT;
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
  let turnScore = 0;
  for (let col = 0; col < GRID_SIZE; col++) {
    const indicesInCol = activeCells.map((cell, i) => (cell.c === col ? i : -1)).filter((i) => i >= 0);
    if (indicesInCol.length === 0) continue;
    const allCorrect = indicesInCol.every((i) => guesses[i] === outcomes[i]);
    if (allCorrect) turnScore += rowColPayout(indicesInCol.length);
  }
  for (let row = 0; row < GRID_SIZE; row++) {
    const indicesInRow = activeCells.map((cell, i) => (cell.r === row ? i : -1)).filter((i) => i >= 0);
    if (indicesInRow.length === 0) continue;
    const allCorrect = indicesInRow.every((i) => guesses[i] === outcomes[i]);
    if (allCorrect) turnScore += rowColPayout(indicesInRow.length);
  }
  return turnScore;
}

/** Minimum number of "counting and correct" patties in one turn to trigger the bonus game. */
export const BONUS_TRIGGER_THRESHOLD = 6;

/**
 * Count patties that are both correct and in at least one perfect row or column ("counting").
 * Used to determine if the bonus game triggers (count >= BONUS_TRIGGER_THRESHOLD).
 */
export function countCountingAndCorrect(
  activeCells: { r: number; c: number }[],
  guesses: Outcome[],
  outcomes: Outcome[]
): number {
  const countingIndices = new Set<number>();
  for (let col = 0; col < GRID_SIZE; col++) {
    const indicesInCol = activeCells.map((cell, i) => (cell.c === col ? i : -1)).filter((i) => i >= 0);
    if (indicesInCol.length === 0) continue;
    const allCorrect = indicesInCol.every((i) => guesses[i] === outcomes[i]);
    if (allCorrect) indicesInCol.forEach((i) => countingIndices.add(i));
  }
  for (let row = 0; row < GRID_SIZE; row++) {
    const indicesInRow = activeCells.map((cell, i) => (cell.r === row ? i : -1)).filter((i) => i >= 0);
    if (indicesInRow.length === 0) continue;
    const allCorrect = indicesInRow.every((i) => guesses[i] === outcomes[i]);
    if (allCorrect) indicesInRow.forEach((i) => countingIndices.add(i));
  }
  return countingIndices.size;
}
