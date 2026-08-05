import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/me', authenticateToken, getMe);

export default router;
