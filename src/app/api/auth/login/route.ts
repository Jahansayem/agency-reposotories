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
    const lockoutStatus = await checkLockout(lockoutId);
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
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .select('id, name, color, pin_hash, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      // Record failed attempt even if user not found (prevents user enumeration)
      await recordFailedAttempt(lockoutId, { ip, userAgent });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify PIN server-side using constant-time comparison
    const pinHash = hashPin(pin);
    const storedHash = user.pin_hash;
    const isValid = storedHash.length === pinHash.length &&
      timingSafeEqual(Buffer.from(storedHash), Buffer.from(pinHash));
    if (!isValid) {
      const status = await recordFailedAttempt(lockoutId, {
        ip,
        userAgent,
        userName: user.name,
      });

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
    await clearLockout(lockoutId);

    // Update last_login timestamp
    await getSupabase()
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    // Look up user's default agency membership (including role and agency name)
    let agencyId: string | null = null;
    let agencyName: string | null = null;
    let agencyRole: string | null = null;

    // First try: default agency
    const { data: defaultMembership } = await getSupabase()
      .from('agency_members')
      .select('agency_id, role, agencies!inner(name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_default_agency', true)
      .limit(1)
      .maybeSingle();

    if (defaultMembership?.agency_id) {
      agencyId = defaultMembership.agency_id;
      agencyRole = defaultMembership.role;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agencyName = (defaultMembership.agencies as any)?.name || null;
    } else {
      // Fallback: any active agency
      const { data: anyMembership } = await getSupabase()
        .from('agency_members')
        .select('agency_id, role, agencies!inner(name)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (anyMembership?.agency_id) {
        agencyId = anyMembership.agency_id;
        agencyRole = anyMembership.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agencyName = (anyMembership.agencies as any)?.name || null;
      }
    }

    // Fetch all agencies the user belongs to
    let agencies: Array<{ id: string; name: string; slug: string; role: string; is_default: boolean }> = [];
    {
      const { data: membershipRows } = await getSupabase()
        .from('agency_members')
        .select('agency_id, role, is_default_agency, agencies!inner(id, name, slug)')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (membershipRows && Array.isArray(membershipRows)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agencies = membershipRows.map((row: any) => ({
          id: row.agency_id,
          name: row.agencies?.name || '',
          slug: row.agencies?.slug || '',
          role: row.role,
          is_default: row.is_default_agency || false,
        }));
      }
    }

    // Create DB-backed session with agency context
    const session = await createSession(userId, ip, userAgent, agencyId || undefined);
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
    logger.error('Login endpoint error', error, {});
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
