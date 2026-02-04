/**
 * Web Push Send API
 *
 * Sends push notifications to web clients using the Web Push protocol.
 * Uses the web-push npm package for proper VAPID authentication and payload encryption.
 */

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';
import { logger } from '@/lib/logger';

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

// Initialize web-push if keys are available
let webPushInitialized = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    webPushInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize web-push', error, { component: 'push-send' });
  }
}

// Create Supabase client with service role (lazy initialization)
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

interface WebPushPayload {
  title: string;
  body: string;
  taskId?: string;
  type?: string;
  url?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface RequestBody {
  type: 'task_assigned' | 'task_due_soon' | 'task_overdue' | 'task_completed' | 'message' | 'generic';
  payload: {
    taskId?: string;
    taskText?: string;
    assignedBy?: string;
    completedBy?: string;
    timeUntil?: string;
    message?: string;
    // Message notification fields
    senderName?: string;
    messageText?: string;
    isDm?: boolean;
  };
  userIds?: string[];
  userNames?: string[];  // Alternative to userIds - will be looked up
}

// Build notification payload based on type
function buildNotificationPayload(
  type: string,
  payload: RequestBody['payload']
): WebPushPayload {
  let title = '';
  let body = '';

  switch (type) {
    case 'task_assigned':
      title = 'New Task Assigned';
      body = `${payload.assignedBy || 'Someone'} assigned you: ${payload.taskText || 'a task'}`;
      break;

    case 'task_due_soon':
      title = 'Task Due Soon';
      body = `"${payload.taskText || 'a task'}" is due ${payload.timeUntil || 'soon'}`;
      break;

    case 'task_overdue':
      title = 'Overdue Task';
      body = `"${payload.taskText || 'a task'}" is overdue`;
      break;

    case 'task_completed':
      title = 'Task Completed';
      body = `${payload.completedBy || 'Someone'} completed: ${payload.taskText || 'a task'}`;
      break;

    case 'message':
      title = payload.isDm ? `Message from ${payload.senderName || 'Someone'}` : `${payload.senderName || 'Someone'} mentioned you`;
      body = payload.messageText || 'New message';
      // Truncate long messages
      if (body.length > 100) {
        body = body.substring(0, 97) + '...';
      }
      break;

    case 'generic':
    default:
      title = 'Notification';
      body = payload.message || 'You have a new notification';
  }

  // Determine URL based on notification type
  let url = '/';
  if (type === 'message') {
    url = '/?chat=open';
  } else if (payload.taskId) {
    url = `/?task=${payload.taskId}`;
  }

  return {
    title,
    body,
    taskId: payload.taskId,
    type,
    url,
  };
}

// Send notification to a single subscription
async function sendToSubscription(
  subscriptionJson: string,
  payload: WebPushPayload
): Promise<{ success: boolean; token: string; error?: string }> {
  try {
    const subscription: PushSubscription = JSON.parse(subscriptionJson);

    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 86400, // 24 hours
      urgency: 'normal',
    });

    return { success: true, token: subscriptionJson };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    logger.error('Web push error', err, { component: 'push-send' });

    // Handle specific errors
    if (err.statusCode === 404 || err.statusCode === 410) {
      // Subscription is no longer valid
      return { success: false, token: subscriptionJson, error: 'UNREGISTERED' };
    }

    return { success: false, token: subscriptionJson, error: err.message || 'Unknown error' };
  }
}

/**
 * POST /api/push-send
 *
 * Send web push notifications to specified users.
 * Restricts notification targets to users within the same agency.
 */
