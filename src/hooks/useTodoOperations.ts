/**
 * Custom hook to manage TodoList task operations
 *
 * Extracts all task CRUD operations and business logic:
 * - Task creation (with duplicate detection)
 * - Task updating (status, assignment, priority, etc.)
 * - Task deletion and archiving
 * - Recurring task handling
 * - File attachment management
 *
 * This hook provides clean separation of business logic from UI concerns.
 */

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';
import { Todo, TodoStatus, TodoPriority, Subtask } from '@/types/todo';
import type { LinkedCustomer } from '@/types/customer';
import { logger } from '@/lib/logger';
import { logActivity } from '@/lib/activityLogger';
import { findPotentialDuplicates, shouldCheckForDuplicates, DuplicateMatch } from '@/lib/duplicateDetection';
import { sendTaskAssignmentNotification, sendTaskCompletionNotification } from '@/lib/taskNotifications';
import { fetchWithCsrf } from '@/lib/csrf';
import { calculateCompletionStreak, getNextSuggestedTasks, getEncouragementMessage } from '@/lib/taskSuggestions';
import { ActivityLogEntry } from '@/types/todo';

interface UseTodoOperationsProps {
  userName: string;
  currentAgencyId?: string | null;
  todos: Todo[];
  activityLog: ActivityLogEntry[];
  addTodoToStore: (todo: Todo) => void;
  updateTodoInStore: (id: string, updates: Partial<Todo>) => void;
  deleteTodoFromStore: (id: string) => void;
  announce: (message: string) => void;
  openDuplicateModal: (pendingTask: any, duplicates: DuplicateMatch[]) => void;
  triggerCelebration: (text: string) => void;
  triggerEnhancedCelebration: (data: any) => void;
}

