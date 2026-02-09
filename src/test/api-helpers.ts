/**
 * API Route Test Helpers
 *
 * Provides utilities for unit testing Next.js API routes:
 * - Mock Supabase client with chainable query builder
 * - Mock auth context for withAgencyAuth-protected routes
 * - NextRequest builder with headers, cookies, body, and search params
 * - NextResponse parser for asserting on JSON responses
 */

import { vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { AgencyAuthContext } from '@/lib/agencyAuth';
import type { AgencyPermissions } from '@/types/agency';
import { DEFAULT_PERMISSIONS } from '@/types/agency';

// ============================================
// Mock Supabase Query Builder
// ============================================

/**
 * Creates a chainable mock that simulates Supabase's query builder pattern.
 * Every method returns `this` for chaining, and the final result is
 * resolved from the configured `_result` field.
 *
 * Usage:
 *   const qb = createMockQueryBuilder({ data: [...], error: null });
 *   qb.from('todos').select('*').eq('id', '123');
 *   // The chain resolves to { data: [...], error: null }
 */
export interface MockQueryResult {
  data: unknown;
  error: unknown;
  count?: number | null;
}

export function createMockQueryBuilder(defaultResult: MockQueryResult = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};
  let _result: MockQueryResult = { ...defaultResult };

  // Methods that return the builder for chaining
  const chainMethods = [
    'from', 'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'is', 'in', 'not', 'or', 'and', 'match',
    'order', 'limit', 'range', 'offset',
    'single', 'maybeSingle',
    'textSearch', 'filter', 'contains', 'containedBy',
    'overlaps', 'csv',
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // `rpc` also chains
  builder.rpc = vi.fn().mockReturnValue(builder);

  // Make the builder thenable so `await query` works
  builder.then = (resolve: (value: MockQueryResult) => void) => {
    return Promise.resolve(_result).then(resolve);
  };

  // Helper to set the result for the next query chain
  builder._setResult = (result: MockQueryResult) => {
    _result = result;
    return builder;
  };

  // Helper to reset all mocks
  builder._reset = () => {
    for (const method of chainMethods) {
      (builder[method] as ReturnType<typeof vi.fn>).mockClear().mockReturnValue(builder);
    }
    (builder.rpc as ReturnType<typeof vi.fn>).mockClear().mockReturnValue(builder);
    _result = { ...defaultResult };
  };

  return builder;
}

/**
 * Creates a mock Supabase client with a chainable query builder.
 * The returned client's `.from()` calls all share the same builder,
 * so you can set results before the route under test runs.
 */
export function createMockSupabaseClient(defaultResult: MockQueryResult = { data: null, error: null }) {
  const qb = createMockQueryBuilder(defaultResult);

  return {
    client: qb,
    // Convenience: set what the next query chain should resolve to
    setResult: (result: MockQueryResult) => (qb._setResult as (r: MockQueryResult) => void)(result),
    reset: () => (qb._reset as () => void)(),
  };
}

// ============================================
// Mock Agency Auth Context
// ============================================

/**
 * Create a mock AgencyAuthContext for testing routes wrapped with withAgencyAuth.
 *
 * Provides sensible defaults that can be overridden per test.
 */
export function createMockAuthContext(overrides: Partial<AgencyAuthContext> = {}): AgencyAuthContext {
  return {
    userId: 'test-user-id',
    userName: 'Test User',
    userRole: 'owner',
    agencyId: 'test-agency-id',
    agencySlug: 'test-agency',
    agencyName: 'Test Agency',
    agencyRole: 'owner',
    permissions: DEFAULT_PERMISSIONS.owner,
    ...overrides,
  };
}

/**
 * Create a staff-level auth context with limited permissions.
 */
export function createStaffAuthContext(overrides: Partial<AgencyAuthContext> = {}): AgencyAuthContext {
  return createMockAuthContext({
    userRole: 'staff',
    agencyRole: 'staff',
    permissions: DEFAULT_PERMISSIONS.staff,
    ...overrides,
  });
}

/**
 * Create an auth context for a different agency (useful for isolation tests).
 */
export function createOtherAgencyAuthContext(overrides: Partial<AgencyAuthContext> = {}): AgencyAuthContext {
  return createMockAuthContext({
    userId: 'other-user-id',
    userName: 'Other User',
    agencyId: 'other-agency-id',
    agencySlug: 'other-agency',
    agencyName: 'Other Agency',
    ...overrides,
  });
}

// ============================================
// NextRequest Builder
// ============================================

interface MockRequestOptions {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Create a NextRequest suitable for testing API routes.
 *
 * Example:
 *   const req = createMockRequest({
 *     method: 'POST',
 *     body: { name: 'Test', pin: '5678' },
 *     headers: { 'X-Session-Token': 'abc123' },
 *   });
 */
export function createMockRequest(options: MockRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    cookies = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  for (const [key, value] of Object.entries(searchParams)) {
    urlObj.searchParams.set(key, value);
  }

  // Build request init
  const init: import('next/dist/server/web/spec-extension/request').RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
    (init.headers as Headers).set('Content-Type', 'application/json');
  }

  const request = new NextRequest(urlObj.toString(), init);

  // Set cookies
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }

  return request;
}

// ============================================
// NextResponse Parser
// ============================================

/**
 * Parse a NextResponse and return the status code and parsed JSON body.
 *
 * Usage:
 *   const response = await POST(request);
 *   const { status, body } = await parseResponse(response);
 *   expect(status).toBe(200);
 *   expect(body.success).toBe(true);
 */
export async function parseResponse<T = Record<string, unknown>>(
  response: Response
): Promise<{ status: number; body: T }> {
  const body = await response.json() as T;
  return {
    status: response.status,
    body,
  };
}

// ============================================
// Common Test Data
// ============================================

export const TEST_IDS = {
  USER_ID: 'test-user-id',
  OTHER_USER_ID: 'other-user-id',
  AGENCY_ID: 'test-agency-id',
  OTHER_AGENCY_ID: 'other-agency-id',
  TODO_ID: 'test-todo-id',
  SESSION_TOKEN: 'test-session-token-abc123',
} as const;

export const TEST_USER = {
  id: TEST_IDS.USER_ID,
  name: 'Test User',
  color: '#0033A0',
  role: 'staff',
  pin_hash: '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5', // SHA256 of '12345678' — not a real pin hash
} as const;
