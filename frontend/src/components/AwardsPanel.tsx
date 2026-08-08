import React, { useState } from 'react';
import type { CompetitionAward, AwardType, Team, Player } from '../services/api';
import { awardApi } from '../services/api';
import { KitBadge } from './KitBadge';

const AWARD_LABELS: Record<AwardType, string> = {
  MVP: 'Most Valuable Player',
  BEST_GOALKEEPER: 'Best Goalkeeper',
  FAIR_PLAY: 'Fair Play',
  CUSTOM: 'Custom Award',
};

interface AwardsPanelProps {
  competitionId: string;
  awards: CompetitionAward[];
  teams: Team[];
  topScorerName?: string | null;
  topScorerGoals?: number;
  canManage?: boolean;
  onUpdated: () => void;
}

export const AwardsPanel: React.FC<AwardsPanelProps> = ({
  competitionId,
  awards,
  teams,
  topScorerName,
  topScorerGoals,
  canManage = false,
  onUpdated,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [awardType, setAwardType] = useState<AwardType>('MVP');
  const [playerId, setPlayerId] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPlayers: (Player & { teamName: string; colorPrimary: string | null })[] = teams.flatMap(
    (t) =>
      (t.players ?? []).map((p) => ({
        ...p,
        teamName: t.name,
        colorPrimary: t.colorPrimary,
      }))
  );

  const handleCreate = async () => {
    if (!playerId) {
      setError('Select a player');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await awardApi.create(competitionId, {
        playerId,
        awardType,
        label: awardType === 'CUSTOM' ? label : null,
        notes: notes || null,
      });
      setShowForm(false);
      setPlayerId('');
      setLabel('');
      setNotes('');
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to assign award');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (awardId: string) => {
    if (!confirm('Remove this award?')) return;
    try {
      await awardApi.delete(competitionId, awardId);
      onUpdated();
    } catch {
      alert('Failed to remove award');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tournament Awards</h3>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[10px] font-bold text-emerald-700 underline"
          >
            {showForm ? 'Cancel' : '+ Assign Award'}
          </button>
        )}
      </div>

      {topScorerName && topScorerGoals != null && topScorerGoals > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs">
          <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[9px] font-bold rounded uppercase">
            Auto
          </span>
          <span className="font-bold text-slate-800">Golden Boot</span>
          <span className="text-slate-600">
            — {topScorerName} ({topScorerGoals} goals)
          </span>
        </div>
      )}

      {awards.length === 0 && !topScorerName && (
        <p className="text-xs text-slate-500">No awards assigned yet.</p>
      )}

      {awards.map((award) => (
        <div
          key={award.id}
          className="flex items-start justify-between p-3 bg-white border border-slate-200 rounded-lg"
        >
          <div>
            <p className="text-xs font-bold text-slate-900">
              {award.awardType === 'CUSTOM' && award.label
                ? award.label
                : AWARD_LABELS[award.awardType]}
            </p>
            {award.player && (
              <div className="flex items-center gap-2 mt-1">
                <KitBadge
                  name={award.player.team?.name ?? ''}
                  colorPrimary={award.player.team?.colorPrimary}
                  size="sm"
                />
                <span className="text-xs text-slate-700">{award.player.name}</span>
              </div>
            )}
            {award.notes && (
              <p className="text-[10px] text-slate-500 mt-1">{award.notes}</p>
            )}
          </div>
          {canManage && (
            <button
              onClick={() => handleDelete(award.id)}
              className="text-[10px] text-rose-600 font-bold"
            >
              Remove
            </button>
          )}
        </div>
      ))}

      {showForm && canManage && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <select
            value={awardType}
            onChange={(e) => setAwardType(e.target.value as AwardType)}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
          >
            {(Object.keys(AWARD_LABELS) as AwardType[]).map((t) => (
              <option key={t} value={t}>
                {AWARD_LABELS[t]}
              </option>
            ))}
          </select>
          {awardType === 'CUSTOM' && (
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Award title"
              className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
            />
          )}
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
          >
            <option value="">Select player</option>
            {allPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.teamName})
              </option>
            ))}
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
          />
          {error && <p className="text-[10px] text-rose-600">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Assign Award'}
          </button>
        </div>
      )}
    </div>
  );
};
