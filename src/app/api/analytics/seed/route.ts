/**
 * Seed Data API
 *
 * POST /api/analytics/seed
 * Seeds the database with cross-sell opportunities from the bealer-lead-model data
 *
 * This endpoint should only be used during initial setup or development.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Import seed data
import seedOpportunities from '@/data/seed-cross-sell-opportunities.json';
import seedCustomers from '@/data/seed-customers.json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types for the seed data
interface SeedOpportunity {
  priorityRank: number;
  priorityTier: string;
  priorityScore: number;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  renewalDate: string;
  daysUntilRenewal: number;
  currentProducts: string;
  recommendedProduct: string;
  segment: string;
  currentPremium: number;
  potentialPremiumAdd: number;
  expectedConversionPct: number;
  retentionLiftPct: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  balanceDue: number;
  renewalStatus: string;
  ezpayStatus: string;
  tenureYears: number;
  policyCount: number;
}

interface SeedCustomer {
  name: string;
  totalPremium: number;
  policyCount: number;
  zipCode: string;
  email: string;
  phone: string;
  tenure: number;
  ezpay: boolean;
  products: string[];
  gender: string;
  maritalStatus: string;
  claimCount: number;
}

/**
 * Transform seed data to database format
 */
function transformOpportunity(opp: SeedOpportunity, agencyId?: string) {
  // Parse date from MM/DD/YYYY format
  let renewalDate: string | undefined;
  if (opp.renewalDate) {
    const parts = opp.renewalDate.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      renewalDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Determine segment type from segment string
  let segmentType = 'other';
  if (opp.segment.includes('Auto→Home')) {
    segmentType = 'auto_to_home';
  } else if (opp.segment.includes('Home→Auto')) {
    segmentType = 'home_to_auto';
  } else if (opp.segment.includes('Renters')) {
    segmentType = 'mono_to_bundle';
  } else if (opp.segment.includes('Umbrella')) {
    segmentType = 'add_umbrella';
  } else if (opp.segment.includes('Life')) {
    segmentType = 'add_life';
  }

  return {
    agency_id: agencyId || null,
    priority_rank: opp.priorityRank,
    priority_tier: opp.priorityTier as 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW',
    priority_score: opp.priorityScore,
    customer_name: opp.customerName,
    phone: opp.phone || '',
    email: opp.email || '',
    address: opp.address || '',
    city: opp.city || '',
    zip_code: opp.zipCode || '',
    renewal_date: renewalDate,
    days_until_renewal: opp.daysUntilRenewal,
    current_products: opp.currentProducts,
    recommended_product: opp.recommendedProduct,
    segment: opp.segment,
    segment_type: segmentType,
    current_premium: opp.currentPremium,
    potential_premium_add: opp.potentialPremiumAdd,
    expected_conversion_pct: opp.expectedConversionPct,
    retention_lift_pct: opp.retentionLiftPct,
    talking_point_1: opp.talkingPoint1 || '',
    talking_point_2: opp.talkingPoint2 || '',
    talking_point_3: opp.talkingPoint3 || '',
    balance_due: opp.balanceDue,
    renewal_status: opp.renewalStatus === 'Not Taken' ? 'Not Taken' :
                    opp.renewalStatus === 'Taken' ? 'Renewed' : 'Pending',
    ezpay_status: opp.ezpayStatus === 'Yes' ? 'Yes' : 'No',
    tenure_years: opp.tenureYears,
    policy_count: opp.policyCount,
    dismissed: false,
  };
}

/**
 * POST /api/analytics/seed
 * Seed the database with cross-sell opportunities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const agencyId = body.agency_id as string | undefined;
    const clearExisting = body.clear_existing === true;
    const maxRecords = body.max_records || 500; // Default to 500 records

    // Optional: Clear existing data
    if (clearExisting) {
      let deleteQuery = supabase
        .from('cross_sell_opportunities')
        .delete();

      if (agencyId) {
        deleteQuery = deleteQuery.eq('agency_id', agencyId);
      } else {
        deleteQuery = deleteQuery.is('agency_id', null);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('Failed to clear existing data:', deleteError);
        return NextResponse.json(
          { error: 'Failed to clear existing data' },
          { status: 500 }
        );
      }
    }

    // Transform and limit seed data
    const opportunities = (seedOpportunities as SeedOpportunity[])
      .slice(0, maxRecords)
      .map((opp) => transformOpportunity(opp, agencyId));

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    const errors: Array<{ batch: number; error: string }> = [];

    for (let i = 0; i < opportunities.length; i += BATCH_SIZE) {
      const batch = opportunities.slice(i, i + BATCH_SIZE);

      const { error: insertError } = await supabase
        .from('cross_sell_opportunities')
        .insert(batch);

      if (insertError) {
        console.error(`Failed to insert batch ${i / BATCH_SIZE}:`, insertError);
        errors.push({
          batch: i / BATCH_SIZE,
          error: insertError.message,
        });
      } else {
        insertedCount += batch.length;
      }
    }

    // Calculate summary stats from inserted data
    const tierCounts = {
      HOT: opportunities.filter((o) => o.priority_tier === 'HOT').length,
      HIGH: opportunities.filter((o) => o.priority_tier === 'HIGH').length,
      MEDIUM: opportunities.filter((o) => o.priority_tier === 'MEDIUM').length,
      LOW: opportunities.filter((o) => o.priority_tier === 'LOW').length,
    };

    const totalPotentialPremium = opportunities.reduce(
      (sum, o) => sum + o.potential_premium_add,
      0
    );

    return NextResponse.json({
      success: true,
      message: `Seeded ${insertedCount} cross-sell opportunities`,
      stats: {
        total_records: opportunities.length,
        inserted: insertedCount,
        failed: opportunities.length - insertedCount,
        tier_distribution: tierCounts,
        total_potential_premium: Math.round(totalPotentialPremium),
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/seed
 * Get information about available seed data
 */
export async function GET() {
  const opportunities = seedOpportunities as SeedOpportunity[];
  const customers = seedCustomers as SeedCustomer[];

  // Calculate stats
  const tierCounts = {
    HOT: opportunities.filter((o) => o.priorityTier === 'HOT').length,
    HIGH: opportunities.filter((o) => o.priorityTier === 'HIGH').length,
    MEDIUM: opportunities.filter((o) => o.priorityTier === 'MEDIUM').length,
    LOW: opportunities.filter((o) => o.priorityTier === 'LOW').length,
  };

  const segmentCounts: Record<string, number> = {};
  for (const opp of opportunities) {
    const segment = opp.segment.split(':')[0].trim();
    segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
  }

  const totalPotentialPremium = opportunities.reduce(
    (sum, o) => sum + o.potentialPremiumAdd,
    0
  );

  const totalCurrentPremium = opportunities.reduce(
    (sum, o) => sum + o.currentPremium,
    0
  );

  return NextResponse.json({
    seed_data_available: true,
    opportunities: {
      total: opportunities.length,
      tier_distribution: tierCounts,
      segment_distribution: segmentCounts,
      total_potential_premium: Math.round(totalPotentialPremium),
      total_current_premium: Math.round(totalCurrentPremium),
      avg_priority_score: Math.round(
        opportunities.reduce((sum, o) => sum + o.priorityScore, 0) / opportunities.length
      ),
    },
    customers: {
      total: customers.length,
      total_premium: Math.round(
        customers.reduce((sum, c) => sum + c.totalPremium, 0)
      ),
      avg_policy_count: (
        customers.reduce((sum, c) => sum + c.policyCount, 0) / customers.length
      ).toFixed(1),
      avg_tenure_years: (
        customers.reduce((sum, c) => sum + c.tenure, 0) / customers.length
      ).toFixed(1),
      ezpay_enrolled: customers.filter((c) => c.ezpay).length,
    },
    source: 'bealer-lead-model (cross_sell_renewal_analysis.py)',
  });
}
