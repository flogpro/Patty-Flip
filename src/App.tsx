import { useState, useEffect, lazy, Suspense } from 'react';
import Game from './Game';
import { BONUS_TRIGGER_THRESHOLD, BONUS_ROUND2_ITEM_THRESHOLD } from './constants';

/** Row-major indices for How to Play / Bonus diagrams: seven activated cells (any layout works in-game). */
const BONUS_EXAMPLE_CELL_INDICES = new Set([0, 1, 2, 5, 6, 7, 10]);

const Leaderboard = lazy(() => import('./Leaderboard'));

type View = 'game' | 'leaderboard';

export default function App() {
  const [view, setView] = useState<View>('game');
  const [error, setError] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showBonus, setShowBonus] = useState(false);

  useEffect(() => {
    setError(null);
    setShowHowToPlay(false);
    setShowBonus(false);
  }, [view]);

  return (
    <div className="min-h-screen relative">
      {/* Background image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/background.png)' }}
      />
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/60" aria-hidden />
      {/* Reddit-embed-sized container: ~380px wide, compact padding */}
      <div className="relative min-h-screen flex flex-col items-center p-2 sm:p-3">
        <main className="w-full max-w-[380px] min-h-[420px] rounded-xl overflow-hidden text-violet-50/95 shadow-xl shadow-black/30">
          {/* Dark panel with subtle emerald accent gradient */}
          <div className="bg-gradient-to-b from-emerald-950/20 via-[#1f1b18]/92 to-[#1f1b18]/92 backdrop-blur-sm rounded-xl border border-violet-600/25 border-l-emerald-500/30 p-3">
            <header className="mb-2 border-b border-violet-500/25 border-b-emerald-500/20 pb-2">
              <div className="flex items-center justify-end gap-1">
                <nav className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setView('game')}
                    className={`px-2 py-1 rounded text-xs font-medium transition ${
                      view === 'game'
                        ? 'bg-violet-500 text-[#1a1614] shadow-[0_0_8px_rgba(139,92,246,0.4)] shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-violet-900/50 text-violet-200 hover:bg-violet-800/60 hover:border-emerald-500/30 border border-violet-600/30'
                    }`}
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('leaderboard')}
                    className={`px-2 py-1 rounded text-xs font-medium transition ${
                      view === 'leaderboard'
                        ? 'bg-violet-500 text-[#1a1614] shadow-[0_0_8px_rgba(139,92,246,0.4)] shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-violet-900/50 text-violet-200 hover:bg-violet-800/60 hover:border-emerald-500/30 border border-violet-600/30'
                    }`}
                  >
                    Leaderboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBonus(false);
                      setShowHowToPlay((v) => !v);
                    }}
                    className="px-2 py-1 rounded text-xs font-medium bg-violet-900/50 text-violet-200 hover:bg-violet-800/60 border border-violet-600/30 transition"
                  >
                    How to Play
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHowToPlay(false);
                      setShowBonus((v) => !v);
                    }}
                    className={`px-2 py-1 rounded text-xs font-medium transition ${
                      showBonus
                        ? 'bg-amber-400 text-[#1a1614] border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.7),0_0_20px_rgba(251,191,36,0.4)]'
                        : 'bg-amber-950/80 text-amber-200 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)] hover:bg-amber-900/60 hover:border-amber-400/60 hover:shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                    }`}
                  >
                    Bonus
                  </button>
                </nav>
              </div>
              {showBonus && (
                <div className="mt-2 p-2.5 bg-violet-950/70 bg-gradient-to-br from-amber-950/20 to-violet-950/70 rounded border border-amber-600/30 border-l-amber-500/40 text-[11px] text-violet-100/90 leading-snug space-y-4">
                  <p className="font-semibold text-amber-200">
                    How to unlock and play the bonus rounds
                  </p>

                  <div>
                    <p className="font-medium text-amber-300/95 mb-1">1. Getting into the bonus</p>
                    <p className="mb-1.5">
                      In one turn, get at least <strong>{BONUS_TRIGGER_THRESHOLD}</strong> active
                      patties <strong>correct</strong>: your guess (Cooked or Raw) must match how
                      each patty actually landed. Pattern on the grill does not matter — only how
                      many you got right.
                    </p>
                    <div className="flex justify-center my-1.5">
                      <div
                        className="grid gap-0.5 w-fit"
                        style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
                      >
                        {Array.from({ length: 25 }, (_, i) => {
                          const active = BONUS_EXAMPLE_CELL_INDICES.has(i);
                          return (
                            <div
                              key={i}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center text-[8px] ${
                                active
                                  ? 'bg-emerald-500 border-emerald-400 text-white'
                                  : 'bg-violet-900/50 border-violet-800/50'
                              }`}
                            >
                              {active ? '✓' : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-violet-200/80">
                      Example: seven activated patties (any shape), all guessed right → bonus. You
                      can activate more than seven; you still need {BONUS_TRIGGER_THRESHOLD}+
                      correct after the flip. The bonus modal opens a few seconds after results.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-amber-300/95 mb-1">
                      2. First bonus round — Stack on the bun
                    </p>
                    <p className="mb-1.5">
                      Catch falling items on the bun; avoid bombs. Multiplier = 1× + 1× per item
                      stacked. Use arrow keys or swipe to move the bun. Lasts 30 seconds.
                    </p>
                    <div className="flex justify-center items-end gap-1 my-1.5 py-2">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-violet-300/80">items</span>
                        <div className="w-6 h-4 rounded-sm bg-green-500/80 border border-green-400" />
                        <div className="w-6 h-4 rounded-sm bg-red-500/80 border border-red-400" />
                        <div className="w-6 h-4 rounded-sm bg-yellow-400/80 border border-amber-400" />
                      </div>
                      <div className="rounded-b-full bg-amber-200 border-2 border-amber-400 w-14 h-6 flex items-center justify-center text-[9px] font-bold text-amber-800">
                        bun
                      </div>
                    </div>
                    <p className="text-violet-200/80">
                      Stack as many as you can. If a bomb hits the bun or the stack falls, the round
                      ends with 1×.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-amber-300/95 mb-1">
                      3. Second bonus round — Flip onto a bun (if you catch{' '}
                      {BONUS_ROUND2_ITEM_THRESHOLD}+)
                    </p>
                    <p className="mb-1.5">
                      If you catch <strong>{BONUS_ROUND2_ITEM_THRESHOLD} or more</strong> items in
                      Round 1, you get Round 2: one shot to flip the <strong>cooked patty</strong>{' '}
                      onto a target. Pull back the spatula and release; the dotted arc shows where
                      the patty will go (it spins in flight).
                    </p>
                    <div className="flex justify-center my-1.5">
                      <div
                        className="rounded-lg border border-amber-500/40 bg-stone-900/80 p-2 flex items-end justify-around gap-2"
                        style={{ minWidth: 140 }}
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-400/80 border-2 border-emerald-300 flex items-center justify-center text-[10px] font-bold text-stone-900">
                          2.5×
                        </div>
                        <div className="w-7 h-7 rounded-full bg-amber-300/80 border-2 border-amber-200 flex items-center justify-center text-[9px] font-bold text-stone-900">
                          5×
                        </div>
                        <div className="w-6 h-6 rounded-full bg-yellow-300/80 border-2 border-yellow-200 flex items-center justify-center text-[8px] font-bold text-stone-900">
                          10×
                        </div>
                      </div>
                    </div>
                    <p className="text-violet-200/80">
                      Close = 2.5×, medium = 5×, far = 10×. Your Round 2 multiplier multiplies your
                      Round 1 multiplier, then that total multiplies your turn score.
                    </p>
                  </div>
                </div>
              )}
              {showHowToPlay && (
                <div className="mt-2 p-2.5 bg-violet-950/70 bg-gradient-to-br from-emerald-950/30 to-violet-950/70 rounded border border-violet-600/20 border-l-emerald-500/25 text-[11px] text-violet-100/90 leading-snug space-y-2.5">
                  <p>
                    <strong>Patty Flipper</strong> — 100 burgers per run. Activate patties on the
                    grill (any pattern), guess Cooked (C) or Raw (R) for each active patty, then
                    flip. Only <em>perfect</em> columns or rows score (100×n² pts per column or
                    row).
                  </p>
                  <div>
                    <p className="font-medium text-violet-200 mb-1">The grill (5×5)</p>
                    <p className="mb-1">
                      Tap cells to activate (green). Any pattern is allowed; only active cells are
                      used this turn.
                    </p>
                    <div className="flex justify-center my-1.5">
                      <div
                        className="grid gap-0.5 w-fit"
                        style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
                      >
                        {Array.from({ length: 25 }, (_, i) => {
                          const active = BONUS_EXAMPLE_CELL_INDICES.has(i);
                          return (
                            <div
                              key={i}
                              className={`w-5 h-5 rounded-full border ${
                                active
                                  ? 'bg-emerald-500 border-emerald-400'
                                  : 'bg-violet-900/50 border-violet-800/50'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-violet-200/80">
                      Example: seven active patties (pattern is up to you). Bonus unlocks when{' '}
                      {BONUS_TRIGGER_THRESHOLD}+ of your active guesses match the flip this turn.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-violet-200 mb-1">
                      Scoring (per perfect column or row: 100×n²)
                    </p>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-violet-600/30">
                          <th className="py-0.5 pr-2 text-violet-200/90">Patties (n)</th>
                          <th className="py-0.5 text-violet-200/90">Points</th>
                        </tr>
                      </thead>
                      <tbody className="text-violet-100/90">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <tr key={n} className="border-b border-violet-800/40">
                            <td className="py-0.5 pr-2">{n}</td>
                            <td className="py-0.5 font-medium text-violet-300">{100 * n * n}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-1 text-violet-200/80">
                      If <em>any</em> guess in a column is wrong, that column scores 0.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-violet-200 mb-1">
                      Example (3 patties in a column, all correct)
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/80 flex items-center justify-center text-[8px] text-white">
                          ✓
                        </span>
                        <span className="w-4 h-4 rounded-full bg-emerald-500/80 flex items-center justify-center text-[8px] text-white">
                          ✓
                        </span>
                        <span className="w-4 h-4 rounded-full bg-emerald-500/80 flex items-center justify-center text-[8px] text-white">
                          ✓
                        </span>
                        <span className="ml-0.5 text-emerald-300">→ 900 pts</span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/80 flex items-center justify-center text-[8px] text-white">
                          ✓
                        </span>
                        <span className="w-4 h-4 rounded-full bg-rose-500/80 flex items-center justify-center text-[8px] text-white">
                          ✗
                        </span>
                        <span className="w-4 h-4 rounded-full bg-violet-900/50" />
                        <span className="ml-0.5 text-rose-300">→ 0 pts</span>
                      </span>
                    </div>
                  </div>
                  <p className="text-violet-200/80">
                    Leaderboard: top 10 by total score (tie-break: fewer burgers, then best single
                    turn).
                  </p>
                  <p className="font-medium text-violet-200 pt-1 border-t border-violet-800/50 mt-1.5">
                    <strong>Bonus round:</strong> {BONUS_TRIGGER_THRESHOLD}+ correct active patties
                    in one turn. Round 1: stack on the bun (1× + 1× per catch). Catch{' '}
                    {BONUS_ROUND2_ITEM_THRESHOLD}+ in Round 1 for Round 2 (cooked patty → 2.5× / 5×
                    / 10×).
                  </p>
                </div>
              )}
            </header>

            {error && (
              <div className="mb-2 p-2 bg-rose-950/80 text-violet-100 rounded text-xs border border-rose-500/40">
                {error}
              </div>
            )}

            {view === 'game' && <Game onError={setError} />}
            {view === 'leaderboard' && (
              <Suspense fallback={<p className="text-violet-200/70 text-xs py-2">Loading…</p>}>
                <Leaderboard onError={setError} />
              </Suspense>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
