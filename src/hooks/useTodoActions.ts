/**
 * useTodoActions Hook
 *
 * Extracted from TodoList.tsx (Phase 3 Refactoring)
 * Wraps useTodoData CRUD operations with TodoList-specific features:
 * - Duplicate detection
 * - Celebration effects
 * - Recurrence handling
 * - File uploads
 * - Activity announcements
 *
 * This hook consolidates all the action handler logic that was previously
 * duplicated in TodoList.tsx (2,365 lines).
 */

'use client';

import { useCallback } from 'react';
import { useTodoData } from './useTodoData';
import { useTodoStore } from '@/store/todoStore';
import { supabase } from '@/lib/supabaseClient';
import { logActivity } from '@/lib/activityLogger';
import { logger } from '@/lib/logger';
import type { Todo, TodoPriority, Subtask, AuthUser } from '@/types/todo';
import type { LinkedCustomer } from '@/types/customer';
import { v4 as uuidv4 } from 'uuid';
import { useAgency } from '@/contexts/AgencyContext';

interface CreateTodoOptions {
  text: string;
  priority?: TodoPriority;
  dueDate?: string;
  assignedTo?: string;
  subtasks?: Subtask[];
  transcription?: string;
  sourceFile?: File;
  reminderAt?: string;
  notes?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | null;
  customer?: LinkedCustomer;
  skipDuplicateCheck?: boolean;
}

interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: Todo[];
}

interface UseTodoActionsOptions {
  currentUser: AuthUser;
  onDuplicatesFound?: (task: CreateTodoOptions, duplicates: Todo[]) => void;
  onCelebration?: () => void;
  onEnhancedCelebration?: () => void;
  onAnnounce?: (message: string) => void;
}

