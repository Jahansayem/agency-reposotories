/**
 * Secure Todos API with Field-Level Encryption
 *
 * Server-side API for todo operations that handles:
 * - Field-level encryption for PII (transcription, notes)
 * - Proper session validation
 * - Activity logging
 *
 * This API should be used instead of direct Supabase client calls
 * when handling sensitive data like transcriptions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { validateSession } from '@/lib/sessionValidator';
import { encryptTodoPII, decryptTodoPII } from '@/lib/fieldEncryption';
import { verifyTodoAccess } from '@/lib/apiAuth';

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/todos - Fetch todos with decrypted PII fields
 */
export async function GET(request: NextRequest) {
  // Validate session
  const session = await validateSession(request);
  if (!session.valid || !session.userName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    let query = supabase.from('todos').select('*');

    if (id) {
      // Fetch single todo
      query = query.eq('id', id);
    } else {
      // Fetch all todos (optionally filter completed)
      if (!includeCompleted) {
        query = query.eq('completed', false);
      }
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Decrypt PII fields
    const decryptedData = (data || []).map(todo => decryptTodoPII(todo));

    return NextResponse.json({
      success: true,
      data: id ? decryptedData[0] : decryptedData,
    });
  } catch (error) {
    logger.error('Error fetching todos', error as Error, {
      component: 'api/todos',
      action: 'GET',
    });
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/todos - Create a new todo with encrypted PII
 */
export async function POST(request: NextRequest) {
  // Validate session
  const session = await validateSession(request);
  if (!session.valid || !session.userName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      text,
      priority = 'medium',
      assignedTo,
      dueDate,
      notes,
      transcription,
      subtasks = [],
      status = 'todo',
    } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Task text is required' },
        { status: 400 }
      );
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();

    // Build task object
    const task = {
      id: taskId,
      text: text.trim(),
      completed: false,
      status,
      priority,
      created_at: now,
      created_by: session.userName,
      assigned_to: assignedTo?.trim() || null,
      due_date: dueDate || null,
      notes: notes || null,
      transcription: transcription || null,
      subtasks: subtasks,
    };

    // Encrypt PII fields before storage
    const encryptedTask = encryptTodoPII(task);

    const { data, error } = await supabase
      .from('todos')
      .insert([encryptedTask])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'task_created',
      todo_id: taskId,
      todo_text: text.trim().substring(0, 100),
      user_name: session.userName,
      details: { priority, has_transcription: !!transcription },
    });

    logger.info('Todo created with encryption', {
      component: 'api/todos',
      action: 'POST',
      todoId: taskId,
      hasTranscription: !!transcription,
      hasNotes: !!notes,
    });

    // Return decrypted data
    return NextResponse.json({
      success: true,
      data: decryptTodoPII(data),
    });
  } catch (error) {
    logger.error('Error creating todo', error as Error, {
      component: 'api/todos',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/todos - Update a todo with encrypted PII
 */
export async function PUT(request: NextRequest) {
  // Validate session
  const session = await validateSession(request);
  if (!session.valid || !session.userName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: session.userName,
    };

    // Copy allowed fields
    const allowedFields = [
      'text', 'completed', 'status', 'priority',
      'assigned_to', 'due_date', 'notes', 'transcription',
      'subtasks', 'recurrence',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Encrypt PII fields if present
    if (updateData.notes !== undefined || updateData.transcription !== undefined) {
      const encrypted = encryptTodoPII(updateData as { notes?: string; transcription?: string });
      if (updateData.notes !== undefined) {
        updateData.notes = encrypted.notes;
      }
      if (updateData.transcription !== undefined) {
        updateData.transcription = encrypted.transcription;
      }
    }

    const { data, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log activity for significant changes
    if (updates.completed !== undefined) {
      await supabase.from('activity_log').insert({
        action: updates.completed ? 'task_completed' : 'task_reopened',
        todo_id: id,
        todo_text: data.text?.substring(0, 100),
        user_name: session.userName,
      });
    }

    logger.info('Todo updated with encryption', {
      component: 'api/todos',
      action: 'PUT',
      todoId: id,
      updatedFields: Object.keys(updateData),
    });

    // Return decrypted data
    return NextResponse.json({
      success: true,
      data: decryptTodoPII(data),
    });
  } catch (error) {
    logger.error('Error updating todo', error as Error, {
      component: 'api/todos',
      action: 'PUT',
    });
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/todos - Delete a todo
 */
export async function DELETE(request: NextRequest) {
  // Validate session
  const session = await validateSession(request);
  if (!session.valid || !session.userName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    // Verify the user has access to this todo (creator, assigned, or updater)
    const { todo, error: accessError } = await verifyTodoAccess(id, session.userName);
    if (accessError) return accessError;

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'task_deleted',
      todo_id: id,
      todo_text: todo.text?.substring(0, 100),
      user_name: session.userName,
    });

    logger.info('Todo deleted', {
      component: 'api/todos',
      action: 'DELETE',
      todoId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting todo', error as Error, {
      component: 'api/todos',
      action: 'DELETE',
    });
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
