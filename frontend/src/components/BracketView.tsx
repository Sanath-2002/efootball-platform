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
        No bracket draw sheet available yet.
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
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (match: Match) => {
    if (!isCoordinator) return;
    setEditingMatchId(match.id);
    setHomeInput(match.homeScore !== null ? String(match.homeScore) : '');
    setAwayInput(match.awayScore !== null ? String(match.awayScore) : '');
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-[800px]">
        {rounds.map((rd) => (
          <div key={rd.roundNumber} className="flex-1 flex flex-col">
            {/* Draw Sheet Round Title */}
            <div className="mb-3 pb-1.5 border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[11px] tracking-wider flex items-center justify-between">
              <span>{rd.title}</span>
              <span className="text-[10px] text-slate-500 font-mono font-normal">({rd.matches.length})</span>
            </div>

            {/* Draw Sheet Match Slots */}
            <div className="flex-1 flex flex-col justify-around gap-4">
              {rd.matches.map((m) => {
                const isEditing = editingMatchId === m.id;
                const homeWon = m.status === 'COMPLETED' && m.winnerId === m.homeTeamId;
                const awayWon = m.status === 'COMPLETED' && m.winnerId === m.awayTeamId;

                return (
                  <div
                    key={m.id}
                    className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden"
                  >
                    {/* Draw Header */}
                    <div className="bg-slate-100 px-2.5 py-1 flex items-center justify-between border-b border-slate-200 text-[10px] font-mono text-slate-600">
                      <span>M#{m.matchNumber}</span>
                      <span className="uppercase font-semibold text-slate-500">
                        {m.status === 'COMPLETED' ? 'FT' : 'SCHED'}
                      </span>
                    </div>

                    {/* Team Rows */}
                    <div className="divide-y divide-slate-100">
                      {/* Home Team Slot */}
                      <div
                        className={`flex items-center justify-between px-2.5 py-1.5 text-xs ${
                          homeWon ? 'bg-emerald-50/60 font-bold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <KitBadge name={m.homeTeam ? m.homeTeam.name : 'BYE'} size="sm" />
                          <span className="truncate">{m.homeTeam ? m.homeTeam.name : 'BYE / TBD'}</span>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums ml-2">
                          {m.homeScore !== null ? m.homeScore : '-'}
                        </span>
                      </div>

                      {/* Away Team Slot */}
                      <div
                        className={`flex items-center justify-between px-2.5 py-1.5 text-xs ${
                          awayWon ? 'bg-emerald-50/60 font-bold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <KitBadge name={m.awayTeam ? m.awayTeam.name : 'BYE'} size="sm" />
                          <span className="truncate">{m.awayTeam ? m.awayTeam.name : 'BYE / TBD'}</span>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums ml-2">
                          {m.awayScore !== null ? m.awayScore : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Score Action Bar */}
                    {isCoordinator && m.homeTeamId && m.awayTeamId && (
                      <div className="bg-slate-50 border-t border-slate-200 p-1.5 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              value={homeInput}
                              onChange={(e) => setHomeInput(e.target.value)}
                              placeholder="H"
                              className="w-10 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                            />
                            <span className="text-slate-400 font-bold text-xs">:</span>
                            <input
                              type="number"
                              min="0"
                              value={awayInput}
                              onChange={(e) => setAwayInput(e.target.value)}
                              placeholder="A"
                              className="w-10 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                            />
                            <button
                              disabled={saving}
                              onClick={() => handleSaveScore(m.id)}
                              className="px-2 py-0.5 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMatchId(null)}
                              className="px-1.5 py-0.5 text-xs text-slate-500 hover:text-slate-800"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(m)}
                            className="text-[11px] text-slate-700 hover:text-slate-900 font-semibold underline underline-offset-2"
                          >
                            {m.status === 'COMPLETED' ? 'Edit Score' : 'Log Score'}
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
