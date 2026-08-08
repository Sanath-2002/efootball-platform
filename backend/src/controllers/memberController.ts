import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest, notFound } from '../lib/AppError';
import { CompetitionRole } from '@prisma/client';
import {
  filterAssignablePermissions,
  PERMISSION_LABELS,
  ASSIGNABLE_PERMISSIONS,
} from '../lib/permissions';

export const listMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: competitionId } = req.params;

  const members = await prisma.competitionMember.findMany({
    where: { competitionId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      invitedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  return res.json({
    members,
    assignablePermissions: ASSIGNABLE_PERMISSIONS.map((p) => ({
      key: p,
      label: PERMISSION_LABELS[p],
    })),
  });
});

export const inviteMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: competitionId } = req.params;
  const { email, permissions } = req.body;
  const inviterId = req.user?.id;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw badRequest('No user found with that email. They must register first.');
  }

  const existing = await prisma.competitionMember.findUnique({
    where: { competitionId_userId: { competitionId, userId: user.id } },
  });

  if (existing) {
    throw badRequest('User is already a member of this tournament');
  }

  const owner = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (owner?.ownerId === user.id) {
    throw badRequest('Tournament owner is already a member');
  }

  const validPermissions = filterAssignablePermissions(permissions);

  const member = await prisma.competitionMember.create({
    data: {
      competitionId,
      userId: user.id,
      role: CompetitionRole.COORDINATOR,
      permissions: validPermissions,
      invitedById: inviterId,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      invitedBy: { select: { id: true, name: true } },
    },
  });

  return res.status(201).json(member);
});

export const updateMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: competitionId, userId } = req.params;
  const { permissions } = req.body;

  const member = await prisma.competitionMember.findUnique({
    where: { competitionId_userId: { competitionId, userId } },
  });

  if (!member) throw notFound('Member not found');

  if (member.role === CompetitionRole.OWNER) {
    throw badRequest('Cannot modify owner permissions');
  }

  const validPermissions = filterAssignablePermissions(permissions);

  const updated = await prisma.competitionMember.update({
    where: { competitionId_userId: { competitionId, userId } },
    data: { permissions: validPermissions },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return res.json(updated);
});

export const removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: competitionId, userId } = req.params;

  const member = await prisma.competitionMember.findUnique({
    where: { competitionId_userId: { competitionId, userId } },
  });

  if (!member) throw notFound('Member not found');

  if (member.role === CompetitionRole.OWNER) {
    throw badRequest('Cannot remove tournament owner');
  }

  await prisma.competitionMember.delete({
    where: { competitionId_userId: { competitionId, userId } },
  });

  return res.json({ message: 'Coordinator removed successfully' });
});
