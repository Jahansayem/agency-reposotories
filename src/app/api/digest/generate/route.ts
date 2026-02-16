/**
 * Scheduled Digest Generation API
 *
 * Generates daily digests for all users across all agencies at scheduled times (5am and 4pm).
 * Called by an external cron service.
 *
 * Protected by system authentication (CRON_SECRET or API key).
 * This is a system route -- it iterates per-agency and generates
 * digests scoped to each agency's data.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { logger } from '@/lib/logger';
import { withSystemAuth } from '@/lib/agencyAuth';
import type { Todo, ActivityLogEntry } from '@/types/todo';

/**
 * Type for agency_members join with users table
 * Used when fetching members with their user details for digest generation
 */
interface AgencyMemberWithUser {
  user_id: string;
  users: {
    id: string;
    name: string;
  };
}

/**
 * Get today's date in Pacific Time (YYYY-MM-DD format).
 * This is important because cron jobs run in Pacific Time.
 */
function getTodayInPacific(): string {
  const now = new Date();
  const pacificDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  return pacificDate;
}

/**
 * Calculate the UTC equivalent of midnight Pacific time for a given date string (YYYY-MM-DD).
 * Handles PST/PDT transitions automatically using Intl APIs instead of hardcoding UTC-8.
 */
function getPacificMidnightUTC(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  const localDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
  const utcStr = localDate.toLocaleString('en-US', { timeZone: 'UTC' });
  const pacificStr = localDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const offsetMs = new Date(utcStr).getTime() - new Date(pacificStr).getTime();
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]) + offsetMs);
}

// VAPID configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

// Initialize web-push
let webPushInitialized = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    webPushInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize web-push', error as Error, { component: 'digest/generate' });
  }
}

// Response types
export interface DailyDigestTask {
  id: string;
  text: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  status: string;
  subtasks_count: number;
  subtasks_completed: number;
}

export interface DailyDigestResponse {
  greeting: string;
  overdueTasks: {
    count: number;
    summary: string;
    tasks: DailyDigestTask[];
  };
  todaysTasks: {
    count: number;
    summary: string;
    tasks: DailyDigestTask[];
  };
  teamActivity: {
    summary: string;
    highlights: string[];
  };
  focusSuggestion: string;
  generatedAt: string;
}

// Helper functions
function getTimeOfDayGreeting(type: 'morning' | 'afternoon'): string {
  return type === 'morning' ? 'Good morning' : 'Good afternoon';
}

function formatTaskForPrompt(task: Todo): string {
  const subtasksInfo = task.subtasks && task.subtasks.length > 0
    ? ` (${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} subtasks done)`
    : '';
  const assignedInfo = task.assigned_to ? ` [Assigned: ${task.assigned_to}]` : '';
  const dueInfo = task.due_date ? ` [Due: ${new Date(task.due_date).toLocaleDateString()}]` : '';

  return `- ${task.text} (${task.priority} priority)${assignedInfo}${dueInfo}${subtasksInfo}`;
}

