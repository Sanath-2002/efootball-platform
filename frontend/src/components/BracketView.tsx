import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Match, UpdateScorePayload } from '../services/api';
import { KitBadge } from './KitBadge';
import { MatchStatusBadge, isResultStatus } from './MatchStatusBadge';
import { MatchScoreEditor } from './MatchScoreEditor';

interface BracketViewProps {
  matches: Match[];
  format?: 'BO1' | 'BO3';
  canUpdateScores: boolean;
  onUpdateScore?: (matchId: string, payload: UpdateScorePayload) => Promise<void>;
}

export const BracketView: React.FC<BracketViewProps> = ({
  matches,
  format = 'BO1',
  canUpdateScores,
  onUpdateScore,
}) => {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

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

    rounds.push({ roundNumber: r, title, matches: roundMatches });
  }

  return (
    <div className="overflow-x-auto pb-4 font-sans">
      <div className="flex gap-6 min-w-[760px] items-stretch">
        {rounds.map((rd) => (
          <div key={rd.roundNumber} className="flex-1 flex flex-col min-w-[220px]">
            <div className="mb-3 pb-1.5 border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[11px] tracking-wider flex items-center justify-between">
              <span>{rd.title}</span>
              <span className="text-[10px] text-slate-500 font-mono font-normal">
                ({rd.matches.length} {rd.matches.length === 1 ? 'Match' : 'Matches'})
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-around gap-4">
              {rd.matches.map((m) => {
                const isEditing = editingMatchId === m.id;
                const isByeMatch =
                  isResultStatus(m.status) && (!m.homeTeamId || !m.awayTeamId);
                const homeWon =
                  isResultStatus(m.status) && Boolean(m.homeTeamId) && m.winnerId === m.homeTeamId;
                const awayWon =
                  isResultStatus(m.status) && Boolean(m.awayTeamId) && m.winnerId === m.awayTeamId;
                const canLogScore = canUpdateScores && Boolean(m.homeTeamId) && Boolean(m.awayTeamId);

                return (
                  <div
                    key={m.id}
                    className={`bg-white border rounded shadow-xs overflow-hidden transition-colors ${
                      isEditing ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-300'
                    }`}
                  >
                    <div className="bg-slate-100 px-2.5 py-1 flex items-center justify-between border-b border-slate-200 text-[10px] font-mono text-slate-600">
                      <Link to={`/matches/${m.id}`} className="hover:underline">
                        Match #{m.matchNumber}
                      </Link>
                      {isByeMatch ? (
                        <span className="uppercase font-bold text-slate-700">BYE ADVANCE</span>
                      ) : (
                        <MatchStatusBadge status={m.status} />
                      )}
                    </div>

                    <div className="divide-y divide-slate-100">
                      <div
                        className={`flex items-center justify-between px-2.5 py-2 text-xs ${
                          homeWon ? 'bg-emerald-100/70 font-bold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <KitBadge
                            name={m.homeTeam ? m.homeTeam.name : 'BYE'}
                            shortName={m.homeTeam?.shortName}
                            colorPrimary={m.homeTeam?.colorPrimary}
                            logoUrl={m.homeTeam?.logoUrl}
                            size="sm"
                          />
                          <span className="truncate">
                            {m.homeTeam ? m.homeTeam.name : isByeMatch ? 'BYE (Advanced)' : 'BYE / TBD'}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums ml-2">
                          {isByeMatch ? '-' : m.homeScore !== null ? m.homeScore : '-'}
                        </span>
                      </div>

                      <div
                        className={`flex items-center justify-between px-2.5 py-2 text-xs ${
                          awayWon ? 'bg-emerald-100/70 font-bold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <KitBadge
                            name={m.awayTeam ? m.awayTeam.name : 'BYE'}
                            shortName={m.awayTeam?.shortName}
                            colorPrimary={m.awayTeam?.colorPrimary}
                            logoUrl={m.awayTeam?.logoUrl}
                            size="sm"
                          />
                          <span className="truncate">
                            {m.awayTeam ? m.awayTeam.name : isByeMatch ? 'BYE (Advanced)' : 'BYE / TBD'}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums ml-2">
                          {isByeMatch ? '-' : m.awayScore !== null ? m.awayScore : '-'}
                        </span>
                      </div>
                    </div>

                    {canLogScore && (
                      <div className="bg-slate-50 border-t border-slate-200 p-2">
                        {isEditing && onUpdateScore ? (
                          <MatchScoreEditor
                            match={m}
                            format={format}
                            onSave={async (id, payload) => {
                              await onUpdateScore(id, payload);
                              setEditingMatchId(null);
                            }}
                            onCancel={() => setEditingMatchId(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setEditingMatchId(m.id)}
                            className="w-full py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-colors text-center cursor-pointer"
                          >
                            {isResultStatus(m.status) ? 'Edit Score' : '+ Log Score'}
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
