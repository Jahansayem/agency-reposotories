import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { callOpenRouter } from '@/lib/openrouter';
import { extractJSON } from '@/lib/parseAIResponse';

// Parse voicemail transcription to extract multiple tasks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcription, users } = body;

    if (!transcription || typeof transcription !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No transcription provided' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      // Return the transcription as a single task if no AI available
      return NextResponse.json({
        success: true,
        tasks: [{
          text: transcription.trim(),
          priority: 'medium',
          dueDate: '',
          assignedTo: '',
        }],
      });
    }

    const userList = users && users.length > 0 ? users.join(', ') : 'none specified';
    const today = new Date().toISOString().split('T')[0];

    const prompt = `You are a task extraction assistant. Analyze this voicemail transcription and extract ALL distinct action items or tasks mentioned.

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

    // Call OpenRouter API with GLM-4.5-Air (thinking mode enabled)
    const responseText = await callOpenRouter({
      model: 'z-ai/glm-4.5-air:free',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
      plugins: [{ id: 'response-healing' }],
      thinking: {
        type: 'enabled',
        budget_tokens: 8000,  // Medium budget for voicemail parsing
      },
    });

    // Parse JSON from response using robust extraction
    const parsedResponse = extractJSON<{
      tasks?: Array<{
        text?: string;
        priority?: string;
        dueDate?: string;
        assignedTo?: string;
      }>;
    }>(responseText);

    // If parsing fails, return the transcription as a single task
    if (!parsedResponse) {
      logger.warn('AI response parsing failed for voicemail', undefined, {
        component: 'ParseVoicemailAPI',
        responsePreview: responseText.substring(0, 200)
      });

      return NextResponse.json({
        success: true,
        tasks: [{
          text: transcription.trim(),
          priority: 'medium',
          dueDate: '',
          assignedTo: '',
        }],
      });
    }

    // Validate the response structure
    if (!parsedResponse.tasks || !Array.isArray(parsedResponse.tasks)) {
      return NextResponse.json({
        success: true,
        tasks: [{
          text: transcription.trim(),
          priority: 'medium',
          dueDate: '',
          assignedTo: '',
        }],
      });
    }

    // Validate each task and ensure proper structure
    const validatedTasks = parsedResponse.tasks.map((task: {
      text?: string;
      priority?: string;
      dueDate?: string;
      assignedTo?: string;
    }) => ({
      text: task.text || transcription.trim(),
      priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority || '')
        ? task.priority
        : 'medium',
      dueDate: task.dueDate || '',
      assignedTo: task.assignedTo || '',
    }));

    return NextResponse.json({
      success: true,
      tasks: validatedTasks,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Voicemail parsing error', error, {
      component: 'ParseVoicemailAPI',
      endpoint: '/api/ai/parse-voicemail',
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse voicemail',
        ...(process.env.NODE_ENV === 'development' && {
          details: errorMessage,
          hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
        }),
      },
      { status: 500 }
    );
  }
}
