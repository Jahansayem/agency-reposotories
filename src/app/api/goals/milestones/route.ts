import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withAgencyOwnerAuth, AgencyAuthContext } from '@/lib/agencyAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Verify that a goal belongs to the given agency.
 * Returns the goal record or null.
 */
async function verifyGoalAgency(goalId: string, agencyId: string) {
  const { data, error } = await supabase
    .from('strategic_goals')
    .select('id')
    .eq('id', goalId)
    .eq('agency_id', agencyId)
    .single();

  if (error || !data) return null;
  return data;
}

// GET - Fetch milestones for a goal
export const GET = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');

    if (goalId) {
      // Verify the goal belongs to this agency
      const goal = await verifyGoalAgency(goalId, ctx.agencyId);
      if (!goal) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
    }

    // Fetch milestones, filtering to only those belonging to goals in this agency
    let query = supabase
      .from('goal_milestones')
      .select('*, strategic_goals!inner(agency_id)')
      .eq('strategic_goals.agency_id', ctx.agencyId)
      .order('display_order', { ascending: true });

    if (goalId) {
      query = query.eq('goal_id', goalId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Strip the joined strategic_goals data from the response
    const milestones = (data || []).map(({ strategic_goals: _sg, ...milestone }) => milestone);

    return NextResponse.json(milestones);
  } catch (error) {
    logger.error('Error fetching milestones', error, { component: 'api/goals/milestones', action: 'GET' });
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
});

// POST - Create a new milestone
export const POST = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json();
    const { goal_id, title, target_date } = body;

    if (!goal_id || !title) {
      return NextResponse.json({ error: 'goal_id and title are required' }, { status: 400 });
    }

    // Verify the goal belongs to this agency
    const goal = await verifyGoalAgency(goal_id, ctx.agencyId);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Get max display_order for this goal
    const { data: maxOrderData } = await supabase
      .from('goal_milestones')
      .select('display_order')
      .eq('goal_id', goal_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('goal_milestones')
      .insert({
        goal_id,
        title,
        target_date: target_date || null,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;

    // Update goal progress based on milestones
    await updateGoalProgress(goal_id);

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error creating milestone', error, { component: 'api/goals/milestones', action: 'POST' });
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
  }
});

// PUT - Update a milestone
export const PUT = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json();
    const { id, title, completed, target_date, display_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Verify the milestone belongs to a goal in this agency
    const { data: milestoneCheck } = await supabase
      .from('goal_milestones')
      .select('goal_id, strategic_goals!inner(agency_id)')
      .eq('id', id)
      .eq('strategic_goals.agency_id', ctx.agencyId)
      .single();

    if (!milestoneCheck) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (completed !== undefined) updateData.completed = completed;
    if (target_date !== undefined) updateData.target_date = target_date;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data, error } = await supabase
      .from('goal_milestones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update goal progress if completion changed
    if (completed !== undefined && data) {
      await updateGoalProgress(data.goal_id);
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error updating milestone', error, { component: 'api/goals/milestones', action: 'PUT' });
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
  }
});

// DELETE - Delete a milestone
export const DELETE = withAgencyOwnerAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Verify the milestone belongs to a goal in this agency and get goal_id
    const { data: milestone } = await supabase
      .from('goal_milestones')
      .select('goal_id, strategic_goals!inner(agency_id)')
      .eq('id', id)
      .eq('strategic_goals.agency_id', ctx.agencyId)
      .single();

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('goal_milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Update goal progress
    await updateGoalProgress(milestone.goal_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting milestone', error, { component: 'api/goals/milestones', action: 'DELETE' });
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
  }
});

// Helper function to update goal progress based on milestones
async function updateGoalProgress(goalId: string) {
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('completed')
    .eq('goal_id', goalId);

  if (milestones && milestones.length > 0) {
    const completedCount = milestones.filter(m => m.completed).length;
    const progressPercent = Math.round((completedCount / milestones.length) * 100);

    await supabase
      .from('strategic_goals')
      .update({
        progress_percent: progressPercent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId);
  }
}
