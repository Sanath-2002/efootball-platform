import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchApi } from '../services/api';
import type { Match } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../lib/permissions';
import { KitBadge } from '../components/KitBadge';
import { MatchStatusBadge, isResultStatus } from '../components/MatchStatusBadge';
import { MatchScoreEditor } from '../components/MatchScoreEditor';

export const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingScore, setEditingScore] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const { can } = usePermissions(match?.viewerPermissions);
  const canUpdateScores = can(PERMISSIONS.SCORES_UPDATE);
  const canManageFixtures = can(PERMISSIONS.FIXTURES_MANAGE);

  const reload = async () => {
    if (!id) return;
    try {
      const res = await matchApi.getById(id);
      setMatch(res.data);
      setScheduledAt(
        res.data.scheduledAt
          ? new Date(res.data.scheduledAt).toISOString().slice(0, 16)
          : ''
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 text-sm">Loading match...</div>;
  }

  if (!match) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-sm">Match not found</p>
        <Link to="/dashboard" className="text-xs text-emerald-700 font-bold mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const format = match.competition?.format ?? 'BO1';
  const homeWon = isResultStatus(match.status) && match.winnerId === match.homeTeamId;
  const awayWon = isResultStatus(match.status) && match.winnerId === match.awayTeamId;

  const handleStatusChange = async (status: string, winnerTeamId?: string) => {
    if (!id) return;
    try {
      await matchApi.updateStatus(id, { status, statusNote: statusNote || undefined, winnerTeamId });
      await reload();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to update status');
    }
  };

  const handleSaveSchedule = async () => {
    if (!id) return;
    try {
      await matchApi.updateDetails(id, {
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      await reload();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to update schedule');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      await matchApi.uploadScreenshot(id, file);
      await reload();
    } catch (err: unknown) {
      const er = err as { response?: { data?: { error?: string } } };
      alert(er.response?.data?.error || 'Upload failed');
    }
    e.target.value = '';
  };

  const screenshotUrl = (url: string) =>
    url.startsWith('http') || url.startsWith('/') ? url : `/api${url}`;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={match.competition ? `/competitions/${match.competition.id}` : '/dashboard'}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            ← Back to tournament
          </Link>
          <h1 className="text-lg font-bold text-slate-900 mt-1">
            Round {match.round} • Match #{match.matchNumber}
          </h1>
          {match.competition && (
            <p className="text-xs text-slate-500">{match.competition.name}</p>
          )}
        </div>
        <MatchStatusBadge status={match.status} className="text-sm" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div
          className={`flex items-center justify-between p-3 rounded ${
            homeWon ? 'bg-emerald-50 font-bold' : 'bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <KitBadge
              name={match.homeTeam?.name ?? 'TBD'}
              shortName={match.homeTeam?.shortName}
              colorPrimary={match.homeTeam?.colorPrimary}
              logoUrl={match.homeTeam?.logoUrl}
            />
            <span>{match.homeTeam?.name ?? 'TBD'}</span>
          </div>
          <span className="font-mono text-xl tabular-nums">
            {match.homeScore ?? '-'}
            {match.homePenalties != null && (
              <span className="text-sm text-slate-500 ml-1">({match.homePenalties}p)</span>
            )}
          </span>
        </div>

        <div
          className={`flex items-center justify-between p-3 rounded ${
            awayWon ? 'bg-emerald-50 font-bold' : 'bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <KitBadge
              name={match.awayTeam?.name ?? 'TBD'}
              shortName={match.awayTeam?.shortName}
              colorPrimary={match.awayTeam?.colorPrimary}
              logoUrl={match.awayTeam?.logoUrl}
            />
            <span>{match.awayTeam?.name ?? 'TBD'}</span>
          </div>
          <span className="font-mono text-xl tabular-nums">
            {match.awayScore ?? '-'}
            {match.awayPenalties != null && (
              <span className="text-sm text-slate-500 ml-1">({match.awayPenalties}p)</span>
            )}
          </span>
        </div>

        {format === 'BO3' && match.games && match.games.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-700 mb-2">Series legs</p>
            {match.games.map((g) => (
              <div key={g.id} className="text-xs font-mono text-slate-600 py-0.5">
                Leg {g.gameNumber}: {g.homeScore} - {g.awayScore}
                {g.homePenalties != null && ` (PEN ${g.homePenalties}-${g.awayPenalties})`}
              </div>
            ))}
            {match.homeGamesWon != null && (
              <p className="text-xs font-bold mt-1">
                Series: {match.homeGamesWon} - {match.awayGamesWon}
              </p>
            )}
          </div>
        )}

        {match.statusNote && (
          <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded">{match.statusNote}</p>
        )}

        {match.goals && match.goals.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-700 mb-2">Goal scorers</p>
            <ul className="space-y-1">
              {match.goals.map((g) => (
                <li key={g.id} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="font-bold text-slate-800">{g.player?.name ?? 'Unknown'}</span>
                  {g.isOwnGoal && (
                    <span className="text-[10px] text-rose-600 font-bold">(OG)</span>
                  )}
                  {g.minute != null && (
                    <span className="text-slate-400 font-mono">{g.minute}&apos;</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canUpdateScores && match.homeTeamId && match.awayTeamId && (
          <div className="border-t border-slate-100 pt-3">
            {editingScore ? (
              <MatchScoreEditor
                match={match}
                format={format}
                onSave={async (matchId, payload) => {
                  await matchApi.updateScore(matchId, payload);
                  setEditingScore(false);
                  await reload();
                }}
                onCancel={() => setEditingScore(false)}
              />
            ) : (
              <button
                onClick={() => setEditingScore(true)}
                className="text-xs font-bold text-slate-800 underline"
              >
                {isResultStatus(match.status) ? 'Edit score' : 'Log score'}
              </button>
            )}
          </div>
        )}
      </div>

      {canManageFixtures && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Match management</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusChange('POSTPONED')}
              className="px-2 py-1 text-xs font-bold border border-amber-300 text-amber-800 rounded hover:bg-amber-50"
            >
              Postpone
            </button>
            <button
              onClick={() => handleStatusChange('CANCELLED')}
              className="px-2 py-1 text-xs font-bold border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            {match.homeTeamId && (
              <button
                onClick={() => handleStatusChange('WALKOVER', match.homeTeamId!)}
                className="px-2 py-1 text-xs font-bold border border-slate-300 rounded hover:bg-slate-50"
              >
                Walkover (Home)
              </button>
            )}
            {match.awayTeamId && (
              <button
                onClick={() => handleStatusChange('WALKOVER', match.awayTeamId!)}
                className="px-2 py-1 text-xs font-bold border border-slate-300 rounded hover:bg-slate-50"
              >
                Walkover (Away)
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Status note (optional)"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
          />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block mb-1">Scheduled time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
              />
            </div>
            <button
              onClick={handleSaveSchedule}
              className="px-3 py-1 text-xs font-bold bg-slate-900 text-white rounded"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Score screenshots</h2>
          {canUpdateScores && (
            <label className="px-2 py-1 text-xs font-bold bg-slate-900 text-white rounded cursor-pointer">
              Upload
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
            </label>
          )}
        </div>
        {match.screenshots && match.screenshots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {match.screenshots.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setLightboxUrl(screenshotUrl(s.url))}
                className="aspect-video bg-slate-100 rounded overflow-hidden border border-slate-200"
              >
                <img src={screenshotUrl(s.url)} alt="Score proof" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No screenshots uploaded yet.</p>
        )}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Screenshot" className="max-w-full max-h-full rounded" />
        </div>
      )}
    </div>
  );
};
