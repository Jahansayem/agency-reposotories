/**
 * Process Reminders API
 *
 * Endpoint to process and send due reminders across ALL agencies.
 * Called by a cron job or external scheduler.
 *
 * Protected by system authentication (CRON_SECRET or API key).
 * This is a system route - no agency context (processes all agencies).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processAllDueReminders } from '@/lib/reminderService';
import { logger } from '@/lib/logger';
import { withSystemAuth } from '@/lib/agencyAuth';

/**
 * POST /api/reminders/process
 *
 * Process all due reminders and send notifications.
 * Requires system-level auth (CRON_SECRET or X-API-Key).
 * Processes reminders across all agencies.
 */
export const POST = withSystemAuth(async (_request: NextRequest) => {
  try {
    // Process reminders through the standard flow (which already sends push notifications)
    // Note: processAllDueReminders processes across all agencies.
    // Reminders are linked to todos which have agency_id for context.
    const result = await processAllDueReminders();

    // Handle error from getDueReminders (propagated through processAllDueReminders)
    if (result.error) {
      logger.error('Failed to fetch due reminders', null, {
        component: 'reminders/process',
        action: 'POST',
        error: result.error
      });
      return NextResponse.json({
        success: false,
        error: result.error,
        processed: result.processed,
        successful: result.successful,
        failed: result.failed
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error processing reminders', error, { component: 'reminders/process' });
    return NextResponse.json(
      { success: false, error: 'Failed to process reminders' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/reminders/process
 *
 * Health check endpoint for the reminder processor.
 * Returns the count of pending reminders across all agencies.
 * Requires system-level auth (CRON_SECRET or X-API-Key).
 */
export const GET = withSystemAuth(async (_request: NextRequest) => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Count pending reminders across all agencies
    const { count: pendingCount } = await supabase
      .from('task_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Count reminders due in next 5 minutes across all agencies
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { count: dueCount } = await supabase
      .from('task_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('reminder_time', fiveMinutesFromNow);

    return NextResponse.json({
      success: true,
      status: 'healthy',
      pendingReminders: pendingCount || 0,
      remindersDueSoon: dueCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error checking reminder status', error, { component: 'reminders/process' });
    return NextResponse.json(
      { success: false, error: 'Failed to check reminder status' },
      { status: 500 }
    );
  }
});
