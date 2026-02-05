import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { TodoPriority } from '@/types/todo';
import { sendTaskAssignmentNotification } from '@/lib/taskNotifications';
import { verifyOutlookApiKey, createOutlookCorsPreflightResponse } from '@/lib/outlookAuth';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Get the default agency ID (Bealer Agency) for backward compatibility
 * when no agency_id is provided in the request.
 */
async function getDefaultAgencyId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data: agency, error } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', 'bealer-agency')
    .eq('is_active', true)
    .single();

  if (error || !agency) {
    logger.warn('Default agency (bealer-agency) not found', {
      component: 'OutlookCreateTaskAPI',
      error: error?.message,
    });
    return null;
  }

  return agency.id;
}

/**
 * Validate that the specified agency exists and is active
 */
async function validateAgency(agencyId: string): Promise<boolean> {
  const { data: agency, error } = await supabase
    .from('agencies')
    .select('id')
    .eq('id', agencyId)
    .eq('is_active', true)
    .single();

  return !error && !!agency;
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
  // Verify API key (constant-time comparison)
  if (!verifyOutlookApiKey(request)) {
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
    const { text, assignedTo, priority, dueDate, createdBy, agency_id } = await request.json();

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

    // Determine target agency: use provided agency_id or fall back to default
    let targetAgencyId: string | null = null;

    if (agency_id) {
      // Validate provided agency_id
      const isValidAgency = await validateAgency(agency_id);
      if (!isValidAgency) {
        logger.security('Invalid agency_id in Outlook task creation', {
          endpoint: '/api/outlook/create-task',
          attemptedAgencyId: agency_id,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });
        return NextResponse.json(
          { success: false, error: 'Invalid agency_id - agency does not exist or is inactive' },
          { status: 400 }
        );
      }
      targetAgencyId = agency_id;
    } else {
      // Use default Bealer Agency for backward compatibility
      targetAgencyId = await getDefaultAgencyId();
      if (!targetAgencyId) {
        logger.error('No default agency found for Outlook task creation', undefined, {
          component: 'OutlookCreateTaskAPI',
        });
        return NextResponse.json(
          { success: false, error: 'No agency specified and default agency not found' },
          { status: 400 }
        );
      }
      logger.info('Using default agency for Outlook task creation', {
        component: 'OutlookCreateTaskAPI',
        agencyId: targetAgencyId,
      });
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();

    // Build the task object with agency scoping
    const task: Record<string, unknown> = {
      id: taskId,
      text: text.trim(),
      completed: false,
      status: 'todo',
      created_at: now,
      created_by: createdBy || 'Outlook Add-in',
      agency_id: targetAgencyId,
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
      agencyId: targetAgencyId,
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

// Handle CORS preflight - only allow specific Outlook origins
export async function OPTIONS(request: NextRequest) {
  return createOutlookCorsPreflightResponse(request, 'POST, OPTIONS');
}
