import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withAgencyOwnerAuth, AgencyAuthContext } from '@/lib/agencyAuth';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

// API-008: Pagination constants
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// GET - Fetch all strategic goals with categories and milestones
export const GET = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    // API-008: Parse and validate limit parameter
    const limitParam = searchParams.get('limit');
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    let query = supabase
      .from('strategic_goals')
      .select(`
        *,
        category:goal_categories(*),
        milestones:goal_milestones(*)
      `)
      .order('display_order', { ascending: true })
      .limit(limit);

    // Scope to agency only when multi-tenancy is active (ctx.agencyId is truthy).
    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Error fetching goals', error, { component: 'api/goals', action: 'GET' });
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
});

// POST - Create a new strategic goal
export const POST = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const {
      title,
      description,
      category_id,
      status,
      priority,
      target_date,
      target_value,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // Get max display_order for new goal within this agency
    let maxOrderQuery = supabase
      .from('strategic_goals')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    if (ctx.agencyId) {
      maxOrderQuery = maxOrderQuery.eq('agency_id', ctx.agencyId);
    }

    const { data: maxOrderData } = await maxOrderQuery.single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    const insertData: Record<string, unknown> = {
      title,
      description: description || null,
      category_id: category_id || null,
      status: status || 'not_started',
      priority: priority || 'medium',
      target_date: target_date || null,
      target_value: target_value || null,
      notes: notes || null,
      display_order: nextOrder,
      created_by: ctx.userName,
    };

    // Only set agency_id when multi-tenancy is active (column may not exist otherwise).
    if (ctx.agencyId) {
      insertData.agency_id = ctx.agencyId;
    }

    const { data, error } = await supabase
      .from('strategic_goals')
      .insert(insertData)
      .select(`
        *,
        category:goal_categories(*),
        milestones:goal_milestones(*)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error creating goal', error, { component: 'api/goals', action: 'POST' });
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
});

// PUT - Update a strategic goal
export const PUT = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const {
      id,
      title,
      description,
      category_id,
      status,
      priority,
      target_date,
      target_value,
      current_value,
      progress_percent,
      notes,
      display_order,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (target_date !== undefined) updateData.target_date = target_date;
    if (target_value !== undefined) updateData.target_value = target_value;
    if (current_value !== undefined) updateData.current_value = current_value;
    if (progress_percent !== undefined) updateData.progress_percent = progress_percent;
    if (notes !== undefined) updateData.notes = notes;
    if (display_order !== undefined) updateData.display_order = display_order;

    let updateQuery = supabase
      .from('strategic_goals')
      .update(updateData)
      .eq('id', id);

    if (ctx.agencyId) {
      updateQuery = updateQuery.eq('agency_id', ctx.agencyId);
    }

    const { data, error } = await updateQuery
      .select(`
        *,
        category:goal_categories(*),
        milestones:goal_milestones(*)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error updating goal', error, { component: 'api/goals', action: 'PUT' });
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
});

// DELETE - Delete a strategic goal
export const DELETE = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    let deleteQuery = supabase
      .from('strategic_goals')
      .delete()
      .eq('id', id);

    if (ctx.agencyId) {
      deleteQuery = deleteQuery.eq('agency_id', ctx.agencyId);
    }

    const { error } = await deleteQuery;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting goal', error, { component: 'api/goals', action: 'DELETE' });
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
});
