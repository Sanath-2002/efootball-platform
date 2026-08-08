import React, { useState } from 'react';
import { api } from '../services/api';
import type { Match, Team, TournamentGroup } from '../services/api';

interface FixtureManagerProps {
  competitionId: string;
  matches: Match[];
  teams: Team[];
  groups?: TournamentGroup[];
  onUpdated: () => void;
}

const emptyForm = {
  round: 1,
  matchNumber: 1,
  stage: 'GROUP' as 'KNOCKOUT' | 'LEAGUE' | 'GROUP',
  groupId: '',
  homeTeamId: '',
  awayTeamId: '',
  scheduledAt: '',
};

export const FixtureManager: React.FC<FixtureManagerProps> = ({
  competitionId,
  matches,
  teams,
  groups = [],
  onUpdated,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const nextMatchNumber =
    matches.length > 0 ? Math.max(...matches.map((m) => m.matchNumber)) + 1 : 1;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, matchNumber: nextMatchNumber });
    setShowForm(true);
    setError('');
  };

  const openEdit = (match: Match) => {
    setEditingId(match.id);
    setForm({
      round: match.round,
      matchNumber: match.matchNumber,
      stage: match.stage,
      groupId: match.groupId ?? '',
      homeTeamId: match.homeTeamId ?? '',
      awayTeamId: match.awayTeamId ?? '',
      scheduledAt: match.scheduledAt
        ? new Date(match.scheduledAt).toISOString().slice(0, 16)
        : '',
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      round: form.round,
      matchNumber: form.matchNumber,
      stage: form.stage,
      groupId: form.groupId || null,
      homeTeamId: form.homeTeamId || null,
      awayTeamId: form.awayTeamId || null,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    };

    try {
      if (editingId) {
        await api.patch(`/matches/${editingId}/fixture`, payload);
      } else {
        await api.post(`/competitions/${competitionId}/matches`, payload);
      }
      setShowForm(false);
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to save fixture');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!window.confirm('Delete this fixture?')) return;
    try {
      await api.delete(`/matches/${matchId}`);
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to delete fixture');
    }
  };

  const groupTeams = (groupId: string) => teams.filter((t) => t.groupId === groupId);
  const editableMatches = matches.filter(
    (m) => m.status === 'SCHEDULED' || m.status === 'POSTPONED'
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 uppercase">Fixture Manager</h3>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800"
        >
          + Add Match
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50">
          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Round</label>
              <input
                type="number"
                min={1}
                value={form.round}
                onChange={(e) => setForm({ ...form, round: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Match #</label>
              <input
                type="number"
                min={1}
                value={form.matchNumber}
                onChange={(e) => setForm({ ...form, matchNumber: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stage: e.target.value as typeof form.stage,
                    groupId: e.target.value === 'GROUP' ? form.groupId : '',
                  })
                }
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
              >
                <option value="GROUP">Group</option>
                <option value="LEAGUE">League</option>
                <option value="KNOCKOUT">Knockout</option>
              </select>
            </div>
            {form.stage === 'GROUP' && groups.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Group</label>
                <select
                  value={form.groupId}
                  onChange={(e) =>
                    setForm({ ...form, groupId: e.target.value, homeTeamId: '', awayTeamId: '' })
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                >
                  <option value="">Select group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Home</label>
              <select
                value={form.homeTeamId}
                onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
              >
                <option value="">TBD</option>
                {(form.stage === 'GROUP' && form.groupId ? groupTeams(form.groupId) : teams).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Away</label>
              <select
                value={form.awayTeamId}
                onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
              >
                <option value="">TBD</option>
                {(form.stage === 'GROUP' && form.groupId ? groupTeams(form.groupId) : teams).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Scheduled</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 bg-emerald-800 text-white text-xs font-bold rounded disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {editableMatches.length > 0 && (
        <ul className="space-y-1 text-xs border-t border-slate-100 pt-2">
          {editableMatches.slice(0, 8).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-1">
              <span className="font-mono text-[10px] text-slate-500">
                R{m.round} M{m.matchNumber}: {m.homeTeam?.name ?? 'TBD'} vs {m.awayTeam?.name ?? 'TBD'}
              </span>
              <span className="flex gap-2">
                <button onClick={() => openEdit(m)} className="text-[10px] font-bold underline">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-[10px] font-bold text-rose-600 underline"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-slate-500">
        Manually add fixtures or edit unplayed matches. Matches with results must be cleared before editing teams.
      </p>
    </div>
  );
};
