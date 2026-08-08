import { Router } from 'express';
import {
  generateFixturesOrBracket,
  generateKnockoutPhase,
  createMatch,
  updateFixture,
  deleteMatch,
  updateScore,
  updateMatchStatus,
  updateMatchDetails,
  uploadScreenshot,
  deleteScreenshot,
  getStandings,
  getGroups,
  getStats,
  getMatch,
  screenshotUpload,
} from '../controllers/matchController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';
import { requireMembership } from '../middleware/requireMembership';
import { validate } from '../middleware/validate';
import {
  updateScoreSchema,
  updateMatchStatusSchema,
  updateMatchDetailsSchema,
  updateFixtureSchema,
} from '../validators/schemas';
import { PERMISSIONS } from '../lib/permissions';

const router = Router();

router.get('/competition/:competitionId/standings', getStandings);
router.get('/competition/:competitionId/groups', getGroups);
router.get('/competition/:competitionId/stats', getStats);

router.use(authenticateToken);

router.get('/:id', requireMembership({ from: 'match', key: 'id' }), getMatch);
router.post(
  '/competition/:competitionId/generate',
  requirePermission(PERMISSIONS.FIXTURES_MANAGE, { from: 'params', key: 'competitionId' }),
  generateFixturesOrBracket
);
router.post(
  '/competition/:competitionId/generate-knockout',
  requirePermission(PERMISSIONS.FIXTURES_MANAGE, { from: 'params', key: 'competitionId' }),
  generateKnockoutPhase
);
router.patch(
  '/:id/score',
  requirePermission(PERMISSIONS.SCORES_UPDATE, { from: 'match', key: 'id' }),
  validate(updateScoreSchema),
  updateScore
);
router.patch(
  '/:id/status',
  requireMembership({ from: 'match', key: 'id' }),
  validate(updateMatchStatusSchema),
  updateMatchStatus
);
router.patch(
  '/:id/fixture',
  requirePermission(PERMISSIONS.FIXTURES_MANAGE, { from: 'match', key: 'id' }),
  validate(updateFixtureSchema),
  updateFixture
);
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.FIXTURES_MANAGE, { from: 'match', key: 'id' }),
  deleteMatch
);
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.FIXTURES_MANAGE, { from: 'match', key: 'id' }),
  validate(updateMatchDetailsSchema),
  updateMatchDetails
);
router.post(
  '/:id/screenshots',
  requirePermission(PERMISSIONS.SCORES_UPDATE, { from: 'match', key: 'id' }),
  screenshotUpload.single('image'),
  uploadScreenshot
);
router.delete(
  '/:id/screenshots/:screenshotId',
  requirePermission(PERMISSIONS.SCORES_UPDATE, { from: 'match', key: 'id' }),
  deleteScreenshot
);

export default router;
