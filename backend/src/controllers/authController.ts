import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { config } from '../config';
import { AuthRequest, recordAuditLog } from '../middleware/auth';
import { UserRole, OnboardingStatus, AccountStatus } from '@prisma/client';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const bootstrapSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Admin password must be at least 8 characters'),
  bootstrapKey: z.string()
});

function generateToken(userId: string): string {
  // @ts-ignore
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function generateAccountNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `BV-${rand}`;
}

export async function checkBootstrapStatus(req: Request, res: Response) {
  try {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN }
    });

    return res.json({
      bootstrapRequired: adminCount === 0,
      adminCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to check system bootstrap status' });
  }
}

export async function bootstrapFirstAdmin(req: Request, res: Response) {
  try {
    const validated = bootstrapSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.errors[0].message });
    }

    const { fullName, email, password, bootstrapKey } = validated.data;

    // Verify bootstrap security key
    if (bootstrapKey !== config.bootstrapSecret) {
      return res.status(403).json({ error: 'Invalid administrator bootstrap authorization key' });
    }

    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN }
    });

    if (adminCount > 0) {
      return res.status(400).json({
        error: 'System administrator already bootstrapped. Use standard admin management for additional users.'
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: UserRole.ADMIN,
        onboardingStatus: OnboardingStatus.APPROVED
      }
    });

    await recordAuditLog(
      admin.id,
      'ADMIN_BOOTSTRAP_EXECUTED',
      admin.id,
      { email: admin.email, bootstrapMethod: 'FIRST_ADMIN_SETUP' },
      req
    );

    const token = generateToken(admin.id);

    return res.status(201).json({
      message: 'System administrator bootstrapped successfully',
      user: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        onboardingStatus: admin.onboardingStatus
      },
      token
    });
  } catch (err: any) {
    console.error('Bootstrap error:', err);
    return res.status(500).json({ error: 'Failed to bootstrap administrator' });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const validated = registerSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.errors[0].message });
    }

    const { fullName, email, password, phone } = validated.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and initial financial account in a single transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          phone,
          role: UserRole.ACCOUNT_HOLDER,
          onboardingStatus: OnboardingStatus.PENDING
        }
      });

      // Create linked financial account
      const account = await tx.account.create({
        data: {
          userId: user.id,
          accountNumber: generateAccountNumber(),
          balance: 0.0,
          status: AccountStatus.PENDING_APPROVAL
        }
      });

      return { user, account };
    });

    await recordAuditLog(
      newUser.user.id,
      'USER_REGISTRATION',
      newUser.user.id,
      { email: newUser.user.email, accountNumber: newUser.account.accountNumber },
      req
    );

    const token = generateToken(newUser.user.id);

    return res.status(201).json({
      message: 'Account registered successfully. KYC verification pending.',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        fullName: newUser.user.fullName,
        role: newUser.user.role,
        onboardingStatus: newUser.user.onboardingStatus
      },
      account: {
        id: newUser.account.id,
        accountNumber: newUser.account.accountNumber,
        balance: newUser.account.balance,
        status: newUser.account.status
      },
      token
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const validated = loginSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const { email, password } = validated.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await recordAuditLog(user.id, 'LOGIN_FAILED', user.id, { reason: 'BAD_PASSWORD' }, req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.onboardingStatus === OnboardingStatus.SUSPENDED) {
      return res.status(403).json({ error: 'Account suspended. Please contact compliance support.' });
    }

    await recordAuditLog(user.id, 'LOGIN_SUCCESS', user.id, { role: user.role }, req);

    const token = generateToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        onboardingStatus: user.onboardingStatus
      },
      accounts: user.accounts.map(acc => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        balance: acc.balance,
        status: acc.status
      }))
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login service encountered an unexpected error' });
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        accounts: {
          select: {
            id: true,
            accountNumber: true,
            balance: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        onboardingStatus: user.onboardingStatus,
        createdAt: user.createdAt
      },
      accounts: user.accounts
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

