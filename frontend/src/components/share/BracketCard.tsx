import React from 'react';
import type { Match } from '../../services/api';

interface BracketCardProps {
  competitionName: string;
  matches: Match[];
  publicUrl?: string;
}

export const BracketCard = React.forwardRef<HTMLDivElement, BracketCardProps>(
  ({ competitionName, matches, publicUrl }, ref) => {
    const knockout = matches.filter((m) => m.stage === 'KNOCKOUT');
    const maxRound = Math.max(...knockout.map((m) => m.round), 0);

    return (
      <div
        ref={ref}
        className="w-[540px] bg-slate-900 text-white p-8 font-sans"
        style={{ aspectRatio: '1 / 1' }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
          {competitionName}
        </p>
        <h2 className="text-lg font-extrabold mb-4">Knockout Bracket</h2>

        <div className="space-y-3 text-xs">
          {maxRound > 0 &&
            Array.from({ length: maxRound }, (_, i) => maxRound - i).map((round) => {
              const roundMatches = knockout.filter((m) => m.round === round);
              const label =
                round === maxRound ? 'Final' : round === maxRound - 1 ? 'Semi-Finals' : `R${round}`;
              return (
                <div key={round}>
                  <p className="text-emerald-400 font-bold uppercase text-[10px] mb-1">{label}</p>
                  {roundMatches.map((m) => (
                    <p key={m.id} className="text-slate-200 py-0.5">
                      {m.homeTeam?.name ?? 'TBD'}{' '}
                      {m.homeScore != null ? m.homeScore : '-'}{' '}
                      –{' '}
                      {m.awayScore != null ? m.awayScore : '-'}{' '}
                      {m.awayTeam?.name ?? 'TBD'}
                    </p>
                  ))}
                </div>
              );
            })}
        </div>

        {publicUrl && (
          <p className="mt-6 text-[9px] text-slate-500 font-mono truncate">{publicUrl}</p>
        )}
      </div>
    );
  }
);

BracketCard.displayName = 'BracketCard';
