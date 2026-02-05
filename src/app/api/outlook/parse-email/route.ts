import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { verifyOutlookApiKey, createOutlookCorsPreflightResponse } from '@/lib/outlookAuth';
import { withRateLimit, rateLimiters, createRateLimitResponse } from '@/lib/rateLimit';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Get users from a specific agency via agency_members join
 */
async function getUsersFromAgency(agencyId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: members, error } = await supabase
    .from('agency_members')
    .select(`
      users!inner (
        name
      )
    `)
    .eq('agency_id', agencyId)
    .eq('status', 'active');

  if (error) {
    logger.error('Error fetching agency members for parse-email', error, { component: 'OutlookParseEmailAPI' });
    return [];
  }

  // Extract unique user names from the join result
  const userNames: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (members || []).forEach((m: any) => {
    if (m.users?.name) {
      userNames.push(m.users.name);
    }
  });

  return userNames.sort();
}

/**
 * Get all registered users (fallback when no agency specified)
 */
async function getAllUsers(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: users, error } = await supabase
    .from('users')
    .select('name')
    .order('name');

  if (error) {
    logger.error('Error fetching all users for parse-email', error, { component: 'OutlookParseEmailAPI' });
    return [];
  }

  return (users || []).map((u: { name: string }) => u.name).filter(Boolean);
}

export async function POST(request: NextRequest) {
  // Verify API key (constant-time comparison)
  if (!verifyOutlookApiKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // SECURITY: Rate limit AI operations to prevent abuse
  // Uses the 'ai' limiter: 10 requests per minute per IP
  const rateLimitResult = await withRateLimit(request, rateLimiters.ai);
  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded for Outlook parse-email', {
      component: 'OutlookParseEmailAPI',
    });
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const { subject, body, sender, receivedDate, agency_id } = await request.json();

    if (!subject && !body) {
      return NextResponse.json(
        { success: false, error: 'Email subject or body is required' },
        { status: 400 }
      );
    }

    // Get available users to suggest as assignees
    // If agency_id is provided, only suggest users from that agency
    let availableUsers: string[];
    if (agency_id) {
      availableUsers = await getUsersFromAgency(agency_id);
      if (availableUsers.length === 0) {
        logger.warn('No users found in specified agency for parse-email', {
          component: 'OutlookParseEmailAPI',
          agencyId: agency_id,
        });
        // Fall back to all users if agency has no members
        availableUsers = await getAllUsers();
      }
    } else {
      // Backward compatible: get all users when no agency specified
      availableUsers = await getAllUsers();
    }

    // Build user list for the prompt
    const userListHint = availableUsers.length > 0
      ? `\nAvailable team members who can be assigned tasks: ${availableUsers.join(', ')}`
      : '';

    const prompt = `You are a task extraction assistant for a small business. Analyze this email and extract a clear, actionable task.${userListHint}

Email Subject: ${subject || '(no subject)'}
Email Body: ${body || '(no body)'}
From: ${sender || 'unknown'}
Received: ${receivedDate || 'unknown'}

Extract the following information and respond ONLY with valid JSON (no markdown, no code blocks):
{
  "text": "A clear, concise task description (action-oriented, start with a verb like Review, Send, Call, Schedule, etc.)",
  "suggestedAssignee": "Name of person who should do this task if mentioned${availableUsers.length > 0 ? ' (MUST be one of the available team members listed above)' : ''}, or empty string if not specified",
  "priority": "low, medium, high, or urgent based on urgency indicators in the email",
  "dueDate": "YYYY-MM-DD format if a deadline is mentioned, or empty string if not specified",
  "context": "Brief note about the email source (e.g., 'Email from John Smith regarding Q4 Budget')"
}

Rules:
- Task text should be clear, actionable, and start with a verb
- Look for names mentioned as assignees (e.g., "have Sefra do...", "ask Derek to...", "please tell X to...")${availableUsers.length > 0 ? `\n- IMPORTANT: suggestedAssignee MUST be one of: ${availableUsers.join(', ')} (or empty string if no match)` : ''}
- Look for deadline words: "by Friday", "by end of day", "by December 15", "ASAP", "urgent", "immediately"
- If ASAP, urgent, or immediately is mentioned, set priority to "urgent"
- If a specific date is mentioned, parse it to YYYY-MM-DD format
- If "by Friday" or similar relative date, calculate the actual date from today (${new Date().toISOString().split('T')[0]})
- Keep the context brief (under 50 words)

Respond with ONLY the JSON object, no other text.`;

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('Failed to parse AI response', undefined, { component: 'OutlookParseEmailAPI', responseText });
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    const draft = JSON.parse(jsonMatch[0]);

    // Validate the response structure
    const validatedDraft = {
      text: draft.text || 'Review email and take action',
      suggestedAssignee: draft.suggestedAssignee || '',
      priority: ['low', 'medium', 'high', 'urgent'].includes(draft.priority) ? draft.priority : 'medium',
      dueDate: draft.dueDate || '',
      context: draft.context || `From email by ${sender || 'unknown sender'}`,
    };

    // Validate suggestedAssignee is in the available users list (if agency scoped)
    if (agency_id && validatedDraft.suggestedAssignee && availableUsers.length > 0) {
      if (!availableUsers.includes(validatedDraft.suggestedAssignee)) {
        logger.warn('AI suggested assignee not in agency', {
          component: 'OutlookParseEmailAPI',
          suggestedAssignee: validatedDraft.suggestedAssignee,
          availableUsers,
          agencyId: agency_id,
        });
        // Clear invalid assignee
        validatedDraft.suggestedAssignee = '';
      }
    }

    return NextResponse.json({
      success: true,
      draft: validatedDraft,
      agencyId: agency_id || undefined,
      availableAssignees: availableUsers,
    });
  } catch (error) {
    logger.error('Error parsing email', error, { component: 'OutlookParseEmailAPI' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight - only allow specific Outlook origins
export async function OPTIONS(request: NextRequest) {
  return createOutlookCorsPreflightResponse(request, 'POST, OPTIONS');
}
