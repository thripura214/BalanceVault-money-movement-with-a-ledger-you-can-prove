import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  onboardingStatus: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        onboardingStatus: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not identified' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
}

/**
 * Creates an immutable audit log entry for sensitive security and financial events
 */
export async function recordAuditLog(
  userId: string | null,
  action: string,
  targetId: string | null = null,
  details: any = null,
  req?: Request
) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || null) : null;
    const ua = req ? (req.headers['user-agent'] || null) : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetId,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        ipAddress: ip ? String(ip) : null,
        userAgent: ua ? String(ua) : null
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

