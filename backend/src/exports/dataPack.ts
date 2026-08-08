import { prisma } from '../config/prisma';
import {
  CompetitionStatus,
  CompetitionType,
  MatchStage,
  MatchStatus,
} from '@prisma/client';
import { notFound, badRequest } from '../lib/AppError';
import { isResult } from '../lib/matchStatus';
import {
  calculateLeagueStandings,
  getGroupStandings,
  calculateCompetitionStats,
  calculatePlayerStats,
} from '../services/recalculationService';

export interface TeamView {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  colorPrimary: string | null;
  monogram: string;
}

export interface StandingRowView {
  position: number;
  teamId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  colorPrimary: string | null;
  monogram: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: Array<'W' | 'D' | 'L'>;
  /** Five slots, oldest first, left-padded with null so columns stay aligned. */
  formSlots: Array<'W' | 'D' | 'L' | null>;
  zoneClass: string;
  /** Edge-bar marking used while the competition is in progress. */
  zoneKey: 'champions' | 'europa' | 'conference' | 'relegation' | null;
  /** Solid-fill marking, only once the competition is complete. */
  rowStateClass: string;
  marker: string | null;
  markerKind: 'champion' | 'relegation' | null;
  gdDisplay: string;
  gdClass: 'positive' | 'negative' | 'neutral';
  crestColor: string;
}

export type Density = 'comfortable' | 'default' | 'compact' | 'document';

export interface BoardLayout {
  density: Density;
  colsClass: 'cols-full' | 'cols-standard' | 'cols-compact' | 'cols-stats';
  showWDL: boolean;
  showGoals: boolean;
  showForm: boolean;
}

export interface LegendEntry {
  colorVar: string;
  label: string;
}

/** Column set and row rhythm follow team count, per the design system. */
export const resolveBoardLayout = (teamCount: number, document = false): BoardLayout => {
  if (document) {
    return {
      density: 'document',
      colsClass: 'cols-full',
      showWDL: true,
      showGoals: true,
      showForm: true,
    };
  }
  if (teamCount > 20) {
    return {
      density: 'compact',
      colsClass: 'cols-compact',
      showWDL: false,
      showGoals: false,
      showForm: false,
    };
  }
  return {
    density: teamCount <= 12 ? 'comfortable' : 'default',
    colsClass: 'cols-standard',
    showWDL: true,
    showGoals: false,
    showForm: true,
  };
};

export interface BracketSlotView {
  matchId: string;
  homeName: string;
  awayName: string;
  homeMonogram: string;
  awayMonogram: string;
  homeColor: string | null;
  awayColor: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeWinner: boolean;
  awayWinner: boolean;
  isFinal: boolean;
  completed: boolean;
}

export interface BracketRoundView {
  label: string;
  slots: BracketSlotView[];
}

export interface MatchView {
  id: string;
  round: number;
  matchNumber: number;
  stage: string;
  homeName: string;
  awayName: string;
  homeMonogram: string;
  awayMonogram: string;
  homeColor: string | null;
  awayColor: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerName: string | null;
  status: string;
  scheduledAt: string | null;
  completed: boolean;
}

const monogram = (name: string, shortName?: string | null): string => {
  if (shortName) return shortName.slice(0, 3).toUpperCase();
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
};

const teamView = (t: {
  id: string;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  colorPrimary?: string | null;
}): TeamView => ({
  id: t.id,
  name: t.name,
  shortName: t.shortName ?? null,
  logoUrl: t.logoUrl ?? null,
  colorPrimary: t.colorPrimary ?? null,
  monogram: monogram(t.name, t.shortName),
});

export const computeForm = (
  teamId: string,
  matches: Array<{
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number | null;
    awayScore: number | null;
    status: MatchStatus;
    updatedAt: Date;
  }>
): Array<'W' | 'D' | 'L'> => {
  const resultMatches = matches
    .filter((m) => isResult(m.status) && m.homeTeamId && m.awayTeamId)
    .filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return resultMatches.map((m) => {
    const isHome = m.homeTeamId === teamId;
    const gf = isHome ? m.homeScore! : m.awayScore!;
    const ga = isHome ? m.awayScore! : m.homeScore!;
    if (gf > ga) return 'W';
    if (gf < ga) return 'L';
    return 'D';
  });
};

