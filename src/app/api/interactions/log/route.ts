/**
 * Manual Interaction Logging API
 *
 * POST /api/interactions/log
 * Logs a manual customer interaction (contact attempt or note).
 *
 * Body:
 * - customerId: string (required) - UUID of the customer in customer_insights
 * - type: 'contact_attempt' | 'note_added' (required) - only manual types allowed
 * - summary: string (required) - human-readable summary
 * - details?: object (optional) - additional JSONB metadata
 *
 * Returns 201 with the created interaction record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MANUAL_INTERACTION_TYPES = ['contact_attempt', 'note_added'] as const;
type ManualInteractionType = (typeof MANUAL_INTERACTION_TYPES)[number];

interface LogInteractionRequest {
  customerId: string;
  type: ManualInteractionType;
  summary: string;
  details?: Record<string, unknown>;
}

export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const body: LogInteractionRequest = await request.json();

    const { customerId, type, summary, details } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 }
      );
    }

    if (!summary || !summary.trim()) {
      return NextResponse.json(
        { error: 'summary is required' },
        { status: 400 }
      );
    }

    // Validate interaction type is a manual type only
    if (!MANUAL_INTERACTION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${MANUAL_INTERACTION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify customer exists and get agency_id
    let customerQuery = supabase
      .from('customer_insights')
      .select('id, agency_id')
      .eq('id', customerId);

    if (ctx.agencyId) {
      customerQuery = customerQuery.eq('agency_id', ctx.agencyId);
    }

    const { data: customer, error: customerError } = await customerQuery.single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Insert interaction record
    const { data: interaction, error: insertError } = await supabase
      .from('customer_interactions')
      .insert({
        agency_id: customer.agency_id,
        customer_id: customerId,
        interaction_type: type,
        summary: summary.trim(),
        details: details || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error logging interaction:', insertError);
      return NextResponse.json(
        { error: 'Failed to log interaction' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, interaction },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in interaction log endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
