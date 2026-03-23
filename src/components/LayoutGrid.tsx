import { Fragment } from 'react';
import { GRID_SIZE } from 'shared/constants';
import { PATTY_RAW_URL } from '../constants';

type LayoutGridProps = {
  activeCells: boolean[];
  rowCounts: number[];
  colCounts: number[];
  onToggleCell: (r: number, c: number) => void;
};

/** Layout screen: 5×5 grid with row/column multipliers and patty toggles. */
export function LayoutGrid({ activeCells, rowCounts, colCounts, onToggleCell }: LayoutGridProps) {
  return (
    <div
      className="grid gap-1 mb-2 justify-center justify-items-center mx-auto w-fit rounded-lg p-1.5 bg-gradient-to-b from-emerald-950/15 to-transparent border border-emerald-500/10"
      style={{ gridTemplateColumns: 'auto repeat(5, 1fr) auto' }}
    >
      <div className="w-10" aria-hidden />
      {[0, 1, 2, 3, 4].map((c) => (
        <div
          key={`col-${c}`}
          className={`w-10 h-6 flex items-center justify-center text-[10px] font-semibold tabular-nums ${colCounts[c] > 0 ? 'text-emerald-300' : 'text-violet-300/90'}`}
          title={`Column ${c + 1}: ${colCounts[c]} active → ${colCounts[c]}× if perfect (columns score)`}
        >
          {colCounts[c] > 0 ? `${colCounts[c]}×` : '–'}
        </div>
      ))}
      <div className="w-10" aria-hidden />
      {[0, 1, 2, 3, 4].map((r) => (
        <Fragment key={`row-${r}`}>
          <div
            className={`w-10 h-10 flex items-center justify-center text-[10px] font-semibold tabular-nums ${rowCounts[r] > 0 ? 'text-emerald-300' : 'text-violet-300/90'}`}
            title={`Row ${r + 1}: ${rowCounts[r]} active → ${rowCounts[r]}× if perfect (rows score 100×n² like columns)`}
          >
            {rowCounts[r] > 0 ? `${rowCounts[r]}×` : '–'}
          </div>
          {[0, 1, 2, 3, 4].map((c) => {
            const isActiveConfig = activeCells[r * GRID_SIZE + c];
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => onToggleCell(r, c)}
                className={`relative w-10 h-10 rounded-full border-2 transition flex items-center justify-center overflow-hidden shadow-sm ${
                  isActiveConfig
                    ? 'bg-emerald-500 border-emerald-400 ring-2 ring-emerald-300/40'
                    : 'border-violet-800/50'
                }`}
                title={isActiveConfig ? 'Active (tap to turn off)' : 'Tap to activate'}
              >
                {isActiveConfig ? (
                  <span
                    className="text-[10px] font-bold text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]"
                    aria-hidden
                  >
                    100
                  </span>
                ) : (
                  <img
                    src={PATTY_RAW_URL}
                    alt=""
                    className="w-full h-full object-cover"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
          <div className="w-10" aria-hidden />
        </Fragment>
      ))}
    </div>
  );
}
