import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { TodoPriority } from '@/types/todo';
import { sendTaskAssignmentNotification } from '@/lib/taskNotifications';
import { type AgencyAuthContext } from '@/lib/agencyAuth';
import { createOutlookCorsPreflightResponse, withOutlookAuth } from '@/lib/outlookAuth';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const POST = withOutlookAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();
    const { text, assignedTo, priority, dueDate } = await request.json();
    const agencyId = ctx.agencyId;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Task text is required' },
        { status: 400 }
      );
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();

    // Always use authenticated user's identity — never trust client-provided createdBy
    const creator = ctx.userName || 'Outlook Add-in';

    // Build the task object with agency scoping from auth context
    const task: Record<string, unknown> = {
      id: taskId,
      text: text.trim(),
      completed: false,
      status: 'todo',
      created_at: now,
      created_by: creator,
    };

    // Only include agency_id if auth context provides one (multi-tenancy enabled)
    if (agencyId) {
      task.agency_id = agencyId;
    }

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
      agencyId: agencyId || undefined,
      message: 'Task created successfully',
    });
  } catch (error) {
    logger.error('Error creating task', error, { component: 'OutlookCreateTaskAPI' });
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
});

// Handle CORS preflight - only allow specific Outlook origins
export async function OPTIONS(request: NextRequest) {
  return createOutlookCorsPreflightResponse(request, 'POST, OPTIONS');
}
