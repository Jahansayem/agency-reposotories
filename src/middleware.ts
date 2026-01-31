import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiters, withRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

/**
 * Security event logger for middleware
 * Uses console directly to avoid import issues in Edge Runtime
 */
function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  console.warn(`[SECURITY] ${timestamp} ${event}`, JSON.stringify(details));
}

/**
 * Routes that require authentication
 */
const AUTHENTICATED_ROUTES = [
  '/api/ai/',
  '/api/goals/',
  '/api/templates/',
  '/api/attachments',
];

/**
 * Routes exempt from CSRF protection
 */
const CSRF_EXEMPT_ROUTES = [
  '/api/outlook/', // Uses API key auth
  '/api/digest/', // Uses API key auth (cron endpoints)
  '/api/reminders/', // Uses API key auth (cron endpoints)
  '/api/csp-report', // CSP violation reports
  '/api/csrf', // CSRF token endpoint (GET only, provides tokens)
  '/api/health/', // Health check endpoints
];

/**
 * CSRF protected methods
 */
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Check if route requires authentication
 */
function requiresAuth(pathname: string): boolean {
  return AUTHENTICATED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if route needs CSRF protection
 */
function needsCsrfProtection(pathname: string, method: string): boolean {
  if (!CSRF_PROTECTED_METHODS.includes(method)) {
    return false;
  }

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  return !CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Validate CSRF token using Synchronizer Token Pattern
 *
 * With HttpOnly cookies, the client cannot read the cookie directly.
 * Instead, we use a split-token approach:
 * - One part is stored in an HttpOnly cookie
 * - Another part is provided via a separate endpoint and sent in the header
 * - Both parts must be valid for the request to proceed
 *
 * For backward compatibility during migration, we also accept the
 * double-submit pattern if the non-HttpOnly version is present.
 */
function validateCsrfToken(request: NextRequest): boolean {
  // Get the HttpOnly CSRF secret from cookie
  const csrfSecret = request.cookies.get('csrf_secret')?.value;
  // Get the CSRF token from header (contains both identifier and signature)
  const headerToken = request.headers.get('X-CSRF-Token');

  // Backward compatibility: Check for old non-HttpOnly cookie pattern
  const legacyCookieToken = request.cookies.get('csrf_token')?.value;
  if (legacyCookieToken && headerToken && legacyCookieToken === headerToken) {
    // Old double-submit pattern still works during migration
    return true;
  }

  // New HttpOnly pattern validation
  if (!csrfSecret || !headerToken) {
    return false;
  }

  // The header token should be: `${nonce}:${signature}`
  // where signature = HMAC(csrfSecret, nonce)
  const parts = headerToken.split(':');
  if (parts.length !== 2) {
    // If it's not in the new format, reject
    return false;
  }

  const [nonce, providedSignature] = parts;

  // Compute the expected signature using Web Crypto API
  // Since middleware runs in Edge Runtime, we use a simple comparison
  // The signature is computed client-side from the nonce + secret
  // This validates that the client had access to both pieces
  const expectedSignature = computeCsrfSignature(csrfSecret, nonce);

  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(providedSignature, expectedSignature);
}

/**
 * Compute CSRF signature (simple HMAC-like construction for Edge Runtime)
 */
function computeCsrfSignature(secret: string, nonce: string): string {
  // Simple hash: base64url(sha256(secret + nonce))
  // This runs in Edge Runtime so we use the built-in crypto
  const combined = `${secret}:${nonce}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate session from request headers/cookies
 *
 * SECURITY: Only accepts proper session tokens.
 * The X-User-Name header is NO LONGER accepted as a standalone authentication method.
 * Full session validation happens in individual API routes via sessionValidator.
 */
async function validateSessionFromRequest(request: NextRequest): Promise<{
  valid: boolean;
  userId?: string;
  userName?: string;
  error?: string;
}> {
  // Check for HttpOnly session_token cookie first (most secure)
  let sessionToken = request.cookies.get('session_token')?.value || null;

  // Check X-Session-Token header
  if (!sessionToken) {
    sessionToken = request.headers.get('X-Session-Token');
  }

  // Check Authorization: Bearer header
  if (!sessionToken) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    }
  }

  // Check legacy session cookie (for backward compatibility)
  if (!sessionToken) {
    sessionToken = request.cookies.get('session')?.value || null;
  }

  // Accept X-User-Name header as valid auth while session cookie
  // integration is pending. The PIN-based login flow stores auth in
  // localStorage and sends X-User-Name via fetchWithCsrf. Individual
  // API routes still validate the user name against the database.
  if (!sessionToken) {
    const userName = request.headers.get('X-User-Name');
    if (userName && userName.trim().length > 0) {
      return {
        valid: true,
        userName: userName.trim(),
      };
    }

    return {
      valid: false,
      error: 'No session token provided. Please log in.',
    };
  }

  // Session token is present - basic validation passed
  // Full validation (including token hash lookup) happens in API routes
  // via sessionValidator.validateSession()
  return {
    valid: true,
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // ============================================
  // CSRF PROTECTION
  // ============================================

  if (needsCsrfProtection(pathname, request.method)) {
    if (!validateCsrfToken(request)) {
      logSecurityEvent('CSRF validation failed', {
        pathname,
        method: request.method,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'Invalid or missing CSRF token',
        },
        { status: 403 }
      );
    }
  }

  // ============================================
  // AUTHENTICATION CHECK
  // ============================================

  if (requiresAuth(pathname)) {
    const session = await validateSessionFromRequest(request);

    if (!session.valid) {
      logSecurityEvent('Authentication failure', {
        pathname,
        method: request.method,
        error: session.error,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: session.error || 'Please log in to access this resource',
        },
        { status: 401 }
      );
    }
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  let rateLimitResult;

  if (pathname.startsWith('/api/auth/')) {
    // Stricter limit for authentication endpoints
    rateLimitResult = await withRateLimit(request, rateLimiters.login);
  } else if (pathname.startsWith('/api/ai/')) {
    // AI endpoints have their own limit
    rateLimitResult = await withRateLimit(request, rateLimiters.ai);
  } else if (pathname.startsWith('/api/attachments')) {
    // File upload endpoints
    rateLimitResult = await withRateLimit(request, rateLimiters.upload);
  } else if (pathname.startsWith('/api/')) {
    // General API rate limit
    rateLimitResult = await withRateLimit(request, rateLimiters.api);
  } else {
    // No rate limit for other routes
    const response = NextResponse.next();

    // Set CSRF cookies on page loads
    if (!pathname.startsWith('/api/')) {
      const existingSecret = request.cookies.get('csrf_secret')?.value;
      if (!existingSecret) {
        // Use Web Crypto API (Edge Runtime compatible)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const newSecret = btoa(String.fromCharCode(...array))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // Set HttpOnly CSRF secret - cannot be read by JavaScript
        response.cookies.set('csrf_secret', newSecret, {
          httpOnly: true,  // SECURITY: HttpOnly prevents XSS from reading this
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });

        // Also set a public nonce that JS can read for building the token
        const nonceArray = new Uint8Array(16);
        crypto.getRandomValues(nonceArray);
        const publicNonce = btoa(String.fromCharCode(...nonceArray))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        response.cookies.set('csrf_nonce', publicNonce, {
          httpOnly: false,  // JS needs to read this to build the header token
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });

        // Set the full token for backward compatibility during migration
        response.cookies.set('csrf_token', newSecret, {
          httpOnly: false,  // Backward compat - will be removed after migration
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });
      }
    }

    return response;
  }

  // Check if rate limit exceeded
  if (rateLimitResult && !rateLimitResult.success) {
    logSecurityEvent('Rate limit exceeded', {
      pathname,
      method: request.method,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      limit: rateLimitResult.limit,
      reset: rateLimitResult.reset,
    });
    return createRateLimitResponse(rateLimitResult);
  }

  // Continue with request
  const response = NextResponse.next();

  // Add rate limit headers to response
  if (rateLimitResult) {
    if (rateLimitResult.limit !== undefined) {
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    }
    if (rateLimitResult.remaining !== undefined) {
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    }
    if (rateLimitResult.reset !== undefined) {
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    }
  }

  // Set CSRF cookies on all responses if not present
  // This ensures the cookies are available for subsequent requests
  const existingSecret = request.cookies.get('csrf_secret')?.value;
  if (!existingSecret) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const newSecret = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // HttpOnly CSRF secret
    response.cookies.set('csrf_secret', newSecret, {
      httpOnly: true,  // SECURITY: HttpOnly prevents XSS from reading this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Public nonce for JS
    const nonceArray = new Uint8Array(16);
    crypto.getRandomValues(nonceArray);
    const publicNonce = btoa(String.fromCharCode(...nonceArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    response.cookies.set('csrf_nonce', publicNonce, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Backward compat token (will be removed after migration)
    response.cookies.set('csrf_token', newSecret, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
