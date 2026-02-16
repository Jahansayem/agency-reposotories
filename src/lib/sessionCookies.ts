/**
 * Secure Session Cookie Management
 *
 * Provides HttpOnly cookie-based session management for enhanced security.
 * Sessions are stored in HttpOnly cookies to prevent XSS attacks from
 * accessing session tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSessionToken, hashSessionToken } from './sessionValidator';
import { logger } from './logger';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
}

/**
 * Get secure cookie options for production/development
 */
export function getSecureCookieOptions(maxAge: number = SESSION_MAX_AGE): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // Prevents CSRF
    path: '/',
    maxAge,
  };
}

/**
 * Set session token cookie on response
 */
export function setSessionCookie(
  response: NextResponse,
  sessionToken: string,
  maxAge: number = SESSION_MAX_AGE
): NextResponse {
  const options = getSecureCookieOptions(maxAge);

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, options);

  return response;
}

/**
 * Clear session cookie (for logout)
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...getSecureCookieOptions(0),
    maxAge: 0,
  });

  return response;
}

/**
 * Get session token from request (checks cookie first, then headers)
 */
export function getSessionTokenFromRequest(request: NextRequest): string | null {
  // Check HttpOnly cookie first (preferred)
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Fall back to header for API clients
  const headerToken = request.headers.get('X-Session-Token');
  if (headerToken) {
    return headerToken;
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Create a new session and set the cookie
 * Returns the response with the session cookie set
 */
export async function createSessionWithCookie(
  userId: string,
  response: NextResponse,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; tokenHash: string; expiresAt: Date } | null> {
  try {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);

    // Session expires in 8 hours
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + SESSION_MAX_AGE);

    // Set the HttpOnly cookie
    setSessionCookie(response, token, SESSION_MAX_AGE);

    return { token, tokenHash, expiresAt };
  } catch (error) {
    logger.error('Failed to create session with cookie:', error, { component: 'SessionCookies' });
    return null;
  }
}

/**
 * Refresh session cookie if it's close to expiring
 * Call this on successful authenticated requests
 */
export function refreshSessionCookieIfNeeded(
  request: NextRequest,
  response: NextResponse,
  sessionLastActivity?: Date
): NextResponse {
  const currentToken = getSessionTokenFromRequest(request);

  if (!currentToken) {
    return response;
  }

  // If session was recently active, refresh the cookie
  if (sessionLastActivity) {
    const timeSinceActivity = Date.now() - sessionLastActivity.getTime();
    const halfMaxAge = (SESSION_MAX_AGE * 1000) / 2;

    // Refresh if more than half the max age has passed
    if (timeSinceActivity > halfMaxAge) {
      setSessionCookie(response, currentToken, SESSION_MAX_AGE);
    }
  }

  return response;
}

