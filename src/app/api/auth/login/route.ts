import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'crypto';
import { createSession } from '@/lib/sessionValidator';
import { checkLockout, recordFailedAttempt, clearLockout, getLockoutIdentifier } from '@/lib/serverLockout';
import { setSessionCookie } from '@/lib/sessionCookies';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/apiResponse';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTH_OPERATION_TIMEOUT_MS = 10000;

class AuthOperationTimeoutError extends Error {
  operation: string;

  constructor(operation: string) {
    super(`Authentication operation timed out: ${operation}`);
    this.name = 'AuthOperationTimeoutError';
    this.operation = operation;
  }
}

async function withOperationTimeout<T>(
  operation: string,
  fn: () => Promise<T>,
  timeoutMs: number = AUTH_OPERATION_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new AuthOperationTimeoutError(operation));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Type for agency_members join with agencies table
 * Used when fetching user's agency membership with agency details
 */
interface AgencyMembershipWithAgency {
  agency_id: string;
  role: string;
  is_default_agency?: boolean;
  agencies: {
    id?: string;
    name: string;
    slug?: string;
  };
}

interface LoginUserRow {
  id: string;
  name: string | null;
  color: string | null;
  pin_hash: string | null;
  role: string | null;
}

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

// Lazy initialization - only validate at runtime, not build time
// TYPE-012 Fix: Use SupabaseClient type instead of any
let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the login endpoint');
    }
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return supabase;
}

/**
 * Hash PIN using SHA-256 (server-side, matching existing client-side hash format)
 */
function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

