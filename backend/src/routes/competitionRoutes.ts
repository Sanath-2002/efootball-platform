import { Router } from 'express';
import {
  createCompetition,
  getMyCompetitions,
  getCompetitionById,
  updateCompetition,
  deleteCompetition,
  getPublicCompetitionBySlug,
} from '../controllers/competitionController';
import {
  followCompetition,
  unfollowCompetition,
} from '../controllers/notificationController';
import {
  listMembers,
  inviteMember,
  updateMember,
  removeMember,
} from '../controllers/memberController';
import { listTeams, addTeam } from '../controllers/teamController';
import { createMatch } from '../controllers/matchController';
import {
  listPublicAnnouncements,
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController';
import {
  listPublicAwards,
  listAwards,
  createAward,
  updateAward,
  deleteAward,
} from '../controllers/awardController';
import { exportReport } from '../controllers/exportController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';
import { requireMembership } from '../middleware/requireMembership';
import { validate } from '../middleware/validate';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  createTeamSchema,
  inviteMemberSchema,
  updateMemberSchema,
  createMatchSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  createAwardSchema,
  updateAwardSchema,
} from '../validators/schemas';
import { PERMISSIONS } from '../lib/permissions';

const router = Router();

router.get('/public/:slug', getPublicCompetitionBySlug);
router.get('/public/:slug/announcements', listPublicAnnouncements);
router.get('/public/:slug/awards', listPublicAwards);

router.use(authenticateToken);

router.post('/:id/follow', followCompetition);
router.delete('/:id/follow', unfollowCompetition);

router.post('/', validate(createCompetitionSchema), createCompetition);
router.get('/my', getMyCompetitions);
router.get('/:id', getCompetitionById);
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.TOURNAMENT_EDIT, { from: 'params', key: 'id' }),
  validate(updateCompetitionSchema),
  updateCompetition
);
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.TOURNAMENT_DELETE, { from: 'params', key: 'id' }),
  deleteCompetition
);

router.get(
  '/:id/members',
  requirePermission(PERMISSIONS.COORDINATORS_MANAGE, { from: 'params', key: 'id' }),
  listMembers
);
router.post(
  '/:id/members',
  requirePermission(PERMISSIONS.COORDINATORS_MANAGE, { from: 'params', key: 'id' }),
  validate(inviteMemberSchema),
  inviteMember
);
router.patch(
  '/:id/members/:userId',
  requirePermission(PERMISSIONS.COORDINATORS_MANAGE, { from: 'params', key: 'id' }),
  validate(updateMemberSchema),
  updateMember
);
router.delete(
  '/:id/members/:userId',
  requirePermission(PERMISSIONS.COORDINATORS_MANAGE, { from: 'params', key: 'id' }),
  removeMember
);

router.get(
  '/:competitionId/teams',
  requireMembership({ from: 'params', key: 'competitionId' }),
  listTeams
);
router.post(
  '/:competitionId/teams',
  requirePermission(PERMISSIONS.TEAMS_MANAGE, { from: 'params', key: 'competitionId' }),
  validate(createTeamSchema),
  addTeam
);
router.post(
  '/:competitionId/matches',
  requirePermission(PERMISSIONS.FIXTURES_MANAGE, { from: 'params', key: 'competitionId' }),
  validate(createMatchSchema),
  createMatch
);

router.get('/:id/announcements', requireMembership({ from: 'params', key: 'id' }), listAnnouncements);
router.post(
  '/:id/announcements',
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_PUBLISH, { from: 'params', key: 'id' }),
  validate(createAnnouncementSchema),
  createAnnouncement
);
router.patch(
  '/:id/announcements/:announcementId',
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_PUBLISH, { from: 'params', key: 'id' }),
  validate(updateAnnouncementSchema),
  updateAnnouncement
);
router.delete(
  '/:id/announcements/:announcementId',
  requirePermission(PERMISSIONS.ANNOUNCEMENTS_PUBLISH, { from: 'params', key: 'id' }),
  deleteAnnouncement
);

router.get('/:id/awards', requireMembership({ from: 'params', key: 'id' }), listAwards);
router.post(
  '/:id/awards',
  requirePermission(PERMISSIONS.TOURNAMENT_EDIT, { from: 'params', key: 'id' }),
  validate(createAwardSchema),
  createAward
);
router.patch(
  '/:id/awards/:awardId',
  requirePermission(PERMISSIONS.TOURNAMENT_EDIT, { from: 'params', key: 'id' }),
  validate(updateAwardSchema),
  updateAward
);
router.delete(
  '/:id/awards/:awardId',
  requirePermission(PERMISSIONS.TOURNAMENT_EDIT, { from: 'params', key: 'id' }),
  deleteAward
);

router.get(
  '/:id/export/:reportType',
  requirePermission(PERMISSIONS.REPORTS_VIEW, { from: 'params', key: 'id' }),
  exportReport
);

export default router;
