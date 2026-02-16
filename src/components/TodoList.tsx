/**
 * TodoList - Main task management component (REFACTORED)
 *
 * This component has been refactored to extract logic into:
 * - Custom hooks for state and operations
 * - Dedicated components for modals and UI sections
 *
 * Original: 2,365 lines
 * Refactored: ~600 lines (73% reduction)
 *
 * Architecture:
 * - useTodoListState: Consolidates all state management
 * - useTodoOperations: Task CRUD operations
 * - useTodoBulkOperations: Bulk operations and merging
 * - useTodoKeyboardShortcuts: Keyboard handling
 * - TodoModals: Handles celebration, email, completion modals
 * - TodoMergeModal: Merge tasks modal
 * - TodoListContent: Main list/kanban rendering (existing)
 * - BulkActionBar: Bulk action toolbar (existing)
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Todo, TodoStatus, TodoPriority, Subtask, type AuthUser, type QuickFilter, type ActivityLogEntry, type WaitingContactType } from '@/types/todo';
import { usePermission } from '@/hooks/usePermission';
import { logger } from '@/lib/logger';
import { useTodoStore, hydrateFocusMode } from '@/store/todoStore';
import { setReorderingFlag } from '@/hooks';
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';
import PullToRefresh from './PullToRefresh';
import StatusLine from './StatusLine';
import BottomTabs from './BottomTabs';
import { ExitFocusModeButton } from './FocusModeToggle';
import { LoadingState, ErrorState, ConnectionStatus, TodoHeader, TodoFiltersBar, TodoListContent, BulkActionBar } from './todo';
import { TaskDetailModal } from './task-detail';
import { useShouldUseSections } from './TaskSections';
import { useTheme } from '@/contexts/ThemeContext';
import { useAgency } from '@/contexts/AgencyContext';
import { logActivity } from '@/lib/activityLogger';
import LiveRegion from './LiveRegion';
import { fetchWithCsrf } from '@/lib/csrf';
import { sendTaskReassignmentNotification } from '@/lib/taskNotifications';
import { ContextualErrorMessages } from '@/lib/errorMessages';
import { TodoModals } from './todo';
import { TodoMergeModal } from './todo/TodoMergeModal';
import {
  StrategicDashboardSkeleton,
  ActivityFeedSkeleton,
} from './LoadingSkeletons';

// Custom hooks for refactored logic
import { useTodoListState } from '@/hooks/useTodoListState';
import { useTodoOperations } from '@/hooks/useTodoOperations';
import { useTodoBulkOperations } from '@/hooks/useTodoBulkOperations';
import { useTodoKeyboardShortcuts } from '@/hooks/useTodoKeyboardShortcuts';

// Lazy load secondary features
const StrategicDashboard = dynamic(() => import('./StrategicDashboard'), {
  ssr: false,
  loading: () => <StrategicDashboardSkeleton />,
});

const ActivityFeed = dynamic(() => import('./ActivityFeed'), {
  ssr: false,
  loading: () => <ActivityFeedSkeleton />,
});

interface TodoListProps {
  currentUser: AuthUser;
  onUserChange: (user: AuthUser | null) => void;
  initialFilter?: QuickFilter | null;
  autoFocusAddTask?: boolean;
  onAddTaskModalOpened?: () => void;
  onInitialFilterApplied?: () => void;
  selectedTaskId?: string | null;
  onSelectedTaskHandled?: () => void;
}

export default function TodoList({
  currentUser,
  onUserChange,
  initialFilter,
  autoFocusAddTask,
  onAddTaskModalOpened,
  onInitialFilterApplied,
  selectedTaskId,
  onSelectedTaskHandled
}: TodoListProps) {
  const userName = currentUser.name;
  const { currentAgencyId } = useAgency();
  const canViewArchive = usePermission('can_view_archive');
  const canViewStrategicGoals = usePermission('can_view_strategic_goals');
  const canManageTemplates = usePermission('can_manage_templates');

  // Consolidated state management
  const state = useTodoListState({
    currentUser,
    initialFilter,
    onInitialFilterApplied
  });

  // Activity log for streak calculation
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  // Detail modal state
  const [detailTodoId, setDetailTodoId] = useState<string | null>(null);
  const detailTodo = useMemo(() =>
    state.todos.find(t => t.id === detailTodoId) || null,
    [state.todos, detailTodoId]
  );

  // Task operations
  const operations = useTodoOperations({
    userName,
    currentAgencyId,
    todos: state.todos,
    activityLog,
    addTodoToStore: state.addTodoToStore,
    updateTodoInStore: state.updateTodoInStore,
    deleteTodoFromStore: state.deleteTodoFromStore,
    announce: state.announce,
    openDuplicateModal: state.modalState.openDuplicateModal,
    triggerCelebration: state.modalState.triggerCelebration,
    triggerEnhancedCelebration: state.modalState.triggerEnhancedCelebration,
  });

  // Bulk operations
  const bulkOps = useTodoBulkOperations({
    userName,
    todos: state.todos,
    selectedTodos: state.selectedTodos,
    updateTodoInStore: state.updateTodoInStore,
    deleteTodoFromStore: state.deleteTodoFromStore,
    clearSelection: state.clearSelection,
    setShowBulkActions: state.setShowBulkActions,
    refreshTodos: state.refreshTodos,
    announce: state.announce,
    hookBulkAssign: state.hookBulkAssign,
    hookBulkComplete: state.hookBulkComplete,
    hookBulkReschedule: state.hookBulkReschedule,
    openMergeModal: state.modalState.openMergeModal,
    closeMergeModal: state.modalState.closeMergeModal,
    setMergingState: state.modalState.setMergingState,
  });

  // Keyboard shortcuts
  useTodoKeyboardShortcuts({
    visibleTodos: state.visibleTodos,
    showBulkActions: state.showBulkActions,
    selectedTodos: state.selectedTodos,
    setSearchQuery: state.setSearchQuery,
    setQuickFilter: state.setQuickFilter,
    setShowBulkActions: state.setShowBulkActions,
    setFocusMode: state.setFocusMode,
    toggleFocusMode: state.toggleFocusMode,
    clearSelection: state.clearSelection,
    selectAll: state.selectAll,
    openShortcuts: state.modalState.openShortcuts,
  });

  // Determine if sections should be used
  const shouldUseSections = useShouldUseSections(state.sortOption);

  // Fetch activity log on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setActivityLog(data as ActivityLogEntry[]);
      });
  }, []);

  // Auto-open add task modal when requested
  useEffect(() => {
    if (autoFocusAddTask) {
      state.setShowAddTaskModal(true);
      onAddTaskModalOpened?.();
    }
  }, [autoFocusAddTask, onAddTaskModalOpened]);

  // Hydrate focus mode from localStorage
  useEffect(() => {
    hydrateFocusMode();
  }, []);

  // Archive tick interval
  useEffect(() => {
    const interval = setInterval(() => {
      state.modalState.incrementArchiveTick();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Additional task operations (not in extracted hook)
  const confirmDeleteTodo = useCallback(async (id: string) => {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    const confirmed = confirm(`Delete task: "${todo.text}"?`);
    if (!confirmed) return;

    state.deleteTodoFromStore(id);

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting todo', error, { component: 'TodoList' });
      const errorMsg = ContextualErrorMessages.taskDelete(error);
      alert(`${errorMsg.message}. ${errorMsg.action}`);
      state.addTodoToStore(todo);
    } else {
      logActivity({
        action: 'task_deleted',
        userName,
        todoId: id,
        todoText: todo.text,
      });
      state.announce(`Task deleted: ${todo.text}`);
    }
  }, [state.todos, state.deleteTodoFromStore, state.addTodoToStore, state.announce, userName]);

  const assignTodo = useCallback(async (id: string, assignedTo: string | null) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { assigned_to: assignedTo || undefined });

    const { error } = await supabase
      .from('todos')
      .update({ assigned_to: assignedTo })
      .eq('id', id);

    if (error) {
      logger.error('Error assigning todo', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { assigned_to: oldTodo.assigned_to });
    } else {
      logActivity({
        action: 'assigned_to_changed',
        userName,
        todoId: id,
        todoText: oldTodo.text,
        details: { from: oldTodo.assigned_to, to: assignedTo },
      });
      state.announce(`Task reassigned to ${assignedTo || 'unassigned'}: ${oldTodo.text}`);

      if (assignedTo && assignedTo !== userName) {
        sendTaskReassignmentNotification(
          id,
          oldTodo.text,
          oldTodo.assigned_to || '',
          assignedTo,
          userName,
          oldTodo.priority,
          oldTodo.due_date || undefined
        );
      }
    }
  }, [state.todos, state.updateTodoInStore, state.announce, userName]);

  const setDueDate = useCallback(async (id: string, dueDate: string | null) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { due_date: dueDate || undefined });

    const { error } = await supabase
      .from('todos')
      .update({ due_date: dueDate })
      .eq('id', id);

    if (error) {
      logger.error('Error setting due date', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { due_date: oldTodo.due_date });
    } else {
      logActivity({
        action: 'due_date_changed',
        userName,
        todoId: id,
        todoText: oldTodo.text,
        details: { from: oldTodo.due_date, to: dueDate },
      });
    }
  }, [state.todos, state.updateTodoInStore, userName]);

  const setReminder = useCallback(async (id: string, reminderAt: string | null) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { reminder_at: reminderAt || undefined, reminder_sent: false });

    const { error } = await supabase
      .from('todos')
      .update({ reminder_at: reminderAt, reminder_sent: false })
      .eq('id', id);

    if (error) {
      logger.error('Error setting reminder', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { reminder_at: oldTodo.reminder_at });
    }
  }, [state.todos, state.updateTodoInStore]);

  const markWaiting = useCallback(async (id: string, contactType: WaitingContactType, followUpHours?: number) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, {
      waiting_for_response: true,
      waiting_since: new Date().toISOString(),
      waiting_contact_type: contactType,
      follow_up_after_hours: followUpHours || 48,
    });

    const { error } = await supabase
      .from('todos')
      .update({
        waiting_for_response: true,
        waiting_since: new Date().toISOString(),
        waiting_contact_type: contactType,
        follow_up_after_hours: followUpHours || 48,
      })
      .eq('id', id);

    if (error) {
      logger.error('Error marking waiting', error, { component: 'TodoList' });
      state.updateTodoInStore(id, {
        waiting_for_response: oldTodo.waiting_for_response,
        waiting_since: oldTodo.waiting_since,
        waiting_contact_type: oldTodo.waiting_contact_type,
        follow_up_after_hours: oldTodo.follow_up_after_hours,
      });
    }
  }, [state.todos, state.updateTodoInStore]);

  const clearWaiting = useCallback(async (id: string) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, {
      waiting_for_response: false,
      waiting_since: undefined,
      waiting_contact_type: undefined,
    });

    const { error } = await supabase
      .from('todos')
      .update({
        waiting_for_response: false,
        waiting_since: null,
        waiting_contact_type: null,
      })
      .eq('id', id);

    if (error) {
      logger.error('Error clearing waiting', error, { component: 'TodoList' });
      state.updateTodoInStore(id, {
        waiting_for_response: oldTodo.waiting_for_response,
        waiting_since: oldTodo.waiting_since,
        waiting_contact_type: oldTodo.waiting_contact_type,
      });
    }
  }, [state.todos, state.updateTodoInStore]);

  const setPriority = useCallback(async (id: string, priority: TodoPriority) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { priority });

    const { error } = await supabase
      .from('todos')
      .update({ priority })
      .eq('id', id);

    if (error) {
      logger.error('Error setting priority', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { priority: oldTodo.priority });
    } else {
      logActivity({
        action: 'priority_changed',
        userName,
        todoId: id,
        todoText: oldTodo.text,
        details: { from: oldTodo.priority, to: priority },
      });
    }
  }, [state.todos, state.updateTodoInStore, userName]);

  const setPrivacy = useCallback(async (id: string, isPrivate: boolean) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { is_private: isPrivate });

    const { error: updateError } = await supabase
      .from('todos')
      .update({ is_private: isPrivate })
      .eq('id', id);

    if (updateError) {
      logger.error('Error updating task privacy', updateError, { component: 'TodoList' });
      state.updateTodoInStore(id, { is_private: oldTodo.is_private });
    } else if (oldTodo.is_private !== isPrivate) {
      logActivity({
        action: 'task_privacy_changed',
        userName,
        todoId: id,
        todoText: oldTodo.text,
        details: { from: !!oldTodo.is_private, to: isPrivate },
      });
      state.announce(`Task is now ${isPrivate ? 'private' : 'public'}: ${oldTodo.text}`);
    }
  }, [state.todos, state.updateTodoInStore, state.announce, userName]);

  const updateText = useCallback(async (id: string, text: string) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { text });

    const { error } = await supabase
      .from('todos')
      .update({ text })
      .eq('id', id);

    if (error) {
      logger.error('Error updating text', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { text: oldTodo.text });
    } else {
      logActivity({
        action: 'task_updated',
        userName,
        todoId: id,
        todoText: text,
        details: { field: 'text' },
      });
    }
  }, [state.todos, state.updateTodoInStore, userName]);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { notes });

    const { error } = await supabase
      .from('todos')
      .update({ notes })
      .eq('id', id);

    if (error) {
      logger.error('Error updating notes', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { notes: oldTodo.notes });
    } else {
      logActivity({
        action: 'notes_updated',
        userName,
        todoId: id,
        todoText: oldTodo.text,
      });
    }
  }, [state.todos, state.updateTodoInStore, userName]);

  const setRecurrence = useCallback(async (id: string, recurrence: 'daily' | 'weekly' | 'monthly' | null) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { recurrence: recurrence || undefined });

    const { error } = await supabase
      .from('todos')
      .update({ recurrence })
      .eq('id', id);

    if (error) {
      logger.error('Error setting recurrence', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { recurrence: oldTodo.recurrence });
    }
  }, [state.todos, state.updateTodoInStore]);

  const updateSubtasks = useCallback(async (id: string, subtasks: Subtask[]) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { subtasks });

    const { error } = await supabase
      .from('todos')
      .update({ subtasks })
      .eq('id', id);

    if (error) {
      logger.error('Error updating subtasks', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { subtasks: oldTodo.subtasks });
    }
  }, [state.todos, state.updateTodoInStore]);

  const updateAttachments = useCallback(async (id: string, attachments: any[]) => {
    const oldTodo = state.todos.find(t => t.id === id);
    if (!oldTodo) return;

    state.updateTodoInStore(id, { attachments });

    const { error } = await supabase
      .from('todos')
      .update({ attachments })
      .eq('id', id);

    if (error) {
      logger.error('Error updating attachments', error, { component: 'TodoList' });
      state.updateTodoInStore(id, { attachments: oldTodo.attachments });
    }
  }, [state.todos, state.updateTodoInStore]);

  const handleOpenDetail = useCallback((todoId: string) => {
    setDetailTodoId(todoId);
  }, []);

  const handleDetailUpdate = useCallback(async (id: string, updates: Partial<Todo>) => {
    state.updateTodoInStore(id, updates);
  }, [state.updateTodoInStore]);

  // Save task as template
  const saveAsTemplate = useCallback(async (name: string, isShared: boolean) => {
    const templateTodo = state.modalState.templateTodo;
    if (!templateTodo) return;

    const response = await fetchWithCsrf('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: templateTodo.text,
        default_priority: templateTodo.priority || 'medium',
        default_assigned_to: templateTodo.assigned_to || null,
        subtasks: (templateTodo.subtasks || []).map(st => ({
          text: st.text,
          priority: st.priority,
          estimatedMinutes: st.estimatedMinutes,
        })),
        created_by: userName,
        is_shared: isShared,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save template');
    }
  }, [state.modalState.templateTodo, userName]);

  // Handle drag end for manual reordering
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = state.filteredAndSortedTodos.findIndex((t) => t.id === active.id);
      const newIndex = state.filteredAndSortedTodos.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove([...state.filteredAndSortedTodos], oldIndex, newIndex);
      const snapshot = [...state.todos];

      setReorderingFlag(true);

      try {
        const updates = reordered.map((todo, idx) => ({
          id: todo.id,
          display_order: idx,
        }));

        const response = await fetchWithCsrf('/api/todos/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });

        if (!response.ok) {
          throw new Error('Reorder API failed');
        }

        // Update local state
        reordered.forEach((todo, idx) => {
          state.updateTodoInStore(todo.id, { display_order: idx });
        });

        state.announce('Task reordered');
      } catch (error) {
        logger.error('Failed to persist task order', error as Error, { component: 'TodoList' });
        state.setTodosInStore(snapshot);
        state.announce('Failed to reorder task. Please try again.');
      } finally {
        setReorderingFlag(false);
      }
    }
  }, [state.filteredAndSortedTodos, state.todos, state.updateTodoInStore, state.setTodosInStore, state.announce]);

  // Handle duplicate detection actions
  const handleCreateTaskAnyway = useCallback(() => {
    if (state.modalState.pendingTask) {
      operations.createTodoDirectly(
        state.modalState.pendingTask.text,
        state.modalState.pendingTask.priority,
        state.modalState.pendingTask.dueDate,
        state.modalState.pendingTask.assignedTo,
        state.modalState.pendingTask.subtasks,
        state.modalState.pendingTask.transcription,
        state.modalState.pendingTask.sourceFile
      );
    }
    state.modalState.clearDuplicateState();
  }, [state.modalState.pendingTask, operations.createTodoDirectly, state.modalState.clearDuplicateState]);

  const handleAddToExistingTask = useCallback(async (existingTodoId: string) => {
    if (!state.modalState.pendingTask) return;

    const existingTodo = state.todos.find(t => t.id === existingTodoId);
    if (!existingTodo) return;

    const combinedNotes = [
      existingTodo.notes,
      `\n--- Added Content (${new Date().toLocaleString()}) ---`,
      state.modalState.pendingTask.text !== existingTodo.text ? state.modalState.pendingTask.text : null,
      state.modalState.pendingTask.transcription ? `\nTranscription:\n${state.modalState.pendingTask.transcription}` : null,
    ].filter(Boolean).join('\n');

    const combinedSubtasks = [
      ...(existingTodo.subtasks || []),
      ...(state.modalState.pendingTask.subtasks || []),
    ];

    const priorityRank: Record<TodoPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const higherPriority = priorityRank[state.modalState.pendingTask.priority] < priorityRank[existingTodo.priority || 'medium']
      ? state.modalState.pendingTask.priority
      : existingTodo.priority;

    let finalDueDate = existingTodo.due_date;
    if (state.modalState.pendingTask.dueDate) {
      if (!existingTodo.due_date || new Date(state.modalState.pendingTask.dueDate) < new Date(existingTodo.due_date)) {
        finalDueDate = state.modalState.pendingTask.dueDate;
      }
    }

    state.updateTodoInStore(existingTodoId, {
      notes: combinedNotes,
      subtasks: combinedSubtasks,
      priority: higherPriority,
      due_date: finalDueDate,
    });

    const { error: updateError } = await supabase
      .from('todos')
      .update({
        notes: combinedNotes,
        subtasks: combinedSubtasks,
        priority: higherPriority,
        due_date: finalDueDate,
      })
      .eq('id', existingTodoId);

    if (updateError) {
      logger.error('Error updating existing todo', updateError, { component: 'TodoList' });
      state.updateTodoInStore(existingTodoId, {
        notes: existingTodo.notes,
        subtasks: existingTodo.subtasks,
        priority: existingTodo.priority,
        due_date: existingTodo.due_date,
      });
    } else {
      if (state.modalState.pendingTask.sourceFile) {
        try {
          const formData = new FormData();
          formData.append('file', state.modalState.pendingTask.sourceFile);
          formData.append('todoId', existingTodoId);
          formData.append('userName', userName);

          const response = await fetchWithCsrf('/api/attachments', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const { attachment } = await response.json();
            const currentTodo = state.todos.find(t => t.id === existingTodoId);
            if (currentTodo) {
              state.updateTodoInStore(existingTodoId, {
                attachments: [...(currentTodo.attachments || []), attachment]
              });
            }
          }
        } catch (err) {
          logger.error('Error attaching file to existing task', err, { component: 'TodoList' });
        }
      }

      logActivity({
        action: 'task_updated',
        userName,
        todoId: existingTodoId,
        todoText: existingTodo.text,
        details: {
          merged_content: true,
          added_subtasks: (state.modalState.pendingTask.subtasks?.length || 0),
          has_transcription: !!state.modalState.pendingTask.transcription,
        },
      });
    }

    state.modalState.clearDuplicateState();
  }, [state.modalState.pendingTask, state.todos, state.updateTodoInStore, userName]);

  // Wrapper for mergeTodos to pass current state
  const handleMergeTodos = useCallback((primaryId: string) => {
    bulkOps.mergeTodos(primaryId, state.modalState.mergeTargets, state.modalState.isMerging);
  }, [bulkOps.mergeTodos, state.modalState.mergeTargets, state.modalState.isMerging]);

  // Loading/error states
  if (state.loading) {
    return <LoadingState />;
  }

  if (state.error) {
    return <ErrorState error={state.error} />;
  }

  return (
    <PullToRefresh onRefresh={state.refreshTodos}>
      <div className="min-h-screen transition-colors bg-[var(--background)]">
        <LiveRegion message={state.announcement} />

        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white focus:px-4 focus:py-2 focus:rounded-[var(--radius-lg)] focus:z-50">
          Skip to main content
        </a>

        <TodoHeader
          currentUser={currentUser}
          onUserChange={onUserChange}
          viewMode={state.viewMode}
          setViewMode={state.setViewMode}
          onAddTask={() => state.setShowAddTaskModal(true)}
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          showAdvancedFilters={state.showAdvancedFilters}
          setShowAdvancedFilters={state.setShowAdvancedFilters}
          onResetFilters={() => {
            state.setQuickFilter('all');
            state.setShowCompleted(false);
            state.setHighPriorityOnly(false);
            state.setSearchQuery('');
            state.setStatusFilter('all');
            state.setAssignedToFilter('all');
            state.setCustomerFilter('all');
            state.setHasAttachmentsFilter(null);
            state.setDateRangeFilter({ start: '', end: '' });
          }}
        />

        {!state.focusMode && <ConnectionStatus connected={state.connected} />}
        <ExitFocusModeButton />

        <div className="flex transition-all duration-300 ease-out min-h-[calc(100vh-72px)]">
          <main id="main-content" className="flex-1 min-w-0 mx-auto px-4 sm:px-6 py-6 w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl">
            {!state.focusMode && (state.quickFilter !== 'all' || state.highPriorityOnly) && (
              <div className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
                <span>Showing:</span>
                {state.quickFilter === 'my_tasks' && <span className="font-medium text-[var(--accent)]">My Tasks</span>}
                {state.quickFilter === 'due_today' && <span className="font-medium text-[var(--warning)]">Due Today</span>}
                {state.quickFilter === 'overdue' && <span className="font-medium text-[var(--danger)]">Overdue</span>}
                {state.quickFilter === 'all' && state.highPriorityOnly && <span className="font-medium text-[var(--danger)]">All Tasks</span>}
                {state.highPriorityOnly && <span className="text-[var(--danger)]">• High Priority Only</span>}
              </div>
            )}

            {!state.focusMode && (
              <div className="mb-4">
                <StatusLine
                  stats={state.stats}
                  quickFilter={state.quickFilter}
                  highPriorityOnly={state.highPriorityOnly}
                  showCompleted={state.showCompleted}
                  onFilterAll={() => { state.setQuickFilter('all'); state.setShowCompleted(false); }}
                  onFilterDueToday={() => state.setQuickFilter('due_today')}
                  onFilterOverdue={() => state.setQuickFilter('overdue')}
                />
              </div>
            )}

            {!state.focusMode && (
              <TodoFiltersBar
                quickFilter={state.quickFilter}
                setQuickFilter={state.setQuickFilter}
                highPriorityOnly={state.highPriorityOnly}
                setHighPriorityOnly={state.setHighPriorityOnly}
                showCompleted={state.showCompleted}
                setShowCompleted={state.setShowCompleted}
                showAdvancedFilters={state.showAdvancedFilters}
                setShowAdvancedFilters={state.setShowAdvancedFilters}
                statusFilter={state.statusFilter}
                setStatusFilter={state.setStatusFilter}
                assignedToFilter={state.assignedToFilter}
                setAssignedToFilter={state.setAssignedToFilter}
                customerFilter={state.customerFilter}
                setCustomerFilter={state.setCustomerFilter}
                hasAttachmentsFilter={state.hasAttachmentsFilter}
                setHasAttachmentsFilter={state.setHasAttachmentsFilter}
                dateRangeFilter={state.dateRangeFilter}
                setDateRangeFilter={state.setDateRangeFilter}
                sortOption={state.sortOption}
                setSortOption={state.setSortOption}
                searchQuery={state.searchQuery}
                setSearchQuery={state.setSearchQuery}
                showMoreDropdown={state.showMoreDropdown}
                setShowMoreDropdown={state.setShowMoreDropdown}
                showTemplatePicker={state.showTemplatePicker}
                setShowTemplatePicker={state.setShowTemplatePicker}
                showBulkActions={state.showBulkActions}
                setShowBulkActions={state.setShowBulkActions}
                clearSelection={state.clearSelection}
                useSectionedView={state.useSectionedView}
                setUseSectionedView={state.setUseSectionedView}
                shouldUseSections={shouldUseSections}
                users={state.users}
                uniqueCustomers={state.uniqueCustomers}
                onAddFromTemplate={(text, priority, assignedTo, subtasks) => {
                  const normalizedSubtasks: Subtask[] | undefined = subtasks?.map(s => ({
                    id: s.id,
                    text: s.text,
                    completed: s.completed,
                    priority: ('priority' in s ? (s as Subtask).priority : 'medium') as TodoPriority,
                  }));
                  operations.addTodo(text, priority, undefined, assignedTo, normalizedSubtasks);
                }}
                userName={userName}
              />
            )}

            <TodoListContent
              todos={state.filteredAndSortedTodos}
              users={state.users}
              currentUserName={userName}
              viewMode={state.viewMode}
              useSectionedView={state.useSectionedView}
              shouldUseSections={shouldUseSections}
              sortOption={state.sortOption}
              selectedTodos={state.selectedTodos}
              showBulkActions={state.showBulkActions}
              searchQuery={state.searchQuery}
              quickFilter={state.quickFilter}
              stats={state.stats}
              selectedTaskId={selectedTaskId}
              onSelectedTaskHandled={onSelectedTaskHandled}
              onDragEnd={handleDragEnd}
              onSelectTodo={(id: string) => state.handleSelectTodo(id, true)}
              onToggle={operations.toggleTodo}
              onDelete={confirmDeleteTodo}
              onAssign={assignTodo}
              onSetDueDate={setDueDate}
              onSetReminder={setReminder}
              onMarkWaiting={markWaiting}
              onClearWaiting={clearWaiting}
              onSetPriority={setPriority}
              onStatusChange={operations.updateStatus}
              onUpdateText={updateText}
              onDuplicate={operations.duplicateTodo}
              onUpdateNotes={updateNotes}
              onSetRecurrence={setRecurrence}
              onUpdateSubtasks={updateSubtasks}
              onUpdateAttachments={updateAttachments}
              onSaveAsTemplate={canManageTemplates ? (t) => state.modalState.openTemplateModal(t) : undefined}
              onEmailCustomer={(todo) => state.modalState.openEmailModal([todo])}
              onSetPrivacy={setPrivacy}
              onOpenDetail={handleOpenDetail}
              onClearSearch={() => state.setSearchQuery('')}
              onAddTask={() => {
                const input = document.querySelector('textarea[placeholder*="task"]') as HTMLTextAreaElement;
                if (input) input.focus();
              }}
            />

            {detailTodo && (
              <TaskDetailModal
                todo={detailTodo}
                isOpen={!!detailTodo}
                onClose={() => setDetailTodoId(null)}
                currentUser={currentUser}
                users={state.users}
                onUpdate={handleDetailUpdate}
                onDelete={async (id: string) => { confirmDeleteTodo(id); }}
                onComplete={operations.toggleTodo}
                onMarkWaiting={markWaiting}
                onClearWaiting={clearWaiting}
                onSetReminder={setReminder}
                onDuplicate={operations.duplicateTodo}
                onSaveAsTemplate={canManageTemplates ? (t) => state.modalState.openTemplateModal(t) : undefined}
                onEmailCustomer={(todo) => state.modalState.openEmailModal([todo])}
                onUpdateAttachments={updateAttachments}
              />
            )}

            {!state.focusMode && (
              <button
                onClick={() => state.modalState.openShortcuts()}
                className="mt-8 w-full text-center text-xs py-2 rounded-[var(--radius-lg)] transition-colors text-slate-400 hover:text-slate-500 hover:bg-slate-100"
              >
                <span className="hidden sm:inline">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200">N</kbd> new
                  <span className="mx-2">|</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200">/</kbd> search
                  <span className="mx-2">|</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200">?</kbd> all shortcuts
                </span>
                <span className="sm:hidden">Tap for keyboard shortcuts</span>
              </button>
            )}
          </main>
        </div>

        {/* All modals - TodoModals handles most, TodoMergeModal is separate */}
        <TodoModals
          currentUser={currentUser}
          onUserChange={onUserChange}
          todos={state.todos}
          users={state.users}
          showCelebration={state.modalState.showCelebration}
          celebrationText={state.modalState.celebrationText}
          dismissCelebration={state.modalState.dismissCelebration}
          showEnhancedCelebration={state.modalState.showEnhancedCelebration}
          celebrationData={state.modalState.celebrationData}
          dismissEnhancedCelebration={state.modalState.dismissEnhancedCelebration}
          showProgressSummary={state.modalState.showProgressSummary}
          closeProgressSummary={state.modalState.closeProgressSummary}
          showWelcomeBack={state.modalState.showWelcomeBack}
          closeWelcomeBack={state.modalState.closeWelcomeBack}
          openProgressSummary={state.modalState.openProgressSummary}
          confirmDialog={state.modalState.confirmDialog}
          closeConfirmDialog={state.modalState.closeConfirmDialog}
          showAddTaskModal={state.showAddTaskModal}
          setShowAddTaskModal={state.setShowAddTaskModal}
          onAddTodo={operations.addTodo}
          templateTodo={state.modalState.templateTodo}
          closeTemplateModal={state.modalState.closeTemplateModal}
          onSaveAsTemplate={saveAsTemplate}
          showCompletionSummary={state.modalState.showCompletionSummary}
          completedTaskForSummary={state.modalState.completedTaskForSummary}
          closeCompletionSummary={state.modalState.closeCompletionSummary}
          openCompletionSummary={state.modalState.openCompletionSummary}
          userName={userName}
          showDuplicateModal={state.modalState.showDuplicateModal}
          pendingTask={state.modalState.pendingTask}
          duplicateMatches={state.modalState.duplicateMatches}
          onCreateTaskAnyway={handleCreateTaskAnyway}
          onAddToExistingTask={handleAddToExistingTask}
          onCancelDuplicateDetection={state.modalState.clearDuplicateState}
          showEmailModal={state.modalState.showEmailModal}
          emailTargetTodos={state.modalState.emailTargetTodos}
          closeEmailModal={state.modalState.closeEmailModal}
          selectedArchivedTodo={state.modalState.selectedArchivedTodo}
          selectArchivedTodo={state.modalState.selectArchivedTodo}
          agencyId={currentAgencyId || undefined}
          onNextTaskClick={(taskId) => {
            const taskElement = document.getElementById(`todo-${taskId}`);
            if (taskElement) {
              taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              taskElement.classList.add('ring-2', 'ring-blue-500');
              setTimeout(() => {
                taskElement.classList.remove('ring-2', 'ring-blue-500');
              }, 2000);
            }
          }}
        />

        {/* Merge Modal - separate component for clean extraction */}
        <TodoMergeModal
          isOpen={state.modalState.showMergeModal}
          mergeTargets={state.modalState.mergeTargets}
          selectedPrimaryId={state.modalState.selectedPrimaryId}
          isMerging={state.modalState.isMerging}
          onClose={state.modalState.closeMergeModal}
          onSelectPrimary={state.modalState.setMergePrimaryId}
          onMerge={handleMergeTodos}
        />

        {state.showBulkActions && state.selectedTodos.size > 0 && (
          <BulkActionBar
            selectedCount={state.selectedTodos.size}
            users={state.users}
            viewMode={state.viewMode}
            onClearSelection={state.clearSelection}
            onBulkDelete={bulkOps.bulkDelete}
            onBulkComplete={bulkOps.bulkComplete}
            onBulkAssign={bulkOps.bulkAssign}
            onBulkReschedule={bulkOps.bulkReschedule}
            onInitiateMerge={bulkOps.initiateMerge}
            getDateOffset={state.getDateOffset}
          />
        )}

        {!state.focusMode && (
          <BottomTabs
            stats={state.stats}
            quickFilter={state.quickFilter}
            showCompleted={state.showCompleted}
            onFilterChange={state.setQuickFilter}
            onShowCompletedChange={state.setShowCompleted}
          />
        )}

        {!state.focusMode && <div className="h-16 md:hidden" />}
      </div>
    </PullToRefresh>
  );
}
