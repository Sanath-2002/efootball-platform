import { Response } from 'express';
import { NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound } from '../lib/AppError';
import { emitNotificationToUsers } from '../services/notificationService';

export const followCompetition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      members: { select: { userId: true } },
    },
  });
  if (!competition) throw notFound('Competition not found');

  const existing = await prisma.competitionFollow.findUnique({
    where: { competitionId_userId: { competitionId: id, userId } },
  });

  if (!existing) {
    const follower = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.$transaction([
      prisma.competitionFollow.create({
        data: { competitionId: id, userId },
      }),
      prisma.competition.update({
        where: { id },
        data: { followerCount: { increment: 1 } },
      }),
    ]);

    const adminUserIds = [
      competition.ownerId,
      ...competition.members.map((m) => m.userId),
    ];

    await emitNotificationToUsers(
      {
        competitionId: id,
        type: NotificationType.NEW_FOLLOWER,
        title: `New follower on ${competition.name}`,
        body: `${follower?.name ?? 'Someone'} is now following your tournament.`,
        actorUserId: userId,
      },
      adminUserIds
    );
  }

  const updated = await prisma.competition.findUnique({
    where: { id },
    select: { followerCount: true },
  });

  return res.json({
    isFollowing: true,
    followerCount: updated?.followerCount ?? 0,
  });
});

export const unfollowCompetition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.competitionFollow.findUnique({
    where: { competitionId_userId: { competitionId: id, userId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.competitionFollow.delete({
        where: { competitionId_userId: { competitionId: id, userId } },
      }),
      prisma.competition.update({
        where: { id },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);
  }

  const updated = await prisma.competition.findUnique({
    where: { id },
    select: { followerCount: true },
  });

  return res.json({
    isFollowing: false,
    followerCount: updated?.followerCount ?? 0,
  });
});

export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const { listNotificationsForUser } = await import('../services/notificationService');
  const result = await listNotificationsForUser(userId, { limit, cursor });
  return res.json(result);
});

export const getUnreadNotificationCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { getUnreadCount } = await import('../services/notificationService');
  const count = await getUnreadCount(userId);
  return res.json({ count });
});

export const markNotificationsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { ids } = req.body as { ids?: string[] };
  const { markNotificationsRead: markRead } = await import('../services/notificationService');
  const updated = await markRead(userId, ids);
  return res.json({ updated });
});

export const getFollowedCompetitions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const follows = await prisma.competitionFollow.findMany({
    where: { userId },
    include: {
      competition: {
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { teams: true, matches: true, followers: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(
    follows.map((f) => ({
      ...f.competition,
      isFollowing: true,
      followerCount: f.competition.followerCount,
    }))
  );
});
