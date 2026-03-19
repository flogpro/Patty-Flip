import { useState, useEffect, memo } from 'react';
import { OUTCOME_BURNT, type Outcome } from 'shared/constants';
import { PATTY_COOKED_URL, PATTY_RAW_URL } from '../constants';

type PattyFlipProps = {
  outcome: Outcome;
  delayMs?: number;
};

/** Single patty with coin-flip animation. outcome = which side lands up. Uses cooked/raw patty assets. */
export const PattyFlip = memo(function PattyFlip({ outcome, delayMs = 0 }: PattyFlipProps) {
  const [rotation, setRotation] = useState(0);
  const [hasStarted, setHasStarted] = useState(delayMs === 0);
  useEffect(() => {
    if (delayMs === 0) {
      const raf = requestAnimationFrame(() => {
        setHasStarted(true);
        setRotation(720 + (outcome === OUTCOME_BURNT ? 180 : 0));
      });
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => {
      setHasStarted(true);
      setRotation(720 + (outcome === OUTCOME_BURNT ? 180 : 0));
    }, delayMs);
    return () => clearTimeout(t);
  }, [outcome, delayMs]);
  return (
    <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-full" style={{ perspective: '100px' }}>
      <div
        className={`relative w-10 h-10 rounded-full transition-transform ease-out ${hasStarted ? 'duration-[700ms]' : 'duration-0'}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full ring-1 ring-violet-900/50 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          <img src={PATTY_COOKED_URL} alt="Cooked" className="w-full h-full object-cover" />
        </div>
        <div
          className="absolute inset-0 rounded-full ring-1 ring-violet-950/60 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <img src={PATTY_RAW_URL} alt="Raw" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
});
