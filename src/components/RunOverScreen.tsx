import { useState } from 'react';
import type { RunState } from '../types/game';

/** Reddit username: 3–20 chars, letters, numbers, underscore, hyphen (no leading u/) */
const REDDIT_USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

export type RunOverScreenProps = {
  run: RunState;
  loading: boolean;
  onNewRun: () => void;
  shareUrl: string;
  buildChallengeUrl: (toUsername: string) => string;
};

export function RunOverScreen({
  run,
  loading,
  onNewRun,
  shareUrl,
  buildChallengeUrl,
}: RunOverScreenProps) {
  const [challengeUsername, setChallengeUsername] = useState('');
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const handleShare = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleChallenge = () => {
    const trimmed = challengeUsername.trim().replace(/^u\//i, '');
    if (!trimmed) {
      setChallengeError('Enter a Reddit username');
      return;
    }
    if (!REDDIT_USERNAME_REGEX.test(trimmed)) {
      setChallengeError('Username must be 3–20 characters (letters, numbers, _ or -)');
      return;
    }
    setChallengeError(null);
    window.open(buildChallengeUrl(trimmed), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="text-center py-1">
      <p className="text-base font-bold text-violet-100 mb-2">Game over!</p>
      <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 via-violet-500/15 to-violet-500/20 border border-violet-500/40 border-t-emerald-400/30 py-3 px-4 mb-3">
        <p className="text-xs text-violet-200/90 mb-1">Total points earned this run</p>
        <p className="text-2xl font-bold text-violet-100">
          {run.totalScore.toLocaleString()} <span className="text-emerald-200">pts</span>
        </p>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600/80 to-violet-600/90 text-white hover:from-emerald-500 hover:to-violet-500 border border-emerald-400/40 border-violet-500/50 transition"
        >
          Share to Reddit (r/GamesOnReddit)
        </button>

        <div className="rounded-lg bg-violet-950/50 bg-gradient-to-r from-emerald-950/20 to-violet-950/50 border border-violet-600/30 border-l-emerald-500/25 p-2.5 text-left">
          <p className="text-[11px] text-violet-200/90 mb-2">Challenge a friend</p>
          <div className="flex gap-1.5 mb-1.5">
            <input
              type="text"
              placeholder="Reddit username"
              value={challengeUsername}
              onChange={(e) => {
                setChallengeUsername(e.target.value);
                setChallengeError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleChallenge()}
              className="flex-1 min-w-0 px-2 py-1.5 rounded text-sm bg-violet-900/40 border border-violet-600/40 text-violet-100 placeholder-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-400"
              aria-label="Friend's Reddit username"
            />
            <button
              type="button"
              onClick={handleChallenge}
              className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold bg-violet-500 text-[#1a1614] hover:bg-violet-400 transition"
            >
              Send challenge
            </button>
          </div>
          {challengeError && <p className="text-[10px] text-rose-300">{challengeError}</p>}
          <p className="text-[10px] text-violet-200/70 mt-1">
            Opens Reddit to send them a message with your score.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onNewRun}
        className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600 to-violet-500 text-white hover:from-emerald-500 hover:to-violet-400 disabled:opacity-50 transition shadow-[0_0_8px_rgba(139,92,246,0.3)] shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-emerald-400/40 border-violet-400/40"
      >
        New run
      </button>
    </div>
  );
}
