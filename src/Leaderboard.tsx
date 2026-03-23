import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard, SERVER_UNREACHABLE, type LeaderboardEntryDto } from './api/pattyFlipper';

type Props = {
  onError: (msg: string | null) => void;
};

export default function Leaderboard({ onError }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    onError(null);
    setLoading(true);
    try {
      const result = await getLeaderboard();
      if (!result.ok) {
        if ('network' in result && result.network) onError(SERVER_UNREACHABLE);
        else if ('message' in result) onError(result.message);
        return;
      }
      setEntries(result.entries);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="bg-gradient-to-b from-emerald-950/10 to-transparent rounded-lg -m-1 p-1">
      <h2 className="text-sm font-bold text-violet-100 mb-1">
        Leaderboard <span className="text-emerald-300">(top 10)</span>
      </h2>
      <p className="text-[11px] text-violet-200/70 mb-2">
        By score · tie-break: fewer burgers, best turn
      </p>

      <button
        type="button"
        onClick={fetchLeaderboard}
        disabled={loading}
        className="mb-2 py-1.5 px-3 rounded text-xs font-medium bg-violet-900/50 text-violet-200 hover:bg-violet-800/60 hover:border-emerald-500/40 disabled:opacity-50 border border-violet-600/30 transition"
      >
        {loading ? 'Loading…' : 'Refresh'}
      </button>

      {loading && entries.length === 0 ? (
        <p className="text-violet-200/70 text-xs">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-violet-200/70 text-xs">No scores yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {entries.map((e) => (
            <li
              key={`${e.username}-${e.rank}`}
              className={`flex items-center justify-between py-1.5 px-2 rounded text-violet-50 text-xs border ${
                e.rank === 1
                  ? 'bg-gradient-to-r from-emerald-500/15 to-violet-950/60 border-emerald-500/30 border-violet-600/20'
                  : 'bg-violet-950/60 border-violet-600/20 border-l-emerald-500/10'
              }`}
            >
              <span className="font-medium text-violet-100 truncate max-w-[140px]">
                #{e.rank} u/{e.username}
              </span>
              <span
                className={`font-bold shrink-0 ml-1 ${e.rank === 1 ? 'text-emerald-200' : 'text-violet-300'}`}
              >
                {e.score}
              </span>
              <span className="text-[10px] text-violet-200/70 shrink-0">
                {e.burgersUsed} · best {e.bestTurnScore}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
