/**
 * First-round bonus eligibility (pure). Used by the API and the client so the
 * modal always matches the same rule as pendingBonusTurnScore on the server.
 */
import type { Outcome } from './constants.js';
import { BONUS_TRIGGER_THRESHOLD } from './constants.js';

/** True when at least {@link BONUS_TRIGGER_THRESHOLD} active patties are guessed correctly this turn. */
export function isFirstRoundBonusEligible(guesses: Outcome[], outcomes: Outcome[]): boolean {
  if (guesses.length !== outcomes.length || guesses.length === 0) return false;
  let correct = 0;
  for (let i = 0; i < guesses.length; i++) {
    if (guesses[i] === outcomes[i]) correct++;
  }
  return correct >= BONUS_TRIGGER_THRESHOLD;
}
