import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchApi, api, getCompetitionManager, announcementApi } from '../services/api';
import type {
  Competition,
  StandingRow,
  CompetitionStats,
  UpdateScorePayload,
  GroupStandingsData,
  TournamentGroup,
  Announcement,
  Match,
} from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../lib/permissions';
import { BracketView } from '../components/BracketView';
import { LeagueTable } from '../components/LeagueTable';
import { StatsCards } from '../components/StatsCards';
import { PlayerStatsCards } from '../components/PlayerStatsCards';
import { AwardsPanel } from '../components/AwardsPanel';
import { MatchList } from '../components/MatchList';
import { ChampionModal } from '../components/ChampionModal';
import { TeamManagement } from '../components/TeamManagement';
import { FollowButton } from '../components/FollowButton';
import { FollowerCount } from '../components/FollowerCount';
import { TournamentSettings } from '../components/TournamentSettings';
import { GroupStandingsView } from '../components/GroupStandingsView';
import { FixtureManager } from '../components/FixtureManager';
import { BulkScheduleModal } from '../components/BulkScheduleModal';
import { AnnouncementFeed } from '../components/AnnouncementFeed';
import { AnnouncementComposer } from '../components/AnnouncementComposer';
import { ExportMenu } from '../components/ExportMenu';
import { ShareGraphicModal, ShareButton } from '../components/ShareGraphicModal';
import { MatchResultCard } from '../components/share/MatchResultCard';
import { StandingsCard } from '../components/share/StandingsCard';
import { BracketCard } from '../components/share/BracketCard';
import { FixturesCard } from '../components/share/FixturesCard';
import { TopScorersCard } from '../components/share/TopScorersCard';

type TabId = 'TEAMS' | 'MATCHES' | 'TABLE' | 'GROUPS' | 'STATS' | 'SETTINGS';

const isGroupFormat = (type: string) => type === 'GROUP_STAGE' || type === 'GROUP_KNOCKOUT';

