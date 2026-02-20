/**
 * AI Agent Token Usage Tracking
 *
 * Tracks token consumption per agency with budget enforcement.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Monthly token budget per agency
const MONTHLY_TOKEN_BUDGET = 1_000_000; // 1M tokens/month
const WARNING_THRESHOLD = 0.8; // Warn at 80%
const BLOCK_THRESHOLD = 1.0; // Block at 100%

export interface TokenUsage {
  agencyId: string;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  timestamp: string;
}

export interface BudgetStatus {
  remaining: number;
  used: number;
  budget: number;
  percentUsed: number;
  isWarning: boolean;
  isBlocked: boolean;
}

/**
 * Track token usage for an AI agent request
 */
export async function trackTokenUsage(
  agencyId: string,
  userId: string,
  inputTokens: number,
  outputTokens: number,
  model: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const totalTokens = inputTokens + outputTokens;

    await supabase.from('agent_usage').insert({
      agency_id: agencyId,
      user_id: userId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      model,
      created_at: new Date().toISOString(),
    });

    logger.info('Token usage tracked', {
      component: 'ai-agent',
      agencyId,
      userId,
      inputTokens,
      outputTokens,
      totalTokens,
      model,
    });
  } catch (error) {
    logger.error('Failed to track token usage', error as Error, {
      component: 'ai-agent',
      agencyId,
      userId,
    });
    // Don't throw - tracking failure shouldn't block the response
  }
}

/**
 * Check token budget for an agency
 *
 * Returns budget status with warnings/blocks
 */
export async function checkTokenBudget(agencyId: string): Promise<BudgetStatus> {
  try {
    const supabase = getSupabaseClient();

    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('agent_usage')
      .select('total_tokens')
      .eq('agency_id', agencyId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) throw error;

    const used = (data || []).reduce((sum, row) => sum + (row.total_tokens || 0), 0);
    const remaining = Math.max(0, MONTHLY_TOKEN_BUDGET - used);
    const percentUsed = used / MONTHLY_TOKEN_BUDGET;

    const status: BudgetStatus = {
      remaining,
      used,
      budget: MONTHLY_TOKEN_BUDGET,
      percentUsed,
      isWarning: percentUsed >= WARNING_THRESHOLD,
      isBlocked: percentUsed >= BLOCK_THRESHOLD,
    };

    if (status.isBlocked) {
      logger.warn('Token budget exceeded', {
        component: 'ai-agent',
        agencyId,
        used,
        budget: MONTHLY_TOKEN_BUDGET,
      });
    } else if (status.isWarning) {
      logger.warn('Token budget warning', {
        component: 'ai-agent',
        agencyId,
        used,
        budget: MONTHLY_TOKEN_BUDGET,
        percentUsed,
      });
    }

    return status;
  } catch (error) {
    logger.error('Failed to check token budget', error as Error, {
      component: 'ai-agent',
      agencyId,
    });

    // On error, allow the request but log the issue
    return {
      remaining: MONTHLY_TOKEN_BUDGET,
      used: 0,
      budget: MONTHLY_TOKEN_BUDGET,
      percentUsed: 0,
      isWarning: false,
      isBlocked: false,
    };
  }
}

/**
 * Get usage statistics for an agency (for dashboard display)
 */
export async function getUsageStats(agencyId: string): Promise<{
  today: number;
  thisWeek: number;
  thisMonth: number;
  budget: BudgetStatus;
}> {
  const supabase = getSupabaseClient();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [todayResult, weekResult, monthResult] = await Promise.all([
    supabase
      .from('agent_usage')
      .select('total_tokens')
      .eq('agency_id', agencyId)
      .gte('created_at', startOfDay.toISOString()),
    supabase
      .from('agent_usage')
      .select('total_tokens')
      .eq('agency_id', agencyId)
      .gte('created_at', startOfWeek.toISOString()),
    supabase
      .from('agent_usage')
      .select('total_tokens')
      .eq('agency_id', agencyId)
      .gte('created_at', startOfMonth.toISOString()),
  ]);

  const today = (todayResult.data || []).reduce((sum, row) => sum + (row.total_tokens || 0), 0);
  const thisWeek = (weekResult.data || []).reduce((sum, row) => sum + (row.total_tokens || 0), 0);
  const thisMonth = (monthResult.data || []).reduce((sum, row) => sum + (row.total_tokens || 0), 0);

  const budget = await checkTokenBudget(agencyId);

  return { today, thisWeek, thisMonth, budget };
}
