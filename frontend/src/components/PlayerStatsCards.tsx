import React, { useState, useMemo } from 'react';
import type { CompetitionStats, PlayerStatsRow } from '../services/api';
import { KitBadge } from './KitBadge';

interface PlayerStatsCardsProps {
  stats: CompetitionStats | null;
}

type SortKey = 'goals' | 'appearances' | 'goalsPerGame' | 'name';

export const PlayerStatsCards: React.FC<PlayerStatsCardsProps> = ({ stats }) => {
  const [sortKey, setSortKey] = useState<SortKey>('goals');
  const playerList = stats?.allPlayerStats ?? [];

  const sorted = useMemo(() => {
    const list = [...playerList];
    list.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'goalsPerGame') return b.goalsPerGame - a.goalsPerGame;
      if (sortKey === 'appearances') return b.appearances - a.appearances;
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [playerList, sortKey]);

  const topScorer = stats?.topScorer;

  if (playerList.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">
        No player statistics yet. Assign goal scorers when entering match scores.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topScorer && topScorer.goals > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex items-center gap-4">
          <div className="text-3xl">👟</div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Golden Boot {topScorer.isShared ? '(shared)' : ''}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <KitBadge name={topScorer.teamName} colorPrimary={topScorer.colorPrimary} size="sm" />
              <span className="font-bold text-slate-900">{topScorer.name}</span>
              {topScorer.gamerTag && (
                <span className="text-xs text-slate-500">@{topScorer.gamerTag}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-amber-800">{topScorer.goals}</p>
            <p className="text-[10px] text-amber-600 font-mono">goals</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">Player Leaderboard</p>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-[10px] border border-slate-200 rounded px-2 py-1 bg-white"
        >
          <option value="goals">Most Goals</option>
          <option value="goalsPerGame">Goals / Game</option>
          <option value="appearances">Appearances</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="py-2 px-3 text-left w-8">#</th>
              <th className="py-2 px-3 text-left">Player</th>
              <th className="py-2 px-3 text-left">Team</th>
              <th className="py-2 px-3 text-center">G</th>
              <th className="py-2 px-3 text-center">OG</th>
              <th className="py-2 px-3 text-center">App</th>
              <th className="py-2 px-3 text-center">G/G</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <PlayerRow key={row.playerId} row={row} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PlayerRow: React.FC<{ row: PlayerStatsRow; rank: number }> = ({ row, rank }) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50">
    <td className="py-2 px-3 font-mono text-slate-400">{rank}</td>
    <td className="py-2 px-3">
      <span className="font-bold text-slate-900">{row.name}</span>
      {row.gamerTag && (
        <span className="text-slate-400 ml-1">@{row.gamerTag}</span>
      )}
    </td>
    <td className="py-2 px-3">
      <div className="flex items-center gap-1">
        <KitBadge name={row.teamName} colorPrimary={row.colorPrimary} size="sm" />
        <span className="truncate max-w-[100px]">{row.teamName}</span>
      </div>
    </td>
    <td className="py-2 px-3 text-center font-mono font-bold">{row.goals}</td>
    <td className="py-2 px-3 text-center font-mono text-slate-500">{row.ownGoals || '—'}</td>
    <td className="py-2 px-3 text-center font-mono">{row.appearances}</td>
    <td className="py-2 px-3 text-center font-mono">{row.goalsPerGame.toFixed(2)}</td>
  </tr>
);
