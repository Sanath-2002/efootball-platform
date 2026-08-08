import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, matchApi, getCompetitionManager, announcementApi } from '../services/api';
import type { Competition, StandingRow, CompetitionStats, GroupStandingsData, Announcement, Match } from '../services/api';
import { AnnouncementFeed } from '../components/AnnouncementFeed';
import { ShareGraphicModal, ShareButton } from '../components/ShareGraphicModal';
import { MatchResultCard } from '../components/share/MatchResultCard';
import { StandingsCard } from '../components/share/StandingsCard';
import { BracketCard } from '../components/share/BracketCard';
import { FixturesCard } from '../components/share/FixturesCard';
import { TopScorersCard } from '../components/share/TopScorersCard';
import { BracketView } from '../components/BracketView';
import { LeagueTable } from '../components/LeagueTable';
import { StatsCards } from '../components/StatsCards';
import { PlayerStatsCards } from '../components/PlayerStatsCards';
import { AwardsPanel } from '../components/AwardsPanel';
import { MatchList } from '../components/MatchList';
import { GroupStandingsView } from '../components/GroupStandingsView';
import { KitBadge } from '../components/KitBadge';
import { FollowButton } from '../components/FollowButton';
import { FollowerCount } from '../components/FollowerCount';
import { ChampionModal } from '../components/ChampionModal';

const isGroupFormat = (type: string) => type === 'GROUP_STAGE' || type === 'GROUP_KNOCKOUT';

