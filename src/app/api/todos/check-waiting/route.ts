import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withSystemAuth } from '@/lib/agencyAuth';

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
    const { data: waitingTasks, error: fetchError } = await supabase
      .from('todos')
      .select('id, text, waiting_since, follow_up_after_hours, assigned_to, created_by, agency_id')
      .eq('waiting_for_response', true)
      .eq('completed', false);

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
      agency_id: string | null;
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
          agency_id: task.agency_id || null,
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
        const { error: logError } = await supabase
          .from('activity_log')
          .insert(newEntries);

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