function formatActivityForPrompt(activity: ActivityLogEntry): string {
  const time = new Date(activity.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const actionDescriptions: Record<string, string> = {
    task_created: 'created task',
    task_completed: 'completed task',
    task_updated: 'updated task',
    task_deleted: 'deleted task',
    task_reopened: 'reopened task',
    status_changed: 'changed status of',
    priority_changed: 'changed priority of',
    assigned_to_changed: 'reassigned',
    subtask_completed: 'completed subtask on',
    subtask_added: 'added subtask to',
    attachment_added: 'added attachment to',
  };

  const actionText = actionDescriptions[activity.action] || activity.action.replace(/_/g, ' ');
  const taskText = activity.todo_text ? `"${activity.todo_text}"` : '';

  return `- ${time}: ${activity.user_name} ${actionText} ${taskText}`;
}

function transformTask(task: Todo): DailyDigestTask {
  return {
    id: task.id,
    text: task.text,
    priority: task.priority,
    due_date: task.due_date,
    assigned_to: task.assigned_to,
    status: task.status,
    subtasks_count: task.subtasks?.length || 0,
    subtasks_completed: task.subtasks?.filter(s => s.completed).length || 0,
  };
}

// Initialize Supabase client
function getSupabaseClient(): SupabaseClient {
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

// Generate digest for a single user, scoped to their agency
async function generateDigestForUser(
  supabase: SupabaseClient,
  userId: string,
  userName: string,
  agencyId: string | null,
  digestType: 'morning' | 'afternoon'
): Promise<{ digest: DailyDigestResponse; overdueTasks: number; todayTasks: number } | null> {
  const now = new Date();
  const pacificDateStr = getTodayInPacific();
  const todayStart = getPacificMidnightUTC(pacificDateStr);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Build agency-scoped queries inline
  // Each query is built step-by-step to avoid type mismatches
  const buildOverdueQuery = () => {
    let q = supabase.from('todos').select('*').lt('due_date', todayStart.toISOString()).eq('completed', false);
    if (agencyId) q = q.eq('agency_id', agencyId);
    return q.order('due_date', { ascending: true });
  };

  const buildTodayQuery = () => {
    let q = supabase.from('todos').select('*').gte('due_date', todayStart.toISOString()).lt('due_date', todayEnd.toISOString()).eq('completed', false);
    if (agencyId) q = q.eq('agency_id', agencyId);
    return q.order('priority', { ascending: false });
  };

  const buildCompletedQuery = () => {
    let q = supabase.from('todos').select('*').eq('completed', true).gte('updated_at', yesterdayStart.toISOString()).lt('updated_at', todayStart.toISOString());
    if (agencyId) q = q.eq('agency_id', agencyId);
    return q.order('updated_at', { ascending: false });
  };

  const buildActivityQuery = () => {
    let q = supabase.from('activity_log').select('*').gte('created_at', last24Hours.toISOString());
    if (agencyId) q = q.eq('agency_id', agencyId);
    return q.order('created_at', { ascending: false }).limit(50);
  };

  // Run all database queries in parallel, scoped to agency
  const [overdueResult, todayResult, completedResult, activityResult] = await Promise.all([
    buildOverdueQuery(),
    buildTodayQuery(),
    buildCompletedQuery(),
    buildActivityQuery(),
  ]);

  if (overdueResult.error || todayResult.error || completedResult.error || activityResult.error) {
    logger.error('Database query error in digest generation', undefined, {
      component: 'DigestGenerate',
      metadata: {
        overdue: overdueResult.error,
        today: todayResult.error,
        completed: completedResult.error,
        activity: activityResult.error,
      },
    });
    return null;
  }

  const overdueTasksTyped = (overdueResult.data || []) as Todo[];
  const todayTasksTyped = (todayResult.data || []) as Todo[];
  const completedYesterdayTyped = (completedResult.data || []) as Todo[];
  const recentActivityTyped = (activityResult.data || []) as ActivityLogEntry[];

  // Filter tasks relevant to the user
  const userOverdueTasks = overdueTasksTyped.filter(
    t => t.assigned_to === userName || t.created_by === userName || !t.assigned_to
  );
  const userTodayTasks = todayTasksTyped.filter(
    t => t.assigned_to === userName || t.created_by === userName || !t.assigned_to
  );

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build the AI prompt
  const prompt = `You are generating a personalized ${digestType} briefing for ${userName} at Wavezly (an Allstate insurance agency).

Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Here is the current task and activity data:

=== OVERDUE TASKS (${userOverdueTasks.length} tasks) ===
${userOverdueTasks.length > 0
  ? userOverdueTasks.map(formatTaskForPrompt).join('\n')
  : 'No overdue tasks - great job staying on top of things!'}

=== TASKS DUE TODAY (${userTodayTasks.length} tasks) ===
${userTodayTasks.length > 0
  ? userTodayTasks.map(formatTaskForPrompt).join('\n')
  : 'No tasks due today.'}

=== TEAM COMPLETIONS YESTERDAY (${completedYesterdayTyped.length} tasks) ===
${completedYesterdayTyped.length > 0
  ? completedYesterdayTyped.map(t => `- ${t.text} (completed by ${t.updated_by || t.assigned_to || 'team'})`).join('\n')
  : 'No tasks were completed yesterday.'}

=== RECENT TEAM ACTIVITY (last 24 hours) ===
${recentActivityTyped.length > 0
  ? recentActivityTyped.slice(0, 20).map(formatActivityForPrompt).join('\n')
  : 'No recent activity recorded.'}

Based on this data, generate a personalized ${digestType} briefing. Be encouraging, professional, and insurance-industry aware.

Respond with ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "overdueSummary": "A brief 1-2 sentence summary of the overdue situation, with empathy if there are overdue tasks",
  "todaySummary": "A brief 1-2 sentence summary of what's on the plate for today",
  "teamActivitySummary": "A brief 1-2 sentence summary of team activity and momentum",
  "teamHighlights": ["Up to 3 notable team accomplishments or activity highlights"],
  "focusSuggestion": "A helpful, specific recommendation for what ${userName} should focus on ${digestType === 'morning' ? 'first today' : 'before wrapping up'}, based on priorities and urgency. Be actionable and encouraging."
}

Guidelines:
- Keep summaries concise but warm and personalized
- Use insurance terminology naturally when relevant (policies, claims, renewals, etc.)
- If there are urgent/high priority overdue tasks, emphasize those
- For focus suggestion, consider: urgent items first, then high priority, then by due date
- Acknowledge team wins to boost morale
- Be encouraging even if there are challenges
- For afternoon briefings, focus on what's remaining and end-of-day priorities`;

  // Call Claude API
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse the JSON from Claude's response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error('Failed to parse AI response for user', undefined, {
      component: 'DigestGenerate',
      responseText: responseText.substring(0, 500)
    });
    return null;
  }

  let aiResponse;
  try {
    aiResponse = JSON.parse(jsonMatch[0]);
  } catch {
    logger.error('Failed to parse AI response JSON', undefined, {
      component: 'DigestGenerate',
      responseText: responseText.substring(0, 500)
    });
    return null;
  }

  // Build the final response
  const greeting = `${getTimeOfDayGreeting(digestType)}, ${userName}!`;

  const digest: DailyDigestResponse = {
    greeting,
    overdueTasks: {
      count: userOverdueTasks.length,
      summary: String(aiResponse.overdueSummary || 'No overdue tasks.'),
      tasks: userOverdueTasks.slice(0, 10).map(transformTask),
    },
    todaysTasks: {
      count: userTodayTasks.length,
      summary: String(aiResponse.todaySummary || 'No tasks due today.'),
      tasks: userTodayTasks.slice(0, 10).map(transformTask),
    },
    teamActivity: {
      summary: String(aiResponse.teamActivitySummary || 'No recent team activity.'),
      highlights: Array.isArray(aiResponse.teamHighlights)
        ? aiResponse.teamHighlights.map(String).slice(0, 5)
        : [],
    },
    focusSuggestion: String(aiResponse.focusSuggestion || 'Start with your highest priority task.'),
    generatedAt: new Date().toISOString(),
  };

  return {
    digest,
    overdueTasks: userOverdueTasks.length,
    todayTasks: userTodayTasks.length,
  };
}

