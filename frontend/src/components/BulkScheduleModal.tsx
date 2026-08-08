import React, { useState } from 'react';
import type { Match } from '../services/api';
import { matchApi } from '../services/api';

interface BulkScheduleModalProps {
  matches: Match[];
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export const BulkScheduleModal: React.FC<BulkScheduleModalProps> = ({
  matches,
  isOpen,
  onClose,
  onScheduled,
}) => {
  const unscheduled = matches.filter((m) => !m.scheduledAt && m.homeTeamId && m.awayTeamId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(unscheduled.map((m) => m.id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt || selected.size === 0) {
      setError('Select matches and set a date/time');
      return;
    }

    setSaving(true);
    setError('');
    const iso = new Date(scheduledAt).toISOString();

    try {
      await Promise.all(
        [...selected].map((id) => matchApi.updateDetails(id, { scheduledAt: iso }))
      );
      onScheduled();
      onClose();
      setSelected(new Set());
      setScheduledAt('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to schedule matches');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Bulk Schedule Fixtures</h2>
          <p className="text-[11px] text-slate-500 mt-1">
            Assign the same kick-off time to multiple unscheduled fixtures.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {error && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase">
                Unscheduled ({unscheduled.length})
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline"
              >
                Select all
              </button>
            </div>

            {unscheduled.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">All fixtures are already scheduled.</p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded p-2">
                {unscheduled.map((m) => (
                  <li key={m.id}>
                    <label className="flex items-center gap-2 text-xs cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={() => toggle(m.id)}
                      />
                      <span className="font-mono text-[10px] text-slate-500">
                        R{m.round} M{m.matchNumber}
                      </span>
                      <span className="truncate">
                        {m.homeTeam?.name ?? 'TBD'} vs {m.awayTeam?.name ?? 'TBD'}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || selected.size === 0}
              className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded disabled:opacity-50"
            >
              {saving ? 'Scheduling...' : `Schedule ${selected.size} match${selected.size !== 1 ? 'es' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
