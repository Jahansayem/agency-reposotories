/**
 * Customers API
 *
 * GET /api/customers - Search/list customers from book of business
 *
 * Query params:
 * - q: Search query (name only - email/phone are encrypted)
 * - agency_id: Filter by agency
 * - segment: Filter by segment tier (elite, premium, standard, entry)
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

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const agencyId = searchParams.get('agency_id');
    const segmentFilter = searchParams.get('segment');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // First, try customer_insights table
    let insightsQuery = supabase
      .from('customer_insights')
      .select('*')
      .order('total_premium', { ascending: false })
      .limit(limit);

    if (agencyId) {
      // Include customers with matching agency_id OR null agency_id (legacy/demo data)
      insightsQuery = insightsQuery.or(`agency_id.eq.${agencyId},agency_id.is.null`);
    }

    if (query) {
      // Search by name only - email and phone are encrypted and cannot be searched with ILIKE
      insightsQuery = insightsQuery.ilike('customer_name', `%${query}%`);
    }

    const { data: insights, error: insightsError } = await insightsQuery;
    console.log('[Customers API] customer_insights results:', {
      count: insights?.length || 0,
      error: insightsError?.message,
      sampleAgencyIds: insights?.slice(0, 3).map(i => i.agency_id)
    });

    // Also search cross_sell_opportunities for customers not in insights
    let opportunitiesQuery = supabase
      .from('cross_sell_opportunities')
      .select('*')
      .eq('dismissed', false)
      .order('priority_score', { ascending: false })
      .limit(limit);

    if (agencyId) {
      // Include opportunities with matching agency_id OR null agency_id (legacy/demo data)
      opportunitiesQuery = opportunitiesQuery.or(`agency_id.eq.${agencyId},agency_id.is.null`);
    }

    if (query) {
      // Search by name only - email and phone may be encrypted
      opportunitiesQuery = opportunitiesQuery.ilike('customer_name', `%${query}%`);
    }

    const { data: opportunities, error: oppError } = await opportunitiesQuery;
    console.log('[Customers API] cross_sell_opportunities results:', {
      count: opportunities?.length || 0,
      error: oppError?.message,
      sampleAgencyIds: opportunities?.slice(0, 3).map(o => o.agency_id)
    });

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
      recommendedProduct: string | null;
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
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