// Send push notification for digest
async function sendDigestNotification(
  supabase: SupabaseClient,
  userId: string,
  digestType: 'morning' | 'afternoon',
  overdueTasks: number,
  todayTasks: number
): Promise<boolean> {
  if (!webPushInitialized) {
    return false;
  }

  // Get user's web push subscription
  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('platform', 'web');

  if (error || !tokens || tokens.length === 0) {
    return false;
  }

  // Build notification message
  const timeOfDay = digestType === 'morning' ? 'Good morning' : 'Good afternoon';
  let body = timeOfDay + '! ';

  if (overdueTasks > 0 && todayTasks > 0) {
    body += `${todayTasks} task${todayTasks !== 1 ? 's' : ''} due today, ${overdueTasks} overdue. Tap to view your briefing.`;
  } else if (todayTasks > 0) {
    body += `${todayTasks} task${todayTasks !== 1 ? 's' : ''} due today. Tap to view your briefing.`;
  } else if (overdueTasks > 0) {
    body += `${overdueTasks} overdue task${overdueTasks !== 1 ? 's' : ''}. Tap to view your briefing.`;
  } else {
    body += 'Your daily briefing is ready. Tap to view.';
  }

  const payload = {
    title: 'Your Daily Briefing is Ready',
    body,
    type: 'daily_digest',
    url: '/?view=dashboard',
  };

  // Send to all user's subscriptions
  let sent = false;
  for (const { token } of tokens) {
    try {
      const subscription = JSON.parse(token);
      await webpush.sendNotification(subscription, JSON.stringify(payload), {
        TTL: 86400,
        urgency: 'normal',
      });
      sent = true;
    } catch (err) {
      const error = err as { statusCode?: number };
      // Remove invalid subscriptions
      if (error.statusCode === 404 || error.statusCode === 410) {
        await supabase.from('device_tokens').delete().eq('token', token);
      }
    }
  }

  return sent;
}

