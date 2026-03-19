import { useState, useEffect } from 'react';

/** Returns true immediately if revealAfterMs <= 0, otherwise true after that many ms. */
export function useRevealAfter(revealAfterMs: number): boolean {
  const [revealed, setRevealed] = useState(revealAfterMs <= 0);
  useEffect(() => {
    if (revealAfterMs <= 0) return;
    const t = setTimeout(() => setRevealed(true), revealAfterMs);
    return () => clearTimeout(t);
  }, [revealAfterMs]);
  return revealed;
}
