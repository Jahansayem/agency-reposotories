import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';
import { Ratelimit } from '@upstash/ratelimit';
import { isFeatureEnabled } from '@/lib/featureFlags';

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
  });
});
