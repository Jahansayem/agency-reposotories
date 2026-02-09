/**
 * Secure Todos API with Field-Level Encryption & Multi-Tenancy
 *
 * Server-side API for todo operations that handles:
 * - Agency-scoped access control via withAgencyAuth
 * - RLS defense-in-depth via set_request_context()
 * - Field-level encryption for PII (transcription, notes)
 * - Activity logging with agency_id
 *
 * This API should be used instead of direct Supabase client calls
 * when handling sensitive data like transcriptions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { encryptTodoPII, decryptTodoPII } from '@/lib/fieldEncryption';
import { verifyTodoAccess } from '@/lib/apiAuth';
import { withAgencyAuth, setAgencyContext, type AgencyAuthContext } from '@/lib/agencyAuth';
import { sanitizeForPostgrestFilter } from '@/lib/sanitize';
import { safeLogActivity } from '@/lib/safeActivityLog';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Default number of todos per page */
const DEFAULT_PAGE_SIZE = 50;
/** Maximum allowed page size */
const MAX_PAGE_SIZE = 200;

/**
 * GET /api/todos - Fetch todos with decrypted PII fields
 *
 * Supports pagination via query params:
 *   ?page=1&pageSize=50
 *
 * When fetching a list (no `id` param), the response includes pagination metadata.
 * If no pagination params are provided, defaults are used (page 1, pageSize 50).
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    // Parse pagination params
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const page = Math.max(1, pageParam ? parseInt(pageParam, 10) || 1 : 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSizeParam ? parseInt(pageSizeParam, 10) || DEFAULT_PAGE_SIZE : DEFAULT_PAGE_SIZE));

    if (id) {
      // Fetch single todo - no pagination needed
      let query = supabase.from('todos').select('*').eq('id', id);

      if (ctx.agencyId) {
        query = query.eq('agency_id', ctx.agencyId);
      }

      if (!ctx.permissions?.can_view_all_tasks) {
        const safeUserName = sanitizeForPostgrestFilter(ctx.userName);
        query = query.or(`created_by.eq.${safeUserName},assigned_to.eq.${safeUserName}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const decryptedData = (data || []).map(todo => decryptTodoPII(todo));

      return NextResponse.json({
        success: true,
        data: decryptedData[0] ?? null,
      });
    }

    // Fetch paginated list of todos
    // Build count query
    let countQuery = supabase.from('todos').select('*', { count: 'exact', head: true });
    // Build data query
    let dataQuery = supabase.from('todos').select('*');

    // Always scope to agency
    if (ctx.agencyId) {
      countQuery = countQuery.eq('agency_id', ctx.agencyId);
      dataQuery = dataQuery.eq('agency_id', ctx.agencyId);
    }

    // Staff data scoping: if user lacks can_view_all_tasks permission,
    // only show tasks they created or are assigned to (defense-in-depth)
    // SECURITY: Sanitize userName to prevent PostgREST filter injection
    if (!ctx.permissions?.can_view_all_tasks) {
      const safeUserName = sanitizeForPostgrestFilter(ctx.userName);
      countQuery = countQuery.or(`created_by.eq.${safeUserName},assigned_to.eq.${safeUserName}`);
      dataQuery = dataQuery.or(`created_by.eq.${safeUserName},assigned_to.eq.${safeUserName}`);
    }

    // Optionally filter completed
    if (!includeCompleted) {
      countQuery = countQuery.eq('completed', false);
      dataQuery = dataQuery.eq('completed', false);
    }

    // Apply ordering and pagination range
    const offset = (page - 1) * pageSize;
    dataQuery = dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Execute both queries in parallel
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) throw countResult.error;
    if (dataResult.error) throw dataResult.error;

    const totalCount = countResult.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Decrypt PII fields
    const decryptedData = (dataResult.data || []).map(todo => decryptTodoPII(todo));

    return NextResponse.json({
      success: true,
      data: decryptedData,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching todos', error as Error, {
      component: 'api/todos',
      action: 'GET',
    });
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/todos - Create a new todo with encrypted PII
 */
