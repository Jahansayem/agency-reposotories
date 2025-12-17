import { NextRequest, NextResponse } from 'next/server';

// Audio file transcription endpoint using Claude
// Supports three modes:
// 1. Transcription only (default): Just returns the text
// 2. Tasks mode: If 'users' is provided, extracts top-level tasks in a single API call
// 3. Subtasks mode: If 'mode=subtasks' is provided, extracts subtasks for a parent task
// The live microphone feature uses the browser's built-in Web Speech API and doesn't need this endpoint.

// Supported audio formats by Claude
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac'];

type AudioMediaType = 'audio/mp3' | 'audio/mp4' | 'audio/mpeg' | 'audio/wav' | 'audio/webm' | 'audio/ogg' | 'audio/flac';

// Map file extensions/mime types to Claude's supported media types
function getMediaType(filename: string, mimeType: string): AudioMediaType {
  const extension = filename.split('.').pop()?.toLowerCase();

  // Map common extensions to media types
  const extensionMap: Record<string, AudioMediaType> = {
    'mp3': 'audio/mp3',
    'mp4': 'audio/mp4',
    'm4a': 'audio/mp4',
    'mpeg': 'audio/mpeg',
    'mpga': 'audio/mpeg',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
  };

  if (extension && extensionMap[extension]) {
    return extensionMap[extension];
  }

  // Fallback to mime type mapping
  const mimeMap: Record<string, AudioMediaType> = {
    'audio/mp3': 'audio/mp3',
    'audio/mpeg': 'audio/mpeg',
    'audio/mp4': 'audio/mp4',
    'audio/m4a': 'audio/mp4',
    'audio/x-m4a': 'audio/mp4',
    'audio/wav': 'audio/wav',
    'audio/wave': 'audio/wav',
    'audio/x-wav': 'audio/wav',
    'audio/webm': 'audio/webm',
    'audio/ogg': 'audio/ogg',
    'audio/flac': 'audio/flac',
    'audio/x-flac': 'audio/flac',
  };

  return mimeMap[mimeType] || 'audio/mp3';
}