/**
 * POST /api/auth/login
 *
 * Server-side login endpoint. Validates PIN against stored hash,
 * enforces server-side lockout, creates a DB-backed session,
 * and sets an HttpOnly session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pin } = body;

    if (!userId || !pin) {
      return apiErrorResponse('VALIDATION_ERROR', 'Missing userId or pin');
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return apiErrorResponse('VALIDATION_ERROR', 'Invalid PIN format');
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const lockoutId = getLockoutIdentifier(userId, ip);

    // Check server-side lockout
    const lockoutStatus = await withOperationTimeout('check_lockout', () => checkLockout(lockoutId));
    if (lockoutStatus.isLocked) {
      return NextResponse.json(
        {
          error: 'Account temporarily locked',
          remainingSeconds: lockoutStatus.remainingSeconds,
          attempts: lockoutStatus.attempts,
          maxAttempts: lockoutStatus.maxAttempts,
        },
        { status: 429 }
      );
    }

    // Fetch user from database (server-side only - never expose pin_hash to client)
    const { data: user, error: userError } = await withOperationTimeout<QueryResult<LoginUserRow>>(
      'fetch_user',
      async () =>
        await getSupabase()
          .from('users')
          .select('id, name, color, pin_hash, role')
          .eq('id', userId)
          .single()
    );

    if (userError || !user) {
      // Record failed attempt even if user not found (prevents user enumeration)
      await withOperationTimeout('record_failed_attempt_missing_user', () =>
        recordFailedAttempt(lockoutId, { ip, userAgent })
      );
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify PIN server-side using constant-time comparison
    const pinHash = hashPin(pin);
    const storedHash = user.pin_hash;

    if (!storedHash) {
      // User exists but has no PIN set (e.g., created via OAuth or incomplete registration)
      await recordFailedAttempt(lockoutId, { ip, userAgent, userName: user.name ?? undefined });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = storedHash.length === pinHash.length &&
      timingSafeEqual(Buffer.from(storedHash), Buffer.from(pinHash));
    if (!isValid) {
      const status = await withOperationTimeout('record_failed_attempt_invalid_pin', () =>
        recordFailedAttempt(lockoutId, {
          ip,
          userAgent,
          userName: user.name ?? undefined,
        })
      );

      return NextResponse.json(
        {
          error: 'Invalid credentials',
          ...(status.isLocked
            ? {
                locked: true,
                remainingSeconds: status.remainingSeconds,
              }
            : {
                attemptsRemaining: status.maxAttempts - status.attempts,
              }),
        },
        { status: 401 }
      );
    }

    // PIN is correct - clear lockout and create session
    await withOperationTimeout('clear_lockout', () => clearLockout(lockoutId));

    // Update last_login timestamp
    await withOperationTimeout<void>('update_last_login', async () => {
      const { error } = await getSupabase()
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    });

    // Look up user's default agency membership (including role and agency name)
    let agencyId: string | null = null;
    let agencyName: string | null = null;
    let agencyRole: string | null = null;

    // First try: default agency
    const { data: defaultMembership } = await withOperationTimeout<QueryResult<AgencyMembershipWithAgency>>(
      'fetch_default_membership',
      async () =>
        await getSupabase()
          .from('agency_members')
          .select('agency_id, role, agencies!inner(name)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .eq('is_default_agency', true)
          .limit(1)
          .maybeSingle()
    );

    if (defaultMembership?.agency_id) {
      const membership = defaultMembership as unknown as AgencyMembershipWithAgency;
      agencyId = membership.agency_id;
      agencyRole = membership.role;
      agencyName = membership.agencies?.name || null;
    } else {
      // Fallback: any active agency
      const { data: anyMembership } = await withOperationTimeout<QueryResult<AgencyMembershipWithAgency>>(
        'fetch_any_membership',
        async () =>
          await getSupabase()
            .from('agency_members')
            .select('agency_id, role, agencies!inner(name)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
      );

      if (anyMembership?.agency_id) {
        const membership = anyMembership as unknown as AgencyMembershipWithAgency;
        agencyId = membership.agency_id;
        agencyRole = membership.role;
        agencyName = membership.agencies?.name || null;
      }
    }

    // Fetch all agencies the user belongs to
    let agencies: Array<{ id: string; name: string; slug: string; role: string; is_default: boolean }> = [];
    {
      const { data: membershipRows } = await withOperationTimeout<QueryResult<AgencyMembershipWithAgency[]>>(
        'fetch_all_memberships',
        async () =>
          await getSupabase()
            .from('agency_members')
            .select('agency_id, role, is_default_agency, agencies!inner(id, name, slug)')
            .eq('user_id', userId)
            .eq('status', 'active')
      );

      if (membershipRows && Array.isArray(membershipRows)) {
        agencies = membershipRows.map((row) => {
          const membership = row as unknown as AgencyMembershipWithAgency;
          return {
            id: membership.agency_id,
            name: membership.agencies?.name || '',
            slug: membership.agencies?.slug || '',
            role: membership.role,
            is_default: membership.is_default_agency || false,
          };
        });
      }
    }

    // Create DB-backed session with agency context
    const session = await withOperationTimeout('create_session', () =>
      createSession(userId, ip, userAgent, agencyId || undefined)
    );
    if (!session) {
      logger.error('Failed to create session for user', null, { userId });
      return apiErrorResponse('SESSION_FAILED', 'Failed to create session', 500);
    }

    // Build response with HttpOnly session cookie
    // Include current agency info if user belongs to an agency
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        color: user.color,
        role: user.role || 'staff',
        // Include agency context in user object for convenience
        agencyId: agencyId || null,
        agencyName: agencyName || null,
        agencyRole: agencyRole || null,
      },
      // Also include at top level for backwards compatibility
      ...(agencyId ? { currentAgencyId: agencyId } : {}),
      ...(agencyName ? { currentAgencyName: agencyName } : {}),
      ...(agencyRole ? { currentAgencyRole: agencyRole } : {}),
      agencies,
    });

    // Set HttpOnly session cookie
    setSessionCookie(response, session.token);

    logger.info('User logged in successfully', {
      userId: user.id,
      userName: user.name,
      ip,
    });

    return response;
  } catch (error) {
    if (error instanceof AuthOperationTimeoutError) {
      logger.error('Login endpoint timeout', error, { operation: error.operation });
      return NextResponse.json(
        {
          error: 'Authentication request timed out',
          code: 'AUTH_TIMEOUT',
          operation: error.operation,
        },
        { status: 503 }
      );
    }

    logger.error('Login endpoint error', error, {});
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
