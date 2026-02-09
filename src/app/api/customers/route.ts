/**
 * Customers API
 *
 * GET /api/customers - Search/list customers from book of business
 *
 * Query params:
 * - q: Search query (name only - email/phone are encrypted)
 * - agency_id: Filter by agency
 * - segment: Filter by segment tier (elite, premium, standard, entry)
 * - opportunity_type: Filter by cross-sell type (auto_to_home, home_to_auto, add_life, etc.)
 * - sort: Sort order (priority, premium_high, premium_low, opportunity_value, renewal_date, name_asc)
 * - limit: Max results (default 20, max 100)
 * - offset: Skip first N results for pagination (default 0)
 *
 * SECURITY: Email and phone fields are encrypted at rest using AES-256-GCM.
 * These fields are decrypted when returned to authorized clients.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptField } from '@/lib/fieldEncryption';
import { getCustomerSegment, SEGMENT_CONFIGS, type SegmentTier } from '@/lib/segmentation';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import { VALIDATION_LIMITS, escapeLikePattern } from '@/lib/constants';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Normalize products to array format
 * Handles both TEXT[] from customer_insights and comma-separated TEXT from cross_sell_opportunities
 */
function normalizeProducts(products: string[] | string | null | undefined): string[] {
  if (!products) return [];
  if (Array.isArray(products)) return products;
  if (typeof products === 'string') {
    return products.split(/[,;]/).map(p => p.trim()).filter(Boolean);
  }
  return [];
}

