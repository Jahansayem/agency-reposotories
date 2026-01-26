/**
 * Rate Limiting with Upstash Redis
 *
 * Protects API endpoints from abuse and DDoS attacks
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { isFeatureEnabled } from './featureFlags';
import { securityMonitor } from './securityMonitor';

// Initialize Redis client (only if configured)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * Different rate limiters for different operations
 */
export const rateLimiters = {
  // 5 login attempts per 15 minutes per IP
  login: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'ratelimit:login',
  }) : null,

  // 10 AI requests per minute per user
  ai: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:ai',
  }) : null,

  // 100 API requests per minute per user
  api: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'ratelimit:api',
  }) : null,

  // 20 file uploads per hour per user
  upload: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'ratelimit:upload',
  }) : null,

  // 30 email generations per day per user
  email: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '24 h'),
    prefix: 'ratelimit:email',
  }) : null,
};

export interface RateLimitResult {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Usually IP address or user ID
 * @param limiter - The rate limiter to use
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<RateLimitResult> {
  // If rate limiting is disabled or not configured, allow all requests
  if (!limiter || !isFeatureEnabled('server_rate_limiting')) {
    return { success: true };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      logger.warn('Rate limit exceeded', {
        identifier,
        limit,
        remaining,
        reset: new Date(reset),
      });

      // Send to security monitor for alerting
      securityMonitor.rateLimitExceeded(identifier, 'api').catch(() => {
        // Fire and forget - don't block on alerting
      });
    }

    return { success, limit, remaining, reset };
  } catch (error) {
    // SECURITY: Fail closed - deny requests when Redis is unavailable
    // This prevents bypass of rate limiting during service outages
    logger.error('Rate limit check failed - denying request (fail-closed)', error as Error, {
      identifier,
      action: 'rate_limit_check',
    });

    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000, // Retry after 1 minute
    };
  }
}

/**
 * Middleware wrapper for Next.js API routes
 * Usage: const rateLimitResult = await withRateLimit(request, rateLimiters.api);
 */
export async function withRateLimit(
  request: NextRequest,
  limiter: Ratelimit | null
): Promise<RateLimitResult> {
  // Get identifier (prefer user ID, fallback to IP)
  const userId = request.headers.get('x-user-id');
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  const identifier = userId || ip;

  return await checkRateLimit(identifier, limiter);
}

/**
 * Create a rate-limited response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = result.reset
    ? Math.ceil((result.reset - Date.now()) / 1000)
    : 60;

  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': result.limit?.toString() || '0',
        'X-RateLimit-Remaining': result.remaining?.toString() || '0',
        'X-RateLimit-Reset': result.reset?.toString() || '0',
      },
    }
  );
}

/**
 * Helper to add rate limit headers to successful responses
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  if (result.limit !== undefined) {
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
  }
  if (result.remaining !== undefined) {
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  }
  if (result.reset !== undefined) {
    response.headers.set('X-RateLimit-Reset', result.reset.toString());
  }

  return response;
}
