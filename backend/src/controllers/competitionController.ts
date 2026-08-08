import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound } from '../lib/AppError';
import {
  createOwnerMembership,
  getMembership,
} from '../services/membershipService';
import { CompetitionType, MatchFormat } from '@prisma/client';

const generateSlug = (name: string): string => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  return base || 'competition';
};

const competitionInclude = {
  owner: { select: { id: true, name: true, email: true } },
  groups: { orderBy: { sortOrder: 'asc' as const } },
  teams: {
    orderBy: { name: 'asc' as const },
    include: {
      players: { orderBy: { sortOrder: 'asc' as const } },
      captain: true,
      group: true,
    },
  },
  matches: {
    include: {
      homeTeam: true,
      awayTeam: true,
      winner: true,
      group: true,
      games: { orderBy: { gameNumber: 'asc' as const } },
      screenshots: { orderBy: { createdAt: 'desc' as const } },
    },
    orderBy: [{ round: 'asc' as const }, { matchNumber: 'asc' as const }],
  },
};

const attachFollowMeta = async (
  competition: { id: string; followerCount?: number },
  userId: string | undefined
) => {
  let followerCount = competition.followerCount;
  if (followerCount === undefined) {
    const row = await prisma.competition.findUnique({
      where: { id: competition.id },
      select: { followerCount: true },
    });
    followerCount = row?.followerCount ?? 0;
  }

  let isFollowing = false;
  if (userId) {
    const follow = await prisma.competitionFollow.findUnique({
      where: { competitionId_userId: { competitionId: competition.id, userId } },
    });
    isFollowing = !!follow;
  }
  return { followerCount, isFollowing };
};

const attachViewerPermissions = async (
  competition: { id: string },
  userId: string | undefined
) => {
  const followMeta = await attachFollowMeta(competition, userId);
  if (!userId) {
    return { ...competition, viewerPermissions: [] as string[], ...followMeta };
  }
  const membership = await getMembership(competition.id, userId);
  return {
    ...competition,
    viewerPermissions: membership?.permissions ?? [],
    ...followMeta,
  };
};

export const createCompetition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, type, format, description, groupCount, advancementPerGroup } = req.body;
  const ownerId = req.user?.id;

  if (!ownerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let slug = generateSlug(name);
  const existing = await prisma.competition.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const competition = await prisma.competition.create({
    data: {
      name,
      slug,
      type: type as CompetitionType,
      format: (format as MatchFormat) || MatchFormat.BO1,
      description: description || null,
      groupCount: groupCount ?? null,
      advancementPerGroup: advancementPerGroup ?? 2,
      ownerId,
    },
  });

  await createOwnerMembership(competition.id, ownerId);

  const result = await attachViewerPermissions(competition, ownerId);
  return res.status(201).json(result);
});

export const getMyCompetitions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const memberships = await prisma.competitionMember.findMany({
    where: { userId },
    include: {
      competition: {
        include: {
          _count: { select: { teams: true, matches: true } },
          owner: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const competitions = await Promise.all(
    memberships.map(async (m) =>
      attachViewerPermissions(
        { ...m.competition, membershipRole: m.role } as typeof m.competition & { membershipRole: typeof m.role },
        userId
      )
    )
  );

  return res.json(competitions);
});

export const getCompetitionById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: competitionInclude,
  });

  if (!competition) {
    throw notFound('Competition not found');
  }

  const membership = userId ? await getMembership(id, userId) : null;
  if (!membership) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.json({ ...competition, viewerPermissions: membership.permissions });
});

export const updateCompetition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, format, description, logoUrl, bannerUrl } = req.body;

  const existing = await prisma.competition.findUnique({ where: { id } });
  if (!existing) {
    throw notFound('Competition not found');
  }

  const updated = await prisma.competition.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(format !== undefined && { format: format as MatchFormat }),
      ...(description !== undefined && { description }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(bannerUrl !== undefined && { bannerUrl }),
    },
  });

  const result = await attachViewerPermissions(updated, req.user?.id);
  return res.json(result);
});

export const deleteCompetition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.competition.findUnique({ where: { id } });
  if (!existing) {
    throw notFound('Competition not found');
  }

  await prisma.competition.delete({ where: { id } });
  return res.json({ message: 'Competition deleted successfully' });
});

export const getPublicCompetitionBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const authHeader = req.headers.authorization;
  let userId: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const jwt = await import('jsonwebtoken');
      const { getJwtSecret } = await import('../config/env');
      const decoded = jwt.verify(authHeader.slice(7), getJwtSecret()) as { id: string };
      userId = decoded.id;
    } catch {
      userId = undefined;
    }
  }

  const competition = await prisma.competition.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      teams: {
        orderBy: { name: 'asc' },
        include: {
          players: { orderBy: { sortOrder: 'asc' } },
          captain: true,
        },
      },
      matches: {
        include: {
          homeTeam: true,
          awayTeam: true,
          winner: true,
          games: { orderBy: { gameNumber: 'asc' } },
          screenshots: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
      },
    },
  });

  if (!competition) {
    throw notFound('Competition not found');
  }

  const followMeta = await attachFollowMeta(competition, userId);
  return res.json({ ...competition, viewerPermissions: [], ...followMeta });
});
