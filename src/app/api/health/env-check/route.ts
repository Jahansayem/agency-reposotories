import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Environment variable check endpoint (Secured)
 *
 * Returns ONLY boolean "configured" status for required environment variables.
 * SECURITY: No metadata like lengths, prefixes, or variable names are exposed.
 *
 * Requires authentication via:
 * - Valid API key in X-API-Key header (for automated monitoring)
 * - Valid session token (for authenticated users)
 */

/**
 * Timing-safe string comparison to prevent timing attacks on API key checks.
 * Returns false if either string is empty or if lengths differ.
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  // Pad the shorter value so timingSafeEqual gets equal-length buffers;
  // the length mismatch already leaks some timing info, but this avoids
  // the exception and still prevents content-based timing attacks.
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate request authentication
 */
function isAuthorized(request: NextRequest): boolean {
  // Check for API key (for monitoring/automation)
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.HEALTH_CHECK_API_KEY || process.env.OUTLOOK_ADDON_API_KEY;

  if (apiKey && validApiKey && safeCompare(apiKey, validApiKey)) {
    return true;
  }

  // Check Authorization header against a configured admin API key
  const authHeader = request.headers.get('Authorization');
  const adminApiKey = process.env.ADMIN_API_KEY || process.env.HEALTH_CHECK_API_KEY || process.env.OUTLOOK_ADDON_API_KEY;
  if (authHeader?.startsWith('Bearer ') && adminApiKey && safeCompare(authHeader, `Bearer ${adminApiKey}`)) {
    return true;
  }

  // Session-based access is NOT allowed for this endpoint.
  // Health check endpoints should only be accessible via explicit API keys
  // to prevent authenticated users from viewing server configuration status.
  return false;
}

export async function GET(request: NextRequest) {
  // SECURITY: Require authentication to access environment status
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required to access this endpoint',
      },
      { status: 401 }
    );
  }

  // Return ONLY boolean status - no metadata that could aid attackers
  const envStatus = {
    // AI features configured
    ai_configured: !!(process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY),

    // Database configured
    database_configured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),

    // External integrations configured
    outlook_configured: !!process.env.OUTLOOK_ADDON_API_KEY,
    redis_configured: !!process.env.UPSTASH_REDIS_REST_URL,
    sentry_configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment
    is_production: process.env.NODE_ENV === 'production',
  };

  // Overall readiness status
  const isReady = envStatus.ai_configured && envStatus.database_configured;

  return NextResponse.json({
    status: isReady ? 'ok' : 'missing_config',
    ready: isReady,
    services: envStatus,
  });
}
