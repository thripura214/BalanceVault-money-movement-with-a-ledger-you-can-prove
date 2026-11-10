import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../lib/redis';

// General API rate limiter (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down and try again later.' },
  store: getRedisClient()
    ? new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => getRedisClient()!.call(...args)
      })
    : undefined
});

// Stricter rate limiter for Authentication and Financial operations (10 requests per 5 minutes)
export const strictAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again in 5 minutes.' },
  store: getRedisClient()
    ? new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => getRedisClient()!.call(...args)
      })
    : undefined
});
