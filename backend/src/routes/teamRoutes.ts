import { Router } from 'express';
import { addTeam, updateTeam, deleteTeam } from '../controllers/teamController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/competition/:competitionId', authenticateToken, addTeam);
router.patch('/:id', authenticateToken, updateTeam);
router.delete('/:id', authenticateToken, deleteTeam);

export default router;
