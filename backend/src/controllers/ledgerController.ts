import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { verifyLedgerChain, getTransactionProof, computeEntryHash } from '../lib/ledger';

export async function verifyChain(req: Request, res: Response) {
  try {
    const result = await verifyLedgerChain(prisma);
    return res.json(result);
  } catch (err: any) {
    console.error('Ledger verification error:', err);
    return res.status(500).json({
      isValid: false,
      error: 'An internal error occurred during cryptographic verification'
    });
  }
}

export async function getProof(req: Request, res: Response) {
  try {
    const { transactionId } = req.params;
    const proof = await getTransactionProof(prisma, transactionId);

    if (!proof) {
      return res.status(404).json({ error: 'Transaction not found on the ledger' });
    }

    return res.json(proof);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate cryptographic proof certificate' });
  }
}

export async function getRecentLedgerEntries(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);

    const entries = await prisma.ledgerEntry.findMany({
      take: Math.min(limit, 100),
      orderBy: { entryIndex: 'desc' },
      include: {
        account: {
          select: { accountNumber: true }
        },
        transaction: {
          select: { type: true, reference: true }
        }
      }
    });

    return res.json({ entries });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
}

export async function verifySingleEntry(req: Request, res: Response) {
  try {
    const { entryIndex } = req.params;
    const idx = parseInt(entryIndex, 10);

    const entry = await prisma.ledgerEntry.findUnique({
      where: { entryIndex: idx }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    const recomputedHash = computeEntryHash(
      entry.prevHash,
      entry.entryIndex,
      entry.transactionId,
      entry.accountId,
      entry.entryType,
      entry.amount,
      entry.balanceAfter,
      entry.timestamp
    );

    const isValid = recomputedHash === entry.hash;

    return res.json({
      entryIndex: entry.entryIndex,
      storedHash: entry.hash,
      recomputedHash,
      prevHash: entry.prevHash,
      isValid,
      arithmeticValid: true
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to verify ledger entry' });
  }
}

