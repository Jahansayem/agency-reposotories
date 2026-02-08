import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { withAgencyOwnerAuth, AgencyAuthContext } from '@/lib/agencyAuth';

// GET - Fetch all goal categories
export const GET = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = createServiceRoleClient();
    let query = supabase
      .from('goal_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Error fetching categories', error, { component: 'api/goals/categories', action: 'GET' });
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
});

// POST - Create a new category
export const POST = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { name, color, icon } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Get max display_order within this agency
    let maxOrderQuery = supabase
      .from('goal_categories')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    if (ctx.agencyId) {
      maxOrderQuery = maxOrderQuery.eq('agency_id', ctx.agencyId);
    }

    const { data: maxOrderData } = await maxOrderQuery.single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    const insertData: Record<string, unknown> = {
      name,
      color: color || '#6366f1',
      icon: icon || 'target',
      display_order: nextOrder,
    };

    if (ctx.agencyId) {
      insertData.agency_id = ctx.agencyId;
    }

    const { data, error } = await supabase
      .from('goal_categories')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error creating category', error, { component: 'api/goals/categories', action: 'POST' });
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
});

// PUT - Update a category
export const PUT = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { id, name, color, icon, display_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (display_order !== undefined) updateData.display_order = display_order;

    let updateQuery = supabase
      .from('goal_categories')
      .update(updateData)
      .eq('id', id);

    if (ctx.agencyId) {
      updateQuery = updateQuery.eq('agency_id', ctx.agencyId);
    }

    const { data, error } = await updateQuery.select().single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error updating category', error, { component: 'api/goals/categories', action: 'PUT' });
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
});

// DELETE - Delete a category
export const DELETE = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    let deleteQuery = supabase
      .from('goal_categories')
      .delete()
      .eq('id', id);

    if (ctx.agencyId) {
      deleteQuery = deleteQuery.eq('agency_id', ctx.agencyId);
    }

    const { error } = await deleteQuery;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting category', error, { component: 'api/goals/categories', action: 'DELETE' });
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
});
