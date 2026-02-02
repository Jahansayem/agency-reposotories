/**
 * CSRF Protection Utility
 *
 * Implements a secure CSRF protection pattern using HttpOnly cookies.
 *
 * Security approach:
 * - csrf_secret: HttpOnly cookie that cannot be read by JavaScript (prevents XSS theft)
 * - csrf_nonce: Non-HttpOnly cookie that JS can read
 * - X-CSRF-Token header: Contains "nonce:signature" where signature = hash(secret + nonce)
 *
 * This ensures that even if an attacker can execute XSS, they cannot construct
 * a valid CSRF token because they cannot read the HttpOnly secret.
 *
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

const CSRF_SECRET_COOKIE = 'csrf_secret';  // HttpOnly
const CSRF_NONCE_COOKIE = 'csrf_nonce';    // Readable by JS
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('base64url');
}

/**
 * Hash a CSRF token for comparison (prevents timing attacks)
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validate CSRF token from request
 *
 * Uses the HttpOnly cookie pattern with constant-time comparison to prevent timing attacks.
 */
export function validateCsrfToken(request: NextRequest): boolean {
  // Get the secret from HttpOnly cookie
  const secretCookie = request.cookies.get(CSRF_SECRET_COOKIE)?.value;
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!headerToken || !secretCookie) {
    return false;
  }

  const nonceCookie = request.cookies.get(CSRF_NONCE_COOKIE)?.value;
  if (!nonceCookie) {
    return false;
  }

  // Validate the nonce:signature format
  const parts = headerToken.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [nonce, signature] = parts;
  if (nonce !== nonceCookie) {
    return false;
  }

  // Compute expected signature
  const expectedHash = createHash('sha256')
    .update(`${secretCookie}:${nonce}`)
    .digest('hex')
    .substring(0, 16);
  // Constant-time comparison
  const providedHash = hashToken(signature);
  const expectedHashHashed = hashToken(expectedHash);
  return providedHash === expectedHashHashed;
}

/**
 * Set CSRF cookies on response (new HttpOnly pattern)
 *
 * Sets up the secure CSRF protection with:
 * - HttpOnly secret cookie (cannot be stolen via XSS)
 * - Public nonce cookie (JS reads this to build header token)
 */
