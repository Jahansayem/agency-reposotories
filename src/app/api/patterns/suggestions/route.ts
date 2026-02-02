import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withAgencyAuth, setAgencyContext, type AgencyAuthContext } from '@/lib/agencyAuth';

/**
 * GET /api/patterns/suggestions
 *
 * Returns task patterns grouped by category for quick task buttons.
 * Scoped to the user's agency.
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Return empty patterns if not configured
      return NextResponse.json({
        patterns: {},
        total: 0,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('task_patterns')
      .select('*')
      .order('occurrence_count', { ascending: false })
      .limit(20);

    // Scope to agency
    if (ctx.agencyId) {
      query = query.eq('agency_id', ctx.agencyId);
    }

    const { data: patterns, error } = await query;

    if (error) {
      logger.error('Failed to fetch patterns', error, { component: 'patterns/suggestions' });
      return NextResponse.json({
        patterns: {},
        total: 0,
      });
    }

    // Group patterns by category
    const grouped = (patterns || []).reduce(
      (acc: Record<string, typeof patterns>, pattern) => {
        const category = pattern.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(pattern);
        return acc;
      },
      {}
    );

    return NextResponse.json({
      patterns: grouped,
      total: patterns?.length || 0,
    });
  } catch (error) {
    logger.error('Pattern suggestions error', error, { component: 'patterns/suggestions' });
    return NextResponse.json({
      patterns: {},
      total: 0,
    });
  }
});
