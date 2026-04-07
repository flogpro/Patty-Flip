/**
 * Run: npx tsx server/shared/bonusEligibility.test.ts
 */
import { OUTCOME_COOKED, OUTCOME_BURNT, type Outcome } from './constants.js';
import { isFirstRoundBonusEligible } from './bonusTrigger.js';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

// Six of seven correct — no bonus
{
  const outcomes: Outcome[] = Array(7).fill(OUTCOME_COOKED);
  const guesses: Outcome[] = Array(7).fill(OUTCOME_COOKED);
  guesses[6] = OUTCOME_BURNT;
  assert(!isFirstRoundBonusEligible(guesses, outcomes), '6/7 correct should not trigger');
}

// Seven of seven — bonus
{
  const outcomes: Outcome[] = Array(7).fill(OUTCOME_COOKED);
  const guesses: Outcome[] = Array(7).fill(OUTCOME_COOKED);
  assert(isFirstRoundBonusEligible(guesses, outcomes), '7/7 should trigger');
}

// Length mismatch — not eligible
{
  assert(
    !isFirstRoundBonusEligible([OUTCOME_COOKED], [OUTCOME_COOKED, OUTCOME_BURNT]),
    'length mismatch should not trigger'
  );
}

console.log('OK: bonus eligibility scenarios');
process.exit(0);
