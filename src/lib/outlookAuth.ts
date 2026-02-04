import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Allowed origins for Outlook add-in CORS requests.
 * Only these origins are permitted to make cross-origin requests to Outlook API endpoints.
 */
export const OUTLOOK_ALLOWED_ORIGINS = [
  'https://outlook.office.com',
  'https://outlook.office365.com',
  'https://outlook.live.com',
  'https://outlook-sdf.office.com',
  'https://outlook-sdf.office365.com',
  process.env.NEXT_PUBLIC_APP_URL || 'https://shared-todo-list-production.up.railway.app',
].filter(Boolean) as string[];

/**
 * Constant-time string comparison using crypto.timingSafeEqual.
 * Prevents timing attacks on API key validation.
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
}

/**
 * Verify the Outlook add-in API key from a request header.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyOutlookApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const expectedKey = process.env.OUTLOOK_ADDON_API_KEY;

  if (!apiKey || !expectedKey) {
    return false;
  }

  return safeCompare(apiKey, expectedKey);
}

/**
 * Get the matching allowed origin for a request, or null if the origin is not allowed.
 * This returns a single origin string (not a comma-separated list) as required by the
 * Access-Control-Allow-Origin header spec.
 */
export function getMatchingOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) {
    return null;
  }
  if (OUTLOOK_ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return null;
}

/**
 * Build CORS headers for an Outlook API response.
 * Only includes the requesting origin if it is in the allowed list.
 */
export function buildOutlookCorsHeaders(request: NextRequest, methods: string): Record<string, string> {
  const matchedOrigin = getMatchingOrigin(request);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
  if (matchedOrigin) {
    headers['Access-Control-Allow-Origin'] = matchedOrigin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

/**
 * Create a CORS preflight response for Outlook API endpoints.
 * Only allows origins from the OUTLOOK_ALLOWED_ORIGINS list.
 */
export function createOutlookCorsPreflightResponse(request: NextRequest, methods: string): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: buildOutlookCorsHeaders(request, methods),
  });
}
