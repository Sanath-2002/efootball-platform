import { Router } from 'express';
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  getFollowedCompetitions,
} from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { markNotificationsReadSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.post('/read', validate(markNotificationsReadSchema), markNotificationsRead);
router.get('/followed-competitions', getFollowedCompetitions);

export default router;
