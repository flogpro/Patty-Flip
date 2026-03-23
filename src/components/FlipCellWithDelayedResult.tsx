import { useEffect, useRef, memo } from 'react';
import type { Outcome } from 'shared/constants';
import { useRevealAfter } from '../hooks/useRevealAfter';
import { PattyFlip } from './PattyFlip';

type FlipCellWithDelayedResultProps = {
  outcome: Outcome;
  delayMs: number;
  correct: boolean;
  revealAfterMs: number;
  onReveal?: () => void;
};

/** Flip cell that reveals correct/wrong ring and badge only after revealAfterMs (for suspense in Regular mode). */
export const FlipCellWithDelayedResult = memo(function FlipCellWithDelayedResult({
  outcome,
  delayMs,
  correct,
  revealAfterMs,
  onReveal,
}: FlipCellWithDelayedResultProps) {
  const revealed = useRevealAfter(revealAfterMs);
  const hasFiredReveal = useRef(false);
  useEffect(() => {
    if (revealed && !hasFiredReveal.current && onReveal) {
      hasFiredReveal.current = true;
      onReveal();
    }
    if (!revealed) hasFiredReveal.current = false;
  }, [revealed, onReveal]);
  return (
    <div className="w-10 h-10 flex items-center justify-center relative">
      <div
        className={`rounded-full p-0.5 ring-2 ${
          revealed
            ? correct
              ? 'ring-emerald-400 bg-emerald-400/30'
              : 'ring-rose-400 bg-rose-400/30'
            : 'ring-violet-900/35 bg-transparent'
        }`}
        title={revealed ? (correct ? 'Correct' : 'Wrong') : undefined}
      >
        <PattyFlip outcome={outcome} delayMs={delayMs} />
      </div>
      {revealed && (
        <span
          className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none ${
            correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
          aria-hidden
        >
          {correct ? '✓' : '✗'}
        </span>
      )}
    </div>
  );
});
