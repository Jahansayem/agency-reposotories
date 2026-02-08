import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { hashPin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * POST /api/auth/reset-pin
 *
 * Request body: { token: string, pin: string }
 *
 * Validates the reset token and updates the user's PIN.
 *
 * Security:
 * - Token is verified by hashing and comparing with stored hash
 * - Token must not be expired
 * - Token can only be used once (marked as used_at)
 * - PIN is hashed client-side (SHA-256) before sending
 */
export async function POST(request: NextRequest) {
  try {
    const { token, pin } = await request.json();

    // Validate inputs
    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Invalid PIN format. Must be 4 digits.' },
        { status: 400 }
      );
    }

    // Hash the provided token to look up in database
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Look up token in database
    const { data: resetToken, error: tokenError } = await supabase
      .from('pin_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .single();

    // Check if token exists
    if (tokenError || !resetToken) {
      logger.warn('Invalid reset token attempted', {
        component: 'reset-pin',
        action: 'POST',
        metadata: { tokenProvided: !!token },
      });
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (resetToken.used_at) {
      logger.warn('Already-used reset token attempted', {
        component: 'reset-pin',
        action: 'POST',
        metadata: { tokenId: resetToken.id, userId: resetToken.user_id },
      });
      return NextResponse.json(
        { error: 'This reset token has already been used' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    if (now > expiresAt) {
      logger.warn('Expired reset token attempted', {
        component: 'reset-pin',
        action: 'POST',
        metadata: { tokenId: resetToken.id, userId: resetToken.user_id, expiresAt: resetToken.expires_at },
      });
      return NextResponse.json(
        { error: 'This reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash the new PIN (client should have already hashed it, but we hash again for storage)
    const pinHash = await hashPin(pin);

    // Update user's PIN
    const { error: updateError } = await supabase
      .from('users')
      .update({ pin_hash: pinHash })
      .eq('id', resetToken.user_id);

    if (updateError) {
      logger.error('Failed to update PIN', updateError, {
        component: 'reset-pin',
        action: 'POST',
        metadata: { userId: resetToken.user_id },
      });
      return NextResponse.json(
        { error: 'Failed to reset PIN. Please try again.' },
        { status: 500 }
      );
    }

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('pin_reset_tokens')
      .update({ used_at: now.toISOString() })
      .eq('id', resetToken.id);

    if (markUsedError) {
      logger.error('Failed to mark token as used (PIN was updated)', markUsedError, {
        component: 'reset-pin',
        action: 'POST',
        metadata: { tokenId: resetToken.id, userId: resetToken.user_id },
      });
      // Don't fail the request - PIN was already updated
    }

    logger.info('PIN reset successful', {
      component: 'reset-pin',
      action: 'POST',
      metadata: { userId: resetToken.user_id },
    });

    return NextResponse.json({
      success: true,
      message: 'Your PIN has been reset successfully. You can now log in with your new PIN.',
    });

  } catch (error) {
    logger.error('Unexpected error in reset-pin', error as Error, {
      component: 'reset-pin',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
