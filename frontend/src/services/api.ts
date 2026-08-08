import axios from 'axios';
import type { Permission } from '../lib/permissions';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  name: string;
}

export type PlayerPlatform = 'PS5' | 'XBOX' | 'STEAM' | 'MOBILE' | 'OTHER';

export interface Player {
  id: string;
  teamId: string;
  name: string;
  gamerTag: string | null;
  platform: PlayerPlatform | null;
  jerseyNumber: number | null;
  position: string | null;
  preferredClub: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  colorPrimary: string | null;
  coachName: string | null;
  notes: string | null;
  captainId: string | null;
  captain?: Player | null;
  competitionId: string;
  groupId?: string | null;
  players?: Player[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchGame {
  id: string;
  matchId: string;
  gameNumber: number;
  homeScore: number;
  awayScore: number;
  homePenalties: number | null;
  awayPenalties: number | null;
}

export interface MatchGameInput {
  gameNumber: number;
  homeScore: number;
  awayScore: number;
  homePenalties?: number | null;
  awayPenalties?: number | null;
}

export interface MatchScreenshot {
  id: string;
  matchId: string;
  gameNumber: number | null;
  url: string;
  createdAt: string;
}

export interface Match {
  id: string;
  competitionId: string;
  round: number;
  matchNumber: number;
  stage: 'KNOCKOUT' | 'LEAGUE' | 'GROUP';
  groupId?: string | null;
  group?: { id: string; name: string } | null;
  homeTeamId: string | null;
  homeTeam: Team | null;
  awayTeamId: string | null;
  awayTeam: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  homeGamesWon?: number | null;
  awayGamesWon?: number | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED' | 'WALKOVER';
  statusNote?: string | null;
  winnerId: string | null;
  winner: Team | null;
  nextMatchId: string | null;
  nextMatchSlot: 'HOME' | 'AWAY' | null;
  scheduledAt?: string | null;
  notes?: string | null;
  games?: MatchGame[];
  screenshots?: MatchScreenshot[];
  goals?: MatchGoal[];
  appearances?: MatchAppearance[];
  competition?: { id: string; name: string; slug: string; format: 'BO1' | 'BO3'; type: string };
  viewerPermissions?: Permission[];
}

export interface MatchGoal {
  id: string;
  matchId: string;
  playerId: string;
  teamId: string;
  gameNumber: number | null;
  isOwnGoal: boolean;
  minute: number | null;
  player?: Player & { team?: { id: string; name: string; colorPrimary: string | null } };
}

export interface MatchAppearance {
  id: string;
  matchId: string;
  playerId: string;
  teamId: string;
  player?: Player & { team?: { id: string; name: string } };
}

export interface MatchGoalInput {
  playerId: string;
  gameNumber?: number;
  isOwnGoal?: boolean;
  minute?: number;
}

export interface MatchAppearanceInput {
  playerId: string;
}

export interface UpdateScorePayload {
  homeScore: number | null;
  awayScore: number | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  games?: MatchGameInput[];
  goals?: MatchGoalInput[];
  appearances?: MatchAppearanceInput[];
}

export interface AppNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  matchId: string | null;
  readAt: string | null;
  createdAt: string;
  competition: { id: string; name: string; slug: string };
}

export interface Competition {
  id: string;
  slug: string;
  name: string;
  type: 'TOURNAMENT' | 'LEAGUE' | 'GROUP_STAGE' | 'GROUP_KNOCKOUT';
  format: 'BO1' | 'BO3';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  ownerId: string;
  owner?: { id: string; name: string; email: string };
  /** @deprecated use owner */
  coordinatorId?: string;
  coordinator?: { id: string; name: string; email: string };
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  groupCount?: number | null;
  advancementPerGroup?: number;
  viewerPermissions?: Permission[];
  followerCount?: number;
  isFollowing?: boolean;
  teams?: Team[];
  matches?: Match[];
  _count?: { teams: number; matches: number };
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionMember {
  id: string;
  competitionId: string;
  userId: string;
  role: 'OWNER' | 'COORDINATOR';
  permissions: Permission[];
  user: { id: string; email: string; name: string };
  invitedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface StandingRow {
  teamId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TournamentGroup {
  id: string;
  name: string;
  sortOrder: number;
  standings?: StandingRow[];
}

export interface GroupStandingsData {
  advancementPerGroup: number;
  groups: TournamentGroup[];
}

export interface Announcement {
  id: string;
  competitionId: string;
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: string;
  authorId: string;
  author?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionStats {
  totalMatches: number;
  completedMatches: number;
  totalGoals: number;
  champion: string | null;
  runnerUp: string | null;
  topOffense: StandingRow | null;
  topDefense: StandingRow | null;
  mostWins: StandingRow | null;
  mostLosses: StandingRow | null;
  bestGD: StandingRow | null;
  worstGD: StandingRow | null;
  highestScoringMatch: {
    matchId: string;
    round: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    totalGoals: number;
  } | null;
  allTeamStats?: StandingRow[];
  topScorer?: (PlayerStatsRow & { isShared: boolean }) | null;
  allPlayerStats?: PlayerStatsRow[];
  awards?: CompetitionAward[];
}

export interface PlayerStatsRow {
  playerId: string;
  name: string;
  gamerTag: string | null;
  jerseyNumber: number | null;
  teamId: string;
  teamName: string;
  colorPrimary: string | null;
  goals: number;
  ownGoals: number;
  appearances: number;
  goalsPerGame: number;
}

export type AwardType = 'MVP' | 'BEST_GOALKEEPER' | 'FAIR_PLAY' | 'CUSTOM';

export interface CompetitionAward {
  id: string;
  competitionId: string;
  playerId: string;
  awardType: AwardType;
  label: string | null;
  notes: string | null;
  assignedById: string;
  assignedAt: string;
  player?: Player & { team?: { id: string; name: string; colorPrimary: string | null } };
  assignedBy?: { id: string; name: string };
}

/** Normalize API owner/coordinator fields for display */
export const getCompetitionManager = (competition: Competition) =>
  competition.owner ?? competition.coordinator;

export const matchApi = {
  getById: (matchId: string) => api.get<Match>(`/matches/${matchId}`),
  getGroups: (competitionId: string) =>
    api.get<GroupStandingsData>(`/matches/competition/${competitionId}/groups`),
  generateKnockout: (competitionId: string) =>
    api.post(`/matches/competition/${competitionId}/generate-knockout`),
  updateScore: (matchId: string, payload: UpdateScorePayload) =>
    api.patch(`/matches/${matchId}/score`, payload),
  updateStatus: (
    matchId: string,
    body: { status: string; statusNote?: string; winnerTeamId?: string }
  ) => api.patch(`/matches/${matchId}/status`, body),
  updateDetails: (matchId: string, body: { scheduledAt?: string | null; notes?: string | null }) =>
    api.patch(`/matches/${matchId}`, body),
  uploadScreenshot: (matchId: string, file: File, gameNumber?: number) => {
    const form = new FormData();
    form.append('image', file);
    if (gameNumber !== undefined) form.append('gameNumber', String(gameNumber));
    return api.post<MatchScreenshot>(`/matches/${matchId}/screenshots`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteScreenshot: (matchId: string, screenshotId: string) =>
    api.delete(`/matches/${matchId}/screenshots/${screenshotId}`),
};

export const announcementApi = {
  list: (competitionId: string) =>
    api.get<Announcement[]>(`/competitions/${competitionId}/announcements`),
  listPublic: (slug: string) =>
    api.get<Announcement[]>(`/competitions/public/${slug}/announcements`),
  create: (competitionId: string, body: { title: string; body: string; pinned?: boolean }) =>
    api.post<Announcement>(`/competitions/${competitionId}/announcements`, body),
  update: (
    competitionId: string,
    announcementId: string,
    body: { title?: string; body?: string; pinned?: boolean }
  ) => api.patch<Announcement>(`/competitions/${competitionId}/announcements/${announcementId}`, body),
  delete: (competitionId: string, announcementId: string) =>
    api.delete(`/competitions/${competitionId}/announcements/${announcementId}`),
};

export const awardApi = {
  list: (competitionId: string) =>
    api.get<CompetitionAward[]>(`/competitions/${competitionId}/awards`),
  listPublic: (slug: string) =>
    api.get<CompetitionAward[]>(`/competitions/public/${slug}/awards`),
  create: (competitionId: string, body: {
    playerId: string;
    awardType: AwardType;
    label?: string | null;
    notes?: string | null;
  }) => api.post<CompetitionAward>(`/competitions/${competitionId}/awards`, body),
  update: (
    competitionId: string,
    awardId: string,
    body: { playerId?: string; label?: string | null; notes?: string | null }
  ) => api.patch<CompetitionAward>(`/competitions/${competitionId}/awards/${awardId}`, body),
  delete: (competitionId: string, awardId: string) =>
    api.delete(`/competitions/${competitionId}/awards/${awardId}`),
};

export const notificationApi = {
  list: (params?: { limit?: number; cursor?: string }) =>
    api.get<{ items: AppNotification[]; nextCursor: string | null }>('/notifications', {
      params,
    }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (ids?: string[]) => api.post('/notifications/read', { ids }),
  follow: (competitionId: string) => api.post(`/competitions/${competitionId}/follow`),
  unfollow: (competitionId: string) => api.delete(`/competitions/${competitionId}/follow`),
  followedCompetitions: () => api.get<Competition[]>('/notifications/followed-competitions'),
};