/**
 * POST /api/digest/generate?type=morning|afternoon
 *
 * Generate daily digests for all users across all agencies and send push notifications.
 * Requires system-level auth (CRON_SECRET or X-API-Key).
 * Iterates per-agency so each user's digest contains only their agency's data.
 */
export const POST = withSystemAuth(async (request: NextRequest) => {
  // Get digest type from query param
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get('type');
  const digestType: 'morning' | 'afternoon' = typeParam === 'afternoon' ? 'afternoon' : 'morning';

  const startTime = Date.now();

  try {
    // Check for Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ANTHROPIC_API_KEY not configured', undefined, { component: 'DigestGenerate' });
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const supabase = getSupabaseClient();

    // Get all active agencies
    const { data: agencies, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('is_active', true);

    // If agencies table doesn't exist or is empty, fall back to non-agency mode
    const hasAgencies = !agencyError && agencies && agencies.length > 0;

    // Results accumulator
    const results: {
      userId: string;
      userName: string;
      agencyId?: string;
      generated: boolean;
      notified: boolean;
      error?: string;
    }[] = [];

    if (hasAgencies) {
      // Multi-tenant mode: generate per-agency digests
      for (const agency of agencies!) {
        // Get active members for this agency
        const { data: members, error: membersError } = await supabase
          .from('agency_members')
          .select('user_id, users!inner(id, name)')
          .eq('agency_id', agency.id)
          .eq('status', 'active');

        if (membersError || !members || members.length === 0) {
          logger.warn(`No active members for agency ${agency.name}`, { component: 'DigestGenerate' });
          continue;
        }

        for (const member of members) {
          const typedMember = member as unknown as AgencyMemberWithUser;
          const user = typedMember.users;
          if (!user) continue;

          try {
            const result = await generateDigestForUser(
              supabase, user.id, user.name, agency.id, digestType
            );

            if (result) {
              // Delete existing digest for this user/type/date/agency to prevent duplicates
              await supabase
                .from('daily_digests')
                .delete()
                .eq('user_id', user.id)
                .eq('digest_type', digestType)
                .eq('agency_id', agency.id)
                .gte('generated_at', getPacificMidnightUTC(getTodayInPacific()).toISOString());

              const { error: insertError } = await supabase
                .from('daily_digests')
                .insert({
                  user_id: user.id,
                  user_name: user.name,
                  digest_type: digestType,
                  digest_data: result.digest,
                  generated_at: new Date().toISOString(),
                  read_at: null,
                  agency_id: agency.id,
                });

              if (insertError) {
                logger.error('Failed to store digest', insertError as Error, {
                  component: 'DigestGenerate',
                  agencyId: agency.id,
                });
                results.push({ userId: user.id, userName: user.name, agencyId: agency.id, generated: false, notified: false, error: `Storage failed: ${insertError.message}` });
                continue;
              }

              // Send push notification
              const notified = await sendDigestNotification(
                supabase, user.id, digestType, result.overdueTasks, result.todayTasks
              );

              results.push({ userId: user.id, userName: user.name, agencyId: agency.id, generated: true, notified });
            } else {
              results.push({ userId: user.id, userName: user.name, agencyId: agency.id, generated: false, notified: false, error: 'Generation failed' });
            }
          } catch (err) {
            const error = err as Error;
            logger.error('Error generating digest for user', error, { component: 'DigestGenerate', agencyId: agency.id });
            results.push({ userId: user.id, userName: user.name, agencyId: agency.id, generated: false, notified: false, error: 'Internal error during generation' });
          }
        }
      }
    } else {
      // Legacy single-tenant mode: get all users directly
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .order('name');

      if (usersError) {
        logger.error('Failed to fetch users', usersError as Error, { component: 'DigestGenerate' });
        return NextResponse.json(
          { success: false, error: 'Failed to fetch users' },
          { status: 500 }
        );
      }

      if (!users || users.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No users to generate digests for',
          generated: 0,
          notified: 0,
        });
      }

      for (const user of users) {
        try {
          const result = await generateDigestForUser(supabase, user.id, user.name, null, digestType);

          if (result) {
            await supabase
              .from('daily_digests')
              .delete()
              .eq('user_id', user.id)
              .eq('digest_type', digestType)
              .gte('generated_at', getPacificMidnightUTC(getTodayInPacific()).toISOString());

            const { error: insertError } = await supabase
              .from('daily_digests')
              .insert({
                user_id: user.id,
                user_name: user.name,
                digest_type: digestType,
                digest_data: result.digest,
                generated_at: new Date().toISOString(),
                read_at: null,
              });

            if (insertError) {
              logger.error('Failed to store digest', insertError as Error, { component: 'DigestGenerate' });
              results.push({ userId: user.id, userName: user.name, generated: false, notified: false, error: `Storage failed: ${insertError.message}` });
              continue;
            }

            const notified = await sendDigestNotification(
              supabase, user.id, digestType, result.overdueTasks, result.todayTasks
            );

            results.push({ userId: user.id, userName: user.name, generated: true, notified });
          } else {
            results.push({ userId: user.id, userName: user.name, generated: false, notified: false, error: 'Generation failed' });
          }
        } catch (err) {
          const error = err as Error;
          logger.error('Error generating digest for user', error, { component: 'DigestGenerate' });
          results.push({ userId: user.id, userName: user.name, generated: false, notified: false, error: 'Internal error during generation' });
        }
      }
    }

    const generated = results.filter(r => r.generated).length;
    const notified = results.filter(r => r.notified).length;
    const failed = results.filter(r => !r.generated).length;

    const duration = Date.now() - startTime;
    logger.performance('Digest generation batch', duration, {
      component: 'DigestGenerate',
      digestType,
      usersProcessed: results.length,
      generated,
      notified,
      failed,
    });

    return NextResponse.json({
      success: true,
      digestType,
      generated,
      notified,
      failed,
      duration: `${duration}ms`,
      results: results.map(r => ({
        userName: r.userName,
        agencyId: r.agencyId,
        generated: r.generated,
        notified: r.notified,
        error: r.error,
      })),
    });

  } catch (error) {
    logger.error('Error in digest generation', error as Error, { component: 'DigestGenerate' });

    return NextResponse.json(
      { success: false, error: 'Failed to generate digests' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/digest/generate
 *
 * Health check endpoint.
 * Requires system-level auth (CRON_SECRET or X-API-Key).
 */
export const GET = withSystemAuth(async (_request: NextRequest) => {
  try {
    const supabase = getSupabaseClient();

    // Count today's digests (using Pacific time for consistency)
    const todayPacific = getPacificMidnightUTC(getTodayInPacific());

    const { count: morningCount } = await supabase
      .from('daily_digests')
      .select('*', { count: 'exact', head: true })
      .eq('digest_type', 'morning')
      .gte('generated_at', todayPacific.toISOString());

    const { count: afternoonCount } = await supabase
      .from('daily_digests')
      .select('*', { count: 'exact', head: true })
      .eq('digest_type', 'afternoon')
      .gte('generated_at', todayPacific.toISOString());

    return NextResponse.json({
      success: true,
      status: 'healthy',
      todayDigests: {
        morning: morningCount || 0,
        afternoon: afternoonCount || 0,
      },
      aiConfigured: !!process.env.ANTHROPIC_API_KEY,
      pushConfigured: webPushInitialized,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Health check failed' },
      { status: 500 }
    );
  }
});
