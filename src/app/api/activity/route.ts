import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withAgencyAuth, setAgencyContext, type AgencyAuthContext } from '@/lib/agencyAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch activity log (accessible to all authenticated users within their agency)
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const todoId = searchParams.get('todoId');

    if (!userName) {
      return NextResponse.json({ error: 'userName is required' }, { status: 400 });
    }

    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

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
