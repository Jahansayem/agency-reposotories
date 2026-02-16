/**
 * Dismiss Opportunity API
 *
 * POST /api/opportunities/[id]/dismiss - Dismiss a cross-sell opportunity
 *
 * Sets the dismissed flag to true on a cross-sell opportunity,
 * hiding it from the active opportunities list.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAgencyAccess, type AgencyAuthContext } from '@/lib/agencyAuth';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface DismissRequest {
  dismissed_by?: string;
  reason?: string;
}

interface DismissResponse {
  success: boolean;
  message: string;
  opportunity_id: string;
}

/**
 * POST /api/opportunities/[id]/dismiss
 * Dismiss a cross-sell opportunity
 *
 * Request body (optional):
 * - dismissed_by: Name of user dismissing the opportunity
 * - reason: Optional reason for dismissal
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  // Verify agency authentication
  const auth = await verifyAgencyAccess(request);
  if (!auth.success || !auth.context) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ctx = auth.context;

  try {
    const supabase = getSupabaseClient();
    const { id: opportunityId } = await params;

    // Validate opportunity ID
    if (!opportunityId || !isValidUUID(opportunityId)) {
      return NextResponse.json(
        { error: 'Valid opportunity ID is required' },
        { status: 400 }
      );
    }

    // Parse optional request body
    let body: DismissRequest = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional, ignore parse errors
    }

    // Verify opportunity exists (scoped to agency)
    let oppQuery = supabase
      .from('cross_sell_opportunities')
      .select('id, customer_name, recommended_product')
      .eq('id', opportunityId);

    if (ctx.agencyId) {
      oppQuery = oppQuery.eq('agency_id', ctx.agencyId);
    }

    const { data: opportunity, error: oppError } = await oppQuery.single();

    if (oppError || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    // Update the opportunity to set dismissed = true
    const updateData: Record<string, unknown> = {
      dismissed: true,
      dismissed_at: new Date().toISOString(),
    };

    updateData.dismissed_by = body.dismissed_by || ctx.userName;

    if (body.reason) {
      updateData.dismiss_reason = body.reason;
    }

    let updateQuery = supabase
      .from('cross_sell_opportunities')
      .update(updateData)
      .eq('id', opportunityId);

    if (ctx.agencyId) {
      updateQuery = updateQuery.eq('agency_id', ctx.agencyId);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error('Failed to dismiss opportunity:', updateError);
      return NextResponse.json(
        { error: 'Failed to dismiss opportunity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Dismissed ${opportunity.recommended_product} opportunity for ${opportunity.customer_name}`,
      opportunity_id: opportunityId,
    });
  } catch (error) {
    console.error('Error dismissing opportunity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
