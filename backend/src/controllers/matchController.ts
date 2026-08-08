import { Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, badRequest } from '../lib/AppError';
import {
  generateKnockoutBracket,
  generateRoundRobinFixtures,
  generateGroupStageFixtures,
  generateKnockoutFromGroups,
} from '../services/generatorService';
import {
  updateMatchScoreAndRecalculate,
  updateMatchStatusAndRecalculate,
  calculateLeagueStandings,
  calculateCompetitionStats,
  getGroupStandings,
} from '../services/recalculationService';
import { CompetitionType, MatchStage, MatchStatus } from '@prisma/client';
import { getStorageDriver } from '../services/storage';
import { requireMembershipPermission, getViewerPermissions } from '../services/membershipService';
import { PERMISSIONS } from '../lib/permissions';
import { forbidden } from '../lib/AppError';
import { isResult } from '../lib/matchStatus';

const matchInclude = {
  homeTeam: { include: { players: { orderBy: { sortOrder: 'asc' as const } } } },
  awayTeam: { include: { players: { orderBy: { sortOrder: 'asc' as const } } } },
  winner: true,
  group: true,
  games: { orderBy: { gameNumber: 'asc' as const } },
  screenshots: { orderBy: { createdAt: 'desc' as const } },
  goals: {
    include: { player: { include: { team: { select: { id: true, name: true, colorPrimary: true } } } } },
    orderBy: { createdAt: 'asc' as const },
  },
  appearances: {
    include: { player: { include: { team: { select: { id: true, name: true } } } } },
  },
  competition: { select: { id: true, name: true, slug: true, format: true, type: true } },
};

export const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPEG and WebP images are allowed'));
  },
});

export const generateFixturesOrBracket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { competitionId } = req.params;

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
  });

  if (!competition) throw notFound('Competition not found');

  let result;
  switch (competition.type) {
    case CompetitionType.TOURNAMENT:
      result = await generateKnockoutBracket(competitionId, req.user?.id);
      break;
    case CompetitionType.LEAGUE:
      result = await generateRoundRobinFixtures(competitionId, req.user?.id);
      break;
    case CompetitionType.GROUP_STAGE:
    case CompetitionType.GROUP_KNOCKOUT:
      result = await generateGroupStageFixtures(competitionId, req.user?.id);
      break;
    default:
      throw badRequest('Unsupported competition type');
  }

  return res.json(result);
});

export const generateKnockoutPhase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { competitionId } = req.params;
  const result = await generateKnockoutFromGroups(competitionId, req.user?.id);
  return res.json(result);
});

export const createMatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { competitionId } = req.params;
  const { round, matchNumber, stage, groupId, homeTeamId, awayTeamId, scheduledAt, notes } =
    req.body;

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
  });
  if (!competition) throw notFound('Competition not found');

  if (homeTeamId) {
    const homeTeam = await prisma.team.findFirst({
      where: { id: homeTeamId, competitionId },
    });
    if (!homeTeam) throw badRequest('Home team does not belong to this competition');
    if (stage === MatchStage.GROUP && groupId && homeTeam.groupId !== groupId) {
      throw badRequest('Home team must belong to the specified group');
    }
  }

  if (awayTeamId) {
    const awayTeam = await prisma.team.findFirst({
      where: { id: awayTeamId, competitionId },
    });
    if (!awayTeam) throw badRequest('Away team does not belong to this competition');
    if (stage === MatchStage.GROUP && groupId && awayTeam.groupId !== groupId) {
      throw badRequest('Away team must belong to the specified group');
    }
  }

  if (groupId) {
    const group = await prisma.tournamentGroup.findFirst({
      where: { id: groupId, competitionId },
    });
    if (!group) throw badRequest('Group does not belong to this competition');
  }

  const match = await prisma.match.create({
    data: {
      competitionId,
      round,
      matchNumber,
      stage,
      groupId: groupId ?? null,
      homeTeamId: homeTeamId ?? null,
      awayTeamId: awayTeamId ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes: notes ?? null,
      status: MatchStatus.SCHEDULED,
    },
    include: matchInclude,
  });

  return res.status(201).json(match);
});