export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  // Validate VAPID configuration
  if (!webPushInitialized) {
    return NextResponse.json(
      { success: false, error: 'VAPID keys not configured' },
      { status: 500 }
    );
  }

  try {
    const body: RequestBody = await request.json();
    const { type, payload, userNames } = body;
    let { userIds } = body;

    // Validate request
    if (!type || !payload) {
      return NextResponse.json(
        { success: false, error: 'Missing type or payload' },
        { status: 400 }
      );
    }

    // Authorization: verify sender identity matches authenticated user
    if (type === 'task_assigned') {
      if (!payload.assignedBy) {
        return NextResponse.json(
          { success: false, error: 'assignedBy is required for task_assigned notifications' },
          { status: 400 }
        );
      }
      if (payload.assignedBy !== ctx.userName) {
        return NextResponse.json(
          { success: false, error: 'Sender identity mismatch' },
          { status: 403 }
        );
      }
    }
    if (type === 'task_completed') {
      if (!payload.completedBy) {
        return NextResponse.json(
          { success: false, error: 'completedBy is required for task_completed notifications' },
          { status: 400 }
        );
      }
      if (payload.completedBy !== ctx.userName) {
        return NextResponse.json(
          { success: false, error: 'Sender identity mismatch' },
          { status: 403 }
        );
      }
    }
    if (type === 'message') {
      if (!payload.senderName) {
        return NextResponse.json(
          { success: false, error: 'senderName is required for message notifications' },
          { status: 400 }
        );
      }
      if (payload.senderName !== ctx.userName) {
        return NextResponse.json(
          { success: false, error: 'Sender identity mismatch' },
          { status: 403 }
        );
      }
    }

    // Initialize Supabase client
    const supabase = getSupabase();

    // Restrict target users to members of the same agency
    // First get all user IDs that are members of this agency
    const { data: agencyMembers } = await supabase
      .from('agency_members')
      .select('user_id')
      .eq('agency_id', ctx.agencyId)
      .eq('status', 'active');

    const agencyMemberIds = new Set((agencyMembers || []).map(m => m.user_id));

    // If userNames provided but not userIds, look up the user IDs
    if ((!userIds || userIds.length === 0) && userNames && userNames.length > 0) {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .in('name', userNames);

      if (userError) {
        logger.error('Error looking up users by name', userError, { component: 'push-send' });
      } else if (users && users.length > 0) {
        userIds = users.map(u => u.id);
      }
    }

    if ((!userIds || userIds.length === 0) && userNames && userNames.length > 0) {
      return NextResponse.json(
        { success: false, error: 'None of the specified users were found' },
        { status: 404 }
      );
    }

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to notify',
        sent: 0,
      });
    }

    // Filter userIds to only include agency members
    const filteredUserIds = userIds.filter(id => agencyMemberIds.has(id));

    // API-009: Return early with error if target list is empty after filtering
    if (filteredUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid target users found in this agency' },
        { status: 400 }
      );
    }

    // Get web push subscriptions for agency-filtered users
    const { data: tokens, error: fetchError } = await supabase
      .from('device_tokens')
      .select('token, user_id')
      .in('user_id', filteredUserIds)
      .eq('platform', 'web');

    if (fetchError) {
      logger.error('Error fetching device tokens', fetchError, { component: 'push-send' });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No web push subscriptions found',
        sent: 0,
      });
    }

    // Build notification payload
    const notificationPayload = buildNotificationPayload(type, payload);

    // Send to all subscriptions
    const results = await Promise.all(
      tokens.map((t) => sendToSubscription(t.token, notificationPayload))
    );

    // Track results
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    const unregistered = failed
      .filter((r) => r.error === 'UNREGISTERED')
      .map((r) => r.token);

    // Remove invalid subscriptions
    if (unregistered.length > 0) {
      const { error: deleteError } = await supabase
        .from('device_tokens')
        .delete()
        .in('token', unregistered);

      if (deleteError) {
        logger.error('Error removing invalid tokens', deleteError, { component: 'push-send' });
      }
    }

    return NextResponse.json({
      success: true,
      sent: successful.length,
      failed: failed.length,
      unregistered: unregistered.length,
    });
  } catch (error) {
    logger.error('Error in push-send', error, { component: 'push-send' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
