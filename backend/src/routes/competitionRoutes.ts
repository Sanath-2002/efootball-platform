import { Router } from 'express';
import {
  createCompetition,
  getMyCompetitions,
  getCompetitionById,
  updateCompetition,
  deleteCompetition,
  getPublicCompetitionBySlug,
} from '../controllers/competitionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public link route
router.get('/public/:slug', getPublicCompetitionBySlug);

// Protected routes for Coordinators
router.post('/', authenticateToken, createCompetition);
router.get('/my', authenticateToken, getMyCompetitions);
router.get('/:id', getCompetitionById); // Accessible publicly or authenticated
router.patch('/:id', authenticateToken, updateCompetition);
router.delete('/:id', authenticateToken, deleteCompetition);

export default router;
