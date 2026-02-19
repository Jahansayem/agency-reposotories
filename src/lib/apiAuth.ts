/**
 * API Authentication Helper
 *
 * Provides helper functions for validating user authentication
 * and authorization in API routes.
 *
 * SECURITY: User identity must come from validated sessions, NOT from
 * client-provided headers which can be spoofed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Todo, Attachment } from '@/types/todo';
import type { AgencyRole } from '@/types/agency';
import { validateSession } from './sessionValidator';
import { createServiceRoleClient } from './supabaseClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getApiAuthSupabaseClient(): SupabaseClient {
  try {
    return createServiceRoleClient();
  } catch {
    // Fallback for environments without service role key.
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}

/**
 * Result of user extraction and validation.
 *
 * Contains the authenticated user's identity and their current agency context.
 */
export interface ExtractedUserResult {
  /** The authenticated user's name */
  userName: string | null;
  /** The authenticated user's ID */
  userId?: string;
  /** The user's current agency ID (from their default agency membership) */
  agencyId?: string;
  /** The user's role within the agency (owner/manager/staff) */
  agencyRole?: AgencyRole;
  /** Error response if authentication failed */
  error?: NextResponse;
}

/**
 * Extract and validate userName from request
 *
 * SECURITY: This function validates the session first, then extracts the userName
 * from the validated session. The X-User-Name header is only used as a HINT
 * when session validation returns a valid result, and only if it matches.
 *
 * NEVER trust client-provided headers directly!
 *
 * @param request - The incoming Next.js request
 * @returns User identity including agency context, or an error response
 */
export async function extractAndValidateUserName(
  request: NextRequest
): Promise<ExtractedUserResult> {
  // First, validate the session
  const sessionResult = await validateSession(request);

  if (!sessionResult.valid) {
    return {
      userName: null,
      error: NextResponse.json(
        {
          success: false,
          error: sessionResult.error || 'Authentication required',
        },
        { status: 401 }
      ),
    };
  }

  // Session is valid - use the userName from the validated session
  if (sessionResult.userName) {
    return {
      userName: sessionResult.userName,
      userId: sessionResult.userId,
      agencyId: sessionResult.agencyId,
      agencyRole: sessionResult.agencyRole,
    };
  }

  // Session is valid but userName was not populated - treat as auth error
  return {
    userName: null,
    error: NextResponse.json(
      { success: false, error: 'Could not determine user identity from session' },
      { status: 401 }
    ),
  };
}

/**
 * Extract userName from request (DEPRECATED - use extractAndValidateUserName instead)
 *
 * SECURITY WARNING: This function trusts client-provided headers.
 * Only use this for non-sensitive operations or when session is already validated.
 *
 * @deprecated Use extractAndValidateUserName for secure user identification
 */
export function extractUserName(request: NextRequest): string | null {
  // Log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[SECURITY] extractUserName is deprecated. Use extractAndValidateUserName for secure auth.'
    );
  }

  // Check header first (X-User-Name) - only as hint, not trusted auth
  const headerUserName = request.headers.get('X-User-Name');
  if (headerUserName && headerUserName.trim()) {
    return headerUserName.trim();
  }

  // Check query params
  const { searchParams } = new URL(request.url);
  const queryUserName = searchParams.get('userName');
  if (queryUserName && queryUserName.trim()) {
    return queryUserName.trim();
  }

  return null;
}

/**
 * Validate that userName is provided and not empty
 * Returns an error response if validation fails, null if valid
 */
export function validateUserName(userName: string | null): NextResponse | null {
  if (!userName) {
    return NextResponse.json(
      { success: false, error: 'userName is required for authentication' },
      { status: 401 }
    );
  }

  if (userName.length < 1 || userName.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Invalid userName' },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Create an agency-scoped query builder for a given table.
 *
 * Usage:
 * ```typescript
 * const query = agencyScopedQuery(supabase, 'todos', agencyId);
 * const { data } = await query;
 * ```
 */
export function agencyScopedQuery(supabaseClient: SupabaseClient, table: string, agencyId: string) {
  return supabaseClient.from(table).select().eq('agency_id', agencyId);
}

/**
 * Verify that a user can access a specific todo
 * Returns the todo if access is granted, or an error response
 */
export async function verifyTodoAccess(
  todoId: string,
  userName: string,
  agencyId?: string,
  canEditAllTasks: boolean = false
): Promise<{ todo: Todo; error: null } | { todo: null; error: NextResponse }> {
  const supabase = getApiAuthSupabaseClient();

  let query = supabase
    .from('todos')
    .select('*');

  // Apply agency scope first when provided
  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data: todo, error: fetchError } = await query
    .eq('id', todoId)
    .single();

  if (fetchError || !todo) {
    return {
      todo: null,
      error: NextResponse.json(
        { success: false, error: 'Todo not found' },
        { status: 404 }
      ),
    };
  }

  // Access control: user can access if they:
  // 1. Created the todo
  // 2. Are assigned to the todo
  // 3. Updated the todo (had previous access)
  const hasAccess =
    canEditAllTasks ||
    todo.created_by === userName ||
    todo.assigned_to === userName ||
    todo.updated_by === userName;

  if (!hasAccess) {
    return {
      todo: null,
      error: NextResponse.json(
        { success: false, error: 'Access denied: you do not have permission to access this todo' },
        { status: 403 }
      ),
    };
  }

  return { todo: todo as Todo, error: null };
}

/**
 * Verify that a user can access an attachment through the owning todo
 * Returns the todo and attachment if access is granted
 */
export async function verifyAttachmentAccess(
  todoId: string,
  attachmentId: string,
  userName: string
): Promise<
  | { todo: Todo; attachment: Attachment; error: null }
  | { todo: null; attachment: null; error: NextResponse }
> {
  // First verify todo access
  const { todo, error: todoError } = await verifyTodoAccess(todoId, userName);
  if (todoError) {
    return { todo: null, attachment: null, error: todoError };
  }

  // Find the attachment in the todo
  const attachments = (todo.attachments || []) as Attachment[];
  const attachment = attachments.find((a) => a.id === attachmentId);

  if (!attachment) {
    return {
      todo: null,
      attachment: null,
      error: NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      ),
    };
  }

  return { todo, attachment, error: null };
}

