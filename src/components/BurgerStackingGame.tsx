import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BONUS_GAME_DURATION_MS,
  BONUS_SPEED_INTERVAL_MS,
  BONUS_STACK_OFFSET_THRESHOLD,
  BONUS_BUN_MOVE_PX,
  BONUS_FALL_SPEED_BASE,
  BONUS_SPAWN_INTERVAL_MS,
  BONUS_BOMB_CHANCE,
  BONUS_END_SCREEN_DURATION_MS,
} from '../constants';

const BONUS_ITEMS = ['🍔', '🥬', '🍅', '🧅', '🥒', '🍟', '🧀', '🥓', '🌶️', '🥗'];
const BOMB_EMOJI = '💣';

/** Rectangle background color (Tailwind) per item emoji when stacked on the bun. */
const ITEM_STACK_COLOR: Record<string, string> = {
  '🍔': 'bg-amber-800 border-amber-700',
  '🥬': 'bg-green-500 border-green-600',
  '🍅': 'bg-red-500 border-red-600',
  '🧅': 'bg-amber-100 border-amber-200',
  '🥒': 'bg-emerald-500 border-emerald-600',
  '🍟': 'bg-yellow-400 border-yellow-500',
  '🧀': 'bg-yellow-300 border-amber-400',
  '🥓': 'bg-rose-300 border-rose-400',
  '🌶️': 'bg-red-600 border-red-700',
  '🥗': 'bg-lime-400 border-lime-500',
};
const ITEM_SIZE = 40;
const BUN_WIDTH = 80;
const BUN_HALF = BUN_WIDTH / 2;
/** Stacked items on the bun: uniform width close to bun width (horizontal placement still varies via offset). */
const STACK_ITEM_WIDTH_PX = BUN_WIDTH - 4;
const TIMER_BAR_HEIGHT = 44;
const CATCH_MARGIN = 4; // extra px overlap to count as catch
/** Swipe movement multiplier for more responsive touch control. */
const SWIPE_SENSITIVITY = 1.35;
/** Stacked items are thin so the full stack never exceeds 1/4 of the game area. */
const STACK_ITEM_HEIGHT_PX = 5;
const STACK_ITEM_MARGIN_PX = 0;
const STACK_MAX_HEIGHT_PX = 90;
/** Multiplier progress bar: max multiplier steps shown. */
const MULTIPLIER_MAX_STEPS = 20;
/** Milestones that trigger a brief celebration (e.g. 2×, 5×, 10×). */
const MULTIPLIER_MILESTONES = [2, 5, 10, 15, 20];

type StackItem = { id: number; label: string; offsetPx: number };

type FallingThing = {
  id: number;
  type: 'item' | 'bomb';
  label: string;
  x: number;
  y: number;
};

type Props = {
  onComplete: (stackedCount: number, collapsed: boolean) => void;
};

