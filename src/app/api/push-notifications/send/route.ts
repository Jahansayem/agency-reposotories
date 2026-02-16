import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';
import { logger } from '@/lib/logger';

/**
 * API: Send Push Notification
 * Sprint 3 Issue #36: Push Notifications
 *
 * Sends a push notification to specified user(s).
 * Requires authenticated session with agency context.
 * Notification targets are restricted to users in the same agency.
 *
 * POST /api/push-notifications/send
 * Body: {
 *   userId: string | string[],  // User ID(s) to send to
 *   title: string,
 *   body: string,
 *   type: 'task_reminder' | 'mention' | 'task_assigned' | 'daily_digest',
 *   url?: string,
 *   taskId?: string,
 *   messageId?: string,
 *   data?: object,
 * }
 */

// Lazy initialization of Supabase client (only when API is called)
async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@wavezly.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('VAPID keys not configured - push notifications will not work');
}

interface SendPushRequest {
  userId: string | string[];
  title: string;
  body: string;
  type: 'task_reminder' | 'mention' | 'task_assigned' | 'daily_digest';
  url?: string;
  taskId?: string;
  messageId?: string;
  data?: object;
  requireInteraction?: boolean;
}

async function handleSendPush(request: NextRequest, ctx: AgencyAuthContext) {
  try {
    // Parse request body
    const body: SendPushRequest = await request.json();
    const {
      userId,
      title,
      body: notificationBody,
      type,
      url,
      taskId,
      messageId,
      data,
      requireInteraction = false,
    } = body;

    // Validate required fields
    if (!userId || !title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      );
    }

    // Normalize userId to array
    const userIds = Array.isArray(userId) ? userId : [userId];

    // Validate VAPID keys
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured (missing VAPID keys)' },
        { status: 500 }
      );
    }

    // Restrict notification targets to users in the same agency
    const supabase = await getSupabaseClient();
    if (ctx.agencyId) {
      const { data: agencyMembers } = await supabase
        .from('agency_members')
        .select('user_id')
        .eq('agency_id', ctx.agencyId)
        .eq('status', 'active');

      const allowedUserIds = new Set((agencyMembers || []).map((m: any) => m.user_id));
      const blockedIds = userIds.filter(uid => !allowedUserIds.has(uid));

      if (blockedIds.length > 0) {
        return NextResponse.json(
          { error: 'Cannot send notifications to users outside your agency' },
          { status: 403 }
        );
      }
    }

    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    // Send to each user
    for (const uid of userIds) {
      try {
        // Get user's push subscriptions
        const { data: subscriptions, error: fetchError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', uid)
          .eq('is_active', true);

        if (fetchError) {
          logger.error('Failed to fetch subscriptions', fetchError, { component: 'push-notifications/send', action: 'fetchSubscriptions', userId: uid });
          results.push({ userId: uid, success: false, error: 'Failed to fetch subscriptions' });
          continue;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No active subscriptions for user ${uid}`);
          results.push({ userId: uid, success: false, error: 'No active subscriptions' });
          continue;
        }

        // Prepare notification payload
        const payload = JSON.stringify({
          title,
          body: notificationBody,
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
          tag: taskId || messageId || type,
          requireInteraction,
          data: {
            url: url || '/',
            type,
            taskId,
            messageId,
            ...data,
          },
          actions: type === 'daily_digest'
            ? [
                { action: 'view', title: 'View Briefing' },
                { action: 'dismiss', title: 'Dismiss' },
              ]
            : [
                { action: 'view', title: 'View' },
                { action: 'dismiss', title: 'Dismiss' },
              ],
        });

        // Send to all user's subscriptions
        let sentCount = 0;
        let failedCount = 0;

        for (const sub of subscriptions) {
          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh_key,
                auth: sub.auth_key,
              },
            };

            await webpush.sendNotification(pushSubscription, payload);
            sentCount++;

            // Update last_used_at
            await supabase
              .from('push_subscriptions')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', sub.id);

          } catch (error: any) {
            logger.error('Failed to send to subscription', error, { component: 'push-notifications/send', action: 'sendNotification', userId: uid, subscriptionId: sub.id });
            failedCount++;

            // If subscription is invalid/expired, mark as inactive
            if (error.statusCode === 410 || error.statusCode === 404) {
              await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('id', sub.id);
            }
          }
        }

        // Log notification
        await supabase.from('notification_log').insert({
          user_id: uid,
          notification_type: type,
          title,
          body: notificationBody,
          task_id: taskId || null,
          message_id: messageId || null,
          status: sentCount > 0 ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          error_message: sentCount === 0 ? 'All subscriptions failed' : undefined,
          data: data || {},
        });

        results.push({
          userId: uid,
          success: sentCount > 0,
          error: sentCount === 0 ? `Failed to send to ${failedCount} subscription(s)` : undefined,
        });

      } catch (error) {
        logger.error('Error sending to user', error as Error, { component: 'push-notifications/send', action: 'sendToUser', userId: uid });
        results.push({
          userId: uid,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      sent: successCount,
      failed: failCount,
      results,
    });

  } catch (error) {
    logger.error('Send push notification error', error as Error, { component: 'push-notifications/send', action: 'handleSendPush' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send push notification' },
      { status: 500 }
    );
  }
}

export const POST = withAgencyAuth(handleSendPush);
