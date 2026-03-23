import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BONUS_ROUND2_MULTIPLIERS } from '../constants';

const ARENA_WIDTH_PX = 340;
const ARENA_HEIGHT_PX = 240;
const CENTER_X = ARENA_WIDTH_PX / 2;
const LAUNCHER_REST_Y = 218;
const BURGER_SIZE = 26;
const GRAVITY = 380;
const PULL_THRESHOLD_PX = 28;
const PULL_MAX_PX = 95;
const PULL_TO_VELOCITY = 4.8;

/** Topgolf-style: targets spread out (x, y), radius, multiplier. Close = larger y (near launcher), Far = smaller y. */
const TARGETS = [
  {
    x: 85,
    y: 125,
    radius: 26,
    mult: BONUS_ROUND2_MULTIPLIERS[0],
    label: '2.5×',
    zone: 'close',
    color: 'emerald',
  },
  {
    x: 250,
    y: 75,
    radius: 24,
    mult: BONUS_ROUND2_MULTIPLIERS[1],
    label: '5×',
    zone: 'medium',
    color: 'amber',
  },
  {
    x: 170,
    y: 38,
    radius: 22,
    mult: BONUS_ROUND2_MULTIPLIERS[2],
    label: '10×',
    zone: 'far',
    color: 'yellow',
  },
] as const;

/** Simulate arc for trajectory preview; returns array of points. */
function simulateArc(
  startX: number,
  startY: number,
  vx: number,
  vy: number,
  steps: number,
  gravity: number
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let x = startX;
  let y = startY;
  let vvy = vy;
  for (let i = 0; i < steps; i++) {
    pts.push({ x, y });
    x += vx * 0.02;
    y += vvy * 0.02;
    vvy += gravity * 0.02;
    if (y > ARENA_HEIGHT_PX + 20) break;
  }
  return pts;
}

type Props = {
  round1Multiplier: number;
  onComplete: (round2Multiplier: number) => void;
};

