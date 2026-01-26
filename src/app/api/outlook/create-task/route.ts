import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { TodoPriority } from '@/types/todo';
import { sendTaskAssignmentNotification } from '@/lib/taskNotifications';

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Verify API key middleware with constant-time comparison
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const expectedKey = process.env.OUTLOOK_ADDON_API_KEY;

  if (!apiKey || !expectedKey) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (apiKey.length !== expectedKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < apiKey.length; i++) {
    result |= apiKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }
  return result === 0;
}

// Validate that createdBy is a valid user in the system
async function validateCreator(createdBy: string): Promise<{ valid: boolean; userId?: string }> {
  if (!createdBy || typeof createdBy !== 'string' || createdBy.trim().length === 0) {
    return { valid: false };
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', createdBy.trim())
    .single();

  if (error || !user) {
    return { valid: false };
  }

  return { valid: true, userId: user.id };
}

export async function POST(request: NextRequest) {
  // Verify API key
  if (!verifyApiKey(request)) {
    logger.security('Outlook API key validation failed', {
      endpoint: '/api/outlook/create-task',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { text, assignedTo, priority, dueDate, createdBy } = await request.json();

    // SECURITY: Validate that createdBy is a real user in the system
    // This prevents impersonation attacks
    const creatorValidation = await validateCreator(createdBy);
    if (!creatorValidation.valid) {
      logger.security('Invalid creator in Outlook task creation', {
        endpoint: '/api/outlook/create-task',
        attemptedCreator: createdBy,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { success: false, error: 'Invalid creator - user does not exist' },
        { status: 400 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Task text is required' },
        { status: 400 }
      );
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();

    // Build the task object
    const task: Record<string, unknown> = {
      id: taskId,
      text: text.trim(),
      completed: false,
      status: 'todo',
      created_at: now,
      created_by: createdBy || 'Outlook Add-in',
    };

    // Add optional fields
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      task.priority = priority;
    }

    if (assignedTo && assignedTo.trim()) {
      task.assigned_to = assignedTo.trim();
    }

    if (dueDate) {
      // Ensure date is in proper format
      task.due_date = dueDate;
    }

    // Insert into Supabase
    const { error: insertError } = await supabase
      .from('todos')
      .insert([task]);

    if (insertError) {
      logger.error('Error inserting task', insertError, { component: 'OutlookCreateTaskAPI' });
      return NextResponse.json(
        { success: false, error: 'Failed to create task in database' },
        { status: 500 }
      );
    }

    // Send notification if task is assigned to someone other than the creator
    const creator = createdBy || 'Outlook Add-in';
    if (assignedTo && assignedTo.trim() && assignedTo.trim() !== creator) {
      await sendTaskAssignmentNotification({
        taskId,
        taskText: text.trim(),
        assignedTo: assignedTo.trim(),
        assignedBy: creator,
        dueDate: dueDate,
        priority: (priority as TodoPriority) || 'medium',
      });
    }

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Task created successfully',
    });
  } catch (error) {
    logger.error('Error creating task', error, { component: 'OutlookCreateTaskAPI' });
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}
