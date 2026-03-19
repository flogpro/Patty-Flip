import { useState, useEffect } from 'react';
import { BurgerStackingGame } from './BurgerStackingGame';
import { FlipOntoBunGame } from './FlipOntoBunGame';
import { BONUS_ROUND2_ITEM_THRESHOLD, BONUS_GAME_DURATION_MS } from '../constants';

const INTRO_DURATION_MS = 1600;
const ROUND1_DURATION_SEC = Math.round(BONUS_GAME_DURATION_MS / 1000);

/** Round 1 intro: visual rules and one Start button. */
function Round1Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-3 min-h-0 text-center">
      <h3 className="text-violet-100 font-bold text-sm sm:text-base mb-3">
        Round 1 <span className="text-emerald-300">·</span> Stack on the bun
      </h3>
      {/* Visual: falling items + bun */}
      <div className="w-full max-w-[200px] rounded-lg bg-violet-950/40 border border-violet-600/30 p-3 mb-4">
        <div className="flex justify-center gap-2 mb-2 text-xl">
          <span className="opacity-90">🍔</span>
          <span className="opacity-90">🥬</span>
          <span className="opacity-70">💣</span>
        </div>
        <div className="h-1.5 bg-amber-700/60 rounded-full w-16 mx-auto" aria-hidden />
        <p className="text-[10px] text-violet-300/80 mt-1">Items fall → catch on bun</p>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-left text-[11px] text-violet-200/90 mb-4 max-w-[260px]">
        <li className="flex items-center gap-2">
          <span className="text-base">✓</span> Catch items on bun
        </li>
        <li className="flex items-center gap-2">
          <span className="text-base">✗</span> Avoid bombs
        </li>
        <li className="flex items-center gap-2">
          <span className="text-base">↔</span> Arrows or swipe to move
        </li>
        <li className="flex items-center gap-2">
          <span className="text-base">⏱</span> {ROUND1_DURATION_SEC} seconds
        </li>
      </ul>
      <p className="text-[10px] text-violet-300/70 mb-3">Multiplier = 1× + 1× per item stacked</p>
      <button
        type="button"
        onClick={onStart}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600 to-violet-500 text-white hover:from-emerald-500 hover:to-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.4)] shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/40 border-violet-400/40 transition"
      >
        Start
      </button>
    </div>
  );
}

/** Round 2 intro: target multipliers visual and one shot rule. */
function Round2Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-3 min-h-0 text-center">
      <h3 className="text-violet-100 font-bold text-sm sm:text-base mb-3">
        Round 2 <span className="text-amber-300">·</span> Flip onto a bun
      </h3>
      {/* Visual: three targets with multipliers */}
      <div className="flex justify-center items-end gap-3 sm:gap-4 mb-4">
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-400 bg-emerald-500/20 flex items-center justify-center text-emerald-200 font-bold text-sm">
            2.5×
          </div>
          <span className="text-[10px] text-violet-300/90">Close</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center text-amber-200 font-bold text-sm">
            5×
          </div>
          <span className="text-[10px] text-violet-300/90">Medium</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full border-2 border-yellow-400 bg-yellow-500/20 flex items-center justify-center text-yellow-200 font-bold text-sm">
            10×
          </div>
          <span className="text-[10px] text-violet-300/90">Far</span>
        </div>
      </div>
      <p className="text-[11px] text-violet-200/90 mb-1">Pull back spatula & release — one shot</p>
      <p className="text-[10px] text-violet-300/70 mb-4">Land on a bun to multiply your Round 1 bonus</p>
      <button
        type="button"
        onClick={onStart}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-600 to-violet-500 text-white hover:from-amber-500 hover:to-violet-400 shadow-[0_0_8px_rgba(245,158,11,0.4)] shadow-[0_0_12px_rgba(139,92,246,0.3)] border border-amber-400/40 border-violet-400/40 transition"
      >
        Start Round 2
      </button>
    </div>
  );
}

type Props = {
  turnScore: number;
  onComplete: (multiplier: number) => void;
};

export function BonusModal({ turnScore, onComplete }: Props) {
  const [showIntro, setShowIntro] = useState(true);
  const [round1IntroDone, setRound1IntroDone] = useState(false);
  /** When round 1 ends with 16+ items, we show round 2 (flip onto bun). */
  const [round1Result, setRound1Result] = useState<{ stackedCount: number; collapsed: boolean } | null>(null);
  const [round2IntroDone, setRound2IntroDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), INTRO_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  const handleGameComplete = (stackedCount: number, collapsed: boolean) => {
    const round1Multiplier = collapsed ? 1 : 1 + stackedCount;
    if (stackedCount >= BONUS_ROUND2_ITEM_THRESHOLD && !collapsed) {
      setRound1Result({ stackedCount, collapsed });
      return;
    }
    onComplete(round1Multiplier);
  };

  const handleRound2Complete = (round2Multiplier: number) => {
    if (!round1Result) return;
    const round1Multiplier = 1 + round1Result.stackedCount;
    onComplete(round1Multiplier * round2Multiplier);
  };

  const startRound1 = () => setRound1IntroDone(true);
  const startRound2 = () => setRound2IntroDone(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-2 overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bonus-title"
    >
      {/* Celebratory intro: "BONUS!" burst then fade into modal */}
      {showIntro && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-emerald-500/15 from-20% via-violet-500/20 to-violet-500/15 pointer-events-none"
          aria-hidden
        >
          <div className="bonus-intro-text text-violet-100 font-black text-4xl sm:text-5xl tracking-wider drop-shadow-[0_0_20px_rgba(139,92,246,0.8)] drop-shadow-[0_0_24px_rgba(16,185,129,0.4)]">
            BONUS!
          </div>
        </div>
      )}

      <div
        className={`w-full max-w-[420px] max-h-[calc(100vh-0.5rem)] flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-violet-600/25 border-t-emerald-500/30 bg-[#1f1b18]/96 backdrop-blur-md transition-opacity duration-300 ${showIntro ? 'opacity-0' : 'opacity-100'}`}
        style={{ minHeight: 0 }}
      >
        <header className="shrink-0 border-b border-violet-500/20 border-b-emerald-500/20 px-2.5 py-2 bg-gradient-to-r from-emerald-950/20 to-transparent">
          <h2 id="bonus-title" className="text-center text-violet-100 font-bold text-sm sm:text-base">
            Bonus round <span className="text-emerald-300">·</span>
          </h2>
          <p className="text-center text-violet-200/80 text-[11px] sm:text-xs mt-0.5">
            Turn score: {turnScore} pts · Multiplier applies when you finish
          </p>
        </header>
        <div className="flex-1 min-h-[300px] flex flex-col p-1.5 sm:p-2">
          {round1Result ? (
            round2IntroDone ? (
              <FlipOntoBunGame
                round1Multiplier={1 + round1Result.stackedCount}
                onComplete={handleRound2Complete}
              />
            ) : (
              <Round2Intro onStart={startRound2} />
            )
          ) : round1IntroDone ? (
            <BurgerStackingGame onComplete={handleGameComplete} />
          ) : (
            <Round1Intro onStart={startRound1} />
          )}
        </div>
      </div>

      <style>{`
        .bonus-intro-text {
          animation: bonus-intro 1.6s ease-out forwards;
        }
        @keyframes bonus-intro {
          0% { transform: scale(0.3); opacity: 0; filter: blur(4px); }
          25% { transform: scale(1.15); opacity: 1; filter: blur(0); }
          50% { transform: scale(1.05); opacity: 1; }
          75% { opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
