import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, recordAuditLog } from '../middleware/auth';
import { OnboardingStatus, AccountStatus, UserRole } from '@prisma/client';

const statusUpdateSchema = z.object({
  onboardingStatus: z.nativeEnum(OnboardingStatus),
  accountStatus: z.nativeEnum(AccountStatus).optional()
});

const roleUpdateSchema = z.object({
  role: z.nativeEnum(UserRole)
});

export async function listAllUsers(req: AuthRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          onboardingStatus: true,
          kycDocumentUrl: true,
          phone: true,
          createdAt: true,
          accounts: {
            select: {
              id: true,
              accountNumber: true,
              balance: true,
              status: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve user directory' });
  }
}

export async function updateUserOnboarding(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const validated = statusUpdateSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.errors[0].message });
    }

    const { onboardingStatus, accountStatus } = validated.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine target account status based on onboarding
    let newAccStatus = accountStatus;
    if (!newAccStatus) {
      if (onboardingStatus === OnboardingStatus.APPROVED) {
        newAccStatus = AccountStatus.ACTIVE;
      } else if (onboardingStatus === OnboardingStatus.REJECTED || onboardingStatus === OnboardingStatus.SUSPENDED) {
        newAccStatus = AccountStatus.FROZEN;
      } else {
        newAccStatus = AccountStatus.PENDING_APPROVAL;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { onboardingStatus }
      });

      // Update primary accounts
      await tx.account.updateMany({
        where: { userId },
        data: { status: newAccStatus }
      });

      return updatedUser;
    });

    await recordAuditLog(
      req.user!.id,
      'ADMIN_ONBOARDING_UPDATE',
      userId,
      { newStatus: onboardingStatus, accountStatus: newAccStatus },
      req
    );

    return res.json({
      message: `User onboarding status updated to ${onboardingStatus}`,
      user: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user status' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const validated = roleUpdateSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.errors[0].message });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: validated.data.role }
    });

    await recordAuditLog(
      req.user!.id,
      'ADMIN_ROLE_CHANGE',
      userId,
      { newRole: validated.data.role },
      req
    );

    return res.json({
      message: `Role updated to ${validated.data.role}`,
      user: updatedUser
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user role' });
  }
}

export async function getAuditLogs(req: AuthRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '30', 10);
    const action = req.query.action as string;

    const where: any = {};
    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, role: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve audit log repository' });
  }
}

export async function getSystemMetrics(req: AuthRequest, res: Response) {
  try {
    const [userCount, accountCount, transactionCount, ledgerCount, volumeResult] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.transaction.count(),
      prisma.ledgerEntry.count(),
      prisma.transaction.aggregate({
        _sum: { amount: true }
      })
    ]);

    return res.json({
      totalUsers: userCount,
      totalAccounts: accountCount,
      totalTransactions: transactionCount,
      totalLedgerEntries: ledgerCount,
      totalVolumeMoved: volumeResult._sum.amount || 0.0,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to calculate system metrics' });
  }
}

