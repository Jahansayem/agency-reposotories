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
  ParsedSubtask,
} from '@/lib/aiApiHelper';
import { logger } from '@/lib/logger';
import {
  analyzeTaskPattern,
  getAllPatternDefinitions,
  getCompletionRateWarning,
} from '@/lib/insurancePatterns';
import { withSessionAuth } from '@/lib/agencyAuth';

export interface Subtask {
  text: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedMinutes?: number;
}

function buildPrompt(
  text: string,
  userList: string,
  insuranceContext: string
): string {
  return `You are a task breakdown assistant for Wavezly, an Allstate insurance agency. Take a task and break it down into actionable subtasks.

Main task: "${text}"
${insuranceContext}

Team members: ${userList}

INSURANCE AGENCY CONTEXT:
You're helping an insurance agency team. Common task types and their typical subtasks:

${getAllPatternDefinitions()}

Analyze the task and break it down into 2-6 specific, actionable subtasks. Each subtask should be:
- A single, concrete action
- Completable in one sitting
- Starting with an action verb
- Relevant to insurance agency workflows

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "subtasks": [
    {
      "text": "Clear, specific action starting with a verb",
      "priority": "low, medium, high, or urgent",
      "estimatedMinutes": estimated time in minutes (5, 10, 15, 30, 60, etc.)
    }
  ],
  "summary": "Brief 1-sentence summary of what completing these subtasks accomplishes",
  "category": "detected category name or null"
}

Rules:
- Create 2-6 subtasks depending on task complexity
- Use the detected category's suggested subtasks as a starting point, but customize for the specific task
- Simple tasks might only need 2-3 subtasks
- Complex tasks can have up to 6 subtasks
- Each subtask should be independently completable
- Order subtasks logically (dependencies first)
- Inherit urgency from the main task context
- Keep subtask text under 80 characters
- Don't add unnecessary steps - focus on essential actions
- For insurance tasks, include documentation and customer communication steps

Insurance-specific examples:

Task: "Policy review for John Smith"
{
  "subtasks": [
    { "text": "Review current coverage limits and deductibles", "priority": "high", "estimatedMinutes": 15 },
    { "text": "Check for available discounts (multi-policy, good driver)", "priority": "medium", "estimatedMinutes": 10 },
    { "text": "Verify customer contact information is current", "priority": "medium", "estimatedMinutes": 5 },
    { "text": "Prepare renewal quote if expiring within 30 days", "priority": "medium", "estimatedMinutes": 20 }
  ],
  "summary": "Complete policy review ensuring John Smith has optimal coverage and pricing",
  "category": "policy_review"
}

Task: "Call back customer about auto claim"
{
  "subtasks": [
    { "text": "Review claim status and recent notes", "priority": "high", "estimatedMinutes": 5 },
    { "text": "Check for any adjuster updates", "priority": "high", "estimatedMinutes": 5 },
    { "text": "Call customer to provide status update", "priority": "high", "estimatedMinutes": 15 },
    { "text": "Document conversation and next steps in notes", "priority": "medium", "estimatedMinutes": 5 }
  ],
  "summary": "Customer updated on claim progress with clear expectations set",
  "category": "follow_up"
}

Respond with ONLY the JSON object, no other text.`;
}

async function handleBreakdownTask(request: NextRequest) {
  // Validate request
  const validation = await validateAiRequest(request);

  if (!validation.valid) {
    return validation.response;
  }

  const body = validation.body;
  // Accept both 'text' and 'taskText' for compatibility
  const text = (body.text || body.taskText) as string;
  const users = body.users as string[] | undefined;

  if (!text || typeof text !== 'string') {
    return aiErrorResponse('Task text is required', 400);
  }

  // Analyze task pattern for insurance-specific context
  const patternMatch = analyzeTaskPattern(text);
  const insuranceContext = patternMatch
    ? `\nDetected task category: ${patternMatch.category.toUpperCase()} (${Math.round(patternMatch.confidence * 100)}% confidence)
Suggested subtasks for this category:
${patternMatch.suggestedSubtasks.map((s, i) => `- ${s} (~${patternMatch.estimatedMinutes[i]} min)`).join('\n')}
${patternMatch.tips ? `\nTip: ${patternMatch.tips}` : ''}`
    : '';

  const userList = dateHelpers.formatUserList(users);

  // Get completion rate warning if applicable
  const completionWarning = patternMatch
    ? getCompletionRateWarning(patternMatch.category)
    : null;

  // Build prompt and call Claude
  const prompt = buildPrompt(text, userList, insuranceContext);

  const aiResult = await callClaude({
    userMessage: prompt,
    maxTokens: 800,
    component: 'BreakdownTaskAPI',
  });

  if (!aiResult.success) {
    return aiErrorResponse('Failed to break down task', 500, aiResult.error);
  }

  // Parse the JSON response
  const result = parseAiJsonResponse<{
    subtasks?: Array<{ text?: string; priority?: string; estimatedMinutes?: number }>;
    summary?: string;
    category?: string;
  }>(aiResult.content);

  if (!result) {
    logger.error('Failed to parse AI response', undefined, {
      component: 'BreakdownTaskAPI',
      responseText: aiResult.content,
    });
    return aiErrorResponse('Failed to parse AI response', 500);
  }

  // Validate and clean up the response
  const validatedSubtasks: ParsedSubtask[] = (result.subtasks || [])
    .slice(0, 6)
    .map((subtask) => ({
      text: String(subtask.text || '').slice(0, 200),
      priority: validators.sanitizePriority(subtask.priority),
      estimatedMinutes: validators.clampEstimatedMinutes(subtask.estimatedMinutes),
    }))
    .filter((subtask) => subtask.text.length > 0);

  if (validatedSubtasks.length === 0) {
    return aiErrorResponse('Could not generate subtasks for this task', 400);
  }

  // Build response with pattern analysis info
  const response: {
    subtasks: ParsedSubtask[];
    summary: string;
    category?: string;
    confidence?: number;
    tips?: string;
    completionWarning?: string;
  } = {
    subtasks: validatedSubtasks,
    summary: String(result.summary || '').slice(0, 200),
  };

  // Add pattern analysis info if available
  if (patternMatch) {
    response.category = patternMatch.category;
    response.confidence = Math.round(patternMatch.confidence * 100);
    if (patternMatch.tips) {
      response.tips = patternMatch.tips;
    }
    if (completionWarning) {
      response.completionWarning = completionWarning;
    }
  } else if (result.category) {
    response.category = String(result.category);
  }

  return aiSuccessResponse(response);
}

export const POST = withAiErrorHandling('BreakdownTaskAPI', withSessionAuth(async (request) => {
  return handleBreakdownTask(request);
}));
