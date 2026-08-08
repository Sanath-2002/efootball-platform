import React from 'react';
import type { StandingRow } from '../../services/api';

interface StandingsCardProps {
  competitionName: string;
  title: string;
  standings: StandingRow[];
  limit?: number;
  publicUrl?: string;
}

export const StandingsCard = React.forwardRef<HTMLDivElement, StandingsCardProps>(
  ({ competitionName, title, standings, limit = 6, publicUrl }, ref) => {
    const rows = standings.slice(0, limit);

    return (
      <div
        ref={ref}
        className="w-[540px] bg-slate-900 text-white p-8 font-sans"
        style={{ aspectRatio: '1 / 1' }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
          {competitionName}
        </p>
        <h2 className="text-lg font-extrabold mb-4">{title}</h2>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="py-1 text-left w-8">#</th>
              <th className="py-1 text-left">Team</th>
              <th className="py-1 text-center w-10">P</th>
              <th className="py-1 text-center w-10">GD</th>
              <th className="py-1 text-center w-10">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.teamId} className="border-b border-slate-800">
                <td className="py-1.5 font-mono text-slate-400">{i + 1}</td>
                <td className="py-1.5 font-bold truncate max-w-[180px]">{row.name}</td>
                <td className="py-1.5 text-center font-mono">{row.played}</td>
                <td className="py-1.5 text-center font-mono">{row.goalDifference}</td>
                <td className="py-1.5 text-center font-mono font-bold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {publicUrl && (
          <p className="mt-6 text-[9px] text-slate-500 font-mono truncate">{publicUrl}</p>
        )}
      </div>
    );
  }
);

StandingsCard.displayName = 'StandingsCard';
