import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';
import { logger } from '@/lib/logger';

// Create Supabase client lazily to avoid build-time initialization
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/push-subscribe
 * Store a web push subscription for a user.
 * Push tokens are user-scoped (not agency-scoped) since a device token
 * is valid regardless of which agency the user is viewing.
 */
export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Missing subscription' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Look up the authenticated user's ID from the database
    const { data: userRecord, error: userLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('name', ctx.userName)
      .single();

    if (userLookupError || !userRecord) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userRecord.id;

    // Validate subscription has required fields
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription format' },
        { status: 400 }
      );
    }

    // Store the full subscription as JSON string in the token field
    const subscriptionToken = JSON.stringify(subscription);

    // Delete existing web tokens for this user, then insert the new one
    const { error: deleteError } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'web');

    if (deleteError) {
      logger.error('Error deleting old subscription', deleteError, { component: 'push-subscribe' });
    }

    const { error } = await supabase
      .from('device_tokens')
      .insert({
        user_id: userId,
        token: subscriptionToken,
        platform: 'web',
        updated_at: new Date().toISOString(),
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true });
      }
      logger.error('Error storing push subscription', error, { component: 'push-subscribe' });
      return NextResponse.json(
        { success: false, error: 'Failed to store subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in POST /api/push-subscribe', error, { component: 'push-subscribe' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/push-subscribe
 * Remove a web push subscription for a user
 */
export const DELETE = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json();
    const { subscription } = body;

    const supabase = getSupabase();

    // Look up the authenticated user's ID
    const { data: userRecord, error: userLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('name', ctx.userName)
      .single();

    if (userLookupError || !userRecord) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userRecord.id;

    if (subscription) {
      const subscriptionToken = JSON.stringify(subscription);

      const { error } = await supabase
        .from('device_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', subscriptionToken)
        .eq('platform', 'web');

      if (error) {
        logger.error('Error removing push subscription', error, { component: 'push-subscribe' });
        return NextResponse.json(
          { success: false, error: 'Failed to remove subscription' },
          { status: 500 }
        );
      }
    } else {
      // Remove all web subscriptions for user
      const { error } = await supabase
        .from('device_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('platform', 'web');

      if (error) {
        logger.error('Error removing push subscriptions', error, { component: 'push-subscribe' });
        return NextResponse.json(
          { success: false, error: 'Failed to remove subscriptions' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/push-subscribe', error, { component: 'push-subscribe' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/push-subscribe
 * Check if user has an active web push subscription
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabase();

    // Look up the authenticated user's ID
    const { data: userRecord, error: userLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('name', ctx.userName)
      .single();

    if (userLookupError || !userRecord) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userRecord.id;
    const { data, error } = await supabase
      .from('device_tokens')
      .select('id, platform, updated_at')
      .eq('user_id', userId)
      .eq('platform', 'web')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error checking subscription', error, { component: 'push-subscribe' });
      return NextResponse.json(
        { success: false, error: 'Failed to check subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscribed: !!data,
      lastUpdated: data?.updated_at || null,
    });
  } catch (error) {
    logger.error('Error in GET /api/push-subscribe', error, { component: 'push-subscribe' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
