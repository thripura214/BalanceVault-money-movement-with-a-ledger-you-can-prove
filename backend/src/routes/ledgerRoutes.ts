import { Router } from 'express';
import {
  verifyChain,
  getProof,
  getRecentLedgerEntries,
  verifySingleEntry
} from '../controllers/ledgerController';

const router = Router();

// Publicly auditable cryptographic verification endpoints
router.get('/verify', verifyChain);
router.get('/proof/:transactionId', getProof);
router.get('/entries', getRecentLedgerEntries);
router.get('/entry/:entryIndex/verify', verifySingleEntry);

export default router;