export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const body = await request.json();
    const {
      text,
      priority = 'medium',
      assignedTo,
      dueDate,
      notes,
      transcription,
      subtasks = [],
      status = 'todo',
    } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Task text is required' },
        { status: 400 }
      );
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();

    // Build task object with agency_id
    const task: Record<string, unknown> = {
      id: taskId,
      text: text.trim(),
      completed: false,
      status,
      priority,
      created_at: now,
      created_by: ctx.userName,
      assigned_to: assignedTo?.trim() || null,
      due_date: dueDate || null,
      notes: notes || null,
      transcription: transcription || null,
      subtasks: subtasks,
    };

    // Set agency_id on insert
    if (ctx.agencyId) {
      task.agency_id = ctx.agencyId;
    }

    // Encrypt PII fields before storage
    const encryptedTask = encryptTodoPII(task);

    const { data, error } = await supabase
      .from('todos')
      .insert([encryptedTask])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log activity with agency_id (safe - will not break operation if it fails)
    await safeLogActivity(supabase, {
      action: 'task_created',
      todo_id: taskId,
      todo_text: text.trim(),
      user_name: ctx.userName,
      agency_id: ctx.agencyId,
      details: { priority, has_transcription: !!transcription },
    });

    logger.info('Todo created with encryption', {
      component: 'api/todos',
      action: 'POST',
      todoId: taskId,
      hasTranscription: !!transcription,
      hasNotes: !!notes,
    });

    // Return decrypted data
    return NextResponse.json({
      success: true,
      data: decryptTodoPII(data),
    });
  } catch (error) {
    logger.error('Error creating todo', error as Error, {
      component: 'api/todos',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/todos - Update a todo with encrypted PII
 */
export const PUT = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    // Verify the user has access to this todo (creator, assigned, or updater)
    // Pass agencyId for cross-tenant protection
    const { todo, error: accessError } = await verifyTodoAccess(id, ctx.userName, ctx.agencyId || undefined);
    if (accessError) return accessError;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: ctx.userName,
    };

    // Copy allowed fields
    const allowedFields = [
      'text', 'completed', 'status', 'priority',
      'assigned_to', 'due_date', 'notes', 'transcription',
      'subtasks', 'recurrence',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Encrypt PII fields if present
    if (updateData.notes !== undefined || updateData.transcription !== undefined) {
      const encrypted = encryptTodoPII(updateData as { notes?: string; transcription?: string });
      if (updateData.notes !== undefined) {
        updateData.notes = encrypted.notes;
      }
      if (updateData.transcription !== undefined) {
        updateData.transcription = encrypted.transcription;
      }
    }

    let query = supabase
      .from('todos')
      .update(updateData)
      .eq('id', id);

    // Scope update to agency
    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      throw error;
    }

    // Log activity for significant changes (safe - will not break operation if it fails)
    if (updates.completed !== undefined) {
      await safeLogActivity(supabase, {
        action: updates.completed ? 'task_completed' : 'task_reopened',
        todo_id: id,
        todo_text: data.text,
        user_name: ctx.userName,
        agency_id: ctx.agencyId,
      });
    }

    logger.info('Todo updated with encryption', {
      component: 'api/todos',
      action: 'PUT',
      todoId: id,
      updatedFields: Object.keys(updateData),
    });

    // Return decrypted data
    return NextResponse.json({
      success: true,
      data: decryptTodoPII(data),
    });
  } catch (error) {
    logger.error('Error updating todo', error as Error, {
      component: 'api/todos',
      action: 'PUT',
    });
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/todos - Delete a todo
 */
export const DELETE = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    // Verify the user has access to this todo (creator, assigned, or updater)
    // Pass agencyId for cross-tenant protection
    const { todo, error: accessError } = await verifyTodoAccess(id, ctx.userName, ctx.agencyId || undefined);
    if (accessError) return accessError;

    let query = supabase
      .from('todos')
      .delete()
      .eq('id', id);

    // Scope delete to agency
    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    // Log activity with agency_id (safe - will not break operation if it fails)
    await safeLogActivity(supabase, {
      action: 'task_deleted',
      todo_id: id,
      todo_text: todo.text,
      user_name: ctx.userName,
      agency_id: ctx.agencyId,
    });

    logger.info('Todo deleted', {
      component: 'api/todos',
      action: 'DELETE',
      todoId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting todo', error as Error, {
      component: 'api/todos',
      action: 'DELETE',
    });
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
});
