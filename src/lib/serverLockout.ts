/**
 * Server-Side Login Lockout with Redis
 *
 * Provides secure, server-side lockout mechanism that cannot be bypassed
 * by clearing browser storage. Uses Redis for distributed state management.
 */

import { Redis } from '@upstash/redis';
import { logger } from './logger';
import { securityMonitor } from './securityMonitor';

// Initialize Redis client (only if configured)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Lockout configuration
const MAX_ATTEMPTS = 5; // Lock after 5 failed attempts
const LOCKOUT_DURATION_SECONDS = 300; // 5 minutes lockout
const ATTEMPT_WINDOW_SECONDS = 900; // 15 minute window for counting attempts

// Key prefixes
const LOCKOUT_PREFIX = 'lockout:';
const ATTEMPTS_PREFIX = 'login_attempts:';

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
  maxAttempts: number;
}

/**
 * Get the lockout key for a user/IP combination
 */
function getLockoutKey(identifier: string): string {
  return `${LOCKOUT_PREFIX}${identifier}`;
}

/**
 * Get the attempts key for a user/IP combination
 */
function getAttemptsKey(identifier: string): string {
  return `${ATTEMPTS_PREFIX}${identifier}`;
}

/**
 * Check if an identifier (userId or IP) is currently locked out
 */
export async function checkLockout(identifier: string): Promise<LockoutStatus> {
  if (!redis) {
    // If Redis is not configured, fall back to allowing (but log warning)
    logger.warn('Redis not configured for lockout - allowing request', {
      component: 'ServerLockout',
      identifier,
    });
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  try {
    const lockoutKey = getLockoutKey(identifier);
    const attemptsKey = getAttemptsKey(identifier);

    // Check if currently locked out
    const lockoutTTL = await redis.ttl(lockoutKey);
    if (lockoutTTL > 0) {
      const attempts = await redis.get<number>(attemptsKey) || MAX_ATTEMPTS;
      return {
        isLocked: true,
        remainingSeconds: lockoutTTL,
        attempts,
        maxAttempts: MAX_ATTEMPTS,
      };
    }

    // Get current attempt count
    const attempts = await redis.get<number>(attemptsKey) || 0;

    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  } catch (error) {
    logger.error('Failed to check lockout status', error, {
      component: 'ServerLockout',
      identifier,
    });
    // On error, allow the request but log it
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }
}

/**
 * Record a failed login attempt and potentially trigger lockout
 */
export async function recordFailedAttempt(
  identifier: string,
  metadata?: { ip?: string; userAgent?: string; userName?: string }
): Promise<LockoutStatus> {
  if (!redis) {
    logger.warn('Redis not configured for lockout tracking', {
      component: 'ServerLockout',
      identifier,
    });
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: 1,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  try {
    const lockoutKey = getLockoutKey(identifier);
    const attemptsKey = getAttemptsKey(identifier);

    // Increment attempt counter
    const attempts = await redis.incr(attemptsKey);

    // Set expiry on attempts key if this is the first attempt
    if (attempts === 1) {
      await redis.expire(attemptsKey, ATTEMPT_WINDOW_SECONDS);
    }

    // Log the failed attempt and notify security monitor
    logger.security('Failed login attempt', {
      identifier,
      attempts,
      maxAttempts: MAX_ATTEMPTS,
      ...metadata,
    });

    // Send to security monitor for alerting
    await securityMonitor.authFailure(
      metadata?.userName || identifier,
      metadata?.ip,
      `Attempt ${attempts} of ${MAX_ATTEMPTS}`
    );

    // Check if we should lock out
    if (attempts >= MAX_ATTEMPTS) {
      // Set lockout
      await redis.set(lockoutKey, 'locked', { ex: LOCKOUT_DURATION_SECONDS });

      logger.security('Account locked due to too many failed attempts', {
        identifier,
        attempts,
        lockoutDuration: LOCKOUT_DURATION_SECONDS,
        ...metadata,
      });

      // Notify security monitor of lockout
      await securityMonitor.authLockout(
        metadata?.userName || identifier,
        metadata?.ip,
        attempts
      );

      return {
        isLocked: true,
        remainingSeconds: LOCKOUT_DURATION_SECONDS,
        attempts,
        maxAttempts: MAX_ATTEMPTS,
      };
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  } catch (error) {
    logger.error('Failed to record login attempt', error, {
      component: 'ServerLockout',
      identifier,
    });
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: 1,
      maxAttempts: MAX_ATTEMPTS,
    };
  }
}

/**
 * Clear lockout and attempts after successful login
 */
export async function clearLockout(identifier: string): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const lockoutKey = getLockoutKey(identifier);
    const attemptsKey = getAttemptsKey(identifier);

    await Promise.all([
      redis.del(lockoutKey),
      redis.del(attemptsKey),
    ]);

    logger.debug('Cleared lockout state', {
      component: 'ServerLockout',
      identifier,
    });
  } catch (error) {
    logger.error('Failed to clear lockout', error, {
      component: 'ServerLockout',
      identifier,
    });
  }
}

/**
 * Get a combined identifier for lockout (prefers userId, falls back to IP)
 */
export function getLockoutIdentifier(userId?: string, ip?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  if (ip) {
    return `ip:${ip}`;
  }
  return 'unknown';
}