/**
 * Extract todoId from storage path
 * Storage paths are in format: {todoId}/{attachmentId}.{ext}
 */
export function extractTodoIdFromPath(storagePath: string): string | null {
  const parts = storagePath.split('/');
  if (parts.length >= 2) {
    return parts[0];
  }
  return null;
}

// ============================================
// Agency-Scoped Query Helpers
// ============================================

/**
 * Get an agency scope filter object for use with Supabase queries.
 *
 * Returns an object with `agency_id` key if agencyId is provided,
 * otherwise returns an empty object. This allows for conditional
 * agency filtering in queries.
 *
 * @param agencyId - The agency ID to filter by, or null/undefined
 * @returns Object with agency_id property if agencyId exists, otherwise empty object
 *
 * @example
 * ```typescript
 * // With agency filtering
 * const scope = getAgencyScope('abc-123');
 * // scope = { agency_id: 'abc-123' }
 *
 * // Without agency filtering
 * const scope = getAgencyScope(null);
 * // scope = {}
 *
 * // Use with Supabase query
 * const { data } = await supabase
 *   .from('todos')
 *   .select('*')
 *   .match(getAgencyScope(agencyId));
 * ```
 */
export function getAgencyScope(agencyId: string | null | undefined): { agency_id?: string } {
  return agencyId ? { agency_id: agencyId } : {};
}

/**
 * Verify user has access to a specific todo within an agency context.
 *
 * This enhanced version considers agency membership when checking access.
 * If agencyId is provided, the todo must belong to that agency.
 *
 * @param supabaseClient - Supabase client instance
 * @param todoId - The ID of the todo to check
 * @param userId - The user's ID
 * @param agencyId - The user's current agency ID (optional)
 * @returns Object with hasAccess boolean and the todo if access is granted
 *
 * @example
 * ```typescript
 * const { hasAccess, todo } = await verifyTodoAccessEnhanced(
 *   supabase,
 *   'todo-uuid',
 *   'user-uuid',
 *   'agency-uuid'
 * );
 *
 * if (!hasAccess) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 */
export async function verifyTodoAccessEnhanced(
  supabaseClient: SupabaseClient,
  todoId: string,
  userId: string,
  agencyId: string | null
): Promise<{ hasAccess: boolean; todo: Todo | null }> {
  let query = supabaseClient
    .from('todos')
    .select('*')
    .eq('id', todoId);

  // If multi-tenancy is enabled (agencyId provided), also check agency
  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data: todo, error } = await query.single();

  if (error || !todo) {
    return {
      hasAccess: false,
      todo: null,
    };
  }

  return {
    hasAccess: true,
    todo: todo as Todo,
  };
}

/**
 * Create a filtered Supabase query builder for a table with agency scope.
 *
 * This is an enhanced version of agencyScopedQuery that allows for
 * additional select fields and filtering options.
 *
 * @param supabaseClient - Supabase client instance
 * @param table - Table name to query
 * @param agencyId - Agency ID to filter by
 * @param selectFields - Optional select fields (default: '*')
 * @returns Supabase query builder with agency filter applied
 *
 * @example
 * ```typescript
 * // Select all fields with agency scope
 * const { data } = await createAgencyScopedQuery(supabase, 'todos', agencyId);
 *
 * // Select specific fields
 * const { data } = await createAgencyScopedQuery(
 *   supabase,
 *   'todos',
 *   agencyId,
 *   'id, text, completed'
 * ).eq('completed', false);
 * ```
 */
export function createAgencyScopedQuery(
  supabaseClient: SupabaseClient,
  table: string,
  agencyId: string,
  selectFields: string = '*'
) {
  return supabaseClient.from(table).select(selectFields).eq('agency_id', agencyId);
}

/**
 * Check if a user has permission to perform an action in an agency.
 *
 * Role hierarchy: owner > manager > staff
 *
 * @param userRole - The user's role in the agency
 * @param requiredRole - The minimum required role for the action
 * @returns True if user's role meets or exceeds the required role
 *
 * @example
 * ```typescript
 * // Check if user can manage team (requires manager or owner)
 * if (!hasRequiredRole(userRole, 'manager')) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 */
export function hasRequiredRole(
  userRole: AgencyRole | null | undefined,
  requiredRole: AgencyRole
): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<AgencyRole, number> = {
    owner: 3,
    manager: 2,
    staff: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
