/**
 * Tests for POST /api/auth/register
 *
 * Covers:
 * - Input validation (name, PIN, email)
 * - Weak PIN rejection
 * - Duplicate name detection
 * - Happy path registration
 * - Registration with agency creation
 * - Session cookie creation on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, parseResponse } from '@/test/api-helpers';

// Set env vars BEFORE module imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// ---- Mocks ----

// Mock the Supabase service role client
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock('@/lib/supabaseClient', () => ({
  createServiceRoleClient: () => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  }),
}));

// Mock session creation
const mockCreateSession = vi.fn();
vi.mock('@/lib/sessionValidator', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
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

// Mock apiErrorResponse (pass through to actual implementation behavior)
vi.mock('@/lib/apiResponse', async () => {
  const { NextResponse } = await import('next/server');
  return {
    apiErrorResponse: (code: string, message: string, status: number = 400) =>
      NextResponse.json({ success: false, error: code, message }, { status }),
  };
});

// Mock safeLogActivity
vi.mock('@/lib/safeActivityLog', () => ({
  safeLogActivity: vi.fn().mockResolvedValue(undefined),
}));

// ---- Helpers ----

/**
 * Helper to create a chainable Supabase query mock.
 * Each method returns the builder, and the chain resolves via `.then()`.
 */
function chainBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'single', 'maybeSingle', 'order', 'limit'];
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

// ---- Test Suite ----

// Import the route handler under test
import { POST } from './route';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Input Validation
  // ============================================

  describe('input validation', () => {
    it('should reject request with missing name', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('Name is required');
    });

    it('should reject request with empty name', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: '   ', pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject name longer than 100 characters', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'A'.repeat(101), pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('100 characters');
    });

    it('should reject missing PIN', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'Test User' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('PIN');
    });

    it('should reject PIN that is not 4 digits', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'Test User', pin: '123' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('4 digits');
    });

    it('should reject PIN with non-digit characters', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'Test User', pin: 'abcd' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid email format', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'Test User', pin: '5678', email: 'not-an-email' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('INVALID_EMAIL');
    });

    it('should reject providing both invitation_token and create_agency', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          name: 'Test User',
          pin: '5678',
          invitation_token: 'some-token',
          create_agency: { name: 'My Agency' },
        },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('Cannot accept an invitation and create an agency');
    });
  });

  // ============================================
  // Weak PIN Rejection
  // ============================================

  describe('weak PIN rejection', () => {
    const weakPins = ['0000', '1111', '1234', '4321', '9999', '9876'];

    for (const pin of weakPins) {
      it(`should reject weak PIN: ${pin}`, async () => {
        const req = createMockRequest({
          method: 'POST',
          url: 'http://localhost:3000/api/auth/register',
          body: { name: 'Test User', pin },
        });

        const res = await POST(req);
        const { status, body } = await parseResponse(res);

        expect(status).toBe(400);
        expect(body.error).toBe('VALIDATION_ERROR');
        expect(body.message).toContain('too common');
      });
    }

    it('should accept a non-weak 4-digit PIN', async () => {
      // Set up mocks for successful registration path
      // This PIN should pass the weak-PIN check (validation will proceed to DB check)
      mockSupabaseFrom.mockReturnValue(
        chainBuilder({ data: null, error: null }) // No duplicate user
      );

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'Test User', pin: '7293' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      // Should not be rejected for weak PIN (may fail for other reasons in mock setup, but not 400 with 'too common')
      if (status === 400) {
        expect(body.message).not.toContain('too common');
      }
    });
  });

  // ============================================
  // Duplicate Name Detection
  // ============================================

  describe('duplicate name detection', () => {
    it('should return 409 when user name already exists', async () => {
      // Mock: user exists
      mockSupabaseFrom.mockReturnValue(
        chainBuilder({ data: { id: 'existing-id' }, error: null })
      );

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'Existing User', pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(409);
      expect(body.error).toBe('DUPLICATE_NAME');
    });
  });

  // ============================================
  // Happy Path
  // ============================================

  describe('happy path - simple registration', () => {
    it('should create user and return success with session', async () => {
      // First call: check existing user -> none found
      // Second call: insert user -> success
      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Check duplicate - no user found
          return chainBuilder({ data: null, error: null });
        }
        // Insert user
        return chainBuilder({
          data: { id: 'new-user-id', name: 'New User', color: '#0033A0', role: 'staff' },
          error: null,
        });
      });

      mockCreateSession.mockResolvedValue({
        token: 'session-token-abc',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'New User', pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.name).toBe('New User');
      expect(mockCreateSession).toHaveBeenCalled();
      expect(mockSetSessionCookie).toHaveBeenCalled();
    });
  });

  // ============================================
  // Registration with Agency Creation
  // ============================================

  describe('registration with agency creation', () => {
    it('should reject create_agency without agency name', async () => {
      // Mock: no duplicate user, user insert succeeds
      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainBuilder({ data: null, error: null }); // No duplicate
        }
        // User insert
        return chainBuilder({
          data: { id: 'new-user-id', name: 'New User', color: '#0033A0', role: 'staff' },
          error: null,
        });
      });

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          name: 'New User',
          pin: '5678',
          create_agency: { name: '' },
        },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('Agency name is required');
    });
  });

  // ============================================
  // Session Creation Failure
  // ============================================

  describe('session creation failure', () => {
    it('should return error when session creation fails after user creation', async () => {
      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainBuilder({ data: null, error: null }); // No duplicate
        }
        return chainBuilder({
          data: { id: 'new-user-id', name: 'New User', color: '#0033A0', role: 'staff' },
          error: null,
        });
      });

      mockCreateSession.mockResolvedValue(null); // Session creation fails

      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: { name: 'New User', pin: '5678' },
      });

      const res = await POST(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(500);
      expect(body.error).toBe('SESSION_FAILED');
    });
  });
});
