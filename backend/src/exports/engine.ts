import { badRequest } from '../lib/AppError';
import { getBrowser } from './browserPool';
import {
  buildDataPack,
  requireChampion,
  requireMatch,
  DataPackOptions,
  resolveBoardLayout,
  BoardLayout,
} from './dataPack';
import { loadBaseCss, loadTemplate } from './templateLoader';
import { resolveTheme, themeVarsToCss, ThemeId } from './themes/tokens';
import { isDocumentSize, pdfScaleFor, resolveSize, SIZE_PRESETS } from './sizes';

export type GraphicReportType =
  | 'cover'
  | 'summary'
  | 'standings'
  | 'fixtures'
  | 'bracket'
  | 'match-result'
  | 'round-summary'
  | 'champion'
  | 'team-stats'
  | 'tournament-stats';

export type GraphicFormat = 'pdf' | 'png' | 'jpeg';

export interface GraphicExportOptions extends DataPackOptions {
  theme?: string;
  size?: string;
  round?: number;
  matchId?: string;
  /** Target canvas height, used to fit rows to the page. */
  canvasHeight?: number;
}

export interface GraphicExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Widest canvas the design system is drawn for; above this we scale pixels. */
const DESIGN_MAX_WIDTH = 1920;

/** Vertical space taken by masthead, column labels, legend, footer and margins. */
const CHROME_HEIGHT = 470;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Rows expand to fill the canvas so a short table never leaves a dead page,
 * and a long one stays legible rather than collapsing.
 */
const boardMetrics = (canvasHeight: number, rowCount: number, groupCount: number): string => {
  const available = canvasHeight - CHROME_HEIGHT - (groupCount - 1) * 80;
  const slot = available / Math.max(rowCount * groupCount, 1);
  const gap = clamp(Math.round(slot * 0.12), 5, 12);
  const rowHeight = clamp(Math.round(slot - gap), 40, 96);
  const crest = clamp(Math.round(rowHeight * 0.58), 24, 44);
  const clubName = clamp(Math.round(rowHeight * 0.31), 15, 22);

  return [
    `--row-height:${rowHeight}px`,
    `--row-gap:${gap}px`,
    `--crest-size:${crest}px`,
    `--type-club-name:${clubName}px`,
  ].join(';');
};

const reportSubtitle = (
  reportType: GraphicReportType,
  pack: Awaited<ReturnType<typeof buildDataPack>>,
  options: GraphicExportOptions
): string => {
  if (reportType === 'round-summary' && options.round != null) {
    return `Round ${options.round} Summary`;
  }
  switch (reportType) {
    case 'cover':
      return String(pack.competition.type).replace(/_/g, ' ');
    case 'summary':
      return 'Tournament Summary';
    case 'fixtures':
      return options.round != null ? `Round ${options.round} Fixtures` : 'Fixtures';
    case 'bracket':
      return 'Knockout Bracket';
    case 'match-result':
      return 'Full Time';
    case 'champion':
      return 'Champions';
    case 'team-stats':
      return 'Team Statistics';
    case 'tournament-stats':
      return 'Tournament Statistics';
    case 'standings':
      return pack.isComplete ? 'Final League Table' : 'League Table';
    default:
      return '';
  }
};

const statLayout = (): BoardLayout => ({
  density: 'document',
  colsClass: 'cols-stats',
  showWDL: true,
  showGoals: true,
  showForm: false,
});

const CONTENT_TYPES: Record<GraphicFormat, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
};

