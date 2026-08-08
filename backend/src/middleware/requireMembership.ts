import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getMembership } from '../services/membershipService';
import { forbidden, badRequest } from '../lib/AppError';

type CompetitionIdSource =
  | { from: 'params'; key: string }
  | { from: 'team'; key: string }
  | { from: 'match'; key: string }
  | { from: 'player'; key: string };

const resolveCompetitionId = async (req: AuthRequest, source: CompetitionIdSource): Promise<string> => {
  switch (source.from) {
    case 'params':
      return req.params[source.key];
    case 'team': {
      const { resolveCompetitionIdFromTeam } = await import('../services/membershipService');
      return resolveCompetitionIdFromTeam(req.params[source.key]);
    }
    case 'match': {
      const { resolveCompetitionIdFromMatch } = await import('../services/membershipService');
      return resolveCompetitionIdFromMatch(req.params[source.key]);
    }
    case 'player': {
      const { resolveCompetitionIdFromPlayer } = await import('../services/membershipService');
      return resolveCompetitionIdFromPlayer(req.params[source.key]);
    }
  }
};

/** Requires user to be any member of the tournament (view access) */
export const requireMembership = (source: CompetitionIdSource) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const competitionId = await resolveCompetitionId(req, source);
      if (!competitionId) throw badRequest('Competition context required');

      const membership = await getMembership(competitionId, req.user!.id);
      if (!membership) throw forbidden('You are not a member of this tournament');

      req.competitionId = competitionId;
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};
