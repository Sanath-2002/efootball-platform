import ExcelJS from 'exceljs';
import { prisma } from '../config/prisma';
import { CompetitionType } from '@prisma/client';
import { notFound, badRequest } from '../lib/AppError';
import {
  calculateLeagueStandings,
  getGroupStandings,
  calculatePlayerStats,
} from './recalculationService';
import { isResult } from '../lib/matchStatus';
import {
  buildGraphicExport,
  isGraphicReportType,
  isGraphicFormat,
  GraphicReportType,
  GraphicFormat,
  GraphicExportOptions,
} from '../exports/engine';

export type DataFormat = 'csv' | 'xlsx';
export type GraphicExportFormat = 'pdf' | 'png' | 'jpeg';
export type ExportFormat = DataFormat | GraphicExportFormat;

export type DataReportType = 'fixtures' | 'standings' | 'rosters' | 'results' | 'player-stats';
export type ReportType = DataReportType | GraphicReportType | 'bracket';

export interface ExportQueryOptions extends GraphicExportOptions {
  format?: string;
  theme?: string;
  size?: string;
  matchId?: string;
  round?: number;
  zones?: string;
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const csvEscape = (value: string | number | null | undefined): string => {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const rowsToCsv = (headers: string[], rows: (string | number | null | undefined)[][]): Buffer => {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  return Buffer.from(lines.join('\n'), 'utf-8');
};

const loadCompetition = async (competitionId: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      teams: {
        orderBy: { name: 'asc' },
        include: {
          players: { orderBy: { sortOrder: 'asc' } },
          group: true,
        },
      },
      matches: {
        include: {
          homeTeam: true,
          awayTeam: true,
          winner: true,
          group: true,
        },
        orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
      },
    },
  });
  if (!competition) throw notFound('Competition not found');
  return competition;
};

const GRAPHIC_ALIASES: Partial<Record<string, GraphicReportType>> = {
  bracket: 'bracket',
  standings: 'standings',
  fixtures: 'fixtures',
};

export const buildExport = async (
  competitionId: string,
  reportType: string,
  options: ExportQueryOptions = {}
): Promise<ExportResult> => {
  const format = (options.format ?? 'csv').toLowerCase();

  if (isGraphicFormat(format)) {
    const graphicType: GraphicReportType | undefined = isGraphicReportType(reportType)
      ? reportType
      : GRAPHIC_ALIASES[reportType];

    if (!graphicType) {
      throw badRequest(`Report type "${reportType}" does not support graphic format "${format}"`);
    }

    return buildGraphicExport(
      competitionId,
      graphicType,
      format as GraphicFormat,
      options
    );
  }

  if (format !== 'csv' && format !== 'xlsx') {
    throw badRequest('Invalid format. Use csv, xlsx, pdf, png, or jpeg');
  }

  const dataFormat = format as DataFormat;

  switch (reportType) {
    case 'fixtures':
      return exportFixturesData(competitionId, dataFormat);
    case 'standings':
      return exportStandingsData(competitionId, dataFormat);
    case 'rosters':
      return exportRosters(competitionId, dataFormat);
    case 'results':
      return exportResults(competitionId, dataFormat);
    case 'player-stats':
      return exportPlayerStats(competitionId, dataFormat);
    default:
      if (isGraphicReportType(reportType)) {
        throw badRequest(`Use format pdf, png, or jpeg for graphic export "${reportType}"`);
      }
      throw badRequest('Invalid report type');
  }
};

const exportFixturesData = async (
  competitionId: string,
  format: DataFormat
): Promise<ExportResult> => {
  const competition = await loadCompetition(competitionId);
  const headers = [
    'Round',
    'Match',
    'Stage',
    'Group',
    'Home',
    'Away',
    'Scheduled',
    'Status',
  ];
  const rows = competition.matches.map((m) => [
    m.round,
    m.matchNumber,
    m.stage,
    m.group?.name ?? '',
    m.homeTeam?.name ?? 'TBD',
    m.awayTeam?.name ?? 'TBD',
    m.scheduledAt ? m.scheduledAt.toISOString() : '',
    m.status,
  ]);

  const base = slugify(competition.name);

  if (format === 'csv') {
    return {
      buffer: rowsToCsv(headers, rows),
      contentType: 'text/csv',
      filename: `${base}-fixtures.csv`,
    };
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Fixtures');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${base}-fixtures.xlsx`,
  };
};

