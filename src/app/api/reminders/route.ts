/**
 * Reminders API
 *
 * Endpoints for managing task reminders:
 * - GET: Fetch reminders for a task or user
 * - POST: Create a new reminder
 * - DELETE: Remove a reminder
 * - PATCH: Update a reminder
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';
import type { TaskReminder, ReminderType } from '@/types/todo';
import { logger } from '@/lib/logger';
import { sanitizeForPostgrestFilter } from '@/lib/sanitize';

// Create Supabase client lazily to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/reminders
 * Fetch reminders for a specific task or user
 *
 * Query params:
 * - todoId: Fetch reminders for a specific task
 * - userId: Fetch reminders for a specific user
 * - status: Filter by status ('pending', 'sent', 'failed', 'cancelled')
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  const { searchParams } = new URL(request.url);
  const todoId = searchParams.get('todoId');
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');

  const supabase = getSupabaseClient();

  // Look up authenticated user's ID for authorization scoping
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('name', ctx.userName)
    .single();

  if (!userRecord) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  // If userId is provided, ensure it matches the authenticated user's ID
  if (userId && userId !== userRecord.id) {
    return NextResponse.json(
      { success: false, error: 'Access denied' },
      { status: 403 }
    );
  }

  // If todoId is provided, verify the todo belongs to this agency
  if (todoId) {
    const { data: todo } = await supabase
      .from('todos')
      .select('id')
      .eq('id', todoId)
      .eq('agency_id', ctx.agencyId)
      .single();

    if (!todo) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
  }

  // Build query - join through todos to enforce agency scoping
  let query = supabase
    .from('task_reminders')
    .select(`
      *,
      todos:todo_id!inner (
        id,
        text,
        priority,
        due_date,
        assigned_to,
        completed,
        created_by,
        updated_by,
        agency_id
      )
    `)
    .eq('todos.agency_id', ctx.agencyId)
    .order('reminder_time', { ascending: true });

  if (todoId) {
    query = query.eq('todo_id', todoId);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  // If neither todoId nor userId is provided, scope to reminders the user is involved with
  if (!todoId && !userId) {
    query = query.eq('created_by', ctx.userName);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching reminders', error, { component: 'reminders' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }

  // Strip agency_id from the nested todos to keep response clean
  let reminders = (data || []).map(r => {
    if (r.todos && typeof r.todos === 'object') {
      const { agency_id: _aid, ...todoFields } = r.todos as Record<string, unknown>;
      return { ...r, todos: todoFields };
    }
    return r;
  });

  if (!todoId && !userId) {
    // Also include reminders for todos where this user is involved but didn't create the reminder
    // SECURITY: Sanitize userName to prevent PostgREST filter injection
    const safeUserName = sanitizeForPostgrestFilter(ctx.userName);
    const { data: involvedReminders } = await supabase
      .from('task_reminders')
      .select(`
        *,
        todos:todo_id!inner (
          id,
          text,
          priority,
          due_date,
          assigned_to,
          completed,
          created_by,
          updated_by,
          agency_id
        )
      `)
      .eq('todos.agency_id', ctx.agencyId)
      .neq('created_by', ctx.userName)
      .or(`assigned_to.eq.${safeUserName},created_by.eq.${safeUserName}`, { referencedTable: 'todos' })
      .order('reminder_time', { ascending: true });

    if (involvedReminders && involvedReminders.length > 0) {
      const existingIds = new Set(reminders.map((r: { id: string }) => r.id));
      for (const r of involvedReminders) {
        if (!existingIds.has(r.id)) {
          // Strip agency_id from nested todos
          if (r.todos && typeof r.todos === 'object') {
            const { agency_id: _aid, ...todoFields } = r.todos as Record<string, unknown>;
            reminders.push({ ...r, todos: todoFields });
          } else {
            reminders.push(r);
          }
        }
      }
      reminders.sort((a: { reminder_time: string }, b: { reminder_time: string }) =>
        new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime()
      );
    }
  }

  return NextResponse.json({ success: true, reminders });
});

/**
 * POST /api/reminders
 * Create a new reminder for a task
 */
