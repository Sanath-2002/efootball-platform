import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateKnockoutBracket, generateRoundRobinFixtures } from '../services/generatorService';
import {
  updateMatchScoreAndRecalculate,
  calculateLeagueStandings,
  calculateCompetitionStats,
} from '../services/recalculationService';

export const generateFixturesOrBracket = async (req: AuthRequest, res: Response) => {
  try {
    const { competitionId } = req.params;
    const coordinatorId = req.user?.id;

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    if (competition.coordinatorId !== coordinatorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let result;
    if (competition.type === 'TOURNAMENT') {
      result = await generateKnockoutBracket(competitionId);
    } else {
      result = await generateRoundRobinFixtures(competitionId);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Generate fixtures error:', error);
    return res.status(400).json({ error: error.message || 'Failed to generate fixtures' });
  }
};

export const updateScore = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore } = req.body;
    const coordinatorId = req.user?.id;

    if (!coordinatorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await updateMatchScoreAndRecalculate(
      id,
      homeScore !== undefined && homeScore !== '' ? Number(homeScore) : null,
      awayScore !== undefined && awayScore !== '' ? Number(awayScore) : null,
      coordinatorId
    );

    return res.json(result);
  } catch (error: any) {
    console.error('Update score error:', error);
    return res.status(400).json({ error: error.message || 'Failed to update match score' });
  }
};

export const getStandings = async (req: Request, res: Response) => {
  try {
    const { competitionId } = req.params;
    const standings = await calculateLeagueStandings(competitionId);
    return res.json(standings);
  } catch (error: any) {
    console.error('Get standings error:', error);
    return res.status(500).json({ error: 'Failed to calculate standings' });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const { competitionId } = req.params;
    const stats = await calculateCompetitionStats(competitionId);
    return res.json(stats);
  } catch (error: any) {
    console.error('Get stats error:', error);
    return res.status(500).json({ error: 'Failed to calculate stats' });
  }
};
