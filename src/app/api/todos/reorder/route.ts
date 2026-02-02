import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';

/**
 * POST /api/todos/reorder
 *
 * Reorder tasks in the list view by updating display_order
 * Requires authenticated session with agency context.
 *
 * Request body options:
 * 1. Move task to specific position:
 *    { todoId: string, newOrder: number }
 *
 * 2. Move task up or down one position:
 *    { todoId: string, direction: 'up' | 'down' }
 *
 * 3. Swap two tasks:
 *    { todoId: string, targetTodoId: string }
 */
async function handleReorder(request: NextRequest, ctx: AgencyAuthContext) {
  try {
    // Create Supabase client at request time (not module level)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { todoId, newOrder, direction, targetTodoId } = body;

    if (!todoId) {
      return NextResponse.json(
        { error: 'todoId is required' },
        { status: 400 }
      );
    }

    // Get the current task — scoped to agency
    let query = supabase
      .from('todos')
      .select('*')
      .eq('id', todoId);

    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    const { data: currentTask, error: fetchError } = await query.single();

    if (fetchError || !currentTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    let updatedTasks: any[] = [];

    // Handle different reorder modes
    if (newOrder !== undefined) {
      // Mode 1: Move to specific position
      updatedTasks = await moveToPosition(supabase, todoId, currentTask.display_order, newOrder, ctx.agencyId);
    } else if (direction) {
      // Mode 2: Move up or down
      updatedTasks = await moveUpOrDown(supabase, todoId, currentTask.display_order, direction, ctx.agencyId);
    } else if (targetTodoId) {
      // Mode 3: Swap with target task
      updatedTasks = await swapTasks(supabase, todoId, targetTodoId, ctx.agencyId);
    } else {
      return NextResponse.json(
        { error: 'Must provide newOrder, direction, or targetTodoId' },
        { status: 400 }
      );
    }

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'task_reordered',
      todo_id: todoId,
      todo_text: currentTask.text,
      user_name: ctx.userName,
      ...(ctx.agencyId ? { agency_id: ctx.agencyId } : {}),
      details: {
        from: currentTask.display_order,
        to: updatedTasks.find(t => t.id === todoId)?.display_order,
      },
    });

    return NextResponse.json({
      success: true,
      updatedTasks,
    });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    return NextResponse.json(
      { error: 'Failed to reorder tasks' },
      { status: 500 }
    );
  }
}

export const POST = withAgencyAuth(handleReorder);

/**
 * Move task to a specific position — scoped to agency
 */
async function moveToPosition(
  supabase: any,
  todoId: string,
  currentOrder: number,
  newOrder: number,
  agencyId: string
): Promise<any[]> {
  // Get all tasks ordered by display_order — scoped to agency
  let query = supabase
    .from('todos')
    .select('*')
    .order('display_order', { ascending: true });

  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data: allTasks } = await query;

  if (!allTasks) return [];

  // Remove task from current position
  const task = allTasks.find((t: any) => t.id === todoId);
  const otherTasks = allTasks.filter((t: any) => t.id !== todoId);

  // Insert task at new position
  otherTasks.splice(newOrder, 0, task!);

  // Reassign display_order to all tasks
  const updates = otherTasks.map((t: any, index: number) => ({
    id: t.id,
    display_order: index,
  }));

  // Batch update
  const updatedTasks = [];
  for (const update of updates) {
    const { data, error } = await supabase
      .from('todos')
      .update({ display_order: update.display_order, updated_at: new Date().toISOString() })
      .eq('id', update.id)
      .select()
      .single();

    if (data) updatedTasks.push(data);
  }

  return updatedTasks;
}

/**
 * Move task up or down one position — scoped to agency
 */
async function moveUpOrDown(
  supabase: any,
  todoId: string,
  currentOrder: number,
  direction: 'up' | 'down',
  agencyId: string
): Promise<any[]> {
  const offset = direction === 'up' ? -1 : 1;
  const targetOrder = currentOrder + offset;

  // Get task at target position — scoped to agency
  let query = supabase
    .from('todos')
    .select('*')
    .eq('display_order', targetOrder);

  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data: targetTask } = await query.single();

  if (!targetTask) {
    // Already at boundary (top or bottom)
    return [];
  }

  // Swap display_order
  const updates = [
    {
      id: todoId,
      display_order: targetOrder,
    },
    {
      id: targetTask.id,
      display_order: currentOrder,
    },
  ];

  const updatedTasks = [];
  for (const update of updates) {
    const { data } = await supabase
      .from('todos')
      .update({ display_order: update.display_order, updated_at: new Date().toISOString() })
      .eq('id', update.id)
      .select()
      .single();

    if (data) updatedTasks.push(data);
  }

  return updatedTasks;
}

/**
 * Swap two tasks — verifies both belong to same agency
 */
async function swapTasks(supabase: any, todoId: string, targetTodoId: string, agencyId: string): Promise<any[]> {
  let query = supabase
    .from('todos')
    .select('*')
    .in('id', [todoId, targetTodoId]);

  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data: tasks } = await query;

  if (!tasks || tasks.length !== 2) {
    return [];
  }

  const [task1, task2] = tasks;

  // Swap display_order
  const updates = [
    { id: task1.id, display_order: task2.display_order },
    { id: task2.id, display_order: task1.display_order },
  ];

  const updatedTasks = [];
  for (const update of updates) {
    const { data } = await supabase
      .from('todos')
      .update({ display_order: update.display_order, updated_at: new Date().toISOString() })
      .eq('id', update.id)
      .select()
      .single();

    if (data) updatedTasks.push(data);
  }

  return updatedTasks;
}
