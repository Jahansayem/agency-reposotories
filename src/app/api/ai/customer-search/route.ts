import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateAiRequest,
  callClaude,
  parseAiJsonResponse,
  aiErrorResponse,
  aiSuccessResponse,
  withAiErrorHandling,
} from '@/lib/aiApiHelper';
import { logger } from '@/lib/logger';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import { decryptField } from '@/lib/fieldEncryption';
import { getCustomerSegment, SEGMENT_CONFIGS, type SegmentTier } from '@/lib/segmentation';
import { VALIDATION_LIMITS, escapeLikePattern } from '@/lib/constants';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Shape Claude returns for search filter extraction */
interface AiSearchFilters {
  namePatterns?: string[];
  segment?: string | null;
  productFilter?: string | null;
  minPolicies?: number | null;
  maxPolicies?: number | null;
  minPremium?: number | null;
  maxPremium?: number | null;
  retentionRisk?: string | null;
  priorityTier?: string | null;
  hasOpportunity?: boolean | null;
}

const SYSTEM_PROMPT = `You are a customer search assistant for an Allstate insurance agency. Given a user's search query, extract structured filters to find matching customers in the book of business.

Available filter fields:
- namePatterns: array of name variations to search (include nicknames, common misspellings, partial names). E.g. "Bob" → ["Bob", "Robert", "Bobby", "Rob"]
- segment: customer tier — one of "elite", "premium", "standard", "entry", or null
- productFilter: policy type — one of "auto", "home", "life", "umbrella", "commercial", or null
- minPolicies / maxPolicies: integer range for number of policies, or null
- minPremium / maxPremium: dollar amount range for annual premium, or null
- retentionRisk: one of "low", "medium", "high", or null
- priorityTier: one of "HOT", "HIGH", "MEDIUM", "LOW", or null
- hasOpportunity: true if looking for customers with cross-sell opportunities, null otherwise

Rules:
- Always return valid JSON with no extra text
- For name queries, include the original name plus common variations/nicknames
- "high value" or "top" customers → segment: "elite" or "premium"
- "at risk" or "might leave" → retentionRisk: "high"
- Dollar amounts like "$5000+" → minPremium: 5000
- If the query is just a name, put it in namePatterns and leave everything else null
- If the query mentions specific products, set productFilter
- Be generous with namePatterns — include partial matches and common variations`;

function buildUserMessage(query: string, mode: 'search' | 'suggest', taskText?: string): string {
  if (mode === 'suggest' && taskText) {
    return `Extract potential customer name references and any other search filters from this task description. The user wants to find which customer this task is about.

Task text: "${taskText}"

${query ? `Additional search context: "${query}"` : ''}

Return JSON with the filters. Focus especially on extracting namePatterns from any names mentioned in the task text.`;
  }

  return `Extract search filters from this customer search query:

"${query}"

Return JSON with the filters.`;
}

function normalizeProducts(products: string[] | string | null | undefined): string[] {
  if (!products) return [];
  if (Array.isArray(products)) return products;
  if (typeof products === 'string') {
    return products.split(/[,;]/).map(p => p.trim()).filter(Boolean);
  }
  return [];
}

