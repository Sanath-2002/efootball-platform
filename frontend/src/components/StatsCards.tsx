import React, { useState, useMemo } from 'react';
import type { CompetitionStats } from '../services/api';
import { KitBadge } from './KitBadge';

interface StatsCardsProps {
  stats: CompetitionStats | null;
}

type SortOptionKey = 
  | 'goalsFor-desc'
  | 'goalsFor-asc'
  | 'goalsAgainst-asc'
  | 'goalsAgainst-desc'
  | 'goalDifference-desc'
  | 'goalDifference-asc'
  | 'won-desc'
  | 'won-asc'
  | 'lost-desc'
  | 'lost-asc'
  | 'winRate-desc'
  | 'points-desc'
  | 'name-asc';

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const [selectedSort, setSelectedSort] = useState<SortOptionKey>('goalsFor-desc');

  const teamList = stats?.allTeamStats || [];

  const sortOptions: { key: SortOptionKey; label: string; field: string; order: 'asc' | 'desc' }[] = [
    { key: 'goalsFor-desc', label: '⚽ Most Goals Scored (Top Attack)', field: 'goalsFor', order: 'desc' },
    { key: 'goalsFor-asc', label: '⚽ Fewest Goals Scored (Least Attack)', field: 'goalsFor', order: 'asc' },
    { key: 'goalsAgainst-asc', label: '🛡️ Fewest Goals Conceded (Best Defense)', field: 'goalsAgainst', order: 'asc' },
    { key: 'goalsAgainst-desc', label: '🛡️ Most Goals Conceded (Worst Defense)', field: 'goalsAgainst', order: 'desc' },
    { key: 'goalDifference-desc', label: '⚡ Best Goal Difference (+GD)', field: 'goalDifference', order: 'desc' },
    { key: 'goalDifference-asc', label: '⚡ Worst Goal Difference (-GD)', field: 'goalDifference', order: 'asc' },
    { key: 'won-desc', label: '🏆 Most Victories', field: 'won', order: 'desc' },
    { key: 'won-asc', label: '🏆 Fewest Victories', field: 'won', order: 'asc' },
    { key: 'lost-desc', label: '❌ Most Losses', field: 'lost', order: 'desc' },
    { key: 'lost-asc', label: '❌ Fewest Losses', field: 'lost', order: 'asc' },
    { key: 'winRate-desc', label: '📊 Highest Win Percentage (%)', field: 'winRate', order: 'desc' },
    { key: 'points-desc', label: '📈 League Table Standings (Points)', field: 'points', order: 'desc' },
    { key: 'name-asc', label: '🔤 Alphabetical (A - Z)', field: 'name', order: 'asc' },
  ];

  const currentOption = useMemo(() => {
    return sortOptions.find((o) => o.key === selectedSort) || sortOptions[0];
  }, [selectedSort]);

  const sortedTeams = useMemo(() => {
    if (!teamList || teamList.length === 0) return [];
    const { field, order } = currentOption;

    return [...teamList].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (field === 'winRate') {
        valA = a.played > 0 ? (a.won / a.played) * 100 : 0;
        valB = b.played > 0 ? (b.won / b.played) * 100 : 0;
      } else {
        valA = (a as any)[field];
        valB = (b as any)[field];
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = Number(valA);
      const numB = Number(valB);

      if (numA !== numB) {
        return order === 'asc' ? numA - numB : numB - numA;
      }

      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return a.name.localeCompare(b.name);
    });
  }, [teamList, currentOption]);

  if (!stats) return null;

  return (
    <div className="space-y-5 font-sans">
      {/* Clean Matchday Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Goals</span>
          <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">{stats.totalGoals}</span>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Matches Played</span>
          <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            {stats.completedMatches} <span className="text-xs font-normal text-slate-400">/ {stats.totalMatches}</span>
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Top Offense</span>
          <span className="text-xs font-bold text-slate-900 block truncate">
            {stats.topOffense ? stats.topOffense.name : 'N/A'}
          </span>
          {stats.topOffense && (
            <span className="text-[11px] font-mono text-emerald-800 font-bold">{stats.topOffense.goalsFor} Goals</span>
          )}
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Best Defense</span>
          <span className="text-xs font-bold text-slate-900 block truncate">
            {stats.topDefense ? stats.topDefense.name : 'N/A'}
          </span>
          {stats.topDefense && (
            <span className="text-[11px] font-mono text-slate-700 font-bold">{stats.topDefense.goalsAgainst} Conceded</span>
          )}
        </div>
      </div>

      {/* Team Statistics Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Team Performance Leaderboard
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">Full team statistics ranked by your chosen criteria</p>
          </div>

          {/* Dedicated Full List Sort Button Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="stat-sort-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
              Sort List By:
            </label>
            <select
              id="stat-sort-select"
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value as SortOptionKey)}
              className="bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer shadow-xs"
            >
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sortedTeams.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No statistics available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider bg-slate-100/80">
                  <th className="py-2.5 px-3 w-10 text-center">Rank</th>
                  <th className="py-2.5 px-4">Team</th>
                  <th className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'played' ? 'bg-slate-200 text-slate-900' : ''}`}>P</th>
                  <th className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'won' ? 'bg-emerald-100 text-emerald-900' : ''}`}>W</th>
                  <th className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'drawn' ? 'bg-amber-100 text-amber-900' : ''}`}>D</th>
                  <th className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'lost' ? 'bg-rose-100 text-rose-900' : ''}`}>L</th>
                  <th className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'goalsFor' ? 'bg-emerald-200 text-emerald-900' : ''}`}>GF</th>
                  <th className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'goalsAgainst' ? 'bg-slate-200 text-slate-900' : ''}`}>GA</th>
                  <th className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'goalDifference' ? 'bg-indigo-100 text-indigo-900' : ''}`}>GD</th>
                  <th className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'winRate' ? 'bg-blue-100 text-blue-900' : ''}`}>Win %</th>
                  <th className={`py-2.5 px-4 text-center font-mono font-bold ${currentOption.field === 'points' ? 'bg-slate-300 text-slate-900' : 'bg-slate-200/50'}`}>Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-900 tabular-nums">
                {sortedTeams.map((team, idx) => {
                  const rank = idx + 1;
                  const winRate = team.played > 0 ? ((team.won / team.played) * 100).toFixed(0) : '0';

                  return (
                    <tr key={team.teamId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-bold">#{rank}</td>
                      <td className="py-2.5 px-4 font-bold flex items-center gap-2">
                        <KitBadge name={team.name} size="sm" />
                        <span className="truncate">{team.name}</span>
                      </td>
                      <td className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'played' ? 'font-extrabold bg-slate-100' : 'text-slate-600'}`}>{team.played}</td>
                      <td className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'won' ? 'font-extrabold bg-emerald-50 text-emerald-900' : 'text-emerald-800 font-bold'}`}>{team.won}</td>
                      <td className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'drawn' ? 'font-extrabold bg-amber-50' : 'text-slate-600'}`}>{team.drawn}</td>
                      <td className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'lost' ? 'font-extrabold bg-rose-50 text-rose-800' : 'text-rose-600'}`}>{team.lost}</td>
                      <td className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'goalsFor' ? 'font-extrabold bg-emerald-100 text-emerald-950 text-sm' : 'text-slate-700'}`}>{team.goalsFor}</td>
                      <td className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'goalsAgainst' ? 'font-extrabold bg-slate-100 text-slate-900 text-sm' : 'text-slate-500'}`}>{team.goalsAgainst}</td>
                      <td
                        className={`py-2.5 px-3 text-center font-mono font-bold ${
                          currentOption.field === 'goalDifference' ? 'font-extrabold bg-indigo-50 text-indigo-900 text-sm' : ''
                        } ${team.goalDifference > 0 ? 'text-emerald-800' : team.goalDifference < 0 ? 'text-rose-600' : 'text-slate-400'}`}
                      >
                        {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                      </td>
                      <td className={`py-2.5 px-3 text-center font-mono ${currentOption.field === 'winRate' ? 'font-extrabold bg-blue-50 text-blue-900' : 'text-slate-600'}`}>{winRate}%</td>
                      <td className={`py-2.5 px-4 text-center font-mono font-extrabold ${currentOption.field === 'points' ? 'bg-slate-200 text-slate-900 text-sm' : 'bg-slate-100/60 text-slate-900 text-xs'}`}>
                        {team.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
