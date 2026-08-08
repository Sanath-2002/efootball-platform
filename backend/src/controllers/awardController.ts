import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, badRequest } from '../lib/AppError';

const awardInclude = {
  player: {
    include: { team: { select: { id: true, name: true, colorPrimary: true } } },
  },
  assignedBy: { select: { id: true, name: true } },
};

export const listPublicAwards = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const competition = await prisma.competition.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!competition) throw notFound('Competition not found');

  const awards = await prisma.competitionAward.findMany({
    where: { competitionId: competition.id },
    include: awardInclude,
    orderBy: { assignedAt: 'asc' },
  });

  return res.json(awards);
});

export const listAwards = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) throw notFound('Competition not found');

  const awards = await prisma.competitionAward.findMany({
    where: { competitionId: id },
    include: awardInclude,
    orderBy: { assignedAt: 'asc' },
  });

  return res.json(awards);
});

export const createAward = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { playerId, awardType, label, notes } = req.body;
  const assignedById = req.user!.id;

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) throw notFound('Competition not found');

  const player = await prisma.player.findFirst({
    where: { id: playerId, team: { competitionId: id } },
  });
  if (!player) throw badRequest('Player must belong to a team in this competition');

  const existing = await prisma.competitionAward.findUnique({
    where: { competitionId_awardType: { competitionId: id, awardType } },
  });
  if (existing) throw badRequest(`An award of type ${awardType} already exists for this tournament`);

  const award = await prisma.competitionAward.create({
    data: {
      competitionId: id,
      playerId,
      awardType,
      label: awardType === 'CUSTOM' ? label : label ?? null,
      notes: notes ?? null,
      assignedById,
    },
    include: awardInclude,
  });

  return res.status(201).json(award);
});

export const updateAward = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, awardId } = req.params;
  const { playerId, label, notes } = req.body;

  const award = await prisma.competitionAward.findFirst({
    where: { id: awardId, competitionId: id },
  });
  if (!award) throw notFound('Award not found');

  if (playerId) {
    const player = await prisma.player.findFirst({
      where: { id: playerId, team: { competitionId: id } },
    });
    if (!player) throw badRequest('Player must belong to a team in this competition');
  }

  const updated = await prisma.competitionAward.update({
    where: { id: awardId },
    data: {
      ...(playerId !== undefined && { playerId }),
      ...(label !== undefined && { label }),
      ...(notes !== undefined && { notes }),
    },
    include: awardInclude,
  });

  return res.json(updated);
});

export const deleteAward = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, awardId } = req.params;

  const award = await prisma.competitionAward.findFirst({
    where: { id: awardId, competitionId: id },
  });
  if (!award) throw notFound('Award not found');

  await prisma.competitionAward.delete({ where: { id: awardId } });
  return res.json({ message: 'Award removed' });
});
