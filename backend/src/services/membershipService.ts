import { prisma } from '../config/prisma';
import { CompetitionRole } from '@prisma/client';
import {
  Permission,
  OWNER_IMPLICIT_PERMISSIONS,
  filterAssignablePermissions,
} from '../lib/permissions';
import { forbidden, notFound } from '../lib/AppError';

export interface MembershipContext {
  role: CompetitionRole;
  permissions: Permission[];
}

export const getMembership = async (
  competitionId: string,
  userId: string
): Promise<MembershipContext | null> => {
  const member = await prisma.competitionMember.findUnique({
    where: {
      competitionId_userId: { competitionId, userId },
    },
  });

  if (!member) return null;

  if (member.role === CompetitionRole.OWNER) {
    return { role: member.role, permissions: OWNER_IMPLICIT_PERMISSIONS };
  }

  return {
    role: member.role,
    permissions: filterAssignablePermissions(member.permissions),
  };
};

export const getViewerPermissions = async (
  competitionId: string,
  userId: string | undefined
): Promise<Permission[]> => {
  if (!userId) return [];
  const membership = await getMembership(competitionId, userId);
  return membership?.permissions ?? [];
};

export const requireMembershipPermission = async (
  competitionId: string,
  userId: string | undefined,
  permission: Permission
) => {
  if (!userId) {
    throw forbidden('Authentication required');
  }

  const membership = await getMembership(competitionId, userId);
  if (!membership) {
    throw forbidden('You are not a member of this tournament');
  }

  if (!membership.permissions.includes(permission)) {
    throw forbidden(`Missing permission: ${permission}`);
  }

  return membership;
};

export const createOwnerMembership = async (
  competitionId: string,
  ownerId: string
) => {
  return prisma.competitionMember.create({
    data: {
      competitionId,
      userId: ownerId,
      role: CompetitionRole.OWNER,
      permissions: [],
    },
  });
};

export const getCompetitionOrThrow = async (competitionId: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
  });
  if (!competition) {
    throw notFound('Competition not found');
  }
  return competition;
};

export const resolveCompetitionIdFromTeam = async (teamId: string) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { competitionId: true },
  });
  if (!team) throw notFound('Team not found');
  return team.competitionId;
};

export const resolveCompetitionIdFromMatch = async (matchId: string) => {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { competitionId: true },
  });
  if (!match) throw notFound('Match not found');
  return match.competitionId;
};

export const resolveCompetitionIdFromPlayer = async (playerId: string) => {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { team: { select: { competitionId: true } } },
  });
  if (!player) throw notFound('Player not found');
  return player.team.competitionId;
};
