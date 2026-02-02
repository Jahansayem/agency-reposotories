import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
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
import { withSessionAuth } from '@/lib/agencyAuth';

export interface SmartParseResult {
  mainTask: {
    text: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: string;
    assignedTo: string;
  };
  subtasks: ParsedSubtask[];
  summary: string;
  wasComplex: boolean;
}

// Insurance-specific context for better parsing
const INSURANCE_CONTEXT = `
INSURANCE AGENCY CONTEXT:
You are parsing tasks for an Allstate insurance agency. Common task types and terminology include:

POLICY OPERATIONS:
- Policy reviews/renewals (usually has customer name, policy number)
- Endorsements (adding/changing coverage, adjusting limits)
- Cancellations/non-renewals
- "Dec page" = declarations page (policy summary document)
- "Binder" = temporary proof of insurance

VEHICLE OPERATIONS:
- Adding vehicle to policy (needs VIN, year/make/model)
- Removing vehicle from policy
- Vehicle replacement
- "Add a driver" = adding someone to auto policy

CLIENT OPERATIONS:
- New client onboarding (gather info, quote, bind)
- Annual reviews with existing clients
- Cross-sell opportunities
- "Pull MVR" = motor vehicle record check

CLAIMS:
- New claim filing
- Claim follow-up
- Adjuster coordination

DOCUMENTATION:
- "COI" = certificate of insurance
- "Loss runs" = claims history report
- "ID cards" = insurance identification cards

PRIORITY HINTS:
- Claims and time-sensitive requests are usually high/urgent
- Policy renewals have specific dates - use them as due dates
- New client onboarding should be high priority
- Quote requests are typically medium priority

When parsing, detect these patterns and set appropriate priority, subtasks, and due dates.
`;

function buildPrompt(text: string, userList: string, today: string, dayOfWeek: string): string {
  return `You are a smart task parser for an insurance agency team. Analyze the user's input and extract a clean, actionable task with optional subtasks.

${INSURANCE_CONTEXT}

User's input:
"""
${text}
"""

Today's date: ${today} (${dayOfWeek})
Team members: ${userList}

Analyze the input and respond ONLY with valid JSON (no markdown, no code blocks):
{
  "mainTask": {
    "text": "A clear, concise task title (under 100 chars). Start with an action verb. This is the main objective.",
    "priority": "low, medium, high, or urgent - based on urgency cues",
    "dueDate": "YYYY-MM-DD if mentioned, otherwise empty string",
    "assignedTo": "Team member name if explicitly mentioned, otherwise empty string"
  },
  "subtasks": [
    {
      "text": "Specific actionable step (under 80 chars)",
      "priority": "inherit from main or adjust based on importance",
      "estimatedMinutes": estimated time in minutes (5-480)
    }
  ],
  "summary": "1-sentence summary of what this task accomplishes",
  "wasComplex": true/false - whether the input contained multiple action items or details worth breaking down
}

Rules for main task:
- Extract the PRIMARY objective from the text
- Fix typos and grammar
- Start with a verb (Review, Send, Call, Complete, Prepare, etc.)
- Parse relative dates: "tomorrow", "next week", "by Friday", "end of month"
- Detect urgency: "ASAP", "urgent", "immediately" = urgent priority
- Only assign if a team member name is explicitly mentioned

Rules for subtasks:
- Extract 2-6 subtasks ONLY if the input is complex (multiple steps, bullet points, detailed instructions)
- For simple inputs (single sentence, clear single task), return empty subtasks array
- Each subtask should be independently actionable
- Start each with an action verb
- Order logically (dependencies first)
- Don't create artificial subtasks for simple tasks

Examples:

Simple input: "call john tmrw about the proposal"
{
  "mainTask": { "text": "Call John about the proposal", "priority": "medium", "dueDate": "2024-01-16", "assignedTo": "" },
  "subtasks": [],
  "summary": "Phone call scheduled with John to discuss proposal",
  "wasComplex": false
}

Complex input: "Meeting notes: need to 1) update the budget spreadsheet with Q4 numbers 2) send the revised proposal to client by Friday 3) schedule follow-up call with marketing team"
{
  "mainTask": { "text": "Complete meeting action items", "priority": "high", "dueDate": "2024-01-19", "assignedTo": "" },
  "subtasks": [
    { "text": "Update budget spreadsheet with Q4 numbers", "priority": "high", "estimatedMinutes": 30 },
    { "text": "Send revised proposal to client", "priority": "high", "estimatedMinutes": 20 },
    { "text": "Schedule follow-up call with marketing team", "priority": "medium", "estimatedMinutes": 10 }
  ],
  "summary": "Complete all action items from the meeting before Friday deadline",
  "wasComplex": true
}

Complex input: "Email from client: Hi, thanks for the presentation yesterday. Can you please send me the slides, update the pricing to reflect the 10% discount we discussed, and have Sarah prepare the contract? Also need this wrapped up by end of week as their team wants to review Monday."
{
  "mainTask": { "text": "Fulfill client request from presentation follow-up", "priority": "high", "dueDate": "2024-01-19", "assignedTo": "" },
  "subtasks": [
    { "text": "Send presentation slides to client", "priority": "high", "estimatedMinutes": 5 },
    { "text": "Update pricing with 10% discount", "priority": "high", "estimatedMinutes": 15 },
    { "text": "Have Sarah prepare the contract", "priority": "high", "estimatedMinutes": 30 },
    { "text": "Review all materials before sending", "priority": "medium", "estimatedMinutes": 15 }
  ],
  "summary": "Complete all client follow-up items before end of week for Monday review",
  "wasComplex": true
}

Respond with ONLY the JSON object, no other text.`;
}

