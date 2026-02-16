import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { sendPasswordResetEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimiters, createRateLimitResponse } from '@/lib/rateLimit';
import crypto from 'crypto';

/**
 * POST /api/auth/forgot-pin
 *
 * Request body: { email: string }
 *
 * Generates a secure reset token, stores it hashed in the database,
 * and sends a reset email to the user.
 *
 * Security:
 * - Rate limited via Redis (shared across instances), 5 requests per 15 minutes per IP
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

    // Check rate limit using Redis-backed rate limiting (shared across instances)
    // Uses the login limiter: 5 requests per 15 minutes per IP
    const rateLimitResult = await withRateLimit(request, rateLimiters.login);
    if (!rateLimitResult.success) {
      logger.warn('PIN reset rate limit exceeded', {
        component: 'forgot-pin',
        action: 'POST',
        metadata: { email: normalizedEmail },
      });
      return createRateLimitResponse(rateLimitResult);
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
