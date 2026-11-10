import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://balancevault_app:vaultpass123@localhost:5432/balancevault?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-balancevault-2026-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  bootstrapSecret: process.env.BOOTSTRAP_SECRET || 'balancevault-secure-bootstrap-key-2026'
};
