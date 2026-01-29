import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * CSRF Token Endpoint
 *
 * Provides the CSRF signature for the new HttpOnly cookie pattern.
 * The client calls this endpoint to get the signature needed for the X-CSRF-Token header.
 *
 * Security:
 * - The csrf_secret cookie is HttpOnly and cannot be read by JavaScript
 * - This endpoint reads the secret and computes the signature
 * - The signature alone is not useful without the nonce
 */

/**
 * Compute CSRF signature using HMAC-like construction
 */
function computeSignature(secret: string, nonce: string): string {
  // Use SHA-256 for the signature
  const combined = `${secret}:${nonce}`;
  const hash = createHash('sha256').update(combined).digest('hex');
  // Return first 16 characters for a shorter signature
  return hash.substring(0, 16);
}

/**
 * GET /api/csrf
 *
 * Returns the CSRF signature for the current session.
 * The client must include the nonce in the header token.
 */
export async function GET(request: NextRequest) {
  // Get the HttpOnly secret from cookie
  const secret = request.cookies.get('csrf_secret')?.value;
  const nonce = request.cookies.get('csrf_nonce')?.value;

  if (!secret || !nonce) {
    // No CSRF cookies yet - client should refresh to get them
    return NextResponse.json(
      {
        error: 'No CSRF session',
        message: 'Please refresh the page to establish a CSRF session',
      },
      { status: 400 }
    );
  }

  // Compute the signature
  const signature = computeSignature(secret, nonce);

  // Return the signature and nonce (client needs both)
  return NextResponse.json({
    nonce,
    signature,
    // The client should build the token as: `${nonce}:${signature}`
    token: `${nonce}:${signature}`,
  });
}