export function useTodoActions({
  currentUser,
  onDuplicatesFound,
  onCelebration,
  onEnhancedCelebration,
  onAnnounce,
}: UseTodoActionsOptions) {
  const userName = currentUser.name;
  const { currentAgencyId } = useAgency();

  // Get base CRUD operations from useTodoData
  const {
    createTodo: baseCreateTodo,
    updateTodo: baseUpdateTodo,
    deleteTodo: baseDeleteTodo,
    toggleComplete: baseToggleComplete,
    refresh,
  } = useTodoData(currentUser);

  // Get store actions for direct access
  const {
    todos,
    addTodo: addTodoToStore,
    updateTodo: updateTodoInStore,
    deleteTodo: deleteTodoFromStore,
  } = useTodoStore();

  /**
   * Check for duplicate tasks based on text similarity
   */
  const checkForDuplicates = useCallback((text: string): DuplicateCheckResult => {
    const normalizedText = text.toLowerCase().trim();

    const duplicates = todos.filter(todo => {
      const todoText = todo.text.toLowerCase().trim();
      // Exact match or very similar (Levenshtein distance could be added)
      return todoText === normalizedText ||
             (todoText.includes(normalizedText) && todoText.length < normalizedText.length * 1.5);
    });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
    };
  }, [todos]);

  /**
   * Create next recurrence of a todo
   */
  const createNextRecurrence = useCallback(async (completedTodo: Todo) => {
    if (!completedTodo.recurrence) return;

    const nextDueDate = calculateNextDueDate(completedTodo.due_date, completedTodo.recurrence);

    // Create new todo with same properties but updated due date
    const newTodo: Partial<Todo> = {
      ...completedTodo,
      id: uuidv4(),
      completed: false,
      status: 'todo',
      created_at: new Date().toISOString(),
      due_date: nextDueDate,
      updated_at: new Date().toISOString(),
    };

    // Use base createTodo from useTodoData
    const success = await baseCreateTodo(
      newTodo.text || '',
      newTodo.priority || 'medium',
      newTodo.due_date,
      newTodo.assigned_to,
      newTodo.subtasks,
      newTodo.transcription,
      undefined, // sourceFile
      undefined  // customer
    );

    if (success) {
      logActivity({
        action: 'task_created',
        userName,
        todoId: newTodo.id,
        todoText: newTodo.text,
        details: {
          recurrence: completedTodo.recurrence,
          previous_todo_id: completedTodo.id,
        },
      });
    }
  }, [userName, baseCreateTodo]);

  /**
   * Enhanced createTodo with duplicate detection and celebrations
   */
  const createTodo = useCallback(async (options: CreateTodoOptions): Promise<boolean> => {
    const {
      text,
      priority = 'medium',
      dueDate,
      assignedTo,
      subtasks,
      transcription,
      sourceFile,
      reminderAt,
      notes,
      recurrence,
      customer,
      skipDuplicateCheck = false,
    } = options;

    // Duplicate detection (unless explicitly skipped)
    if (!skipDuplicateCheck) {
      const { hasDuplicates, duplicates } = checkForDuplicates(text);

      if (hasDuplicates) {
        // Notify parent component to show duplicate modal
        onDuplicatesFound?.(options, duplicates);
        return false;
      }
    }

    // Handle file upload if source file is provided
    let uploadedAttachment: { file_name: string; storage_path: string; file_size: number; mime_type: string } | undefined;

    if (sourceFile) {
      try {
        const filePath = `todos/${uuidv4()}/${sourceFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('todo-attachments')
          .upload(filePath, sourceFile);

        if (uploadError) throw uploadError;

        uploadedAttachment = {
          file_name: sourceFile.name,
          storage_path: filePath,
          file_size: sourceFile.size,
          mime_type: sourceFile.type,
        };
      } catch (error) {
        logger.error('Failed to upload task attachment', error, { component: 'useTodoActions' });
        // Continue creating task without attachment
      }
    }

    // Use base createTodo from useTodoData
    const success = await baseCreateTodo(
      text,
      priority,
      dueDate,
      assignedTo,
      subtasks,
      transcription,
      undefined, // sourceFile
      customer
    );

    if (success) {
      // Announce to screen readers
      onAnnounce?.(`Task created: ${text}`);

      // Trigger celebration if multiple subtasks
      if (subtasks && subtasks.length > 5) {
        onEnhancedCelebration?.();
      }
    }

    return !!success;
  }, [
    checkForDuplicates,
    onDuplicatesFound,
    onAnnounce,
    onEnhancedCelebration,
    baseCreateTodo,
  ]);

  /**
   * Enhanced toggleComplete with recurrence and celebrations
   */
  const toggleComplete = useCallback(async (id: string): Promise<boolean> => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return false;

    const wasCompleted = todo.completed;

    // Use base toggleComplete from useTodoData
    const success = await baseToggleComplete(id);

    if (success && !wasCompleted) {
      // Task was just completed
      const allSubtasksComplete = todo.subtasks?.every(st => st.completed) ?? true;

      if (allSubtasksComplete && (todo.subtasks?.length ?? 0) >= 3) {
        onEnhancedCelebration?.();
      } else {
        onCelebration?.();
      }

      // Handle recurrence
      if (todo.recurrence) {
        await createNextRecurrence(todo);
      }
    }

    return success;
  }, [todos, baseToggleComplete, onCelebration, onEnhancedCelebration, createNextRecurrence]);

  /**
   * Enhanced updateTodo with announcements
   */
  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>): Promise<boolean> => {
    const success = await baseUpdateTodo(id, updates);

    if (success) {
      const todo = todos.find(t => t.id === id);
      if (todo && updates.text) {
        onAnnounce?.(`Task updated: ${updates.text}`);
      }
    }

    return success;
  }, [baseUpdateTodo, todos, onAnnounce]);

  /**
   * Enhanced deleteTodo with announcements
   */
  const deleteTodo = useCallback(async (id: string): Promise<boolean> => {
    const todo = todos.find(t => t.id === id);
    const todoText = todo?.text || 'task';

    const success = await baseDeleteTodo(id);

    if (success) {
      onAnnounce?.(`Task deleted: ${todoText}`);
    }

    return success;
  }, [baseDeleteTodo, todos, onAnnounce]);

  return {
    // Enhanced actions with TodoList-specific features
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,

    // Utilities
    checkForDuplicates,
    createNextRecurrence,
    refresh,
  };
}

/**
 * Calculate next due date based on recurrence pattern
 */
function calculateNextDueDate(currentDueDate: string | undefined, recurrence: string): string {
  const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
  const nextDate = new Date(baseDate);

  switch (recurrence) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }

  return nextDate.toISOString().split('T')[0];
}
