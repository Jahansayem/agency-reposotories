/**
 * Create Task from Opportunity API
 *
 * POST /api/opportunities/create-task
 * Creates a todo task from a cross-sell opportunity and links them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateTaskRequest {
  opportunityId: string;
  assignedTo: string;
  createdBy: string;
  priority?: string;
  customText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskRequest = await request.json();
    const { opportunityId, assignedTo, createdBy, priority = 'high', customText } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
    }

    if (!assignedTo || !createdBy) {
      return NextResponse.json({ error: 'assignedTo and createdBy are required' }, { status: 400 });
    }

    // Get opportunity details
    const { data: opp, error: oppError } = await supabase
      .from('cross_sell_opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opp) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Check if task already exists for this opportunity
    if (opp.task_id) {
      return NextResponse.json({
        error: 'Task already exists for this opportunity',
        taskId: opp.task_id,
      }, { status: 409 });
    }

    // Try to find customer in customer_insights
    const { data: customerInsight } = await supabase
      .from('customer_insights')
      .select('id')
      .eq('customer_name', opp.customer_name)
      .maybeSingle();

    // Determine customer segment
    const segment = getSegment(opp.current_premium || 0, opp.policy_count || 1);

    // Build task text
    const taskText = customText || `Contact ${opp.customer_name} about ${opp.recommended_product} opportunity`;

    // Build notes with opportunity details
    const notes = buildTaskNotes(opp);

    // Create the task
    const { data: newTask, error: taskError } = await supabase
      .from('todos')
      .insert({
        text: taskText,
        priority: mapPriorityTier(opp.priority_tier, priority),
        assigned_to: assignedTo,
        created_by: createdBy,
        due_date: opp.renewal_date || null,
        customer_id: customerInsight?.id || null,
        customer_name: opp.customer_name,
        customer_segment: segment,
        notes,
        status: 'todo',
        completed: false,
      })
      .select('id')
      .single();

    if (taskError) {
      console.error('Failed to create task:', taskError);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    // Link the opportunity to the task
    const { error: linkError } = await supabase
      .from('cross_sell_opportunities')
      .update({ task_id: newTask.id })
      .eq('id', opportunityId);

    if (linkError) {
      console.error('Failed to link opportunity to task:', linkError);
      // Task was created but linking failed - not critical
    }

    return NextResponse.json({
      success: true,
      taskId: newTask.id,
      opportunityId,
      message: `Task created for ${opp.customer_name}`,
    });
  } catch (error) {
    console.error('Error creating task from opportunity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getSegment(premium: number, policyCount: number): string {
  if (premium >= 15000 || policyCount >= 4) return 'elite';
  if (premium >= 7000 || policyCount >= 3) return 'premium';
  if (premium >= 3000 || policyCount >= 2) return 'standard';
  return 'entry';
}

function mapPriorityTier(tier: string, defaultPriority: string): string {
  switch (tier) {
    case 'HOT': return 'urgent';
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'medium';
    case 'LOW': return 'low';
    default: return defaultPriority;
  }
}

function buildTaskNotes(opp: Record<string, unknown>): string {
  const parts: string[] = [];

  parts.push('**Cross-sell Opportunity**');
  parts.push('');

  if (opp.current_products) {
    parts.push(`**Current:** ${opp.current_products}`);
  }

  if (opp.recommended_product) {
    parts.push(`**Recommended:** ${opp.recommended_product}`);
  }

  if (opp.potential_premium_add) {
    parts.push(`**Potential:** $${Number(opp.potential_premium_add).toLocaleString()}/yr`);
  }

  if (opp.expected_conversion_pct) {
    parts.push(`**Conversion Rate:** ${opp.expected_conversion_pct}%`);
  }

  // Add talking points
  const talkingPoints = [opp.talking_point_1, opp.talking_point_2, opp.talking_point_3].filter(Boolean);
  if (talkingPoints.length > 0) {
    parts.push('');
    parts.push('**Talking Points:**');
    talkingPoints.forEach(point => {
      parts.push(`- ${point}`);
    });
  }

  // Add contact info
  if (opp.phone || opp.email) {
    parts.push('');
    parts.push('**Contact:**');
    if (opp.phone) parts.push(`- Phone: ${opp.phone}`);
    if (opp.email) parts.push(`- Email: ${opp.email}`);
  }

  return parts.join('\n');
}
