import React from 'react';
import type { Match } from '../../services/api';

interface FixturesCardProps {
  competitionName: string;
  matches: Match[];
  publicUrl?: string;
}

export const FixturesCard = React.forwardRef<HTMLDivElement, FixturesCardProps>(
  ({ competitionName, matches, publicUrl }, ref) => {
    const upcoming = [...matches]
      .filter((m) => m.status === 'SCHEDULED' || m.status === 'POSTPONED')
      .sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt) {
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        }
        if (a.scheduledAt) return -1;
        if (b.scheduledAt) return 1;
        return a.round - b.round;
      })
      .slice(0, 6);

    return (
      <div
        ref={ref}
        className="w-[540px] bg-slate-900 text-white p-8 font-sans"
        style={{ aspectRatio: '1 / 1' }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
          {competitionName}
        </p>
        <h2 className="text-lg font-extrabold mb-4">Upcoming Fixtures</h2>

        <ul className="space-y-2 text-xs">
          {upcoming.length === 0 ? (
            <li className="text-slate-400">No upcoming fixtures</li>
          ) : (
            upcoming.map((m) => (
              <li key={m.id} className="border-b border-slate-800 pb-2">
                <p className="font-bold">
                  {m.homeTeam?.name ?? 'TBD'} vs {m.awayTeam?.name ?? 'TBD'}
                </p>
                <p className="text-slate-400 font-mono text-[10px]">
                  R{m.round} M{m.matchNumber}
                  {m.scheduledAt && ` · ${new Date(m.scheduledAt).toLocaleString()}`}
                </p>
              </li>
            ))
          )}
        </ul>

        {publicUrl && (
          <p className="mt-6 text-[9px] text-slate-500 font-mono truncate">{publicUrl}</p>
        )}
      </div>
    );
  }
);

FixturesCard.displayName = 'FixturesCard';