export const updateFixture = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { round, matchNumber, stage, groupId, homeTeamId, awayTeamId, scheduledAt, notes } =
    req.body;

  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) throw notFound('Match not found');

  if (isResult(existing.status)) {
    throw badRequest('Cannot edit fixture with recorded result — clear the score first');
  }

  const nextStage = stage ?? existing.stage;
  const nextGroupId = groupId !== undefined ? groupId : existing.groupId;

  if (homeTeamId !== undefined && homeTeamId !== null) {
    const homeTeam = await prisma.team.findFirst({
      where: { id: homeTeamId, competitionId: existing.competitionId },
    });
    if (!homeTeam) throw badRequest('Home team does not belong to this competition');
    if (nextStage === MatchStage.GROUP && nextGroupId && homeTeam.groupId !== nextGroupId) {
      throw badRequest('Home team must belong to the specified group');
    }
  }

  if (awayTeamId !== undefined && awayTeamId !== null) {
    const awayTeam = await prisma.team.findFirst({
      where: { id: awayTeamId, competitionId: existing.competitionId },
    });
    if (!awayTeam) throw badRequest('Away team does not belong to this competition');
    if (nextStage === MatchStage.GROUP && nextGroupId && awayTeam.groupId !== nextGroupId) {
      throw badRequest('Away team must belong to the specified group');
    }
  }

  if (nextGroupId) {
    const group = await prisma.tournamentGroup.findFirst({
      where: { id: nextGroupId, competitionId: existing.competitionId },
    });
    if (!group) throw badRequest('Group does not belong to this competition');
  }

  const match = await prisma.match.update({
    where: { id },
    data: {
      ...(round !== undefined && { round }),
      ...(matchNumber !== undefined && { matchNumber }),
      ...(stage !== undefined && { stage }),
      ...(groupId !== undefined && { groupId }),
      ...(homeTeamId !== undefined && { homeTeamId }),
      ...(awayTeamId !== undefined && { awayTeamId }),
      ...(scheduledAt !== undefined && {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }),
      ...(notes !== undefined && { notes }),
    },
    include: matchInclude,
  });

  return res.json(match);
});

export const deleteMatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) throw notFound('Match not found');

  if (isResult(match.status)) {
    throw badRequest('Cannot delete a match with a recorded result');
  }

  if (match.nextMatchId && match.winnerId) {
    const parent = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
    if (parent) {
      const slotTeamId =
        match.nextMatchSlot === 'HOME' ? parent.homeTeamId : parent.awayTeamId;
      if (slotTeamId === match.winnerId) {
        throw badRequest('Cannot delete match — winner has advanced in bracket');
      }
    }
  }

  const feeders = await prisma.match.findMany({ where: { nextMatchId: id } });
  for (const feeder of feeders) {
    if (!feeder.winnerId) continue;
    const slotTeamId =
      feeder.nextMatchSlot === 'HOME' ? match.homeTeamId : match.awayTeamId;
    if (slotTeamId === feeder.winnerId && isResult(feeder.status)) {
      throw badRequest('Cannot delete match — a feeder match has advanced with a result');
    }
  }

  await prisma.match.delete({ where: { id } });
  return res.json({ message: 'Match deleted' });
});

export const updateScore = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { homeScore, awayScore, homePenalties, awayPenalties, games, goals, appearances } =
    req.body;

  const result = await updateMatchScoreAndRecalculate(id, {
    homeScore: homeScore !== undefined && homeScore !== '' ? Number(homeScore) : null,
    awayScore: awayScore !== undefined && awayScore !== '' ? Number(awayScore) : null,
    homePenalties: homePenalties !== undefined ? homePenalties : undefined,
    awayPenalties: awayPenalties !== undefined ? awayPenalties : undefined,
    games,
    goals,
    appearances,
    actorUserId: req.user?.id,
  });

  const match = await prisma.match.findUnique({
    where: { id },
    select: { competitionId: true },
  });

  if (match) {
    const stats = await calculateCompetitionStats(match.competitionId);
    const competition = await prisma.competition.findUnique({
      where: { id: match.competitionId },
      select: { status: true },
    });
    return res.json({
      ...result,
      stats,
      competitionStatus: competition?.status,
    });
  }

  return res.json(result);
});

