import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Competition } from '../services/api';
import { FollowerCount } from '../components/FollowerCount';

export const Dashboard: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchCompetitions = async () => {
    try {
      const res = await api.get('/competitions/my');
      setCompetitions(res.data);
    } catch (err) {
      console.error('Failed to load competitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete competition "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/competitions/${id}`);
      setCompetitions(competitions.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const ongoing = competitions.filter((c) => c.status === 'IN_PROGRESS');
  const completed = competitions.filter((c) => c.status === 'COMPLETED');

  return (
    <div className="space-y-5 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Competitions Directory</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Manage live tournaments, leagues & fixtures</p>
        </div>
        <Link
          to="/competitions/new"
          className="inline-block px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-colors"
        >
          + New Competition
        </Link>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total</span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{competitions.length}</span>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ongoing</span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{ongoing.length}</span>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Completed</span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{completed.length}</span>
        </div>
      </div>

      {/* Competitions Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Managed Competitions
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">Loading...</div>
        ) : competitions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-900">No Competitions Created</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a tournament or league to begin generating fixtures.
            </p>
            <Link
              to="/competitions/new"
              className="inline-block mt-2 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded"
            >
              + Create First Competition
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {competitions.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between space-y-3 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-slate-700 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {c.type} • {c.format}
                    </span>
                    <span
                      className={`font-semibold uppercase px-1.5 py-0.5 rounded ${
                        c.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 truncate">{c.name}</h3>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>{c._count?.teams || 0} Teams</span>
                    <span>•</span>
                    <span>{c._count?.matches || 0} Matches</span>
                    <span>•</span>
                    <FollowerCount count={c.followerCount ?? 0} />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => copyPublicLink(c.slug)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    {copiedSlug === c.slug ? 'Copied' : 'Share Link'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Delete
                    </button>
                    <Link
                      to={`/competitions/${c.id}`}
                      className="px-2.5 py-1 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 transition-colors"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
