import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest } from '../lib/AppError';
import { buildExport, isGraphicReportType } from '../services/exportService';

const VALID_DATA_TYPES = ['fixtures', 'standings', 'rosters', 'results', 'player-stats'];

const VALID_GRAPHIC_TYPES = [
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
];

const ALL_TYPES = [...new Set([...VALID_DATA_TYPES, ...VALID_GRAPHIC_TYPES])];

export const exportReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, reportType } = req.params;
  const format = (req.query.format as string) || 'csv';
  const theme = req.query.theme as string | undefined;
  const size = req.query.size as string | undefined;
  const matchId = req.query.matchId as string | undefined;
  const roundRaw = req.query.round as string | undefined;
  const zones = req.query.zones as string | undefined;

  if (!ALL_TYPES.includes(reportType)) {
    throw badRequest('Invalid report type');
  }

  const validFormats = ['csv', 'xlsx', 'pdf', 'png', 'jpeg'];
  if (!validFormats.includes(format)) {
    throw badRequest('Invalid format. Use csv, xlsx, pdf, png, or jpeg');
  }

  const round = roundRaw != null ? parseInt(roundRaw, 10) : undefined;

  const result = await buildExport(id, reportType, {
    format,
    theme,
    size,
    matchId,
    round: Number.isNaN(round!) ? undefined : round,
    zones,
  });

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  return res.send(result.buffer);
});

export { isGraphicReportType };
