import { Request, Response } from 'express';
import { NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound } from '../lib/AppError';
import { emitNotification } from '../services/notificationService';

const announcementInclude = {
  author: { select: { id: true, name: true } },
};

const sortAnnouncements = <
  T extends { pinned: boolean; publishedAt: Date }
>(
  items: T[]
): T[] =>
  [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

export const listPublicAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const competition = await prisma.competition.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!competition) throw notFound('Competition not found');

  const announcements = await prisma.announcement.findMany({
    where: { competitionId: competition.id },
    include: announcementInclude,
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
  });

  return res.json(sortAnnouncements(announcements));
});

export const listAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) throw notFound('Competition not found');

  const announcements = await prisma.announcement.findMany({
    where: { competitionId: id },
    include: announcementInclude,
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
  });

  return res.json(sortAnnouncements(announcements));
});

export const createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, body, pinned } = req.body;
  const authorId = req.user!.id;

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) throw notFound('Competition not found');

  const announcement = await prisma.announcement.create({
    data: {
      competitionId: id,
      title,
      body,
      pinned: pinned ?? false,
      authorId,
    },
    include: announcementInclude,
  });

  await emitNotification({
    competitionId: id,
    type: NotificationType.ANNOUNCEMENT,
    title: announcement.title,
    body: announcement.body.slice(0, 200),
    actorUserId: authorId,
  });

  return res.status(201).json(announcement);
});

export const updateAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, announcementId } = req.params;
  const { title, body, pinned } = req.body;

  const existing = await prisma.announcement.findFirst({
    where: { id: announcementId, competitionId: id },
  });
  if (!existing) throw notFound('Announcement not found');

  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(pinned !== undefined && { pinned }),
    },
    include: announcementInclude,
  });

  return res.json(announcement);
});

export const deleteAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, announcementId } = req.params;

  const existing = await prisma.announcement.findFirst({
    where: { id: announcementId, competitionId: id },
  });
  if (!existing) throw notFound('Announcement not found');

  await prisma.announcement.delete({ where: { id: announcementId } });
  return res.json({ message: 'Announcement deleted' });
});
