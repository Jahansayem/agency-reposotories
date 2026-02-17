/**
 * useBulkActions Hook
 *
 * Manages bulk selection and operations on multiple todos.
 * Extracted from TodoList.tsx for cleaner separation of concerns.
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTodoStore } from '@/store/todoStore';
import { TodoStatus, TodoPriority } from '@/types/todo';
import { logActivity } from '@/lib/activityLogger';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/Toast';
import { haptics } from '@/lib/haptics';
import { retryWithBackoff } from '@/lib/retryWithBackoff';

export function useBulkActions(userName: string) {
  const {
    todos,
    bulkActions,
    toggleTodoSelection,
    selectAllTodos,
    clearSelection,
    setShowBulkActions,
    updateTodo: updateTodoInStore,
    deleteTodo: deleteTodoFromStore,
    addTodo: addTodoToStore,
    setTodos,
  } = useTodoStore();

  const { selectedTodos, showBulkActions } = bulkActions;
  const toast = useToast();
  const bulkCompleteRunningRef = useRef(false);
  const bulkCompleteAbortRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Get selected todo objects
  const getSelectedTodos = useCallback(() => {
    return todos.filter(t => selectedTodos.has(t.id));
  }, [todos, selectedTodos]);

  // Select/deselect individual todo
  const handleSelectTodo = useCallback((id: string, _selected: boolean) => {
    toggleTodoSelection(id);
  }, [toggleTodoSelection]);

  // Select all visible todos
  const selectAll = useCallback((visibleTodoIds: string[]) => {
    selectAllTodos(visibleTodoIds);
  }, [selectAllTodos]);

  // Bulk delete selected todos
  const bulkDelete = useCallback(async (onConfirm: (count: number, action: () => Promise<void>) => void) => {
    const count = selectedTodos.size;
    if (count === 0) return;
    if (isProcessingRef.current) return;

    onConfirm(count, async () => {
      isProcessingRef.current = true;
      try {
        const idsToDelete = Array.from(selectedTodos);
        // Snapshot the full todos list before any optimistic changes for positional rollback
        const originalTodosList = [...todos];
        const todosToDelete = todos.filter(t => selectedTodos.has(t.id));

        // Optimistic delete
        idsToDelete.forEach(id => deleteTodoFromStore(id));
        clearSelection();
        setShowBulkActions(false);

        try {
          await retryWithBackoff(async () => {
            const { error } = await supabase
              .from('todos')
              .delete()
              .in('id', idsToDelete);
            if (error) throw error;
          });

          // Log activity for each deleted todo
          todosToDelete.forEach(todo => {
            logActivity({
              action: 'task_deleted',
              userName,
              todoId: todo.id,
              todoText: todo.text,
              details: { bulk_action: true },
            });
          });
        } catch (error) {
          logger.error('Error bulk deleting', error, { component: 'useBulkActions' });
          // Rollback: restore the full original list to preserve positions
          setTodos(originalTodosList);
          toast.error('Failed to delete tasks', { description: 'Please try again.' });
        }
      } finally {
        isProcessingRef.current = false;
      }
    });
  }, [selectedTodos, todos, userName, deleteTodoFromStore, setTodos, clearSelection, setShowBulkActions, toast]);

  // Bulk assign selected todos
  const bulkAssign = useCallback(async (assignedTo: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const idsToUpdate = Array.from(selectedTodos);
      const originalTodos = todos.filter(t => selectedTodos.has(t.id));

      // Optimistic update
      idsToUpdate.forEach(id => {
        updateTodoInStore(id, { assigned_to: assignedTo });
      });
      clearSelection();
      setShowBulkActions(false);

      try {
        await retryWithBackoff(async () => {
          const { error } = await supabase
            .from('todos')
            .update({ assigned_to: assignedTo })
            .in('id', idsToUpdate);
          if (error) throw error;
        });

        // Log activity
        originalTodos.forEach(todo => {
          logActivity({
            action: 'assigned_to_changed',
            userName,
            todoId: todo.id,
            todoText: todo.text,
            details: { from: todo.assigned_to || null, to: assignedTo, bulk_action: true },
          });
        });
      } catch (error) {
        logger.error('Error bulk assigning', error, { component: 'useBulkActions' });
        // Rollback
        originalTodos.forEach(todo => {
          updateTodoInStore(todo.id, { assigned_to: todo.assigned_to });
        });
        toast.error('Failed to assign tasks', { description: 'Please try again.' });
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [selectedTodos, todos, userName, updateTodoInStore, clearSelection, setShowBulkActions, toast]);

  // Helper to retry bulk complete for specific task IDs
  const retryBulkComplete = useCallback(async (failedIds: string[]) => {
    const failedTodos = todos.filter(t => failedIds.includes(t.id));
    if (failedTodos.length === 0) return;

    const progressToastId = toast.loading('Retrying failed tasks...', {
      description: `0/${failedIds.length}`,
    });

    let completed = 0;
    const stillFailed: string[] = [];

    const chunkSize = 10;
    for (let i = 0; i < failedIds.length; i += chunkSize) {
      const chunk = failedIds.slice(i, i + chunkSize);

      for (const id of chunk) {
        try {
          await retryWithBackoff(async () => {
            const { error } = await supabase
              .from('todos')
              .update({ completed: true, status: 'done' })
              .eq('id', id);
            if (error) throw error;
          });

          completed++;
          updateTodoInStore(id, { completed: true, status: 'done' as TodoStatus });
          const todo = failedTodos.find(t => t.id === id);
          if (todo && !todo.completed) {
            logActivity({
              action: 'task_completed',
              userName,
              todoId: todo.id,
              todoText: todo.text,
              details: { bulk_action: true, retry: true },
            });
          }
        } catch (error) {
          stillFailed.push(id);
          logger.error('Retry bulk complete failed', error, { taskId: id, component: 'useBulkActions' });
        }
        toast.update(progressToastId, {
          description: `${completed + stillFailed.length}/${failedIds.length}`,
        });
      }
    }

    toast.dismiss(progressToastId);

    if (stillFailed.length > 0) {
      toast.error(`${completed} completed, ${stillFailed.length} still failed`, {
        description: 'Some tasks could not be completed after retry.',
        duration: 0,
      });
    } else {
      toast.success(`${completed} tasks completed on retry`, { duration: 2000 });
      haptics.success();
    }
  }, [todos, userName, toast, updateTodoInStore]);

  // Cancel an in-progress bulk complete operation
  const cancelBulkComplete = useCallback(() => {
    bulkCompleteAbortRef.current = true;
  }, []);

  // Bulk complete selected todos with progress tracking
  const bulkComplete = useCallback(async () => {
    const taskIds = Array.from(selectedTodos);
    const originalTodos = todos.filter(t => selectedTodos.has(t.id));

    if (taskIds.length === 0) return;
    if (isProcessingRef.current) return;
    if (bulkCompleteRunningRef.current) return;
    bulkCompleteRunningRef.current = true;
    isProcessingRef.current = true;
    bulkCompleteAbortRef.current = false;

    try {
      // Optimistic update for UI responsiveness
      taskIds.forEach(id => {
        updateTodoInStore(id, { completed: true, status: 'done' as TodoStatus });
      });
      clearSelection();
      setShowBulkActions(false);

      // For small batches (<=5), use the original single-query approach (no progress needed)
      if (taskIds.length <= 5) {
        try {
          await retryWithBackoff(async () => {
            const { error } = await supabase
              .from('todos')
              .update({ completed: true, status: 'done' })
              .in('id', taskIds);
            if (error) throw error;
          });

          originalTodos.forEach(todo => {
            if (!todo.completed) {
              logActivity({
                action: 'task_completed',
                userName,
                todoId: todo.id,
                todoText: todo.text,
                details: { bulk_action: true },
              });
            }
          });
          toast.success(`${taskIds.length} tasks completed`, { duration: 2000 });
          haptics.success();
        } catch (error) {
          logger.error('Error bulk completing', error, { component: 'useBulkActions' });
          originalTodos.forEach(todo => {
            updateTodoInStore(todo.id, { completed: todo.completed, status: todo.status });
          });
          toast.error(`Failed to complete ${taskIds.length} tasks`, {
            description: 'Please try again.',
            duration: 0,
          });
        }
        return;
      }

      // For larger batches, show progress toast and process in chunks
      let completed = 0;
      const failed: string[] = [];
      const cancelled: string[] = [];

      const progressToastId = toast.loading('Completing tasks...', {
        description: `0/${taskIds.length}`,
      });

      const chunkSize = 10;
      for (let i = 0; i < taskIds.length; i += chunkSize) {
        // Check abort before processing next chunk
        if (bulkCompleteAbortRef.current) {
          // Collect remaining unprocessed task IDs as cancelled
          const remainingIds = taskIds.slice(i);
          cancelled.push(...remainingIds);
          // Roll back optimistic updates for cancelled tasks
          remainingIds.forEach(id => {
            const original = originalTodos.find(t => t.id === id);
            if (original) {
              updateTodoInStore(id, { completed: original.completed, status: original.status });
            }
          });
          break;
        }

        const chunk = taskIds.slice(i, i + chunkSize);

        // Process each chunk as a batch query
        try {
          await retryWithBackoff(async () => {
            const { error } = await supabase
              .from('todos')
              .update({ completed: true, status: 'done' })
              .in('id', chunk);
            if (error) throw error;
          });

          completed += chunk.length;
          // Log activity for each completed task in the chunk
          chunk.forEach(id => {
            const todo = originalTodos.find(t => t.id === id);
            if (todo && !todo.completed) {
              logActivity({
                action: 'task_completed',
                userName,
                todoId: todo.id,
                todoText: todo.text,
                details: { bulk_action: true },
              });
            }
          });
        } catch (error) {
          // If batch fails, mark all in chunk as failed
          failed.push(...chunk);
          logger.error('Bulk complete chunk failed', error, { chunk: i, component: 'useBulkActions' });
          // Rollback this chunk optimistically
          chunk.forEach(id => {
            const original = originalTodos.find(t => t.id === id);
            if (original) {
              updateTodoInStore(id, { completed: original.completed, status: original.status });
            }
          });
        }

        toast.update(progressToastId, {
          description: `${completed}/${taskIds.length}${failed.length > 0 ? ` (${failed.length} failed)` : ''}${cancelled.length > 0 ? ` (${cancelled.length} cancelled)` : ''}`,
        });
      }

      toast.dismiss(progressToastId);

      if (cancelled.length > 0) {
        toast.warning(`${completed} completed, ${cancelled.length} cancelled`, {
          description: 'Bulk complete was cancelled.',
          duration: 3000,
        });
      } else if (failed.length > 0) {
        toast.error(`${completed} completed, ${failed.length} failed`, {
          description: 'Some tasks could not be completed.',
          action: {
            label: 'Retry failed',
            onClick: () => retryBulkComplete(failed),
          },
          duration: 0,
        });
        haptics.error();
      } else {
        toast.success(`${completed} tasks completed`, { duration: 2000 });
        haptics.success();
      }
    } finally {
      bulkCompleteRunningRef.current = false;
      isProcessingRef.current = false;
    }
  }, [selectedTodos, todos, userName, toast, updateTodoInStore, clearSelection, setShowBulkActions, retryBulkComplete]);

  // Bulk reschedule - set new due date for selected tasks
  const bulkReschedule = useCallback(async (newDueDate: string) => {
    const idsToUpdate = Array.from(selectedTodos);
    const originalTodos = todos.filter(t => selectedTodos.has(t.id));

    // Optimistic update
    idsToUpdate.forEach(id => {
      updateTodoInStore(id, { due_date: newDueDate });
    });
    clearSelection();
    setShowBulkActions(false);

    const { error } = await supabase
      .from('todos')
      .update({ due_date: newDueDate })
      .in('id', idsToUpdate);

    if (error) {
      logger.error('Error bulk rescheduling', error, { component: 'useBulkActions' });
      // Rollback
      originalTodos.forEach(todo => {
        updateTodoInStore(todo.id, { due_date: todo.due_date });
      });
    } else {
      // Log activity
      originalTodos.forEach(todo => {
        logActivity({
          action: 'due_date_changed',
          userName,
          todoId: todo.id,
          todoText: todo.text,
          details: { from: todo.due_date || null, to: newDueDate, bulk_action: true },
        });
      });
    }
  }, [selectedTodos, todos, userName, updateTodoInStore, clearSelection, setShowBulkActions]);

  // Bulk set priority
  const bulkSetPriority = useCallback(async (priority: TodoPriority) => {
    const idsToUpdate = Array.from(selectedTodos);
    const originalTodos = todos.filter(t => selectedTodos.has(t.id));

    // Optimistic update
    idsToUpdate.forEach(id => {
      updateTodoInStore(id, { priority });
    });
    clearSelection();
    setShowBulkActions(false);

    const { error } = await supabase
      .from('todos')
      .update({ priority })
      .in('id', idsToUpdate);

    if (error) {
      logger.error('Error bulk setting priority', error, { component: 'useBulkActions' });
      // Rollback
      originalTodos.forEach(todo => {
        updateTodoInStore(todo.id, { priority: todo.priority });
      });
    } else {
      // Log activity
      originalTodos.forEach(todo => {
        logActivity({
          action: 'priority_changed',
          userName,
          todoId: todo.id,
          todoText: todo.text,
          details: { from: todo.priority, to: priority, bulk_action: true },
        });
      });
    }
  }, [selectedTodos, todos, userName, updateTodoInStore, clearSelection, setShowBulkActions]);

  // Merge selected todos into one
  const mergeTodos = useCallback(async (primaryTodoId: string) => {
    const todosToMerge = todos.filter(t => selectedTodos.has(t.id));
    if (todosToMerge.length < 2) return false;

    const primaryTodo = todosToMerge.find(t => t.id === primaryTodoId);
    const secondaryTodos = todosToMerge.filter(t => t.id !== primaryTodoId);

    if (!primaryTodo) return false;

    try {
      // Combine data from all todos
      const combinedNotes = [
        primaryTodo.notes,
        ...secondaryTodos.map(t => t.notes),
        `\n--- Merged Tasks (${new Date().toLocaleString()}) ---`,
        ...secondaryTodos.map(t => `• "${t.text}" (created ${new Date(t.created_at).toLocaleDateString()})`)
      ].filter(Boolean).join('\n');

      // Combine all attachments
      const combinedAttachments = [
        ...(primaryTodo.attachments || []),
        ...secondaryTodos.flatMap(t => t.attachments || [])
      ];

      // Combine all subtasks
      const combinedSubtasks = [
        ...(primaryTodo.subtasks || []),
        ...secondaryTodos.flatMap(t => t.subtasks || [])
      ];

      // Combine text
      const combinedText = secondaryTodos.length > 0
        ? `${primaryTodo.text} [+${secondaryTodos.length} merged]`
        : primaryTodo.text;

      // Keep highest priority
      const priorityRank: Record<TodoPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const highestPriority = [primaryTodo, ...secondaryTodos]
        .reduce((highest, t) => {
          return priorityRank[t.priority || 'medium'] < priorityRank[highest] ? (t.priority || 'medium') : highest;
        }, primaryTodo.priority || 'medium');

      // Update primary todo in database
      const { error: updateError } = await supabase
        .from('todos')
        .update({
          text: combinedText,
          notes: combinedNotes,
          attachments: combinedAttachments,
          subtasks: combinedSubtasks,
          priority: highestPriority,
        })
        .eq('id', primaryTodoId);

      if (updateError) {
        logger.error('Error updating merged todo', updateError, { component: 'useBulkActions' });
        return false;
      }

      // Delete secondary todos
      const { error: deleteError } = await supabase
        .from('todos')
        .delete()
        .in('id', secondaryTodos.map(t => t.id));

      if (deleteError) {
        logger.error('Error deleting merged todos', deleteError, { component: 'useBulkActions' });
        return false;
      }

      // Update store
      updateTodoInStore(primaryTodoId, {
        text: combinedText,
        notes: combinedNotes,
        attachments: combinedAttachments,
        subtasks: combinedSubtasks,
        priority: highestPriority,
      });

      secondaryTodos.forEach(t => deleteTodoFromStore(t.id));

      // Log activity
      logActivity({
        action: 'tasks_merged',
        userName,
        todoId: primaryTodoId,
        todoText: combinedText,
        details: {
          merged_count: secondaryTodos.length,
          merged_ids: secondaryTodos.map(t => t.id),
        },
      });

      // Clear selection
      clearSelection();
      setShowBulkActions(false);

      return true;
    } catch (error) {
      logger.error('Error during merge', error, { component: 'useBulkActions' });
      return false;
    }
  }, [selectedTodos, todos, userName, updateTodoInStore, deleteTodoFromStore, clearSelection, setShowBulkActions]);

  // Helper to get date offset
  const getDateOffset = useCallback((days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }, []);

  return {
    // State
    selectedTodos,
    showBulkActions,
    selectedCount: selectedTodos.size,

    // Selection actions
    handleSelectTodo,
    selectAll,
    clearSelection,
    setShowBulkActions,
    getSelectedTodos,

    // Bulk operations
    bulkDelete,
    bulkAssign,
    bulkComplete,
    bulkReschedule,
    bulkSetPriority,
    mergeTodos,

    // Utilities
    getDateOffset,
  };
}
