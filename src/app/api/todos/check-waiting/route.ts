import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withSystemAuth } from '@/lib/agencyAuth';
import { safeLogActivity } from '@/lib/safeActivityLog';

/**
 * GET /api/todos/check-waiting
 * Cron endpoint to check for overdue follow-ups and log activity.
 * Authenticated via CRON_SECRET bearer token.
 * Processes all agencies (system-level route).
 */
export const GET = withSystemAuth(async (_request: NextRequest) => {
  // Initialize inside handler to avoid build-time errors
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get all tasks that are waiting for response (across all agencies)
    const baseTodosQuery = <TSelect extends string>(select: TSelect) =>
      supabase
        .from('todos')
        .select(select)
        .eq('waiting_for_response', true)
        .eq('completed', false);

    // Backward/forward compatibility: some deployments may not have multi-tenancy columns.
    // Try selecting agency_id first; if it doesn't exist, retry without it.
    type WaitingTask = {
      id: string;
      text: string;
      waiting_since: string | null;
      follow_up_after_hours: number | null;
      assigned_to: string | null;
      created_by: string;
      agency_id?: string | null;
    };

    let waitingTasks: WaitingTask[] | null = null;
    let fetchError: { message?: string } | null = null;

    const withAgency = await baseTodosQuery(
      'id, text, waiting_since, follow_up_after_hours, assigned_to, created_by, agency_id'
    );

    if (!withAgency.error) {
      waitingTasks = (withAgency.data as unknown as WaitingTask[]) || [];
    } else if (
      withAgency.error.message?.toLowerCase().includes('agency_id') ||
      withAgency.error.message?.toLowerCase().includes('column')
    ) {
      const withoutAgency = await baseTodosQuery(
        'id, text, waiting_since, follow_up_after_hours, assigned_to, created_by'
      );
      fetchError = (withoutAgency.error as any) || null;
      waitingTasks = (withoutAgency.data as unknown as WaitingTask[]) || [];
    } else {
      fetchError = withAgency.error as any;
    }

    if (fetchError) throw fetchError;

    if (!waitingTasks || waitingTasks.length === 0) {
      return NextResponse.json({
        message: 'No waiting tasks found',
        checked: 0,
        overdue: 0
      });
    }

    const now = new Date();
    const overdueTaskIds: string[] = [];
    const activityEntries: Array<{
      action: string;
      todo_id: string;
      todo_text: string;
      user_name: string;
      agency_id?: string | null;
      details: Record<string, unknown>;
    }> = [];

    for (const task of waitingTasks) {
      if (!task.waiting_since) continue;

      const waitingSince = new Date(task.waiting_since);
      if (isNaN(waitingSince.getTime())) {
        logger.warn('Invalid waiting_since date', {
          component: 'check-waiting',
          todoId: task.id,
          waitingSince: task.waiting_since
        });
        continue;
      }

      const hoursWaiting = (now.getTime() - waitingSince.getTime()) / (1000 * 60 * 60);
      const threshold = task.follow_up_after_hours || 48;

      if (hoursWaiting >= threshold) {
        overdueTaskIds.push(task.id);

        // Create activity log entry for overdue follow-up, including agency_id
        activityEntries.push({
          action: 'follow_up_overdue',
          todo_id: task.id,
          todo_text: task.text,
          user_name: 'System',
          ...(('agency_id' in task && task.agency_id) ? { agency_id: task.agency_id } : {}),
          details: {
            hours_waiting: Math.round(hoursWaiting),
            threshold_hours: threshold,
            assigned_to: task.assigned_to || task.created_by
          }
        });
      }
    }

    // Check if we've already logged these today to avoid spam
    if (activityEntries.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check for existing follow_up_overdue entries today for these tasks
      const { data: existingEntries } = await supabase
        .from('activity_log')
        .select('todo_id')
        .eq('action', 'follow_up_overdue')
        .in('todo_id', overdueTaskIds)
        .gte('created_at', today.toISOString());

      const alreadyLoggedIds = new Set(existingEntries?.map(e => e.todo_id) || []);

      // Filter out already logged tasks
      const newEntries = activityEntries.filter(
        entry => !alreadyLoggedIds.has(entry.todo_id)
      );

      if (newEntries.length > 0) {
        // Similar compatibility handling for activity_log agency_id column.
        const insertResult = await supabase
          .from('activity_log')
          .insert(newEntries);

        let { error: logError } = insertResult;
        if (
          logError &&
          (logError.message?.toLowerCase().includes('agency_id') ||
            logError.message?.toLowerCase().includes('column'))
        ) {
          const strippedEntries = newEntries.map(({ agency_id: _aid, ...rest }) => rest);
          const retry = await supabase.from('activity_log').insert(strippedEntries);
          logError = retry.error;
        }

        if (logError) {
          logger.error('Error logging overdue activities', logError, {
            component: 'check-waiting',
            action: 'POST',
            attemptedEntries: newEntries.length
          });

          return NextResponse.json({
            message: 'Check completed with errors',
            checked: waitingTasks.length,
            overdue: overdueTaskIds.length,
            newNotifications: 0,
            error: 'Failed to create activity log entries'
          }, { status: 207 });  // 207 Multi-Status for partial success
        }
      }

      return NextResponse.json({
        message: 'Check complete',
        checked: waitingTasks.length,
        overdue: overdueTaskIds.length,
        newNotifications: newEntries.length
      });
    }

    return NextResponse.json({
      message: 'Check complete',
      checked: waitingTasks.length,
      overdue: 0,
      newNotifications: 0
    });

  } catch (error) {
    logger.error('Error checking waiting tasks', error, { component: 'check-waiting' });
    return NextResponse.json(
      { error: 'Failed to check waiting tasks' },
      { status: 500 }
    );
  }
});
