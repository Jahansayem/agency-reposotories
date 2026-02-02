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
import { validateSession } from './sessionValidator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Extract and validate userName from request
 *
 * SECURITY: This function validates the session first, then extracts the userName
 * from the validated session. The X-User-Name header is only used as a HINT
 * when session validation returns a valid result, and only if it matches.
 *
 * NEVER trust client-provided headers directly!
 */
export async function extractAndValidateUserName(
  request: NextRequest
): Promise<{ userName: string | null; agencyId?: string; error?: NextResponse }> {
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
    return { userName: sessionResult.userName, agencyId: sessionResult.agencyId };
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
  agencyId?: string
): Promise<{ todo: Todo; error: null } | { todo: null; error: NextResponse }> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  if (parts.length >= 1) {
    return parts[0];
  }
  return null;
}