export const PublicView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [groupStandings, setGroupStandings] = useState<GroupStandingsData | null>(null);
  const [stats, setStats] = useState<CompetitionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showChampionModal, setShowChampionModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareKind, setShareKind] = useState<
    'fixtures' | 'standings' | 'bracket' | 'match' | 'scorers'
  >('fixtures');
  const [shareMatch, setShareMatch] = useState<Match | null>(null);

  const [activeTab, setActiveTab] = useState<'MATCHES' | 'TABLE' | 'GROUPS' | 'STATS' | 'TEAMS'>('MATCHES');
  const [statsSubTab, setStatsSubTab] = useState<'teams' | 'players'>('teams');

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!slug) return;
      setLoading(true);
      setErrorMsg('');

      try {
        const res = await api.get(`/competitions/public/${slug}`);
        const comp = res.data;
        setCompetition(comp);

        if (comp && comp.id) {
          if (comp.type === 'LEAGUE') {
            try {
              const stdRes = await api.get(`/matches/competition/${comp.id}/standings`);
              setStandings(stdRes.data || []);
            } catch (err) {
              console.error('Failed to load standings:', err);
            }
          }

          if (isGroupFormat(comp.type)) {
            try {
              const grpRes = await matchApi.getGroups(comp.id);
              setGroupStandings(grpRes.data);
            } catch (err) {
              console.error('Failed to load group standings:', err);
            }
          }

          try {
            const statsRes = await api.get(`/matches/competition/${comp.id}/stats`);
            setStats(statsRes.data || null);
          } catch (err) {
            console.error('Failed to load stats:', err);
          }

          try {
            const annRes = await announcementApi.listPublic(slug);
            setAnnouncements(annRes.data || []);
          } catch (err) {
            console.error('Failed to load announcements:', err);
          }
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        console.error('Failed to load public competition view:', err);
        setErrorMsg(e.response?.data?.error || 'Unable to load public competition.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [slug]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-xs font-mono">Loading competition sheet...</div>;
  }

  if (errorMsg || !competition) {
    return (
      <div className="text-center py-12 space-y-3 font-sans">
        <h2 className="text-lg font-bold text-slate-900">Competition Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {errorMsg || 'The requested competition link is invalid or unavailable.'}
        </p>
        <Link to="/" className="text-slate-900 font-bold hover:underline text-xs inline-block pt-1">
          Return to Main Page
        </Link>
      </div>
    );
  }

  const statusText = competition.status ? competition.status.replace('_', ' ') : 'DRAFT';
  const runnerUp = standings.length >= 2 ? standings[1].name : null;
  const groupMatches = (competition.matches || []).filter((m) => m.stage === 'GROUP');
  const knockoutMatches = (competition.matches || []).filter((m) => m.stage === 'KNOCKOUT');
  const hasKnockout = knockoutMatches.length > 0;
  const publicUrl = `${window.location.origin}/c/${competition.slug}`;

  const openShare = (kind: typeof shareKind, match?: Match) => {
    setShareKind(kind);
    setShareMatch(match ?? null);
    setShareOpen(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 py-4 font-sans">
      <ChampionModal
        isOpen={showChampionModal}
        onClose={() => setShowChampionModal(false)}
        championName={stats?.champion || 'Champion'}
        competitionName={competition.name}
        competitionType={competition.type}
        runnerUpName={runnerUp}
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
          <BracketCard competitionName={competition.name} matches={competition.matches || []} publicUrl={publicUrl} />
        )}
        {shareKind === 'fixtures' && (
          <FixturesCard competitionName={competition.name} matches={competition.matches || []} publicUrl={publicUrl} />
        )}
        {shareKind === 'scorers' && (
          <TopScorersCard
            competitionName={competition.name}
            players={stats?.allPlayerStats ?? []}
            publicUrl={publicUrl}
          />
        )}
      </ShareGraphicModal>

      {announcements.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase">Announcements</h2>
          <AnnouncementFeed announcements={announcements} />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="font-bold uppercase px-1.5 py-0.5 bg-slate-900 text-white rounded">
            Public View
          </span>
          <span className="font-bold uppercase text-slate-700">
            {competition.type.replace('_', ' ')} • {competition.format || 'BO1'} • {statusText}
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{competition.name}</h1>
          <p className="text-xs text-slate-500 font-mono">
            Manager: <strong className="text-slate-800">{getCompetitionManager(competition)?.name || 'Admin'}</strong>
          </p>
          <FollowerCount count={competition.followerCount ?? 0} className="mt-1" />
        </div>

        {stats?.champion && (
          <button
            onClick={() => setShowChampionModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded text-xs font-extrabold font-mono shadow-xs transition-colors cursor-pointer"
          >
            🏆 Champion: {stats.champion} (Click to Celebrate)
          </button>
        )}

        <FollowButton
          competition={competition}
          onChange={(isFollowing, followerCount) =>
            setCompetition((c) => (c ? { ...c, isFollowing, followerCount } : c))
          }
          className="pt-2"
        />
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 pb-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('MATCHES')}
          className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
            activeTab === 'MATCHES'
              ? 'bg-white text-slate-900 border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          {competition.type === 'TOURNAMENT' || (competition.type === 'GROUP_KNOCKOUT' && hasKnockout)
            ? 'Draw Sheet'
            : 'Fixtures'}
        </button>

        {competition.type === 'LEAGUE' && (
          <button
            onClick={() => setActiveTab('TABLE')}
            className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
              activeTab === 'TABLE'
                ? 'bg-white text-slate-900 border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Standings
          </button>
        )}

        {isGroupFormat(competition.type) && (
          <button
            onClick={() => setActiveTab('GROUPS')}
            className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
              activeTab === 'GROUPS'
                ? 'bg-white text-slate-900 border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Groups
          </button>
        )}

        <button
          onClick={() => setActiveTab('STATS')}
          className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
            activeTab === 'STATS'
              ? 'bg-white text-slate-900 border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          Statistics
        </button>

        <button
          onClick={() => setActiveTab('TEAMS')}
          className={`px-3 py-2 font-bold text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
            activeTab === 'TEAMS'
              ? 'bg-white text-slate-900 border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          Teams ({competition.teams?.length || 0})
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'MATCHES' && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <ShareButton onClick={() => openShare('fixtures')} />
              {(competition.type === 'TOURNAMENT' ||
                (competition.type === 'GROUP_KNOCKOUT' && hasKnockout)) && (
                <ShareButton onClick={() => openShare('bracket')} />
              )}
            </div>
            {competition.type === 'TOURNAMENT' ||
            (competition.type === 'GROUP_KNOCKOUT' && hasKnockout) ? (
              <BracketView
                matches={hasKnockout ? knockoutMatches : competition.matches || []}
                format={competition.format}
                canUpdateScores={false}
              />
            ) : (
              <MatchList
                matches={
                  isGroupFormat(competition.type) && groupMatches.length
                    ? groupMatches
                    : competition.matches || []
                }
                format={competition.format}
                canUpdateScores={false}
                showGroupFilter={isGroupFormat(competition.type)}
                sortBySchedule
                onShareMatch={(m) => openShare('match', m)}
              />
            )}

            {competition.type === 'GROUP_KNOCKOUT' && hasKnockout && groupMatches.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase">Group Stage</h3>
                <MatchList
                  matches={groupMatches}
                  format={competition.format}
                  canUpdateScores={false}
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
                  onUpdated={() => {}}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'TEAMS' && (
          <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Teams &amp; Player Rosters</h3>
            {(!competition.teams || competition.teams.length === 0) ? (
              <p className="text-xs text-slate-500 py-4 text-center">No teams registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {competition.teams.map((t) => (
                  <div key={t.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                    <div className="flex items-center gap-2.5">
                      <KitBadge name={t.name} shortName={t.shortName} colorPrimary={t.colorPrimary} logoUrl={t.logoUrl} size="sm" />
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">{t.name}</span>
                        {t.coachName && <span className="text-[10px] text-slate-500">Coach: {t.coachName}</span>}
                      </div>
                    </div>
                    {t.players && t.players.length > 0 ? (
                      <ul className="space-y-1 pl-1">
                        {t.players.map((p) => (
                          <li key={p.id} className="text-[11px] text-slate-700 flex items-center gap-2">
                            <span className="font-mono text-slate-400 w-6">{p.jerseyNumber ?? '—'}</span>
                            <span className="font-semibold">{p.name}</span>
                            {p.gamerTag && <span className="text-slate-500 font-mono">@{p.gamerTag}</span>}
                            {p.platform && <span className="text-[10px] bg-slate-200 px-1 rounded">{p.platform}</span>}
                            {t.captainId === p.id && <span className="text-amber-600 font-bold text-[10px]">C</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No players listed</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
