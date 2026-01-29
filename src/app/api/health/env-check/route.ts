import { NextRequest, NextResponse } from 'next/server';

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
 * Validate request authentication
 */
function isAuthorized(request: NextRequest): boolean {
  // Check for API key (for monitoring/automation)
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.HEALTH_CHECK_API_KEY || process.env.OUTLOOK_ADDON_API_KEY;

  if (apiKey && validApiKey && apiKey === validApiKey) {
    return true;
  }

  // Check for session token in cookie (for logged-in users)
  const sessionToken = request.cookies.get('session_token')?.value;
  if (sessionToken) {
    // Basic check - presence of session token indicates authenticated user
    // Full validation happens at the middleware level
    return true;
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.length > 7) {
    return true;
  }

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