async function handleCustomerSearch(request: NextRequest, ctx: AgencyAuthContext) {
  const validation = await validateAiRequest(request, {
    customValidator: (body) => {
      const mode = body.mode as string | undefined;
      if (mode === 'suggest') {
        if (!body.taskText || typeof body.taskText !== 'string') {
          return 'taskText is required for suggest mode';
        }
      } else {
        if (!body.query || typeof body.query !== 'string') {
          return 'query is required';
        }
      }
      return null;
    },
  });

  if (!validation.valid) {
    return validation.response;
  }

  const { query: rawQuery, mode: rawMode, taskText } = validation.body as {
    query?: string;
    mode?: string;
    taskText?: string;
  };

  const query = (rawQuery || '').trim().slice(0, VALIDATION_LIMITS.MAX_SEARCH_QUERY_LENGTH);
  const mode = rawMode === 'suggest' ? 'suggest' : 'search';
  const agencyId = ctx.agencyId;

  // Try AI-powered search first
  const userMessage = buildUserMessage(query, mode, taskText);
  const aiResult = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 400,
    component: 'CustomerSearchAPI',
  });

  let filters: AiSearchFilters | null = null;

  if (aiResult.success) {
    filters = parseAiJsonResponse<AiSearchFilters>(aiResult.content);
    if (filters) {
      logger.info('AI extracted customer search filters', {
        component: 'CustomerSearchAPI',
        query,
        mode,
        filters: JSON.stringify(filters),
      });
    }
  }

  // Fallback: if AI failed or returned nothing useful, use raw query as name search
  if (!filters || (!filters.namePatterns?.length && !filters.segment && !filters.productFilter
    && !filters.minPolicies && !filters.minPremium && !filters.retentionRisk
    && !filters.priorityTier && filters.hasOpportunity === undefined)) {
    filters = {
      namePatterns: query ? [query] : [],
    };
    logger.info('Falling back to plain name search', {
      component: 'CustomerSearchAPI',
      query,
      reason: aiResult.success ? 'empty-filters' : aiResult.error,
    });
  }

  // Query Supabase with extracted filters
  const supabase = getSupabaseClient();

  // Build customer_insights query
  let insightsQuery = supabase
    .from('customer_insights')
    .select('*')
    .order('total_premium', { ascending: false })
    .limit(100);

  if (agencyId) {
    insightsQuery = insightsQuery.eq('agency_id', agencyId);
  }

  // Apply name patterns as OR'd ILIKE filters
  if (filters.namePatterns && filters.namePatterns.length > 0) {
    const nameFilter = filters.namePatterns
      .map(p => `customer_name.ilike.%${escapeLikePattern(p)}%`)
      .join(',');
    insightsQuery = insightsQuery.or(nameFilter);
  }

  // Apply retention risk filter
  if (filters.retentionRisk) {
    insightsQuery = insightsQuery.eq('retention_risk', filters.retentionRisk);
  }

  const { data: insights, error: insightsError } = await insightsQuery;

  // Build cross_sell_opportunities query
  let opportunitiesQuery = supabase
    .from('cross_sell_opportunities')
    .select('*')
    .eq('dismissed', false)
    .order('priority_score', { ascending: false })
    .limit(100);

  if (agencyId) {
    opportunitiesQuery = opportunitiesQuery.eq('agency_id', agencyId);
  }

  if (filters.namePatterns && filters.namePatterns.length > 0) {
    const nameFilter = filters.namePatterns
      .map(p => `customer_name.ilike.%${escapeLikePattern(p)}%`)
      .join(',');
    opportunitiesQuery = opportunitiesQuery.or(nameFilter);
  }

  if (filters.priorityTier) {
    opportunitiesQuery = opportunitiesQuery.eq('priority_tier', filters.priorityTier);
  }

  const { data: opportunities, error: oppError } = await opportunitiesQuery;

  // Merge results (same logic as /api/customers GET)
  const customerMap = new Map<string, Record<string, unknown>>();

  if (insights && !insightsError) {
    for (const customer of insights) {
      const segment = getCustomerSegment(customer.total_premium || 0, customer.total_policies || 0);

      let decryptedEmail: string | null = null;
      let decryptedPhone: string | null = null;
      try { decryptedEmail = decryptField(customer.customer_email, 'customer_insights.customer_email'); } catch { decryptedEmail = null; }
      try { decryptedPhone = decryptField(customer.customer_phone, 'customer_insights.customer_phone'); } catch { decryptedPhone = null; }

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

  if (opportunities && !oppError) {
    for (const opp of opportunities) {
      const existing = customerMap.get(opp.customer_name);
      if (existing) {
        existing.hasOpportunity = true;
        existing.opportunityId = opp.id;
        existing.priorityTier = opp.priority_tier;
        existing.priorityScore = opp.priority_score;
        existing.recommendedProduct = opp.recommended_product;
        existing.opportunityType = opp.segment_type;
        existing.potentialPremiumAdd = opp.potential_premium_add;
        existing.upcomingRenewal = opp.renewal_date;
      } else {
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

  const allCustomers = Array.from(customerMap.values());

  // Apply in-memory filters with progressive relaxation:
  // Try all filters first; if 0 results, keep only name + product; if still 0, keep only name
  const f = filters!;
  function applyFilters(
    base: Record<string, unknown>[],
    opts: { segment?: boolean; product?: boolean; ranges?: boolean; opportunity?: boolean }
  ) {
    let result = [...base];
    if (opts.segment && f.segment) {
      result = result.filter(c => c.segment === f.segment);
    }
    if (opts.product && f.productFilter) {
      result = result.filter(c =>
        (c.products as string[]).some(p =>
          p.toLowerCase().includes(f.productFilter!.toLowerCase())
        )
      );
    }
    if (opts.ranges) {
      if (f.minPolicies != null) result = result.filter(c => (c.policyCount as number) >= f.minPolicies!);
      if (f.maxPolicies != null) result = result.filter(c => (c.policyCount as number) <= f.maxPolicies!);
      if (f.minPremium != null) result = result.filter(c => (c.totalPremium as number) >= f.minPremium!);
      if (f.maxPremium != null) result = result.filter(c => (c.totalPremium as number) <= f.maxPremium!);
    }
    if (opts.opportunity && f.hasOpportunity === true) {
      result = result.filter(c => c.hasOpportunity === true);
    }
    return result;
  }

  // Try strict → relaxed → name-only
  let customers = applyFilters(allCustomers, { segment: true, product: true, ranges: true, opportunity: true });
  if (customers.length === 0) {
    customers = applyFilters(allCustomers, { segment: false, product: true, ranges: false, opportunity: false });
  }
  if (customers.length === 0) {
    customers = allCustomers;
  }

  // Sort by premium descending
  customers.sort((a, b) => (b.totalPremium as number) - (a.totalPremium as number));

  // Limit to 20
  customers = customers.slice(0, 20);

  return aiSuccessResponse({
    customers,
    count: customers.length,
    query: query || null,
    mode,
    aiFilters: filters,
    aiPowered: aiResult.success,
  });
}

export const POST = withAiErrorHandling(
  'CustomerSearchAPI',
  withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
    return handleCustomerSearch(request, ctx);
  })
);
