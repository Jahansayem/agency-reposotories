import { NextRequest } from 'next/server';
import {
  validateAiRequest,
  callClaude,
  parseAiJsonResponse,
  aiSuccessResponse,
  isAiConfigured,
  validators,
  dateHelpers,
  withAiErrorHandling,
} from '@/lib/aiApiHelper';

interface ParsedTask {
  text: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  assignedTo: string;
}

function buildPrompt(
  transcription: string,
  userList: string,
  today: string
): string {
  return `You are a task extraction assistant. Analyze this voicemail transcription and extract ALL distinct action items or tasks mentioned.

Voicemail transcription:
"${transcription}"

Available team members: ${userList}
Today's date: ${today}

For each task found, provide:
1. A clear, actionable task description (clean up the language, make it professional)
2. Priority level (low, medium, high, urgent) - infer from context and urgency words
3. Due date if mentioned (YYYY-MM-DD format) - interpret phrases like "by Friday", "next week", "tomorrow", "end of month"
4. Suggested assignee from the team list if mentioned or implied

IMPORTANT: Extract ALL separate tasks. A single voicemail might contain multiple unrelated action items.

Respond ONLY with valid JSON in this exact format:
{
  "tasks": [
    {
      "text": "Task description here",
      "priority": "medium",
      "dueDate": "2024-01-15",
      "assignedTo": "Person Name"
    }
  ]
}

If the transcription doesn't contain any clear tasks, still return one task with the cleaned-up text.
Leave dueDate as empty string "" if no date is mentioned.
Leave assignedTo as empty string "" if no person is mentioned.`;
}

async function handleParseVoicemail(request: NextRequest) {
  // Validate request
  const validation = await validateAiRequest(request, {
    customValidator: (body) => {
      if (!body.transcription || typeof body.transcription !== 'string') {
        return 'No transcription provided';
      }
      return null;
    },
  });

  if (!validation.valid) {
    return validation.response;
  }

  const { transcription, users } = validation.body as {
    transcription: string;
    users?: string[];
  };

  // If AI not configured, return the transcription as a single task
  if (!isAiConfigured()) {
    return aiSuccessResponse({
      tasks: [
        {
          text: transcription.trim(),
          priority: 'medium',
          dueDate: '',
          assignedTo: '',
        },
      ],
    });
  }

  const userList = dateHelpers.formatUserList(users);
  const today = dateHelpers.getTodayISO();

  // Build prompt and call Claude
  const prompt = buildPrompt(transcription, userList, today);

  const aiResult = await callClaude({
    userMessage: prompt,
    maxTokens: 1024,
    component: 'ParseVoicemailAPI',
  });

  // If AI call fails, return the transcription as a single task
  if (!aiResult.success) {
    return aiSuccessResponse({
      tasks: [
        {
          text: transcription.trim(),
          priority: 'medium',
          dueDate: '',
          assignedTo: '',
        },
      ],
    });
  }

  // Parse the JSON response
  const parsedResponse = parseAiJsonResponse<{
    tasks?: Array<{
      text?: string;
      priority?: string;
      dueDate?: string;
      assignedTo?: string;
    }>;
  }>(aiResult.content);

  // If parsing fails, return the transcription as a single task
  if (!parsedResponse || !Array.isArray(parsedResponse.tasks)) {
    return aiSuccessResponse({
      tasks: [
        {
          text: transcription.trim(),
          priority: 'medium',
          dueDate: '',
          assignedTo: '',
        },
      ],
    });
  }

  // Validate each task and ensure proper structure
  const validatedTasks: ParsedTask[] = parsedResponse.tasks.map((task) => ({
    text: task.text || transcription.trim(),
    priority: validators.sanitizePriority(task.priority),
    dueDate: task.dueDate || '',
    assignedTo: task.assignedTo || '',
  }));

  return aiSuccessResponse({ tasks: validatedTasks });
}

export const POST = withAiErrorHandling('ParseVoicemailAPI', handleParseVoicemail);