async function handleSmartParse(request: NextRequest) {
  // Validate request
  const validation = await validateAiRequest(request, {
    customValidator: (body) => {
      if (!body.text || typeof body.text !== 'string') {
        return 'Text is required';
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

  // Analyze text complexity to determine if we should extract subtasks
  const wordCount = (text as string).split(/\s+/).length;
  const hasMultipleLines = (text as string).includes('\n');
  const hasBulletPoints = /[-•*]\s/.test(text as string);
  const hasNumberedList = /\d+[.)]\s/.test(text as string);
  const isComplex = wordCount > 15 || hasMultipleLines || hasBulletPoints || hasNumberedList;

  // Build prompt and call Claude
  const prompt = buildPrompt(text as string, userList, today, dayOfWeek);

  const aiResult = await callClaude({
    userMessage: prompt,
    maxTokens: 1000,
    component: 'SmartParseAPI',
  });

  if (!aiResult.success) {
    return aiErrorResponse('Failed to parse content', 500, aiResult.error);
  }

  // Parse the JSON response
  const result = parseAiJsonResponse<{
    mainTask?: { text?: string; priority?: string; dueDate?: string; assignedTo?: string };
    subtasks?: Array<{ text?: string; priority?: string; estimatedMinutes?: number }>;
    summary?: string;
    wasComplex?: boolean;
  }>(aiResult.content);

  if (!result) {
    logger.error('Failed to parse AI response', undefined, {
      component: 'SmartParseAPI',
      responseText: aiResult.content,
    });
    return aiErrorResponse('Failed to parse AI response', 500);
  }

  // Validate and clean up the response
  const validatedResult: SmartParseResult = {
    mainTask: {
      text: String(result.mainTask?.text || text).slice(0, 200),
      priority: validators.sanitizePriority(result.mainTask?.priority),
      dueDate: result.mainTask?.dueDate || '',
      assignedTo: result.mainTask?.assignedTo || '',
    },
    subtasks: (result.subtasks || [])
      .slice(0, 6)
      .map((subtask) => ({
        text: String(subtask.text || '').slice(0, 200),
        priority: validators.sanitizePriority(subtask.priority),
        estimatedMinutes: validators.clampEstimatedMinutes(subtask.estimatedMinutes),
      }))
      .filter((subtask) => subtask.text.length > 0),
    summary: String(result.summary || '').slice(0, 300),
    wasComplex: Boolean(result.wasComplex) || isComplex,
  };

  return aiSuccessResponse({ result: validatedResult });
}

export const POST = withAiErrorHandling('SmartParseAPI', withSessionAuth(async (request) => {
  return handleSmartParse(request);
}));
