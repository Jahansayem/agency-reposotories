import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';
import { logger } from '@/lib/logger';

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
 *
 * 4. Set explicit order for a list of tasks (preferred for drag-and-drop):
 *    { orderedIds: string[] }
 */
async function handleReorder(request: NextRequest, ctx: AgencyAuthContext) {
  try {
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const { todoId, newOrder, direction, targetTodoId, orderedIds } = body;

    let updatedTasks: any[] = [];

    // Mode 4: Explicit ordered list (preferred for drag-and-drop)
    if (orderedIds && Array.isArray(orderedIds)) {
      updatedTasks = await setExplicitOrder(supabase, orderedIds, ctx.agencyId);

      // Log activity
      await supabase.from('activity_log').insert({
        action: 'task_reordered',
        user_name: ctx.userName,
        ...(ctx.agencyId ? { agency_id: ctx.agencyId } : {}),
        details: { mode: 'explicit_order', count: orderedIds.length },
      });

      return NextResponse.json({ success: true, updatedTasks });
    }

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
        { error: 'Must provide newOrder, direction, targetTodoId, or orderedIds' },
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
    logger.error('Error reordering tasks', error as Error, { component: 'todos/reorder', action: 'handleReorder' });
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

  // Reassign display_order — only update tasks whose order actually changed
  const updates = otherTasks
    .map((t: any, index: number) => ({ id: t.id, display_order: index, oldOrder: t.display_order }))
    .filter((u: any) => u.display_order !== u.oldOrder);

  // Don't touch updated_at — avoids triggering real-time content-change events
  // BUGFIX API-006: Use Promise.all for parallel updates instead of sequential N+1 queries
  const updatePromises = updates.map((update: { id: string; display_order: number }) =>
    supabase
      .from('todos')
      .update({ display_order: update.display_order })
      .eq('id', update.id)
      .select()
      .single()
  );

  const results = await Promise.all(updatePromises);
  const updatedTasks = results
    .filter((r: { data: unknown }) => r.data)
    .map((r: { data: unknown }) => r.data);

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

  // BUGFIX API-006: Use Promise.all for parallel updates
  const updatePromises = updates.map((update) =>
    supabase
      .from('todos')
      .update({ display_order: update.display_order })
      .eq('id', update.id)
      .select()
      .single()
  );

  const results = await Promise.all(updatePromises);
  const updatedTasks = results
    .filter((r) => r.data)
    .map((r) => r.data);

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

  // BUGFIX API-006: Use Promise.all for parallel updates
  const updatePromises = updates.map((update) =>
    supabase
      .from('todos')
      .update({ display_order: update.display_order })
      .eq('id', update.id)
      .select()
      .single()
  );

  const results = await Promise.all(updatePromises);
  const updatedTasks = results
    .filter((r) => r.data)
    .map((r) => r.data);

  return updatedTasks;
}

/**
 * Set explicit display_order for a list of task IDs.
 * The index in the array becomes the display_order.
 * Only updates tasks whose display_order actually changed.
 */
async function setExplicitOrder(
  supabase: any,
  orderedIds: string[],
  agencyId: string
): Promise<any[]> {
  if (orderedIds.length === 0) return [];

  // Fetch current display_order for these tasks (to skip unchanged ones)
  let query = supabase
    .from('todos')
    .select('id, display_order')
    .in('id', orderedIds);

  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data: currentTasks } = await query;
  if (!currentTasks) return [];

  const currentOrderMap = new Map<string, number | null>(
    currentTasks.map((t: any) => [t.id, t.display_order])
  );

  // Only update tasks whose display_order actually changed
  const updates: { id: string; display_order: number }[] = [];
  orderedIds.forEach((id, index) => {
    if (currentOrderMap.has(id) && currentOrderMap.get(id) !== index) {
      updates.push({ id, display_order: index });
    }
  });

  // BUGFIX API-006: Use Promise.all for parallel updates instead of sequential N+1 queries
  const updatePromises = updates.map((update) =>
    supabase
      .from('todos')
      .update({ display_order: update.display_order })
      .eq('id', update.id)
      .select()
      .single()
  );

  const results = await Promise.all(updatePromises);
  const updatedTasks = results
    .filter((r) => r.data)
    .map((r) => r.data);

  return updatedTasks;
}
