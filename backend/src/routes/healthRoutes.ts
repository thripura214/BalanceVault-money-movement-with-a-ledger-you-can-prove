import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getRedisStatus } from '../lib/redis';

const router = Router();

// Liveness probe
router.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'BalanceVault Core API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Readiness probe
router.get('/ready', async (req: Request, res: Response) => {
  let isDbConnected = false;
  let dbLatencyMs = 0;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    isDbConnected = true;
  } catch (err) {
    isDbConnected = false;
  }

  const isRedisConnected = getRedisStatus();

  const isReady = isDbConnected; // PostgreSQL is required; Redis has graceful fallback

  return res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    database: {
      connected: isDbConnected,
      latencyMs: dbLatencyMs
    },
    redis: {
      connected: isRedisConnected,
      mode: isRedisConnected ? 'redis_distributed' : 'in_memory_fallback'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