export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q')?.trim() || '').slice(0, VALIDATION_LIMITS.MAX_SEARCH_QUERY_LENGTH);
    const agencyId = ctx.agencyId;
    const segmentFilter = searchParams.get('segment');
    const opportunityTypeFilter = searchParams.get('opportunity_type');
    const sortBy = searchParams.get('sort') || 'premium_high';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // First, try customer_insights table
    // NOTE: No limit here - we need ALL customers for proper pagination after merge/dedupe
    let insightsQuery = supabase
      .from('customer_insights')
      .select('*')
      .order('total_premium', { ascending: false });

    if (agencyId) {
      insightsQuery = insightsQuery.eq('agency_id', agencyId);
    }

    if (query) {
      // Search by name only - email and phone are encrypted and cannot be searched with ILIKE
      insightsQuery = insightsQuery.ilike('customer_name', `%${escapeLikePattern(query)}%`);
    }

    const { data: insights, error: insightsError } = await insightsQuery;

    // Also search cross_sell_opportunities for customers not in insights
    // NOTE: No limit here - we need ALL opportunities for proper pagination after merge/dedupe
    let opportunitiesQuery = supabase
      .from('cross_sell_opportunities')
      .select('*')
      .eq('dismissed', false)
      .order('priority_score', { ascending: false });

    if (agencyId) {
      opportunitiesQuery = opportunitiesQuery.eq('agency_id', agencyId);
    }

    if (query) {
      // Search by name only - email and phone may be encrypted
      opportunitiesQuery = opportunitiesQuery.ilike('customer_name', `%${escapeLikePattern(query)}%`);
    }

    // Filter by opportunity type (segment_type in database)
    if (opportunityTypeFilter && opportunityTypeFilter !== 'all') {
      opportunitiesQuery = opportunitiesQuery.eq('segment_type', opportunityTypeFilter);
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
      segmentConfig: (typeof SEGMENT_CONFIGS)['elite'];
      retentionRisk: string;
      hasOpportunity: boolean;
      opportunityId: string | null;
      priorityTier: string | null;
      priorityScore: number | null;
      recommendedProduct: string | null;
      opportunityType: string | null;
      potentialPremiumAdd: number | null;
      upcomingRenewal: string | null;
    }>();

    // Process insights
    if (insights && !insightsError) {
      for (const customer of insights) {
        const segment = getCustomerSegment(customer.total_premium || 0, customer.total_policies || 0);

        // Decrypt PII fields - use try-catch to handle decryption errors gracefully
        let decryptedEmail: string | null = null;
        let decryptedPhone: string | null = null;

        try {
          decryptedEmail = decryptField(customer.customer_email, 'customer_insights.customer_email');
        } catch {
          // Decryption failed - return null instead of encrypted ciphertext
          decryptedEmail = null;
        }

        try {
          decryptedPhone = decryptField(customer.customer_phone, 'customer_insights.customer_phone');
        } catch {
          // Decryption failed - return null instead of encrypted ciphertext
          decryptedPhone = null;
        }

        customerMap.set(customer.customer_name, {
          id: customer.id,
          name: customer.customer_name,
          email: decryptedEmail,
          phone: decryptedPhone,
          address: null,
          city: null,
          zipCode: null,
          totalPremium: customer.total_premium || 0,
          policyCount: customer.total_policies || 0,
          products: normalizeProducts(customer.products_held),
          tenureYears: customer.tenure_years || 0,
          segment,
          segmentConfig: SEGMENT_CONFIGS[segment as SegmentTier],
          retentionRisk: customer.retention_risk || 'low',
          hasOpportunity: false,
          opportunityId: null,
          priorityTier: null,
          priorityScore: null,
          recommendedProduct: null,
          opportunityType: null,
          potentialPremiumAdd: null,
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
          existing.priorityScore = opp.priority_score;
          existing.recommendedProduct = opp.recommended_product;
          existing.opportunityType = opp.segment_type;
          existing.potentialPremiumAdd = opp.potential_premium_add;
          existing.upcomingRenewal = opp.renewal_date;
        } else {
          // Add new customer from opportunity
          const segment = getCustomerSegment(opp.current_premium || 0, opp.policy_count || 1);
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
            products: normalizeProducts(opp.current_products),
            tenureYears: opp.tenure_years || 0,
            segment,
            segmentConfig: SEGMENT_CONFIGS[segment as SegmentTier],
            retentionRisk: 'low',
            hasOpportunity: true,
            opportunityId: opp.id,
            priorityTier: opp.priority_tier,
            priorityScore: opp.priority_score,
            recommendedProduct: opp.recommended_product,
            opportunityType: opp.segment_type,
            potentialPremiumAdd: opp.potential_premium_add,
            upcomingRenewal: opp.renewal_date,
          });
        }
      }
    }

    // Convert to array and apply filters
    let customers = Array.from(customerMap.values());

    // Filter by customer segment tier if specified
    if (segmentFilter) {
      customers = customers.filter(c => c.segment === segmentFilter);
    }

    // Filter by opportunity type - only show customers with matching opportunity
    if (opportunityTypeFilter && opportunityTypeFilter !== 'all') {
      customers = customers.filter(c => c.opportunityType === opportunityTypeFilter);
    }

    // Calculate stats before sorting/pagination
    const stats = {
      total: customers.length,
      totalPremium: customers.reduce((sum, c) => sum + c.totalPremium, 0),
      potentialPremiumAdd: customers.reduce((sum, c) => sum + (c.potentialPremiumAdd || 0), 0),
      hotCount: customers.filter(c => c.priorityTier === 'HOT').length,
      highCount: customers.filter(c => c.priorityTier === 'HIGH').length,
      mediumCount: customers.filter(c => c.priorityTier === 'MEDIUM').length,
      withOpportunities: customers.filter(c => c.hasOpportunity).length,
    };

    // Apply sorting based on sortBy parameter
    switch (sortBy) {
      case 'priority':
        // Sort by priority tier (HOT > HIGH > MEDIUM > LOW > null) then by score
        const priorityOrder: Record<string, number> = { HOT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        customers.sort((a, b) => {
          const aPriority = a.priorityTier ? priorityOrder[a.priorityTier] ?? 4 : 5;
          const bPriority = b.priorityTier ? priorityOrder[b.priorityTier] ?? 4 : 5;
          if (aPriority !== bPriority) return aPriority - bPriority;
          // Within same tier, sort by score descending
          return (b.priorityScore || 0) - (a.priorityScore || 0);
        });
        break;

      case 'premium_low':
        customers.sort((a, b) => a.totalPremium - b.totalPremium);
        break;

      case 'opportunity_value':
        // Sort by potential premium add descending
        customers.sort((a, b) => (b.potentialPremiumAdd || 0) - (a.potentialPremiumAdd || 0));
        break;

      case 'renewal_date':
        // Sort by renewal date ascending (soonest first), nulls last
        customers.sort((a, b) => {
          if (!a.upcomingRenewal && !b.upcomingRenewal) return 0;
          if (!a.upcomingRenewal) return 1;
          if (!b.upcomingRenewal) return -1;
          return new Date(a.upcomingRenewal).getTime() - new Date(b.upcomingRenewal).getTime();
        });
        break;

      case 'name_asc':
        customers.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case 'premium_high':
      default:
        // Sort by premium descending, then by name
        customers.sort((a, b) => {
          if (b.totalPremium !== a.totalPremium) {
            return b.totalPremium - a.totalPremium;
          }
          return a.name.localeCompare(b.name);
        });
        break;
    }

    // Apply pagination (offset and limit)
    const totalCount = customers.length;
    customers = customers.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      customers,
      count: customers.length,
      totalCount,
      offset,
      limit,
      query: query || null,
      stats,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
});
