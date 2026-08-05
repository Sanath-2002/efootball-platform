import { Router } from 'express';
import {
  generateFixturesOrBracket,
  updateScore,
  getStandings,
  getStats,
} from '../controllers/matchController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/competition/:competitionId/generate', authenticateToken, generateFixturesOrBracket);
router.patch('/:id/score', authenticateToken, updateScore);
router.get('/competition/:competitionId/standings', getStandings);
router.get('/competition/:competitionId/stats', getStats);

export default router;
