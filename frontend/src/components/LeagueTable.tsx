import React from 'react';
import type { StandingRow } from '../services/api';
import { KitBadge } from './KitBadge';

interface LeagueTableProps {
  standings: StandingRow[];
  championName?: string | null;
  qualifiedCount?: number;
}

export const LeagueTable: React.FC<LeagueTableProps> = ({
  standings,
  championName,
  qualifiedCount,
}) => {
  if (!standings || standings.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-slate-200 text-slate-500 text-xs font-medium">
        No league standings recorded.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <th className="py-2.5 px-3 w-10 text-center">Pos</th>
              <th className="py-2.5 px-4">Team</th>
              <th className="py-2.5 px-3 text-center w-12 font-mono">P</th>
              <th className="py-2.5 px-3 text-center w-12 font-mono">W</th>
              <th className="py-2.5 px-3 text-center w-12 font-mono">D</th>
              <th className="py-2.5 px-3 text-center w-12 font-mono">L</th>
              <th className="py-2.5 px-3 text-center w-12 font-mono">GF</th>
              <th className="py-2.5 px-3 text-center w-12 font-mono">GA</th>
              <th className="py-2.5 px-3 text-center w-14 font-mono">GD</th>
              <th className="py-2.5 px-4 text-center w-14 font-mono font-bold text-slate-900 bg-slate-200/50">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-900 tabular-nums">
            {standings.map((row, index) => {
              const rank = index + 1;
              const isChampion = championName && row.name === championName;
              const isQualified = qualifiedCount != null && rank <= qualifiedCount;

              return (
                <tr
                  key={row.teamId}
                  className={`hover:bg-slate-50 transition-colors ${
                    isQualified
                      ? 'bg-emerald-50/60 font-semibold'
                      : rank === 1
                      ? 'bg-emerald-50/40 font-semibold'
                      : rank <= 4
                      ? 'bg-slate-50/30'
                      : ''
                  }`}
                >
                  {/* Position */}
                  <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-500">
                    {rank === 1 ? (
                      <span className="inline-block w-5 h-5 rounded bg-emerald-800 text-white font-bold text-[11px] leading-5">
                        1
                      </span>
                    ) : (
                      rank
                    )}
                  </td>

                  {/* Team with Kit Initials */}
                  <td className="py-2.5 px-4 flex items-center gap-2.5 font-bold">
                    <KitBadge name={row.name} size="sm" />
                    <span className="truncate">{row.name}</span>
                    {isChampion && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-extrabold uppercase rounded border border-emerald-300">
                        Champion
                      </span>
                    )}
                    {isQualified && !isChampion && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold uppercase rounded">
                        Q
                      </span>
                    )}
                  </td>

                  {/* Real P/W/D/L/GF/GA/GD/Pts Order */}
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{row.played}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">{row.won}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{row.drawn}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-rose-600">{row.lost}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-700">{row.goalsFor}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">{row.goalsAgainst}</td>
                  <td
                    className={`py-2.5 px-3 text-center font-mono font-bold ${
                      row.goalDifference > 0
                        ? 'text-emerald-700'
                        : row.goalDifference < 0
                        ? 'text-rose-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-extrabold text-slate-900 bg-slate-100/60 text-sm">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
