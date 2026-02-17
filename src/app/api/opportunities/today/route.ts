/**
 * Today's Opportunities API
 *
 * GET /api/opportunities/today
 * Returns today's prioritized work queue of cross-sell opportunities
 *
 * Filters:
 * - Priority tier: HOT or HIGH only
 * - Renewal window: Within next 30 days
 * - Sorted by priority_score descending
 *
 * Query parameters:
 * - limit: Number of records to return (default: 20)
 * - offset: Pagination offset (default: 0)
 * - agency_id: Optional agency filter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import type {
  CrossSellOpportunity,
  CrossSellPriorityTier,
} from '@/types/allstate-analytics';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Response type for today's opportunities endpoint
 */
interface TodayOpportunitiesResponse {
  opportunities: CrossSellOpportunity[];
  total: number;
  limit: number;
  offset: number;
  filters_applied: {
    priority_tiers: CrossSellPriorityTier[];
    renewal_window_days: number;
  };
  meta: {
    todayCount: number;
    urgentCount: number;
    upcomingCount: number;
  };
}

/**
 * GET /api/opportunities/today
 * Fetch today's prioritized work queue of cross-sell opportunities
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters - use ctx.agencyId from auth context instead of query param
    const agencyId = ctx.agencyId;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Fixed filter values for "today's" work queue
    const priorityTiers: CrossSellPriorityTier[] = ['HOT', 'HIGH'];
    const renewalWindowDays = 30;

    // Build main query — select only the columns the component renders plus
    // the required CrossSellOpportunity type fields needed for TypeScript compatibility.
    let query = supabase
      .from('cross_sell_opportunities')
      .select(
        'id, agency_id, created_at, updated_at, customer_name, phone, email, address, city, zip_code, current_products, recommended_product, segment, segment_type, priority_tier, priority_rank, priority_score, current_premium, potential_premium_add, expected_conversion_pct, retention_lift_pct, talking_point_1, talking_point_2, talking_point_3, tenure_years, policy_count, ezpay_status, balance_due, renewal_date, days_until_renewal, renewal_status, task_id',
        { count: 'exact' }
      );

    // Apply agency filter from auth context
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    // Filter by priority tier (HOT or HIGH)
    query = query.in('priority_tier', priorityTiers);

    // Filter by renewal window (within next 30 days)
    query = query.lte('days_until_renewal', renewalWindowDays);

    // Exclude dismissed opportunities
    query = query.eq('dismissed', false);

    // Exclude already contacted opportunities (optional - focus on fresh leads)
    // Uncomment if you only want uncontacted opportunities:
    // query = query.is('contacted_at', null);

    // Sort by priority_score descending (highest priority first)
    query = query.order('priority_score', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Build meta counts query — runs in parallel with main query
    // Fetches days_until_renewal for all non-dismissed HOT/HIGH opportunities
    // so we can compute todayCount / urgentCount / upcomingCount on the full set.
    let metaQuery = supabase
      .from('cross_sell_opportunities')
      .select('priority_tier, days_until_renewal', { count: 'exact', head: false })
      .in('priority_tier', priorityTiers)
      .eq('dismissed', false);

    if (agencyId) {
      metaQuery = metaQuery.eq('agency_id', agencyId);
    }

    // Fire both independent queries in parallel
    const [mainResult, metaResult] = await Promise.all([query, metaQuery]);

    const { data, error, count } = mainResult;

    if (error) {
      console.error('Failed to fetch today\'s opportunities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
        { status: 500 }
      );
    }

    // Compute meta counts from the parallel meta query results
    const metaRows = metaResult.data || [];
    const todayCount = metaRows.filter(r => (r.days_until_renewal ?? Infinity) <= 1).length;
    const urgentCount = metaRows.filter(r => (r.days_until_renewal ?? Infinity) <= 7).length;
    const upcomingCount = metaRows.filter(r => (r.days_until_renewal ?? Infinity) <= 30).length;

    // Enrich opportunities with customer_insight_id by matching customer_name
    let enrichedOpportunities = data || [];
    if (enrichedOpportunities.length > 0) {
      const customerNames = [...new Set(enrichedOpportunities.map(o => o.customer_name))];
      let insightQuery = supabase
        .from('customer_insights')
        .select('id, customer_name')
        .in('customer_name', customerNames);
      if (agencyId) {
        insightQuery = insightQuery.eq('agency_id', agencyId);
      }
      const { data: insights } = await insightQuery;
      const nameToInsightId = new Map<string, string>();
      if (insights) {
        for (const insight of insights) {
          nameToInsightId.set(insight.customer_name, insight.id);
        }
      }
      enrichedOpportunities = enrichedOpportunities.map(opp => ({
        ...opp,
        customer_insight_id: nameToInsightId.get(opp.customer_name) || null,
      }));
    }

    const response: TodayOpportunitiesResponse = {
      opportunities: enrichedOpportunities,
      total: count || 0,
      limit,
      offset,
      filters_applied: {
        priority_tiers: priorityTiers,
        renewal_window_days: renewalWindowDays,
      },
      meta: {
        todayCount,
        urgentCount,
        upcomingCount,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching today\'s opportunities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
