'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Todo } from '@/types/todo';
import { logger } from '@/lib/logger';

/**
 * React Query hook for fetching and managing todos
 * Sprint 3 Issue #31: React Query Integration
 *
 * Features:
 * - Automatic caching (30s stale time, 5min cache time)
 * - Optimistic updates for mutations
 * - Automatic rollback on error
 * - Loading and error states
 */

const TODOS_QUERY_KEY = ['todos'] as const;

/**
 * Fetch all todos with React Query caching
 */
export function useTodosQuery() {
  return useQuery({
    queryKey: TODOS_QUERY_KEY,
    queryFn: async () => {
      logger.info('Fetching todos via React Query');

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch todos', error);
        throw error;
      }

      return data as Todo[];
    },
    // Data is fresh for 30 seconds, then becomes stale
    staleTime: 30000,
    // Cache persists for 5 minutes
    gcTime: 300000,
  });
}

/**
 * Mutation hook for completing a todo with optimistic updates
 */
export function useCompleteTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      logger.info('Completing todo', { id, completed });

      const { error } = await supabase
        .from('todos')
        .update({ completed, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        logger.error('Failed to complete todo', error);
        throw error;
      }

      return { id, completed };
    },
    // Optimistic update: Update UI immediately before server responds
    onMutate: async ({ id, completed }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);

      // Optimistically update to the new value
      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old) => {
        if (!old) return [];
        return old.map((todo) => (todo.id === id ? { ...todo, completed } : todo));
      });

      // Return context with the previous todos in case we need to rollback
      return { previousTodos };
    },
    // If mutation fails, rollback using the context
    onError: (error, _variables, context) => {
      logger.error('Todo mutation failed, rolling back', error);

      if (context?.previousTodos) {
        queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, context.previousTodos);
      }
    },
    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for updating a todo with optimistic updates
 */
export function useUpdateTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Todo> }) => {
      logger.info('Updating todo', { id, updates });

      const { error } = await supabase
        .from('todos')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        logger.error('Failed to update todo', error);
        throw error;
      }

      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      const previousTodos = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);

      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old) => {
        if (!old) return [];
        return old.map((todo) => (todo.id === id ? { ...todo, ...updates } : todo));
      });

      return { previousTodos };
    },
    onError: (error, _variables, context) => {
      logger.error('Todo update failed, rolling back', error);

      if (context?.previousTodos) {
        queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, context.previousTodos);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for deleting a todo with optimistic updates
 */
export function useDeleteTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      logger.info('Deleting todo', { id });

      const { error } = await supabase.from('todos').delete().eq('id', id);

      if (error) {
        logger.error('Failed to delete todo', error);
        throw error;
      }

      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      const previousTodos = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);

      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old) => {
        if (!old) return [];
        return old.filter((todo) => todo.id !== id);
      });

      return { previousTodos };
    },
    onError: (error, _variables, context) => {
      logger.error('Todo deletion failed, rolling back', error);

      if (context?.previousTodos) {
        queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, context.previousTodos);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for creating a todo with optimistic updates
 */
export function useCreateTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTodo: Partial<Todo>) => {
      logger.info('Creating todo', newTodo);

      const { data, error } = await supabase
        .from('todos')
        .insert([
          {
            ...newTodo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        logger.error('Failed to create todo', error);
        throw error;
      }

      return data as Todo;
    },
    // For creates, we don't do optimistic updates since we need the server-generated ID
    // Instead, we just invalidate and refetch after success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
    onError: (error) => {
      logger.error('Todo creation failed', error);
    },
  });
}
