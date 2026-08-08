import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Competition, CompetitionMember } from '../services/api';
import {
  ASSIGNABLE_PERMISSIONS,
  PERMISSION_LABELS,
  type Permission,
} from '../lib/permissions';

interface TournamentSettingsProps {
  competition: Competition;
  onUpdated: () => void;
}

export const TournamentSettings: React.FC<TournamentSettingsProps> = ({ competition, onUpdated }) => {
  const [members, setMembers] = useState<CompetitionMember[]>([]);
  const [assignable, setAssignable] = useState<{ key: Permission; label: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerms, setInvitePerms] = useState<Permission[]>([]);
  const [branding, setBranding] = useState({
    description: competition.description || '',
    logoUrl: competition.logoUrl || '',
    bannerUrl: competition.bannerUrl || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMembers = async () => {
    try {
      const res = await api.get(`/competitions/${competition.id}/members`);
      setMembers(res.data.members);
      setAssignable(res.data.assignablePermissions);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to load coordinators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [competition.id]);

  const toggleInvitePerm = (perm: Permission) => {
    setInvitePerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const inviteCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/competitions/${competition.id}/members`, {
        email: inviteEmail.trim(),
        permissions: invitePerms,
      });
      setInviteEmail('');
      setInvitePerms([]);
      await loadMembers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to invite coordinator');
    }
  };

  const updateMemberPerms = async (userId: string, permissions: Permission[]) => {
    try {
      await api.patch(`/competitions/${competition.id}/members/${userId}`, { permissions });
      await loadMembers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to update permissions');
    }
  };

  const removeMember = async (userId: string, name: string) => {
    if (!window.confirm(`Remove ${name} as coordinator?`)) return;
    try {
      await api.delete(`/competitions/${competition.id}/members/${userId}`);
      await loadMembers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to remove coordinator');
    }
  };

  const saveBranding = async () => {
    setError('');
    try {
      await api.patch(`/competitions/${competition.id}`, {
        description: branding.description || null,
        logoUrl: branding.logoUrl || null,
        bannerUrl: branding.bannerUrl || null,
      });
      onUpdated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to save branding');
    }
  };

  const permOptions = assignable.length
    ? assignable
    : ASSIGNABLE_PERMISSIONS.map((key) => ({ key, label: PERMISSION_LABELS[key] }));

  return (
    <div className="space-y-5 font-sans">
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tournament Branding</h3>
        <textarea
          value={branding.description}
          onChange={(e) => setBranding({ ...branding, description: e.target.value })}
          placeholder="Tournament description for players..."
          className="w-full px-3 py-2 border rounded text-xs min-h-[80px]"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={branding.logoUrl}
            onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
            placeholder="Logo URL"
            className="px-3 py-1.5 border rounded text-xs"
          />
          <input
            value={branding.bannerUrl}
            onChange={(e) => setBranding({ ...branding, bannerUrl: e.target.value })}
            placeholder="Banner URL"
            className="px-3 py-1.5 border rounded text-xs"
          />
        </div>
        <button onClick={saveBranding} className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold">
          Save Branding
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Coordinators</h3>
        <p className="text-[11px] text-slate-500">Assign coordinators with specific permissions. They cannot manage other coordinators.</p>

        {loading ? (
          <p className="text-xs text-slate-400">Loading...</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="p-3 bg-slate-50 rounded border border-slate-100 text-xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold text-slate-900">{m.user.name}</span>
                    <span className="text-slate-500 font-mono ml-2">{m.user.email}</span>
                    <span className="ml-2 px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-bold uppercase">{m.role}</span>
                  </div>
                  {m.role === 'COORDINATOR' && (
                    <button onClick={() => removeMember(m.userId, m.user.name)} className="text-rose-600 font-bold">Remove</button>
                  )}
                </div>
                {m.role === 'COORDINATOR' && (
                  <div className="flex flex-wrap gap-1.5">
                    {permOptions.map(({ key, label }) => (
                      <label key={key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.permissions.includes(key)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...m.permissions, key]
                              : m.permissions.filter((p) => p !== key);
                            updateMemberPerms(m.userId, next);
                          }}
                          className="rounded"
                        />
                        <span className="text-[10px]">{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={inviteCoordinator} className="border-t pt-3 space-y-2">
          <h4 className="text-[11px] font-bold uppercase text-slate-600">Invite Coordinator</h4>
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="coordinator@email.com"
            className="w-full px-3 py-1.5 border rounded text-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            {permOptions.map(({ key, label }) => (
              <label key={key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={invitePerms.includes(key)}
                  onChange={() => toggleInvitePerm(key)}
                  className="rounded"
                />
                <span className="text-[10px]">{label}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="px-3 py-1.5 bg-emerald-800 text-white rounded text-xs font-bold">
            Send Invite
          </button>
        </form>
      </div>
    </div>
  );
};
