/**
 * Contact History API
 *
 * GET /api/opportunities/[id]/contact - List contact history for an opportunity
 * POST /api/opportunities/[id]/contact - Log a new contact attempt
 *
 * Tracks detailed contact history for cross-sell opportunities, enabling agents
 * to log each contact attempt with outcomes and follow-up actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAgencyAccess, type AgencyAuthContext } from '@/lib/agencyAuth';
import type {
  ContactMethod,
  ContactOutcome,
  ContactHistoryRecord,
  LogContactRequest,
  ContactHistoryListResponse,
  LogContactResponse,
} from '@/types/allstate-analytics';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// Validation Helpers
// ============================================

const VALID_CONTACT_METHODS: ContactMethod[] = ['phone', 'email', 'in_person', 'mail'];
const VALID_CONTACT_OUTCOMES: ContactOutcome[] = [
  'contacted_interested',
  'contacted_not_interested',
  'contacted_callback_scheduled',
  'contacted_wrong_timing',
  'left_voicemail',
  'no_answer',
  'invalid_contact',
  'declined_permanently',
];

function isValidContactMethod(method: string): method is ContactMethod {
  return VALID_CONTACT_METHODS.includes(method as ContactMethod);
}

function isValidContactOutcome(outcome: string): outcome is ContactOutcome {
  return VALID_CONTACT_OUTCOMES.includes(outcome as ContactOutcome);
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================
// Route Parameter Extraction
// ============================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================
// GET Handler
// ============================================

/**
 * GET /api/opportunities/[id]/contact
 * List all contact history for a cross-sell opportunity
 *
 * Query parameters:
 * - limit: Number of records to return (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 *
 * Returns contact history sorted by contacted_at descending (most recent first)
 */
export async function GET(
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Verify opportunity exists (scoped to agency)
    let oppQuery = supabase
      .from('cross_sell_opportunities')
      .select('id')
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

    // Fetch contact history with user info
    const { data, error, count } = await supabase
      .from('contact_history')
      .select(
        `
        *,
        users!inner (
          name,
          color
        )
      `,
        { count: 'exact' }
      )
      .eq('opportunity_id', opportunityId)
      .order('contacted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch contact history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contact history' },
        { status: 500 }
      );
    }

    // Transform data to include user info at top level
    const contactHistory: ContactHistoryRecord[] = (data || []).map((record: any) => ({
      id: record.id,
      opportunity_id: record.opportunity_id,
      user_id: record.user_id,
      contact_method: record.contact_method,
      contact_outcome: record.contact_outcome,
      notes: record.notes,
      next_action: record.next_action,
      next_action_date: record.next_action_date,
      contacted_at: record.contacted_at,
      created_at: record.created_at,
      user_name: record.users?.name,
      user_color: record.users?.color,
    }));

    return NextResponse.json({
      success: true,
      contact_history: contactHistory,
      total: count || 0,
      opportunity_id: opportunityId,
    });
  } catch (error) {
    console.error('Error fetching contact history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST Handler
// ============================================

/**
 * POST /api/opportunities/[id]/contact
 * Log a new contact attempt for a cross-sell opportunity
 *
 * Request body:
 * - user_id: UUID of the agent making the contact (required)
 * - contact_method: 'phone' | 'email' | 'in_person' | 'mail' (required)
 * - contact_outcome: outcome of the contact attempt (required)
 * - notes: free-form notes about the contact (optional)
 * - next_action: description of required follow-up (optional)
 * - next_action_date: when the follow-up should be taken (optional, ISO date string)
 * - contacted_at: when the contact was made (optional, defaults to now)
 *
 * Also updates the parent opportunity's contacted_at, contacted_by, and contact_notes
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

    // Parse request body
    const body: LogContactRequest = await request.json();
    const {
      user_id,
      contact_method,
      contact_outcome,
      notes,
      next_action,
      next_action_date,
      contacted_at,
    } = body;

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(user_id)) {
      return NextResponse.json(
        { error: 'user_id must be a valid UUID' },
        { status: 400 }
      );
    }

    if (!contact_method) {
      return NextResponse.json(
        { error: 'contact_method is required' },
        { status: 400 }
      );
    }

    if (!isValidContactMethod(contact_method)) {
      return NextResponse.json(
        { error: `Invalid contact_method. Must be one of: ${VALID_CONTACT_METHODS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!contact_outcome) {
      return NextResponse.json(
        { error: 'contact_outcome is required' },
        { status: 400 }
      );
    }

    if (!isValidContactOutcome(contact_outcome)) {
      return NextResponse.json(
        { error: `Invalid contact_outcome. Must be one of: ${VALID_CONTACT_OUTCOMES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify opportunity exists (scoped to agency)
    let oppVerifyQuery = supabase
      .from('cross_sell_opportunities')
      .select('id, customer_name')
      .eq('id', opportunityId);

    if (ctx.agencyId) {
      oppVerifyQuery = oppVerifyQuery.eq('agency_id', ctx.agencyId);
    }

    const { data: opportunity, error: oppError } = await oppVerifyQuery.single();

    if (oppError || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    // Verify user exists and get user name
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, color')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build contact history record
    const contactRecord = {
      opportunity_id: opportunityId,
      user_id,
      contact_method,
      contact_outcome,
      notes: notes || null,
      next_action: next_action || null,
      next_action_date: next_action_date || null,
      contacted_at: contacted_at || new Date().toISOString(),
    };

    // Insert contact history record
    const { data: insertedContact, error: insertError } = await supabase
      .from('contact_history')
      .insert(contactRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to log contact:', insertError);
      return NextResponse.json(
        { error: 'Failed to log contact' },
        { status: 500 }
      );
    }

    // Map contact outcome to opportunity contact_outcome field
    // This bridges the detailed tracking outcomes to the simpler opportunity status
    const outcomeMapping: Record<ContactOutcome, string | null> = {
      contacted_interested: 'quoted',        // Interested → move to quoted stage
      contacted_not_interested: 'declined',  // Not interested → mark as declined
      contacted_callback_scheduled: 'callback', // Callback → follow up scheduled
      contacted_wrong_timing: 'callback',    // Wrong timing → try again later
      left_voicemail: 'no_answer',           // Voicemail → needs follow up
      no_answer: 'no_answer',                // No answer → needs retry
      invalid_contact: null,                 // Invalid → data quality issue
      declined_permanently: 'declined',      // Permanent decline → closed
    };

    // Update parent opportunity with latest contact info
    const opportunityUpdate: Record<string, any> = {
      contacted_at: contactRecord.contacted_at,
      contacted_by: user.name,
      contact_notes: notes || null,
    };

    // Set contact_outcome if we have a mapping
    const mappedOutcome = outcomeMapping[contact_outcome];
    if (mappedOutcome) {
      opportunityUpdate.contact_outcome = mappedOutcome;
    }

    // If interested, this is a strong conversion signal - may lead to sale
    // Actual conversion is tracked separately when policy is written
    // Note: 'contacted_interested' maps to 'quoted' status, not immediate sale

    const { error: updateError } = await supabase
      .from('cross_sell_opportunities')
      .update(opportunityUpdate)
      .eq('id', opportunityId);

    if (updateError) {
      console.error('Failed to update opportunity:', updateError);
      // Don't fail the whole request, contact was logged successfully
    }

    // Build response with user info
    const responseContact: ContactHistoryRecord = {
      ...insertedContact,
      user_name: user.name,
      user_color: user.color,
    };

    return NextResponse.json({
      success: true,
      contact: responseContact,
      message: `Contact logged for ${opportunity.customer_name}`,
    });
  } catch (error) {
    console.error('Error logging contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
