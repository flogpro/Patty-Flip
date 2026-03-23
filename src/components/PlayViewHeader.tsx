import type { GamePhase, RunState } from '../types/game';

type PlayViewHeaderProps = {
  phase: GamePhase;
  run: RunState;
  loading: boolean;
  suspensefulFlip: boolean;
  burgersPerRun: number;
  onBack: () => void;
  onSetSuspensefulFlip: (value: boolean) => void;
};

/** Play view top bar: back button (when guessing), score/burgers, Fast/Regular toggle. */
export function PlayViewHeader({
  phase,
  run,
  loading,
  suspensefulFlip,
  burgersPerRun,
  onBack,
  onSetSuspensefulFlip,
}: PlayViewHeaderProps) {
  return (
    <div className="grid grid-cols-3 items-center gap-2 mb-2">
      <div className="flex justify-center min-w-0">
        {phase === 'guessing' ? (
          <button
            type="button"
            disabled={loading}
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-600/80 text-slate-200 hover:bg-slate-500/90 border border-slate-500/60 transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 focus:ring-offset-[#1f1b18]"
            title="Back to layout"
            aria-label="Back to layout"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        ) : (
          <div
            className="overflow-hidden rounded-lg shrink-0 flex items-center min-w-0"
            style={{ maxHeight: 50 }}
          >
            <img
              src="/pattyflap-logo.png"
              alt="PattyFlap"
              className="h-12 w-auto object-contain object-left"
            />
          </div>
        )}
      </div>
      <div className="text-center min-w-0 py-0.5 px-2 rounded-md bg-gradient-to-r from-emerald-950/30 to-transparent border-l-2 border-emerald-500/40">
        <p className="text-sm font-bold text-violet-100">
          Score: <span className="text-emerald-200">{run.totalScore}</span>
        </p>
        <p className="text-[11px] text-violet-200/70">
          Burgers: {run.burgersRemaining} / {burgersPerRun}
        </p>
      </div>
      <div className="flex justify-end min-w-0" role="group" aria-label="Flip speed">
        <div className="flex rounded-md border border-violet-600/50 border-emerald-500/20 overflow-hidden bg-violet-950/40">
          <button
            type="button"
            onClick={() => onSetSuspensefulFlip(false)}
            className={`px-1.5 py-0.5 text-[10px] font-medium transition focus:outline-none focus:ring-1 focus:ring-violet-400 focus:ring-inset ${
              !suspensefulFlip
                ? 'bg-gradient-to-r from-emerald-600 to-violet-500 text-white'
                : 'text-violet-200/80 hover:text-violet-200 hover:bg-violet-900/50'
            }`}
          >
            Fast
          </button>
          <button
            type="button"
            onClick={() => onSetSuspensefulFlip(true)}
            className={`px-1.5 py-0.5 text-[10px] font-medium transition focus:outline-none focus:ring-1 focus:ring-violet-400 focus:ring-inset ${
              suspensefulFlip
                ? 'bg-gradient-to-r from-emerald-600 to-violet-500 text-white'
                : 'text-violet-200/80 hover:text-violet-200 hover:bg-violet-900/50'
            }`}
          >
            Regular
          </button>
        </div>
      </div>
    </div>
  );
}
