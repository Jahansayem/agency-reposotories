/**
 * Waiting for Customer Response API
 *
 * POST - Mark a task as waiting for customer response
 * DELETE - Clear waiting status (customer responded)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';
import type { WaitingContactType } from '@/types/todo';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface MarkWaitingRequest {
  todoId: string;
  contactType: WaitingContactType;
  followUpAfterHours?: number;
}

interface ClearWaitingRequest {
  todoId: string;
}

/**
 * POST /api/todos/waiting
 * Mark a task as waiting for customer response
 */
export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json() as MarkWaitingRequest;
    const { todoId, contactType, followUpAfterHours = 48 } = body;

    if (!todoId || !contactType) {
      return NextResponse.json(
        { success: false, error: 'todoId and contactType are required' },
        { status: 400 }
      );
    }

    if (!['call', 'email', 'other'].includes(contactType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid contactType. Must be call, email, or other' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // Update the todo with waiting status, scoped to this agency
    const { data: todo, error: updateError } = await supabase
      .from('todos')
      .update({
        waiting_for_response: true,
        waiting_since: now,
        waiting_contact_type: contactType,
        follow_up_after_hours: followUpAfterHours,
        updated_at: now,
        updated_by: ctx.userName,
      })
      .eq('id', todoId)
      .eq('agency_id', ctx.agencyId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to mark task as waiting', updateError, { component: 'WaitingAPI' });
      return NextResponse.json(
        { success: false, error: 'Failed to update task' },
        { status: 500 }
      );
    }

    // Log the activity
    await supabase.from('activity_log').insert({
      action: 'marked_waiting',
      todo_id: todoId,
      todo_text: todo.text,
      user_name: ctx.userName,
      agency_id: ctx.agencyId,
      details: {
        contact_type: contactType,
        follow_up_after_hours: followUpAfterHours,
      },
    });

    logger.info('Task marked as waiting', {
      component: 'WaitingAPI',
      todoId,
      contactType,
      userName: ctx.userName,
    });

    return NextResponse.json({
      success: true,
      todo,
      message: `Task marked as waiting for ${contactType} response`,
    });

  } catch (error) {
    logger.error('Error in mark waiting endpoint', error, { component: 'WaitingAPI' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/todos/waiting
 * Clear waiting status (customer responded)
 */
export const DELETE = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json() as ClearWaitingRequest;
    const { todoId } = body;

    if (!todoId) {
      return NextResponse.json(
        { success: false, error: 'todoId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // Get the current todo to log details, scoped to this agency
    const { data: currentTodo } = await supabase
      .from('todos')
      .select('text, waiting_since, waiting_contact_type')
      .eq('id', todoId)
      .eq('agency_id', ctx.agencyId)
      .single();

    if (!currentTodo) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Calculate how long they were waiting
    let waitingDuration = null;
    if (currentTodo?.waiting_since) {
      const since = new Date(currentTodo.waiting_since);
      const diff = Date.now() - since.getTime();
      const hours = Math.round(diff / (1000 * 60 * 60));
      waitingDuration = hours;
    }

    // Clear the waiting status
    const { data: todo, error: updateError } = await supabase
      .from('todos')
      .update({
        waiting_for_response: false,
        waiting_since: null,
        waiting_contact_type: null,
        updated_at: now,
        updated_by: ctx.userName,
      })
      .eq('id', todoId)
      .eq('agency_id', ctx.agencyId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to clear waiting status', updateError, { component: 'WaitingAPI' });
      return NextResponse.json(
        { success: false, error: 'Failed to update task' },
        { status: 500 }
      );
    }

    // Log the activity
    await supabase.from('activity_log').insert({
      action: 'customer_responded',
      todo_id: todoId,
      todo_text: todo.text,
      user_name: ctx.userName,
      agency_id: ctx.agencyId,
      details: {
        waited_hours: waitingDuration,
        contact_type: currentTodo?.waiting_contact_type,
      },
    });

    logger.info('Waiting status cleared - customer responded', {
      component: 'WaitingAPI',
      todoId,
      waitingDuration,
      userName: ctx.userName,
    });

    return NextResponse.json({
      success: true,
      todo,
      waitedHours: waitingDuration,
      message: 'Customer responded - waiting status cleared',
    });

  } catch (error) {
    logger.error('Error in clear waiting endpoint', error, { component: 'WaitingAPI' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
