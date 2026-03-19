/** Game state and UI types (client). Outcome from shared/constants. */
import type { Outcome } from 'shared/constants';

export type RunState = {
  burgersUsed: number;
  totalScore: number;
  bestTurnScore: number;
  burgersRemaining: number;
};

export type TurnResult = {
  outcomes: Outcome[];
  turnScore: number;
  totalScore: number;
  burgersUsed: number;
  burgersRemaining: number;
  runOver: boolean;
  /** True when 6+ counting-and-correct patties in this turn; bonus game is offered. */
  bonusTriggered?: boolean;
  /** Set after bonus round completes; used to show "turn × multiplier = winnings". */
  bonusMultiplier?: number;
};

export type GamePhase =
  | 'idle'
  | 'selectGrid'
  | 'guessing'
  | 'flipping'
  | 'turnSummary'
  | 'runOver';

export type GameProps = {
  onError: (msg: string | null) => void;
};
