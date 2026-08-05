import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const [slugInput, setSlugInput] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (slugInput.trim()) {
      const cleanSlug = slugInput.trim().replace(/^.*\/c\//, '');
      navigate(`/c/${cleanSlug}`);
    }
  };

  return (
    <div className="space-y-10 py-6 max-w-4xl mx-auto px-4 font-sans">
      {/* Header section */}
      <section className="text-center space-y-4 pt-4">
        <div className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] uppercase font-bold tracking-wider">
          eFootball Competition Manager
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Automated League Standings & Tournament Draw Sheets
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-normal leading-relaxed">
          Log match scores. Round-robin standings tables, knockout bracket advancements, BYE seeding math, and complete goal statistics recalculate automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Link
            to="/register"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition-colors"
          >
            Create Competition
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded text-xs transition-colors"
          >
            Coordinator Sign In
          </Link>
        </div>

        {/* Quick Public Link Lookup */}
        <div className="pt-4 max-w-md mx-auto">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white p-1.5 rounded border border-slate-200 shadow-xs">
            <input
              type="text"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              placeholder="Enter public competition slug (e.g. amrita-cup)"
              className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none px-2 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded text-xs hover:bg-slate-800 transition-colors"
            >
              Open Link
            </button>
          </form>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-1.5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase">Knockout Draw Sheets</h3>
          <p className="text-xs text-slate-600 leading-normal">
            Single-elimination brackets with automatic BYE allocation when team counts are not exact powers of 2.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-1.5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase">Round-Robin Leagues</h3>
          <p className="text-xs text-slate-600 leading-normal">
            Official league table format (Pos, P, W, D, L, GF, GA, GD, Pts) with real-time tie-breaking algorithms.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-1.5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase">Public Read-Only URLs</h3>
          <p className="text-xs text-slate-600 leading-normal">
            Share read-only URLs with participants to inspect live match fixtures, scores, and team leaderboards.
          </p>
        </div>
      </section>
    </div>
  );
};
