import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTodoOperations } from '../useTodoOperations';
import type { Todo } from '@/types/todo';
import { fetchWithCsrf } from '@/lib/csrf';
import { logActivity } from '@/lib/activityLogger';
import { useToast } from '@/components/ui/Toast';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/activityLogger', () => ({
  logActivity: vi.fn(),
}));

vi.mock('@/lib/taskNotifications', () => ({
  sendTaskAssignmentNotification: vi.fn(),
  sendTaskCompletionNotification: vi.fn(),
}));

vi.mock('@/lib/csrf', () => ({
  fetchWithCsrf: vi.fn(),
}));

vi.mock('@/lib/taskSuggestions', () => ({
  calculateCompletionStreak: vi.fn(() => 0),
  getNextSuggestedTasks: vi.fn(() => []),
  getEncouragementMessage: vi.fn(() => 'Great momentum'),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: vi.fn(),
}));

describe('useTodoOperations toggleTodo', () => {
  const mockTodos: Todo[] = [
    {
      id: 'todo-1',
      text: 'Call customer',
      completed: false,
      status: 'todo',
      priority: 'medium',
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: 'Derrick',
    },
    {
      id: 'todo-2',
      text: 'Send policy docs',
      completed: true,
      status: 'done',
      priority: 'high',
      created_at: '2026-01-02T00:00:00.000Z',
      created_by: 'Derrick',
    },
  ];

  const updateTodoInStore = vi.fn();
  const announce = vi.fn();
  const addTodoToStore = vi.fn();
  const deleteTodoFromStore = vi.fn();
  const openDuplicateModal = vi.fn();
  const triggerCelebration = vi.fn();
  const triggerEnhancedCelebration = vi.fn();
  const warningToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      warning: warningToast,
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      loading: vi.fn(),
      promise: vi.fn(),
      dismiss: vi.fn(),
      dismissAll: vi.fn(),
      update: vi.fn(),
      custom: vi.fn(),
    });
  });

  it('should toggle to completed and persist through /api/todos', async () => {
    (fetchWithCsrf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    const { result } = renderHook(() =>
      useTodoOperations({
        userName: 'Derrick',
        currentAgencyId: 'agency-1',
        todos: mockTodos,
        activityLog: [],
        addTodoToStore,
        updateTodoInStore,
        deleteTodoFromStore,
        announce,
        openDuplicateModal,
        triggerCelebration,
        triggerEnhancedCelebration,
      })
    );

    await act(async () => {
      await result.current.toggleTodo('todo-1', true);
    });

    expect(updateTodoInStore).toHaveBeenCalledWith(
      'todo-1',
      expect.objectContaining({ completed: true, status: 'done' })
    );

    expect(fetchWithCsrf).toHaveBeenCalledWith(
      '/api/todos',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const [, requestInit] = (fetchWithCsrf as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body).toMatchObject({
      id: 'todo-1',
      completed: true,
      status: 'done',
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'task_completed',
        todoId: 'todo-1',
      })
    );
    expect(announce).toHaveBeenCalledWith('Task completed: Call customer');
    expect(warningToast).not.toHaveBeenCalled();
  });

  it('should rollback and show warning toast when API update fails', async () => {
    (fetchWithCsrf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: 'Failed to update todo' }),
    });

    const { result } = renderHook(() =>
      useTodoOperations({
        userName: 'Derrick',
        currentAgencyId: 'agency-1',
        todos: mockTodos,
        activityLog: [],
        addTodoToStore,
        updateTodoInStore,
        deleteTodoFromStore,
        announce,
        openDuplicateModal,
        triggerCelebration,
        triggerEnhancedCelebration,
      })
    );

    await act(async () => {
      await result.current.toggleTodo('todo-1', true);
    });

    expect(updateTodoInStore).toHaveBeenNthCalledWith(
      1,
      'todo-1',
      expect.objectContaining({ completed: true, status: 'done' })
    );
    expect(updateTodoInStore).toHaveBeenNthCalledWith(2, 'todo-1', mockTodos[0]);
    expect(warningToast).toHaveBeenCalledWith('Reverting...', {
      description: 'Failed to update task. Changes have been reverted.',
      duration: 5000,
    });
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('should reopen completed task with status=todo', async () => {
    (fetchWithCsrf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    const { result } = renderHook(() =>
      useTodoOperations({
        userName: 'Derrick',
        currentAgencyId: 'agency-1',
        todos: mockTodos,
        activityLog: [],
        addTodoToStore,
        updateTodoInStore,
        deleteTodoFromStore,
        announce,
        openDuplicateModal,
        triggerCelebration,
        triggerEnhancedCelebration,
      })
    );

    await act(async () => {
      await result.current.toggleTodo('todo-2', false);
    });

    const [, requestInit] = (fetchWithCsrf as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body).toMatchObject({
      id: 'todo-2',
      completed: false,
      status: 'todo',
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'task_reopened',
        todoId: 'todo-2',
      })
    );
    expect(announce).toHaveBeenCalledWith('Task reopened: Send policy docs');
  });
});
