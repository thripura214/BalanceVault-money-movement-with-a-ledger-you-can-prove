import { Router } from 'express';
import {
  getMyAccounts,
  depositFunds,
  transferFunds,
  getAccountTransactions,
  submitKyc
} from '../controllers/accountController';
import { requireAuth } from '../middleware/auth';
import { strictAuthLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth);

router.get('/', getMyAccounts);
router.post('/kyc', submitKyc);
router.post('/deposit', depositFunds);
router.post('/transfer', strictAuthLimiter, transferFunds);
router.get('/:accountId/transactions', getAccountTransactions);

export default router;
