import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import {
  validateAiRequest,
  callClaude,
  parseAiJsonResponse,
  aiErrorResponse,
  aiSuccessResponse,
  isAiConfigured,
  withAiErrorHandling,
} from '@/lib/aiApiHelper';
import { withAgencyAuth, AgencyAuthContext } from '@/lib/agencyAuth';
import type { Todo, ActivityLogEntry } from '@/types/todo';

// Initialize Supabase client with service role for server-side queries
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

// Helper to get time of day greeting
function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Helper to format task for AI prompt
function formatTaskForPrompt(task: Todo): string {
  const subtasksInfo =
    task.subtasks && task.subtasks.length > 0
      ? ` (${task.subtasks.filter((s) => s.completed).length}/${task.subtasks.length} subtasks done)`
      : '';
  const assignedInfo = task.assigned_to ? ` [Assigned: ${task.assigned_to}]` : '';
  const dueInfo = task.due_date ? ` [Due: ${new Date(task.due_date).toLocaleDateString()}]` : '';

  return `- ${task.text} (${task.priority} priority)${assignedInfo}${dueInfo}${subtasksInfo}`;
}

// Helper to format activity for AI prompt
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

// Transform Todo to DailyDigestTask
function transformTask(task: Todo): DailyDigestTask {
  return {
    id: task.id,
    text: task.text,
    priority: task.priority,
    due_date: task.due_date,
    assigned_to: task.assigned_to,
    status: task.status,
    subtasks_count: task.subtasks?.length || 0,
    subtasks_completed: task.subtasks?.filter((s) => s.completed).length || 0,
  };
}

function buildPrompt(
  userName: string,
  userOverdueTasks: Todo[],
  userTodayTasks: Todo[],
  completedYesterday: Todo[],
  recentActivity: ActivityLogEntry[]
): string {
  const now = new Date();

  return `You are generating a personalized daily briefing for ${userName} at Bealer Agency (an Allstate insurance agency).

Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Here is the current task and activity data:

=== OVERDUE TASKS (${userOverdueTasks.length} tasks) ===
${
  userOverdueTasks.length > 0
    ? userOverdueTasks.map(formatTaskForPrompt).join('\n')
    : 'No overdue tasks - great job staying on top of things!'
}

=== TASKS DUE TODAY (${userTodayTasks.length} tasks) ===
${
  userTodayTasks.length > 0
    ? userTodayTasks.map(formatTaskForPrompt).join('\n')
    : 'No tasks due today.'
}

=== TEAM COMPLETIONS YESTERDAY (${completedYesterday.length} tasks) ===
${
  completedYesterday.length > 0
    ? completedYesterday.map((t) => `- ${t.text} (completed by ${t.updated_by || t.assigned_to || 'team'})`).join('\n')
    : 'No tasks were completed yesterday.'
}

=== RECENT TEAM ACTIVITY (last 24 hours) ===
${
  recentActivity.length > 0
    ? recentActivity.slice(0, 20).map(formatActivityForPrompt).join('\n')
    : 'No recent activity recorded.'
}

Based on this data, generate a personalized daily briefing. Be encouraging, professional, and insurance-industry aware.

Respond with ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "overdueSummary": "A brief 1-2 sentence summary of the overdue situation, with empathy if there are overdue tasks",
  "todaySummary": "A brief 1-2 sentence summary of what's on the plate for today",
  "teamActivitySummary": "A brief 1-2 sentence summary of team activity and momentum",
  "teamHighlights": ["Up to 3 notable team accomplishments or activity highlights"],
  "focusSuggestion": "A helpful, specific recommendation for what ${userName} should focus on first today, based on priorities and urgency. Be actionable and encouraging."
}

Guidelines:
- Keep summaries concise but warm and personalized
- Use insurance terminology naturally when relevant (policies, claims, renewals, etc.)
- If there are urgent/high priority overdue tasks, emphasize those
- For focus suggestion, consider: urgent items first, then high priority, then by due date
- Acknowledge team wins to boost morale
- Be encouraging even if there are challenges`;
}

/**
 * Build database queries with optional agency filtering for multi-tenancy
 */
function buildTodosQuery(
  supabase: ReturnType<typeof getSupabaseClient>,
  agencyId: string | undefined
) {
  const query = supabase.from('todos').select('*');
  // Apply agency filter if provided (multi-tenancy support)
  if (agencyId) {
    return query.eq('agency_id', agencyId);
  }
  return query;
}

