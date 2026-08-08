import React from 'react';
import type { Announcement } from '../services/api';

interface AnnouncementFeedProps {
  announcements: Announcement[];
  canManage?: boolean;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcementId: string) => void;
}

export const AnnouncementFeed: React.FC<AnnouncementFeedProps> = ({
  announcements,
  canManage = false,
  onEdit,
  onDelete,
}) => {
  if (!announcements.length) {
    return (
      <div className="text-center py-6 bg-white rounded-lg border border-slate-200 text-slate-500 text-xs">
        No announcements yet.
      </div>
    );
  }

  const pinned = announcements.filter((a) => a.pinned);
  const regular = announcements.filter((a) => !a.pinned);

  const renderItem = (a: Announcement) => (
    <div
      key={a.id}
      className={`rounded-lg border p-3 space-y-1.5 ${
        a.pinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {a.pinned && (
            <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded mr-1">
              Pinned
            </span>
          )}
          <h4 className="text-xs font-bold text-slate-900 inline">{a.title}</h4>
        </div>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(a)}
                className="text-[10px] font-bold text-slate-600 hover:underline"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(a.id)}
                className="text-[10px] font-bold text-rose-600 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-700 whitespace-pre-wrap">{a.body}</p>
      <p className="text-[10px] text-slate-400 font-mono">
        {a.author?.name ?? 'Organizer'} · {new Date(a.publishedAt).toLocaleString()}
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      {pinned.map(renderItem)}
      {regular.map(renderItem)}
    </div>
  );
};
