import Redis from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;
let isRedisConnected = false;

if (config.redisUrl) {
  try {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) {
          // Cease retries to prevent console spam if redis is not running
          return null;
        }
        return Math.min(times * 100, 1000);
      }
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('Redis connected successfully for rate limiting and cache.');
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      // Soft warning - fallback in-memory rate limiting handles requests
    });
  } catch (err) {
    isRedisConnected = false;
  }
}

export function getRedisClient(): Redis | null {
  return isRedisConnected ? redisClient : null;
}

export function getRedisStatus(): boolean {
  return isRedisConnected;
}

export default redisClient;