function buildActivityQuery(
  supabase: ReturnType<typeof getSupabaseClient>,
  agencyId: string | undefined
) {
  const query = supabase.from('activity_log').select('*');
  // Apply agency filter if provided (multi-tenancy support)
  if (agencyId) {
    return query.eq('agency_id', agencyId);
  }
  return query;
}

async function handleDailyDigest(
  request: NextRequest,
  ctx: AgencyAuthContext
): Promise<NextResponse> {
  const startTime = Date.now();

  // Validate request
  const validation = await validateAiRequest(request);

  if (!validation.valid) {
    return validation.response!;
  }

  const { userName } = validation.body as { userName?: string };

  // Input validation: userName is required and must be a non-empty string
  if (!userName || typeof userName !== 'string') {
    return aiErrorResponse('userName is required', 400);
  }

  // Input sanitization: trim whitespace and validate length/format
  const sanitizedUserName = userName.trim();
  if (sanitizedUserName.length === 0 || sanitizedUserName.length > 100) {
    return aiErrorResponse('Invalid userName format', 400);
  }

  // Validate userName contains only allowed characters (alphanumeric, spaces, common punctuation)
  const validUserNamePattern = /^[a-zA-Z0-9\s\-_.]+$/;
  if (!validUserNamePattern.test(sanitizedUserName)) {
    return aiErrorResponse('Invalid userName format', 400);
  }

  // Authorization check: Verify the user exists in the database
  // This prevents data enumeration and ensures only valid users can request digests
  const supabaseForAuth = getSupabaseClient();
  const { data: userRecord, error: userError } = await supabaseForAuth
    .from('users')
    .select('id, name')
    .eq('name', sanitizedUserName)
    .single();

  if (userError || !userRecord) {
    // Use generic error message to prevent user enumeration
    return aiErrorResponse('Unable to generate digest', 403);
  }

  // Check for API key
  if (!isAiConfigured()) {
    logger.error('ANTHROPIC_API_KEY not configured', undefined, { component: 'DailyDigestAPI' });
    return aiErrorResponse('AI service not configured', 500);
  }

  const supabase = getSupabaseClient();

  // Get agency ID from context (empty string if multi-tenancy is disabled)
  const agencyId = ctx.agencyId || undefined;

  // Get today's date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Run all 4 database queries in parallel for better performance
  // SECURITY: All queries are scoped to the user's agency via agencyId filter
  const [overdueResult, todayResult, completedResult, activityResult] = await Promise.all([
    // Query 1: Overdue tasks (due_date < today, not completed)
    buildTodosQuery(supabase, agencyId)
      .lt('due_date', todayStart.toISOString())
      .eq('completed', false)
      .order('due_date', { ascending: true }),

    // Query 2: Tasks due today (not completed)
    buildTodosQuery(supabase, agencyId)
      .gte('due_date', todayStart.toISOString())
      .lt('due_date', todayEnd.toISOString())
      .eq('completed', false)
      .order('priority', { ascending: false }),

    // Query 3: Tasks completed yesterday by the team
    buildTodosQuery(supabase, agencyId)
      .eq('completed', true)
      .gte('updated_at', yesterdayStart.toISOString())
      .lt('updated_at', todayStart.toISOString())
      .order('updated_at', { ascending: false }),

    // Query 4: Recent activity log entries (last 24 hours)
    buildActivityQuery(supabase, agencyId)
      .gte('created_at', last24Hours.toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Check for errors
  if (overdueResult.error) {
    logger.error('Failed to fetch overdue tasks', overdueResult.error, { component: 'DailyDigestAPI' });
    throw overdueResult.error;
  }
  if (todayResult.error) {
    logger.error('Failed to fetch today tasks', todayResult.error, { component: 'DailyDigestAPI' });
    throw todayResult.error;
  }
  if (completedResult.error) {
    logger.error('Failed to fetch completed tasks', completedResult.error, { component: 'DailyDigestAPI' });
    throw completedResult.error;
  }
  if (activityResult.error) {
    logger.error('Failed to fetch activity log', activityResult.error, { component: 'DailyDigestAPI' });
    throw activityResult.error;
  }

  // Prepare data for AI prompt
  const overdueTasksTyped = (overdueResult.data || []) as Todo[];
  const todayTasksTyped = (todayResult.data || []) as Todo[];
  const completedYesterdayTyped = (completedResult.data || []) as Todo[];
  const recentActivityTyped = (activityResult.data || []) as ActivityLogEntry[];

  // Filter tasks relevant to the user (assigned to them or created by them)
  const userOverdueTasks = overdueTasksTyped.filter(
    (t) => t.assigned_to === sanitizedUserName || t.created_by === sanitizedUserName || !t.assigned_to
  );
  const userTodayTasks = todayTasksTyped.filter(
    (t) => t.assigned_to === sanitizedUserName || t.created_by === sanitizedUserName || !t.assigned_to
  );

  // Build the AI prompt
  const prompt = buildPrompt(
    sanitizedUserName,
    userOverdueTasks,
    userTodayTasks,
    completedYesterdayTyped,
    recentActivityTyped
  );

  // Call Claude API
  const aiResult = await callClaude({
    userMessage: prompt,
    maxTokens: 1024,
    component: 'DailyDigestAPI',
  });

  if (!aiResult.success) {
    return aiErrorResponse('Failed to generate daily digest', 500, aiResult.error);
  }

  // Parse the JSON from Claude's response
  const aiResponse = parseAiJsonResponse<{
    overdueSummary?: string;
    todaySummary?: string;
    teamActivitySummary?: string;
    teamHighlights?: string[];
    focusSuggestion?: string;
  }>(aiResult.content);

  if (!aiResponse) {
    logger.error('Failed to parse AI response', undefined, {
      component: 'DailyDigestAPI',
      responseText: aiResult.content.substring(0, 500),
    });
    return aiErrorResponse('Failed to parse AI response', 500);
  }

  // Build the final response
  const greeting = `${getTimeOfDayGreeting()}, ${sanitizedUserName}!`;

  const response: DailyDigestResponse = {
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

  // Store the generated digest in the daily_digests table so it persists across page loads
  const hour = new Date().getHours();
  const digestType = hour < 12 ? 'morning' : 'afternoon';

  try {
    // First delete any existing digest for this user/type/today, then insert fresh
    // We can't use upsert because digest_date is a generated column
    // digest_date is generated by the DB using CURRENT_DATE (UTC), so we use UTC date for the filter
    const todayUTC = new Date().toISOString().split('T')[0];

    // Build delete query with agency filter
    let deleteQuery = supabase
      .from('daily_digests')
      .delete()
      .eq('user_id', userRecord.id)
      .eq('digest_type', digestType)
      .eq('digest_date', todayUTC);

    if (agencyId) {
      deleteQuery = deleteQuery.eq('agency_id', agencyId);
    }

    await deleteQuery;

    // Build insert with agency_id if multi-tenancy is enabled
    const insertData: Record<string, unknown> = {
      user_id: userRecord.id,
      user_name: sanitizedUserName,
      digest_type: digestType,
      digest_data: response,
      generated_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
      // digest_date will default to CURRENT_DATE in database
    };

    if (agencyId) {
      insertData.agency_id = agencyId;
    }

    const { error: insertError } = await supabase
      .from('daily_digests')
      .insert(insertData);

    if (insertError) {
      // Log but don't fail the request - the user still gets their digest
      logger.error('Failed to store on-demand digest', insertError, {
        component: 'DailyDigestAPI',
        errorCode: insertError.code,
        errorMessage: insertError.message,
        errorDetails: insertError.details,
      });
    }
  } catch (storeErr) {
    logger.error('Error storing on-demand digest', storeErr, {
      component: 'DailyDigestAPI',
    });
  }

  // Log performance - SEC-03 compliant: no PII (userName) in logs
  const duration = Date.now() - startTime;
  logger.performance('DailyDigest generation', duration, {
    component: 'DailyDigestAPI',
    // Note: userName intentionally omitted to comply with SEC-03 (No PII in logs)
    overdueTasks: userOverdueTasks.length,
    todayTasks: userTodayTasks.length,
    agencyId: agencyId || 'none',
  });

  return aiSuccessResponse(response);
}

// Wrap with agency auth to ensure proper multi-tenancy isolation
// and with AI error handling for consistent error responses
export const POST = withAiErrorHandling(
  'DailyDigestAPI',
  withAgencyAuth(handleDailyDigest)
);