const exportStandingsData = async (
  competitionId: string,
  format: DataFormat
): Promise<ExportResult> => {
  const competition = await loadCompetition(competitionId);
  const base = slugify(competition.name);
  const headers = ['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'];

  const isGroupFormat =
    competition.type === CompetitionType.GROUP_STAGE ||
    competition.type === CompetitionType.GROUP_KNOCKOUT;

  if (format === 'csv') {
    if (isGroupFormat) {
      const groupData = await getGroupStandings(competitionId);
      const sections: string[] = [];
      for (const group of groupData.groups) {
        sections.push(group.name);
        sections.push(headers.join(','));
        group.standings.forEach((row, i) => {
          sections.push(
            [
              i + 1,
              row.name,
              row.played,
              row.won,
              row.drawn,
              row.lost,
              row.goalsFor,
              row.goalsAgainst,
              row.goalDifference,
              row.points,
            ]
              .map(csvEscape)
              .join(',')
          );
        });
        sections.push('');
      }
      return {
        buffer: Buffer.from(sections.join('\n'), 'utf-8'),
        contentType: 'text/csv',
        filename: `${base}-standings.csv`,
      };
    }

    const standings = await calculateLeagueStandings(competitionId);
    const rows = standings.map((row, i) => [
      i + 1,
      row.name,
      row.played,
      row.won,
      row.drawn,
      row.lost,
      row.goalsFor,
      row.goalsAgainst,
      row.goalDifference,
      row.points,
    ]);
    return {
      buffer: rowsToCsv(headers, rows),
      contentType: 'text/csv',
      filename: `${base}-standings.csv`,
    };
  }

  const workbook = new ExcelJS.Workbook();
  if (isGroupFormat) {
    const groupData = await getGroupStandings(competitionId);
    for (const group of groupData.groups) {
      const sheet = workbook.addWorksheet(group.name.slice(0, 31));
      sheet.addRow(headers);
      group.standings.forEach((row, i) => {
        sheet.addRow([
          i + 1,
          row.name,
          row.played,
          row.won,
          row.drawn,
          row.lost,
          row.goalsFor,
          row.goalsAgainst,
          row.goalDifference,
          row.points,
        ]);
      });
    }
  } else {
    const standings = await calculateLeagueStandings(competitionId);
    const sheet = workbook.addWorksheet('Standings');
    sheet.addRow(headers);
    standings.forEach((row, i) => {
      sheet.addRow([
        i + 1,
        row.name,
        row.played,
        row.won,
        row.drawn,
        row.lost,
        row.goalsFor,
        row.goalsAgainst,
        row.goalDifference,
        row.points,
      ]);
    });
  }
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${base}-standings.xlsx`,
  };
};

const exportRosters = async (
  competitionId: string,
  format: DataFormat
): Promise<ExportResult> => {
  const competition = await loadCompetition(competitionId);
  const headers = ['Team', 'Group', 'Player', 'Gamer Tag', 'Platform', 'Jersey', 'Position'];
  const rows: (string | number)[][] = [];

  for (const team of competition.teams) {
    if (team.players.length === 0) {
      rows.push([team.name, team.group?.name ?? '', '', '', '', '', '']);
    } else {
      for (const player of team.players) {
        rows.push([
          team.name,
          team.group?.name ?? '',
          player.name,
          player.gamerTag ?? '',
          player.platform ?? '',
          player.jerseyNumber ?? '',
          player.position ?? '',
        ]);
      }
    }
  }

  const base = slugify(competition.name);

  if (format === 'csv') {
    return {
      buffer: rowsToCsv(headers, rows),
      contentType: 'text/csv',
      filename: `${base}-rosters.csv`,
    };
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Rosters');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${base}-rosters.xlsx`,
  };
};

const exportResults = async (
  competitionId: string,
  format: DataFormat
): Promise<ExportResult> => {
  const competition = await loadCompetition(competitionId);
  const completed = competition.matches.filter((m) => isResult(m.status));
  const headers = ['Round', 'Match', 'Stage', 'Group', 'Home', 'Away', 'Score', 'Winner'];
  const rows = completed.map((m) => [
    m.round,
    m.matchNumber,
    m.stage,
    m.group?.name ?? '',
    m.homeTeam?.name ?? 'TBD',
    m.awayTeam?.name ?? 'TBD',
    `${m.homeScore ?? '-'} - ${m.awayScore ?? '-'}`,
    m.winner?.name ?? '',
  ]);

  const base = slugify(competition.name);

  if (format === 'csv') {
    return {
      buffer: rowsToCsv(headers, rows),
      contentType: 'text/csv',
      filename: `${base}-results.csv`,
    };
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Results');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${base}-results.xlsx`,
  };
};

const exportPlayerStats = async (
  competitionId: string,
  format: DataFormat
): Promise<ExportResult> => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { name: true },
  });
  if (!competition) throw notFound('Competition not found');

  const playerStats = await calculatePlayerStats(competitionId);
  const headers = [
    'Rank',
    'Player',
    'Team',
    'Gamer Tag',
    'Goals',
    'Own Goals',
    'Appearances',
    'Goals/Game',
  ];
  const rows = playerStats.map((p, i) => [
    i + 1,
    p.name,
    p.teamName,
    p.gamerTag ?? '',
    p.goals,
    p.ownGoals,
    p.appearances,
    p.goalsPerGame.toFixed(2),
  ]);

  const base = slugify(competition.name);

  if (format === 'csv') {
    return {
      buffer: rowsToCsv(headers, rows),
      contentType: 'text/csv',
      filename: `${base}-player-stats.csv`,
    };
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Player Stats');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${base}-player-stats.xlsx`,
  };
};

export { isGraphicReportType };
