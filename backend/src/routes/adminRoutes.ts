import { Router } from 'express';
import {
  listAllUsers,
  updateUserOnboarding,
  updateUserRole,
  getAuditLogs,
  getSystemMetrics
} from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Only ADMIN and AUDITOR roles can access admin endpoints
router.use(requireAuth);
router.use(requireRole([UserRole.ADMIN, UserRole.AUDITOR]));

router.get('/metrics', getSystemMetrics);
router.get('/users', listAllUsers);
router.patch('/users/:userId/onboarding', requireRole([UserRole.ADMIN]), updateUserOnboarding);
router.patch('/users/:userId/role', requireRole([UserRole.ADMIN]), updateUserRole);
router.get('/audit-logs', getAuditLogs);

export default router;
