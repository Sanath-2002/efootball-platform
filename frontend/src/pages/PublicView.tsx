import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Competition, StandingRow, CompetitionStats } from '../services/api';
import { BracketView } from '../components/BracketView';
import { LeagueTable } from '../components/LeagueTable';
import { StatsCards } from '../components/StatsCards';
import { MatchList } from '../components/MatchList';
import { KitBadge } from '../components/KitBadge';

export const PublicView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [stats, setStats] = useState<CompetitionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'MATCHES' | 'TABLE' | 'STATS' | 'TEAMS'>('MATCHES');

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!slug) return;
      try {
        const res = await api.get(`/competitions/public/${slug}`);
        setCompetition(res.data);

        const compId = res.data.id;
        if (res.data.type === 'LEAGUE') {
          const stdRes = await api.get(`/matches/competition/${compId}/standings`);
          setStandings(stdRes.data);
        }

        const statsRes = await api.get(`/matches/competition/${compId}/stats`);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load public competition view:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [slug]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-xs font-mono">Loading competition sheet...</div>;
  }

  if (!competition) {
    return (
      <div className="text-center py-12 space-y-2 font-sans">
        <h2 className="text-lg font-bold text-slate-900">Competition Not Found</h2>
        <p className="text-xs text-slate-500">The competition link is invalid or unavailable.</p>
        <Link to="/" className="text-slate-900 font-bold hover:underline text-xs inline-block pt-1">
          Return to Main Page
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 py-4 font-sans">
      {/* Public Banner Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="font-bold uppercase px-1.5 py-0.5 bg-slate-900 text-white rounded">
            Public View
          </span>
          <span className="font-bold uppercase text-slate-700">
            {competition.type} • {competition.format} • {competition.status.replace('_', ' ')}
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{competition.name}</h1>
          <p className="text-xs text-slate-500 font-mono">
            Coordinator: <strong className="text-slate-800">{competition.coordinator?.name}</strong>
          </p>
        </div>

        {stats?.champion && (
          <div className="inline-block px-2.5 py-1 bg-emerald-800 text-white rounded text-xs font-bold font-mono">
            🏆 Champion: {stats.champion}
          </div>
        )}
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('MATCHES')}
          className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors ${
            activeTab === 'MATCHES'
              ? 'bg-white text-slate-900 border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          {competition.type === 'TOURNAMENT' ? 'Draw Sheet' : 'Fixtures'}
        </button>

        {competition.type === 'LEAGUE' && (
          <button
            onClick={() => setActiveTab('TABLE')}
            className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors ${
              activeTab === 'TABLE'
                ? 'bg-white text-slate-900 border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Standings
          </button>
        )}

        <button
          onClick={() => setActiveTab('STATS')}
          className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors ${
            activeTab === 'STATS'
              ? 'bg-white text-slate-900 border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          Statistics
        </button>

        <button
          onClick={() => setActiveTab('TEAMS')}
          className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors ${
            activeTab === 'TEAMS'
              ? 'bg-white text-slate-900 border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          Teams ({competition.teams?.length || 0})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-4">
        {activeTab === 'MATCHES' && (
          <div>
            {competition.type === 'TOURNAMENT' ? (
              <BracketView matches={competition.matches || []} isCoordinator={false} />
            ) : (
              <MatchList matches={competition.matches || []} isCoordinator={false} />
            )}
          </div>
        )}

        {activeTab === 'TABLE' && competition.type === 'LEAGUE' && (
          <LeagueTable standings={standings} championName={stats?.champion} />
        )}

        {activeTab === 'STATS' && <StatsCards stats={stats} />}

        {activeTab === 'TEAMS' && (
          <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Teams Roster</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {competition.teams?.map((t) => (
                <div key={t.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded flex items-center gap-2.5">
                  <KitBadge name={t.name} size="sm" />
                  <span className="font-bold text-slate-800 text-xs truncate">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
