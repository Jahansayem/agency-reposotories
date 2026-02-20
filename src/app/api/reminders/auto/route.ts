/**
 * Auto-Reminders API
 *
 * Server-side endpoint for creating automatic reminders when tasks are created or updated.
 * This ensures service role credentials are never exposed to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';
import { createAutoReminders, updateAutoReminders } from '@/lib/reminderService';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for user lookups
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/reminders/auto
 * Create automatic reminders for a task with a due date
 *
 * Body:
 * {
 *   todoId: string,
 *   dueDate: string,
 *   assignedTo: string
 * }
 */
export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json();
    const { todoId, dueDate, assignedTo } = body;

    // Validate required fields
    if (!todoId) {
      return NextResponse.json(
        { success: false, error: 'todoId is required' },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return NextResponse.json(
        { success: false, error: 'dueDate is required' },
        { status: 400 }
      );
    }

    if (!assignedTo) {
      return NextResponse.json(
        { success: false, error: 'assignedTo is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verify the todo belongs to this agency
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', todoId)
      .eq('agency_id', ctx.agencyId)
      .single();

    if (todoError || !todo) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Look up the assignee's user ID
    const { data: assigneeData, error: assigneeLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('name', assignedTo)
      .single();

    if (assigneeLookupError || !assigneeData?.id) {
      logger.error('Failed to look up assignee for auto-reminders', assigneeLookupError, {
        component: 'auto-reminders',
        assignedTo,
      });
      return NextResponse.json(
        { success: false, error: 'Assignee not found' },
        { status: 404 }
      );
    }

    // Create auto-reminders using the service
    const result = await createAutoReminders(
      todoId,
      dueDate,
      assigneeData.id,
      ctx.userName
    );

    if (!result.success) {
      logger.error('Failed to create auto-reminders', { error: result.error, component: 'auto-reminders' });
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create auto-reminders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      created: result.created,
    });
  } catch (error) {
    logger.error('Error in POST /api/reminders/auto', error, { component: 'auto-reminders' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/reminders/auto
 * Update automatic reminders when a task's due date changes
 *
 * Body:
 * {
 *   todoId: string,
 *   dueDate: string | null,
 *   assignedTo: string
 * }
 */
export const PATCH = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json();
    const { todoId, dueDate, assignedTo } = body;

    // Validate required fields
    if (!todoId) {
      return NextResponse.json(
        { success: false, error: 'todoId is required' },
        { status: 400 }
      );
    }

    if (!assignedTo) {
      return NextResponse.json(
        { success: false, error: 'assignedTo is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verify the todo belongs to this agency
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', todoId)
      .eq('agency_id', ctx.agencyId)
      .single();

    if (todoError || !todo) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Look up the assignee's user ID
    const { data: assigneeData, error: assigneeLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('name', assignedTo)
      .single();

    if (assigneeLookupError || !assigneeData?.id) {
      logger.error('Failed to look up assignee for auto-reminder update', assigneeLookupError, {
        component: 'auto-reminders',
        assignedTo,
      });
      return NextResponse.json(
        { success: false, error: 'Assignee not found' },
        { status: 404 }
      );
    }

    // Update auto-reminders using the service
    const result = await updateAutoReminders(
      todoId,
      dueDate || null,
      assigneeData.id,
      ctx.userName
    );

    if (!result.success) {
      logger.error('Failed to update auto-reminders', { error: result.error, component: 'auto-reminders' });
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update auto-reminders' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in PATCH /api/reminders/auto', error, { component: 'auto-reminders' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
