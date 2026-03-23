import { OUTCOME_COOKED, OUTCOME_BURNT, GRID_SIZE, type Outcome } from 'shared/constants';
import type { GamePhase, TurnResult } from '../types/game';
import { PATTY_COOKED_URL, PATTY_RAW_URL, FLIP_STAGGER_MS, FLIP_DURATION_MS } from '../constants';
import { FlipCellWithDelayedResult } from './FlipCellWithDelayedResult';

function InactiveCell() {
  return (
    <div
      className="w-10 h-10 rounded-full bg-violet-950/20 border border-violet-900/20 flex-shrink-0"
      aria-hidden
    />
  );
}

type ResultGridProps = {
  phase: GamePhase;
  turnResult: TurnResult | null;
  guesses: Outcome[];
  getIndexForCell: (r: number, c: number) => number;
  suspensefulFlip: boolean;
  onSetGuess: (index: number, value: Outcome) => void;
  onReveal?: () => void;
};

/** Guess/flip/result 5×5 grid: inactive cells, guessing toggles, or flip cells with delayed result. */
export function ResultGrid({
  phase,
  turnResult,
  guesses,
  getIndexForCell,
  suspensefulFlip,
  onSetGuess,
  onReveal,
}: ResultGridProps) {
  return (
    <div
      className="grid gap-1 mb-2 justify-center justify-items-center w-fit"
      style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
    >
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2, 3, 4].map((c) => {
          const index = getIndexForCell(r, c);
          const activeThisTurn = index >= 0;

          if (!activeThisTurn) {
            return (
              <div key={`${r}-${c}`} className="w-10 h-10 flex items-center justify-center">
                <InactiveCell />
              </div>
            );
          }
          if (phase === 'guessing') {
            const isCooked = guesses[index] === OUTCOME_COOKED;
            return (
              <div key={`${r}-${c}`} className="w-10 h-10 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onSetGuess(index, isCooked ? OUTCOME_BURNT : OUTCOME_COOKED)}
                  className={`w-10 h-10 rounded-full overflow-hidden transition ring-2 flex items-center justify-center focus:outline-none focus:ring-offset-1 focus:ring-offset-[#1f1b18] ${
                    isCooked ? 'ring-violet-400' : 'ring-stone-800'
                  }`}
                  title={isCooked ? 'Cooked (tap for Raw)' : 'Raw (tap for Cooked)'}
                >
                  <img
                    src={isCooked ? PATTY_COOKED_URL : PATTY_RAW_URL}
                    alt={isCooked ? 'Cooked' : 'Raw'}
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            );
          }
          if (phase === 'flipping' && turnResult) {
            const out = turnResult.outcomes[index];
            const correct = guesses[index] === out;
            const delay = !suspensefulFlip ? 0 : index * FLIP_STAGGER_MS;
            const revealAfterMs = suspensefulFlip ? delay + FLIP_DURATION_MS : 0;
            const cellOnReveal = suspensefulFlip && onReveal ? onReveal : undefined;
            return (
              <FlipCellWithDelayedResult
                key={`${r}-${c}`}
                outcome={out}
                delayMs={delay}
                correct={correct}
                revealAfterMs={revealAfterMs}
                onReveal={cellOnReveal}
              />
            );
          }
          return (
            <div key={`${r}-${c}`} className="w-10 h-10 flex items-center justify-center">
              <InactiveCell />
            </div>
          );
        })
      )}
    </div>
  );
}