type ProcessingMode = 'transcribe' | 'tasks' | 'subtasks';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const usersJson = formData.get('users') as string | null;
    const users: string[] = usersJson ? JSON.parse(usersJson) : [];
    const modeParam = formData.get('mode') as string | null;
    const parentTaskText = formData.get('parentTaskText') as string | null;

    // Determine processing mode
    let mode: ProcessingMode = 'transcribe';
    if (modeParam === 'subtasks') {
      mode = 'subtasks';
    } else if (users.length > 0 || formData.has('parseTasks')) {
      mode = 'tasks';
    }

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('Received audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      mode,
    });

    // Check file size (limit to 25MB for consistency, though Claude supports up to 100MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // Check file format
    const extension = audioFile.name.split('.').pop()?.toLowerCase();
    if (extension && !SUPPORTED_FORMATS.includes(extension)) {
      return NextResponse.json(
        { success: false, error: `Unsupported audio format. Supported formats: ${SUPPORTED_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'Audio file upload is not available. Please use the microphone button to speak your task directly.',
      }, { status: 501 });
    }

    // Convert file to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = getMediaType(audioFile.name, audioFile.type);

    console.log('Sending to Claude API with media type:', mediaType);

    // Build the prompt based on mode
    const today = new Date().toISOString().split('T')[0];
    const userList = users.length > 0 ? users.join(', ') : 'none specified';

    let prompt: string;

    if (mode === 'tasks') {
      prompt = `Listen to this voicemail and extract ALL distinct action items or tasks mentioned.

Available team members: ${userList}
Today's date: ${today}

For each task found, provide:
1. A clear, actionable task description (clean up the language, make it professional)
2. Priority level (low, medium, high, urgent) - infer from context and urgency words
3. Due date if mentioned (YYYY-MM-DD format) - interpret phrases like "by Friday", "next week", "tomorrow", "end of month"
4. Suggested assignee from the team list if mentioned or implied

Also include the full transcription of the audio.

IMPORTANT: Extract ALL separate tasks. A single voicemail might contain multiple unrelated action items.

Respond ONLY with valid JSON in this exact format:
{
  "transcription": "The full transcription of the audio",
  "tasks": [
    {
      "text": "Task description here",
      "priority": "medium",
      "dueDate": "2024-01-15",
      "assignedTo": "Person Name"
    }
  ]
}

If the audio doesn't contain any clear tasks, still return one task with the cleaned-up text.
Leave dueDate as empty string "" if no date is mentioned.
Leave assignedTo as empty string "" if no person is mentioned.`;
    } else if (mode === 'subtasks') {
      prompt = `Listen to this audio and extract ALL distinct action items as subtasks.

${parentTaskText ? `Parent task context: "${parentTaskText}"` : ''}
Today's date: ${today}

Extract actionable items from this audio as subtasks. Look for:
- Explicit requests or instructions
- Questions that need answers (turn into "Respond to..." tasks)
- Deadlines or follow-ups mentioned
- Items to review, send, call, schedule, prepare, etc.
- Any commitments or promises made

For each subtask provide:
1. A clear, actionable description (start with action verb: Review, Call, Send, Schedule, Prepare, Follow up, etc.)
2. Priority (low, medium, high, urgent) - infer from language urgency
3. Estimated minutes to complete (5, 10, 15, 30, 45, 60, 90, 120)

Also include the full transcription of the audio.

Respond ONLY with valid JSON in this exact format:
{
  "transcription": "The full transcription of the audio",
  "subtasks": [
    {
      "text": "Action item description",
      "priority": "medium",
      "estimatedMinutes": 15
    }
  ],
  "summary": "Brief summary of what this audio is about"
}

Rules:
- Extract 2-10 subtasks depending on content complexity
- Each subtask should be independently completable
- Keep subtask text under 100 characters
- Order by logical sequence or priority
- If content mentions specific deadlines, note urgency in priority
- Don't create redundant or overly granular subtasks`;
    } else {
      prompt = 'Please transcribe this audio exactly as spoken. Return only the transcription text, nothing else. Do not add any commentary, introduction, or explanation.';
    }

    // Use fetch directly since the SDK doesn't have audio types yet
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'audio',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Audio,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', response.status, errorData);

      const errorMessage = errorData?.error?.message || 'Failed to transcribe audio';
      return NextResponse.json({
        success: false,
        error: errorMessage,
      }, { status: response.status });
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.type === 'text' ? data.content[0].text : '';

    // Handle tasks mode
    if (mode === 'tasks') {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          const tasks = (parsed.tasks || []).map((task: {
            text?: string;
            priority?: string;
            dueDate?: string;
            assignedTo?: string;
          }) => ({
            text: task.text || parsed.transcription || '',
            priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority || '')
              ? task.priority
              : 'medium',
            dueDate: task.dueDate || '',
            assignedTo: task.assignedTo || '',
          }));

          console.log('Task extraction successful:', tasks.length, 'tasks found');

          return NextResponse.json({
            success: true,
            text: parsed.transcription || responseText,
            tasks,
          });
        }
      } catch (parseError) {
        console.error('Failed to parse task JSON:', parseError);
      }

      // Fallback: return transcription as single task
      return NextResponse.json({
        success: true,
        text: responseText.trim(),
        tasks: [{
          text: responseText.trim(),
          priority: 'medium',
          dueDate: '',
          assignedTo: '',
        }],
      });
    }

    // Handle subtasks mode
    if (mode === 'subtasks') {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          const subtasks = (parsed.subtasks || [])
            .slice(0, 10)
            .map((subtask: {
              text?: string;
              priority?: string;
              estimatedMinutes?: number;
            }) => ({
              text: String(subtask.text || '').slice(0, 200),
              priority: ['low', 'medium', 'high', 'urgent'].includes(subtask.priority || '')
                ? subtask.priority
                : 'medium',
              estimatedMinutes: typeof subtask.estimatedMinutes === 'number'
                ? Math.min(Math.max(subtask.estimatedMinutes, 5), 480)
                : undefined,
            }))
            .filter((subtask: { text: string }) => subtask.text.length > 0);

          console.log('Subtask extraction successful:', subtasks.length, 'subtasks found');

          return NextResponse.json({
            success: true,
            text: parsed.transcription || responseText,
            subtasks,
            summary: String(parsed.summary || '').slice(0, 300),
          });
        }
      } catch (parseError) {
        console.error('Failed to parse subtask JSON:', parseError);
      }

      // Fallback: return transcription as single subtask
      return NextResponse.json({
        success: true,
        text: responseText.trim(),
        subtasks: [{
          text: responseText.trim().slice(0, 200),
          priority: 'medium',
        }],
        summary: '',
      });
    }

    // Simple transcription mode
    console.log('Transcription successful, length:', responseText.length);
    return NextResponse.json({
      success: true,
      text: responseText.trim(),
    });

  } catch (error) {
    console.error('Transcription error:', error);

    // Check for specific Claude API errors
    if (error instanceof Error) {
      if (error.message.includes('Could not process audio')) {
        return NextResponse.json({
          success: false,
          error: 'Could not process this audio file. Please try a different format or file.',
        }, { status: 400 });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process audio file. Please try again.' },
      { status: 500 }
    );
  }
}
