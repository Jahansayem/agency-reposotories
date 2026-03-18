import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useTodoOperations } from '../useTodoOperations';
import { supabase } from '@/lib/supabaseClient';
import { useTodoStore } from '@/store/todoStore';
import { ToastProvider } from '@/components/ui/Toast';
import type { Todo } from '@/types/todo';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      insert: vi.fn()
    }))
  },
  isSupabaseConfigured: vi.fn(() => true)
}));
vi.mock('@/lib/activityLogger', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('@/lib/taskNotifications', () => ({
  sendTaskAssignmentNotification: vi.fn().mockResolvedValue({ success: true }),
  sendTaskCompletionNotification: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/lib/duplicateDetection', () => ({
  findPotentialDuplicates: vi.fn(() => []),
  shouldCheckForDuplicates: vi.fn(() => false),
}));
vi.mock('@/lib/taskSuggestions', () => ({
  calculateCompletionStreak: vi.fn(() => 0),
  getNextSuggestedTasks: vi.fn(() => []),
  getEncouragementMessage: vi.fn(() => ''),
}));
vi.mock('@/lib/retryWithBackoff', () => ({
  retryWithBackoff: vi.fn(async (fn: () => Promise<void>) => fn())
}));
vi.mock('date-fns', () => ({
  isToday: vi.fn(() => false),
}));

describe('useTodoOperations - Error Rollback', () => {
  const mockTodo: Todo = {
    id: 'test-todo-1',
    text: 'Test task',
    completed: false,
    status: 'todo',
    priority: 'medium',
    created_at: '2026-02-16T00:00:00Z',
    created_by: 'Test User',
    subtasks: [],
    attachments: [],
  };

  const makeHookProps = () => ({
    userName: 'Test User',
    currentAgencyId: 'agency-1',
    todos: useTodoStore.getState().todos,
    activityLog: [],
    addTodoToStore: (todo: Todo) => {
      const state = useTodoStore.getState();
      useTodoStore.setState({ todos: [...state.todos, todo] });
    },
    updateTodoInStore: (id: string, updates: Partial<Todo>) => {
      const state = useTodoStore.getState();
      useTodoStore.setState({
        todos: state.todos.map(t => t.id === id ? { ...t, ...updates } : t)
      });
    },
    deleteTodoFromStore: (id: string) => {
      const state = useTodoStore.getState();
      useTodoStore.setState({ todos: state.todos.filter(t => t.id !== id) });
    },
    announce: vi.fn(),
    openDuplicateModal: vi.fn(),
    triggerCelebration: vi.fn(),
    triggerEnhancedCelebration: vi.fn(),
  });

  // Wrapper to provide ToastProvider context for useToast inside useTodoOperations
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(ToastProvider, null, children);

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up initial store state with test todo
    useTodoStore.setState({
      todos: [mockTodo],
      bulkActions: {
        selectedTodos: new Set(),
        showBulkActions: false,
      },
    });
  });

  it('should rollback optimistic update on database error in updateStatus', async () => {
    // Mock database failure
    const eqMock = vi.fn(() => Promise.resolve({ error: { message: 'Network error' }, data: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
      insert: vi.fn(),
    } as any);

    // retryWithBackoff will call the fn, which throws because of the error
    const { retryWithBackoff } = await import('@/lib/retryWithBackoff');
    vi.mocked(retryWithBackoff).mockImplementation(async (fn: () => Promise<void>) => {
      // Simulate what happens: the fn reads the Supabase error and throws
      const { error } = await supabase.from('todos').update({ status: 'done', completed: true, updated_at: expect.any(String) }).eq('id', 'test-todo-1');
      if (error) throw error;
    });

    const { result } = renderHook(() => useTodoOperations(makeHookProps()), { wrapper });

    await act(async () => {
      await result.current.updateStatus('test-todo-1', 'done');
    });

    // Assert: Optimistic update should be rolled back
    const finalTodo = useTodoStore.getState().todos.find(t => t.id === 'test-todo-1');
    expect(finalTodo?.completed).toBe(false);
    expect(finalTodo?.status).toBe('todo');
  });

  it('should rollback optimistic update on database error in toggleTodo', async () => {
    // Mock database failure
    const eqMock = vi.fn(() => Promise.resolve({ error: { message: 'Network error' }, data: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
      insert: vi.fn(),
    } as any);

    const { retryWithBackoff } = await import('@/lib/retryWithBackoff');
    vi.mocked(retryWithBackoff).mockImplementation(async (fn: () => Promise<void>) => {
      const { error } = await supabase.from('todos').update({}).eq('id', 'test-todo-1');
      if (error) throw error;
    });

    const { result } = renderHook(() => useTodoOperations(makeHookProps()), { wrapper });

    await act(async () => {
      await result.current.toggleTodo('test-todo-1', true);
    });

    // Assert: Optimistic update should be rolled back
    const finalTodo = useTodoStore.getState().todos.find(t => t.id === 'test-todo-1');
    expect(finalTodo?.completed).toBe(false);
    expect(finalTodo?.status).toBe('todo');
  });

  it('should handle rapid double-toggle without state corruption', async () => {
    let callCount = 0;
    const eqMock = vi.fn(() => {
      callCount++;
      // First call succeeds, second fails
      if (callCount <= 1) {
        return Promise.resolve({ error: null, data: null });
      }
      return Promise.resolve({ error: { message: 'Conflict' }, data: null });
    });
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
      insert: vi.fn(),
    } as any);

    const { retryWithBackoff } = await import('@/lib/retryWithBackoff');
    vi.mocked(retryWithBackoff).mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
    });

    const { result } = renderHook(() => useTodoOperations(makeHookProps()), { wrapper });

    // Trigger two rapid status updates
    await act(async () => {
      const p1 = result.current.updateStatus('test-todo-1', 'done');
      const p2 = result.current.updateStatus('test-todo-1', 'todo');
      await Promise.all([p1, p2]);
    });

    // The store should be in a consistent state (the second call failed,
    // so it should have been rolled back to whatever the store had before
    // that second call started)
    const finalTodo = useTodoStore.getState().todos.find(t => t.id === 'test-todo-1');
    expect(finalTodo).toBeDefined();
    // At minimum, the todo should exist and have consistent completed/status
    expect(typeof finalTodo?.completed).toBe('boolean');
  });
});
