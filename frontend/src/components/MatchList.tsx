import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Match, UpdateScorePayload } from '../services/api';
import { KitBadge } from './KitBadge';
import { MatchStatusBadge, isResultStatus } from './MatchStatusBadge';
import { MatchScoreEditor } from './MatchScoreEditor';
import { ShareButton } from './ShareGraphicModal';

interface MatchListProps {
  matches: Match[];
  format?: 'BO1' | 'BO3';
  canUpdateScores: boolean;
  onUpdateScore?: (matchId: string, payload: UpdateScorePayload) => Promise<void>;
  showGroupFilter?: boolean;
  sortBySchedule?: boolean;
  onShareMatch?: (match: Match) => void;
}

export const MatchList: React.FC<MatchListProps> = ({
  matches,
  format = 'BO1',
  canUpdateScores,
  onUpdateScore,
  showGroupFilter = false,
  sortBySchedule = false,
  onShareMatch,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | 'ALL'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string | 'ALL'>('ALL');

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-slate-200 text-slate-500 text-xs font-medium">
        No match fixtures recorded yet.
      </div>
    );
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const groups = Array.from(
    new Map(
      matches
        .filter((m) => m.group)
        .map((m) => [m.group!.id, m.group!.name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  let filteredMatches =
    selectedRound === 'ALL' ? matches : matches.filter((m) => m.round === selectedRound);
  if (showGroupFilter && selectedGroup !== 'ALL') {
    filteredMatches = filteredMatches.filter((m) => m.groupId === selectedGroup);
  }
  if (sortBySchedule) {
    filteredMatches = [...filteredMatches].sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) {
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      }
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return a.round - b.round || a.matchNumber - b.matchNumber;
    });
  }

  return (
    <div className="space-y-4">
      {showGroupFilter && groups.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200">
          <button
            onClick={() => setSelectedGroup('ALL')}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${
              selectedGroup === 'ALL'
                ? 'bg-emerald-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Groups
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${
                selectedGroup === g.id
                  ? 'bg-emerald-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredMatches.map((match) => {
          const isEditing = editingId === match.id;
          const homeWon = isResultStatus(match.status) && match.winnerId === match.homeTeamId;
          const awayWon = isResultStatus(match.status) && match.winnerId === match.awayTeamId;

          return (
            <div
              key={match.id}
              className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pb-1.5 border-b border-slate-100">
                <Link to={`/matches/${match.id}`} className="hover:text-slate-900 hover:underline">
                  {match.group ? `${match.group.name} • ` : ''}ROUND {match.round} • MATCH #{match.matchNumber}
                </Link>
                <MatchStatusBadge status={match.status} />
              </div>

              {match.scheduledAt && (
                <p className="text-[10px] text-slate-500">
                  {new Date(match.scheduledAt).toLocaleString()}
                </p>
              )}

              {format === 'BO3' && match.homeGamesWon != null && (
                <p className="text-[10px] font-mono text-slate-600">
                  Series: {match.homeGamesWon} - {match.awayGamesWon}
                </p>
              )}

              <div className="space-y-1.5 font-sans">
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded ${
                    homeWon ? 'bg-emerald-50/70 text-slate-900 font-bold' : 'bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <KitBadge
                      name={match.homeTeam ? match.homeTeam.name : 'TBD'}
                      shortName={match.homeTeam?.shortName}
                      colorPrimary={match.homeTeam?.colorPrimary}
                      logoUrl={match.homeTeam?.logoUrl}
                      size="sm"
                    />
                    <span className="text-xs truncate">
                      {match.homeTeam ? match.homeTeam.name : 'TBD'}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums ml-2">
                    {match.homeScore !== null ? match.homeScore : '-'}
                    {match.homePenalties != null && match.awayPenalties != null && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({match.homePenalties}p)
                      </span>
                    )}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded ${
                    awayWon ? 'bg-emerald-50/70 text-slate-900 font-bold' : 'bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <KitBadge
                      name={match.awayTeam ? match.awayTeam.name : 'TBD'}
                      shortName={match.awayTeam?.shortName}
                      colorPrimary={match.awayTeam?.colorPrimary}
                      logoUrl={match.awayTeam?.logoUrl}
                      size="sm"
                    />
                    <span className="text-xs truncate">
                      {match.awayTeam ? match.awayTeam.name : 'TBD'}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums ml-2">
                    {match.awayScore !== null ? match.awayScore : '-'}
                    {match.homePenalties != null && match.awayPenalties != null && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({match.awayPenalties}p)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {match.statusNote && (
                <p className="text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded">
                  {match.statusNote}
                </p>
              )}

              {(canUpdateScores || onShareMatch) && match.homeTeamId && match.awayTeamId && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                  {isResultStatus(match.status) && onShareMatch && (
                    <ShareButton onClick={() => onShareMatch(match)} />
                  )}
                  {canUpdateScores &&
                    (isEditing && onUpdateScore ? (
                      <MatchScoreEditor
                        match={match}
                        format={format}
                        compact
                        onSave={async (id, payload) => {
                          await onUpdateScore(id, payload);
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingId(match.id)}
                        className="text-xs font-bold text-slate-800 hover:text-slate-900 underline underline-offset-2"
                      >
                        {isResultStatus(match.status) ? 'Edit Score' : 'Log Score'}
                      </button>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
