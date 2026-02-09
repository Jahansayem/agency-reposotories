import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyAgencyAccess, type AgencyAuthContext } from './agencyAuth';
import { logger } from './logger';
import { DEFAULT_PERMISSIONS } from '@/types/agency';
import type { AgencyRole } from '@/types/agency';

// Lazy-initialized Supabase client for API key auth lookups
let _outlookSupabase: SupabaseClient | null = null;

function getOutlookSupabaseClient(): SupabaseClient {
  if (!_outlookSupabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
      throw new Error('Supabase not configured - missing environment variables');
    }

    _outlookSupabase = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey!
    );
  }
  return _outlookSupabase;
}

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

// ============================================
// Dual Auth Wrapper (Session + API Key Fallback)
// ============================================

/**
 * Resolve agency context from request when using API key auth (no session).
 *
 * Looks for agencyId in:
 * 1. X-Agency-Id header
 * 2. Query parameter `agencyId`
 * 3. Request body `agencyId` field (POST only — body must be pre-parsed)
 *
 * When agencyId is found, fetches agency details from DB to build context.
 * Returns a synthetic AgencyAuthContext with owner-level permissions since the
 * API key represents a trusted service-to-service call.
 */
async function resolveApiKeyAgencyContext(
  agencyId: string | null | undefined,
  createdBy?: string
): Promise<AgencyAuthContext | null> {
  if (!agencyId) {
    // No agency specified — return a minimal context (single-tenant / backward compat)
    return {
      userId: 'outlook-addon',
      userName: createdBy || 'Outlook Add-in',
      userRole: 'staff',
      agencyId: '',
      agencySlug: '',
      agencyName: '',
      agencyRole: 'staff',
      permissions: DEFAULT_PERMISSIONS.staff,
    };
  }

  try {
    const supabase = getOutlookSupabaseClient();

    const { data: agency, error } = await supabase
      .from('agencies')
      .select('id, name, slug')
      .eq('id', agencyId)
      .eq('is_active', true)
      .single();

    if (error || !agency) {
      logger.warn('Outlook API key auth: agency not found', {
        component: 'OutlookAuth',
        agencyId,
      });
      return null;
    }

    return {
      userId: 'outlook-addon',
      userName: createdBy || 'Outlook Add-in',
      userRole: 'staff',
      agencyId: agency.id,
      agencySlug: agency.slug,
      agencyName: agency.name,
      // API key callers get staff-level permissions — the API key itself is the trust boundary
      agencyRole: 'staff' as AgencyRole,
      permissions: DEFAULT_PERMISSIONS.staff,
    };
  } catch (err) {
    logger.error('Outlook API key auth: failed to resolve agency', err, {
      component: 'OutlookAuth',
      agencyId,
    });
    return null;
  }
}

/**
 * Dual auth wrapper for Outlook add-in API routes.
 *
 * Tries session-based auth first (for web app users with cookies),
 * then falls back to API key auth (for the Outlook add-in which cannot
 * send session cookies cross-origin).
 *
 * When using API key auth, agency context is resolved from:
 * - X-Agency-Id header
 * - `agencyId` query parameter
 * - `agencyId` field in the request body (POST/PUT/PATCH)
 *
 * Usage:
 * ```typescript
 * export const POST = withOutlookAuth(async (request, context) => {
 *   // context.agencyId is available from either auth path
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withOutlookAuth(
  handler: (request: NextRequest, context: AgencyAuthContext) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    // ---- Path 1: Try session-based auth (web app users) ----
    const sessionAuth = await verifyAgencyAccess(request);

    if (sessionAuth.success && sessionAuth.context) {
      return handler(request, sessionAuth.context);
    }

    // ---- Path 2: Fall back to API key auth (Outlook add-in) ----
    if (!verifyOutlookApiKey(request)) {
      logger.security('Outlook route auth failed - no valid session or API key', {
        component: 'OutlookAuth',
        hasSession: false,
        hasApiKey: !!request.headers.get('X-API-Key'),
        sessionError: sessionAuth.error,
      });

      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid session or API key required' },
        { status: 401 }
      );
    }

    // API key is valid — resolve agency context from the request
    let agencyId: string | null | undefined =
      request.headers.get('X-Agency-Id') ||
      request.nextUrl.searchParams.get('agencyId');

    let createdBy: string | undefined;

    // For POST/PUT/PATCH, try to read agencyId and createdBy from body.
    // We clone the request so the handler can still read the body.
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const cloned = request.clone();
        const body = await cloned.json();
        if (!agencyId && body.agencyId) {
          agencyId = body.agencyId;
        }
        if (body.createdBy) {
          createdBy = body.createdBy;
        }
      } catch {
        // Body might not be JSON or might be empty — that's fine
      }
    }

    const context = await resolveApiKeyAgencyContext(agencyId, createdBy);

    if (!context) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid or inactive agency ID' },
        { status: 400 }
      );
    }

    logger.info('Outlook API key auth successful', {
      component: 'OutlookAuth',
      agencyId: context.agencyId || '(none)',
    });

    return handler(request, context);
  };
}
