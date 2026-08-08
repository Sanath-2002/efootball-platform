import { Router } from 'express';
import { getTeam, updateTeam, deleteTeam } from '../controllers/teamController';
import {
  listPlayers,
  addPlayer,
  reorderPlayers,
  setTeamCaptain,
} from '../controllers/playerController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';
import { requireMembership } from '../middleware/requireMembership';
import { validate } from '../middleware/validate';
import {
  updateTeamSchema,
  createPlayerSchema,
  reorderPlayersSchema,
} from '../validators/schemas';
import { PERMISSIONS } from '../lib/permissions';
import { z } from 'zod';

const router = Router();

router.use(authenticateToken);

router.get(
  '/:id',
  requireMembership({ from: 'team', key: 'id' }),
  getTeam
);
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.TEAMS_MANAGE, { from: 'team', key: 'id' }),
  validate(updateTeamSchema),
  updateTeam
);
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.TEAMS_MANAGE, { from: 'team', key: 'id' }),
  deleteTeam
);

router.get(
  '/:teamId/players',
  requireMembership({ from: 'team', key: 'teamId' }),
  listPlayers
);
router.post(
  '/:teamId/players',
  requirePermission(PERMISSIONS.PLAYERS_MANAGE, { from: 'team', key: 'teamId' }),
  validate(createPlayerSchema),
  addPlayer
);
router.patch(
  '/:teamId/players/reorder',
  requirePermission(PERMISSIONS.PLAYERS_MANAGE, { from: 'team', key: 'teamId' }),
  validate(reorderPlayersSchema),
  reorderPlayers
);
router.patch(
  '/:teamId/captain',
  requirePermission(PERMISSIONS.PLAYERS_MANAGE, { from: 'team', key: 'teamId' }),
  validate(z.object({ playerId: z.string().uuid().nullable() })),
  setTeamCaptain
);

export default router;
