/**
 * useTodoData Hook
 *
 * Handles fetching todos, real-time subscriptions, and CRUD operations.
 * Encapsulates all Supabase interactions for todos.
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useTodoStore } from '@/store/todoStore';
import { Todo, TodoPriority, Subtask } from '@/types/todo';
import type { LinkedCustomer } from '@/types/customer';
import { AuthUser } from '@/types/todo';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/activityLogger';
import { shouldShowWelcomeNotification } from '@/components/WelcomeBackNotification';
import { logger } from '@/lib/logger';
import { fetchWithCsrf } from '@/lib/csrf';
import { sendTaskAssignmentNotification } from '@/lib/taskNotifications';
import { createAutoReminders, updateAutoReminders } from '@/lib/reminderService';
import { useAgency } from '@/contexts/AgencyContext';
import { parseTodo } from '@/lib/validators';
import { useToast } from '@/components/ui/Toast';

// Number of todos to fetch per page
const TODOS_PER_PAGE = 200;

// REACT-007: Legacy module-level flag - kept for backward compatibility
// but new code should use the ref returned from useTodoData
let _isReordering = false;
export function setReorderingFlag(value: boolean) {
  _isReordering = value;
}

export function useTodoData(currentUser: AuthUser) {
  // REACT-007: Reorder guard as ref - scoped per component instance
  // When true, real-time UPDATE events that only change display_order
  // are suppressed to prevent snap-back during drag-and-drop.
  const isReorderingRef = useRef(false);
  const {
    setTodos,
    addTodo: addTodoToStore,
    updateTodo: updateTodoInStore,
    deleteTodo: deleteTodoFromStore,
    setUsers,
    setUsersWithColors,
    setLoading,
    setConnected,
    setError,
    setShowWelcomeBack,
    setTotalTodoCount,
    setHasMoreTodos,
    setLoadingMore,
    appendTodos,
  } = useTodoStore();

  const { currentAgencyId, isMultiTenancyEnabled, hasPermission, isLoading: agencyLoading } = useAgency();

  // UX-008: Toast for rollback notifications on optimistic update failures
  const toast = useToast();
  const canViewAllTasks = hasPermission('can_view_all_tasks');
  const userName = currentUser.name;

  // Fetch todos and users with pagination
  const fetchTodos = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    // FIX: Wait for agency context to be ready when multi-tenancy is enabled
    // This prevents fetching with null agencyId during initial load
    if (isMultiTenancyEnabled && agencyLoading) {
      // Agency context is still loading, skip this fetch - it will be re-triggered
      // when agencyLoading becomes false (due to useEffect dependency)
      return;
    }

    // Build query with agency filter if multi-tenancy is enabled
    let countQuery = supabase.from('todos').select('*', { count: 'exact', head: true });
    // Order by created_at descending (display_order ordering happens in useFilters for custom sort)
    let todosQuery = supabase.from('todos').select('*').order('created_at', { ascending: false }).limit(TODOS_PER_PAGE);

    if (isMultiTenancyEnabled && currentAgencyId) {
      countQuery = countQuery.eq('agency_id', currentAgencyId);
      todosQuery = todosQuery.eq('agency_id', currentAgencyId);
    }

    // Staff data scoping (M6 fix): when user lacks can_view_all_tasks,
    // only fetch tasks they created or are assigned to.
    if (!canViewAllTasks) {
      // Sanitize userName for PostgREST filter syntax (escape special chars that could break filter)
      const sanitizeForFilter = (str: string) => str.replace(/[,().]/g, '');
      const safeUserName = sanitizeForFilter(userName);
      const scopeFilter = `created_by.eq.${safeUserName},assigned_to.eq.${safeUserName}`;
      countQuery = countQuery.or(scopeFilter);
      todosQuery = todosQuery.or(scopeFilter);
    }

    // Fetch count, initial todos (limited), and users in parallel
    const [countResult, todosResult, usersResult] = await Promise.all([
      countQuery,
      todosQuery,
      supabase.from('users').select('name, color').order('name'),
    ]);

    if (todosResult.error) {
      logger.error('Error fetching todos', todosResult.error, { component: 'useTodoData' });
      setError('Failed to connect to database. Please check your Supabase configuration.');
    } else {
      // Normalize todos to ensure subtasks and attachments are always arrays
      const fetchedTodos = (todosResult.data || []).map((todo: any) => ({
        ...todo,
        subtasks: Array.isArray(todo.subtasks) ? todo.subtasks : [],
        attachments: Array.isArray(todo.attachments) ? todo.attachments : [],
      }));
      const totalCount = countResult.count || fetchedTodos.length;

      setTodos(fetchedTodos);
      setTotalTodoCount(totalCount);
      setHasMoreTodos(fetchedTodos.length < totalCount);
      
      const registeredUsers = (usersResult.data || []).map((u: { name: string }) => u.name);
      const todoUsers = [...new Set((fetchedTodos).map((t: Todo) => t.created_by).filter(Boolean))];
      setUsers([...new Set([...registeredUsers, ...todoUsers])]);
      setUsersWithColors((usersResult.data || []).map((u: { name: string; color: string }) => ({
        name: u.name,
        color: u.color || '#0033A0'
      })));
      setError(null);
    }
    setLoading(false);
  }, [setTodos, setUsers, setUsersWithColors, setLoading, setError, setTotalTodoCount, setHasMoreTodos, isMultiTenancyEnabled, currentAgencyId, canViewAllTasks, userName, agencyLoading]);

  // Setup real-time subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const init = async () => {
      await fetchTodos();
      if (isMounted) {
        if (shouldShowWelcomeNotification(currentUser)) {
          setShowWelcomeBack(true);
        }
      }
    };

    init();

    // Build channel name and filter based on multi-tenancy status
    const channelName = isMultiTenancyEnabled && currentAgencyId
      ? `todos-${currentAgencyId}`
      : 'todos-all';

    const subscriptionConfig: {
      event: '*';
      schema: 'public';
      table: 'todos';
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table: 'todos',
    };

    // Add agency filter if multi-tenancy is enabled
    if (isMultiTenancyEnabled && currentAgencyId) {
      subscriptionConfig.filter = `agency_id=eq.${currentAgencyId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        subscriptionConfig,
        (payload) => {
          if (!isMounted) return;

          // Staff data scoping (M6 fix): when user lacks can_view_all_tasks,
          // only allow todos they created or are assigned to into the store.
          const isVisibleToUser = (todo: Todo) =>
            canViewAllTasks || todo.created_by === userName || todo.assigned_to === userName;

          if (payload.eventType === 'INSERT') {
            // BUGFIX TYPE-001: Validate payload instead of dangerous cast
            const newTodo = parseTodo(payload.new);
            if (!newTodo) {
              logger.warn('Invalid todo payload received in INSERT', { payload: payload.new, component: 'useTodoData' });
              return;
            }

            if (!isVisibleToUser(newTodo)) return;
            // Check if todo already exists (to avoid duplicates from optimistic updates)
            const store = useTodoStore.getState();
            const exists = store.todos.some((t) => t.id === newTodo.id);
            if (!exists) {
              addTodoToStore(newTodo);
            }
          } else if (payload.eventType === 'UPDATE') {
            // BUGFIX TYPE-001: Validate payload instead of dangerous cast
            const updatedTodo = parseTodo(payload.new);
            if (!updatedTodo) {
              logger.warn('Invalid todo payload received in UPDATE', { payload: payload.new, component: 'useTodoData' });
              return;
            }
            // During reorder, suppress updates that only change display_order/updated_at
            // to prevent the list from reshuffling mid-drag
            // REACT-007: Check both module-level flag (legacy) and instance ref
            if (_isReordering || isReorderingRef.current) {
              const existing = useTodoStore.getState().todos.find(t => t.id === updatedTodo.id);
              if (existing) {
                const isReorderOnly =
                  existing.text === updatedTodo.text &&
                  existing.completed === updatedTodo.completed &&
                  existing.status === updatedTodo.status &&
                  existing.priority === updatedTodo.priority &&
                  existing.assigned_to === updatedTodo.assigned_to &&
                  existing.notes === updatedTodo.notes;
                if (isReorderOnly) return;
              }
            }
            if (isVisibleToUser(updatedTodo)) {
              updateTodoInStore(updatedTodo.id, updatedTodo);
            } else {
              // Todo is no longer visible to this user (e.g. unassigned from them).
              // Remove it from the store.
              deleteTodoFromStore(updatedTodo.id);
            }
          } else if (payload.eventType === 'DELETE') {
            deleteTodoFromStore(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        if (isMounted) setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchTodos, currentUser, setShowWelcomeBack, setConnected, setError, setLoading, addTodoToStore, updateTodoInStore, deleteTodoFromStore, currentAgencyId, isMultiTenancyEnabled, canViewAllTasks, userName]);

  // Create a new todo
  const createTodo = useCallback(async (
    text: string,
    priority: TodoPriority,
    dueDate?: string,
    assignedTo?: string,
    subtasks?: Subtask[],
    transcription?: string,
    sourceFile?: File,
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
      // Customer linking
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

    // Set agency_id for multi-tenancy data isolation
    if (currentAgencyId) {
      insertData.agency_id = currentAgencyId;
    }

    if (newTodo.status && newTodo.status !== 'todo') insertData.status = newTodo.status;
    if (newTodo.priority && newTodo.priority !== 'medium') insertData.priority = newTodo.priority;
    if (newTodo.due_date) insertData.due_date = newTodo.due_date;
    if (newTodo.assigned_to) insertData.assigned_to = newTodo.assigned_to;
    if (newTodo.subtasks && newTodo.subtasks.length > 0) insertData.subtasks = newTodo.subtasks;
    if (newTodo.transcription) insertData.transcription = newTodo.transcription;
    // Customer linking
    if (newTodo.customer_id) insertData.customer_id = newTodo.customer_id;
    if (newTodo.customer_name) insertData.customer_name = newTodo.customer_name;
    if (newTodo.customer_segment) insertData.customer_segment = newTodo.customer_segment;

    const { error: insertError } = await supabase.from('todos').insert([insertData]);

    if (insertError) {
      logger.error('Error adding todo', insertError, { component: 'useTodoData' });
      // UX-008: Show rollback toast and revert optimistic update
      toast.warning('Reverting...', {
        description: 'Failed to create task. Changes have been reverted.',
        duration: 5000,
      });
      deleteTodoFromStore(newTodo.id);
      return null;
    }

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

    // Send notification if task is assigned to someone else
    if (newTodo.assigned_to && newTodo.assigned_to !== userName) {
      sendTaskAssignmentNotification({
        taskId: newTodo.id,
        taskText: newTodo.text,
        assignedTo: newTodo.assigned_to,
        assignedBy: userName,
        dueDate: newTodo.due_date,
        priority: newTodo.priority,
        subtasks: newTodo.subtasks,
      });
    }

    // Auto-attach source file if provided
    if (sourceFile) {
      try {
        const formData = new FormData();
        formData.append('file', sourceFile);
        formData.append('todoId', newTodo.id);
        formData.append('userName', userName);

        await fetchWithCsrf('/api/attachments', {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        logger.error('Failed to attach source file', err, { component: 'useTodoData' });
      }
    }

    // Create auto-reminders for tasks with due dates
    if (newTodo.due_date && newTodo.assigned_to) {
      // Get the user ID for the assignee to send push notifications
      const { data: assigneeData } = await supabase
        .from('users')
        .select('id')
        .eq('name', newTodo.assigned_to)
        .single();

      if (assigneeData?.id) {
        const reminderResult = await createAutoReminders(
          newTodo.id,
          newTodo.due_date,
          assigneeData.id,
          userName
        );
        if (!reminderResult.success) {
          logger.warn('Failed to create auto-reminders', {
            component: 'useTodoData',
            error: reminderResult.error,
          });
        } else if (reminderResult.created > 0) {
          logger.info(`Created ${reminderResult.created} auto-reminders for task`, {
            component: 'useTodoData',
            taskId: newTodo.id,
          });
        }
      }
    }

    return newTodo;
  }, [userName, addTodoToStore, deleteTodoFromStore, toast, currentAgencyId]);

  // Update an existing todo
  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    // Get current todo for rollback using store.getState() to avoid stale closure
    const currentTodo = useTodoStore.getState().todos.find((t) => t.id === id);
    if (!currentTodo) return false;

    // Optimistic update
    updateTodoInStore(id, {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userName,
    });

    const { error } = await supabase
      .from('todos')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: userName,
      })
      .eq('id', id);

    if (error) {
      logger.error('Error updating todo', error, { component: 'useTodoData' });
      // UX-008: Show rollback toast and revert optimistic update
      toast.warning('Reverting...', {
        description: 'Failed to update task. Changes have been reverted.',
        duration: 5000,
      });
      updateTodoInStore(id, currentTodo);
      return false;
    }

    // Update auto-reminders if due_date changed
    const dueDateChanged = 'due_date' in updates && updates.due_date !== currentTodo.due_date;
    const assignedToChanged = 'assigned_to' in updates && updates.assigned_to !== currentTodo.assigned_to;

    if (dueDateChanged || assignedToChanged) {
      const assignedTo = updates.assigned_to ?? currentTodo.assigned_to;
      const newDueDate = updates.due_date ?? currentTodo.due_date;

      if (assignedTo) {
        // Get user ID for the assignee
        const { data: assigneeData } = await supabase
          .from('users')
          .select('id')
          .eq('name', assignedTo)
          .single();

        if (assigneeData?.id) {
          const reminderResult = await updateAutoReminders(
            id,
            newDueDate || null,
            assigneeData.id,
            userName
          );
          if (!reminderResult.success) {
            logger.warn('Failed to update auto-reminders', {
              component: 'useTodoData',
              error: reminderResult.error,
            });
          }
        }
      }
    }

    return true;
  }, [userName, updateTodoInStore, toast]);

  // Delete a todo
  const deleteTodo = useCallback(async (id: string) => {
    // Get current todo for rollback using store.getState() to avoid stale closure
    const currentTodo = useTodoStore.getState().todos.find((t) => t.id === id);
    if (!currentTodo) return false;

    // Optimistic delete
    deleteTodoFromStore(id);

    const { error } = await supabase.from('todos').delete().eq('id', id);

    if (error) {
      logger.error('Error deleting todo', error, { component: 'useTodoData' });
      // UX-008: Show rollback toast and revert optimistic delete
      toast.warning('Reverting...', {
        description: 'Failed to delete task. The task has been restored.',
        duration: 5000,
      });
      addTodoToStore(currentTodo);
      return false;
    }

    // Log activity
    logActivity({
      action: 'task_deleted',
      userName,
      todoId: id,
      todoText: currentTodo.text,
    });

    return true;
  }, [userName, deleteTodoFromStore, addTodoToStore, toast]);

  // Toggle todo completion
  const toggleComplete = useCallback(async (id: string) => {
    // Use store.getState() to avoid stale closure over todos
    const todo = useTodoStore.getState().todos.find((t) => t.id === id);
    if (!todo) return false;

    const newCompleted = !todo.completed;
    const newStatus = newCompleted ? 'done' : 'todo';

    const success = await updateTodo(id, {
      completed: newCompleted,
      status: newStatus,
    });

    if (success) {
      logActivity({
        action: newCompleted ? 'task_completed' : 'task_reopened',
        userName,
        todoId: id,
        todoText: todo.text,
      });
    }

    return success;
  }, [userName, updateTodo]);

  // Refresh data
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchTodos();
  }, [fetchTodos, setLoading]);

  /**
   * Load more todos for pagination
   * Fetches the next page of todos and appends them to the existing list
   */
  const loadMoreTodos = useCallback(async () => {
    // Use store.getState() to get current values to avoid stale closure
    const state = useTodoStore.getState();
    if (!state.hasMoreTodos || state.loadingMore) return;

    setLoadingMore(true);

    try {
      const currentCount = state.todos.length;
      let query = supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentCount, currentCount + TODOS_PER_PAGE - 1);

      // Add agency filter if multi-tenancy is enabled
      if (isMultiTenancyEnabled && currentAgencyId) {
        query = query.eq('agency_id', currentAgencyId);
      }

      // Staff data scoping for pagination too
      if (!canViewAllTasks) {
        // Sanitize userName for PostgREST filter syntax (escape special chars that could break filter)
        const sanitizeForFilter = (str: string) => str.replace(/[,().]/g, '');
        const safeUserName = sanitizeForFilter(userName);
        query = query.or(`created_by.eq.${safeUserName},assigned_to.eq.${safeUserName}`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error loading more todos', error, { component: 'useTodoData' });
      } else if (data) {
        appendTodos(data);
        // If we got fewer than requested, there are no more
        setHasMoreTodos(data.length === TODOS_PER_PAGE);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [setLoadingMore, appendTodos, setHasMoreTodos, isMultiTenancyEnabled, currentAgencyId, canViewAllTasks, userName]);

  // REACT-007: Setter for the reordering ref (scoped per component instance)
  const setReordering = useCallback((value: boolean) => {
    isReorderingRef.current = value;
    // Also set module-level flag for backward compatibility
    _isReordering = value;
  }, []);

  return {
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    refresh,
    loadMoreTodos,
    setReordering, // REACT-007: Prefer this over module-level setReorderingFlag
  };
}
