import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withAgencyOwnerAuth, AgencyAuthContext } from '@/lib/agencyAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// API-008: Pagination constants
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// GET - Fetch all strategic goals with categories and milestones
export const GET = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
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
      .eq('agency_id', ctx.agencyId)
      .order('display_order', { ascending: true })
      .limit(limit);

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
    const { data: maxOrderData } = await supabase
      .from('strategic_goals')
      .select('display_order')
      .eq('agency_id', ctx.agencyId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('strategic_goals')
      .insert({
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
        agency_id: ctx.agencyId,
      })
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

    const { data, error } = await supabase
      .from('strategic_goals')
      .update(updateData)
      .eq('id', id)
      .eq('agency_id', ctx.agencyId)
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('strategic_goals')
      .delete()
      .eq('id', id)
      .eq('agency_id', ctx.agencyId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting goal', error, { component: 'api/goals', action: 'DELETE' });
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
});
