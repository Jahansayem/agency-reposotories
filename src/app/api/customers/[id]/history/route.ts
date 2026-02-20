/**
 * Customer Interaction History API
 *
 * GET /api/customers/[id]/history - Fetch paginated interaction history
 *
 * Query params:
 * - limit: Max results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 *
 * Returns interactions sorted by created_at descending (most recent first),
 * with user names and related task info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAgencyAccess } from '@/lib/agencyAuth';
import type { CustomerInteractionWithTask, InteractionType } from '@/types/interaction';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  // Verify agency authentication
  const auth = await verifyAgencyAccess(request);
  if (!auth.success || !auth.context) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ctx = auth.context;

  try {
    const supabase = getSupabaseClient();
    const { id: customerId } = await params;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Fetch interactions with user info via join
    let query = supabase
      .from('customer_interactions')
      .select(
        `
        id,
        agency_id,
        customer_id,
        interaction_type,
        summary,
        details,
        task_id,
        subtask_id,
        created_by,
        created_at,
        users:created_by (name)
      `,
        { count: 'exact' }
      )
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Scope to agency if multi-tenancy is active
    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    const { data: interactions, error: interactionsError, count } = await query;

    if (interactionsError) {
      console.error('Failed to fetch customer interactions:', interactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch interaction history' },
        { status: 500 }
      );
    }

    // Collect task IDs for related task lookup
    interface InteractionRow {
      task_id?: string;
      id: string;
      customer_id: string;
      agency_id: string;
      interaction_type: InteractionType;
      summary: string;
      details?: Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
      created_by: string;
      created_at: string;
      users?: { name: string };
    }
    const typedInteractions = (interactions || []) as unknown as InteractionRow[];
    const taskIds = typedInteractions
      .filter((i) => i.task_id)
      .map((i) => i.task_id as string);

    // Dedupe task IDs
    const uniqueTaskIds = [...new Set(taskIds)];

    // Fetch related tasks if any
    const tasksMap: Record<string, { id: string; text: string; completed: boolean }> = {};
    if (uniqueTaskIds.length > 0) {
      let tasksQuery = supabase
        .from('todos')
        .select('id, text, completed')
        .in('id', uniqueTaskIds);

      if (ctx.agencyId) {
        tasksQuery = tasksQuery.eq('agency_id', ctx.agencyId);
      }

      const { data: tasks } = await tasksQuery;

      if (tasks) {
        for (const task of tasks) {
          tasksMap[task.id] = {
            id: task.id,
            text: task.text,
            completed: task.completed,
          };
        }
      }
    }

    // Transform to camelCase response format
    const formattedInteractions: CustomerInteractionWithTask[] = ((interactions || []) as unknown as InteractionRow[]).map((interaction) => {
      const result: CustomerInteractionWithTask = {
        id: interaction.id,
        customerId: interaction.customer_id,
        agencyId: interaction.agency_id,
        interactionType: interaction.interaction_type,
        summary: interaction.summary,
        details: interaction.details ?? null,
        taskId: interaction.task_id || undefined,
        createdBy: interaction.created_by,
        createdByName: interaction.users?.name || undefined,
        createdAt: interaction.created_at,
      };

      // Attach related task if available
      if (interaction.task_id && tasksMap[interaction.task_id]) {
        result.relatedTask = tasksMap[interaction.task_id];
      }

      return result;
    });

    return NextResponse.json({
      success: true,
      interactions: formattedInteractions,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching customer interaction history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
