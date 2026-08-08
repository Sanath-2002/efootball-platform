import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest, notFound } from '../lib/AppError';
import { parseListQuery, paginationMeta } from '../lib/parseListQuery';
import { CompetitionStatus } from '@prisma/client';

export const listTeams = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { competitionId } = req.params;
  const query = parseListQuery(req, ['name', 'createdAt', 'sortOrder']);

  const where = {
    competitionId,
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { shortName: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      include: {
        players: { orderBy: { sortOrder: 'asc' } },
        captain: true,
        _count: { select: { players: true } },
      },
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: query.skip,
      take: query.limit,
    }),
    prisma.team.count({ where }),
  ]);

  return res.json({ data: teams, meta: paginationMeta(total, query) });
});

export const addTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { competitionId } = req.params;
  const { name, shortName, logoUrl, colorPrimary, coachName, notes } = req.body;

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
  });

  if (!competition) {
    throw notFound('Competition not found');
  }

  if (competition.status !== CompetitionStatus.DRAFT) {
    throw badRequest('Cannot add teams after fixtures or brackets have been generated');
  }

  const trimmedName = name.trim();

  const existing = await prisma.team.findFirst({
    where: {
      competitionId,
      name: { equals: trimmedName, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw badRequest(`A team named "${trimmedName}" already exists in this competition`);
  }

  const team = await prisma.team.create({
    data: {
      name: trimmedName,
      shortName: shortName?.trim() || null,
      logoUrl: logoUrl || null,
      colorPrimary: colorPrimary || null,
      coachName: coachName?.trim() || null,
      notes: notes || null,
      competitionId,
    },
    include: { players: true, captain: true },
  });

  return res.status(201).json(team);
});

export const getTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      players: { orderBy: { sortOrder: 'asc' } },
      captain: true,
      competition: { select: { id: true, name: true, status: true } },
    },
  });

  if (!team) {
    throw notFound('Team not found');
  }

  return res.json(team);
});

export const updateTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, shortName, logoUrl, colorPrimary, coachName, notes } = req.body;

  const team = await prisma.team.findUnique({
    where: { id },
    include: { competition: true },
  });

  if (!team) {
    throw notFound('Team not found');
  }

  if (team.competition.status !== CompetitionStatus.DRAFT) {
    throw badRequest('Cannot edit teams after competition has started');
  }

  const trimmedName = name !== undefined ? name.trim() : undefined;

  if (trimmedName) {
    const existing = await prisma.team.findFirst({
      where: {
        competitionId: team.competitionId,
        name: { equals: trimmedName, mode: 'insensitive' },
        id: { not: id },
      },
    });

    if (existing) {
      throw badRequest(`A team named "${trimmedName}" already exists in this competition`);
    }
  }

  const updated = await prisma.team.update({
    where: { id },
    data: {
      ...(trimmedName !== undefined && { name: trimmedName }),
      ...(shortName !== undefined && { shortName: shortName?.trim() || null }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(colorPrimary !== undefined && { colorPrimary }),
      ...(coachName !== undefined && { coachName: coachName?.trim() || null }),
      ...(notes !== undefined && { notes }),
    },
    include: { players: { orderBy: { sortOrder: 'asc' } }, captain: true },
  });

  return res.json(updated);
});

export const deleteTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: { competition: true },
  });

  if (!team) {
    throw notFound('Team not found');
  }

  if (team.competition.status !== CompetitionStatus.DRAFT) {
    throw badRequest('Cannot delete teams after competition has started');
  }

  await prisma.team.delete({ where: { id } });
  return res.json({ message: 'Team removed successfully' });
});
