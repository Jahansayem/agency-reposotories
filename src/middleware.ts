import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiters, withRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip rate limiting for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // Apply different rate limits based on route
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
    return NextResponse.next();
  }

  // Check if rate limit exceeded
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  // Continue with request
  const response = NextResponse.next();

  // Add rate limit headers to response
  if (rateLimitResult.limit !== undefined) {
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  }
  if (rateLimitResult.remaining !== undefined) {
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  }
  if (rateLimitResult.reset !== undefined) {
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
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
