import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { extractJSON } from '@/lib/parseAIResponse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const usersJson = formData.get('users') as string | null;
    let users: string[] = [];
    if (usersJson) {
      try {
        const parsed = JSON.parse(usersJson);
        users = Array.isArray(parsed) ? parsed : [];
      } catch {
        logger.warn('Failed to parse users JSON, using empty array', { component: 'ParseFileAPI' });
      }
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF or image' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const userListText = users.length > 0
      ? `\n\nAvailable team members for assignment: ${users.join(', ')}`
      : '';

    // Build content array based on file type
    type ContentBlock =
      | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
      | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } }
      | { type: 'text'; text: string };

    const contentBlocks: ContentBlock[] = [];

    if (isPdf) {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
      });
    } else {
      // Images use 'image' type
      let imageMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      if (file.type === 'image/png') imageMediaType = 'image/png';
      else if (file.type === 'image/gif') imageMediaType = 'image/gif';
      else if (file.type === 'image/webp') imageMediaType = 'image/webp';

      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageMediaType,
          data: base64,
        },
      });
    }

    contentBlocks.push({
      type: 'text',
      text: `You are a task extraction assistant. Analyze this ${isPdf ? 'document' : 'image'} and extract actionable tasks from it.
${userListText}

Extract the following information and respond in JSON format only (no markdown, no code blocks):

{
  "documentSummary": "Brief 1-2 sentence summary of what this document is about",
  "extractedText": "Key text content from the document (first 500 chars max)",
  "mainTask": {
    "text": "Clear, actionable main task title (concise, under 100 chars)",
    "priority": "low|medium|high|urgent based on urgency indicators in document",
    "dueDate": "YYYY-MM-DD if a date is mentioned, otherwise empty string",
    "assignedTo": "username from the team list if mentioned, otherwise empty string"
  },
  "subtasks": [
    {
      "text": "Specific actionable subtask",
      "priority": "low|medium|high|urgent",
      "estimatedMinutes": number or null
    }
  ]
}

Guidelines:
- Extract 2-6 subtasks that break down the main task
- Make tasks specific and actionable (start with verbs)
- Look for action items, requirements, deadlines, and assignments
- If this is an email or letter, focus on what the recipient needs to do
- If this is a document/report, identify key action items or follow-ups
- Infer priority from urgency words (ASAP, urgent, deadline, important)
- Parse any dates mentioned into YYYY-MM-DD format

Respond with ONLY the JSON object, no other text.`,
    });

    // Check for OpenRouter API key
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Use OpenRouter API with Claude vision capability
    const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://wavezly.netlify.app',
        'X-Title': 'Wavezly Todo',
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: contentBlocks,
          },
        ],
        plugins: [{ id: 'response-healing' }],
        thinking: {
          type: 'enabled',
          budget_tokens: 10000,  // High budget for file parsing with vision
        },
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`OpenRouter API error: ${apiResponse.status} - ${errorText}`);
    }

    const apiData = await apiResponse.json();

    if (!apiData.choices || apiData.choices.length === 0) {
      throw new Error('No response from AI');
    }

    const textContent = apiData.choices[0].message.content;
    if (!textContent) {
      throw new Error('No text response from AI');
    }

    // Parse using robust JSON extraction
    const result = extractJSON<{
      documentSummary?: string;
      extractedText?: string;
      mainTask?: {
        text?: string;
        priority?: string;
        dueDate?: string;
        assignedTo?: string;
      };
      subtasks?: Array<{
        text?: string;
        priority?: string;
        estimatedMinutes?: number;
      }>;
    }>(textContent);

    if (!result) {
      logger.error('Failed to parse AI response', undefined, {
        component: 'ParseFileAPI',
        responsePreview: textContent.substring(0, 200)
      });
      throw new Error('Failed to parse AI response as JSON');
    }

    return NextResponse.json({
      success: true,
      documentSummary: result.documentSummary || '',
      extractedText: result.extractedText || '',
      mainTask: result.mainTask || { text: '', priority: 'medium', dueDate: '', assignedTo: '' },
      subtasks: result.subtasks || [],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';

    logger.error('Error parsing file', error, {
      component: 'ParseFileAPI',
      endpoint: '/api/ai/parse-file',
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