const formatUpdated = (date: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

export const parseZones = (zones?: string): { top: number; bottom: number } => {
  if (!zones) return { top: 0, bottom: 0 };
  const topMatch = zones.match(/top:(\d+)/);
  const bottomMatch = zones.match(/bottom:(\d+)/);
  return {
    top: topMatch ? parseInt(topMatch[1], 10) : 0,
    bottom: bottomMatch ? parseInt(bottomMatch[1], 10) : 0,
  };
};

export const buildBracketRounds = (
  knockoutMatches: Array<{
    id: string;
    round: number;
    matchNumber: number;
    homeTeam: { name: string; shortName?: string | null; logoUrl?: string | null; colorPrimary?: string | null } | null;
    awayTeam: { name: string; shortName?: string | null; logoUrl?: string | null; colorPrimary?: string | null } | null;
    homeScore: number | null;
    awayScore: number | null;
    winnerId: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    status: MatchStatus;
  }>
): BracketRoundView[] => {
  if (knockoutMatches.length === 0) return [];

  const maxRound = Math.max(...knockoutMatches.map((m) => m.round));
  const rounds: BracketRoundView[] = [];

  for (let r = 1; r <= maxRound; r++) {
    const roundMatches = knockoutMatches
      .filter((m) => m.round === r)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    const label =
      r === maxRound
        ? 'Final'
        : r === maxRound - 1
          ? 'Semi-Finals'
          : r === maxRound - 2
            ? 'Quarter-Finals'
            : `Round ${r}`;

    rounds.push({
      label,
      slots: roundMatches.map((m) => ({
        matchId: m.id,
        homeName: m.homeTeam?.name ?? 'TBD',
        awayName: m.awayTeam?.name ?? 'TBD',
        homeMonogram: m.homeTeam ? monogram(m.homeTeam.name, m.homeTeam.shortName) : '?',
        awayMonogram: m.awayTeam ? monogram(m.awayTeam.name, m.awayTeam.shortName) : '?',
        homeColor: m.homeTeam?.colorPrimary ?? null,
        awayColor: m.awayTeam?.colorPrimary ?? null,
        homeLogo: m.homeTeam?.logoUrl ?? null,
        awayLogo: m.awayTeam?.logoUrl ?? null,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homeWinner: m.winnerId === m.homeTeamId && isResult(m.status),
        awayWinner: m.winnerId === m.awayTeamId && isResult(m.status),
        isFinal: r === maxRound,
        completed: isResult(m.status),
      })),
    });
  }

  return rounds;
};

export interface ExportDataPack {
  competition: {
    id: string;
    name: string;
    slug: string;
    type: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    season: string;
    publicUrl: string;
  };
  lastUpdated: string;
  standingsGroups: Array<{ name: string; rows: StandingRowView[] }>;
  bracketRounds: BracketRoundView[];
  fixtures: MatchView[];
  roundMatches: MatchView[];
  match: MatchView | null;
  stats: Awaited<ReturnType<typeof calculateCompetitionStats>>;
  playerStats: Awaited<ReturnType<typeof calculatePlayerStats>>;
  championTeam: TeamView | null;
  teamCount: number;
  isComplete: boolean;
  showGroupNames: boolean;
  layout: BoardLayout;
  legend: LegendEntry[];
}

export interface DataPackOptions {
  matchId?: string;
  round?: number;
  zones?: string;
  /** Print/document targets show the full column set. */
  document?: boolean;
}

export const buildDataPack = async (
  competitionId: string,
  options: DataPackOptions = {}
): Promise<ExportDataPack> => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      teams: true,
      matches: {
        include: { homeTeam: true, awayTeam: true, winner: true, group: true },
        orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
      },
    },
  });

  if (!competition) throw notFound('Competition not found');

  const season = new Date(competition.createdAt).getFullYear().toString();
  const publicUrl = `/c/${competition.slug}`;
  const zoneConfig = parseZones(options.zones);
  const isComplete = competition.status === CompetitionStatus.COMPLETED;

  const toMatchView = (m: (typeof competition.matches)[0]): MatchView => ({
    id: m.id,
    round: m.round,
    matchNumber: m.matchNumber,
    stage: m.stage,
    homeName: m.homeTeam?.name ?? 'TBD',
    awayName: m.awayTeam?.name ?? 'TBD',
    homeMonogram: m.homeTeam ? monogram(m.homeTeam.name, m.homeTeam.shortName) : '?',
    awayMonogram: m.awayTeam ? monogram(m.awayTeam.name, m.awayTeam.shortName) : '?',
    homeColor: m.homeTeam?.colorPrimary ?? null,
    awayColor: m.awayTeam?.colorPrimary ?? null,
    homeLogo: m.homeTeam?.logoUrl ?? null,
    awayLogo: m.awayTeam?.logoUrl ?? null,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    winnerName: m.winner?.name ?? null,
    status: m.status,
    scheduledAt: m.scheduledAt?.toISOString() ?? null,
    completed: isResult(m.status),
  });

  const standingsGroups: ExportDataPack['standingsGroups'] = [];
  const isGroupFormat =
    competition.type === CompetitionType.GROUP_STAGE ||
    competition.type === CompetitionType.GROUP_KNOCKOUT;

  const buildRows = (
    standings: Awaited<ReturnType<typeof calculateLeagueStandings>>,
    teams: typeof competition.teams
  ): StandingRowView[] =>
    standings.map((row, i) => {
      const team = teams.find((t) => t.id === row.teamId);
      const pos = i + 1;
      const total = standings.length;

      const inTopZone = zoneConfig.top > 0 && pos <= zoneConfig.top;
      const inBottomZone = zoneConfig.bottom > 0 && pos > total - zoneConfig.bottom;

      let zoneKey: StandingRowView['zoneKey'] = null;
      let zoneClass = '';
      if (inTopZone) {
        zoneKey = 'champions';
        zoneClass = 'zone-promo';
      } else if (inBottomZone) {
        zoneKey = 'relegation';
        zoneClass = 'zone-releg';
      }

      // Solid row fills state a finished fact, so they only apply once the
      // competition is complete. Live tables use the edge bar instead.
      let rowStateClass = '';
      let marker: string | null = null;
      let markerKind: StandingRowView['markerKind'] = null;
      if (isComplete && pos === 1) {
        rowStateClass = 'is-champion';
        marker = 'C';
        markerKind = 'champion';
      } else if (isComplete && inBottomZone) {
        rowStateClass = 'is-relegated';
        marker = 'R';
        markerKind = 'relegation';
      }

      const form = computeForm(row.teamId, competition.matches);
      const ordered = [...form].reverse();
      const formSlots: Array<'W' | 'D' | 'L' | null> = [
        ...Array<null>(Math.max(0, 5 - ordered.length)).fill(null),
        ...ordered,
      ];

      return {
        position: pos,
        teamId: row.teamId,
        name: row.name,
        shortName: team?.shortName ?? null,
        logoUrl: team?.logoUrl ?? null,
        colorPrimary: team?.colorPrimary ?? null,
        monogram: monogram(row.name, team?.shortName),
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        points: row.points,
        form,
        formSlots,
        zoneClass,
        zoneKey,
        rowStateClass,
        marker,
        markerKind,
        gdDisplay:
          row.goalDifference > 0 ? `+${row.goalDifference}` : String(row.goalDifference),
        gdClass:
          row.goalDifference > 0
            ? 'positive'
            : row.goalDifference < 0
              ? 'negative'
              : 'neutral',
        crestColor: team?.colorPrimary ?? '#111318',
      };
    });

  if (isGroupFormat) {
    const groupData = await getGroupStandings(competitionId);
    for (const g of groupData.groups) {
      standingsGroups.push({
        name: g.name,
        rows: buildRows(g.standings, competition.teams),
      });
    }
  } else {
    const standings = await calculateLeagueStandings(competitionId);
    standingsGroups.push({
      name: 'League Table',
      rows: buildRows(standings, competition.teams),
    });
  }

  const knockoutMatches = competition.matches.filter((m) => m.stage === MatchStage.KNOCKOUT);
  const bracketRounds = buildBracketRounds(knockoutMatches);

  const fixtures = competition.matches
    .filter((m) => !isResult(m.status))
    .filter((m) => (options.round ? m.round === options.round : true))
    .map(toMatchView);

  const roundMatches = options.round
    ? competition.matches.filter((m) => m.round === options.round).map(toMatchView)
    : [];

  let match: MatchView | null = null;
  if (options.matchId) {
    const m = competition.matches.find((x) => x.id === options.matchId);
    if (!m) throw notFound('Match not found');
    match = toMatchView(m);
  }

  const [stats, playerStats] = await Promise.all([
    calculateCompetitionStats(competitionId),
    calculatePlayerStats(competitionId),
  ]);

  let championTeam: TeamView | null = null;
  if (stats.champion) {
    const t = competition.teams.find((x) => x.name === stats.champion);
    if (t) championTeam = teamView(t);
  }

  return {
    competition: {
      id: competition.id,
      name: competition.name,
      slug: competition.slug,
      type: competition.type,
      logoUrl: competition.logoUrl,
      bannerUrl: competition.bannerUrl,
      season,
      publicUrl,
    },
    lastUpdated: formatUpdated(new Date()),
    standingsGroups,
    bracketRounds,
    fixtures,
    roundMatches,
    match,
    stats,
    playerStats,
    championTeam,
    teamCount: competition.teams.length,
    isComplete,
    showGroupNames: isGroupFormat,
    layout: resolveBoardLayout(
      Math.max(...standingsGroups.map((g) => g.rows.length), 0),
      options.document
    ),
    legend: buildLegend(isComplete, zoneConfig),
  };
};

/**
 * A legend is what makes zone marking legible; it is emitted whenever any zone
 * is actually marked, and never otherwise.
 */
const buildLegend = (
  isComplete: boolean,
  zoneConfig: { top: number; bottom: number }
): LegendEntry[] => {
  const entries: LegendEntry[] = [];
  if (isComplete) entries.push({ colorVar: 'accent', label: 'Champion' });
  if (zoneConfig.top > 0)
    entries.push({ colorVar: 'zone-champions', label: `Top ${zoneConfig.top} qualification` });
  if (zoneConfig.bottom > 0)
    entries.push({ colorVar: 'zone-relegation', label: `Bottom ${zoneConfig.bottom} relegation` });
  return entries;
};

export const requireChampion = (pack: ExportDataPack): TeamView => {
  if (!pack.championTeam) throw badRequest('No champion determined yet');
  return pack.championTeam;
};

export const requireMatch = (pack: ExportDataPack): MatchView => {
  if (!pack.match) throw badRequest('matchId query parameter is required');
  return pack.match;
};

export const requireRound = (pack: ExportDataPack, round?: number): number => {
  if (round == null || Number.isNaN(round)) throw badRequest('round query parameter is required');
  return round;
};

export { computeForm as computeTeamForm };
