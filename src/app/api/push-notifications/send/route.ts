import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

/**
 * API: Send Push Notification
 * Sprint 3 Issue #36: Push Notifications
 *
 * Sends a push notification to specified user(s).
 * Requires authentication (service role or valid user session).
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

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@bealeragency.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('⚠️ VAPID keys not configured - push notifications will not work');
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

export async function POST(request: NextRequest) {
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
          console.error('Failed to fetch subscriptions:', fetchError);
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
            console.error('Failed to send to subscription:', error);
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
        console.error(`Error sending to user ${uid}:`, error);
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
    console.error('Send push notification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send push notification' },
      { status: 500 }
    );
  }
}
