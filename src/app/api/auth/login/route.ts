import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'crypto';
import { createSession } from '@/lib/sessionValidator';
import { checkLockout, recordFailedAttempt, clearLockout, getLockoutIdentifier } from '@/lib/serverLockout';
import { setSessionCookie } from '@/lib/sessionCookies';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the login endpoint');
}
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
      return NextResponse.json(
        { error: 'Missing userId or pin' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Invalid PIN format' },
        { status: 400 }
      );
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
    const { data: user, error: userError } = await supabase
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
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    // Create DB-backed session
    const session = await createSession(userId, ip, userAgent);
    if (!session) {
      logger.error('Failed to create session for user', null, { userId });
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Build response with HttpOnly session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        color: user.color,
        role: user.role || 'member',
      },
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
