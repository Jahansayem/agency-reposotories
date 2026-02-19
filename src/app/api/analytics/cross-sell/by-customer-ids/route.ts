/**
 * Batch Customer Opportunities API
 *
 * POST /api/analytics/cross-sell/by-customer-ids
 * Fetch top opportunity tier for multiple customers by customer_id
 *
 * Used by useCustomerOpportunities hook to avoid N+1 queries in task lists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface CustomerOpportunityRequest {
  customerIds: string[];
  includeDetails?: boolean;
}

export interface CustomerOpportunityResponse {
  customerId: string;
  priorityTier: 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';
  opportunity?: {
    id: string;
    priorityTier: string;
    recommendedProduct: string;
    potentialPremiumAdd: number;
    talkingPoint1: string;
    talkingPoint2: string;
    talkingPoint3: string;
    currentProducts: string;
    tenureYears: number;
    currentPremium: number;
    daysUntilRenewal: number;
  };
}

export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const body: CustomerOpportunityRequest = await request.json();

    if (!body.customerIds || !Array.isArray(body.customerIds)) {
      return NextResponse.json(
        { error: 'customerIds array is required' },
        { status: 400 }
      );
    }

    const { customerIds, includeDetails = false } = body;

    if (customerIds.length === 0) {
      return NextResponse.json([]);
    }

    // Limit batch size to prevent abuse
    if (customerIds.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 customer IDs per request' },
        { status: 400 }
      );
    }

    // Step 1: Get customer names for the given IDs
    const { data: customers, error: customersError } = await supabase
      .from('customer_insights')
      .select('id, customer_name')
      .in('id', customerIds)
      .eq('agency_id', ctx.agencyId);

    if (customersError) {
      console.error('Failed to fetch customers:', customersError);
      return NextResponse.json(
        { error: 'Failed to fetch customer data' },
        { status: 500 }
      );
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json([]);
    }

    // Build map: customer_name -> customer_id
    const customerNameMap = new Map<string, string>(
      customers.map((c) => [c.customer_name, c.id])
    );
    const names = [...customerNameMap.keys()];

    // Step 2: Get opportunities for those customer names
    const selectFields = includeDetails
      ? 'id, customer_name, priority_tier, priority_score, recommended_product, potential_premium_add, talking_point_1, talking_point_2, talking_point_3, current_products, tenure_years, current_premium, days_until_renewal'
      : 'customer_name, priority_tier, priority_score';

    const { data: opportunities, error: opportunitiesError } = await supabase
      .from('cross_sell_opportunities')
      .select(selectFields)
      .in('customer_name', names)
      .eq('agency_id', ctx.agencyId)
      .eq('dismissed', false)
      .order('priority_score', { ascending: false });

    if (opportunitiesError) {
      console.error('Failed to fetch opportunities:', opportunitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch opportunity data' },
        { status: 500 }
      );
    }

    // Step 3: Group by customer_id, take highest priority_score per customer
    const result: CustomerOpportunityResponse[] = [];
    const processedCustomers = new Set<string>();

    for (const opp of opportunities || []) {
      const customerId = customerNameMap.get((opp as any).customer_name);
      if (!customerId || processedCustomers.has(customerId)) {
        continue;
      }

      const response: CustomerOpportunityResponse = {
        customerId,
        priorityTier: (opp as any).priority_tier as 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW',
      };

      if (includeDetails) {
        response.opportunity = {
          id: (opp as any).id,
          priorityTier: (opp as any).priority_tier,
          recommendedProduct: (opp as any).recommended_product || '',
          potentialPremiumAdd: (opp as any).potential_premium_add || 0,
          talkingPoint1: (opp as any).talking_point_1 || '',
          talkingPoint2: (opp as any).talking_point_2 || '',
          talkingPoint3: (opp as any).talking_point_3 || '',
          currentProducts: (opp as any).current_products || '',
          tenureYears: (opp as any).tenure_years || 0,
          currentPremium: (opp as any).current_premium || 0,
          daysUntilRenewal: (opp as any).days_until_renewal || 0,
        };
      }

      result.push(response);
      processedCustomers.add(customerId);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching customer opportunities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
