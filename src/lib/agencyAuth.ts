/**
 * Agency Authentication & Authorization
 *
 * Provides agency-scoped access control for multi-tenant API routes.
 * Extends sessionValidator with agency context verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSession, SessionValidationResult } from './sessionValidator';
import { logger } from './logger';
import type {
  AgencyRole,
  AgencyPermissions,
  AgencyMembership,
} from '@/types/agency';
import { isFeatureEnabled } from './featureFlags';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
}

if (!supabaseServiceKey) {
  logger.warn('SUPABASE_SERVICE_ROLE_KEY is not configured - agency auth will use anon key with reduced privileges', {
    component: 'AgencyAuth',
  });
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// Types
// ============================================

export interface AgencyAuthContext {
  userId: string;
  userName: string;
  userRole: string;
  agencyId: string;
  agencySlug: string;
  agencyName: string;
  agencyRole: AgencyRole;
  permissions: AgencyPermissions;
}

export interface AgencyAuthResult {
  success: boolean;
  context?: AgencyAuthContext;
  response?: NextResponse;
  error?: string;
}

export interface AgencyAuthOptions {
  /** Agency ID to verify access for. If not provided, uses X-Agency-Id header */
  agencyId?: string;
  /** Required role(s) - user must have one of these roles */
  requiredRoles?: AgencyRole[];
  /** Required permission(s) - user must have all of these */
  requiredPermissions?: (keyof AgencyPermissions)[];
  /** Allow super_admin to bypass agency membership check */
  allowSuperAdmin?: boolean;
}

// ============================================
// Core Functions
// ============================================

/**
 * Verify user has access to an agency with optional role/permission requirements
 *
 * Usage:
 * ```typescript
 * const auth = await verifyAgencyAccess(request, { agencyId });
 * if (!auth.success) return auth.response;
 *
 * // Now use auth.context.agencyId for all queries
 * const { data } = await supabase
 *   .from('todos')
 *   .select('*')
 *   .eq('agency_id', auth.context.agencyId);
 * ```
 */
export async function verifyAgencyAccess(
  request: NextRequest,
  options: AgencyAuthOptions = {}
): Promise<AgencyAuthResult> {
  // First validate the session
  const session = await validateSession(request);

  if (!session.valid || !session.userId || !session.userName) {
    return {
      success: false,
      error: session.error || 'Unauthorized',
      response: NextResponse.json(
        { error: 'Unauthorized', message: session.error },
        { status: 401 }
      ),
    };
  }

  // If multi-tenancy is disabled, return success with null agency context
  if (!isFeatureEnabled('multi_tenancy')) {
    // Return a minimal context for backward compatibility
    return {
      success: true,
      context: {
        userId: session.userId,
        userName: session.userName,
        userRole: session.userRole || 'member',
        agencyId: '', // No agency in single-tenant mode
        agencySlug: '',
        agencyName: '',
        agencyRole: 'member',
        permissions: {
          can_create_tasks: true,
          can_delete_tasks: session.userRole === 'owner' || session.userRole === 'admin',
          can_view_strategic_goals: session.userRole === 'owner' || session.userRole === 'admin',
          can_invite_users: session.userRole === 'owner' || session.userRole === 'admin',
          can_manage_templates: true,
        },
      },
    };
  }

  // Get agency ID from options, header, or cookie
  let agencyId = options.agencyId;
  if (!agencyId) {
    agencyId = request.headers.get('X-Agency-Id') ||
               request.cookies.get('current_agency_id')?.value ||
               undefined;
  }

  // Check if user is super_admin (can bypass agency check if allowed)
  if (options.allowSuperAdmin !== false) {
    const { data: user } = await supabase
      .from('users')
      .select('global_role')
      .eq('id', session.userId)
      .single();

    if (user?.global_role === 'super_admin') {
      // Super admin can access any agency
      if (agencyId) {
        const agency = await getAgencyById(agencyId);
        if (agency) {
          return {
            success: true,
            context: {
              userId: session.userId,
              userName: session.userName,
              userRole: session.userRole || 'admin',
              agencyId: agency.id,
              agencySlug: agency.slug,
              agencyName: agency.name,
              agencyRole: 'owner', // Super admin has full access
              permissions: {
                can_create_tasks: true,
                can_delete_tasks: true,
                can_view_strategic_goals: true,
                can_invite_users: true,
                can_manage_templates: true,
              },
            },
          };
        }
      }
    }
  }

  // If no agency specified, try to get user's default agency
  if (!agencyId) {
    const defaultAgency = await getUserDefaultAgency(session.userId);
    if (!defaultAgency) {
      return {
        success: false,
        error: 'No agency specified and no default agency found',
        response: NextResponse.json(
          { error: 'Agency required', message: 'Please specify an agency' },
          { status: 400 }
        ),
      };
    }
    agencyId = defaultAgency.agency_id;
  }

  // Verify user is a member of the agency
  const membership = await getAgencyMembership(session.userId, agencyId);

  if (!membership) {
    logger.security('Agency access denied - not a member', {
      userId: session.userId,
      userName: session.userName,
      agencyId,
    });

    return {
      success: false,
      error: 'Access denied',
      response: NextResponse.json(
        { error: 'Access denied', message: 'You are not a member of this agency' },
        { status: 403 }
      ),
    };
  }

  if (membership.status !== 'active') {
    return {
      success: false,
      error: 'Account suspended',
      response: NextResponse.json(
        { error: 'Account suspended', message: 'Your account in this agency is suspended' },
        { status: 403 }
      ),
    };
  }

  // Check role requirements
  if (options.requiredRoles && options.requiredRoles.length > 0) {
    if (!options.requiredRoles.includes(membership.role)) {
      logger.security('Agency access denied - insufficient role', {
        userId: session.userId,
        userName: session.userName,
        agencyId,
        userRole: membership.role,
        requiredRoles: options.requiredRoles,
      });

      return {
        success: false,
        error: 'Insufficient permissions',
        response: NextResponse.json(
          { error: 'Forbidden', message: 'You do not have the required role' },
          { status: 403 }
        ),
      };
    }
  }

  // Check permission requirements
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const missingPermissions = options.requiredPermissions.filter(
      (perm) => !membership.permissions[perm]
    );

    if (missingPermissions.length > 0) {
      logger.security('Agency access denied - missing permissions', {
        userId: session.userId,
        userName: session.userName,
        agencyId,
        missingPermissions,
      });

      return {
        success: false,
        error: 'Insufficient permissions',
        response: NextResponse.json(
          { error: 'Forbidden', message: `Missing permissions: ${missingPermissions.join(', ')}` },
          { status: 403 }
        ),
      };
    }
  }

  // Get agency details for context
  const agency = await getAgencyById(agencyId);
  if (!agency) {
    return {
      success: false,
      error: 'Agency not found',
      response: NextResponse.json(
        { error: 'Not found', message: 'Agency not found' },
        { status: 404 }
      ),
    };
  }

  return {
    success: true,
    context: {
      userId: session.userId,
      userName: session.userName,
      userRole: session.userRole || 'member',
      agencyId: agency.id,
      agencySlug: agency.slug,
      agencyName: agency.name,
      agencyRole: membership.role,
      permissions: membership.permissions,
    },
  };
}

