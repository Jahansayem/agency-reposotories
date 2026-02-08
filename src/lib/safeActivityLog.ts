/**
 * Safe Activity Logging for Server-Side API Routes
 *
 * CRITICAL: Activity logging is a business requirement BUT must NEVER break operations.
 * This module provides a fail-safe wrapper that:
 * - Catches all errors from activity_log inserts
 * - Logs failures separately for monitoring
 * - Returns gracefully without throwing
 * - Includes retry logic with exponential backoff
 *
 * Usage in API routes:
 * ```typescript
 * import { safeLogActivity } from '@/lib/safeActivityLog';
 *
 * // Instead of:
 * // await supabase.from('activity_log').insert({...});
 *
 * // Use:
 * await safeLogActivity(supabase, {
 *   action: 'task_created',
 *   todo_id: taskId,
 *   todo_text: text,
 *   user_name: userName,
 *   agency_id: agencyId,
 *   details: { priority: 'high' }
 * });
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { ActivityAction } from '@/types/todo';

export interface SafeActivityLogParams {
  action: ActivityAction;
  user_name: string;
  todo_id?: string | null;
  todo_text?: string | null;
  agency_id?: string | null;
  details?: Record<string, unknown>;
}

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 100;

/**
 * Safely log an activity to the database with automatic retry
 *
 * CRITICAL: This function NEVER throws - it always returns gracefully
 * even if all retries fail. Activity logging failures are logged
 * separately for monitoring but do not break the main operation.
 *
 * @param supabase - Supabase client instance
 * @param params - Activity log parameters
 * @returns Promise<void> - Always resolves, never rejects
 */
export async function safeLogActivity(
  supabase: SupabaseClient,
  params: SafeActivityLogParams
): Promise<void> {
  const { action, user_name, todo_id, todo_text, agency_id, details } = params;

  // Validate required fields
  if (!action || !user_name) {
    logger.warn('safeLogActivity: Missing required fields', {
      component: 'safeActivityLog',
      hasAction: !!action,
      hasUserName: !!user_name,
    });
    return; // Return gracefully instead of throwing
  }

  let lastError: unknown = null;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      // Attempt to insert activity log
      const { error } = await supabase
        .from('activity_log')
        .insert({
          action,
          todo_id: todo_id || null,
          todo_text: todo_text ? todo_text.substring(0, 100) : null, // Truncate to 100 chars
          user_name,
          details: details || {},
          ...(agency_id ? { agency_id } : {}),
        });

      if (error) {
        throw error;
      }

      // Success - log if it took multiple attempts
      if (attempt > 0) {
        logger.info(`Activity log succeeded on attempt ${attempt + 1}`, {
          component: 'safeActivityLog',
          action,
          attempts: attempt + 1,
        });
      }

      return; // Success - exit function

    } catch (error) {
      lastError = error;
      attempt++;

      // If we have retries left, wait and try again
      if (attempt <= MAX_RETRIES) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs));
        logger.warn(`Activity log failed, retrying (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, {
          component: 'safeActivityLog',
          action,
          attempt: attempt + 1,
          retryDelayMs: delayMs,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // All retries failed - log the final error but DO NOT throw
  logger.error(
    `Activity log failed after ${MAX_RETRIES + 1} attempts - operation continued`,
    lastError,
    {
      component: 'safeActivityLog',
      action,
      user_name,
      todo_id,
      todo_text: todo_text?.substring(0, 50),
      agency_id,
      totalAttempts: MAX_RETRIES + 1,
      // Flag this as a critical monitoring event
      severity: 'high',
      alerting: 'activity_log_failure',
    }
  );

  // CRITICAL: Return gracefully - do NOT throw
  // Activity logging failures must not break the main operation
}

/**
 * Batch log multiple activities safely
 *
 * Useful for operations that generate multiple activity entries
 * (e.g., bulk operations, merging tasks, etc.)
 *
 * @param supabase - Supabase client instance
 * @param activities - Array of activity log parameters
 * @returns Promise<void> - Always resolves
 */
export async function safeLogActivityBatch(
  supabase: SupabaseClient,
  activities: SafeActivityLogParams[]
): Promise<void> {
  // Log each activity independently - if one fails, others continue
  await Promise.allSettled(
    activities.map(activity => safeLogActivity(supabase, activity))
  );
}

/**
 * Legacy compatibility wrapper for direct Supabase insert calls
 *
 * Use this to quickly migrate existing code:
 *
 * Before:
 * ```
 * await supabase.from('activity_log').insert({...});
 * ```
 *
 * After:
 * ```
 * await wrapActivityLogInsert(
 *   supabase.from('activity_log').insert({...})
 * );
 * ```
 *
 * However, prefer using safeLogActivity() for new code as it provides
 * better type safety and parameter validation.
 */
export async function wrapActivityLogInsert(
  insertPromise: Promise<{ data: unknown; error: unknown }>
): Promise<void> {
  try {
    const { error } = await insertPromise;
    if (error) throw error;
  } catch (error) {
    // Log but don't throw
    logger.error('Activity log insert failed (wrapped)', error, {
      component: 'safeActivityLog',
      method: 'wrapActivityLogInsert',
    });
  }
}
