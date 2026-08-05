import React, { useState } from 'react';
import type { Match } from '../services/api';
import { KitBadge } from './KitBadge';

interface MatchListProps {
  matches: Match[];
  isCoordinator: boolean;
  onUpdateScore?: (matchId: string, homeScore: number | null, awayScore: number | null) => Promise<void>;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, isCoordinator, onUpdateScore }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeInput, setHomeInput] = useState<string>('');
  const [awayInput, setAwayInput] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedRound, setSelectedRound] = useState<number | 'ALL'>('ALL');

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-slate-200 text-slate-500 text-xs font-medium">
        No match fixtures recorded yet.
      </div>
    );
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const filteredMatches =
    selectedRound === 'ALL' ? matches : matches.filter((m) => m.round === selectedRound);

  const startEdit = (match: Match) => {
    if (!isCoordinator) return;
    setEditingId(match.id);
    setHomeInput(match.homeScore !== null ? String(match.homeScore) : '');
    setAwayInput(match.awayScore !== null ? String(match.awayScore) : '');
  };

  const handleSave = async (matchId: string) => {
    if (!onUpdateScore) return;
    setSaving(true);
    try {
      const h = homeInput === '' ? null : Number(homeInput);
      const a = awayInput === '' ? null : Number(awayInput);
      await onUpdateScore(matchId, h, a);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Matchday Round Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setSelectedRound('ALL')}
          className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${
            selectedRound === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Rounds
        </button>
        {rounds.map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRound(r)}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${
              selectedRound === r
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Round {r}
          </button>
        ))}
      </div>

      {/* Matchday Scoreboard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredMatches.map((match) => {
          const isEditing = editingId === match.id;
          const homeWon = match.status === 'COMPLETED' && match.winnerId === match.homeTeamId;
          const awayWon = match.status === 'COMPLETED' && match.winnerId === match.awayTeamId;

          return (
            <div
              key={match.id}
              className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2.5"
            >
              {/* Header Status Bar */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pb-1.5 border-b border-slate-100">
                <span>ROUND {match.round} • MATCH #{match.matchNumber}</span>
                {match.status === 'COMPLETED' ? (
                  <span className="font-bold text-slate-900 uppercase">FT</span>
                ) : (
                  <span className="text-slate-400 uppercase">SCHED</span>
                )}
              </div>

              {/* Scoreboard Fixture Display */}
              <div className="space-y-1.5 font-sans">
                {/* Home Team */}
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded ${
                    homeWon ? 'bg-emerald-50/70 text-slate-900 font-bold' : 'bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <KitBadge name={match.homeTeam ? match.homeTeam.name : 'TBD'} size="sm" />
                    <span className="text-xs truncate">{match.homeTeam ? match.homeTeam.name : 'TBD'}</span>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums ml-2">
                    {match.homeScore !== null ? match.homeScore : '-'}
                  </span>
                </div>

                {/* Away Team */}
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded ${
                    awayWon ? 'bg-emerald-50/70 text-slate-900 font-bold' : 'bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <KitBadge name={match.awayTeam ? match.awayTeam.name : 'TBD'} size="sm" />
                    <span className="text-xs truncate">{match.awayTeam ? match.awayTeam.name : 'TBD'}</span>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums ml-2">
                    {match.awayScore !== null ? match.awayScore : '-'}
                  </span>
                </div>
              </div>

              {/* Coordinator Score Action */}
              {isCoordinator && match.homeTeamId && match.awayTeamId && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded border border-slate-200">
                      <input
                        type="number"
                        min="0"
                        value={homeInput}
                        onChange={(e) => setHomeInput(e.target.value)}
                        placeholder="H"
                        className="w-10 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-mono text-slate-900 focus:outline-none"
                      />
                      <span className="text-slate-400 font-bold text-xs">:</span>
                      <input
                        type="number"
                        min="0"
                        value={awayInput}
                        onChange={(e) => setAwayInput(e.target.value)}
                        placeholder="A"
                        className="w-10 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-mono text-slate-900 focus:outline-none"
                      />
                      <button
                        disabled={saving}
                        onClick={() => handleSave(match.id)}
                        className="px-2.5 py-0.5 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-1.5 py-0.5 text-xs text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(match)}
                      className="text-xs font-bold text-slate-800 hover:text-slate-900 underline underline-offset-2"
                    >
                      {match.status === 'COMPLETED' ? 'Edit Score' : 'Log Score'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
