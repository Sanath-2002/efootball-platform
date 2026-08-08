import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../services/api';
import type { AppNotification } from '../services/api';

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnread = async () => {
    try {
      const res = await notificationApi.unreadCount();
      setUnreadCount(res.data.count);
    } catch {
      // ignore
    }
  };

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.list({ limit: 15 });
      setItems(res.data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) fetchFeed();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleMarkAllRead = async () => {
    await notificationApi.markRead();
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-emerald-700 font-bold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="p-4 text-xs text-slate-500 text-center">Loading...</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-xs text-slate-500 text-center">No notifications yet</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li
                  key={n.recipientId}
                  className={`px-3 py-2.5 ${!n.readAt ? 'bg-emerald-50/50' : ''}`}
                >
                  <p className="text-xs font-bold text-slate-900">
                    {n.title}
                    {n.type === 'ANNOUNCEMENT' && (
                      <span className="ml-1 text-[9px] font-bold uppercase text-amber-700 bg-amber-100 px-1 rounded">
                        Announcement
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{n.body}</p>
                  <div className="flex items-center justify-between mt-1">
                    <Link
                      to={`/c/${n.competition.slug}`}
                      onClick={() => setOpen(false)}
                      className="text-[10px] text-emerald-700 font-bold hover:underline"
                    >
                      {n.competition.name}
                    </Link>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