export const updateMatchStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, statusNote, winnerTeamId } = req.body;

  const match = await prisma.match.findUnique({
    where: { id },
    select: { competitionId: true },
  });
  if (!match) throw notFound('Match not found');

  const statusValue = status as MatchStatus;
  if (statusValue === MatchStatus.WALKOVER) {
    await requireMembershipPermission(match.competitionId, req.user?.id, PERMISSIONS.SCORES_UPDATE);
  } else if (
    statusValue === MatchStatus.POSTPONED ||
    statusValue === MatchStatus.CANCELLED ||
    statusValue === MatchStatus.SCHEDULED
  ) {
    await requireMembershipPermission(match.competitionId, req.user?.id, PERMISSIONS.FIXTURES_MANAGE);
  } else {
    throw forbidden('Invalid status transition');
  }

  const result = await updateMatchStatusAndRecalculate(id, {
    status: statusValue,
    statusNote,
    winnerTeamId,
    actorUserId: req.user?.id,
  });

  const updatedMatch = await prisma.match.findUnique({
    where: { id },
    include: matchInclude,
  });

  return res.json({ ...result, match: updatedMatch });
});

export const updateMatchDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { scheduledAt, notes } = req.body;

  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) throw notFound('Match not found');

  const match = await prisma.match.update({
    where: { id },
    data: {
      ...(scheduledAt !== undefined && {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }),
      ...(notes !== undefined && { notes }),
    },
    include: matchInclude,
  });

  return res.json(match);
});

export const uploadScreenshot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const file = req.file;
  if (!file) throw badRequest('No image file provided');

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) throw notFound('Match not found');

  const gameNumber = req.body.gameNumber ? Number(req.body.gameNumber) : null;
  const storage = getStorageDriver();
  const uploaded = await storage.upload(file.buffer, {
    folder: `matches/${id}`,
    mimeType: file.mimetype,
    originalName: file.originalname,
  });

  const screenshot = await prisma.matchScreenshot.create({
    data: {
      matchId: id,
      gameNumber,
      url: uploaded.url,
      storageKey: uploaded.storageKey,
      uploadedById: req.user?.id ?? null,
    },
  });

  return res.status(201).json(screenshot);
});

export const deleteScreenshot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, screenshotId } = req.params;

  const screenshot = await prisma.matchScreenshot.findFirst({
    where: { id: screenshotId, matchId: id },
  });
  if (!screenshot) throw notFound('Screenshot not found');

  if (screenshot.storageKey) {
    try {
      await getStorageDriver().remove(screenshot.storageKey);
    } catch {
      // ignore storage delete failures
    }
  }

  await prisma.matchScreenshot.delete({ where: { id: screenshotId } });
  return res.json({ message: 'Screenshot deleted' });
});

export const getStandings = asyncHandler(async (req: Request, res: Response) => {
  const { competitionId } = req.params;
  const standings = await calculateLeagueStandings(competitionId);
  return res.json(standings);
});

export const getGroups = asyncHandler(async (req: Request, res: Response) => {
  const { competitionId } = req.params;
  const groups = await getGroupStandings(competitionId);
  return res.json(groups);
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const { competitionId } = req.params;
  const stats = await calculateCompetitionStats(competitionId);
  return res.json(stats);
});

export const getMatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: matchInclude,
  });

  if (!match) throw notFound('Match not found');

  const viewerPermissions = await getViewerPermissions(match.competitionId, req.user?.id);

  return res.json({ ...match, viewerPermissions });
});
