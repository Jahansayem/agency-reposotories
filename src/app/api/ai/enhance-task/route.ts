import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { callOpenRouter } from '@/lib/openrouter';
import { extractJSON } from '@/lib/parseAIResponse';

export async function POST(request: NextRequest) {
  try {
    const { text, users } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Task text is required' },
        { status: 400 }
      );
    }

    const userList = Array.isArray(users) && users.length > 0
      ? users.join(', ')
      : 'no team members registered';

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const prompt = `You are a task enhancement assistant for a small business team. Take the user's task input and improve it.

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

    // Call OpenRouter API with GLM-4.5-Air (thinking mode enabled)
    const responseText = await callOpenRouter({
      model: 'z-ai/glm-4.5-air:free',
      max_tokens: 300,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
      plugins: [{ id: 'response-healing' }],
      thinking: {
        type: 'enabled',
        budget_tokens: 5000,  // Moderate budget for text enhancement
      },
    });

    // Parse the JSON from Claude's response using robust extraction
    const enhanced = extractJSON<{
      text?: string;
      priority?: string;
      dueDate?: string;
      assignedTo?: string;
      wasEnhanced?: boolean;
    }>(responseText);

    // Fallback if parsing fails
    if (!enhanced) {
      logger.warn('AI response parsing failed, returning original text', undefined, {
        component: 'EnhanceTaskAPI',
        responsePreview: responseText.substring(0, 200)
      });

      return NextResponse.json({
        success: true,
        enhanced: {
          text,
          priority: 'medium',
          dueDate: '',
          assignedTo: '',
          wasEnhanced: false,
        },
      });
    }

    // Validate the response structure
    const validatedResult = {
      text: enhanced.text || text,
      priority: ['low', 'medium', 'high', 'urgent'].includes(enhanced.priority)
        ? enhanced.priority
        : 'medium',
      dueDate: enhanced.dueDate || '',
      assignedTo: enhanced.assignedTo || '',
      wasEnhanced: Boolean(enhanced.wasEnhanced),
    };

    return NextResponse.json({
      success: true,
      enhanced: validatedResult,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Error enhancing task', error, {
      component: 'EnhanceTaskAPI',
      endpoint: '/api/ai/enhance-task',
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to enhance task',
        ...(process.env.NODE_ENV === 'development' && {
          details: errorMessage,
          hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
        }),
      },
      { status: 500 }
    );
  }
}
