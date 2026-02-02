import { NextRequest } from 'next/server';
import {
  validateAiRequest,
  callClaude,
  parseAiJsonResponse,
  aiErrorResponse,
  aiSuccessResponse,
  validators,
  dateHelpers,
  withAiErrorHandling,
} from '@/lib/aiApiHelper';
import { logger } from '@/lib/logger';
import { withSessionAuth } from '@/lib/agencyAuth';

interface EnhancedTask {
  text: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  assignedTo: string;
  wasEnhanced: boolean;
}

function buildPrompt(text: string, userList: string, today: string, dayOfWeek: string): string {
  return `You are a task enhancement assistant for a small business team. Take the user's task input and improve it.

User's task input: "${text}"

Today's date: ${today} (${dayOfWeek})
Team members: ${userList}

Analyze the input and respond ONLY with valid JSON (no markdown, no code blocks):
{
  "text": "A clear, concise, action-oriented task description. Start with a verb (Review, Send, Call, Schedule, Complete, etc.). Fix spelling/grammar. Make vague tasks specific if possible.",
  "priority": "low, medium, high, or urgent - based on urgency words in the input",
  "dueDate": "YYYY-MM-DD format if a deadline is mentioned or implied, otherwise empty string",
  "assignedTo": "Name of team member if mentioned or clearly implied, otherwise empty string",
  "wasEnhanced": true or false - whether any meaningful changes were made
}

Rules:
- PRESERVE the original intent - don't add tasks the user didn't mention
- If input is already clear and specific, keep it mostly as-is (set wasEnhanced to false)
- Fix obvious typos and grammar issues
- Parse relative dates: "tomorrow", "next week", "by Friday", "end of month", "in 3 days"
- Detect urgency: "ASAP", "urgent", "immediately", "critical" = urgent priority
- Detect high priority: "important", "priority", "soon" = high priority
- If no urgency mentioned, default to medium priority
- Only suggest assignee if a team member name is explicitly mentioned in the input
- Keep tasks concise (under 100 characters when possible)

Examples:
- "call john tmrw" -> { "text": "Call John", "dueDate": "2024-01-16", "priority": "medium", "assignedTo": "", "wasEnhanced": true }
- "ASAP review budget" -> { "text": "Review budget", "priority": "urgent", "dueDate": "", "assignedTo": "", "wasEnhanced": true }
- "have sefra check invoices by friday" -> { "text": "Check invoices", "priority": "medium", "dueDate": "2024-01-19", "assignedTo": "Sefra", "wasEnhanced": true }
- "Send email to client" -> { "text": "Send email to client", "priority": "medium", "dueDate": "", "assignedTo": "", "wasEnhanced": false }

Respond with ONLY the JSON object, no other text.`;
}

async function handleEnhanceTask(request: NextRequest) {
  // Validate request
  const validation = await validateAiRequest(request, {
    customValidator: (body) => {
      if (!body.text || typeof body.text !== 'string') {
        return 'Task text is required';
      }
      return null;
    },
  });

  if (!validation.valid) {
    return validation.response;
  }

  const { text, users } = validation.body as { text: string; users?: string[] };

  const userList = dateHelpers.formatUserList(users);
  const today = dateHelpers.getTodayISO();
  const dayOfWeek = dateHelpers.getDayOfWeek();

  // Build prompt and call Claude
  const prompt = buildPrompt(text, userList, today, dayOfWeek);

  const aiResult = await callClaude({
    userMessage: prompt,
    maxTokens: 300,
    component: 'EnhanceTaskAPI',
  });

  if (!aiResult.success) {
    return aiErrorResponse('Failed to enhance task', 500, aiResult.error);
  }

  // Parse the JSON response
  const enhanced = parseAiJsonResponse<{
    text?: string;
    priority?: string;
    dueDate?: string;
    assignedTo?: string;
    wasEnhanced?: boolean;
  }>(aiResult.content);

  if (!enhanced) {
    logger.error('Failed to parse AI response', undefined, {
      component: 'EnhanceTaskAPI',
      responseText: aiResult.content,
    });
    return aiErrorResponse('Failed to parse AI response', 500);
  }

  // Validate the response structure
  const validatedResult: EnhancedTask = {
    text: enhanced.text || text,
    priority: validators.sanitizePriority(enhanced.priority),
    dueDate: enhanced.dueDate || '',
    assignedTo: enhanced.assignedTo || '',
    wasEnhanced: Boolean(enhanced.wasEnhanced),
  };

  return aiSuccessResponse({ enhanced: validatedResult });
}

export const POST = withAiErrorHandling('EnhanceTaskAPI', withSessionAuth(async (request) => {
  return handleEnhanceTask(request);
}));
