import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

// Helper to generate URL-friendly slug
const generateSlug = (name: string): string => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  return base || 'competition';
};

export const createCompetition = async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, format } = req.body;
    const coordinatorId = req.user?.id;

    if (!coordinatorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type (TOURNAMENT or LEAGUE) are required' });
    }

    if (!['TOURNAMENT', 'LEAGUE'].includes(type)) {
      return res.status(400).json({ error: 'Invalid competition type' });
    }

    let slug = generateSlug(name);
    let existing = await prisma.competition.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const competition = await prisma.competition.create({
      data: {
        name,
        slug,
        type,
        format: format || 'BO1',
        status: 'DRAFT',
        coordinatorId,
      },
    });

    return res.status(201).json(competition);
  } catch (error: any) {
    console.error('Create competition error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyCompetitions = async (req: AuthRequest, res: Response) => {
  try {
    const coordinatorId = req.user?.id;
    if (!coordinatorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const competitions = await prisma.competition.findMany({
      where: { coordinatorId },
      include: {
        _count: {
          select: { teams: true, matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(competitions);
  } catch (error: any) {
    console.error('Get my competitions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCompetitionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        coordinator: { select: { id: true, name: true, email: true } },
        teams: { orderBy: { name: 'asc' } },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            winner: true,
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
      },
    });

    if (!competition) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    return res.json(competition);
  } catch (error: any) {
    console.error('Get competition error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCompetition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, format } = req.body;
    const coordinatorId = req.user?.id;

    const existing = await prisma.competition.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    if (existing.coordinatorId !== coordinatorId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this competition' });
    }

    const updated = await prisma.competition.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        format: format !== undefined ? format : existing.format,
      },
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Update competition error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCompetition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const coordinatorId = req.user?.id;

    const existing = await prisma.competition.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    if (existing.coordinatorId !== coordinatorId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this competition' });
    }

    await prisma.competition.delete({ where: { id } });
    return res.json({ message: 'Competition deleted successfully' });
  } catch (error: any) {
    console.error('Delete competition error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPublicCompetitionBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const competition = await prisma.competition.findUnique({
      where: { slug },
      include: {
        coordinator: { select: { name: true } },
        teams: { orderBy: { name: 'asc' } },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            winner: true,
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
      },
    });

    if (!competition) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    return res.json(competition);
  } catch (error: any) {
    console.error('Get public competition error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
