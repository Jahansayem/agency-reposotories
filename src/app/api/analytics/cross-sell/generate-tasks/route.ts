/**
 * Generate Tasks from Cross-Sell Opportunities
 *
 * POST /api/analytics/cross-sell/generate-tasks
 * Creates todo tasks from cross-sell opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type {
  CrossSellOpportunity,
  CrossSellPriorityTier,
  CrossSellTaskGenerationOptions,
  DEFAULT_CROSS_SELL_PRIORITY_MAPPING,
  DEFAULT_CROSS_SELL_SUBTASKS,
} from '@/types/allstate-analytics';
import type { Todo, Subtask, TodoPriority } from '@/types/todo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default priority mapping
const PRIORITY_MAPPING: Record<CrossSellPriorityTier, TodoPriority> = {
  HOT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// Default subtasks for cross-sell tasks
const DEFAULT_SUBTASKS = [
  'Review customer account and current coverage',
  'Make contact attempt (call/email)',
  'Present cross-sell opportunity and value proposition',
  'Generate quote if interested',
  'Follow up on quote and close sale',
];

interface GenerateTasksRequest {
  opportunity_ids?: string[];
  tier_filter?: CrossSellPriorityTier[];
  max_opportunities?: number;
  options?: Partial<CrossSellTaskGenerationOptions>;
  created_by: string;
  agency_id?: string;
}

/**
 * POST /api/analytics/cross-sell/generate-tasks
 * Generate todo tasks from cross-sell opportunities
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateTasksRequest = await request.json();

    if (!body.created_by) {
      return NextResponse.json(
        { error: 'created_by is required' },
        { status: 400 }
      );
    }

    const options = {
      tiers_to_include: body.tier_filter || ['HOT', 'HIGH'],
      auto_assign_to: body.options?.auto_assign_to,
      include_talking_points_in_notes: body.options?.include_talking_points_in_notes ?? true,
      set_due_date_to_renewal: body.options?.set_due_date_to_renewal ?? true,
      due_date_days_before_renewal: body.options?.due_date_days_before_renewal ?? 3,
      create_subtasks: body.options?.create_subtasks ?? true,
      default_priority_mapping: body.options?.default_priority_mapping || PRIORITY_MAPPING,
    };

    // Fetch opportunities to process
    let query = supabase
      .from('cross_sell_opportunities')
      .select('*')
      .eq('dismissed', false)
      .is('task_id', null); // Only opportunities without tasks

    if (body.agency_id) {
      query = query.eq('agency_id', body.agency_id);
    }

    if (body.opportunity_ids && body.opportunity_ids.length > 0) {
      query = query.in('id', body.opportunity_ids);
    } else if (options.tiers_to_include.length > 0) {
      query = query.in('priority_tier', options.tiers_to_include);
    }

    query = query.order('priority_rank', { ascending: true });

    if (body.max_opportunities) {
      query = query.limit(body.max_opportunities);
    }

    const { data: opportunities, error: fetchError } = await query;

    if (fetchError) {
      console.error('Failed to fetch opportunities:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
        { status: 500 }
      );
    }

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No opportunities found matching criteria',
        tasks_created: 0,
        tasks: [],
      });
    }

    // Generate tasks
    const createdTasks: Array<{ task_id: string; opportunity_id: string }> = [];
    const errors: Array<{ opportunity_id: string; error: string }> = [];

    for (const opp of opportunities as CrossSellOpportunity[]) {
      try {
        // Generate task text
        const taskText = `Cross-sell ${opp.recommended_product} to ${opp.customer_name}`;

        // Generate notes with talking points
        let notes = '';
        if (options.include_talking_points_in_notes) {
          notes = [
            `**Customer:** ${opp.customer_name}`,
            `**Phone:** ${opp.phone || 'N/A'}`,
            `**Email:** ${opp.email || 'N/A'}`,
            '',
            `**Current Products:** ${opp.current_products}`,
            `**Recommended:** ${opp.recommended_product}`,
            `**Potential Premium:** $${opp.potential_premium_add?.toLocaleString() || 'N/A'}`,
            '',
            '**Talking Points:**',
            `1. ${opp.talking_point_1 || 'Review customer needs'}`,
            `2. ${opp.talking_point_2 || 'Present bundle savings'}`,
            `3. ${opp.talking_point_3 || 'Emphasize value'}`,
          ].join('\n');
        }

        // Calculate due date
        let dueDate: string | undefined;
        if (options.set_due_date_to_renewal && opp.renewal_date) {
          const renewalDate = new Date(opp.renewal_date);
          renewalDate.setDate(renewalDate.getDate() - options.due_date_days_before_renewal);
          // Don't set due date in the past
          if (renewalDate > new Date()) {
            dueDate = renewalDate.toISOString();
          } else {
            // If renewal is imminent or past, set due date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString();
          }
        }

        // Create subtasks
        const subtasks: Subtask[] = options.create_subtasks
          ? DEFAULT_SUBTASKS.map((text, index) => ({
              id: uuidv4(),
              text,
              completed: false,
              priority: index === 0 || index === 1 ? 'high' : 'medium' as TodoPriority,
            }))
          : [];

        // Map priority
        const priority = options.default_priority_mapping[opp.priority_tier] || 'medium';

        // Create the task
        const task: Partial<Todo> = {
          text: taskText,
          completed: false,
          status: 'todo',
          priority,
          created_by: body.created_by,
          assigned_to: options.auto_assign_to || body.created_by,
          due_date: dueDate,
          notes,
          subtasks,
          agency_id: body.agency_id,
          // Cross-sell specific metadata
          category: 'prospecting',
          customer_name: opp.customer_name,
          premium_amount: opp.potential_premium_add,
        };

        const { data: createdTask, error: createError } = await supabase
          .from('todos')
          .insert(task)
          .select('id')
          .single();

        if (createError) {
          throw new Error(createError.message);
        }

        // Link task to opportunity
        await supabase
          .from('cross_sell_opportunities')
          .update({ task_id: createdTask.id })
          .eq('id', opp.id);

        createdTasks.push({
          task_id: createdTask.id,
          opportunity_id: opp.id,
        });

        // Log activity
        await supabase.from('activity_log').insert({
          action: 'task_created',
          todo_id: createdTask.id,
          todo_text: taskText,
          user_name: body.created_by,
          agency_id: body.agency_id,
          details: {
            source: 'cross_sell_opportunity',
            opportunity_id: opp.id,
            customer_name: opp.customer_name,
            priority_tier: opp.priority_tier,
          },
        });
      } catch (err) {
        errors.push({
          opportunity_id: opp.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      tasks_created: createdTasks.length,
      tasks: createdTasks,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error generating tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