// ============================================
// Helper Functions
// ============================================

interface AgencyMemberRecord {
  role: AgencyRole;
  permissions: AgencyPermissions;
  status: string;
}

/**
 * Get user's membership in an agency
 */
async function getAgencyMembership(
  userId: string,
  agencyId: string
): Promise<AgencyMemberRecord | null> {
  const { data, error } = await supabase
    .from('agency_members')
    .select('role, permissions, status')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .single();

  if (error || !data) return null;

  return data as AgencyMemberRecord;
}

interface AgencyRecord {
  id: string;
  name: string;
  slug: string;
}

/**
 * Get agency by ID
 */
async function getAgencyById(agencyId: string): Promise<AgencyRecord | null> {
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, slug')
    .eq('id', agencyId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  return data as AgencyRecord;
}

interface DefaultAgencyRecord {
  agency_id: string;
}

/**
 * Get user's default agency
 */
async function getUserDefaultAgency(userId: string): Promise<DefaultAgencyRecord | null> {
  // First try to find default agency
  const { data: defaultAgency } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', userId)
    .eq('is_default_agency', true)
    .eq('status', 'active')
    .single();

  if (defaultAgency) return defaultAgency as DefaultAgencyRecord;

  // Otherwise get any active agency
  const { data: anyAgency } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  return anyAgency as DefaultAgencyRecord | null;
}

/**
 * Get all agencies a user belongs to
 */
export async function getUserAgencies(userId: string): Promise<AgencyMembership[]> {
  const { data, error } = await supabase
    .from('agency_members')
    .select(`
      agency_id,
      role,
      permissions,
      is_default_agency,
      agencies!inner (
        id,
        name,
        slug,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !data) return [];

  // Transform the data - Supabase returns joined data as nested objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = data as any[];
  return (rawData || [])
    .filter((m) => m.agencies?.is_active)
    .map((m) => ({
      agency_id: m.agency_id,
      agency_name: m.agencies.name,
      agency_slug: m.agencies.slug,
      role: m.role as AgencyRole,
      permissions: m.permissions as AgencyPermissions,
      is_default: m.is_default_agency,
    }));
}

/**
 * Set session context for RLS policies
 * Call this before making database queries that use RLS
 */
export async function setAgencyContext(
  agencyId: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    await supabase.rpc('set_request_context', {
      p_user_id: userId,
      p_user_name: userName,
      p_agency_id: agencyId,
    });
  } catch {
    // RPC might not exist, that's OK
  }
}

// ============================================
// Middleware Helper
// ============================================

/**
 * Create a simple agency-scoped route handler wrapper
 *
 * Usage:
 * ```typescript
 * export const GET = withAgencyAuth(async (request, context) => {
 *   const { data } = await supabase
 *     .from('todos')
 *     .select('*')
 *     .eq('agency_id', context.agencyId);
 *
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withAgencyAuth(
  handler: (request: NextRequest, context: AgencyAuthContext) => Promise<NextResponse>,
  options: AgencyAuthOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const auth = await verifyAgencyAccess(request, options);

    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(request, auth.context);
  };
}

/**
 * Create agency-scoped route handler for owner/admin only routes
 */
export function withAgencyAdminAuth(
  handler: (request: NextRequest, context: AgencyAuthContext) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return withAgencyAuth(handler, { requiredRoles: ['owner', 'admin'] });
}

/**
 * Create agency-scoped route handler for owner only routes
 */
export function withAgencyOwnerAuth(
  handler: (request: NextRequest, context: AgencyAuthContext) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return withAgencyAuth(handler, { requiredRoles: ['owner'] });
}
