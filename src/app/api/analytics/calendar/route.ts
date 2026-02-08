/**
 * Renewal Calendar API
 *
 * GET /api/analytics/calendar - Get renewal calendar entries for a date range
 * POST /api/analytics/calendar/sync - Sync calendar from cross-sell opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { RenewalCalendarEntry, CrossSellOpportunity } from '@/types/allstate-analytics';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/analytics/calendar
 * Get renewal calendar entries for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agency_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const includeCrossSell = searchParams.get('include_cross_sell') !== 'false';
    const onlyUncontacted = searchParams.get('only_uncontacted') === 'true';

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const start = startDate || defaultStart.toISOString().split('T')[0];
    const end = endDate || defaultEnd.toISOString().split('T')[0];

    // Try to get from renewal_calendar table first
    let query = supabase
      .from('renewal_calendar')
      .select('*')
      .gte('renewal_date', start)
      .lte('renewal_date', end)
      .order('renewal_date', { ascending: true });

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    if (onlyUncontacted) {
      query = query.eq('contacted', false);
    }

    const { data: calendarData, error: calendarError } = await query;

    // If calendar table is empty or has error, fall back to cross_sell_opportunities
    if ((!calendarData || calendarData.length === 0) && includeCrossSell) {
      // Get from cross_sell_opportunities as fallback
      let oppQuery = supabase
        .from('cross_sell_opportunities')
        .select('*')
        .eq('dismissed', false)
        .not('renewal_date', 'is', null)
        .gte('renewal_date', start)
        .lte('renewal_date', end)
        .order('renewal_date', { ascending: true });

      if (agencyId) {
        oppQuery = oppQuery.eq('agency_id', agencyId);
      }

      if (onlyUncontacted) {
        oppQuery = oppQuery.is('contacted_at', null);
      }

      const { data: opportunities, error: oppError } = await oppQuery;

      if (oppError) {
        console.error('Failed to fetch opportunities for calendar:', oppError);
        return NextResponse.json(
          { error: 'Failed to fetch calendar data' },
          { status: 500 }
        );
      }

      // Transform opportunities to calendar format
      const calendarEntries: RenewalCalendarEntry[] = (opportunities || []).map((opp: CrossSellOpportunity) => ({
        id: opp.id,
        agency_id: opp.agency_id,
        customer_name: opp.customer_name,
        phone: opp.phone,
        email: opp.email,
        renewal_date: opp.renewal_date!,
        policy_type: opp.current_products,
        current_premium: opp.current_premium,
        cross_sell_opportunity_id: opp.id,
        has_cross_sell_opportunity: true,
        cross_sell_priority: opp.priority_tier,
        recommended_product: opp.recommended_product,
        contacted: !!opp.contacted_at,
        contact_date: opp.contacted_at,
        renewal_confirmed: opp.renewal_status === 'Renewed',
        created_at: opp.created_at,
        updated_at: opp.updated_at,
      }));

      // Group by date for summary
      const byDate: Record<string, RenewalCalendarEntry[]> = {};
      for (const entry of calendarEntries) {
        const date = entry.renewal_date;
        if (!byDate[date]) {
          byDate[date] = [];
        }
        byDate[date].push(entry);
      }

      // Calculate summary stats
      const summary = {
        total_renewals: calendarEntries.length,
        total_premium: calendarEntries.reduce((sum, e) => sum + (e.current_premium || 0), 0),
        with_cross_sell: calendarEntries.filter(e => e.has_cross_sell_opportunity).length,
        hot_opportunities: calendarEntries.filter(e => e.cross_sell_priority === 'HOT').length,
        high_opportunities: calendarEntries.filter(e => e.cross_sell_priority === 'HIGH').length,
        contacted: calendarEntries.filter(e => e.contacted).length,
        uncontacted: calendarEntries.filter(e => !e.contacted).length,
      };

      return NextResponse.json({
        entries: calendarEntries,
        by_date: byDate,
        summary,
        date_range: { start, end },
        source: 'cross_sell_opportunities', // Indicates data came from opportunities table
      });
    }

    // Return calendar table data
    const entries = calendarData || [];

    // Group by date
    const byDate: Record<string, RenewalCalendarEntry[]> = {};
    for (const entry of entries) {
      const date = entry.renewal_date;
      if (!byDate[date]) {
        byDate[date] = [];
      }
      byDate[date].push(entry);
    }

    // Calculate summary
    const summary = {
      total_renewals: entries.length,
      total_premium: entries.reduce((sum, e) => sum + (e.current_premium || 0), 0),
      with_cross_sell: entries.filter(e => e.has_cross_sell_opportunity).length,
      hot_opportunities: entries.filter(e => e.cross_sell_priority === 'HOT').length,
      high_opportunities: entries.filter(e => e.cross_sell_priority === 'HIGH').length,
      contacted: entries.filter(e => e.contacted).length,
      uncontacted: entries.filter(e => !e.contacted).length,
    };

    return NextResponse.json({
      entries,
      by_date: byDate,
      summary,
      date_range: { start, end },
      source: 'renewal_calendar',
    });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/calendar
 * Create or update a calendar entry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    if (!body.customer_name || !body.renewal_date) {
      return NextResponse.json(
        { error: 'customer_name and renewal_date are required' },
        { status: 400 }
      );
    }

    const entry: Partial<RenewalCalendarEntry> = {
      agency_id: body.agency_id,
      customer_name: body.customer_name,
      phone: body.phone,
      email: body.email,
      renewal_date: body.renewal_date,
      policy_type: body.policy_type,
      current_premium: body.current_premium || 0,
      cross_sell_opportunity_id: body.cross_sell_opportunity_id,
      has_cross_sell_opportunity: !!body.cross_sell_opportunity_id,
      cross_sell_priority: body.cross_sell_priority,
      recommended_product: body.recommended_product,
      contacted: body.contacted || false,
      contact_date: body.contact_date,
      renewal_confirmed: body.renewal_confirmed || false,
    };

    const { data, error } = await supabase
      .from('renewal_calendar')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('Failed to create calendar entry:', error);
      return NextResponse.json(
        { error: 'Failed to create calendar entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      entry: data,
    });
  } catch (error) {
    console.error('Error creating calendar entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/analytics/calendar
 * Update a calendar entry (mark contacted, confirm renewal)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
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
      updates.contacted = true;
      updates.contact_date = new Date().toISOString();
      delete updates.mark_contacted;
    }

    if (updates.mark_renewed) {
      updates.renewal_confirmed = true;
      delete updates.mark_renewed;
    }

    const { data, error } = await supabase
      .from('renewal_calendar')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update calendar entry:', error);
      return NextResponse.json(
        { error: 'Failed to update calendar entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      entry: data,
    });
  } catch (error) {
    console.error('Error updating calendar entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
