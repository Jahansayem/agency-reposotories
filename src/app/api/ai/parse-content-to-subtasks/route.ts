import { NextRequest } from 'next/server';
import {
  validateAiRequest,
  callClaude,
  parseAiJsonResponse,
  aiErrorResponse,
  aiSuccessResponse,
  isAiConfigured,
  validators,
  dateHelpers,
  withAiErrorHandling,
  ParsedSubtask,
} from '@/lib/aiApiHelper';
import { logger } from '@/lib/logger';

function buildPrompt(
  content: string,
  contentTypeLabel: string,
  parentTaskText: string | undefined,
  today: string
): string {
  return `You are a task extraction assistant. Analyze this ${contentTypeLabel} and extract ALL distinct action items as subtasks for a parent task.

${parentTaskText ? `Parent task context: "${parentTaskText}"` : ''}

${contentTypeLabel.charAt(0).toUpperCase() + contentTypeLabel.slice(1)} content:
"""
${content}
"""

Today's date: ${today}

Extract actionable items from this content as subtasks. Look for:
- Explicit requests or instructions
- Questions that need answers (turn into "Respond to..." tasks)
- Deadlines or follow-ups mentioned
- Items to review, send, call, schedule, prepare, etc.
- Any commitments or promises made

For each subtask provide:
1. A clear, actionable description (start with action verb: Review, Call, Send, Schedule, Prepare, Follow up, etc.)
2. Priority (low, medium, high, urgent) - infer from language urgency
3. Estimated minutes to complete (5, 10, 15, 30, 45, 60, 90, 120)

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "subtasks": [
    {
      "text": "Action item description",
      "priority": "medium",
      "estimatedMinutes": 15
    }
  ],
  "summary": "Brief summary of what this content is about"
}

Rules:
- Extract 2-10 subtasks depending on content complexity
- Each subtask should be independently completable
- Keep subtask text under 100 characters
- Order by logical sequence or priority
- If the content mentions specific deadlines, note urgency in priority
- Don't create redundant or overly granular subtasks
- If content is conversational, focus on action items, not statements

Respond with ONLY the JSON object.`;
}

/**
 * Fallback parsing when AI is not available
 */
function fallbackParse(content: string): ParsedSubtask[] {
  // Split by sentences/newlines as fallback
  const lines = content
    .split(/[.\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 5 && line.length < 200);

  const fallbackSubtasks: ParsedSubtask[] = lines.slice(0, 8).map((line) => ({
    text: line,
    priority: 'medium' as const,
  }));

  return fallbackSubtasks.length > 0
    ? fallbackSubtasks
    : [{ text: content.slice(0, 200), priority: 'medium' as const }];
}

async function handleParseContentToSubtasks(request: NextRequest) {
  // Validate request
  const validation = await validateAiRequest(request, {
    customValidator: (body) => {
      if (!body.content || typeof body.content !== 'string') {
        return 'Content is required';
      }
      if ((body.content as string).trim().length < 10) {
        return 'Content is too short to parse into subtasks';
      }
      return null;
    },
  });

  if (!validation.valid) {
    return validation.response;
  }

  const { content, contentType, parentTaskText } = validation.body as {
    content: string;
    contentType?: string;
    parentTaskText?: string;
  };

  // If AI not configured, return a simple fallback
  if (!isAiConfigured()) {
    return aiSuccessResponse({ subtasks: fallbackParse(content) });
  }

  const today = dateHelpers.getTodayISO();
  const contentTypeLabel =
    contentType === 'email'
      ? 'email'
      : contentType === 'voicemail'
        ? 'voicemail transcription'
        : 'message';

  // Build prompt and call Claude
  const prompt = buildPrompt(content, contentTypeLabel, parentTaskText, today);

  const aiResult = await callClaude({
    userMessage: prompt,
    maxTokens: 1200,
    component: 'ParseContentToSubtasksAPI',
  });

  if (!aiResult.success) {
    return aiErrorResponse('Failed to parse content', 500, aiResult.error);
  }

  // Parse the JSON response
  const result = parseAiJsonResponse<{
    subtasks?: Array<{ text?: string; priority?: string; estimatedMinutes?: number }>;
    summary?: string;
  }>(aiResult.content);

  if (!result) {
    logger.error('Failed to parse AI response', undefined, {
      component: 'ParseContentToSubtasksAPI',
      responseText: aiResult.content,
    });
    return aiErrorResponse('Failed to parse AI response', 500);
  }

  // Validate and clean up the response
  const validatedSubtasks: ParsedSubtask[] = (result.subtasks || [])
    .slice(0, 10)
    .map((subtask) => ({
      text: String(subtask.text || '').slice(0, 200),
      priority: validators.sanitizePriority(subtask.priority),
      estimatedMinutes: validators.clampEstimatedMinutes(subtask.estimatedMinutes),
    }))
    .filter((subtask) => subtask.text.length > 0);

  if (validatedSubtasks.length === 0) {
    return aiErrorResponse('Could not extract any action items from this content', 400);
  }

  return aiSuccessResponse({
    subtasks: validatedSubtasks,
    summary: String(result.summary || '').slice(0, 300),
  });
}

export const POST = withAiErrorHandling(
  'ParseContentToSubtasksAPI',
  handleParseContentToSubtasks
);
