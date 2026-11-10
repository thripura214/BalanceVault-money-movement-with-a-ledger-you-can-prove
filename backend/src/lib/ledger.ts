import crypto from 'crypto';
import { PrismaClient, LedgerEntryType } from '@prisma/client';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface LedgerEntryPayload {
  transactionId: string;
  accountId: string;
  entryType: LedgerEntryType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  timestamp?: Date;
}

/**
 * Computes the SHA-256 cryptographic hash of a ledger entry
 */
export function computeEntryHash(
  prevHash: string,
  entryIndex: number,
  transactionId: string,
  accountId: string,
  entryType: string,
  amount: number,
  balanceAfter: number,
  timestamp: string | Date
): string {
  const ts = timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
  // Fixed precision to avoid floating point ambiguity in hash representation
  const amountStr = Number(amount).toFixed(2);
  const balanceStr = Number(balanceAfter).toFixed(2);

  const payload = `${prevHash}|${entryIndex}|${transactionId}|${accountId}|${entryType}|${amountStr}|${balanceStr}|${ts}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Appends a new verified entry to the tamper-evident cryptographic ledger chain
 */
export async function appendLedgerEntry(
  txPrisma: any,
  data: LedgerEntryPayload
) {
  // Fetch the latest ledger entry to get the previous hash and index
  const lastEntry = await txPrisma.ledgerEntry.findFirst({
    orderBy: { entryIndex: 'desc' }
  });

  const nextIndex = lastEntry ? lastEntry.entryIndex + 1 : 1;
  const prevHash = lastEntry ? lastEntry.hash : GENESIS_HASH;
  const timestamp = data.timestamp || new Date();

  const hash = computeEntryHash(
    prevHash,
    nextIndex,
    data.transactionId,
    data.accountId,
    data.entryType,
    data.amount,
    data.balanceAfter,
    timestamp
  );

  const entry = await txPrisma.ledgerEntry.create({
    data: {
      entryIndex: nextIndex,
      transactionId: data.transactionId,
      accountId: data.accountId,
      entryType: data.entryType,
      amount: data.amount,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      timestamp,
      prevHash,
      hash
    }
  });

  return entry;
}

export interface VerificationResult {
  isValid: boolean;
  totalEntries: number;
  tamperedIndex?: number;
  error?: string;
  chainHeadHash?: string;
  verifiedAt: string;
}

/**
 * Verifies the mathematical and cryptographic integrity of the entire ledger chain
 */
export async function verifyLedgerChain(prisma: PrismaClient): Promise<VerificationResult> {
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: { entryIndex: 'asc' }
  });

  if (entries.length === 0) {
    return {
      isValid: true,
      totalEntries: 0,
      chainHeadHash: GENESIS_HASH,
      verifiedAt: new Date().toISOString()
    };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // 1. Check sequence index
    if (entry.entryIndex !== i + 1) {
      return {
        isValid: false,
        totalEntries: entries.length,
        tamperedIndex: entry.entryIndex,
        error: `Sequence gap detected: expected index ${i + 1}, got ${entry.entryIndex}`,
        verifiedAt: new Date().toISOString()
      };
    }

    // 2. Check previous hash continuity
    if (entry.prevHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        tamperedIndex: entry.entryIndex,
        error: `Broken chain link at index ${entry.entryIndex}: expected prevHash ${expectedPrevHash}, got ${entry.prevHash}`,
        verifiedAt: new Date().toISOString()
      };
    }

    // 3. Recompute SHA-256 hash of this entry
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

    if (recomputedHash !== entry.hash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        tamperedIndex: entry.entryIndex,
        error: `Hash mismatch at index ${entry.entryIndex}: data tampering detected. Expected ${entry.hash}, recomputed ${recomputedHash}`,
        verifiedAt: new Date().toISOString()
      };
    }

    // 4. Verify balance arithmetic
    const expectedBalanceAfter = entry.entryType === LedgerEntryType.CREDIT
      ? Number((entry.balanceBefore + entry.amount).toFixed(2))
      : Number((entry.balanceBefore - entry.amount).toFixed(2));

    if (Math.abs(expectedBalanceAfter - entry.balanceAfter) > 0.001) {
      return {
        isValid: false,
        totalEntries: entries.length,
        tamperedIndex: entry.entryIndex,
        error: `Balance arithmetic violation at index ${entry.entryIndex}: ${entry.balanceBefore} +/- ${entry.amount} != ${entry.balanceAfter}`,
        verifiedAt: new Date().toISOString()
      };
    }

    expectedPrevHash = entry.hash;
  }

  return {
    isValid: true,
    totalEntries: entries.length,
    chainHeadHash: expectedPrevHash,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Generates an exportable cryptographic proof certificate for a single transaction
 */
export async function getTransactionProof(prisma: PrismaClient, transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      senderAccount: { include: { user: { select: { fullName: true, email: true } } } },
      recipientAccount: { include: { user: { select: { fullName: true, email: true } } } },
      ledgerEntries: { orderBy: { entryIndex: 'asc' } }
    }
  });

  if (!transaction) {
    return null;
  }

  const entriesWithProofs = transaction.ledgerEntries.map(entry => {
    const verifiedHash = computeEntryHash(
      entry.prevHash,
      entry.entryIndex,
      entry.transactionId,
      entry.accountId,
      entry.entryType,
      entry.amount,
      entry.balanceAfter,
      entry.timestamp
    );

    return {
      index: entry.entryIndex,
      accountId: entry.accountId,
      entryType: entry.entryType,
      amount: entry.amount,
      balanceAfter: entry.balanceAfter,
      timestamp: entry.timestamp.toISOString(),
      prevHash: entry.prevHash,
      hash: entry.hash,
      isCryptographicallyValid: verifiedHash === entry.hash
    };
  });

  return {
    certificateType: "BalanceVault Provable Ledger Certificate",
    version: "1.0",
    generatedAt: new Date().toISOString(),
    transaction: {
      id: transaction.id,
      reference: transaction.reference,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      createdAt: transaction.createdAt.toISOString(),
      sender: transaction.senderAccount ? {
        accountNumber: transaction.senderAccount.accountNumber,
        holderName: transaction.senderAccount.user.fullName
      } : null,
      recipient: transaction.recipientAccount ? {
        accountNumber: transaction.recipientAccount.accountNumber,
        holderName: transaction.recipientAccount.user.fullName
      } : null
    },
    ledgerProofs: entriesWithProofs,
    isProvable: entriesWithProofs.every(e => e.isCryptographicallyValid)
  };
}

