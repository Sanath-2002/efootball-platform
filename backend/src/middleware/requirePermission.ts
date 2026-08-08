import { Response, NextFunction } from 'express';
import { Permission } from '../lib/permissions';
import { AuthRequest } from './auth';
import {
  requireMembershipPermission,
  resolveCompetitionIdFromTeam,
  resolveCompetitionIdFromMatch,
  resolveCompetitionIdFromPlayer,
} from '../services/membershipService';
import { badRequest } from '../lib/AppError';

type CompetitionIdSource =
  | { from: 'params'; key: string }
  | { from: 'body'; key: string }
  | { from: 'team'; key: string }
  | { from: 'match'; key: string }
  | { from: 'player'; key: string };

export const requirePermission = (permission: Permission, source: CompetitionIdSource) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let competitionId: string | undefined;

      switch (source.from) {
        case 'params':
        case 'body':
          competitionId = (req[source.from] as Record<string, string>)?.[source.key];
          break;
        case 'team':
          competitionId = await resolveCompetitionIdFromTeam(req.params[source.key]);
          break;
        case 'match':
          competitionId = await resolveCompetitionIdFromMatch(req.params[source.key]);
          break;
        case 'player':
          competitionId = await resolveCompetitionIdFromPlayer(req.params[source.key]);
          break;
      }

      if (!competitionId) {
        throw badRequest('Competition context required');
      }

      const membership = await requireMembershipPermission(
        competitionId,
        req.user?.id,
        permission
      );

      req.competitionId = competitionId;
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};
