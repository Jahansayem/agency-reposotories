/**
 * Apply Retroactive Links API
 *
 * POST /api/admin/apply-retroactive-links
 * Applies approved retroactive customer-task links in batch.
 *
 * For each approved match:
 * 1. Updates the task's customer_id and customer_name
 * 2. Creates a customer_interactions record (type='task_completed')
 *    with retroactive_link: true in details
 *
 * Body: { approvedMatches: Array<{ taskId: string; customerId: string }> }
 * Returns: { success: number, failed: number, errors: string[] }
 *
 * Individual failures are non-blocking -- the batch continues processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAdminAuth, type AgencyAuthContext } from '@/lib/agencyAuth';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ApprovedMatch {
  taskId: string;
  customerId: string;
}

interface ApplyRequest {
  approvedMatches: ApprovedMatch[];
}

export const POST = withAgencyAdminAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const body: ApplyRequest = await request.json();

    const { approvedMatches } = body;

    if (!approvedMatches || !Array.isArray(approvedMatches) || approvedMatches.length === 0) {
      return NextResponse.json(
        { error: 'approvedMatches array is required and must not be empty' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const match of approvedMatches) {
      try {
        const { taskId, customerId } = match;

        if (!taskId || !customerId) {
          failedCount++;
          errors.push(`Invalid match: missing taskId or customerId`);
          continue;
        }

        // Fetch the task
        let taskQuery = supabase
          .from('todos')
          .select('id, text, completed_at, updated_at')
          .eq('id', taskId);

        if (ctx.agencyId) {
          taskQuery = taskQuery.eq('agency_id', ctx.agencyId);
        }

        const { data: task, error: taskError } = await taskQuery.single();

        if (taskError || !task) {
          failedCount++;
          errors.push(`Task ${taskId} not found`);
          continue;
        }

        // Fetch the customer
        let customerQuery = supabase
          .from('customer_insights')
          .select('id, customer_name, agency_id')
          .eq('id', customerId);

        if (ctx.agencyId) {
          customerQuery = customerQuery.eq('agency_id', ctx.agencyId);
        }

        const { data: customer, error: customerError } = await customerQuery.single();

        if (customerError || !customer) {
          failedCount++;
          errors.push(`Customer ${customerId} not found`);
          continue;
        }

        // Update the task with customer_id and customer_name
        let updateQuery = supabase
          .from('todos')
          .update({
            customer_id: customerId,
            customer_name: customer.customer_name,
          })
          .eq('id', taskId);

        if (ctx.agencyId) {
          updateQuery = updateQuery.eq('agency_id', ctx.agencyId);
        }

        const { error: updateError } = await updateQuery;

        if (updateError) {
          failedCount++;
          errors.push(`Failed to update task ${taskId}: ${updateError.message}`);
          continue;
        }

        // Insert a customer_interactions record
        // Use the task's completed_at or updated_at as the interaction timestamp
        const interactionTimestamp = task.completed_at || task.updated_at || new Date().toISOString();

        const { error: interactionError } = await supabase
          .from('customer_interactions')
          .insert({
            agency_id: customer.agency_id,
            customer_id: customerId,
            interaction_type: 'task_completed',
            summary: `Completed: ${task.text}`,
            details: {
              retroactive_link: true,
              task_id: taskId,
              linked_by: ctx.userName,
              linked_at: new Date().toISOString(),
            },
            created_by: ctx.userId,
            created_at: interactionTimestamp,
          });

        if (interactionError) {
          // Log the error but still count the task update as a success
          // since the main link was established
          console.error(`Failed to create interaction for task ${taskId}:`, interactionError);
        }

        successCount++;
      } catch (err) {
        failedCount++;
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Error processing match: ${message}`);
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors,
    });
  } catch (error) {
    console.error('Error in apply retroactive links endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
