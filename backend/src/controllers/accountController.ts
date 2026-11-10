import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, recordAuditLog } from '../middleware/auth';
import { appendLedgerEntry } from '../lib/ledger';
import {
  AccountStatus,
  OnboardingStatus,
  TransactionType,
  TransactionStatus,
  LedgerEntryType
} from '@prisma/client';

const depositSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive('Deposit amount must be greater than zero'),
  description: z.string().optional()
});

const transferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  recipientAccountNumber: z.string().min(5, 'Invalid recipient account number'),
  amount: z.number().positive('Transfer amount must be greater than zero'),
  description: z.string().optional(),
  idempotencyKey: z.string().optional()
});

const kycSchema = z.object({
  documentUrl: z.string().min(3, 'Document reference or national ID number required')
});

export async function submitKyc(req: AuthRequest, res: Response) {
  try {
    const validated = kycSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.errors[0].message });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        kycDocumentUrl: validated.data.documentUrl,
        onboardingStatus: OnboardingStatus.PENDING
      }
    });

    await recordAuditLog(
      req.user!.id,
      'KYC_SUBMISSION',
      req.user!.id,
      { documentRef: validated.data.documentUrl },
      req
    );

    return res.json({
      message: 'KYC documents submitted successfully. Verification pending administrator review.',
      onboardingStatus: updatedUser.onboardingStatus
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit KYC verification' });
  }
}

export async function getMyAccounts(req: AuthRequest, res: Response) {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user!.id },
      include: {
        sentTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { recipientAccount: { select: { accountNumber: true } } }
        },
        receivedTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { senderAccount: { select: { accountNumber: true } } }
        }
      }
    });

    return res.json({ accounts });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve accounts' });
  }
}

export async function depositFunds(req: AuthRequest, res: Response) {
  try {
    const validated = depositSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.errors[0].message });
    }

    const { accountId, amount, description } = validated.data;

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: req.user!.id }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }

    if (account.status !== AccountStatus.ACTIVE) {
      return res.status(403).json({
        error: `Account cannot receive deposits while in status: ${account.status}. Contact compliance.`
      });
    }

    const reference = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Execute atomic transaction and create cryptographically chained ledger entry
    const result = await prisma.$transaction(async (tx) => {
      const balanceBefore = account.balance;
      const balanceAfter = Number((balanceBefore + amount).toFixed(2));

      // 1. Create Transaction record
      const transaction = await tx.transaction.create({
        data: {
          reference,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount,
          recipientAccountId: account.id,
          description: description || 'Account fund deposit'
        }
      });

      // 2. Append cryptographically chained ledger entry (Credit)
      const ledgerEntry = await appendLedgerEntry(tx, {
        transactionId: transaction.id,
        accountId: account.id,
        entryType: LedgerEntryType.CREDIT,
        amount,
        balanceBefore,
        balanceAfter
      });

      // 3. Update account balance
      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: { balance: balanceAfter }
      });

      return { transaction, ledgerEntry, updatedAccount };
    });

    await recordAuditLog(
      req.user!.id,
      'DEPOSIT_EXECUTED',
      result.transaction.id,
      { amount, newBalance: result.updatedAccount.balance, ledgerHash: result.ledgerEntry.hash },
      req
    );

    return res.status(201).json({
      message: 'Deposit completed and sealed on cryptographic ledger.',
      transaction: result.transaction,
      ledgerProof: {
        entryIndex: result.ledgerEntry.entryIndex,
        prevHash: result.ledgerEntry.prevHash,
        hash: result.ledgerEntry.hash
      },
      currentBalance: result.updatedAccount.balance
    });
  } catch (err: any) {
    console.error('Deposit error:', err);
    return res.status(500).json({ error: 'Failed to process deposit' });
  }
}

