import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Search, Table, GitFork, ArrowRight, Shield, Activity } from 'lucide-react';

export const Home: React.FC = () => {
  const { user, loading } = useAuth();
  const [slugInput, setSlugInput] = useState('');
  const navigate = useNavigate();

  // If user is authenticated, redirect straight to the Dashboard
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] font-sans">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Checking session...
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (slugInput.trim()) {
      const cleanSlug = slugInput.trim().replace(/^.*\/c\//, '');
      navigate(`/c/${cleanSlug}`);
    }
  };

  return (
    <div className="space-y-10 py-6 max-w-5xl mx-auto px-4 font-sans">
      {/* Pitch-Grounded Hero Section */}
      <section className="text-center space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-700/50 text-emerald-400 font-mono text-[11px] font-semibold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Automated Tournament &amp; League Platform
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
          Automated League Standings &amp; Tournament Draw Sheets
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Log match scores. Round-robin standings tables, knockout bracket advancements, BYE seeding math, and complete goal statistics recalculate automatically.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Link
            to="/register?redirect=/competitions/new"
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition-colors shadow-sm flex items-center justify-center"
          >
            Create Competition
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            Coordinator Sign In
          </Link>
        </div>

        {/* Quick Public Link Lookup */}
        <div className="pt-3 max-w-md mx-auto">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs focus-within:border-emerald-600 transition-colors">
            <Search className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
            <input
              type="text"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              placeholder="Enter public competition slug (e.g. amrita-cup)"
              className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold rounded text-xs hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-1"
            >
              Open Link
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
        </div>
      </section>

      {/* Product Feature Showcase (League Table & Knockout Previews) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
        {/* Real League Table Preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Round-Robin League Standings
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Automated Table &amp; Stats
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Instant standings recalculation for Points, Goal Difference, and Goals For — plus shareable public read-only links for players and spectators.
            </p>
          </div>

          {/* Mini Table Mock */}
          <div className="overflow-hidden border border-slate-200 rounded-lg bg-slate-50">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900 text-slate-200 text-[10px] font-mono uppercase">
                <tr>
                  <th className="py-2 px-2.5 text-center">#</th>
                  <th className="py-2 px-2.5">Club</th>
                  <th className="py-2 px-1.5 text-center">P</th>
                  <th className="py-2 px-1.5 text-center">W</th>
                  <th className="py-2 px-1.5 text-center">D</th>
                  <th className="py-2 px-1.5 text-center">L</th>
                  <th className="py-2 px-1.5 text-center">GD</th>
                  <th className="py-2 px-2 text-center font-bold text-emerald-400">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px]">
                <tr className="bg-emerald-50/50">
                  <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700">1</td>
                  <td className="py-1.5 px-2.5 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    Arsenal FC
                  </td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">5</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">4</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">1</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">0</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600 font-semibold">+9</td>
                  <td className="py-1.5 px-2 text-center font-bold text-emerald-700">13</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700">2</td>
                  <td className="py-1.5 px-2.5 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    Real Madrid
                  </td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">5</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">3</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">2</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">0</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600 font-semibold">+6</td>
                  <td className="py-1.5 px-2 text-center font-bold text-emerald-700">11</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-400">3</td>
                  <td className="py-1.5 px-2.5 font-sans font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    Bayern Munich
                  </td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">5</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">2</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">1</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">2</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600 font-semibold">+2</td>
                  <td className="py-1.5 px-2 text-center font-bold text-slate-900">7</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-400">4</td>
                  <td className="py-1.5 px-2.5 font-sans font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    Inter Milan
                  </td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">5</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">1</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">0</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600">4</td>
                  <td className="py-1.5 px-1.5 text-center text-slate-600 font-semibold">-5</td>
                  <td className="py-1.5 px-2 text-center font-bold text-slate-900">3</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-[10px] font-mono text-slate-500 text-center flex items-center justify-center gap-1.5 pt-1">
            <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Live goal statistics &amp; shareable public view link
          </div>
        </div>

        {/* Real Knockout Bracket Preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitFork className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Single-Elimination Knockout Draw
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Automatic Advancement
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Tournament brackets with automatic BYE seeding for any team count (e.g. 6, 10, 14 teams).
            </p>
          </div>

          {/* Mini Bracket Mock */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Semi Final 1 */}
              <div className="bg-white border border-slate-200 rounded p-2 space-y-1 shadow-2xs">
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Semifinal</div>
                <div className="flex justify-between items-center text-slate-900 font-bold">
                  <span>Real Madrid</span>
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px]">3</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-medium">
                  <span>Man City</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono text-[10px]">1</span>
                </div>
              </div>

              {/* Grand Final */}
              <div className="bg-emerald-900 text-white border border-emerald-700 rounded p-2 space-y-1 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase">Final</span>
                  <Trophy className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="flex justify-between items-center font-bold text-emerald-100">
                  <span>Real Madrid</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500 text-emerald-950 rounded font-mono text-[10px] font-black">2</span>
                </div>
                <div className="flex justify-between items-center text-emerald-300/70 font-medium">
                  <span>Bayern Munich</span>
                  <span className="px-1.5 py-0.5 bg-emerald-800 text-emerald-200 rounded font-mono text-[10px]">1</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 text-center flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Winners advance automatically to the next round as scores are saved
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};


