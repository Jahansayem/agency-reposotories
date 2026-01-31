import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

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
 * Compute CSRF signature using HMAC-SHA256
 *
 * Must match the middleware's computeCsrfSignature which uses
 * crypto.subtle HMAC-SHA256 with the secret as key and nonce as data,
 * then takes the first 32 hex characters.
 */
function computeSignature(secret: string, nonce: string): string {
  return createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
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
