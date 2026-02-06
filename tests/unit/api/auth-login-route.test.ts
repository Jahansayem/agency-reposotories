import { createHash } from 'crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const createClientMock = vi.fn();
const checkLockoutMock = vi.fn();
const recordFailedAttemptMock = vi.fn();
const clearLockoutMock = vi.fn();
const createSessionMock = vi.fn();
const setSessionCookieMock = vi.fn();
const loggerErrorMock = vi.fn();
const loggerInfoMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock('@/lib/serverLockout', () => ({
  checkLockout: (...args: unknown[]) => checkLockoutMock(...args),
  recordFailedAttempt: (...args: unknown[]) => recordFailedAttemptMock(...args),
  clearLockout: (...args: unknown[]) => clearLockoutMock(...args),
  getLockoutIdentifier: (userId?: string, ip?: string) => (userId ? `user:${userId}` : `ip:${ip || 'unknown'}`),
}));

vi.mock('@/lib/sessionValidator', () => ({
  createSession: (...args: unknown[]) => createSessionMock(...args),
}));

vi.mock('@/lib/sessionCookies', () => ({
  setSessionCookie: (...args: unknown[]) => setSessionCookieMock(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: vi.fn(),
    debug: vi.fn(),
    security: vi.fn(),
  },
}));

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

function createMockRequest(body: Record<string, unknown>): NextRequest {
  const headers = new Headers({
    'x-forwarded-for': '127.0.0.1',
    'user-agent': 'vitest-agent',
  });

  return {
    json: vi.fn().mockResolvedValue(body),
    headers,
  } as unknown as NextRequest;
}

function createSupabaseMock(options?: {
  user?: { id: string; name: string; color: string; pin_hash: string; role?: string | null } | null;
  defaultMembership?: { agency_id: string; role: string; agencies: { name: string } } | null;
  membershipRows?: Array<{ agency_id: string; role: string; is_default_agency?: boolean; agencies: { id: string; name: string; slug?: string } }>;
}) {
  const user = options?.user ?? {
    id: 'user-1',
    name: 'Derrick',
    color: '#0033A0',
    pin_hash: hashPin('1234'),
    role: 'staff',
  };
  const defaultMembership = options?.defaultMembership ?? {
    agency_id: 'agency-1',
    role: 'owner',
    agencies: { name: 'Agency One' },
  };
  const membershipRows = options?.membershipRows ?? [
    {
      agency_id: 'agency-1',
      role: 'owner',
      is_default_agency: true,
      agencies: { id: 'agency-1', name: 'Agency One', slug: 'agency-one' },
    },
  ];

  return {
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: user,
                error: user ? null : new Error('not found'),
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ data: null, error: null }),
          }),
        };
      }

      if (table === 'agency_members') {
        let selectCall = 0;
        return {
          select: () => {
            selectCall += 1;
            const currentCall = selectCall;
            const chain = {
              eq: () => chain,
              limit: () => chain,
              maybeSingle: async () => {
                if (currentCall === 1) {
                  return { data: defaultMembership, error: null };
                }
                return { data: null, error: null };
              },
              then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
                Promise.resolve({ data: membershipRows, error: null }).then(resolve, reject),
            };
            return chain;
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe('/api/auth/login route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    checkLockoutMock.mockResolvedValue({
      isLocked: false,
      remainingSeconds: 0,
      attempts: 0,
      maxAttempts: 5,
    });
    recordFailedAttemptMock.mockResolvedValue({
      isLocked: false,
      remainingSeconds: 0,
      attempts: 1,
      maxAttempts: 5,
    });
    clearLockoutMock.mockResolvedValue(undefined);
    createSessionMock.mockResolvedValue({ token: 'session-token' });
    createClientMock.mockReturnValue(createSupabaseMock());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 503 AUTH_TIMEOUT when lockout check times out', async () => {
    vi.useFakeTimers();
    checkLockoutMock.mockReturnValue(new Promise(() => {}));

    const { POST } = await import('@/app/api/auth/login/route');
    const responsePromise = POST(createMockRequest({ userId: 'user-1', pin: '1234' }));

    await vi.advanceTimersByTimeAsync(10050);
    const response = await responsePromise;
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('AUTH_TIMEOUT');
    expect(body.operation).toBe('check_lockout');
  });

  it('returns 503 AUTH_TIMEOUT when session creation times out', async () => {
    vi.useFakeTimers();
    createSessionMock.mockReturnValue(new Promise(() => {}));

    const { POST } = await import('@/app/api/auth/login/route');
    const responsePromise = POST(createMockRequest({ userId: 'user-1', pin: '1234' }));

    await vi.advanceTimersByTimeAsync(10050);
    const response = await responsePromise;
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('AUTH_TIMEOUT');
    expect(body.operation).toBe('create_session');
  });

  it('keeps success response backward compatible', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const response = await POST(createMockRequest({ userId: 'user-1', pin: '1234' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.id).toBe('user-1');
    expect(body.currentAgencyId).toBe('agency-1');
    expect(Array.isArray(body.agencies)).toBe(true);
    expect(setSessionCookieMock).toHaveBeenCalledTimes(1);
    expect(loggerInfoMock).toHaveBeenCalled();
  });
});

