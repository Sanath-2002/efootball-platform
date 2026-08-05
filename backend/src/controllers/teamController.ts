import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const addTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { competitionId } = req.params;
    const { name } = req.body;
    const coordinatorId = req.user?.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    if (competition.coordinatorId !== coordinatorId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this competition' });
    }

    if (competition.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Cannot add teams after fixtures or brackets have been generated',
      });
    }

    const trimmedName = name.trim();

    // Check duplicate case-insensitive
    const existing = await prisma.team.findFirst({
      where: {
        competitionId,
        name: { equals: trimmedName },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: `A team named "${trimmedName}" already exists in this competition`,
      });
    }

    const team = await prisma.team.create({
      data: {
        name: trimmedName,
        competitionId,
      },
    });

    return res.status(201).json(team);
  } catch (error: any) {
    console.error('Add team error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const coordinatorId = req.user?.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: { competition: true },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.competition.coordinatorId !== coordinatorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (team.competition.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Cannot edit teams after competition has started',
      });
    }

    const trimmedName = name.trim();

    const existing = await prisma.team.findFirst({
      where: {
        competitionId: team.competitionId,
        name: { equals: trimmedName },
        id: { not: id },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: `A team named "${trimmedName}" already exists in this competition`,
      });
    }

    const updated = await prisma.team.update({
      where: { id },
      data: { name: trimmedName },
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Update team error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const coordinatorId = req.user?.id;

    const team = await prisma.team.findUnique({
      where: { id },
      include: { competition: true },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.competition.coordinatorId !== coordinatorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (team.competition.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Cannot delete teams after competition has started',
      });
    }

    await prisma.team.delete({ where: { id } });
    return res.json({ message: 'Team removed successfully' });
  } catch (error: any) {
    console.error('Delete team error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