export async function transferFunds(req: AuthRequest, res: Response) {
  try {
    const validated = transferSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.errors[0].message });
    }

    const { sourceAccountId, recipientAccountNumber, amount, description, idempotencyKey } = validated.data;

    // 1. Check idempotency if key provided
    const reference = idempotencyKey || `TXF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const existingTx = await prisma.transaction.findUnique({ where: { reference } });
    if (existingTx) {
      return res.status(200).json({
        message: 'Transaction already processed (Idempotency Key)',
        transaction: existingTx
      });
    }

    // 2. Verify source account
    const sourceAccount = await prisma.account.findFirst({
      where: { id: sourceAccountId, userId: req.user!.id }
    });

    if (!sourceAccount) {
      return res.status(404).json({ error: 'Source account not found or access denied' });
    }

    if (sourceAccount.status !== AccountStatus.ACTIVE) {
      return res.status(403).json({
        error: `Source account is not active. Current status: ${sourceAccount.status}`
      });
    }

    if (sourceAccount.balance < amount) {
      return res.status(400).json({
        error: `Insufficient funds. Available: $${sourceAccount.balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`
      });
    }

    // 3. Verify recipient account
    const recipientAccount = await prisma.account.findUnique({
      where: { accountNumber: recipientAccountNumber }
    });

    if (!recipientAccount) {
      return res.status(404).json({ error: `Recipient account "${recipientAccountNumber}" does not exist` });
    }

    if (recipientAccount.id === sourceAccount.id) {
      return res.status(400).json({ error: 'Cannot transfer funds to the same account' });
    }

    if (recipientAccount.status !== AccountStatus.ACTIVE) {
      return res.status(400).json({ error: 'Recipient account is not active' });
    }

    // 4. Atomic balanced double-entry transfer with cryptographic hash chaining
    const execution = await prisma.$transaction(async (tx) => {
      // Calculate balances
      const srcBalanceBefore = sourceAccount.balance;
      const srcBalanceAfter = Number((srcBalanceBefore - amount).toFixed(2));

      const destBalanceBefore = recipientAccount.balance;
      const destBalanceAfter = Number((destBalanceBefore + amount).toFixed(2));

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          reference,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          amount,
          senderAccountId: sourceAccount.id,
          recipientAccountId: recipientAccount.id,
          description: description || `Transfer to ${recipientAccountNumber}`
        }
      });

      // Append Debit entry to the ledger chain
      const debitEntry = await appendLedgerEntry(tx, {
        transactionId: transaction.id,
        accountId: sourceAccount.id,
        entryType: LedgerEntryType.DEBIT,
        amount,
        balanceBefore: srcBalanceBefore,
        balanceAfter: srcBalanceAfter
      });

      // Append Credit entry to the ledger chain
      const creditEntry = await appendLedgerEntry(tx, {
        transactionId: transaction.id,
        accountId: recipientAccount.id,
        entryType: LedgerEntryType.CREDIT,
        amount,
        balanceBefore: destBalanceBefore,
        balanceAfter: destBalanceAfter
      });

      // Update account balances
      const updatedSource = await tx.account.update({
        where: { id: sourceAccount.id },
        data: { balance: srcBalanceAfter }
      });

      await tx.account.update({
        where: { id: recipientAccount.id },
        data: { balance: destBalanceAfter }
      });

      return {
        transaction,
        debitProof: debitEntry,
        creditProof: creditEntry,
        newSourceBalance: updatedSource.balance
      };
    });

    await recordAuditLog(
      req.user!.id,
      'TRANSFER_EXECUTED',
      execution.transaction.id,
      {
        from: sourceAccount.accountNumber,
        to: recipientAccount.accountNumber,
        amount,
        debitHash: execution.debitProof.hash,
        creditHash: execution.creditProof.hash
      },
      req
    );

    return res.status(201).json({
      message: 'Money transfer completed successfully and sealed on the ledger.',
      transaction: execution.transaction,
      proofs: {
        debitLedgerIndex: execution.debitProof.entryIndex,
        debitHash: execution.debitProof.hash,
        creditLedgerIndex: execution.creditProof.entryIndex,
        creditHash: execution.creditProof.hash
      },
      sourceBalance: execution.newSourceBalance
    });
  } catch (err: any) {
    console.error('Transfer execution error:', err);
    return res.status(500).json({ error: 'Transfer failed due to a server error' });
  }
}

export async function getAccountTransactions(req: AuthRequest, res: Response) {
  try {
    const { accountId } = req.params;

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: req.user!.id }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderAccountId: accountId },
          { recipientAccountId: accountId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        senderAccount: { select: { accountNumber: true } },
        recipientAccount: { select: { accountNumber: true } },
        ledgerEntries: true
      }
    });

    return res.json({ transactions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve transaction history' });
  }
}