const buildContext = async (
  competitionId: string,
  reportType: GraphicReportType,
  options: GraphicExportOptions
) => {
  const pack = await buildDataPack(competitionId, options);
  const theme = resolveTheme(options.theme);
  const baseCss = loadBaseCss();
  const themeCss = themeVarsToCss(theme.cssVars);

  const subtitle = reportSubtitle(reportType, pack, options);
  const boardSubtitle = subtitle;

  const canvasHeight =
    options.canvasHeight ?? SIZE_PRESETS[resolveSize(reportType, options.size)].height;
  const rowCount = Math.max(...pack.standingsGroups.map((g) => g.rows.length), 1);
  const boardStyle = boardMetrics(canvasHeight, rowCount, pack.standingsGroups.length);

  const primaryRows = pack.standingsGroups[0]?.rows ?? [];

  const coverStatTiles = [
    { value: pack.teamCount, label: 'Teams' },
    { value: pack.stats.totalMatches, label: 'Matches' },
    { value: pack.stats.totalGoals, label: 'Goals' },
  ];

  const summaryStatTiles = [
    { value: pack.teamCount, label: 'Teams' },
    { value: `${pack.stats.completedMatches}/${pack.stats.totalMatches}`, label: 'Completed' },
    { value: pack.stats.totalGoals, label: 'Total Goals' },
  ];

  const topScorerDetail = pack.stats.topScorer
    ? `${pack.stats.topScorer.goals} goal${pack.stats.topScorer.goals === 1 ? '' : 's'}${pack.stats.topScorer.isShared ? ' · shared' : ''}`
    : null;

  const tournamentStatTiles = [
    { value: pack.stats.totalGoals, label: 'Total Goals' },
    { value: pack.stats.completedMatches, label: 'Matches Played' },
    { value: pack.teamCount, label: 'Teams' },
  ];

  const topOffenseDetail = pack.stats.topOffense
    ? `${pack.stats.topOffense.goalsFor} GF`
    : null;
  const topDefenseDetail = pack.stats.topDefense
    ? `${pack.stats.topDefense.goalsAgainst} GA`
    : null;
  type HighScoreMatch = {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  };
  const highScore = pack.stats.highestScoringMatch as HighScoreMatch | null;
  const highestScoringLabel = highScore
    ? `${highScore.homeTeam} vs ${highScore.awayTeam}`
    : null;
  const highestScoringDetail = highScore
    ? `${highScore.homeScore}–${highScore.awayScore}`
    : null;

  if (reportType === 'match-result') {
    pack.match = requireMatch(pack);
  }
  if (reportType === 'champion') {
    requireChampion(pack);
  }
  if (reportType === 'round-summary') {
    if (options.round == null) throw badRequest('round query parameter is required');
  }
  if (reportType === 'match-result') {
    if (!options.matchId) throw badRequest('matchId query parameter is required');
  }
  if (reportType === 'bracket' && pack.bracketRounds.length === 0) {
    throw badRequest('No knockout bracket to export');
  }

  return {
    ...pack,
    themeId: theme.id,
    themeCss,
    baseCss,
    subtitle,
    boardStyle,
    layout: reportType === 'team-stats' ? statLayout() : pack.layout,
    primaryRows,
    coverStatTiles,
    summaryStatTiles,
    topScorerDetail,
    tournamentStatTiles,
    topOffenseDetail,
    topDefenseDetail,
    highestScoringLabel,
    highestScoringDetail,
    round: options.round,
    championTeam: pack.championTeam,
    competitionInitial: pack.competition.name.charAt(0).toUpperCase(),
  };
};

export const renderGraphicHtml = async (
  competitionId: string,
  reportType: GraphicReportType,
  options: GraphicExportOptions
): Promise<string> => {
  const ctx = await buildContext(competitionId, reportType, options);
  const template = loadTemplate(reportType);
  return template(ctx);
};

export const buildGraphicExport = async (
  competitionId: string,
  reportType: GraphicReportType,
  format: GraphicFormat,
  options: GraphicExportOptions = {}
): Promise<GraphicExportResult> => {
  const sizePreset = resolveSize(reportType, options.size, format);
  const size = SIZE_PRESETS[sizePreset];
  const renderOptions: GraphicExportOptions = {
    ...options,
    document: options.document ?? isDocumentSize(sizePreset),
    canvasHeight: size.height,
  };

  const html = await renderGraphicHtml(competitionId, reportType, renderOptions);
  const pack = await buildDataPack(competitionId, renderOptions);

  // High-resolution targets render at the design width and are captured at a
  // higher pixel ratio, so type and crests stay sharp instead of scaling up.
  const scaleFactor = size.width > DESIGN_MAX_WIDTH ? size.width / DESIGN_MAX_WIDTH : 1;
  const renderWidth = Math.round(size.width / scaleFactor);
  const renderHeight = Math.round(size.height / scaleFactor);

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: renderWidth, height: renderHeight },
    deviceScaleFactor: scaleFactor,
  });
  const page = await context.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });

    let buffer: Buffer;
    const base = slugify(pack.competition.name);

    if (format === 'pdf') {
      buffer = await page.pdf({
        format: size.pdfFormat ?? 'A4',
        landscape: size.pdfLandscape ?? size.landscape ?? false,
        printBackground: true,
        scale: pdfScaleFor(size),
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
    } else {
      buffer = await page.screenshot({
        type: format === 'jpeg' ? 'jpeg' : 'png',
        fullPage: true,
        quality: format === 'jpeg' ? 92 : undefined,
      });
    }

    return {
      buffer,
      contentType: CONTENT_TYPES[format],
      filename: `${base}-${reportType}.${format}`,
    };
  } finally {
    await page.close();
    await context.close();
  }
};

export const isGraphicReportType = (type: string): type is GraphicReportType =>
  [
    'cover',
    'summary',
    'standings',
    'fixtures',
    'bracket',
    'match-result',
    'round-summary',
    'champion',
    'team-stats',
    'tournament-stats',
  ].includes(type);

export const isGraphicFormat = (format: string): format is GraphicFormat =>
  ['pdf', 'png', 'jpeg'].includes(format);

export { ThemeId };