export function useTodoOperations({
  userName,
  currentAgencyId,
  todos,
  activityLog,
  addTodoToStore,
  updateTodoInStore,
  deleteTodoFromStore,
  announce,
  openDuplicateModal,
  triggerCelebration,
  triggerEnhancedCelebration,
}: UseTodoOperationsProps) {

  /**
   * Actually create the todo (called after duplicate check or when user confirms)
   */
  const createTodoDirectly = useCallback(async (
    text: string,
    priority: TodoPriority,
    dueDate?: string,
    assignedTo?: string,
    subtasks?: Subtask[],
    transcription?: string,
    sourceFile?: File,
    reminderAt?: string,
    notes?: string,
    recurrence?: 'daily' | 'weekly' | 'monthly' | null,
    customer?: LinkedCustomer
  ) => {
    const newTodo: Todo = {
      id: uuidv4(),
      text,
      completed: false,
      status: 'todo',
      priority,
      created_at: new Date().toISOString(),
      created_by: userName,
      due_date: dueDate,
      assigned_to: assignedTo,
      subtasks: subtasks,
      transcription: transcription,
      reminder_at: reminderAt,
      reminder_sent: false,
      notes: notes,
      recurrence: recurrence || undefined,
      customer_id: customer?.id,
      customer_name: customer?.name,
      customer_segment: customer?.segment,
    };

    // Optimistic update
    addTodoToStore(newTodo);

    const insertData: Record<string, unknown> = {
      id: newTodo.id,
      text: newTodo.text,
      completed: newTodo.completed,
      created_at: newTodo.created_at,
      created_by: newTodo.created_by,
    };

    if (newTodo.status && newTodo.status !== 'todo') insertData.status = newTodo.status;
    if (newTodo.priority && newTodo.priority !== 'medium') insertData.priority = newTodo.priority;
    if (newTodo.due_date) insertData.due_date = newTodo.due_date;
    if (newTodo.assigned_to) insertData.assigned_to = newTodo.assigned_to;
    if (newTodo.subtasks && newTodo.subtasks.length > 0) insertData.subtasks = newTodo.subtasks;
    if (newTodo.transcription) insertData.transcription = newTodo.transcription;
    if (newTodo.reminder_at) {
      insertData.reminder_at = newTodo.reminder_at;
      insertData.reminder_sent = false;
    }
    if (newTodo.notes) insertData.notes = newTodo.notes;
    if (newTodo.recurrence) insertData.recurrence = newTodo.recurrence;
    if (newTodo.customer_id) insertData.customer_id = newTodo.customer_id;
    if (newTodo.customer_name) insertData.customer_name = newTodo.customer_name;
    if (newTodo.customer_segment) insertData.customer_segment = newTodo.customer_segment;

    // Set agency_id for multi-tenancy
    if (currentAgencyId) {
      insertData.agency_id = currentAgencyId;
    }

    const { error: insertError } = await supabase.from('todos').insert([insertData]);

    if (insertError) {
      logger.error('Error adding todo', insertError, { component: 'useTodoOperations' });
      // Rollback optimistic update
      deleteTodoFromStore(newTodo.id);
    } else {
      // Log activity
      logActivity({
        action: 'task_created',
        userName,
        todoId: newTodo.id,
        todoText: newTodo.text,
        details: {
          priority: newTodo.priority,
          assigned_to: newTodo.assigned_to,
          due_date: newTodo.due_date,
          has_subtasks: (subtasks?.length || 0) > 0,
          has_transcription: !!transcription,
        },
      });
      announce(`New task added: ${newTodo.text}`);

      // Send notification if assigned to someone else
      if (newTodo.assigned_to && newTodo.assigned_to !== userName) {
        sendTaskAssignmentNotification({
          taskId: newTodo.id,
          taskText: newTodo.text,
          assignedTo: newTodo.assigned_to,
          assignedBy: userName,
          dueDate: newTodo.due_date,
          priority: newTodo.priority,
          subtasks: newTodo.subtasks,
          notes: newTodo.notes,
        });
      }

      // Auto-attach source file if provided
      if (sourceFile) {
        try {
          const formData = new FormData();
          formData.append('file', sourceFile);
          formData.append('todoId', newTodo.id);
          formData.append('userName', userName);

          const response = await fetchWithCsrf('/api/attachments', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const { attachment } = await response.json();
            const currentTodo = todos.find(t => t.id === newTodo.id);
            if (currentTodo) {
              updateTodoInStore(newTodo.id, {
                attachments: [...(currentTodo.attachments || []), attachment]
              });
            }
            logActivity({
              action: 'attachment_added',
              userName,
              todoId: newTodo.id,
              todoText: newTodo.text,
              details: {
                file_name: sourceFile.name,
                file_type: attachment.file_type,
                auto_attached: true,
              },
            });
          } else {
            logger.error('Failed to auto-attach source file', null, { component: 'useTodoOperations' });
          }
        } catch (err) {
          logger.error('Error auto-attaching source file', err, { component: 'useTodoOperations' });
        }
      }
    }
  }, [userName, currentAgencyId, addTodoToStore, deleteTodoFromStore, updateTodoInStore, announce, todos]);

  /**
   * Add a new todo with duplicate detection
   */
  const addTodo = useCallback((
    text: string,
    priority: TodoPriority,
    dueDate?: string,
    assignedTo?: string,
    subtasks?: Subtask[],
    transcription?: string,
    sourceFile?: File,
    reminderAt?: string,
    notes?: string,
    recurrence?: 'daily' | 'weekly' | 'monthly' | null,
    customer?: LinkedCustomer
  ) => {
    // Check for duplicates
    const combinedText = `${text} ${transcription || ''}`;
    if (shouldCheckForDuplicates(combinedText)) {
      const duplicates = findPotentialDuplicates(combinedText, todos);
      if (duplicates.length > 0) {
        // Store pending task and show modal
        openDuplicateModal(
          { text, priority, dueDate, assignedTo, subtasks, transcription, sourceFile },
          duplicates
        );
        return;
      }
    }
    // No duplicates found, create directly
    createTodoDirectly(text, priority, dueDate, assignedTo, subtasks, transcription, sourceFile, reminderAt, notes, recurrence, customer);
  }, [todos, openDuplicateModal, createTodoDirectly]);

  /**
   * Duplicate an existing todo
   */
  const duplicateTodo = useCallback(async (todo: Todo) => {
    const newTodo: Todo = {
      ...todo,
      id: uuidv4(),
      text: `${todo.text} (copy)`,
      completed: false,
      status: 'todo',
      created_at: new Date().toISOString(),
      created_by: userName,
    };

    // Optimistic update
    addTodoToStore(newTodo);

    const insertData: Record<string, unknown> = {
      id: newTodo.id,
      text: newTodo.text,
      completed: false,
      created_at: newTodo.created_at,
      created_by: newTodo.created_by,
    };

    if (newTodo.priority && newTodo.priority !== 'medium') insertData.priority = newTodo.priority;
    if (newTodo.due_date) insertData.due_date = newTodo.due_date;
    if (newTodo.assigned_to) insertData.assigned_to = newTodo.assigned_to;
    if (newTodo.notes) insertData.notes = newTodo.notes;
    if (newTodo.recurrence) insertData.recurrence = newTodo.recurrence;

    if (currentAgencyId) {
      insertData.agency_id = currentAgencyId;
    }

    const { error: insertError } = await supabase.from('todos').insert([insertData]);

    if (insertError) {
      logger.error('Error duplicating todo', insertError, { component: 'useTodoOperations' });
      deleteTodoFromStore(newTodo.id);
    } else {
      // Send notification if duplicated task is assigned to someone else
      if (newTodo.assigned_to && newTodo.assigned_to !== userName) {
        sendTaskAssignmentNotification({
          taskId: newTodo.id,
          taskText: newTodo.text,
          assignedTo: newTodo.assigned_to,
          assignedBy: userName,
          dueDate: newTodo.due_date,
          priority: newTodo.priority,
          notes: newTodo.notes,
        });
      }
    }
  }, [userName, currentAgencyId, addTodoToStore, deleteTodoFromStore]);

  /**
   * Update task status with celebration for completions
   */
  const updateStatus = useCallback(async (id: string, status: TodoStatus) => {
    const oldTodo = todos.find((t) => t.id === id);
    const completed = status === 'done';
    const updated_at = new Date().toISOString();

    // Optimistic update
    updateTodoInStore(id, { status, completed, updated_at });

    if (status === 'done' && oldTodo && !oldTodo.completed) {
      // Calculate streak and get next tasks for enhanced celebration
      const streakCount = calculateCompletionStreak(activityLog, userName) + 1;
      const nextTasks = getNextSuggestedTasks(todos, userName, id);
      const encouragementMessage = getEncouragementMessage(streakCount);

      const updatedTodo = { ...oldTodo, completed: true, status: 'done' as TodoStatus, updated_at };
      triggerEnhancedCelebration({
        completedTask: updatedTodo,
        nextTasks,
        streakCount,
        encouragementMessage,
      });

      triggerCelebration(oldTodo.text);

      // Handle recurring tasks
      if (oldTodo.recurrence) {
        createNextRecurrence(oldTodo);
      }

      // Send notification if task was assigned by someone else
      if (oldTodo.created_by && oldTodo.created_by !== userName) {
        sendTaskCompletionNotification({
          taskId: id,
          taskText: oldTodo.text,
          completedBy: userName,
          assignedBy: oldTodo.created_by,
        });
      }
    }

    const { data, error: updateError } = await supabase
      .from('todos')
      .update({ status, completed, updated_at })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (updateError || !data) {
      logger.error('Error updating status', updateError ?? new Error('No rows updated'), { component: 'useTodoOperations' });
      if (oldTodo) {
        updateTodoInStore(id, oldTodo);
      }
    } else if (oldTodo) {
      // Log activity
      if (status === 'done' && oldTodo.status !== 'done') {
        logActivity({
          action: 'task_completed',
          userName,
          todoId: id,
          todoText: oldTodo.text,
        });
        announce(`Task marked as complete: ${oldTodo.text}`);
      } else if (oldTodo.status === 'done' && status !== 'done') {
        logActivity({
          action: 'task_reopened',
          userName,
          todoId: id,
          todoText: oldTodo.text,
        });
        announce(`Task reopened: ${oldTodo.text}`);
      } else {
        logActivity({
          action: 'status_changed',
          userName,
          todoId: id,
          todoText: oldTodo.text,
          details: { from: oldTodo.status, to: status },
        });
        announce(`Task status changed to ${status}: ${oldTodo.text}`);
      }
    }
  }, [todos, activityLog, userName, updateTodoInStore, announce, triggerCelebration, triggerEnhancedCelebration]);

  /**
   * Create next recurring task after completion
   */
  const createNextRecurrence = useCallback(async (completedTodo: Todo) => {
    if (!completedTodo.recurrence || !completedTodo.due_date) return;

    const currentDue = new Date(completedTodo.due_date);

    if (isNaN(currentDue.getTime())) {
      console.error('Invalid due date in recurring task:', completedTodo.id, completedTodo.due_date);
      alert('Could not create next recurring task: Invalid due date format.');
      return;
    }

    const nextDue = new Date(currentDue);

    switch (completedTodo.recurrence) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + 1);
        break;
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
    }

    const newTodo: Todo = {
      ...completedTodo,
      id: uuidv4(),
      completed: false,
      status: 'todo',
      due_date: nextDue.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    addTodoToStore(newTodo);

    const insertData: Record<string, unknown> = {
      id: newTodo.id,
      text: newTodo.text,
      completed: false,
      status: 'todo',
      created_at: newTodo.created_at,
      created_by: newTodo.created_by,
      due_date: newTodo.due_date,
      recurrence: newTodo.recurrence,
    };

    if (newTodo.priority && newTodo.priority !== 'medium') insertData.priority = newTodo.priority;
    if (newTodo.assigned_to) insertData.assigned_to = newTodo.assigned_to;
    if (newTodo.notes) insertData.notes = newTodo.notes;

    if (currentAgencyId) {
      insertData.agency_id = currentAgencyId;
    }

    const { error: insertError } = await supabase.from('todos').insert([insertData]);

    if (insertError) {
      console.error('Failed to create next recurring task:', insertError);
      deleteTodoFromStore(newTodo.id);
      alert('Failed to create next recurring task. Please try again.');
      return;
    }

    // Send notification for recurring task if assigned to someone else
    if (newTodo.assigned_to && newTodo.assigned_to !== userName) {
      sendTaskAssignmentNotification({
        taskId: newTodo.id,
        taskText: newTodo.text,
        assignedTo: newTodo.assigned_to,
        assignedBy: userName,
        dueDate: newTodo.due_date,
        priority: newTodo.priority,
        notes: newTodo.notes,
      });
    }
  }, [userName, currentAgencyId, addTodoToStore, deleteTodoFromStore]);

  /**
   * Toggle todo completion
   */
  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    const todoItem = todos.find(t => t.id === id);
    const updated_at = new Date().toISOString();
    const newStatus: TodoStatus = completed ? 'done' : 'todo';

    updateTodoInStore(id, { completed, status: newStatus, updated_at });

    if (completed && todoItem) {
      const streakCount = calculateCompletionStreak(activityLog, userName) + 1;
      const nextTasks = getNextSuggestedTasks(todos, userName, id);
      const encouragementMessage = getEncouragementMessage(streakCount);

      const updatedTodo = { ...todoItem, completed: true, updated_at };
      triggerEnhancedCelebration({
        completedTask: updatedTodo,
        nextTasks,
        streakCount,
        encouragementMessage,
      });

      triggerCelebration(todoItem.text);

      if (todoItem.recurrence) {
        createNextRecurrence(todoItem);
      }

      if (todoItem.created_by && todoItem.created_by !== userName) {
        sendTaskCompletionNotification({
          taskId: id,
          taskText: todoItem.text,
          completedBy: userName,
          assignedBy: todoItem.created_by,
        });
      }
    }

    const { data, error } = await supabase
      .from('todos')
      .update({ completed, status: newStatus, updated_at })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      logger.error('Toggle failed', error ?? new Error('No rows updated'), { component: 'useTodoOperations' });
      if (todoItem) {
        updateTodoInStore(id, todoItem);
      }
    } else if (todoItem) {
      const action = completed ? 'task_completed' : 'task_reopened';
      logActivity({ action, userName, todoId: id, todoText: todoItem.text });
      announce(`Task ${completed ? 'completed' : 'reopened'}: ${todoItem.text}`);
    }
  }, [todos, activityLog, userName, updateTodoInStore, announce, triggerCelebration, triggerEnhancedCelebration, createNextRecurrence]);

  return {
    addTodo,
    createTodoDirectly,
    duplicateTodo,
    updateStatus,
    toggleTodo,
    createNextRecurrence,
  };
}
