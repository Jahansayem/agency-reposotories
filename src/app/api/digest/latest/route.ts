/**
 * Latest Digest API
 *
 * Fetches the most recent stored digest for a user.
 * Marks the digest as read when fetched.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

/**
 * Calculate the next scheduled digest time in Central Time.
 * Digests are generated at 5 AM and 4 PM Central daily.
 */
function getNextScheduledTime(): Date {
  // Get current time in Central Time
  const now = new Date();
  const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const hour = centralTime.getHours();

  // Calculate next scheduled time in Central
  let nextCentral: Date;
  if (hour < 5) {
    // Before 5am CT - next is 5am today
    nextCentral = new Date(centralTime);
    nextCentral.setHours(5, 0, 0, 0);
  } else if (hour < 16) {
    // Between 5am and 4pm CT - next is 4pm today
    nextCentral = new Date(centralTime);
    nextCentral.setHours(16, 0, 0, 0);
  } else {
    // After 4pm CT - next is 5am tomorrow
    nextCentral = new Date(centralTime);
    nextCentral.setDate(nextCentral.getDate() + 1);
    nextCentral.setHours(5, 0, 0, 0);
  }

  // Convert back to UTC for consistent API response
  // Calculate the offset between Central and UTC
  const centralOffset = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', timeZoneName: 'short' });
  const isCDT = centralOffset.includes('CDT');
  const offsetHours = isCDT ? 5 : 6; // CDT is UTC-5, CST is UTC-6

  // Create UTC date from Central time
  const utcDate = new Date(nextCentral);
  utcDate.setHours(utcDate.getHours() + offsetHours);

  return utcDate;
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
 * Fetch the latest digest for a user.
 * Requires X-User-Name header for authentication.
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
export async function GET(request: NextRequest) {
  try {
    // Get user name from header
    const userName = request.headers.get('X-User-Name');

    if (!userName) {
      return NextResponse.json(
        { success: false, error: 'X-User-Name header is required' },
        { status: 400 }
      );
    }

    // Sanitize user name
    const sanitizedUserName = userName.trim();
    if (sanitizedUserName.length === 0 || sanitizedUserName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid user name' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const markRead = searchParams.get('markRead') !== 'false';

    const supabase = getSupabaseClient();

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('name', sanitizedUserName)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 403 }
      );
    }

    // Get the most recent digest for this user (within last 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const { data: digest, error: digestError } = await supabase
      .from('daily_digests')
      .select('*')
      .eq('user_id', user.id)
      .gte('generated_at', twelveHoursAgo)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

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
}
