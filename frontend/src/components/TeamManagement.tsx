import React, { useState } from 'react';
import { api } from '../services/api';
import type { Team, Player, PlayerPlatform } from '../services/api';
import { KitBadge } from './KitBadge';

interface TeamManagementProps {
  team: Team;
  competitionId: string;
  canManageTeams: boolean;
  canManagePlayers: boolean;
  isDraft: boolean;
  allTeams: Team[];
  onUpdated: () => void;
}

const PLATFORMS: PlayerPlatform[] = ['PS5', 'XBOX', 'STEAM', 'MOBILE', 'OTHER'];

export const TeamManagement: React.FC<TeamManagementProps> = ({
  team,
  canManageTeams,
  canManagePlayers,
  isDraft,
  allTeams,
  onUpdated,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: team.name,
    shortName: team.shortName || '',
    colorPrimary: team.colorPrimary || '#1e293b',
    coachName: team.coachName || '',
    logoUrl: team.logoUrl || '',
    notes: team.notes || '',
  });
  const [playerForm, setPlayerForm] = useState({
    name: '',
    gamerTag: '',
    platform: 'PS5' as PlayerPlatform,
    jerseyNumber: '',
    preferredClub: '',
  });
  const [error, setError] = useState('');
  const [transferPlayerId, setTransferPlayerId] = useState<string | null>(null);
  const [transferToTeamId, setTransferToTeamId] = useState('');

  const players = team.players || [];

  const saveTeam = async () => {
    setError('');
    try {
      await api.patch(`/teams/${team.id}`, {
        name: form.name,
        shortName: form.shortName || null,
        colorPrimary: form.colorPrimary || null,
        coachName: form.coachName || null,
        logoUrl: form.logoUrl || null,
        notes: form.notes || null,
      });
      setEditing(false);
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to update team');
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerForm.name.trim()) return;
    setError('');
    try {
      await api.post(`/teams/${team.id}/players`, {
        name: playerForm.name.trim(),
        gamerTag: playerForm.gamerTag.trim() || null,
        platform: playerForm.platform,
        jerseyNumber: playerForm.jerseyNumber ? Number(playerForm.jerseyNumber) : null,
        preferredClub: playerForm.preferredClub.trim() || null,
      });
      setPlayerForm({ name: '', gamerTag: '', platform: 'PS5', jerseyNumber: '', preferredClub: '' });
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to add player');
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!window.confirm('Remove this player?')) return;
    try {
      await api.delete(`/players/${playerId}`);
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to remove player');
    }
  };

  const setCaptain = async (playerId: string) => {
    try {
      await api.patch(`/teams/${team.id}/captain`, { playerId });
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to set captain');
    }
  };

  const transferPlayer = async () => {
    if (!transferPlayerId || !transferToTeamId) return;
    try {
      await api.post(`/players/${transferPlayerId}/transfer`, { toTeamId: transferToTeamId });
      setTransferPlayerId(null);
      setTransferToTeamId('');
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to transfer player');
    }
  };

  const movePlayer = async (player: Player, direction: 'up' | 'down') => {
    const ids = players.map((p) => p.id);
    const idx = ids.indexOf(player.id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= ids.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
    try {
      await api.patch(`/teams/${team.id}/players/reorder`, { playerIds: ids });
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to reorder');
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <KitBadge
            name={team.name}
            shortName={team.shortName}
            colorPrimary={team.colorPrimary}
            logoUrl={team.logoUrl}
            size="sm"
          />
          <div className="min-w-0">
            <span className="font-bold text-slate-900 text-xs block truncate">{team.name}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {players.length} player{players.length !== 1 ? 's' : ''}
              {team.coachName ? ` • Coach: ${team.coachName}` : ''}
            </span>
          </div>
        </div>
        <span className="text-slate-400 text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-3 space-y-3 bg-white">
          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{error}</div>
          )}

          {canManageTeams && isDraft && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 underline"
            >
              Edit Team Profile
            </button>
          )}

          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Team name" className="px-2 py-1.5 border rounded" />
              <input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="Short name (3 letters)" className="px-2 py-1.5 border rounded" />
              <input value={form.coachName} onChange={(e) => setForm({ ...form, coachName: e.target.value })} placeholder="Coach" className="px-2 py-1.5 border rounded" />
              <input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="Logo URL" className="px-2 py-1.5 border rounded" />
              <input type="color" value={form.colorPrimary} onChange={(e) => setForm({ ...form, colorPrimary: e.target.value })} className="h-8 w-full border rounded cursor-pointer" title="Team colour" />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="px-2 py-1.5 border rounded sm:col-span-2" rows={2} />
              <div className="sm:col-span-2 flex gap-2">
                <button onClick={saveTeam} className="px-3 py-1 bg-slate-900 text-white rounded font-bold">Save</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1 text-slate-600">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Roster</h4>
            {players.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No players registered yet.</p>
            ) : (
              <ul className="space-y-1">
                {players.map((p, idx) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-100 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900">
                        {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ''}{p.name}
                        {team.captainId === p.id && <span className="ml-1 text-amber-600">(C)</span>}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {p.gamerTag && `@${p.gamerTag}`}
                        {p.platform && ` • ${p.platform}`}
                        {p.preferredClub && ` • ${p.preferredClub}`}
                      </div>
                    </div>
                    {canManagePlayers && isDraft && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => movePlayer(p, 'up')} disabled={idx === 0} className="px-1 text-slate-500 disabled:opacity-30">↑</button>
                        <button onClick={() => movePlayer(p, 'down')} disabled={idx === players.length - 1} className="px-1 text-slate-500 disabled:opacity-30">↓</button>
                        <button onClick={() => setCaptain(p.id)} className="px-1.5 text-amber-700 font-bold" title="Set captain">C</button>
                        <button onClick={() => { setTransferPlayerId(p.id); setTransferToTeamId(''); }} className="px-1.5 text-blue-700 font-bold" title="Transfer">↔</button>
                        <button onClick={() => removePlayer(p.id)} className="px-1.5 text-rose-600 font-bold">✕</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {transferPlayerId && canManagePlayers && (
            <div className="flex gap-2 items-center text-xs border-t pt-2">
              <select value={transferToTeamId} onChange={(e) => setTransferToTeamId(e.target.value)} className="flex-1 px-2 py-1 border rounded">
                <option value="">Transfer to...</option>
                {allTeams.filter((t) => t.id !== team.id).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button onClick={transferPlayer} disabled={!transferToTeamId} className="px-2 py-1 bg-blue-700 text-white rounded font-bold disabled:opacity-50">Transfer</button>
              <button onClick={() => setTransferPlayerId(null)} className="px-2 py-1 text-slate-500">Cancel</button>
            </div>
          )}

          {canManagePlayers && isDraft && (
            <form onSubmit={addPlayer} className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
              <input required value={playerForm.name} onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })} placeholder="Player name" className="px-2 py-1.5 border rounded col-span-2 sm:col-span-1" />
              <input value={playerForm.gamerTag} onChange={(e) => setPlayerForm({ ...playerForm, gamerTag: e.target.value })} placeholder="Gamer tag" className="px-2 py-1.5 border rounded col-span-2 sm:col-span-1" />
              <select value={playerForm.platform} onChange={(e) => setPlayerForm({ ...playerForm, platform: e.target.value as PlayerPlatform })} className="px-2 py-1.5 border rounded">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input value={playerForm.jerseyNumber} onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value })} placeholder="#" className="px-2 py-1.5 border rounded" type="number" min={1} max={99} />
              <input value={playerForm.preferredClub} onChange={(e) => setPlayerForm({ ...playerForm, preferredClub: e.target.value })} placeholder="Preferred club" className="px-2 py-1.5 border rounded col-span-2" />
              <button type="submit" className="col-span-2 px-3 py-1.5 bg-emerald-800 text-white rounded font-bold">+ Add Player</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
