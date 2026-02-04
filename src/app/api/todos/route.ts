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

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/todos - Fetch todos with decrypted PII fields
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    let query = supabase.from('todos').select('*');

    // Always scope to agency
    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    // Staff data scoping: if user lacks can_view_all_tasks permission,
    // only show tasks they created or are assigned to (defense-in-depth)
    if (!ctx.permissions?.can_view_all_tasks) {
      query = query.or(`created_by.eq.${ctx.userName},assigned_to.eq.${ctx.userName}`);
    }

    if (id) {
      // Fetch single todo
      query = query.eq('id', id);
    } else {
      // Fetch all todos (optionally filter completed)
      if (!includeCompleted) {
        query = query.eq('completed', false);
      }
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Decrypt PII fields
    const decryptedData = (data || []).map(todo => decryptTodoPII(todo));

    return NextResponse.json({
      success: true,
      data: id ? decryptedData[0] : decryptedData,
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

    // Log activity with agency_id
    await supabase.from('activity_log').insert({
      action: 'task_created',
      todo_id: taskId,
      todo_text: text.trim().substring(0, 100),
      user_name: ctx.userName,
      details: { priority, has_transcription: !!transcription },
      ...(ctx.agencyId ? { agency_id: ctx.agencyId } : {}),
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

    // Log activity for significant changes
    if (updates.completed !== undefined) {
      await supabase.from('activity_log').insert({
        action: updates.completed ? 'task_completed' : 'task_reopened',
        todo_id: id,
        todo_text: data.text?.substring(0, 100),
        user_name: ctx.userName,
        ...(ctx.agencyId ? { agency_id: ctx.agencyId } : {}),
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

    // Log activity with agency_id
    await supabase.from('activity_log').insert({
      action: 'task_deleted',
      todo_id: id,
      todo_text: todo.text?.substring(0, 100),
      user_name: ctx.userName,
      ...(ctx.agencyId ? { agency_id: ctx.agencyId } : {}),
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
