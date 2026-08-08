import React, { useState } from 'react';
import { api } from '../services/api';
import type { Announcement } from '../services/api';

interface AnnouncementComposerProps {
  competitionId: string;
  editing?: Announcement | null;
  onSaved: () => void;
  onCancelEdit?: () => void;
}

export const AnnouncementComposer: React.FC<AnnouncementComposerProps> = ({
  competitionId,
  editing,
  onSaved,
  onCancelEdit,
}) => {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [pinned, setPinned] = useState(editing?.pinned ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setTitle(editing?.title ?? '');
    setBody(editing?.body ?? '');
    setPinned(editing?.pinned ?? false);
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.patch(`/competitions/${competitionId}/announcements/${editing.id}`, {
          title: title.trim(),
          body: body.trim(),
          pinned,
        });
      } else {
        await api.post(`/competitions/${competitionId}/announcements`, {
          title: title.trim(),
          body: body.trim(),
          pinned,
        });
        setTitle('');
        setBody('');
        setPinned(false);
      }
      onSaved();
      onCancelEdit?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
      <h3 className="text-xs font-bold text-slate-900 uppercase">
        {editing ? 'Edit Announcement' : 'Publish Announcement'}
      </h3>
      {error && (
        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{error}</div>
      )}
      <input
        type="text"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
      />
      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message for followers and public viewers..."
        rows={4}
        className="w-full px-3 py-2 border border-slate-300 rounded text-xs resize-y"
      />
      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        Pin to top of public page
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : editing ? 'Update' : 'Publish'}
        </button>
        {editing && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-3 py-1.5 text-xs font-bold text-slate-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
