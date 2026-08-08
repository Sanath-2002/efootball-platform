import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest, notFound } from '../lib/AppError';
import { PlayerPlatform } from '@prisma/client';
import { CompetitionStatus } from '@prisma/client';

export const listPlayers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { teamId } = req.params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw notFound('Team not found');

  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: { sortOrder: 'asc' },
  });

  return res.json(players);
});

export const addPlayer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { teamId } = req.params;
  const { name, gamerTag, platform, jerseyNumber, position, preferredClub, notes } = req.body;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { competition: true, _count: { select: { players: true } } },
  });

  if (!team) throw notFound('Team not found');

  if (team.competition.status !== CompetitionStatus.DRAFT) {
    throw badRequest('Cannot add players after competition has started');
  }

  if (jerseyNumber != null) {
    const existingJersey = await prisma.player.findFirst({
      where: { teamId, jerseyNumber },
    });
    if (existingJersey) {
      throw badRequest(`Jersey number ${jerseyNumber} is already taken on this team`);
    }
  }

  const player = await prisma.player.create({
    data: {
      teamId,
      name: name.trim(),
      gamerTag: gamerTag?.trim() || null,
      platform: platform as PlayerPlatform | null,
      jerseyNumber: jerseyNumber ?? null,
      position: position?.trim() || null,
      preferredClub: preferredClub?.trim() || null,
      notes: notes || null,
      sortOrder: team._count.players,
    },
  });

  return res.status(201).json(player);
});

export const updatePlayer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, gamerTag, platform, jerseyNumber, position, preferredClub, notes } = req.body;

  const player = await prisma.player.findUnique({
    where: { id },
    include: { team: { include: { competition: true } } },
  });

  if (!player) throw notFound('Player not found');

  if (player.team.competition.status !== CompetitionStatus.DRAFT) {
    throw badRequest('Cannot edit players after competition has started');
  }

  if (jerseyNumber != null && jerseyNumber !== player.jerseyNumber) {
    const existingJersey = await prisma.player.findFirst({
      where: { teamId: player.teamId, jerseyNumber, id: { not: id } },
    });
    if (existingJersey) {
      throw badRequest(`Jersey number ${jerseyNumber} is already taken on this team`);
    }
  }

  const updated = await prisma.player.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(gamerTag !== undefined && { gamerTag: gamerTag?.trim() || null }),
      ...(platform !== undefined && { platform: platform as PlayerPlatform | null }),
      ...(jerseyNumber !== undefined && { jerseyNumber }),
      ...(position !== undefined && { position: position?.trim() || null }),
      ...(preferredClub !== undefined && { preferredClub: preferredClub?.trim() || null }),
      ...(notes !== undefined && { notes }),
    },
  });

  return res.json(updated);
});

export const deletePlayer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const player = await prisma.player.findUnique({
    where: { id },
    include: { team: { include: { competition: true } } },
  });

  if (!player) throw notFound('Player not found');

  if (player.team.competition.status !== CompetitionStatus.DRAFT) {
    throw badRequest('Cannot remove players after competition has started');
  }

  if (player.team.captainId === id) {
    await prisma.team.update({
      where: { id: player.teamId },
      data: { captainId: null },
    });
  }

  await prisma.player.delete({ where: { id } });
  return res.json({ message: 'Player removed successfully' });
});

export const reorderPlayers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { teamId } = req.params;
  const { playerIds } = req.body;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { players: true, competition: true },
  });

  if (!team) throw notFound('Team not found');

  if (team.competition.status !== CompetitionStatus.DRAFT) {
    throw badRequest('Cannot reorder players after competition has started');
  }

  const teamPlayerIds = new Set(team.players.map((p) => p.id));
  if (playerIds.length !== team.players.length || !playerIds.every((id: string) => teamPlayerIds.has(id))) {
    throw badRequest('playerIds must include all players on the team exactly once');
  }

  await prisma.$transaction(
    playerIds.map((playerId: string, index: number) =>
      prisma.player.update({
        where: { id: playerId },
        data: { sortOrder: index },
      })
    )
  );

  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: { sortOrder: 'asc' },
  });

  return res.json(players);
});

export const transferPlayer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { toTeamId, notes } = req.body;

  const player = await prisma.player.findUnique({
    where: { id },
    include: { team: { include: { competition: true } } },
  });

  if (!player) throw notFound('Player not found');

  if (player.team.competition.status !== CompetitionStatus.DRAFT) {
    throw badRequest('Cannot transfer players after competition has started');
  }

  const toTeam = await prisma.team.findUnique({
    where: { id: toTeamId },
    include: { _count: { select: { players: true } } },
  });

  if (!toTeam) throw notFound('Destination team not found');

  if (toTeam.competitionId !== player.team.competitionId) {
    throw badRequest('Cannot transfer players between different tournaments');
  }

  if (toTeamId === player.teamId) {
    throw badRequest('Player is already on this team');
  }

  if (player.jerseyNumber != null) {
    const jerseyConflict = await prisma.player.findFirst({
      where: { teamId: toTeamId, jerseyNumber: player.jerseyNumber },
    });
    if (jerseyConflict) {
      throw badRequest(`Jersey number ${player.jerseyNumber} is already taken on the destination team`);
    }
  }

  if (player.team.captainId === id) {
    await prisma.team.update({
      where: { id: player.teamId },
      data: { captainId: null },
    });
  }

  const [transfer, updatedPlayer] = await prisma.$transaction([
    prisma.playerTransfer.create({
      data: {
        playerId: id,
        fromTeamId: player.teamId,
        toTeamId,
        notes: notes || null,
      },
    }),
    prisma.player.update({
      where: { id },
      data: { teamId: toTeamId, sortOrder: toTeam._count.players },
    }),
  ]);

  return res.json({ player: updatedPlayer, transfer });
});

export const setTeamCaptain = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { teamId } = req.params;
  const { playerId } = req.body;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { competition: true },
  });

  if (!team) throw notFound('Team not found');

  if (playerId) {
    const player = await prisma.player.findFirst({
      where: { id: playerId, teamId },
    });
    if (!player) throw badRequest('Player must belong to this team');
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { captainId: playerId || null },
    include: { players: { orderBy: { sortOrder: 'asc' } }, captain: true },
  });

  return res.json(updated);
});
