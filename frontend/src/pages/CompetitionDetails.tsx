import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Competition, StandingRow, CompetitionStats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BracketView } from '../components/BracketView';
import { LeagueTable } from '../components/LeagueTable';
import { StatsCards } from '../components/StatsCards';
import { MatchList } from '../components/MatchList';
import { KitBadge } from '../components/KitBadge';
import { ChampionModal } from '../components/ChampionModal';

export const CompetitionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [stats, setStats] = useState<CompetitionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChampionModal, setShowChampionModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'TEAMS' | 'MATCHES' | 'TABLE' | 'STATS'>('TEAMS');
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamError, setTeamError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCoordinator = Boolean(user && competition && user.id === competition.coordinatorId);

  const reloadData = async () => {
    if (!id) return;
    try {
      const compRes = await api.get(`/competitions/${id}`);
      setCompetition(compRes.data);

      if (compRes.data.type === 'LEAGUE') {
        const stdRes = await api.get(`/matches/competition/${id}/standings`);
        setStandings(stdRes.data);
      }

      const statsRes = await api.get(`/matches/competition/${id}/stats`);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, [id]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim() || !id) return;
    setTeamError('');

    try {
      await api.post(`/teams/competition/${id}`, { name: teamNameInput.trim() });
      setTeamNameInput('');
      await reloadData();
    } catch (err: any) {
      setTeamError(err.response?.data?.error || 'Failed to add team.');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await api.delete(`/teams/${teamId}`);
      await reloadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete team.');
    }
  };

  const handleGenerate = async () => {
    if (!id) return;
    if (!window.confirm('Generate fixtures now? Existing scores will be reset.')) {
      return;
    }
    setGenerating(true);
    try {
      await api.post(`/matches/competition/${id}/generate`);
      await reloadData();
      setActiveTab('MATCHES');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate matches.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateScore = async (matchId: string, homeScore: number | null, awayScore: number | null) => {
    try {
      const res = await api.patch(`/matches/${matchId}/score`, { homeScore, awayScore });
      await reloadData();
      
      // Auto-popup celebration when score update completes competition
      const updatedStats = res.data?.stats;
      const compStatus = res.data?.competitionStatus;
      if (updatedStats?.champion || compStatus === 'COMPLETED') {
        setShowChampionModal(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update score.');
    }
  };

  const copyShareLink = () => {
    if (!competition) return;
    const url = `${window.location.origin}/c/${competition.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-xs font-mono">Loading workspace...</div>;
  }

  if (!competition) {
    return (
      <div className="text-center py-12 space-y-3 font-sans">
        <h2 className="text-lg font-bold text-slate-900">Competition Not Found</h2>
        <Link to="/dashboard" className="text-slate-900 font-bold hover:underline text-xs">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const runnerUp = standings.length >= 2 ? standings[1].name : null;

  return (
    <div className="space-y-5 font-sans">
      {/* Champion Celebration Modal */}
      <ChampionModal
        isOpen={showChampionModal}
        onClose={() => setShowChampionModal(false)}
        championName={stats?.champion || 'Champion'}
        competitionName={competition.name}
        competitionType={competition.type}
        runnerUpName={runnerUp}
      />

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="font-bold uppercase px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded">
                {competition.type} • {competition.format}
              </span>
              <span
                className={`font-semibold uppercase px-1.5 py-0.5 rounded ${
                  competition.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : competition.status === 'IN_PROGRESS'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {competition.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{competition.name}</h1>
            <p className="text-xs text-slate-500 font-mono">
              Coordinator: <strong className="text-slate-800">{competition.coordinator?.name}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {stats?.champion && (
              <button
                onClick={() => setShowChampionModal(true)}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold rounded text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                🏆 Champion: {stats.champion}
              </button>
            )}
            <button
              onClick={copyShareLink}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition-colors cursor-pointer"
            >
              {copied ? 'Copied Public URL' : 'Copy Share Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-0 overflow-x-auto">
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
      </div>

      {/* Tab Contents */}
      <div className="space-y-5">
        {/* TEAMS TAB */}
        {activeTab === 'TEAMS' && (
          <div className="space-y-4">
            {isCoordinator && competition.status === 'DRAFT' && (
              <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-2 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase">Add Team</h3>
                {teamError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
                    {teamError}
                  </div>
                )}
                <form onSubmit={handleAddTeam} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    placeholder="Team Name (e.g. Arsenal)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-slate-900 text-white font-bold rounded text-xs hover:bg-slate-800 transition-colors"
                  >
                    + Add Team
                  </button>
                </form>
              </div>
            )}

            {/* Registered Teams Grid */}
            <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase">Team Roster</h3>
                {isCoordinator && (competition.teams?.length || 0) >= 2 && (
                  <button
                    disabled={generating}
                    onClick={handleGenerate}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
                  >
                    {generating
                      ? 'Generating...'
                      : competition.type === 'TOURNAMENT'
                      ? 'Generate Draw Sheet'
                      : 'Generate Fixtures'}
                  </button>
                )}
              </div>

              {!competition.teams || competition.teams.length === 0 ? (
                <p className="text-slate-500 text-xs py-4 text-center">No teams registered. Add at least 2 teams.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {competition.teams.map((team) => (
                    <div
                      key={team.id}
                      className="bg-slate-50 border border-slate-200 p-2.5 rounded flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <KitBadge name={team.name} size="sm" />
                        <span className="font-bold text-slate-900 text-xs truncate">{team.name}</span>
                      </div>

                      {isCoordinator && competition.status === 'DRAFT' && (
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="text-xs text-rose-600 font-bold hover:text-rose-800"
                          title="Remove Team"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MATCHES / BRACKET TAB */}
        {activeTab === 'MATCHES' && (
          <div className="space-y-4">
            {competition.status === 'DRAFT' ? (
              <div className="bg-white border border-slate-200 p-8 rounded-lg text-center space-y-2 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">Fixtures Not Yet Generated</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isCoordinator
                    ? 'Register teams in the Teams tab first, then click Generate.'
                    : 'The coordinator has not generated fixtures yet.'}
                </p>
              </div>
            ) : competition.type === 'TOURNAMENT' ? (
              <BracketView
                matches={competition.matches || []}
                isCoordinator={isCoordinator}
                onUpdateScore={handleUpdateScore}
              />
            ) : (
              <MatchList
                matches={competition.matches || []}
                isCoordinator={isCoordinator}
                onUpdateScore={handleUpdateScore}
              />
            )}
          </div>
        )}

        {/* STANDINGS TABLE TAB */}
        {activeTab === 'TABLE' && competition.type === 'LEAGUE' && (
          <LeagueTable standings={standings} championName={stats?.champion} />
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'STATS' && <StatsCards stats={stats} />}
      </div>
    </div>
  );
};
