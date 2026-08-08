import { NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface EmitNotificationInput {
  competitionId: string;
  type: NotificationType;
  title: string;
  body: string;
  matchId?: string;
  actorUserId?: string;
}

export const emitNotification = async (input: EmitNotificationInput): Promise<void> => {
  try {
    const followers = await prisma.competitionFollow.findMany({
      where: { competitionId: input.competitionId },
      select: { userId: true },
    });

    const recipientIds = followers
      .map((f) => f.userId)
      .filter((userId) => userId !== input.actorUserId);

    await createNotificationForUsers(input, recipientIds);
  } catch (err) {
    console.error('Failed to emit notification:', err);
  }
};

export const emitNotificationToUsers = async (
  input: EmitNotificationInput,
  userIds: string[]
): Promise<void> => {
  try {
    const recipientIds = [...new Set(userIds)].filter(
      (userId) => userId !== input.actorUserId
    );
    await createNotificationForUsers(input, recipientIds);
  } catch (err) {
    console.error('Failed to emit notification to users:', err);
  }
};

const createNotificationForUsers = async (
  input: EmitNotificationInput,
  recipientIds: string[]
): Promise<void> => {
  if (recipientIds.length === 0) return;

  await prisma.notification.create({
    data: {
      competitionId: input.competitionId,
      matchId: input.matchId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      recipients: {
        create: recipientIds.map((userId) => ({ userId })),
      },
    },
  });
};

export const getUnreadCount = async (userId: string): Promise<number> =>
  prisma.notificationRecipient.count({
    where: { userId, readAt: null },
  });

export const markNotificationsRead = async (
  userId: string,
  ids?: string[]
): Promise<number> => {
  const now = new Date();
  if (ids && ids.length > 0) {
    const result = await prisma.notificationRecipient.updateMany({
      where: {
        userId,
        readAt: null,
        notificationId: { in: ids },
      },
      data: { readAt: now },
    });
    return result.count;
  }

  const result = await prisma.notificationRecipient.updateMany({
    where: { userId, readAt: null },
    data: { readAt: now },
  });
  return result.count;
};

export const listNotificationsForUser = async (
  userId: string,
  options: { limit: number; cursor?: string }
) => {
  const recipients = await prisma.notificationRecipient.findMany({
    where: { userId },
    take: options.limit + 1,
    ...(options.cursor && {
      cursor: { id: options.cursor },
      skip: 1,
    }),
    orderBy: { notification: { createdAt: 'desc' } },
    include: {
      notification: {
        include: {
          competition: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  const hasMore = recipients.length > options.limit;
  const items = hasMore ? recipients.slice(0, options.limit) : recipients;

  return {
    items: items.map((r) => ({
      id: r.notification.id,
      recipientId: r.id,
      type: r.notification.type,
      title: r.notification.title,
      body: r.notification.body,
      matchId: r.notification.matchId,
      readAt: r.readAt,
      createdAt: r.notification.createdAt,
      competition: r.notification.competition,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
};
