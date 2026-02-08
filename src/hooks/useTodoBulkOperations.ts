/**
 * Custom hook to manage TodoList bulk operations
 *
 * Extracts bulk operations and merge logic:
 * - Bulk assign/complete/delete/reschedule
 * - Task merging (combine multiple tasks into one)
 * - Screen reader announcements for batch operations
 *
 * This hook provides clean separation of bulk operation concerns.
 */

import { useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Todo, TodoPriority } from '@/types/todo';
import { logger } from '@/lib/logger';
import { logActivity } from '@/lib/activityLogger';
import { ContextualErrorMessages } from '@/lib/errorMessages';

interface UseTodoBulkOperationsProps {
  userName: string;
  todos: Todo[];
  selectedTodos: Set<string>;
  updateTodoInStore: (id: string, updates: Partial<Todo>) => void;
  deleteTodoFromStore: (id: string) => void;
  clearSelection: () => void;
  setShowBulkActions: (show: boolean) => void;
  refreshTodos: () => void;
  announce: (message: string) => void;
  hookBulkAssign: (assignedTo: string) => Promise<void>;
  hookBulkComplete: () => Promise<void>;
  hookBulkReschedule: (newDueDate: string) => Promise<void>;
  openMergeModal: (targets: Todo[]) => void;
  closeMergeModal: () => void;
  setMergingState: (isMerging: boolean) => void;
}

export function useTodoBulkOperations({
  userName,
  todos,
  selectedTodos,
  updateTodoInStore,
  deleteTodoFromStore,
  clearSelection,
  setShowBulkActions,
  refreshTodos,
  announce,
  hookBulkAssign,
  hookBulkComplete,
  hookBulkReschedule,
  openMergeModal,
  closeMergeModal,
  setMergingState,
}: UseTodoBulkOperationsProps) {

  /**
   * Bulk assign with screen reader announcement
   */
  const bulkAssign = useCallback(async (assignedTo: string) => {
    const count = selectedTodos.size;
    await hookBulkAssign(assignedTo);
    announce(`${count} task${count > 1 ? 's' : ''} reassigned to ${assignedTo}`);
  }, [hookBulkAssign, selectedTodos.size, announce]);

  /**
   * Bulk complete with screen reader announcement
   */
  const bulkComplete = useCallback(async () => {
    const count = selectedTodos.size;
    await hookBulkComplete();
    announce(`${count} task${count > 1 ? 's' : ''} marked as complete`);
  }, [hookBulkComplete, selectedTodos.size, announce]);

  /**
   * Bulk reschedule with screen reader announcement
   */
  const bulkReschedule = useCallback(async (newDueDate: string) => {
    const count = selectedTodos.size;
    await hookBulkReschedule(newDueDate);
    const dateLabel = new Date(newDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    announce(`${count} task${count > 1 ? 's' : ''} rescheduled to ${dateLabel}`);
  }, [hookBulkReschedule, selectedTodos.size, announce]);

  /**
   * Bulk delete with screen reader announcement
   */
  const bulkDelete = useCallback(async () => {
    const count = selectedTodos.size;
    const tasksToDelete = Array.from(selectedTodos);

    // Delete from database
    const { error } = await supabase
      .from('todos')
      .delete()
      .in('id', tasksToDelete);

    if (error) {
      logger.error('Bulk delete failed', error, { component: 'useTodoBulkOperations' });
      const errorMsg = ContextualErrorMessages.taskDelete(error);
      alert(`${errorMsg.message}. ${errorMsg.action}`);
      return;
    }

    // Update store (optimistic updates already done by hook, but we ensure cleanup)
    tasksToDelete.forEach(id => deleteTodoFromStore(id));

    // Log activity for each deleted task
    tasksToDelete.forEach(id => {
      const todo = todos.find(t => t.id === id);
      if (todo) {
        logActivity({
          action: 'task_deleted',
          userName,
          todoId: id,
          todoText: todo.text,
          details: { bulk_operation: true },
        });
      }
    });

    announce(`${count} task${count > 1 ? 's' : ''} deleted`);
    clearSelection();
    setShowBulkActions(false);
  }, [selectedTodos, todos, userName, deleteTodoFromStore, clearSelection, setShowBulkActions, announce]);

  /**
   * Initiate merge modal for selected tasks
   */
  const initiateMerge = useCallback(() => {
    if (selectedTodos.size < 2) return;
    const todosToMerge = todos.filter(t => selectedTodos.has(t.id));
    openMergeModal(todosToMerge);
  }, [selectedTodos, todos, openMergeModal]);

  /**
   * Merge multiple tasks into one primary task
   */
  const mergeTodos = useCallback(async (primaryTodoId: string, mergeTargets: Todo[], isMerging: boolean) => {
    if (mergeTargets.length < 2 || isMerging) return;

    const primaryTodo = mergeTargets.find(t => t.id === primaryTodoId);
    const secondaryTodos = mergeTargets.filter(t => t.id !== primaryTodoId);

    if (!primaryTodo) return;

    setMergingState(true);

    try {
      // Combine data from all todos
      const combinedNotes = [
        primaryTodo.notes,
        ...secondaryTodos.map(t => t.notes),
        // Add merge history
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

      // Combine text (primary text + secondary texts as context)
      const combinedText = secondaryTodos.length > 0
        ? `${primaryTodo.text} [+${secondaryTodos.length} merged]`
        : primaryTodo.text;

      // Keep highest priority
      const priorityRank: Record<TodoPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const highestPriority = [primaryTodo, ...secondaryTodos]
        .reduce((highest, t) => {
          return priorityRank[t.priority || 'medium'] < priorityRank[highest] ? (t.priority || 'medium') : highest;
        }, primaryTodo.priority || 'medium');

      // Update primary todo in database first
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
        logger.error('Error updating merged todo', updateError, { component: 'useTodoBulkOperations' });
        const errorMsg = ContextualErrorMessages.taskUpdate(updateError);
        alert(`${errorMsg.message}. ${errorMsg.action}`);
        setMergingState(false);
        return;
      }

      // Delete secondary todos from database
      const { error: deleteError } = await supabase
        .from('todos')
        .delete()
        .in('id', secondaryTodos.map(t => t.id));

      if (deleteError) {
        logger.error('Error deleting merged todos', deleteError, { component: 'useTodoBulkOperations' });
        const errorMsg = ContextualErrorMessages.taskDelete(deleteError);
        alert(`Merge partially failed. ${errorMsg.action} Refreshing...`);
        refreshTodos();
        setMergingState(false);
        return;
      }

      // Update UI after successful DB operations
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

      // Announce success
      announce(`${secondaryTodos.length + 1} tasks merged successfully`);

      // Clear selection and close modal
      clearSelection();
      setShowBulkActions(false);
      closeMergeModal();
    } catch (error) {
      logger.error('Error during merge', error, { component: 'useTodoBulkOperations' });
      const errorMsg = ContextualErrorMessages.taskUpdate(error);
      alert(`${errorMsg.message}. ${errorMsg.action}`);
      refreshTodos();
    } finally {
      setMergingState(false);
    }
  }, [userName, updateTodoInStore, deleteTodoFromStore, clearSelection, setShowBulkActions, closeMergeModal, setMergingState, refreshTodos, announce]);

  return {
    bulkAssign,
    bulkComplete,
    bulkReschedule,
    bulkDelete,
    initiateMerge,
    mergeTodos,
  };
}