export const CompetitionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [groupStandings, setGroupStandings] = useState<GroupStandingsData | null>(null);
  const [stats, setStats] = useState<CompetitionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChampionModal, setShowChampionModal] = useState(false);
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareKind, setShareKind] = useState<
    'fixtures' | 'standings' | 'bracket' | 'match' | 'scorers'
  >('fixtures');
  const [shareMatch, setShareMatch] = useState<Match | null>(null);
  const [statsSubTab, setStatsSubTab] = useState<'teams' | 'players'>('teams');

  const [activeTab, setActiveTab] = useState<TabId>('TEAMS');
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamError, setTeamError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingKnockout, setGeneratingKnockout] = useState(false);
  const [copied, setCopied] = useState(false);

  const { can } = usePermissions(competition?.viewerPermissions);
  const canManageTeams = can(PERMISSIONS.TEAMS_MANAGE);
  const canManagePlayers = can(PERMISSIONS.PLAYERS_MANAGE);
  const canUpdateScores = can(PERMISSIONS.SCORES_UPDATE);
  const canManageFixtures = can(PERMISSIONS.FIXTURES_MANAGE);
  const canManageSettings = can(PERMISSIONS.COORDINATORS_MANAGE) || can(PERMISSIONS.TOURNAMENT_EDIT);
  const canPublishAnnouncements = can(PERMISSIONS.ANNOUNCEMENTS_PUBLISH);
  const canViewReports = can(PERMISSIONS.REPORTS_VIEW);
  const canEditTournament = can(PERMISSIONS.TOURNAMENT_EDIT);
  const isDraft = competition?.status === 'DRAFT';

  const reloadData = async () => {
    if (!id) return;
    try {
      const compRes = await api.get(`/competitions/${id}`);
      setCompetition(compRes.data);

      if (compRes.data.type === 'LEAGUE') {
        const stdRes = await api.get(`/matches/competition/${id}/standings`);
        setStandings(stdRes.data);
      }

      if (isGroupFormat(compRes.data.type)) {
        const grpRes = await matchApi.getGroups(id);
        setGroupStandings(grpRes.data);
      }

      const statsRes = await api.get(`/matches/competition/${id}/stats`);
      setStats(statsRes.data);

      try {
        const annRes = await announcementApi.list(id);
        setAnnouncements(annRes.data);
      } catch {
        setAnnouncements([]);
      }
    } catch (err) {
      console.error('Failed to load details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, [id]);

  const groupMatches = useMemo(
    () => (competition?.matches || []).filter((m) => m.stage === 'GROUP'),
    [competition?.matches]
  );
  const knockoutMatches = useMemo(
    () => (competition?.matches || []).filter((m) => m.stage === 'KNOCKOUT'),
    [competition?.matches]
  );
  const groupPhaseComplete =
    groupMatches.length > 0 &&
    groupMatches.every((m) =>
      ['COMPLETED', 'CANCELLED', 'WALKOVER'].includes(m.status)
    );
  const hasKnockout = knockoutMatches.length > 0;

  const tournamentGroups: TournamentGroup[] = useMemo(() => {
    if (groupStandings?.groups) return groupStandings.groups;
    return (competition as Competition & { groups?: TournamentGroup[] })?.groups ?? [];
  }, [groupStandings, competition]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim() || !id) return;
    setTeamError('');

    try {
      await api.post(`/competitions/${id}/teams`, { name: teamNameInput.trim() });
      setTeamNameInput('');
      await reloadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setTeamError(e.response?.data?.error || 'Failed to add team.');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await api.delete(`/teams/${teamId}`);
      await reloadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to delete team.');
    }
  };

  const handleGenerate = async () => {
    if (!id) return;
    if (!window.confirm('Generate fixtures now? Existing group/knockout scores will be reset.')) {
      return;
    }
    setGenerating(true);
    try {
      await api.post(`/matches/competition/${id}/generate`);
      await reloadData();
      setActiveTab('MATCHES');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to generate matches.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateKnockout = async () => {
    if (!id) return;
    if (!window.confirm('Generate knockout bracket from group standings?')) return;
    setGeneratingKnockout(true);
    try {
      await matchApi.generateKnockout(id);
      await reloadData();
      setActiveTab('MATCHES');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to generate knockout.');
    } finally {
      setGeneratingKnockout(false);
    }
  };

  const handleUpdateScore = async (matchId: string, payload: UpdateScorePayload) => {
    try {
      const res = await matchApi.updateScore(matchId, payload);
      await reloadData();

      const updatedStats = res.data?.stats;
      const compStatus = res.data?.competitionStatus;
      if (updatedStats?.champion || compStatus === 'COMPLETED') {
        setShowChampionModal(true);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Failed to update score.');
    }
  };

  const publicUrl = competition ? `${window.location.origin}/c/${competition.slug}` : '';

  const openShare = (kind: typeof shareKind, match?: Match) => {
    setShareKind(kind);
    setShareMatch(match ?? null);
    setShareOpen(true);
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!id || !window.confirm('Delete this announcement?')) return;
    await announcementApi.delete(id, announcementId);
    await reloadData();
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

  const manager = getCompetitionManager(competition);
  const runnerUp = standings.length >= 2 ? standings[1].name : null;
  const generateLabel = isGroupFormat(competition.type)
    ? 'Generate Group Fixtures'
    : competition.type === 'TOURNAMENT'
    ? 'Generate Draw Sheet'
    : 'Generate Fixtures';

  const tabs: TabId[] = [
    'TEAMS',
    'MATCHES',
    ...(competition.type === 'LEAGUE' ? (['TABLE'] as TabId[]) : []),
    ...(isGroupFormat(competition.type) ? (['GROUPS'] as TabId[]) : []),
    'STATS',
    ...(canManageSettings || canPublishAnnouncements ? (['SETTINGS'] as TabId[]) : []),
  ];

  const fixtureMatches =
    competition.type === 'GROUP_KNOCKOUT' && hasKnockout
      ? groupMatches
      : isGroupFormat(competition.type)
      ? groupMatches
      : competition.matches || [];

  return (
    <div className="space-y-5 font-sans">
      <ChampionModal
        isOpen={showChampionModal}
        onClose={() => setShowChampionModal(false)}
        championName={stats?.champion || 'Champion'}
        competitionName={competition.name}
        competitionType={competition.type}
        runnerUpName={runnerUp}
      />

      <BulkScheduleModal
        isOpen={showBulkSchedule}
        onClose={() => setShowBulkSchedule(false)}
        matches={competition.matches || []}
        onScheduled={reloadData}
      />

      <ShareGraphicModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        competitionName={competition.name}
        publicUrl={publicUrl}
      >
        {shareKind === 'match' && shareMatch && (
          <MatchResultCard match={shareMatch} competitionName={competition.name} publicUrl={publicUrl} />
        )}
        {shareKind === 'standings' && (
          <StandingsCard
            competitionName={competition.name}
            title={competition.type === 'LEAGUE' ? 'League Standings' : 'Group Standings'}
            standings={
              competition.type === 'LEAGUE'
                ? standings
                : groupStandings?.groups.flatMap((g) => g.standings ?? []) ?? []
            }
            publicUrl={publicUrl}
          />
        )}
        {shareKind === 'bracket' && (
          <BracketCard
            competitionName={competition.name}
            matches={competition.matches || []}
            publicUrl={publicUrl}
          />
        )}
        {shareKind === 'fixtures' && (
          <FixturesCard
            competitionName={competition.name}
            matches={competition.matches || []}
            publicUrl={publicUrl}
          />
        )}
        {shareKind === 'scorers' && (
          <TopScorersCard
            competitionName={competition.name}
            players={stats?.allPlayerStats ?? []}
            publicUrl={publicUrl}
          />
        )}
      </ShareGraphicModal>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 shadow-xs">
        {competition.bannerUrl && (
          <img src={competition.bannerUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="font-bold uppercase px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded">
                {competition.type.replace('_', ' ')} • {competition.format}
              </span>
              {competition.groupCount && (
                <span className="text-slate-600">{competition.groupCount} groups</span>
              )}
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
            {competition.description && (
              <p className="text-xs text-slate-600 max-w-xl">{competition.description}</p>
            )}
            <p className="text-xs text-slate-500 font-mono">
              Manager: <strong className="text-slate-800">{manager?.name}</strong>
            </p>
            <FollowerCount count={competition.followerCount ?? 0} className="mt-1" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canViewReports && id && (
              <ExportMenu
                competitionId={id}
                matches={(competition.matches ?? []).map((m) => ({
                  id: m.id,
                  round: m.round,
                  matchNumber: m.matchNumber,
                  label: `R${m.round} M${m.matchNumber}: ${m.homeTeam?.name ?? 'TBD'} vs ${m.awayTeam?.name ?? 'TBD'}`,
                }))}
              />
            )}
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
            <FollowButton
              competition={competition}
              onChange={(isFollowing, followerCount) =>
                setCompetition((c) => (c ? { ...c, isFollowing, followerCount } : c))
              }
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 pb-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white text-slate-900 border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            {tab === 'TEAMS' && `Teams (${competition.teams?.length || 0})`}
            {tab === 'MATCHES' &&
              (competition.type === 'TOURNAMENT' || (competition.type === 'GROUP_KNOCKOUT' && hasKnockout)
                ? 'Draw Sheet'
                : 'Fixtures')}
            {tab === 'TABLE' && 'Standings'}
            {tab === 'GROUPS' && 'Groups'}
            {tab === 'STATS' && 'Statistics'}
            {tab === 'SETTINGS' && 'Settings'}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {activeTab === 'TEAMS' && (
          <div className="space-y-4">
            {canManageTeams && isDraft && (
              <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-2 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase">Add Team</h3>
                {teamError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{teamError}</div>
                )}
                <form onSubmit={handleAddTeam} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    placeholder="Team Name (e.g. Arsenal eFC)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none"
                  />
                  <button type="submit" className="px-3.5 py-1.5 bg-slate-900 text-white font-bold rounded text-xs hover:bg-slate-800 transition-colors">
                    + Add Team
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase">Teams &amp; Rosters</h3>
                <div className="flex gap-2">
                  {canManageFixtures &&
                    competition.type === 'GROUP_KNOCKOUT' &&
                    groupPhaseComplete &&
                    !hasKnockout && (
                      <button
                        disabled={generatingKnockout}
                        onClick={handleGenerateKnockout}
                        className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
                      >
                        {generatingKnockout ? 'Generating...' : 'Generate Knockout'}
                      </button>
                    )}
                  {canManageFixtures && (competition.teams?.length || 0) >= 2 && isDraft && (
                    <button
                      disabled={generating}
                      onClick={handleGenerate}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : generateLabel}
                    </button>
                  )}
                </div>
              </div>

              {!competition.teams || competition.teams.length === 0 ? (
                <p className="text-slate-500 text-xs py-4 text-center">No teams registered. Add at least 2 teams.</p>
              ) : (
                <div className="space-y-2">
                  {competition.teams.map((team) => (
                    <div key={team.id} className="relative">
                      <TeamManagement
                        team={team}
                        competitionId={competition.id}
                        canManageTeams={canManageTeams}
                        canManagePlayers={canManagePlayers}
                        isDraft={isDraft}
                        allTeams={competition.teams || []}
                        onUpdated={reloadData}
                      />
                      {canManageTeams && isDraft && (
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="absolute top-3 right-10 text-xs text-rose-600 font-bold hover:text-rose-800 z-10"
                          title="Remove Team"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'MATCHES' && (
          <div className="space-y-4">
            {canManageFixtures && !isDraft && (
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => setShowBulkSchedule(true)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded text-xs hover:bg-slate-200"
                >
                  Bulk Schedule
                </button>
                <ShareButton onClick={() => openShare('fixtures')} />
              </div>
            )}

            {!isDraft &&
              (competition.type === 'TOURNAMENT' ||
                (competition.type === 'GROUP_KNOCKOUT' && hasKnockout)) && (
                <div className="flex justify-end">
                  <ShareButton onClick={() => openShare('bracket')} />
                </div>
              )}

            {canManageFixtures && !isDraft && (
              <FixtureManager
                competitionId={competition.id}
                matches={competition.matches || []}
                teams={competition.teams || []}
                groups={tournamentGroups}
                onUpdated={reloadData}
              />
            )}

            {competition.status === 'DRAFT' ? (
              <div className="bg-white border border-slate-200 p-8 rounded-lg text-center space-y-2 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">Fixtures Not Yet Generated</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {canManageFixtures
                    ? 'Register teams in the Teams tab first, then click Generate.'
                    : 'Fixtures have not been generated yet.'}
                </p>
              </div>
            ) : competition.type === 'TOURNAMENT' ||
              (competition.type === 'GROUP_KNOCKOUT' && hasKnockout) ? (
              <BracketView
                matches={hasKnockout ? knockoutMatches : competition.matches || []}
                format={competition.format}
                canUpdateScores={canUpdateScores}
                onUpdateScore={handleUpdateScore}
              />
            ) : (
              <MatchList
                matches={fixtureMatches.length ? fixtureMatches : competition.matches || []}
                format={competition.format}
                canUpdateScores={canUpdateScores}
                onUpdateScore={handleUpdateScore}
                showGroupFilter={isGroupFormat(competition.type)}
                sortBySchedule
                onShareMatch={(m) => openShare('match', m)}
              />
            )}

            {competition.type === 'GROUP_KNOCKOUT' && hasKnockout && groupMatches.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase">Group Stage Fixtures</h3>
                <MatchList
                  matches={groupMatches}
                  format={competition.format}
                  canUpdateScores={canUpdateScores}
                  onUpdateScore={handleUpdateScore}
                  showGroupFilter
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'TABLE' && competition.type === 'LEAGUE' && (
          <LeagueTable standings={standings} championName={stats?.champion} />
        )}

        {activeTab === 'GROUPS' && groupStandings && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <ShareButton onClick={() => openShare('standings')} />
            </div>
            <GroupStandingsView
              data={groupStandings}
              highlightQualifiers={competition.type === 'GROUP_KNOCKOUT'}
              championName={stats?.champion}
            />
          </div>
        )}

        {activeTab === 'STATS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setStatsSubTab('teams')}
                  className={`px-3 py-1 text-xs font-bold rounded ${
                    statsSubTab === 'teams'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Teams
                </button>
                <button
                  onClick={() => setStatsSubTab('players')}
                  className={`px-3 py-1 text-xs font-bold rounded ${
                    statsSubTab === 'players'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Players
                </button>
              </div>
              {statsSubTab === 'players' && (stats?.allPlayerStats?.length ?? 0) > 0 && (
                <ShareButton onClick={() => openShare('scorers')} />
              )}
            </div>
            {statsSubTab === 'teams' ? (
              <StatsCards stats={stats} />
            ) : (
              <>
                <PlayerStatsCards stats={stats} />
                <AwardsPanel
                  competitionId={competition.id}
                  awards={stats?.awards ?? []}
                  teams={competition.teams ?? []}
                  topScorerName={stats?.topScorer?.name}
                  topScorerGoals={stats?.topScorer?.goals}
                  onUpdated={reloadData}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'SETTINGS' && (canManageSettings || canPublishAnnouncements) && (
          <div className="space-y-4">
            {canPublishAnnouncements && (
              <>
                <AnnouncementComposer
                  competitionId={competition.id}
                  editing={editingAnnouncement}
                  onSaved={reloadData}
                  onCancelEdit={() => setEditingAnnouncement(null)}
                />
                <AnnouncementFeed
                  announcements={announcements}
                  canManage
                  onEdit={setEditingAnnouncement}
                  onDelete={handleDeleteAnnouncement}
                />
              </>
            )}
            {canManageSettings && (
              <TournamentSettings competition={competition} onUpdated={reloadData} />
            )}
            {canEditTournament && (
              <AwardsPanel
                competitionId={competition.id}
                awards={stats?.awards ?? []}
                teams={competition.teams ?? []}
                topScorerName={stats?.topScorer?.name}
                topScorerGoals={stats?.topScorer?.goals}
                canManage
                onUpdated={reloadData}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