export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  const supabase = getSupabaseClient();

  try {
    const body = await request.json();
    const {
      todoId,
      reminderTime,
      reminderType = 'both',
      message,
      userId,
    } = body;

    // Validate required fields
    if (!todoId) {
      return NextResponse.json(
        { success: false, error: 'todoId is required' },
        { status: 400 }
      );
    }

    if (!reminderTime) {
      return NextResponse.json(
        { success: false, error: 'reminderTime is required' },
        { status: 400 }
      );
    }

    // Validate reminder time is in the future
    const reminderDate = new Date(reminderTime);
    if (isNaN(reminderDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid reminderTime format' },
        { status: 400 }
      );
    }

    if (reminderDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Reminder time must be in the future' },
        { status: 400 }
      );
    }

    // Validate reminder type
    const validTypes: ReminderType[] = ['push_notification', 'chat_message', 'both'];
    if (!validTypes.includes(reminderType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reminderType' },
        { status: 400 }
      );
    }

    // Verify the todo belongs to this agency
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('*')
      .eq('id', todoId)
      .eq('agency_id', ctx.agencyId)
      .single();

    if (todoError || !todo) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if task is already completed
    if (todo.completed) {
      return NextResponse.json(
        { success: false, error: 'Cannot add reminder to completed task' },
        { status: 400 }
      );
    }

    // Create the reminder
    const reminderData = {
      todo_id: todoId,
      user_id: userId || null,
      reminder_time: reminderDate.toISOString(),
      reminder_type: reminderType,
      message: message || null,
      status: 'pending',
      created_by: ctx.userName,
    };

    const { data: reminder, error: insertError } = await supabase
      .from('task_reminders')
      .insert(reminderData)
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating reminder', insertError, { component: 'reminders' });
      return NextResponse.json(
        { success: false, error: 'Failed to create reminder' },
        { status: 500 }
      );
    }

    // Also update the simple reminder_at field on the todo for backward compatibility
    if (!todo.reminder_at || new Date(todo.reminder_at) > reminderDate) {
      await supabase
        .from('todos')
        .update({
          reminder_at: reminderDate.toISOString(),
          reminder_sent: false,
          updated_at: new Date().toISOString(),
          updated_by: ctx.userName,
        })
        .eq('id', todoId)
        .eq('agency_id', ctx.agencyId);
    }

    return NextResponse.json({
      success: true,
      reminder: reminder as TaskReminder,
    });
  } catch (error) {
    logger.error('Error in POST /api/reminders', error, { component: 'reminders' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/reminders
 * Remove a reminder
 */
export const DELETE = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const reminderId = searchParams.get('id');

  if (!reminderId) {
    return NextResponse.json(
      { success: false, error: 'Reminder id is required' },
      { status: 400 }
    );
  }

  // Fetch the reminder and verify it belongs to a todo in this agency
  const { data: reminder, error: fetchError } = await supabase
    .from('task_reminders')
    .select('*, todos:todo_id!inner (id, created_by, assigned_to, updated_by, agency_id)')
    .eq('id', reminderId)
    .single();

  if (fetchError || !reminder) {
    return NextResponse.json(
      { success: false, error: 'Reminder not found' },
      { status: 404 }
    );
  }

  // Verify agency ownership
  const todo = reminder.todos as { id: string; created_by: string; assigned_to: string; updated_by: string; agency_id: string };
  if (todo.agency_id !== ctx.agencyId) {
    return NextResponse.json(
      { success: false, error: 'Reminder not found' },
      { status: 404 }
    );
  }

  // Verify user has access
  const hasAccess =
    reminder.created_by === ctx.userName ||
    todo.created_by === ctx.userName ||
    todo.assigned_to === ctx.userName ||
    todo.updated_by === ctx.userName;

  if (!hasAccess) {
    return NextResponse.json(
      { success: false, error: 'Access denied' },
      { status: 403 }
    );
  }

  // Delete the reminder
  const { error: deleteError } = await supabase
    .from('task_reminders')
    .delete()
    .eq('id', reminderId);

  if (deleteError) {
    logger.error('Error deleting reminder', deleteError, { component: 'reminders' });
    return NextResponse.json(
      { success: false, error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});

/**
 * PATCH /api/reminders
 * Update a reminder (e.g., change time or cancel)
 */
export const PATCH = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  const supabase = getSupabaseClient();

  try {
    const body = await request.json();
    const { id, reminderTime, status, message } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Reminder id is required' },
        { status: 400 }
      );
    }

    // Fetch the reminder and verify agency
    const { data: reminder, error: fetchError } = await supabase
      .from('task_reminders')
      .select('*, todos:todo_id!inner (id, created_by, assigned_to, updated_by, agency_id)')
      .eq('id', id)
      .single();

    if (fetchError || !reminder) {
      return NextResponse.json(
        { success: false, error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Verify agency ownership
    const todo = reminder.todos as { id: string; created_by: string; assigned_to: string; updated_by: string; agency_id: string };
    if (todo.agency_id !== ctx.agencyId) {
      return NextResponse.json(
        { success: false, error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Verify access
    const hasAccess =
      reminder.created_by === ctx.userName ||
      todo.created_by === ctx.userName ||
      todo.assigned_to === ctx.userName ||
      todo.updated_by === ctx.userName;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Partial<TaskReminder> = {};

    if (reminderTime) {
      const newTime = new Date(reminderTime);
      if (isNaN(newTime.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid reminderTime format' },
          { status: 400 }
        );
      }
      if (newTime <= new Date()) {
        return NextResponse.json(
          { success: false, error: 'Reminder time must be in the future' },
          { status: 400 }
        );
      }
      updateData.reminder_time = newTime.toISOString();
    }

    if (status) {
      const validStatuses = ['pending', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status. Can only update to pending or cancelled' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (message !== undefined) {
      updateData.message = message;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the reminder
    const { data: updatedReminder, error: updateError } = await supabase
      .from('task_reminders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating reminder', updateError, { component: 'reminders' });
      return NextResponse.json(
        { success: false, error: 'Failed to update reminder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reminder: updatedReminder as TaskReminder,
    });
  } catch (error) {
    logger.error('Error in PATCH /api/reminders', error, { component: 'reminders' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
