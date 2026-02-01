/**
 * Reminders API
 *
 * Endpoints for managing task reminders:
 * - GET: Fetch reminders for a task or user
 * - POST: Create a new reminder
 * - DELETE: Remove a reminder
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractAndValidateUserName, verifyTodoAccess } from '@/lib/apiAuth';
import type { TaskReminder, ReminderType } from '@/types/todo';
import { logger } from '@/lib/logger';

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
export async function GET(request: NextRequest) {
  const { userName, error: authError } = await extractAndValidateUserName(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const todoId = searchParams.get('todoId');
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');

  const supabase = getSupabaseClient();

  // Look up authenticated user's ID for authorization scoping
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('name', userName)
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

  // If todoId is provided, verify the user has access to that todo
  if (todoId) {
    const { todo, error: accessError } = await verifyTodoAccess(todoId, userName!);
    if (accessError) return accessError;
  }

  let query = supabase
    .from('task_reminders')
    .select(`
      *,
      todos:todo_id (
        id,
        text,
        priority,
        due_date,
        assigned_to,
        completed,
        created_by,
        updated_by
      )
    `)
    .order('reminder_time', { ascending: true });

  if (todoId) {
    query = query.eq('todo_id', todoId);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  // If neither todoId nor userId is provided, scope to reminders the user is involved with:
  // reminders they created, or reminders for todos assigned to / created by them
  if (!todoId && !userId) {
    query = query.eq('created_by', userName);
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

  // Post-filter: if no specific filters were provided, also include reminders
  // for todos assigned to or created by this user (in addition to reminders they created)
  let reminders = data || [];
  if (!todoId && !userId) {
    // The query already filtered by created_by=userName.
    // We also need reminders for todos where this user is involved but didn't create the reminder.
    // Run a second query for those.
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
          updated_by
        )
      `)
      .neq('created_by', userName)
      .or(`assigned_to.eq.${userName},created_by.eq.${userName}`, { referencedTable: 'todos' })
      .order('reminder_time', { ascending: true });

    if (involvedReminders && involvedReminders.length > 0) {
      // Merge and deduplicate by id
      const existingIds = new Set(reminders.map((r: { id: string }) => r.id));
      for (const r of involvedReminders) {
        if (!existingIds.has(r.id)) {
          reminders.push(r);
        }
      }
      // Re-sort by reminder_time
      reminders.sort((a: { reminder_time: string }, b: { reminder_time: string }) =>
        new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime()
      );
    }
  }

  return NextResponse.json({ success: true, reminders });
}

/**
 * POST /api/reminders
 * Create a new reminder for a task
 *
 * Request body:
 * - todoId: UUID of the task
 * - reminderTime: ISO timestamp for when to send the reminder
 * - reminderType?: 'push_notification' | 'chat_message' | 'both' (default: 'both')
 * - message?: Custom reminder message
 * - userId?: UUID of user to remind (default: assigned user)
 */
export async function POST(request: NextRequest) {
  const { userName, error: authError } = await extractAndValidateUserName(request);
  if (authError) return authError;

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

    // Verify user has access to the todo
    const { todo, error: accessError } = await verifyTodoAccess(todoId, userName!);
    if (accessError) return accessError;

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
      user_id: userId || null, // null = remind assigned user
      reminder_time: reminderDate.toISOString(),
      reminder_type: reminderType,
      message: message || null,
      status: 'pending',
      created_by: userName,
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
    // Only if no reminder_at is set or the new one is sooner
    if (!todo.reminder_at || new Date(todo.reminder_at) > reminderDate) {
      await supabase
        .from('todos')
        .update({
          reminder_at: reminderDate.toISOString(),
          reminder_sent: false,
          updated_at: new Date().toISOString(),
          updated_by: userName,
        })
        .eq('id', todoId);
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
}

/**
 * DELETE /api/reminders
 * Remove a reminder
 *
 * Query params:
 * - id: UUID of the reminder to delete
 */
export async function DELETE(request: NextRequest) {
  const { userName, error: authError } = await extractAndValidateUserName(request);
  if (authError) return authError;

  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const reminderId = searchParams.get('id');

  if (!reminderId) {
    return NextResponse.json(
      { success: false, error: 'Reminder id is required' },
      { status: 400 }
    );
  }

  // First, fetch the reminder to verify access
  const { data: reminder, error: fetchError } = await supabase
    .from('task_reminders')
    .select('*, todos:todo_id (id, created_by, assigned_to, updated_by)')
    .eq('id', reminderId)
    .single();

  if (fetchError || !reminder) {
    return NextResponse.json(
      { success: false, error: 'Reminder not found' },
      { status: 404 }
    );
  }

  // Verify user has access to the associated todo
  const todo = reminder.todos as { id: string; created_by: string; assigned_to: string; updated_by: string };
  const hasAccess =
    reminder.created_by === userName ||
    todo.created_by === userName ||
    todo.assigned_to === userName ||
    todo.updated_by === userName;

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
}

/**
 * PATCH /api/reminders
 * Update a reminder (e.g., change time or cancel)
 *
 * Request body:
 * - id: UUID of the reminder
 * - reminderTime?: New reminder time
 * - status?: New status ('cancelled' to cancel)
 * - message?: Updated message
 */
export async function PATCH(request: NextRequest) {
  const { userName, error: authError } = await extractAndValidateUserName(request);
  if (authError) return authError;

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

    // Fetch the reminder to verify access
    const { data: reminder, error: fetchError } = await supabase
      .from('task_reminders')
      .select('*, todos:todo_id (id, created_by, assigned_to, updated_by)')
      .eq('id', id)
      .single();

    if (fetchError || !reminder) {
      return NextResponse.json(
        { success: false, error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Verify access
    const todo = reminder.todos as { id: string; created_by: string; assigned_to: string; updated_by: string };
    const hasAccess =
      reminder.created_by === userName ||
      todo.created_by === userName ||
      todo.assigned_to === userName ||
      todo.updated_by === userName;

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
}
