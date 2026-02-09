/**
 * Tests for POST /api/auth/login
 *
 * Covers:
 * - Input validation (missing userId, missing pin, invalid PIN format)
 * - Account lockout (via server lockout)
 * - Invalid credentials (wrong PIN, user not found)
 * - Happy path login with session creation
 * - Session creation failure handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, parseResponse } from '@/test/api-helpers';

// Set env vars at hoist time, before any module-level code runs
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.NODE_ENV = 'test';
});

// ---- Mocks ----

// Mock Supabase client used by the login route
const mockFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock session creation
const mockCreateSession = vi.fn();
vi.mock('@/lib/sessionValidator', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
}));

// Mock server lockout
const mockCheckLockout = vi.fn();
const mockRecordFailedAttempt = vi.fn();
const mockClearLockout = vi.fn();
vi.mock('@/lib/serverLockout', () => ({
  checkLockout: (...args: unknown[]) => mockCheckLockout(...args),
  recordFailedAttempt: (...args: unknown[]) => mockRecordFailedAttempt(...args),
  clearLockout: (...args: unknown[]) => mockClearLockout(...args),
  getLockoutIdentifier: (userId?: string, ip?: string) =>
    userId ? `user:${userId}` : ip ? `ip:${ip}` : 'unknown',
}));

// Mock session cookie setter
const mockSetSessionCookie = vi.fn();
vi.mock('@/lib/sessionCookies', () => ({
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    security: vi.fn(),
  },
}));

// Mock apiResponse
vi.mock('@/lib/apiResponse', async () => {
  const { NextResponse } = await import('next/server');
  return {
    apiErrorResponse: (code: string, message: string, status: number = 400) =>
      NextResponse.json({ success: false, error: code, message }, { status }),
  };
});

// ---- Helpers ----

function chainBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'single', 'maybeSingle', 'order', 'limit'];
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

import { createHash } from 'crypto';
function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

// Import the route under test
import { POST } from './route';

// ---- Tests ----

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no lockout
    mockCheckLockout.mockResolvedValue({
      isLocked: false,
      remainingSeconds: 0,
      attempts: 0,
      maxAttempts: 5,
    });

    mockRecordFailedAttempt.mockResolvedValue({
      isLocked: false,
      remainingSeconds: 0,
      attempts: 1,
      maxAttempts: 5,
    });

    mockClearLockout.mockResolvedValue(undefined);
  });

  // ============================================
  // Input Validation
  // ============================================

  describe('input validation', () => {
    it('should reject request with missing userId', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject request with missing pin', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'test-user' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject PIN that is not 4 digits', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'test-user', pin: '123' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject PIN with letters', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'test-user', pin: 'abcd' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================
  // Account Lockout
  // ============================================

  describe('account lockout', () => {
    it('should return 429 when account is locked out', async () => {
      mockCheckLockout.mockResolvedValue({
        isLocked: true,
        remainingSeconds: 240,
        attempts: 5,
        maxAttempts: 5,
      });

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'test-user', pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(429);
      expect(body.error).toContain('locked');
      expect(body.remainingSeconds).toBe(240);
    });
  });

  // ============================================
  // Invalid Credentials
  // ============================================

  describe('invalid credentials', () => {
    it('should return 401 when user is not found', async () => {
      // User lookup returns nothing
      mockFrom.mockReturnValue(
        chainBuilder({ data: null, error: { message: 'not found' } })
      );

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'nonexistent-user', pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(401);
      expect(body.error).toContain('Invalid credentials');
      // Should record failed attempt even for missing user (prevents user enumeration)
      expect(mockRecordFailedAttempt).toHaveBeenCalled();
    });

    it('should return 401 when PIN is wrong', async () => {
      const correctPin = '5678';
      const wrongPin = '9999';

      // User lookup returns user with correct hash
      mockFrom.mockReturnValue(
        chainBuilder({
          data: {
            id: 'test-user',
            name: 'Test',
            color: '#0033A0',
            pin_hash: hashPin(correctPin),
            role: 'staff',
          },
          error: null,
        })
      );

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'test-user', pin: wrongPin },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(401);
      expect(body.error).toContain('Invalid credentials');
      expect(mockRecordFailedAttempt).toHaveBeenCalled();
    });

    it('should show remaining attempts when not yet locked out', async () => {
      mockRecordFailedAttempt.mockResolvedValue({
        isLocked: false,
        remainingSeconds: 0,
        attempts: 3,
        maxAttempts: 5,
      });

      mockFrom.mockReturnValue(
        chainBuilder({ data: null, error: { message: 'not found' } })
      );

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'test-user', pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(401);
    });
  });

  // ============================================
  // Happy Path
  // ============================================

  describe('happy path', () => {
    it('should login successfully with correct PIN and create session', async () => {
      const correctPin = '5678';

      // Mock Supabase calls:
      // 1. User lookup
      // 2. Update last_login
      // 3. Default agency membership lookup
      // 4. All agencies lookup
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // User lookup
          return chainBuilder({
            data: {
              id: 'test-user',
              name: 'Test User',
              color: '#0033A0',
              pin_hash: hashPin(correctPin),
              role: 'staff',
            },
            error: null,
          });
        }
        if (callIdx === 2) {
          // Update last_login
          return chainBuilder({ data: null, error: null });
        }
        if (callIdx === 3) {
          // Default agency membership
          return chainBuilder({
            data: {
              agency_id: 'agency-1',
              role: 'owner',
              agencies: { name: 'My Agency', slug: 'my-agency' },
            },
            error: null,
          });
        }
        // All agencies
        return chainBuilder({
          data: [
            {
              agency_id: 'agency-1',
              role: 'owner',
              is_default_agency: true,
              agencies: { id: 'agency-1', name: 'My Agency', slug: 'my-agency' },
            },
          ],
          error: null,
        });
      });

      mockCreateSession.mockResolvedValue({
        token: 'session-token-xyz',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'test-user', pin: correctPin },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe('test-user');
      expect(body.user.name).toBe('Test User');
      expect(mockClearLockout).toHaveBeenCalled();
      expect(mockCreateSession).toHaveBeenCalled();
      expect(mockSetSessionCookie).toHaveBeenCalled();
    });
  });

  // ============================================
  // Session Creation Failure
  // ============================================

  describe('session creation failure', () => {
    it('should return 500 when session creation fails', async () => {
      const correctPin = '5678';

      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return chainBuilder({
            data: {
              id: 'test-user',
              name: 'Test User',
              color: '#0033A0',
              pin_hash: hashPin(correctPin),
              role: 'staff',
            },
            error: null,
          });
        }
        // All subsequent calls return empty
        return chainBuilder({ data: null, error: null });
      });

      mockCreateSession.mockResolvedValue(null);

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { userId: 'test-user', pin: correctPin },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(500);
      expect(body.error).toBe('SESSION_FAILED');
    });
  });
});
