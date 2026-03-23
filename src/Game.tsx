import { useState, useCallback, useEffect, useMemo } from 'react';
import { OUTCOME_BURNT, BURGERS_PER_RUN, GRID_SIZE, type Outcome } from 'shared/constants';
import {
  getRun,
  postStartRun,
  postTurn,
  postBonus,
  SERVER_UNREACHABLE,
  SERVER_UNREACHABLE_SHORT,
} from './api/pattyFlipper';
import { BONUS_MODAL_DELAY_MS, BONUS_TRIGGER_THRESHOLD } from './constants';
import type { RunState, TurnResult, GamePhase, GameProps as Props } from './types/game';
import { BonusModal } from './components/BonusModal';
import { LayoutGrid } from './components/LayoutGrid';
import { PlayViewHeader } from './components/PlayViewHeader';
import { ResultGrid } from './components/ResultGrid';
import { RunOverScreen } from './components/RunOverScreen';

const emptyGrid = () => Array(GRID_SIZE * GRID_SIZE).fill(false) as boolean[];

export default function Game({ onError }: Props) {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [run, setRun] = useState<RunState | null>(null);
  const [activeCells, setActiveCells] = useState<boolean[]>(emptyGrid());
  const [activeCellsForTurn, setActiveCellsForTurn] = useState<{ r: number; c: number }[] | null>(
    null
  );
  const [guesses, setGuesses] = useState<Outcome[]>([]);
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [suspensefulFlip, setSuspensefulFlip] = useState(true);
  const [revealedCount, setRevealedCount] = useState(0);
  const [bonusDismissed, setBonusDismissed] = useState(false);
  const [bonusModalUnlocked, setBonusModalUnlocked] = useState(false);

  const activeCount = useMemo(() => activeCells.filter(Boolean).length, [activeCells]);
  const buildActiveList = useCallback(() => {
    const list: { r: number; c: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++) if (activeCells[r * GRID_SIZE + c]) list.push({ r, c });
    return list;
  }, [activeCells]);
  const getIndexForCell = useCallback(
    (r: number, c: number) => {
      if (!activeCellsForTurn) return -1;
      return activeCellsForTurn.findIndex((cell) => cell.r === r && cell.c === c);
    },
    [activeCellsForTurn]
  );

  const gridMultipliers = useMemo(() => {
    const rowCounts = [0, 1, 2, 3, 4].map(
      (r) => [0, 1, 2, 3, 4].filter((c) => activeCells[r * GRID_SIZE + c]).length
    );
    const colCounts = [0, 1, 2, 3, 4].map(
      (c) => [0, 1, 2, 3, 4].filter((r) => activeCells[r * GRID_SIZE + c]).length
    );
    return { rowCounts, colCounts };
  }, [activeCells]);

  const fetchRun = useCallback(async () => {
    onError(null);
    const result = await getRun();
    if (result.ok) {
      setRun({
        burgersUsed: result.data.burgersUsed,
        totalScore: result.data.totalScore,
        bestTurnScore: result.data.bestTurnScore,
        burgersRemaining: result.data.burgersRemaining,
      });
      setPhase('selectGrid');
      return;
    }
    setRun(null);
    setPhase('idle');
    if ('network' in result && result.network) {
      onError(SERVER_UNREACHABLE);
    }
  }, [onError]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const startRun = async () => {
    onError(null);
    setLoading(true);
    try {
      const result = await postStartRun();
      if (!result.ok) {
        if ('network' in result && result.network) onError(SERVER_UNREACHABLE);
        else if ('message' in result) onError(result.message);
        return;
      }
      setRun({
        burgersUsed: 0,
        totalScore: 0,
        bestTurnScore: 0,
        burgersRemaining: BURGERS_PER_RUN,
      });
      setPhase('selectGrid');
    } finally {
      setLoading(false);
    }
  };

  const startTurn = () => {
    const list = buildActiveList();
    setActiveCellsForTurn(list);
    setGuesses(Array(list.length).fill(OUTCOME_BURNT));
    setTurnResult(null);
    setBonusDismissed(false);
    setBonusModalUnlocked(false);
    setPhase('guessing');
  };

  // Delay showing the bonus modal until after the user has seen the turn result (flip outcome).
  useEffect(() => {
    if (!turnResult?.bonusTriggered) {
      setBonusModalUnlocked(false);
      return;
    }
    const t = setTimeout(() => setBonusModalUnlocked(true), BONUS_MODAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [turnResult?.bonusTriggered]);

  const toggleCell = (r: number, c: number) => {
    setActiveCells((prev) => {
      const next = [...prev];
      next[r * GRID_SIZE + c] = !next[r * GRID_SIZE + c];
      return next;
    });
  };

  const setGuess = (index: number, value: Outcome) => {
    setGuesses((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const submitTurn = async () => {
    if (!activeCellsForTurn) return;
    onError(null);
    setLoading(true);
    try {
      const result = await postTurn({ activeCells: activeCellsForTurn, guesses });
      if (!result.ok) {
        if ('network' in result && result.network) onError(SERVER_UNREACHABLE);
        else if ('message' in result) onError(result.message);
        return;
      }
      const data = result.data;
      setTurnResult({
        outcomes: data.outcomes,
        turnScore: data.turnScore,
        totalScore: data.totalScore,
        burgersUsed: data.burgersUsed,
        burgersRemaining: data.burgersRemaining,
        runOver: data.runOver,
        bonusTriggered: data.bonusTriggered,
      });
      setRun((prev) => ({
        burgersUsed: data.burgersUsed,
        totalScore: data.totalScore,
        bestTurnScore: Math.max(prev?.bestTurnScore ?? 0, data.turnScore),
        burgersRemaining: data.burgersRemaining,
      }));
      setPhase('flipping');
      setRevealedCount(0);
    } finally {
      setLoading(false);
    }
  };

  const completeBonus = async (multiplier: number) => {
    onError(null);
    setLoading(true);
    try {
      const result = await postBonus(multiplier);
      if (!result.ok) {
        if ('network' in result && result.network) onError(SERVER_UNREACHABLE_SHORT);
        else if ('message' in result) onError(result.message);
        setTurnResult((prev) => (prev ? { ...prev, bonusMultiplier: multiplier } : null));
        setBonusDismissed(true);
        return;
      }
      const data = result.data;
      setRun((prev) => ({
        burgersUsed: data.burgersUsed,
        totalScore: data.totalScore,
        bestTurnScore: prev?.bestTurnScore ?? 0,
        burgersRemaining: data.burgersRemaining,
      }));
      setTurnResult((prev) =>
        prev
          ? {
              ...prev,
              totalScore: data.totalScore,
              burgersUsed: data.burgersUsed,
              burgersRemaining: data.burgersRemaining,
              bonusMultiplier: multiplier,
            }
          : null
      );
      setBonusDismissed(true);
    } finally {
      setLoading(false);
    }
  };

  const canStartTurn =
    run && activeCount > 0 && activeCount <= run.burgersRemaining && run.burgersRemaining > 0;

  if (phase === 'idle') {
    return (
      <div className="text-center py-1">
        <p className="text-violet-100/90 text-xs mb-3">
          100 burgers. Guess Cooked or Raw — perfect rows or columns pay out.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={startRun}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600 to-violet-500 text-white hover:from-emerald-500 hover:to-violet-400 disabled:opacity-50 transition shadow-[0_0_10px_rgba(139,92,246,0.35)] shadow-[0_0_14px_rgba(16,185,129,0.2)] border border-emerald-400/40 border-violet-400/40"
        >
          {loading ? 'Starting…' : 'Start run'}
        </button>
      </div>
    );
  }

  /* One 5×5 grid: per-cell activation, then guessing, then flip/results. */
  const isPlayView = phase === 'selectGrid' || phase === 'guessing' || phase === 'flipping';
  const showBonusModal = Boolean(
    turnResult?.bonusTriggered &&
    bonusModalUnlocked &&
    !bonusDismissed &&
    turnResult?.turnScore != null
  );
  if (isPlayView && run) {
    return (
      <div className="bg-gradient-to-b from-emerald-950/10 via-transparent to-transparent rounded-lg -m-1 p-1">
        {showBonusModal && (
          <BonusModal turnScore={turnResult!.turnScore} onComplete={completeBonus} />
        )}
        <PlayViewHeader
          phase={phase}
          run={run}
          loading={loading}
          suspensefulFlip={suspensefulFlip}
          burgersPerRun={BURGERS_PER_RUN}
          onBack={() => setPhase('selectGrid')}
          onSetSuspensefulFlip={setSuspensefulFlip}
        />

        {phase === 'selectGrid' && (
          <>
            <p className="text-center text-[11px] text-violet-200/80 mb-1.5">
              Tap patties to <span className="text-emerald-300 font-medium">activate</span> (green).
            </p>
            <p className="text-center text-[10px] text-violet-300/80 mb-1.5">
              {BONUS_TRIGGER_THRESHOLD}+ correct in a turn → Bonus round
              {activeCount >= BONUS_TRIGGER_THRESHOLD && (
                <span
                  className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-400/40"
                  title="Bonus available with this layout"
                >
                  <svg
                    className="w-3 h-3 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Bonus
                </span>
              )}
            </p>
          </>
        )}
        {phase === 'guessing' && (
          <>
            <p className="text-center text-[11px] text-violet-200/90 mb-1.5">
              Tap active patties: Cooked (C) or Raw (R)
            </p>
            <p className="text-center text-[10px] text-violet-300/80 mb-1.5">
              {BONUS_TRIGGER_THRESHOLD}+ correct → Bonus round
            </p>
          </>
        )}
        {phase === 'flipping' && turnResult && (
          <div className="flex justify-center gap-3 mb-1.5 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="w-4 h-4 rounded-full border-2 border-emerald-400 bg-emerald-400/20" />{' '}
              Correct
            </span>
            <span className="flex items-center gap-1 text-rose-300">
              <span className="w-4 h-4 rounded-full border-2 border-rose-400 bg-rose-400/20" />{' '}
              Wrong
            </span>
          </div>
        )}

        <div className="relative w-full px-16 sm:px-20">
          {/* Spatulas: vertical (figure-skater) spin every 5–10s, staggered so never at same time */}
          <div
            className="absolute left-0 -top-10 origin-top z-10"
            aria-hidden
            style={{ perspective: '280px' }}
          >
            <div
              className="animate-spatula-pirouette"
              style={{ animationDuration: '10s', animationDelay: '0s' }}
            >
              <div className="animate-dance origin-top" style={{ transform: 'scaleX(-1)' }}>
                <img
                  src="/spatula-character-left.png"
                  alt=""
                  className="h-24 w-auto object-contain object-top"
                />
              </div>
            </div>
          </div>
          <div
            className="absolute right-0 -top-10 origin-top z-10"
            aria-hidden
            style={{ perspective: '280px' }}
          >
            <div
              className="animate-spatula-pirouette"
              style={{ animationDuration: '10s', animationDelay: '5s' }}
            >
              <div className="animate-dance origin-top">
                <img
                  src="/spatula-character-right.png"
                  alt=""
                  className="h-24 w-auto object-contain object-top"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-center min-h-[5rem]">
            {phase === 'selectGrid' ? (
              <LayoutGrid
                activeCells={activeCells}
                rowCounts={gridMultipliers.rowCounts}
                colCounts={gridMultipliers.colCounts}
                onToggleCell={toggleCell}
              />
            ) : (
              <ResultGrid
                phase={phase}
                turnResult={turnResult}
                guesses={guesses}
                getIndexForCell={getIndexForCell}
                suspensefulFlip={suspensefulFlip}
                onSetGuess={setGuess}
                onReveal={() => setRevealedCount((c) => c + 1)}
              />
            )}
          </div>
        </div>

        {phase === 'selectGrid' && (
          <p className="text-center text-[11px] text-violet-200/70 mb-2">
            Active: {activeCount} · Perfect column or row = 100×n² pts
          </p>
        )}
        {phase === 'flipping' && turnResult && (
          <>
            <p className="text-center text-sm font-bold text-violet-100 mb-1">
              {suspensefulFlip && activeCellsForTurn ? (
                (() => {
                  const totalPatties = activeCellsForTurn.length;
                  const previousTotal = turnResult.totalScore - turnResult.turnScore;
                  const displayedTurnScore =
                    totalPatties > 0
                      ? Math.round((revealedCount / totalPatties) * turnResult.turnScore)
                      : 0;
                  const displayedTotal = previousTotal + displayedTurnScore;
                  return (
                    <>
                      +{displayedTurnScore} pts · Total: {displayedTotal}
                    </>
                  );
                })()
              ) : turnResult.bonusMultiplier != null ? (
                <>
                  <span className="block text-violet-200/90 text-xs font-normal mb-0.5">
                    Turn winnings
                  </span>
                  <span className="text-violet-100">
                    {turnResult.turnScore.toLocaleString()} × {turnResult.bonusMultiplier} ={' '}
                    <strong className="text-violet-300">
                      {(turnResult.turnScore * turnResult.bonusMultiplier).toLocaleString()} pts
                    </strong>
                  </span>
                  <span className="block text-violet-200/80 text-xs mt-1">
                    Total score: {turnResult.totalScore.toLocaleString()}
                  </span>
                </>
              ) : (
                <>
                  +{turnResult.turnScore} pts · Total: {turnResult.totalScore}
                </>
              )}
            </p>
            {turnResult.bonusMultiplier != null && (
              <div className="text-center py-2 px-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-violet-500/15 border border-violet-500/40 border-t-emerald-400/30 mb-2">
                <p className="text-xs text-violet-200/90 mb-0.5">Points earned this turn</p>
                <p className="text-lg font-bold text-violet-100">
                  +{(turnResult.turnScore * turnResult.bonusMultiplier).toLocaleString()}{' '}
                  <span className="text-emerald-200">pts</span>
                </p>
              </div>
            )}
          </>
        )}
        {phase === 'flipping' && turnResult && (
          <p className="text-center text-[11px] text-violet-200/70 mb-2">
            Burgers left: {turnResult.burgersRemaining}
          </p>
        )}

        {/* One primary action per step */}
        {phase === 'selectGrid' && (
          <button
            type="button"
            disabled={!canStartTurn}
            onClick={startTurn}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600/90 to-violet-500 text-[#1a1614] hover:from-emerald-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_0_8px_rgba(139,92,246,0.3)] shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-emerald-400/30 border-violet-400/40"
          >
            Confirm layout
          </button>
        )}
        {phase === 'guessing' && (
          <button
            type="button"
            disabled={loading}
            onClick={submitTurn}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600/90 to-violet-500 text-[#1a1614] hover:from-emerald-500 hover:to-violet-400 disabled:opacity-50 transition shadow-[0_0_8px_rgba(139,92,246,0.3)] shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-emerald-400/30 border-violet-400/40"
          >
            {loading ? 'Flipping…' : 'Flip'}
          </button>
        )}
        {phase === 'flipping' && turnResult && (
          <button
            type="button"
            disabled={
              (suspensefulFlip &&
                activeCellsForTurn != null &&
                revealedCount < activeCellsForTurn.length) ||
              (turnResult.bonusTriggered && !bonusDismissed)
            }
            onClick={() => {
              if (turnResult.runOver) setPhase('runOver');
              else {
                setTurnResult(null);
                setGuesses(
                  activeCellsForTurn ? Array(activeCellsForTurn.length).fill(OUTCOME_BURNT) : []
                );
                setPhase('guessing');
              }
            }}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600/90 to-violet-500 text-[#1a1614] hover:from-emerald-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_0_8px_rgba(139,92,246,0.3)] shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-emerald-400/30 border-violet-400/40"
          >
            {turnResult.bonusTriggered && !bonusDismissed
              ? 'Bonus round…'
              : turnResult.runOver
                ? 'See results'
                : 'Next turn'}
          </button>
        )}
      </div>
    );
  }

  if (phase === 'runOver' && run) {
    const shareTitle = `My Patty Flipper score: ${run.totalScore.toLocaleString()} pts`;
    const shareText = `I scored ${run.totalScore.toLocaleString()} pts in Patty Flipper! Can you beat it? Play on r/GamesOnReddit.`;
    const shareUrl = `https://www.reddit.com/r/GamesOnReddit/submit?${new URLSearchParams({
      title: shareTitle,
      text: shareText,
    }).toString()}`;

    const buildChallengeUrl = (toUsername: string) => {
      const subject = 'Patty Flipper challenge!';
      const message = `I scored ${run.totalScore.toLocaleString()} pts in Patty Flipper. Can you beat my score? Play the game on r/GamesOnReddit and try to top it!`;
      return `https://www.reddit.com/message/compose/?${new URLSearchParams({
        to: toUsername.replace(/^u\//i, ''),
        subject,
        message,
      }).toString()}`;
    };

    return (
      <RunOverScreen
        run={run}
        loading={loading}
        onNewRun={startRun}
        shareUrl={shareUrl}
        buildChallengeUrl={buildChallengeUrl}
      />
    );
  }

  return <div className="text-center text-violet-200/70 text-xs py-4">Loading…</div>;
}
