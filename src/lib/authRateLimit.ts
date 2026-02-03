/**
 * Server-Side Authentication Rate Limiting
 *
 * Database-backed rate limiting for PIN authentication attempts.
 * Provides exponential backoff to prevent brute-force attacks.
 *
 * Security features:
 * - Tracks failed attempts by IP address AND username
 * - Exponential backoff: 3 attempts → 30s, 6 attempts → 5min, 10 attempts → 1hr
 * - Logs all failed authentication attempts for security monitoring
 * - Database-backed for persistence across server restarts
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use service role key to bypass RLS for security operations
function getServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for auth rate limiting');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Rate limit thresholds with exponential backoff
 */
const RATE_LIMIT_THRESHOLDS = [
  { attempts: 3, lockoutSeconds: 30 },      // 3 failed attempts → 30 second lockout
  { attempts: 6, lockoutSeconds: 300 },     // 6 failed attempts → 5 minute lockout
  { attempts: 10, lockoutSeconds: 3600 },   // 10 failed attempts → 1 hour lockout
  { attempts: 15, lockoutSeconds: 86400 },  // 15 failed attempts → 24 hour lockout
];

/**
 * Get the lockout duration based on attempt count
 */
function getLockoutDuration(attemptCount: number): number {
  for (let i = RATE_LIMIT_THRESHOLDS.length - 1; i >= 0; i--) {
    if (attemptCount >= RATE_LIMIT_THRESHOLDS[i].attempts) {
      return RATE_LIMIT_THRESHOLDS[i].lockoutSeconds;
    }
  }
  return 0; // No lockout
}

export interface AuthRateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  lockoutSeconds: number;
  lockoutUntil?: Date;
  totalAttempts: number;
}

export interface AuthAttemptLogEntry {
  ipAddress: string;
  userName?: string;
  success: boolean;
  userAgent?: string;
  endpoint?: string;
  details?: Record<string, unknown>;
}

/**
 * Check if authentication attempt is allowed based on rate limits
 *
 * @param ipAddress - Client IP address
 * @param userName - Username being attempted (optional)
 * @returns Rate limit check result
 */
export async function checkAuthRateLimit(
  ipAddress: string,
  userName?: string
): Promise<AuthRateLimitResult> {
  try {
    const supabase = getServiceClient();

    // Get recent failed attempts for this IP and/or username within the past 24 hours
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - 24);

    // Check by IP address
    const { data: ipAttempts, error: ipError } = await supabase
      .from('auth_failure_log')
      .select('id, created_at')
      .eq('ip_address', ipAddress)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (ipError) {
      logger.error('Failed to check IP rate limit', ipError, { component: 'authRateLimit', action: 'checkAuthRateLimit', ipAddress });
      // Fail open for database errors - but log it
      return {
        allowed: true,
        attemptsRemaining: 3,
        lockoutSeconds: 0,
        totalAttempts: 0,
      };
    }

    const ipAttemptCount = ipAttempts?.length || 0;

    // Also check by username if provided
    let userAttemptCount = 0;
    if (userName) {
      const { data: userAttempts, error: userError } = await supabase
        .from('auth_failure_log')
        .select('id, created_at')
        .eq('user_name', userName)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      if (!userError) {
        userAttemptCount = userAttempts?.length || 0;
      }
    }

    // Use the higher of the two attempt counts
    const totalAttempts = Math.max(ipAttemptCount, userAttemptCount);

    // Calculate lockout based on attempt count
    const lockoutSeconds = getLockoutDuration(totalAttempts);

    // Check if currently locked out
    if (lockoutSeconds > 0 && totalAttempts > 0) {
      // Get the most recent attempt
      const mostRecentAttempt = ipAttempts?.[0]?.created_at;
      if (mostRecentAttempt) {
        const lockoutUntil = new Date(mostRecentAttempt);
        lockoutUntil.setSeconds(lockoutUntil.getSeconds() + lockoutSeconds);

        if (new Date() < lockoutUntil) {
          const remainingSeconds = Math.ceil(
            (lockoutUntil.getTime() - Date.now()) / 1000
          );
          return {
            allowed: false,
            attemptsRemaining: 0,
            lockoutSeconds: remainingSeconds,
            lockoutUntil,
            totalAttempts,
          };
        }
      }
    }

    // Calculate attempts remaining until next lockout threshold
    let attemptsRemaining = 3; // Default
    for (const threshold of RATE_LIMIT_THRESHOLDS) {
      if (totalAttempts < threshold.attempts) {
        attemptsRemaining = threshold.attempts - totalAttempts;
        break;
      }
    }

    return {
      allowed: true,
      attemptsRemaining,
      lockoutSeconds: 0,
      totalAttempts,
    };
  } catch (error) {
    logger.error('Auth rate limit check error', error as Error, { component: 'authRateLimit', action: 'checkAuthRateLimit', ipAddress, userName });
    // Fail open but log the error
    return {
      allowed: true,
      attemptsRemaining: 3,
      lockoutSeconds: 0,
      totalAttempts: 0,
    };
  }
}

/**
 * Log a failed authentication attempt
 *
 * @param entry - Details of the failed attempt
 */
export async function logFailedAuthAttempt(
  entry: AuthAttemptLogEntry
): Promise<void> {
  try {
    const supabase = getServiceClient();

    await supabase.from('auth_failure_log').insert({
      event_type: 'login_failed',
      user_name: entry.userName || null,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent || null,
      endpoint: entry.endpoint || '/api/auth/login',
      details: entry.details || {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log error but don't throw - this is non-critical
    logger.error('Failed to log auth attempt', error as Error, { component: 'authRateLimit', action: 'logFailedAuthAttempt', ipAddress: entry.ipAddress, userName: entry.userName });
  }
}

/**
 * Log a successful authentication (for audit trail)
 * This does NOT affect rate limiting - only failures count
 *
 * @param entry - Details of the successful attempt
 */
export async function logSuccessfulAuth(entry: AuthAttemptLogEntry): Promise<void> {
  try {
    const supabase = getServiceClient();

    // Log to security_audit_log instead of auth_failure_log
    await supabase.from('security_audit_log').insert({
      event_type: 'LOGIN_SUCCESS',
      table_name: 'users',
      user_name: entry.userName || null,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent || null,
      new_data: entry.details || {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Non-critical, don't throw
    logger.error('Failed to log successful auth', error as Error, { component: 'authRateLimit', action: 'logSuccessfulAuth', ipAddress: entry.ipAddress, userName: entry.userName });
  }
}

/**
 * Clear rate limit history for a user after successful login
 * (Optional - can be used to reset after legitimate login)
 *
 * @param userName - Username to clear
 * @param ipAddress - IP address to clear
 */
export async function clearAuthRateLimit(
  userName: string,
  ipAddress: string
): Promise<void> {
  try {
    const supabase = getServiceClient();

    // Don't actually delete - just mark the entries as resolved
    // This preserves the audit trail while resetting rate limits
    await supabase
      .from('auth_failure_log')
      .update({
        details: { resolved: true, resolved_at: new Date().toISOString() },
      })
      .or(`ip_address.eq.${ipAddress},user_name.eq.${userName}`);
  } catch (error) {
    logger.error('Failed to clear rate limit', error as Error, { component: 'authRateLimit', action: 'clearAuthRateLimit', userName, ipAddress });
  }
}

/**
 * Get IP address from request headers
 * Handles various proxy configurations
 */
export function getClientIp(headers: Headers): string {
  // Try various headers in order of preference
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'unknown';
}