export function BurgerStackingGame({ onComplete }: Props) {
  const [timeLeftMs, setTimeLeftMs] = useState(BONUS_GAME_DURATION_MS);
  const [stack, setStack] = useState<StackItem[]>([]);
  const [gameOver, setGameOver] = useState<{ bomb: boolean } | null>(null);
  /** When set, bonus round ended; show "Bonus round complete" screen then call onComplete after delay. */
  const [bonusEnding, setBonusEnding] = useState<{
    stackedCount: number;
    collapsed: boolean;
  } | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [bunX, setBunX] = useState(200);
  const [fallingItems, setFallingItems] = useState<FallingThing[]>([]);
  /** Game loop always runs once mounted (Round 1 intro is handled in BonusModal). */
  const gameStarted = true;
  const containerRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const fallSpeedRef = useRef(BONUS_FALL_SPEED_BASE);
  const stackLengthRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartBunXRef = useRef(0);
  const bunXRef = useRef(0);
  const fallingRef = useRef<FallingThing[]>([]);
  const gameOverRef = useRef(false);
  bunXRef.current = bunX;
  fallingRef.current = fallingItems;
  gameOverRef.current = gameOver !== null;

  useEffect(() => {
    stackLengthRef.current = stack.length;
  }, [stack.length]);

  // When bonus ending screen is showing, call onComplete after delay then return to game
  useEffect(() => {
    if (!bonusEnding) return;
    const t = setTimeout(() => {
      onComplete(bonusEnding.stackedCount, bonusEnding.collapsed);
      setBonusEnding(null);
    }, BONUS_END_SCREEN_DURATION_MS);
    return () => clearTimeout(t);
  }, [bonusEnding, onComplete]);

  // Multiplier milestone celebration (2×, 5×, 10×, etc.)
  useEffect(() => {
    const mult = 1 + stack.length;
    if (MULTIPLIER_MILESTONES.includes(mult)) {
      setMilestone(mult);
      const t = setTimeout(() => setMilestone(null), 900);
      return () => clearTimeout(t);
    }
  }, [stack.length]);

  // Timer
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const start = Date.now();
    startTimeRef.current = start;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, BONUS_GAME_DURATION_MS - elapsed);
      setTimeLeftMs(left);
      if (left <= 0) {
        clearInterval(interval);
        setBonusEnding({ stackedCount: stackLengthRef.current, collapsed: false });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, onComplete]);

  // Speed ramp every 15s
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const elapsed = Date.now() - startTimeRef.current;
    const level = Math.min(3, Math.floor(elapsed / BONUS_SPEED_INTERVAL_MS));
    fallSpeedRef.current = BONUS_FALL_SPEED_BASE * (1 + level * 0.4);
  }, [gameStarted, gameOver, timeLeftMs]);

  // Arrow keys
  useEffect(() => {
    if (!gameStarted || gameOver || !containerRef.current) return;
    const el = containerRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setBunX((x) => Math.max(BUN_HALF, x - BONUS_BUN_MOVE_PX));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setBunX((x) =>
          Math.min((el.getBoundingClientRect?.()?.width ?? 300) - BUN_HALF, x + BONUS_BUN_MOVE_PX)
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameStarted, gameOver]);

  // Initialize bun at center when game starts (after layout so container has real width)
  useEffect(() => {
    if (!gameStarted || !containerRef.current) return;
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (w > 50) setBunX(w / 2);
    };
    const id = requestAnimationFrame(measure);
    const t = setTimeout(measure, 100);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
  }, [gameStarted]);

  // Touch/swipe for bun
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartBunXRef.current = bunX;
    },
    [bunX]
  );
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.touches[0].clientX - touchStartXRef.current) * SWIPE_SENSITIVITY;
    const newX = touchStartBunXRef.current + dx;
    setBunX(Math.max(BUN_HALF, Math.min(rect.width - BUN_HALF, newX)));
  }, []);

  // Spawn falling items (read width each spawn so we get correct value after layout)
  useEffect(() => {
    if (!gameStarted || gameOver || !containerRef.current) return;
    const padding = ITEM_SIZE;
    const interval = setInterval(() => {
      const el = containerRef.current;
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (w < 60) return;
      const id = nextIdRef.current++;
      const x = padding + Math.random() * Math.max(0, w - 2 * padding);
      const isBomb = Math.random() < BONUS_BOMB_CHANCE;
      const label = isBomb
        ? BOMB_EMOJI
        : BONUS_ITEMS[Math.floor(Math.random() * BONUS_ITEMS.length)];
      setFallingItems((prev) => [
        ...prev,
        { id, type: isBomb ? 'bomb' : 'item', label, x, y: TIMER_BAR_HEIGHT },
      ]);
    }, BONUS_SPAWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  // Game loop: move falling items, detect catches and bombs
  useEffect(() => {
    if (!gameStarted || gameOver || !containerRef.current) return;
    const el = containerRef.current;
    let last = performance.now();
    const loop = (now: number) => {
      if (gameOverRef.current) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const playHeight = el.getBoundingClientRect().height;
      const catchThreshold = playHeight - 30 - ITEM_SIZE;
      const speed = fallSpeedRef.current;
      const currentBunX = bunXRef.current;
      const bunLeft = currentBunX - BUN_HALF - CATCH_MARGIN;
      const bunRight = currentBunX + BUN_HALF + CATCH_MARGIN;
      const prev = fallingRef.current;
      const next: FallingThing[] = [];
      let addToStack: { id: number; label: string; offsetPx: number } | null = null;
      let endBomb = false;
      let endCollapse = false;
      for (const f of prev) {
        const newY = f.y + speed * dt;
        if (newY >= catchThreshold) {
          const itemCenterX = f.x + ITEM_SIZE / 2;
          if (itemCenterX >= bunLeft && itemCenterX <= bunRight) {
            if (f.type === 'bomb') {
              endBomb = true;
            } else {
              const offsetPx = itemCenterX - currentBunX;
              if (Math.abs(offsetPx) > BONUS_STACK_OFFSET_THRESHOLD) {
                endCollapse = true;
              } else {
                addToStack = { id: f.id, label: f.label, offsetPx };
              }
            }
          }
          continue;
        }
        next.push({ ...f, y: newY });
      }
      fallingRef.current = next;
      setFallingItems(next);
      if (addToStack) setStack((s) => [...s, addToStack!]);
      if (endBomb) {
        gameOverRef.current = true;
        setGameOver({ bomb: true });
        setTimeout(
          () => setBonusEnding({ stackedCount: stackLengthRef.current, collapsed: true }),
          2600
        );
        return;
      }
      if (endCollapse) {
        gameOverRef.current = true;
        setGameOver({ bomb: false });
        setTimeout(
          () => setBonusEnding({ stackedCount: stackLengthRef.current, collapsed: true }),
          2600
        );
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameStarted, gameOver, onComplete]);

  const multiplier = 1 + stack.length;
  const showShake = gameOver !== null;
  const showBombFlash = gameOver?.bomb === true;

  return (
    <div
      className="flex w-full gap-2 rounded-xl overflow-hidden bg-[#1f1b18]/98 min-h-[280px]"
      style={{ height: '100%', minHeight: 280 }}
    >
      {/* Left: game area - explicit width so it always has space for bun/items */}
      <div
        ref={containerRef}
        className={`relative flex-1 min-w-0 overflow-hidden rounded-xl border border-violet-600/25 border-t-emerald-500/20 touch-none ${showShake ? 'bonus-shake' : ''}`}
        style={{ minHeight: 240, background: '#1a1614' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        <div
          className="absolute left-0 right-0 flex items-center justify-center shrink-0 z-10 rounded-t-xl border-b border-violet-600/20 border-b-emerald-500/25"
          style={{
            top: 0,
            height: TIMER_BAR_HEIGHT,
            background:
              'linear-gradient(90deg, rgba(6,78,59,0.35) 0%, rgba(26,22,20,0.95) 25%, rgba(26,22,20,0.95) 100%)',
          }}
        >
          <span className="text-violet-100 font-bold tabular-nums">
            {Math.ceil(timeLeftMs / 1000)}
            <span className="text-emerald-300/90">s</span>
          </span>
        </div>
        <p
          className="absolute left-0 right-0 text-center text-violet-300/70 text-[11px] z-10"
          style={{ top: TIMER_BAR_HEIGHT + 2 }}
        >
          ← Arrow keys or swipe to move bun →
        </p>

        {/* Falling items and bombs */}
        {fallingItems.map((f) => (
          <div
            key={f.id}
            className="absolute flex items-center justify-center pointer-events-none z-20"
            style={{
              left: f.x,
              top: f.y,
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              fontSize: f.type === 'bomb' ? '1.5rem' : '1.75rem',
            }}
          >
            {f.label}
          </div>
        ))}

        {/* Stack + bun - z-10 so visible above background; items use uniform width close to bun */}
        <div
          className="absolute bottom-0 flex flex-col items-center z-10"
          style={{ left: bunX - BUN_HALF, width: BUN_WIDTH, paddingBottom: 10 }}
        >
          <div
            className="flex flex-col items-center justify-end overflow-hidden"
            style={{ maxHeight: STACK_MAX_HEIGHT_PX, marginBottom: 2, width: STACK_ITEM_WIDTH_PX }}
          >
            {stack
              .slice()
              .reverse()
              .map((item) => (
                <div
                  key={item.id}
                  className={`rounded-sm border shrink-0 ${ITEM_STACK_COLOR[item.label] ?? 'bg-violet-800/80 border-violet-600'}`}
                  style={{
                    width: STACK_ITEM_WIDTH_PX,
                    height: STACK_ITEM_HEIGHT_PX,
                    marginBottom: STACK_ITEM_MARGIN_PX,
                    transform: `translateX(${item.offsetPx}px)`,
                  }}
                  title={item.label}
                />
              ))}
          </div>
          <div
            className="rounded-b-full bg-amber-200 border-2 border-amber-400 shrink-0 w-full"
            style={{ height: 20 }}
            title="Bun"
          />
        </div>

        {/* Bomb flash overlay */}
        {showBombFlash && (
          <div className="absolute inset-0 bg-red-500/40 bonus-bomb-flash z-[35] pointer-events-none rounded-xl" />
        )}

        {/* Game over message (bomb/collapse) - stays ~2.6s then transitions to bonus-end screen */}
        {gameOver && !bonusEnding && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70 backdrop-blur-sm z-40 bonus-fade-in">
            <p className="text-violet-100 font-semibold text-center px-4 text-sm sm:text-base">
              {gameOver.bomb
                ? 'Bomb hit the bun! Multiplier 1× for this round.'
                : 'Stack fell! Multiplier 1× for this round.'}
            </p>
          </div>
        )}

        {/* Bonus round complete: visual cue before returning to game */}
        {bonusEnding && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/80 backdrop-blur-md z-50 bonus-end-screen">
            <p className="text-violet-100 font-bold text-lg sm:text-xl mb-1">
              Bonus round complete!
            </p>
            <p className="text-violet-200/90 text-sm mb-3">
              Multiplier: {bonusEnding.collapsed ? 1 : 1 + bonusEnding.stackedCount}×
            </p>
            <p className="text-violet-200/70 text-xs animate-pulse">Returning to game…</p>
          </div>
        )}

        {/* Milestone celebration badge */}
        {milestone !== null && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bonus-milestone-pulse pointer-events-none">
            <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 text-white font-black text-lg shadow-[0_0_12px_rgba(139,92,246,0.8)] shadow-[0_0_16px_rgba(16,185,129,0.5)]">
              {milestone}×
            </span>
          </div>
        )}
      </div>

      {/* Right: vertical multiplier progress bar */}
      <div
        className="flex flex-col shrink-0 w-7 sm:w-8 rounded-xl border border-violet-600/25 border-l-emerald-500/25 bg-[#1a1614]/80 overflow-hidden"
        style={{ minHeight: 120 }}
      >
        <div className="shrink-0 text-center text-violet-100 font-bold text-[10px] sm:text-xs py-1 border-b border-violet-600/20 border-b-emerald-500/20">
          <span className="text-emerald-200">{multiplier}</span>×
        </div>
        <div className="flex-1 flex flex-col-reverse gap-px p-1 min-h-0">
          {Array.from({ length: MULTIPLIER_MAX_STEPS }, (_, i) => {
            const step = i + 1;
            const filled = step <= multiplier;
            return (
              <div
                key={step}
                className={`flex-1 min-h-[3px] rounded-sm transition-colors duration-200 ${filled ? 'bg-gradient-to-t from-emerald-500 to-violet-500' : 'bg-violet-900/40'}`}
                title={`${step}×`}
              />
            );
          })}
        </div>
      </div>

      <style>{`
        .bonus-shake { animation: bonus-shake 1.4s ease-out; }
        @keyframes bonus-shake {
          0%, 100% { transform: translateX(0); }
          8% { transform: translateX(-10px); }
          16% { transform: translateX(10px); }
          24% { transform: translateX(-8px); }
          32% { transform: translateX(8px); }
          40% { transform: translateX(-6px); }
          48% { transform: translateX(6px); }
          56% { transform: translateX(-4px); }
          64% { transform: translateX(4px); }
          72% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
          88% { transform: translateX(-1px); }
          96% { transform: translateX(1px); }
        }
        .bonus-bomb-flash { animation: bonus-bomb-flash 1.4s ease-out forwards; }
        @keyframes bonus-bomb-flash {
          0% { opacity: 0.95; }
          25% { opacity: 0.7; }
          50% { opacity: 0.4; }
          75% { opacity: 0.15; }
          100% { opacity: 0; }
        }
        .bonus-fade-in { animation: bonus-fade-in 0.6s ease-out 0.5s both; }
        @keyframes bonus-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .bonus-milestone-pulse { animation: bonus-milestone-pulse 0.9s ease-out; }
        @keyframes bonus-milestone-pulse {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%, 0) scale(1.2); opacity: 1; }
          40% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 0; }
        }
        .bonus-end-screen { animation: bonus-fade-in 0.5s ease-out both; }
      `}</style>
    </div>
  );
}
