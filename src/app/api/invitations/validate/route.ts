import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/apiResponse';

/**
 * Hash an invitation token for DB lookup
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Simple in-memory rate limiter for token validation.
 * Prevents brute-force token scanning.
 * Max 10 requests per minute per IP.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkInMemoryRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Periodically clean up expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * POST /api/invitations/validate
 *
 * Validate an invitation token. Public endpoint used by the /join/[token] page
 * to display invitation details before the user accepts.
 *
 * Rate-limited: max 10 requests per minute per IP.
 *
 * Request body: { token: string }
 * Response: { valid, agency_name?, agency_color?, role?, email?, expires_at? }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (!checkInMemoryRateLimit(ip)) {
      return apiErrorResponse('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return apiErrorResponse('VALIDATION_ERROR', 'Token is required');
    }

    // Validate token format (should be 64 hex chars from randomBytes(32).toString('hex'))
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return apiErrorResponse('INVALID_TOKEN', 'Invalid token format');
    }

    const tokenHash = hashToken(token);
    const supabase = createServiceRoleClient();

    // Look up invitation by token hash
    const { data: invitation, error } = await supabase
      .from('agency_invitations')
      .select('id, agency_id, email, role, status, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      logger.error('Failed to validate invitation token', error, {});
      return apiErrorResponse('VALIDATION_FAILED', 'Validation failed', 500);
    }

    if (!invitation) {
      return NextResponse.json({ valid: false, error: 'Invalid invitation token' });
    }

    // Check status
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        valid: false,
        error: invitation.status === 'accepted'
          ? 'This invitation has already been accepted'
          : 'This invitation is no longer valid',
      });
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'This invitation has expired',
      });
    }

    // Get agency details
    const { data: agency } = await supabase
      .from('agencies')
      .select('name, primary_color, is_active')
      .eq('id', invitation.agency_id)
      .single();

    if (!agency || !agency.is_active) {
      return NextResponse.json({
        valid: false,
        error: 'The agency associated with this invitation is no longer active',
      });
    }

    return NextResponse.json({
      valid: true,
      agency_name: agency.name,
      agency_color: agency.primary_color,
      role: invitation.role,
      email: invitation.email,
      expires_at: invitation.expires_at,
    });
  } catch (error) {
    logger.error('Validate invitation error', error, {});
    return apiErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
