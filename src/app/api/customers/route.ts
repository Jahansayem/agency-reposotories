/**
 * Customers API
 *
 * GET /api/customers - Search/list customers from book of business
 *
 * Query params:
 * - q: Search query (name, phone, email)
 * - agency_id: Filter by agency
 * - segment: Filter by segment tier (elite, premium, standard, entry)
 * - limit: Max results (default 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Segment tier thresholds based on total premium
function getSegmentTier(totalPremium: number, policyCount: number): string {
  if (totalPremium >= 15000 || policyCount >= 4) return 'elite';
  if (totalPremium >= 7000 || policyCount >= 3) return 'premium';
  if (totalPremium >= 3000 || policyCount >= 2) return 'standard';
  return 'entry';
}

// Segment colors and labels
const SEGMENT_CONFIG = {
  elite: { label: 'Elite', color: '#C9A227', avgLtv: 18000 },
  premium: { label: 'Premium', color: '#9333EA', avgLtv: 9000 },
  standard: { label: 'Standard', color: '#3B82F6', avgLtv: 4500 },
  entry: { label: 'Entry', color: '#0EA5E9', avgLtv: 1800 },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const agencyId = searchParams.get('agency_id');
    const segmentFilter = searchParams.get('segment');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    // First, try customer_insights table
    let insightsQuery = supabase
      .from('customer_insights')
      .select('*')
      .order('total_premium', { ascending: false })
      .limit(limit);

    if (agencyId) {
      insightsQuery = insightsQuery.eq('agency_id', agencyId);
    }

    if (query) {
      // Search by name, phone, or email
      insightsQuery = insightsQuery.or(
        `customer_name.ilike.%${query}%,customer_email.ilike.%${query}%,customer_phone.ilike.%${query}%`
      );
    }

    const { data: insights, error: insightsError } = await insightsQuery;

    // Also search cross_sell_opportunities for customers not in insights
    let opportunitiesQuery = supabase
      .from('cross_sell_opportunities')
      .select('*')
      .eq('dismissed', false)
      .order('priority_score', { ascending: false })
      .limit(limit);

    if (agencyId) {
      opportunitiesQuery = opportunitiesQuery.eq('agency_id', agencyId);
    }

    if (query) {
      opportunitiesQuery = opportunitiesQuery.or(
        `customer_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
      );
    }

    const { data: opportunities, error: oppError } = await opportunitiesQuery;

    // Merge and deduplicate by customer name
    const customerMap = new Map<string, {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      zipCode: string | null;
      totalPremium: number;
      policyCount: number;
      products: string[];
      tenureYears: number;
      segment: string;
      segmentConfig: typeof SEGMENT_CONFIG['elite'];
      retentionRisk: string;
      hasOpportunity: boolean;
      opportunityId: string | null;
      priorityTier: string | null;
      recommendedProduct: string | null;
      upcomingRenewal: string | null;
    }>();

    // Process insights
    if (insights && !insightsError) {
      for (const customer of insights) {
        const segment = getSegmentTier(customer.total_premium || 0, customer.total_policies || 0);
        customerMap.set(customer.customer_name, {
          id: customer.id,
          name: customer.customer_name,
          email: customer.customer_email,
          phone: customer.customer_phone,
          address: null,
          city: null,
          zipCode: null,
          totalPremium: customer.total_premium || 0,
          policyCount: customer.total_policies || 0,
          products: customer.products_held || [],
          tenureYears: customer.tenure_years || 0,
          segment,
          segmentConfig: SEGMENT_CONFIG[segment as keyof typeof SEGMENT_CONFIG],
          retentionRisk: customer.retention_risk || 'low',
          hasOpportunity: false,
          opportunityId: null,
          priorityTier: null,
          recommendedProduct: null,
          upcomingRenewal: customer.upcoming_renewal,
        });
      }
    }

    // Process opportunities (add missing customers or update with opportunity info)
    if (opportunities && !oppError) {
      for (const opp of opportunities) {
        const existing = customerMap.get(opp.customer_name);
        if (existing) {
          // Update with opportunity info
          existing.hasOpportunity = true;
          existing.opportunityId = opp.id;
          existing.priorityTier = opp.priority_tier;
          existing.recommendedProduct = opp.recommended_product;
          existing.upcomingRenewal = opp.renewal_date;
        } else {
          // Add new customer from opportunity
          const segment = getSegmentTier(opp.current_premium || 0, opp.policy_count || 1);
          customerMap.set(opp.customer_name, {
            id: opp.id,
            name: opp.customer_name,
            email: opp.email,
            phone: opp.phone,
            address: opp.address,
            city: opp.city,
            zipCode: opp.zip_code,
            totalPremium: opp.current_premium || 0,
            policyCount: opp.policy_count || 1,
            products: opp.current_products?.split(',').map((p: string) => p.trim()) || [],
            tenureYears: opp.tenure_years || 0,
            segment,
            segmentConfig: SEGMENT_CONFIG[segment as keyof typeof SEGMENT_CONFIG],
            retentionRisk: 'low',
            hasOpportunity: true,
            opportunityId: opp.id,
            priorityTier: opp.priority_tier,
            recommendedProduct: opp.recommended_product,
            upcomingRenewal: opp.renewal_date,
          });
        }
      }
    }

    // Convert to array and filter by segment if needed
    let customers = Array.from(customerMap.values());

    if (segmentFilter) {
      customers = customers.filter(c => c.segment === segmentFilter);
    }

    // Sort by premium (highest first) then by name
    customers.sort((a, b) => {
      if (b.totalPremium !== a.totalPremium) {
        return b.totalPremium - a.totalPremium;
      }
      return a.name.localeCompare(b.name);
    });

    // Limit results
    customers = customers.slice(0, limit);

    return NextResponse.json({
      success: true,
      customers,
      count: customers.length,
      query: query || null,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
