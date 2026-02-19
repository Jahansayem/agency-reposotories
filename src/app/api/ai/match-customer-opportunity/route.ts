import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  callClaude,
  parseAiJsonResponse,
  aiSuccessResponse,
  validateAiRequest,
  withAiErrorHandling,
  withSessionAuth,
} from '@/lib/aiApiHelper';

interface MatchRequest {
  taskText: string;
  agencyId: string;
}

interface MatchResult {
  matched: boolean;
  customer: { id: string; name: string; segment: string } | null;
  opportunity: {
    id: string;
    priorityTier: string;
    priorityScore: number;
    recommendedProduct: string;
    potentialPremiumAdd: number;
    talkingPoint1: string;
    talkingPoint2: string;
    talkingPoint3: string;
    currentProducts: string;
    tenureYears: number;
    currentPremium: number;
    daysUntilRenewal: number;
  } | null;
}

async function handleMatchCustomerOpportunity(request: NextRequest): Promise<NextResponse> {
  const validation = await validateAiRequest(request, {
    customValidator: (body) => {
      if (!body.taskText || typeof body.taskText !== 'string') return 'taskText is required';
      if (!body.agencyId || typeof body.agencyId !== 'string') return 'agencyId is required';
      return null;
    },
  });
  if (!validation.valid) return validation.response;

  const { taskText, agencyId } = validation.body as unknown as MatchRequest;

  // Skip very short task texts
  if (taskText.trim().split(/\s+/).length < 3) {
    return aiSuccessResponse({ matched: false, customer: null, opportunity: null } as MatchResult);
  }

  // Step 1: Extract customer name via Claude
  const nameResult = await callClaude({
    userMessage: `Extract the full customer name from this insurance agency task text.
Return ONLY valid JSON: { "customer_name": "First Last" } or { "customer_name": null } if no name is present.
Task: "${taskText.slice(0, 500)}"`,
    maxTokens: 60,
    component: 'MatchCustomerOpportunity',
  });

  if (!nameResult.success) {
    return aiSuccessResponse({ matched: false, customer: null, opportunity: null } as MatchResult);
  }

  const parsed = parseAiJsonResponse<{ customer_name: string | null }>(nameResult.content);
  if (!parsed?.customer_name) {
    return aiSuccessResponse({ matched: false, customer: null, opportunity: null } as MatchResult);
  }

  const extractedName = parsed.customer_name.trim();

  // Step 2: Fuzzy match against cross_sell_opportunities
  const { data: opportunities, error } = await supabase
    .from('cross_sell_opportunities')
    .select(`
      id, customer_name, priority_tier, priority_score,
      recommended_product, potential_premium_add,
      talking_point_1, talking_point_2, talking_point_3,
      current_products, tenure_years, current_premium,
      days_until_renewal, task_id, dismissed, agency_id
    `)
    .eq('agency_id', agencyId)
    .eq('dismissed', false)
    .ilike('customer_name', `%${extractedName}%`)
    .order('priority_score', { ascending: false })
    .limit(1);

  if (error || !opportunities?.length) {
    return aiSuccessResponse({ matched: false, customer: null, opportunity: null } as MatchResult);
  }

  const opp = opportunities[0];

  // Step 3: Look up customer segment from customer_insights by name
  const { data: insights } = await supabase
    .from('customer_insights')
    .select('id, segment_tier')
    .eq('agency_id', agencyId)
    .ilike('customer_name', `%${opp.customer_name}%`)
    .limit(1);

  const insight = insights?.[0];

  return aiSuccessResponse({
    matched: true,
    customer: {
      id: insight?.id ?? '',
      name: opp.customer_name,
      segment: insight?.segment_tier ?? 'standard',
    },
    opportunity: {
      id: opp.id,
      priorityTier: opp.priority_tier,
      priorityScore: opp.priority_score,
      recommendedProduct: opp.recommended_product,
      potentialPremiumAdd: opp.potential_premium_add,
      talkingPoint1: opp.talking_point_1,
      talkingPoint2: opp.talking_point_2,
      talkingPoint3: opp.talking_point_3,
      currentProducts: opp.current_products,
      tenureYears: opp.tenure_years,
      currentPremium: opp.current_premium,
      daysUntilRenewal: opp.days_until_renewal,
    },
  } as MatchResult);
}

export const POST = withAiErrorHandling(
  'MatchCustomerOpportunity',
  withSessionAuth(async (request: NextRequest, _userId: string, _userName: string) => {
    return handleMatchCustomerOpportunity(request);
  })
);
