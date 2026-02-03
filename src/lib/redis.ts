import { Redis } from '@upstash/redis';
import { logger } from './logger';

// Initialize Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Return null if Redis URL is not configured (graceful degradation)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Redis not configured - caching disabled');
    return null;
  }

  // Lazy initialize Redis client
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

/**
 * Get a value from Redis cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    return value;
  } catch (error) {
    logger.error('Redis get error', error as Error, { component: 'redis', action: 'getCache', key });
    return null;
  }
}

/**
 * Set a value in Redis cache with TTL (time-to-live in seconds)
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Redis set error', error as Error, { component: 'redis', action: 'setCache', key, ttlSeconds });
    return false;
  }
}

/**
 * Delete a value from Redis cache
 */
export async function deleteCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis delete error', error as Error, { component: 'redis', action: 'deleteCache', key });
    return false;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}
