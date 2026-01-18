/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRateLimit,
  createRateLimitResponse,
  withRateLimit,
  addRateLimitHeaders,
} from '@/lib/rateLimit';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { NextResponse } from 'next/server';

vi.mock('@upstash/ratelimit');
vi.mock('@upstash/redis');

// Mock feature flags - enable rate limiting for tests
vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: vi.fn((flag: string) => flag === 'server_rate_limiting'),
}));

// Mock logger to avoid Sentry issues
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure rate limiting is enabled for each test
    vi.mocked(isFeatureEnabled).mockImplementation((flag: string) => flag === 'server_rate_limiting');
  });

  describe('checkRateLimit', () => {
    it('should allow request when rate limit not exceeded', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 99,
          reset: Date.now() + 60000,
        }),
      } as any;

      const result = await checkRateLimit('user-123', mockLimiter);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should block request when rate limit exceeded', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 100,
          remaining: 0,
          reset: Date.now() + 60000,
        }),
      } as any;

      const result = await checkRateLimit('user-123', mockLimiter);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should fail open when limiter is null', async () => {
      const result = await checkRateLimit('user-123', null);

      expect(result.success).toBe(true);
    });

    it('should fail open when Redis is down', async () => {
      const mockLimiter = {
        limit: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      } as any;

      const result = await checkRateLimit('user-123', mockLimiter);

      expect(result.success).toBe(true); // Fail open for availability
    });
  });

  describe('createRateLimitResponse', () => {
    it('should create proper 429 response', () => {
      const result = createRateLimitResponse({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      expect(result.status).toBe(429);
      expect(result.headers.get('Retry-After')).toBeDefined();
    });

    it('should default to 60 second retry when no reset time', () => {
      const result = createRateLimitResponse({
        success: false,
      });

      expect(result.status).toBe(429);
      expect(result.headers.get('Retry-After')).toBe('60');
    });

    it('should include rate limit headers', () => {
      const result = createRateLimitResponse({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 30000,
      });

      expect(result.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('withRateLimit', () => {
    it('should use user ID as identifier when available', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 99,
          reset: Date.now() + 60000,
        }),
      } as any;

      const mockRequest = {
        headers: {
          get: vi.fn().mockImplementation((name: string) => {
            if (name === 'x-user-id') return 'user-123';
            if (name === 'x-forwarded-for') return '1.2.3.4';
            return null;
          }),
        },
      } as any;

      await withRateLimit(mockRequest, mockLimiter);

      expect(mockLimiter.limit).toHaveBeenCalledWith('user-123');
    });

    it('should fallback to x-forwarded-for IP', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 99,
          reset: Date.now() + 60000,
        }),
      } as any;

      const mockRequest = {
        headers: {
          get: vi.fn().mockImplementation((name: string) => {
            if (name === 'x-forwarded-for') return '1.2.3.4';
            return null;
          }),
        },
      } as any;

      await withRateLimit(mockRequest, mockLimiter);

      expect(mockLimiter.limit).toHaveBeenCalledWith('1.2.3.4');
    });

    it('should fallback to x-real-ip', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 99,
          reset: Date.now() + 60000,
        }),
      } as any;

      const mockRequest = {
        headers: {
          get: vi.fn().mockImplementation((name: string) => {
            if (name === 'x-real-ip') return '5.6.7.8';
            return null;
          }),
        },
      } as any;

      await withRateLimit(mockRequest, mockLimiter);

      expect(mockLimiter.limit).toHaveBeenCalledWith('5.6.7.8');
    });

    it('should use "unknown" when no identifiers available', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 99,
          reset: Date.now() + 60000,
        }),
      } as any;

      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as any;

      await withRateLimit(mockRequest, mockLimiter);

      expect(mockLimiter.limit).toHaveBeenCalledWith('unknown');
    });
  });

  describe('addRateLimitHeaders', () => {
    it('should add all rate limit headers when present', () => {
      const response = NextResponse.json({ data: 'test' });

      const result = addRateLimitHeaders(response, {
        success: true,
        limit: 100,
        remaining: 50,
        reset: 1234567890,
      });

      expect(result.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('50');
      expect(result.headers.get('X-RateLimit-Reset')).toBe('1234567890');
    });

    it('should not add headers when values are undefined', () => {
      const response = NextResponse.json({ data: 'test' });

      const result = addRateLimitHeaders(response, {
        success: true,
      });

      expect(result.headers.get('X-RateLimit-Limit')).toBeNull();
      expect(result.headers.get('X-RateLimit-Remaining')).toBeNull();
      expect(result.headers.get('X-RateLimit-Reset')).toBeNull();
    });

    it('should handle partial headers', () => {
      const response = NextResponse.json({ data: 'test' });

      const result = addRateLimitHeaders(response, {
        success: true,
        limit: 100,
      });

      expect(result.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(result.headers.get('X-RateLimit-Remaining')).toBeNull();
    });
  });

  describe('checkRateLimit with feature flag disabled', () => {
    it('should allow all requests when rate limiting is disabled', async () => {
      vi.mocked(isFeatureEnabled).mockReturnValue(false);

      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 100,
          remaining: 0,
          reset: Date.now() + 60000,
        }),
      } as any;

      const result = await checkRateLimit('user-123', mockLimiter);

      expect(result.success).toBe(true);
      expect(mockLimiter.limit).not.toHaveBeenCalled();
    });
  });
});
