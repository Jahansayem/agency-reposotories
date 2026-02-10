import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { sendPasswordResetEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Rate limiting: 3 requests per 15 minutes per email
const RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(email);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * POST /api/auth/forgot-pin
 *
 * Request body: { email: string }
 *
 * Generates a secure reset token, stores it hashed in the database,
 * and sends a reset email to the user.
 *
 * Security:
 * - Rate limited to 3 requests per 15 minutes per email
 * - Token is 32-byte random, hashed before storage
 * - Tokens expire after 1 hour
 * - Returns same success message whether email exists or not (prevent enumeration)
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check rate limit
    if (!checkRateLimit(normalizedEmail)) {
      logger.warn('PIN reset rate limit exceeded', {
        component: 'forgot-pin',
        action: 'POST',
        metadata: { email: normalizedEmail },
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // Look up user by email (use service role to bypass RLS)
    const supabase = createServiceRoleClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', normalizedEmail)
      .single();

    // SECURITY: Always return same message to prevent email enumeration
    if (userError || !user) {
      logger.info('PIN reset requested for non-existent email', {
        component: 'forgot-pin',
        action: 'POST',
        metadata: { email: normalizedEmail },
      });

      // Return success even if email doesn't exist
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate secure random token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');

    // Hash token before storing (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Set expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store hashed token in database
    const { error: insertError } = await supabase
      .from('pin_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      logger.error('Failed to store reset token', insertError, {
        component: 'forgot-pin',
        action: 'POST',
        metadata: { userId: user.id },
      });
      return NextResponse.json(
        { error: 'Failed to process request. Please try again.' },
        { status: 500 }
      );
    }

    // Send reset email (fire-and-forget, failures are logged internally)
    await sendPasswordResetEmail(
      normalizedEmail,
      user.name,
      token
    );

    logger.info('PIN reset email sent', {
      component: 'forgot-pin',
      action: 'POST',
      metadata: { userId: user.id, email: normalizedEmail },
    });

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });

  } catch (error) {
    logger.error('Unexpected error in forgot-pin', error as Error, {
      component: 'forgot-pin',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
