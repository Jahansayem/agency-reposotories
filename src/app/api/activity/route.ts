import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withAgencyAuth, setAgencyContext, type AgencyAuthContext } from '@/lib/agencyAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch activity log (accessible to all authenticated users within their agency)
// Staff users without can_view_all_tasks only see activities for tasks they created or are assigned to
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const todoId = searchParams.get('todoId');

    if (!userName) {
      return NextResponse.json({ error: 'userName is required' }, { status: 400 });
    }

    // Check if user has permission to view all tasks
    const canViewAllTasks = ctx.permissions?.can_view_all_tasks ?? true;

    // If staff without can_view_all_tasks, we need to filter activities
    // to only show activities for tasks they created or are assigned to
    if (!canViewAllTasks && !todoId) {
      // First, get the list of todo IDs the user can see
      let todosQuery = supabase
        .from('todos')
        .select('id')
        .or(`created_by.eq.${ctx.userName},assigned_to.eq.${ctx.userName}`);

      if (ctx.agencyId) {
        todosQuery = todosQuery.eq('agency_id', ctx.agencyId);
      }

      const { data: userTodos, error: todosError } = await todosQuery;

      if (todosError) {
        logger.error('Error fetching user todos for activity filter', todosError, {
          component: 'api/activity',
          action: 'GET',
        });
        throw todosError;
      }

      const userTodoIds = (userTodos || []).map(t => t.id);

      // Now fetch activities only for those todos (or activities without a todo_id like their own actions)
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (ctx.agencyId) {
        query = query.eq('agency_id', ctx.agencyId);
      }

      // Filter to: activities for user's tasks OR activities by the user themselves
      if (userTodoIds.length > 0) {
        query = query.or(`todo_id.in.(${userTodoIds.join(',')}),user_name.eq.${ctx.userName}`);
      } else {
        // User has no tasks, only show their own activities
        query = query.eq('user_name', ctx.userName);
      }

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json(data || []);
    }

    // Standard query for users with can_view_all_tasks or when filtering by specific todoId
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Scope to agency
    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    // Filter by todo_id if provided (for task-level history)
    if (todoId) {
      query = query.eq('todo_id', todoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Error fetching activity', error, { component: 'api/activity', action: 'GET' });
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
});

// POST - Log an activity (called internally when tasks are modified)
export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const body = await request.json();
    const { action, todo_id, todo_text, user_name, details } = body;

    if (!action || !user_name) {
      return NextResponse.json({ error: 'action and user_name are required' }, { status: 400 });
    }

    // Verify that the authenticated user matches the user_name in the body
    // This prevents users from logging activities as other users
    if (ctx.userName !== user_name) {
      return NextResponse.json(
        { error: 'Authenticated user does not match user_name in request body' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        action,
        todo_id: todo_id || null,
        todo_text: todo_text || null,
        user_name,
        details: details || {},
        ...(ctx.agencyId ? { agency_id: ctx.agencyId } : {}),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error logging activity', error, { component: 'api/activity', action: 'POST' });
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
});