export function FlipOntoBunGame({ round1Multiplier, onComplete }: Props) {
  const [flying, setFlying] = useState(false);
  const [flyPos, setFlyPos] = useState<{ x: number; y: number } | null>(null);
  const [result, setResult] = useState<{
    multiplier: number;
    x: number;
    y: number;
    missReason?: 'short' | 'far';
  } | null>(null);
  const [drag, setDrag] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const posRef = useRef({ x: CENTER_X, y: LAUNCHER_REST_Y });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const rafRef = useRef<number>(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  dragRef.current = drag;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [arenaScale, setArenaScale] = useState(1);

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const s = Math.min(r.width / ARENA_WIDTH_PX, r.height / ARENA_HEIGHT_PX);
        setArenaScale(s);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const launchFromPull = useCallback(
    (startX: number, startY: number, endX: number, endY: number) => {
      const dx = startX - endX;
      const dy = startY - endY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PULL_THRESHOLD_PX) return;
      const clamped = Math.min(dist, PULL_MAX_PX);
      const speed = clamped * PULL_TO_VELOCITY;
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;
      posRef.current = { x: CENTER_X, y: LAUNCHER_REST_Y };
      velocityRef.current = { vx, vy };
      setFlyPos(posRef.current);
      setFlying(true);
    },
    []
  );

  const toLogicCoords = useCallback((clientX: number, clientY: number) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return { x: CENTER_X, y: LAUNCHER_REST_Y };
    const x = ((clientX - rect.left) / rect.width) * ARENA_WIDTH_PX;
    const y = ((clientY - rect.top) / rect.height) * ARENA_HEIGHT_PX;
    return { x, y };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (flying || result) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const { x, y } = toLogicCoords(e.clientX, e.clientY);
      setDrag({ startX: CENTER_X, startY: LAUNCHER_REST_Y, currentX: x, currentY: y });
    },
    [flying, result, toLogicCoords]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      const { x, y } = toLogicCoords(e.clientX, e.clientY);
      const pullY = Math.max(y, drag.startY);
      setDrag((d) => (d ? { ...d, currentX: x, currentY: pullY } : null));
    },
    [drag, toLogicCoords]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      const d = dragRef.current;
      if (d) {
        launchFromPull(d.startX, d.startY, d.currentX, d.currentY);
        setDrag(null);
      }
    },
    [launchFromPull]
  );

  useEffect(() => {
    if (!flying) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const pos = posRef.current;
      const v = velocityRef.current;
      const nx = pos.x + v.vx * dt;
      const ny = pos.y + v.vy * dt;
      velocityRef.current = { vx: v.vx, vy: v.vy + GRAVITY * dt };
      posRef.current = { x: nx, y: ny };
      // Land when falling and within range of any target, or miss (short / far)
      if (v.vy > 0) {
        for (let i = 0; i < TARGETS.length; i++) {
          const t = TARGETS[i];
          const d = Math.sqrt((nx - t.x) ** 2 + (ny - t.y) ** 2);
          if (d <= t.radius) {
            setFlyPos(null);
            setFlying(false);
            setResult({ multiplier: t.mult, x: nx, y: ny });
            return;
          }
        }
        if (ny > 190) {
          setFlyPos(null);
          setFlying(false);
          setResult({ multiplier: 1, x: nx, y: ny, missReason: 'short' });
          return;
        }
        if (ny < 25) {
          setFlyPos(null);
          setFlying(false);
          setResult({ multiplier: 1, x: nx, y: ny, missReason: 'far' });
          return;
        }
      }
      setFlyPos({ x: nx, y: ny });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [flying]);

  useEffect(() => {
    if (!result) return;
    const mult = result.multiplier;
    const t = setTimeout(() => onCompleteRef.current(mult), 2200);
    return () => clearTimeout(t);
  }, [result]);

  const displayX = flyPos?.x ?? result?.x ?? (drag ? drag.currentX : CENTER_X);
  const displayY = flyPos?.y ?? result?.y ?? (drag ? drag.currentY : LAUNCHER_REST_Y);
  const pullDist = drag
    ? Math.sqrt((drag.startX - drag.currentX) ** 2 + (drag.startY - drag.currentY) ** 2)
    : 0;
  const canLaunch = pullDist >= PULL_THRESHOLD_PX;

  const trajectoryPreview = useMemo(() => {
    if (!drag || pullDist < PULL_THRESHOLD_PX) return [];
    const dx = CENTER_X - drag.currentX;
    const dy = LAUNCHER_REST_Y - drag.currentY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = Math.min(dist, PULL_MAX_PX) * PULL_TO_VELOCITY;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    return simulateArc(CENTER_X, LAUNCHER_REST_Y, vx, vy, 80, GRAVITY);
  }, [drag, pullDist]);

  const powerPct = Math.min(100, (pullDist / PULL_MAX_PX) * 100);

  return (
    <div className="flex flex-col items-center w-full min-h-0">
      <div
        ref={arenaRef}
        className="relative rounded-xl border border-violet-600/25 border-t-amber-500/30 overflow-hidden mb-3 touch-none select-none w-full"
        style={{
          maxWidth: ARENA_WIDTH_PX,
          aspectRatio: `${ARENA_WIDTH_PX} / ${ARENA_HEIGHT_PX}`,
          height: 'auto',
          minHeight: 200,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: ARENA_WIDTH_PX,
            height: ARENA_HEIGHT_PX,
            transform: `scale(${arenaScale})`,
          }}
        >
          {/* Topgolf-style range: trapezoid / downward perspective */}
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                'linear-gradient(180deg, #0f172a 0%, #1e293b 25%, #334155 55%, #1e3a2f 85%, #14532d 100%)',
              clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'repeating-linear-gradient(90deg, transparent, transparent 34px, rgba(255,255,255,0.06) 34px, rgba(255,255,255,0.06) 35px)',
              clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)',
            }}
          />

          {/* Spread-out targets (Topgolf style): each with ring + label */}
          {TARGETS.map((t) => (
            <div
              key={t.label}
              className="absolute flex flex-col items-center"
              style={{ left: t.x - t.radius - 4, top: t.y - t.radius - 18 }}
            >
              <div
                className={`rounded-full border-2 flex items-center justify-center font-bold text-sm shadow-lg ${
                  t.color === 'emerald'
                    ? 'bg-emerald-400/90 border-emerald-300 ring-2 ring-emerald-300/50'
                    : t.color === 'amber'
                      ? 'bg-amber-300/90 border-amber-200 ring-2 ring-amber-200/50'
                      : 'bg-yellow-300/90 border-yellow-200 ring-2 ring-yellow-200/50'
                }`}
                style={{
                  width: (t.radius + 4) * 2,
                  height: (t.radius + 4) * 2,
                  boxShadow: `0 0 12px ${t.color === 'emerald' ? 'rgba(16,185,129,0.5)' : t.color === 'amber' ? 'rgba(245,158,11,0.5)' : 'rgba(234,179,8,0.5)'}`,
                }}
              >
                <span className="text-stone-900 drop-shadow-sm">{t.label}</span>
              </div>
              <span className="text-[10px] font-medium text-violet-200 mt-0.5 capitalize">
                {t.zone}
              </span>
            </div>
          ))}

          {/* Trajectory preview (dotted arc) */}
          {trajectoryPreview.length > 1 && (
            <svg
              className="absolute pointer-events-none"
              width={ARENA_WIDTH_PX}
              height={ARENA_HEIGHT_PX}
              style={{ left: 0, top: 0 }}
            >
              <polyline
                points={trajectoryPreview.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(251,191,36,0.7)"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Burger */}
          <div
            className="absolute flex items-center justify-center text-2xl transition-none pointer-events-none drop-shadow-md"
            style={{
              left: displayX - BURGER_SIZE / 2,
              top: displayY - BURGER_SIZE / 2,
              width: BURGER_SIZE,
              height: BURGER_SIZE,
            }}
          >
            🍔
          </div>

          {/* Launcher + aim arrow + power bar with zones */}
          {!flying && !result && (
            <>
              <div
                className="absolute flex items-center justify-center text-3xl opacity-95 drop-shadow-md"
                style={{
                  left: (drag ? drag.currentX : CENTER_X) - 24,
                  top: (drag ? drag.currentY : LAUNCHER_REST_Y) - 8,
                  width: 48,
                  height: 24,
                  transform: drag
                    ? `rotate(${Math.atan2(drag.currentY - drag.startY, drag.currentX - drag.startX) * (180 / Math.PI) + 90}deg)`
                    : 'rotate(0deg)',
                }}
                aria-hidden
              >
                🍳
              </div>
              {drag && pullDist > 6 && (
                <>
                  <svg
                    className="absolute pointer-events-none"
                    width={ARENA_WIDTH_PX}
                    height={ARENA_HEIGHT_PX}
                    style={{ left: 0, top: 0 }}
                  >
                    <defs>
                      <marker
                        id="flip-arrowhead"
                        markerWidth="10"
                        markerHeight="8"
                        refX="9"
                        refY="4"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 4, 0 8" fill="rgb(251,191,36)" />
                      </marker>
                    </defs>
                    <line
                      x1={drag.currentX}
                      y1={drag.currentY}
                      x2={drag.startX}
                      y2={drag.startY}
                      stroke="rgb(251,191,36)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      markerEnd="url(#flip-arrowhead)"
                      opacity="0.9"
                    />
                  </svg>
                  {/* Power bar with 2.5× / 5× / 10× zones */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-lg bg-violet-950/90 border border-violet-600 overflow-hidden"
                    style={{ bottom: 8, width: 160, height: 20 }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-l-lg transition-all duration-75"
                      style={{
                        width: `${powerPct}%`,
                        background:
                          'linear-gradient(90deg, rgba(16,185,129,0.7), rgba(245,158,11,0.7), rgba(234,179,8,0.7))',
                      }}
                    />
                    <div className="absolute inset-0 flex pointer-events-none">
                      <div className="flex-1 border-r border-violet-600/60 flex items-center justify-center text-[9px] font-semibold text-emerald-200">
                        2.5×
                      </div>
                      <div className="flex-1 border-r border-violet-600/60 flex items-center justify-center text-[9px] font-semibold text-amber-200">
                        5×
                      </div>
                      <div className="flex-1 flex items-center justify-center text-[9px] font-semibold text-yellow-200">
                        10×
                      </div>
                    </div>
                  </div>
                  <p
                    className={`absolute left-1/2 -translate-x-1/2 bottom-10 text-center text-sm font-semibold px-2 py-1 rounded-lg ${canLaunch ? 'bg-emerald-500/90 text-[#0f172a]' : 'bg-violet-800/95 text-violet-200'}`}
                  >
                    {canLaunch
                      ? 'Release to launch!'
                      : `Pull more (${Math.round(pullDist)} / ${PULL_THRESHOLD_PX})`}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {!result ? (
        <p className="text-violet-200/70 text-[11px] text-center max-w-[300px] mb-1">
          Drag down to pull back; dotted line shows where the burger will go.
        </p>
      ) : (
        <div className="text-center">
          <p className="text-violet-100 font-bold text-base mb-0.5">
            {result.multiplier > 1 ? (
              <>Landed on {result.multiplier}× bun!</>
            ) : (
              <>
                Missed — 1× {result.missReason === 'short' && '(too short)'}{' '}
                {result.missReason === 'far' && '(too far)'}
              </>
            )}
          </p>
          <p className="text-violet-200/80 text-xs">
            Round 1: {round1Multiplier}× × Round 2: {result.multiplier}× ={' '}
            <strong className="text-emerald-300">{round1Multiplier * result.multiplier}×</strong>{' '}
            total
          </p>
          <p className="text-violet-200/60 text-[11px] mt-1 animate-pulse">Returning to game…</p>
        </div>
      )}
    </div>
  );
}
