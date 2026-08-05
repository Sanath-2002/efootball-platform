import React, { useState } from 'react';
import type { Match } from '../services/api';
import { KitBadge } from './KitBadge';

interface BracketViewProps {
  matches: Match[];
  isCoordinator: boolean;
  onUpdateScore?: (matchId: string, homeScore: number | null, awayScore: number | null) => Promise<void>;
}

export const BracketView: React.FC<BracketViewProps> = ({ matches, isCoordinator, onUpdateScore }) => {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [homeInput, setHomeInput] = useState<string>('');
  const [awayInput, setAwayInput] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-slate-200 text-slate-500 text-xs font-medium">
        No bracket draw sheet generated yet. Register teams and click Generate.
      </div>
    );
  }

  const maxRound = Math.max(...matches.map((m) => m.round));
  const rounds: { roundNumber: number; title: string; matches: Match[] }[] = [];

  for (let r = 1; r <= maxRound; r++) {
    const roundMatches = matches.filter((m) => m.round === r);
    let title = `ROUND ${r}`;
    if (r === maxRound) title = 'FINAL';
    else if (r === maxRound - 1) title = 'SEMI FINALS';
    else if (r === maxRound - 2) title = 'QUARTER FINALS';

    rounds.push({
      roundNumber: r,
      title,
      matches: roundMatches,
    });
  }

  const handleSaveScore = async (matchId: string) => {
    if (!onUpdateScore) return;
    setSaving(true);
    try {
      const h = homeInput === '' ? null : Number(homeInput);
      const a = awayInput === '' ? null : Number(awayInput);
      await onUpdateScore(matchId, h, a);
      setEditingMatchId(null);
    } catch (err) {
      console.error('Failed to save score:', err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (match: Match) => {
    if (!isCoordinator) return;
    setEditingMatchId(match.id);
    setHomeInput(match.homeScore !== null ? String(match.homeScore) : '0');
    setAwayInput(match.awayScore !== null ? String(match.awayScore) : '0');
  };

  return (
    <div className="overflow-x-auto pb-4 font-sans">
      <div className="flex gap-6 min-w-[760px] items-stretch">
        {rounds.map((rd) => (
          <div key={rd.roundNumber} className="flex-1 flex flex-col min-w-[220px]">
            {/* Draw Sheet Round Title */}
            <div className="mb-3 pb-1.5 border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[11px] tracking-wider flex items-center justify-between">
              <span>{rd.title}</span>
              <span className="text-[10px] text-slate-500 font-mono font-normal">({rd.matches.length} {rd.matches.length === 1 ? 'Match' : 'Matches'})</span>
            </div>

            {/* Draw Sheet Match Slots */}
            <div className="flex-1 flex flex-col justify-around gap-4">
              {rd.matches.map((m) => {
                const isEditing = editingMatchId === m.id;
                const isByeMatch = m.status === 'COMPLETED' && (!m.homeTeamId || !m.awayTeamId);
                const homeWon = m.status === 'COMPLETED' && Boolean(m.homeTeamId) && m.winnerId === m.homeTeamId;
                const awayWon = m.status === 'COMPLETED' && Boolean(m.awayTeamId) && m.winnerId === m.awayTeamId;
                const canLogScore = isCoordinator && Boolean(m.homeTeamId) && Boolean(m.awayTeamId);

                return (
                  <div
                    key={m.id}
                    className={`bg-white border rounded shadow-xs overflow-hidden transition-colors ${
                      isEditing ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-300'
                    }`}
                  >
                    {/* Draw Header */}
                    <div className="bg-slate-100 px-2.5 py-1 flex items-center justify-between border-b border-slate-200 text-[10px] font-mono text-slate-600">
                      <span>Match #{m.matchNumber}</span>
                      <span className="uppercase font-bold text-slate-700">
                        {isByeMatch ? 'BYE ADVANCE' : m.status === 'COMPLETED' ? 'FT' : 'SCHEDULED'}
                      </span>
                    </div>

                    {/* Team Rows */}
                    <div className="divide-y divide-slate-100">
                      {/* Home Team Slot */}
                      <div
                        className={`flex items-center justify-between px-2.5 py-2 text-xs ${
                          homeWon ? 'bg-emerald-100/70 font-bold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <KitBadge name={m.homeTeam ? m.homeTeam.name : 'BYE'} size="sm" />
                          <span className="truncate">
                            {m.homeTeam ? m.homeTeam.name : isByeMatch ? 'BYE (Advanced)' : 'BYE / TBD'}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums ml-2">
                          {isByeMatch ? '-' : m.homeScore !== null ? m.homeScore : '-'}
                        </span>
                      </div>

                      {/* Away Team Slot */}
                      <div
                        className={`flex items-center justify-between px-2.5 py-2 text-xs ${
                          awayWon ? 'bg-emerald-100/70 font-bold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <KitBadge name={m.awayTeam ? m.awayTeam.name : 'BYE'} size="sm" />
                          <span className="truncate">
                            {m.awayTeam ? m.awayTeam.name : isByeMatch ? 'BYE (Advanced)' : 'BYE / TBD'}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums ml-2">
                          {isByeMatch ? '-' : m.awayScore !== null ? m.awayScore : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Score Action Bar */}
                    {canLogScore && (
                      <div className="bg-slate-50 border-t border-slate-200 p-2">
                        {isEditing ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">H</span>
                              <input
                                type="number"
                                min="0"
                                value={homeInput}
                                onChange={(e) => setHomeInput(e.target.value)}
                                className="w-11 px-1.5 py-1 bg-white border border-slate-300 rounded text-center text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                              />
                              <span className="text-slate-400 font-bold text-xs">:</span>
                              <span className="text-[10px] font-bold text-slate-500">A</span>
                              <input
                                type="number"
                                min="0"
                                value={awayInput}
                                onChange={(e) => setAwayInput(e.target.value)}
                                className="w-11 px-1.5 py-1 bg-white border border-slate-300 rounded text-center text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                disabled={saving}
                                onClick={() => handleSaveScore(m.id)}
                                className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingMatchId(null)}
                                className="px-1.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(m)}
                            className="w-full py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-colors text-center cursor-pointer"
                          >
                            {m.status === 'COMPLETED' ? 'Edit Score' : '+ Log Score'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
