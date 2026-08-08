import { Router } from 'express';
import {
  updatePlayer,
  deletePlayer,
  transferPlayer,
} from '../controllers/playerController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';
import { validate } from '../middleware/validate';
import { updatePlayerSchema, transferPlayerSchema } from '../validators/schemas';
import { PERMISSIONS } from '../lib/permissions';

const router = Router();

router.use(authenticateToken);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PLAYERS_MANAGE, { from: 'player', key: 'id' }),
  validate(updatePlayerSchema),
  updatePlayer
);
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PLAYERS_MANAGE, { from: 'player', key: 'id' }),
  deletePlayer
);
router.post(
  '/:id/transfer',
  requirePermission(PERMISSIONS.PLAYERS_MANAGE, { from: 'player', key: 'id' }),
  validate(transferPlayerSchema),
  transferPlayer
);

export default router;
