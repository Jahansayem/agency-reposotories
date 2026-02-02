/**
 * Latest Digest API
 *
 * Fetches the most recent stored digest for a user.
 * Marks the digest as read when fetched.
 * Scoped to the user's agency via withAgencyAuth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { withAgencyAuth, setAgencyContext, type AgencyAuthContext } from '@/lib/agencyAuth';

/**
 * Get today's date in Pacific Time (YYYY-MM-DD format).
 * Uses Intl API to get the actual Pacific date, avoiding UTC/Pacific date mismatch
 * (e.g. at 11pm Pacific, UTC is already the next day).
 */
function getTodayDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

/**
 * Calculate the next scheduled digest time in Pacific Time.
 * Digests are generated at 5 AM and 4 PM Pacific daily.
 * Uses Intl APIs to dynamically compute the UTC offset (handles PST/PDT automatically).
 */
function getNextScheduledTime(): Date {
  const now = new Date();
  // Get current hour in Pacific time
  const pacificHour = parseInt(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }));
  const pacificDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

  let targetHour: number;
  let targetDateStr = pacificDateStr;

  if (pacificHour < 5) {
    targetHour = 5;
  } else if (pacificHour < 16) {
    targetHour = 16;
  } else {
    targetHour = 5;
    // Tomorrow in Pacific time
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    targetDateStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  }

  // Build a date for the target time and compute the Pacific-to-UTC offset dynamically
  const parts = targetDateStr.split('-').map(Number);
  const targetLocal = new Date(parts[0], parts[1] - 1, parts[2], targetHour, 0, 0);
  const utcStr = targetLocal.toLocaleString('en-US', { timeZone: 'UTC' });
  const pacStr = targetLocal.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const offsetMs = new Date(utcStr).getTime() - new Date(pacStr).getTime();

  return new Date(targetLocal.getTime() + offsetMs);
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * GET /api/digest/latest
 *
 * Fetch the latest digest for a user within their agency.
 * Requires valid session via withAgencyAuth.
 *
 * Query params:
 * - markRead: 'true' to mark the digest as read (default: true)
 *
 * Returns:
 * - digest: The full DailyDigestResponse object
 * - digestType: 'morning' or 'afternoon'
 * - generatedAt: When the digest was generated
 * - isNew: Whether this is the first time the user is viewing it
 * - nextScheduled: When the next digest will be generated
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    // Set RLS context for defense-in-depth
    await setAgencyContext(ctx.agencyId, ctx.userId, ctx.userName);

    const { searchParams } = new URL(request.url);
    const markRead = searchParams.get('markRead') !== 'false';

    const supabase = getSupabaseClient();

    // Verify user exists and scope to agency
    let userQuery = supabase
      .from('users')
      .select('id, name')
      .eq('name', ctx.userName);

    if (ctx.agencyId) {
      // Join through agency_members to ensure user belongs to this agency
      // For now, trust the auth context which already verified membership
    }

    const { data: user, error: userError } = await userQuery.single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 403 }
      );
    }

    // Get the most recent digest for this user from today
    const todayPT = getTodayDate();

    let digestQuery = supabase
      .from('daily_digests')
      .select('*')
      .eq('user_id', user.id)
      .eq('digest_date', todayPT)
      .order('generated_at', { ascending: false })
      .limit(1);

    // Scope to agency if the table has agency_id
    if (ctx.agencyId) {
      digestQuery = digestQuery.eq('agency_id', ctx.agencyId);
    }

    const { data: digest, error: digestError } = await digestQuery.single();

    if (digestError && digestError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - that's expected if no digest exists
      logger.error('Error fetching digest', digestError, { component: 'DigestLatest' });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch digest' },
        { status: 500 }
      );
    }

    // No digest found
    if (!digest) {
      return NextResponse.json({
        success: true,
        hasDigest: false,
        message: 'No recent digest available',
        nextScheduled: getNextScheduledTime().toISOString(),
      });
    }

    // Check if this is a new (unread) digest
    const isNew = !digest.read_at;

    // Mark as read if requested and not already read
    if (markRead && isNew) {
      const { error: updateError } = await supabase
        .from('daily_digests')
        .update({ read_at: new Date().toISOString() })
        .eq('id', digest.id);

      if (updateError) {
        logger.error('Error marking digest as read', updateError, { component: 'DigestLatest' });
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      hasDigest: true,
      digest: digest.digest_data,
      digestType: digest.digest_type,
      generatedAt: digest.generated_at,
      isNew,
      nextScheduled: getNextScheduledTime().toISOString(),
    });

  } catch (error) {
    logger.error('Error in digest latest', error, { component: 'DigestLatest' });

    return NextResponse.json(
      { success: false, error: 'Failed to fetch digest' },
      { status: 500 }
    );
  }
});
