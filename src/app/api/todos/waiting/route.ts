/**
 * Waiting for Customer Response API
 *
 * POST - Mark a task as waiting for customer response
 * DELETE - Clear waiting status (customer responded)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
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
export async function POST(request: NextRequest) {
  try {
    const userName = request.headers.get('X-User-Name');
    if (!userName) {
      return NextResponse.json(
        { success: false, error: 'User name required' },
        { status: 401 }
      );
    }

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

    // Update the todo with waiting status
    const { data: todo, error: updateError } = await supabase
      .from('todos')
      .update({
        waiting_for_response: true,
        waiting_since: now,
        waiting_contact_type: contactType,
        follow_up_after_hours: followUpAfterHours,
        updated_at: now,
        updated_by: userName,
      })
      .eq('id', todoId)
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
      user_name: userName,
      details: {
        contact_type: contactType,
        follow_up_after_hours: followUpAfterHours,
      },
    });

    logger.info('Task marked as waiting', {
      component: 'WaitingAPI',
      todoId,
      contactType,
      userName,
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
}

/**
 * DELETE /api/todos/waiting
 * Clear waiting status (customer responded)
 */
export async function DELETE(request: NextRequest) {
  try {
    const userName = request.headers.get('X-User-Name');
    if (!userName) {
      return NextResponse.json(
        { success: false, error: 'User name required' },
        { status: 401 }
      );
    }

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

    // Get the current todo to log details
    const { data: currentTodo } = await supabase
      .from('todos')
      .select('text, waiting_since, waiting_contact_type')
      .eq('id', todoId)
      .single();

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
        updated_by: userName,
      })
      .eq('id', todoId)
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
      user_name: userName,
      details: {
        waited_hours: waitingDuration,
        contact_type: currentTodo?.waiting_contact_type,
      },
    });

    logger.info('Waiting status cleared - customer responded', {
      component: 'WaitingAPI',
      todoId,
      waitingDuration,
      userName,
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
}
