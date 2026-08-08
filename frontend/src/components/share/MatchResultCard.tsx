import React from 'react';
import type { Match } from '../../services/api';
import { KitBadge } from '../KitBadge';

interface MatchResultCardProps {
  match: Match;
  competitionName: string;
  publicUrl?: string;
}

export const MatchResultCard = React.forwardRef<HTMLDivElement, MatchResultCardProps>(
  ({ match, competitionName, publicUrl }, ref) => (
    <div
      ref={ref}
      className="w-[540px] bg-slate-900 text-white p-8 font-sans"
      style={{ aspectRatio: '1 / 1' }}
    >
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
        {competitionName}
      </p>
      <p className="text-xs text-emerald-400 font-bold uppercase mb-6">
        Round {match.round} · Match #{match.matchNumber}
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <KitBadge
              name={match.homeTeam?.name ?? 'TBD'}
              shortName={match.homeTeam?.shortName}
              colorPrimary={match.homeTeam?.colorPrimary}
              logoUrl={match.homeTeam?.logoUrl}
              size="md"
            />
            <span className="font-bold text-sm">{match.homeTeam?.name ?? 'TBD'}</span>
          </div>
          <span className="text-3xl font-mono font-extrabold tabular-nums">
            {match.homeScore ?? '-'}
          </span>
        </div>
        <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <KitBadge
              name={match.awayTeam?.name ?? 'TBD'}
              shortName={match.awayTeam?.shortName}
              colorPrimary={match.awayTeam?.colorPrimary}
              logoUrl={match.awayTeam?.logoUrl}
              size="md"
            />
            <span className="font-bold text-sm">{match.awayTeam?.name ?? 'TBD'}</span>
          </div>
          <span className="text-3xl font-mono font-extrabold tabular-nums">
            {match.awayScore ?? '-'}
          </span>
        </div>
      </div>

      {match.winner && (
        <p className="mt-6 text-center text-sm font-bold text-amber-400">
          Winner: {match.winner.name}
        </p>
      )}

      {publicUrl && (
        <p className="mt-auto pt-8 text-[9px] text-slate-500 font-mono truncate">{publicUrl}</p>
      )}
    </div>
  )
);

MatchResultCard.displayName = 'MatchResultCard';
