/**
 * Cross-Sell Opportunities API
 *
 * GET /api/analytics/cross-sell - List opportunities with filters
 * POST /api/analytics/cross-sell - Create new opportunity (manual entry)
 * PATCH /api/analytics/cross-sell - Update opportunity (contact tracking)
 * DELETE /api/analytics/cross-sell - Dismiss opportunity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  CrossSellOpportunity,
  CrossSellPriorityTier,
  CrossSellQueryParams,
  CrossSellListResponse,
} from '@/types/allstate-analytics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/analytics/cross-sell
 * List cross-sell opportunities with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const agencyId = searchParams.get('agency_id');
    const tier = searchParams.get('tier')?.split(',') as CrossSellPriorityTier[] | undefined;
    const segment = searchParams.get('segment')?.split(',');
    const daysUntilRenewalMax = parseInt(searchParams.get('days_until_renewal_max') || '', 10);
    const minPriorityScore = parseInt(searchParams.get('min_priority_score') || '', 10);
    const contacted = searchParams.get('contacted');
    const converted = searchParams.get('converted');
    const dismissed = searchParams.get('dismissed');
    const assignedTo = searchParams.get('assigned_to');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'priority_rank';
    const sortOrder = (searchParams.get('sort_order') || 'asc') as 'asc' | 'desc';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('cross_sell_opportunities')
      .select('*', { count: 'exact' });

    // Apply filters
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    if (tier && tier.length > 0) {
      query = query.in('priority_tier', tier);
    }

    if (segment && segment.length > 0) {
      query = query.in('segment_type', segment);
    }

    if (!isNaN(daysUntilRenewalMax) && daysUntilRenewalMax > 0) {
      query = query.lte('days_until_renewal', daysUntilRenewalMax);
    }

    if (!isNaN(minPriorityScore) && minPriorityScore > 0) {
      query = query.gte('priority_score', minPriorityScore);
    }

    if (contacted === 'true') {
      query = query.not('contacted_at', 'is', null);
    } else if (contacted === 'false') {
      query = query.is('contacted_at', null);
    }

    if (converted === 'true') {
      query = query.not('converted_at', 'is', null);
    } else if (converted === 'false') {
      query = query.is('converted_at', null);
    }

    if (dismissed === 'true') {
      query = query.eq('dismissed', true);
    } else if (dismissed !== 'all') {
      // Default: exclude dismissed
      query = query.eq('dismissed', false);
    }

    if (assignedTo) {
      query = query.eq('contacted_by', assignedTo);
    }

    if (search) {
      query = query.ilike('customer_name', `%${search}%`);
    }

    // Apply sorting
    const sortColumn = {
      priority_rank: 'priority_rank',
      renewal_date: 'renewal_date',
      potential_premium: 'potential_premium_add',
      customer_name: 'customer_name',
    }[sortBy] || 'priority_rank';

    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch cross-sell opportunities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
        { status: 500 }
      );
    }

    // Get summary counts
    const { data: summaryData } = await supabase
      .from('cross_sell_opportunities')
      .select('priority_tier, potential_premium_add')
      .eq('dismissed', false)
      .eq('agency_id', agencyId || '');

    const summary = {
      hot_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      total_potential_premium: 0,
    };

    if (summaryData) {
      for (const row of summaryData) {
        summary.total_potential_premium += row.potential_premium_add || 0;
        switch (row.priority_tier) {
          case 'HOT': summary.hot_count++; break;
          case 'HIGH': summary.high_count++; break;
          case 'MEDIUM': summary.medium_count++; break;
          case 'LOW': summary.low_count++; break;
        }
      }
    }

    const response: CrossSellListResponse = {
      opportunities: data || [],
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      page_size: limit,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching cross-sell opportunities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/cross-sell
 * Create a new opportunity manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.customer_name) {
      return NextResponse.json(
        { error: 'customer_name is required' },
        { status: 400 }
      );
    }

    // Set defaults
    const opportunity: Partial<CrossSellOpportunity> = {
      agency_id: body.agency_id,
      customer_name: body.customer_name,
      phone: body.phone || '',
      email: body.email || '',
      address: body.address || '',
      city: body.city || '',
      zip_code: body.zip_code || '',
      renewal_date: body.renewal_date,
      current_products: body.current_products || 'Unknown',
      recommended_product: body.recommended_product || 'Additional Coverage',
      segment: body.segment || '',
      segment_type: body.segment_type || 'other',
      current_premium: body.current_premium || 0,
      potential_premium_add: body.potential_premium_add || 0,
      priority_rank: body.priority_rank || 9999,
      priority_tier: body.priority_tier || 'MEDIUM',
      priority_score: body.priority_score || 50,
      expected_conversion_pct: body.expected_conversion_pct || 15,
      retention_lift_pct: body.retention_lift_pct || 10,
      talking_point_1: body.talking_point_1 || '',
      talking_point_2: body.talking_point_2 || '',
      talking_point_3: body.talking_point_3 || '',
      balance_due: body.balance_due || 0,
      ezpay_status: body.ezpay_status || 'No',
      tenure_years: body.tenure_years || 0,
      policy_count: body.policy_count || 1,
      renewal_status: body.renewal_status || 'Not Taken',
    };

    const { data, error } = await supabase
      .from('cross_sell_opportunities')
      .insert(opportunity)
      .select()
      .single();

    if (error) {
      console.error('Failed to create opportunity:', error);
      return NextResponse.json(
        { error: 'Failed to create opportunity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      opportunity: data,
    });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/analytics/cross-sell
 * Update an opportunity (contact tracking, notes, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Handle special update types
    if (updates.mark_contacted) {
      updates.contacted_at = new Date().toISOString();
      delete updates.mark_contacted;
    }

    if (updates.mark_converted && updates.converted_premium) {
      updates.converted_at = new Date().toISOString();
      delete updates.mark_converted;
    }

    if (updates.dismiss) {
      updates.dismissed = true;
      delete updates.dismiss;
    }

    const { data, error } = await supabase
      .from('cross_sell_opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update opportunity:', error);
      return NextResponse.json(
        { error: 'Failed to update opportunity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      opportunity: data,
    });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/analytics/cross-sell
 * Dismiss an opportunity (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const reason = searchParams.get('reason');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('cross_sell_opportunities')
      .update({
        dismissed: true,
        dismissed_reason: reason || 'Manually dismissed',
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to dismiss opportunity:', error);
      return NextResponse.json(
        { error: 'Failed to dismiss opportunity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Opportunity dismissed',
    });
  } catch (error) {
    console.error('Error dismissing opportunity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
