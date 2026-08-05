import axios from 'axios';

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

// Interface definitions
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  competitionId: string;
  createdAt: string;
}

export interface Match {
  id: string;
  competitionId: string;
  round: number;
  matchNumber: number;
  stage: 'KNOCKOUT' | 'LEAGUE';
  homeTeamId: string | null;
  homeTeam: Team | null;
  awayTeamId: string | null;
  awayTeam: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'COMPLETED';
  winnerId: string | null;
  winner: Team | null;
  nextMatchId: string | null;
  nextMatchSlot: 'HOME' | 'AWAY' | null;
}

export interface Competition {
  id: string;
  slug: string;
  name: string;
  type: 'TOURNAMENT' | 'LEAGUE';
  format: 'BO1' | 'BO3';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  coordinatorId: string;
  coordinator?: { id: string; name: string; email: string };
  teams?: Team[];
  matches?: Match[];
  _count?: { teams: number; matches: number };
  createdAt: string;
  updatedAt: string;
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
}
