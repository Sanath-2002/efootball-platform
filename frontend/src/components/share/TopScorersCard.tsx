import React from 'react';
import type { PlayerStatsRow } from '../../services/api';

interface TopScorersCardProps {
  competitionName: string;
  players: PlayerStatsRow[];
  limit?: number;
  publicUrl?: string;
}

export const TopScorersCard = React.forwardRef<HTMLDivElement, TopScorersCardProps>(
  ({ competitionName, players, limit = 5, publicUrl }, ref) => {
    const rows = players.slice(0, limit);

    return (
      <div
        ref={ref}
        className="w-[540px] bg-slate-900 text-white p-8 font-sans"
        style={{ aspectRatio: '1 / 1' }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
          {competitionName}
        </p>
        <h2 className="text-lg font-extrabold mb-4">Top Scorers</h2>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="py-1 text-left w-8">#</th>
              <th className="py-1 text-left">Player</th>
              <th className="py-1 text-left">Team</th>
              <th className="py-1 text-center w-10">G</th>
              <th className="py-1 text-center w-10">App</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.playerId} className="border-b border-slate-800">
                <td className="py-1.5 font-mono text-slate-400">{i + 1}</td>
                <td className="py-1.5 font-bold truncate max-w-[140px]">{row.name}</td>
                <td className="py-1.5 text-slate-300 truncate max-w-[100px]">{row.teamName}</td>
                <td className="py-1.5 text-center font-mono font-bold">{row.goals}</td>
                <td className="py-1.5 text-center font-mono">{row.appearances}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="text-slate-500 text-xs mt-4">No scorers recorded yet.</p>
        )}

        {publicUrl && (
          <p className="mt-6 text-[9px] text-slate-500 font-mono truncate">{publicUrl}</p>
        )}
      </div>
    );
  }
);

TopScorersCard.displayName = 'TopScorersCard';
