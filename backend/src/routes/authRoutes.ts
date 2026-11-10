import { Router } from 'express';
import {
  register,
  login,
  bootstrapFirstAdmin,
  checkBootstrapStatus,
  getProfile
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { strictAuthLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/bootstrap-status', checkBootstrapStatus);
router.post('/bootstrap-admin', strictAuthLimiter, bootstrapFirstAdmin);
router.post('/register', strictAuthLimiter, register);
router.post('/login', strictAuthLimiter, login);
router.get('/me', requireAuth, getProfile);

export default router;

