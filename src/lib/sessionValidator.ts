/**
 * Server-side Session Validation
 *
 * Validates session tokens for API endpoints.
 * Used to protect AI endpoints and other authenticated routes.
 */

import { NextRequest } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { createServiceRoleClient } from './supabaseClient';
import { logger } from './logger';

// Session validation is a server-side operation that requires elevated privileges
// to bypass RLS and access user_sessions table directly.
function getSupabaseAdmin() {
  try {
    return createServiceRoleClient();
  } catch (error) {
    logger.error('[SESSION] CRITICAL: Cannot create service role client. Session validation will fail.', error, { component: 'SessionValidator' });
    throw new Error('Session validation unavailable: SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
}

export interface SessionValidationResult {
  valid: boolean;
  userId?: string;
  userName?: string;
  userRole?: string;
  agencyId?: string;
  error?: string;
}

/**
 * Hash a session token for storage/comparison
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

// Idle timeout in minutes
const IDLE_TIMEOUT_MINUTES = 30;

/**
 * Validate a session from request headers
 *
 * SECURITY: Only accepts proper session tokens. X-User-Name header
 * is NOT trusted as a standalone authentication method.
 *
 * Checks for session token in:
 * 1. HttpOnly session_token cookie (preferred, most secure)
 * 2. X-Session-Token header
 * 3. Authorization: Bearer <token> header
 * 4. Legacy session cookie
 */
export async function validateSession(
  request: NextRequest
): Promise<SessionValidationResult> {
  try {
    // Try to get session token from various sources (prefer HttpOnly cookie)
    let sessionToken: string | null = null;

    // Check HttpOnly session_token cookie first (most secure)
    const httpOnlyCookie = request.cookies.get('session_token');
    if (httpOnlyCookie?.value) {
      sessionToken = httpOnlyCookie.value;
    }

    // Check X-Session-Token header
    if (!sessionToken) {
      sessionToken = request.headers.get('X-Session-Token');
    }

    // Check Authorization header
    if (!sessionToken) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    // Check legacy session cookie
    if (!sessionToken) {
      const sessionCookie = request.cookies.get('session');
      sessionToken = sessionCookie?.value || null;
    }

    // SECURITY: X-User-Name header is NOT accepted as standalone authentication
    // This prevents spoofing attacks where an attacker simply sets the header
    // to impersonate another user

    if (!sessionToken) {
      return {
        valid: false,
        error: 'No session token provided. Please log in.',
      };
    }

    // Validate session token against database
    const tokenHash = hashSessionToken(sessionToken!);

    interface SessionRpcResult {
      user_id: string;
      user_name: string;
      user_role: string;
      agency_id: string | null;
      valid: boolean;
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .rpc('validate_session_token', { p_token_hash: tokenHash })
      .single<SessionRpcResult>();

    if (error) {
      // RPC might not exist yet - fall back to direct query
      logger.warn('[SESSION] RPC validate_session_token failed, using fallback query path. Consider running the latest migration.', { component: 'SessionValidator', error: error.message });
      // First get the session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('user_sessions')
        .select('user_id, expires_at, is_valid, last_activity, current_agency_id')
        .eq('token_hash', tokenHash)
        .single();

      if (sessionError || !session) {
        return {
          valid: false,
          error: 'Invalid session token',
        };
      }

      const isExpired = new Date(session.expires_at) < new Date();
      if (!session.is_valid || isExpired) {
        return {
          valid: false,
          error: 'Session expired',
        };
      }

      // Check idle timeout
      if (session.last_activity) {
        const lastActivity = new Date(session.last_activity);
        const idleTime = Date.now() - lastActivity.getTime();
        const idleTimeoutMs = IDLE_TIMEOUT_MINUTES * 60 * 1000;

        if (idleTime > idleTimeoutMs) {
          // Invalidate the session due to idle timeout
          await supabaseAdmin
            .from('user_sessions')
            .update({ is_valid: false })
            .eq('token_hash', tokenHash);

          return {
            valid: false,
            error: 'Session expired due to inactivity',
          };
        }
      }

      // Update last activity timestamp (non-blocking)
      touchSession(tokenHash).catch(() => {
        // Ignore errors - this is non-critical
      });

      // Then get the user details
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('name, role')
        .eq('id', session.user_id)
        .single();

      if (userError || !user) {
        return {
          valid: false,
          error: 'User not found',
        };
      }

      return {
        valid: true,
        userId: session.user_id,
        userName: user.name,
        userRole: user.role || 'staff',
        agencyId: session.current_agency_id || undefined,
      };
    }

    if (!data || !data.valid) {
      return {
        valid: false,
        error: 'Session expired or invalid',
      };
    }

    return {
      valid: true,
      userId: data.user_id,
      userName: data.user_name,
      userRole: data.user_role || 'staff',
      agencyId: data.agency_id || undefined,
    };
  } catch (error) {
    logger.error('Session validation error:', error, { component: 'SessionValidator' });
    return {
      valid: false,
      error: 'Session validation failed',
    };
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  agencyId?: string
): Promise<{ token: string; expiresAt: Date } | null> {
  try {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);

    // Session expires in 8 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    const supabaseAdmin = getSupabaseAdmin();
    const sessionData: Record<string, unknown> = {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      is_valid: true,
    };

    if (agencyId) {
      sessionData.current_agency_id = agencyId;
    }

    let { error } = await supabaseAdmin.from('user_sessions').insert(sessionData);

    // If the current_agency_id column doesn't exist yet (migration not run),
    // retry without it so login still works
    if (error && error.code === 'PGRST204' && agencyId) {
      logger.warn('user_sessions table missing current_agency_id column, retrying without it. Run the latest migration to fix.', {
        component: 'SessionValidator',
      });
      delete sessionData.current_agency_id;
      ({ error } = await supabaseAdmin.from('user_sessions').insert(sessionData));
    }

    if (error) {
      logger.error('Failed to create session:', error, {
        component: 'SessionValidator',
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint
      });
      return null;
    }

    return { token, expiresAt };
  } catch (error) {
    logger.error('Session creation error:', error, { component: 'SessionValidator' });
    return null;
  }
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(tokenHash: string): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({ is_valid: false })
      .eq('token_hash', tokenHash);

    return !error;
  } catch (error) {
    logger.error('Session invalidation error:', error, { component: 'SessionValidator' });
    return false;
  }
}

/**
 * Invalidate all sessions for a user (logout everywhere)
 */
export async function invalidateAllUserSessions(userId: string): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({ is_valid: false })
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    logger.error('Session invalidation error:', error, { component: 'SessionValidator' });
    return false;
  }
}

/**
 * Update session last activity timestamp
 */
export async function touchSession(tokenHash: string): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('token_hash', tokenHash);
  } catch (error) {
    // Non-critical, don't throw
    logger.error('Failed to update session activity:', error, { component: 'SessionValidator' });
  }
}