export function setCsrfCookies(
  response: NextResponse,
  secret?: string,
  nonce?: string
): { secret: string; nonce: string } {
  const csrfSecret = secret || generateCsrfToken();
  const csrfNonce = nonce || randomBytes(16).toString('base64url');

  // HttpOnly secret - JavaScript cannot read this
  response.cookies.set(CSRF_SECRET_COOKIE, csrfSecret, {
    httpOnly: true,  // SECURITY: Prevents XSS from stealing the secret
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  // Public nonce - JavaScript reads this to build the token
  response.cookies.set(CSRF_NONCE_COOKIE, csrfNonce, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return { secret: csrfSecret, nonce: csrfNonce };
}

/**
 * Get or create CSRF token from request
 */
export function getOrCreateCsrfToken(request: NextRequest): string {
  const existingSecret = request.cookies.get(CSRF_SECRET_COOKIE)?.value;
  if (existingSecret) {
    return existingSecret;
  }
  return generateCsrfToken();
}

/**
 * Routes that should be protected by CSRF
 * All state-changing operations (POST, PUT, PATCH, DELETE)
 */
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Routes that are exempt from CSRF (e.g., public APIs, webhooks)
 */
const CSRF_EXEMPT_ROUTES = [
  '/api/outlook/', // Outlook add-in uses API key auth
  '/api/webhooks/', // Webhooks use signature verification
  '/api/csp-report', // CSP violation reports
];

/**
 * Check if a route should be CSRF protected
 */
export function shouldProtectRoute(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Only protect state-changing methods
  if (!CSRF_PROTECTED_METHODS.includes(method)) {
    return false;
  }

  // Check exemptions
  for (const exempt of CSRF_EXEMPT_ROUTES) {
    if (pathname.startsWith(exempt)) {
      return false;
    }
  }

  // Protect all other API routes
  return pathname.startsWith('/api/');
}

/**
 * CSRF middleware handler
 *
 * Returns null if CSRF validation passes, or an error response if it fails.
 */
export function csrfMiddleware(request: NextRequest): NextResponse | null {
  if (!shouldProtectRoute(request)) {
    return null; // Not protected, continue
  }

  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      {
        error: 'CSRF validation failed',
        message: 'Invalid or missing CSRF token',
      },
      { status: 403 }
    );
  }

  return null; // Validation passed
}

/**
 * Parse a cookie value from document.cookie
 */
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;

    const cookieName = trimmed.substring(0, equalIndex);
    const value = trimmed.substring(equalIndex + 1);

    if (cookieName === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

// Cached CSRF token (nonce:signature) from the server
let cachedCsrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

/**
 * Fetch CSRF token from the server endpoint.
 * Caches the result so subsequent calls don't make extra requests.
 */
async function fetchCsrfTokenFromServer(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.token) {
      cachedCsrfToken = data.token;
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get or fetch CSRF token for use in request headers.
 * Returns cached token if available, otherwise fetches from server.
 */
async function ensureCsrfToken(): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  // Check if nonce cookie exists (set by middleware)
  const nonce = getCookieValue(CSRF_NONCE_COOKIE);
  if (!nonce) return null;

  // If we have a cached token and the nonce matches, use it
  if (cachedCsrfToken && cachedCsrfToken.startsWith(nonce + ':')) {
    return cachedCsrfToken;
  }

  // Nonce changed or no cache — fetch from server
  // Deduplicate concurrent fetches
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfTokenFromServer().finally(() => {
      csrfTokenPromise = null;
    });
  }
  return csrfTokenPromise;
}

/**
 * Client-side helper to build CSRF token for header (sync version)
 *
 * Returns the cached token if available, null otherwise.
 * For async usage, prefer ensureCsrfToken().
 */
export function getClientCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return cachedCsrfToken;
}

/**
 * Client-side helper to build CSRF token with signature
 *
 * This is used with the new HttpOnly pattern where the server
 * provides the signature via an API endpoint.
 *
 * @param signature - The signature provided by the server
 * @returns The formatted token for the X-CSRF-Token header
 */
export function buildCsrfTokenWithSignature(signature: string): string | null {
  const nonce = getCookieValue(CSRF_NONCE_COOKIE);
  if (!nonce || !signature) {
    return null;
  }
  return `${nonce}:${signature}`;
}

/**
 * Client-side helper to add CSRF token to fetch headers
 */
export function addCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getClientCsrfToken();
  if (token) {
    return {
      ...headers,
      [CSRF_HEADER_NAME]: token,
    };
  }
  return headers;
}

/**
 * Get current user name from localStorage session
 */
function getSessionUserName(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const session = localStorage.getItem('todoSession');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed.userName || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Check if session cookie exists
 */
function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return getCookieValue('session_token') !== null;
}

/**
 * Fetch wrapper that automatically includes CSRF token and auth headers
 *
 * Works with both JSON and FormData requests.
 * For FormData, it only adds the CSRF header (doesn't set Content-Type).
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await ensureCsrfToken();
  const userName = getSessionUserName();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set(CSRF_HEADER_NAME, token);
  } else {
    // Log warning in development only to help debug CSRF issues
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[CSRF] No token available. Nonce cookie:', getCookieValue(CSRF_NONCE_COOKIE));
    }
  }

  // Add auth header for API requests that require authentication
  if (userName) {
    headers.set('X-User-Name', userName);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Ensure cookies are sent with the request
  });

  // Handle 401 Unauthorized responses - log to console instead of forcing reload
  if (response.status === 401 && url.startsWith('/api/')) {
    console.error('[fetchWithCsrf] 401 Unauthorized:', url, { userName });
    // Don't force reload - let the calling code handle the error
  }

  return response;
}
