import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTodoData } from '../useTodoData';
import { supabase } from '@/lib/supabaseClient';
import { useTodoStore } from '@/store/todoStore';
import type { AuthUser, Todo } from '@/types/todo';
import * as activityLogger from '@/lib/activityLogger';
import * as taskNotifications from '@/lib/taskNotifications';
import * as reminderService from '@/lib/reminderService';

// Mock dependencies
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/activityLogger', () => ({
  logActivity: vi.fn(),
}));

vi.mock('@/lib/taskNotifications', () => ({
  sendTaskAssignmentNotification: vi.fn(),
}));

vi.mock('@/lib/reminderService', () => ({
  createAutoReminders: vi.fn().mockResolvedValue({ success: true, created: 2 }),
  updateAutoReminders: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/contexts/AgencyContext', () => ({
  useAgency: vi.fn(() => ({
    currentAgencyId: 'test-agency-id',
    isMultiTenancyEnabled: false,
    hasPermission: vi.fn(() => true),
    isLoading: false,
  })),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: vi.fn(() => ({
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockUser: AuthUser = {
  id: 'user-1',
  name: 'Derrick',
  pin_hash: 'hash',
  color: '#0033A0',
  created_at: '2026-01-01T00:00:00Z',
};

const mockTodo: Todo = {
  id: 'todo-1',
  text: 'Test task',
  completed: false,
  status: 'todo',
  priority: 'medium',
  created_at: '2026-01-01T00:00:00Z',
  created_by: 'Derrick',
  subtasks: [],
  attachments: [],
};

describe('useTodoData', () => {
  let selectMock: any;
  let insertMock: any;
  let updateMock: any;
  let deleteMock: any;
  let channelMock: any;

  beforeEach(() => {
    // Reset store
    useTodoStore.setState({
      todos: [],
      users: [],
      usersWithColors: [],
      loading: true,
      connected: false,
      error: null,
      showWelcomeBack: false,
      totalTodoCount: 0,
      hasMoreTodos: false,
      loadingMore: false,
    });

    // Mock Supabase query chain
    selectMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    insertMock = {
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    updateMock = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    deleteMock = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    channelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback: any) => {
        callback?.('SUBSCRIBED');
        return channelMock;
      }),
    };

    (supabase.from as any).mockReturnValue({
      ...selectMock,
      ...insertMock,
      ...updateMock,
      ...deleteMock,
    });

    (supabase.channel as any).mockReturnValue(channelMock);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTodos', () => {
    it('should fetch todos and users on mount', async () => {
      const mockTodos = [mockTodo];
      const mockUsers = [{ name: 'Derrick', color: '#0033A0' }];

      // Mock parallel queries
      selectMock.select.mockImplementation((query: string) => {
        if (query === '*') {
          return Promise.resolve({ data: mockTodos, error: null, count: 1 });
        }
        if (query === 'name, color') {
          return Promise.resolve({ data: mockUsers, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });

      renderHook(() => useTodoData(mockUser));

      await waitFor(() => {
        const state = useTodoStore.getState();
        expect(state.loading).toBe(false);
      });

      const state = useTodoStore.getState();
      expect(state.todos).toHaveLength(1);
      expect(state.users).toContain('Derrick');
    });

    it('should handle fetch errors gracefully', async () => {
      selectMock.select.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      renderHook(() => useTodoData(mockUser));

      await waitFor(() => {
        const state = useTodoStore.getState();
        expect(state.error).toBeTruthy();
        expect(state.loading).toBe(false);
      });
    });

    it('should normalize todos with missing subtasks/attachments', async () => {
      const todoWithoutArrays = {
        ...mockTodo,
        subtasks: null,
        attachments: undefined,
      };

      selectMock.select.mockResolvedValue({
        data: [todoWithoutArrays],
        error: null,
        count: 1,
      });

      renderHook(() => useTodoData(mockUser));

      await waitFor(() => {
        const state = useTodoStore.getState();
        const todo = state.todos[0];
        expect(Array.isArray(todo?.subtasks)).toBe(true);
        expect(Array.isArray(todo?.attachments)).toBe(true);
      });
    });
  });

  describe('createTodo', () => {
    it('should create a todo with optimistic update', async () => {
      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.createTodo(
          'New task',
          'high',
          '2026-02-10T12:00:00Z',
          'Derrick'
        );
      });

      // Should have called insert
      expect(supabase.from).toHaveBeenCalledWith('todos');
      expect(insertMock.insert).toHaveBeenCalled();

      // Should log activity
      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_created',
          userName: 'Derrick',
        })
      );
    });

    it('should rollback on insert error', async () => {
      insertMock.insert.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      const createdTodo = await act(async () => {
        return await result.current.createTodo('New task', 'medium');
      });

      expect(createdTodo).toBeNull();
      // Toast warning should have been called (mocked)
    });

    it('should send notification when assigning to someone else', async () => {
      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.createTodo(
          'Task for Sefra',
          'high',
          undefined,
          'Sefra'
        );
      });

      expect(taskNotifications.sendTaskAssignmentNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedTo: 'Sefra',
          assignedBy: 'Derrick',
        })
      );
    });

    it('should create auto-reminders for tasks with due dates', async () => {
      selectMock.single.mockResolvedValue({
        data: { id: 'user-2' },
        error: null,
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.createTodo(
          'Task with due date',
          'medium',
          '2026-02-15T12:00:00Z',
          'Sefra'
        );
      });

      expect(reminderService.createAutoReminders).toHaveBeenCalled();
    });

    it('should include customer linking data', async () => {
      const { result } = renderHook(() => useTodoData(mockUser));

      const customer = {
        id: 'customer-1',
        name: 'John Smith',
        segment: 'MONOLINE_AUTO',
      };

      await act(async () => {
        await result.current.createTodo(
          'Follow up with customer',
          'high',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          customer
        );
      });

      const insertCall = insertMock.insert.mock.calls[0][0][0];
      expect(insertCall.customer_id).toBe('customer-1');
      expect(insertCall.customer_name).toBe('John Smith');
      expect(insertCall.customer_segment).toBe('MONOLINE_AUTO');
    });
  });

  describe('updateTodo', () => {
    beforeEach(() => {
      // Set initial todos in store
      useTodoStore.setState({
        todos: [mockTodo],
      });
    });

    it('should update a todo with optimistic update', async () => {
      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.updateTodo('todo-1', {
          text: 'Updated text',
          priority: 'urgent',
        });
      });

      expect(updateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Updated text',
          priority: 'urgent',
        })
      );
    });

    it('should rollback on update error', async () => {
      updateMock.eq.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      const success = await act(async () => {
        return await result.current.updateTodo('todo-1', { text: 'New text' });
      });

      expect(success).toBe(false);
      // Should have rolled back to original todo
      const state = useTodoStore.getState();
      expect(state.todos[0].text).toBe('Test task');
    });

    it('should update auto-reminders when due date changes', async () => {
      selectMock.single.mockResolvedValue({
        data: { id: 'user-1' },
        error: null,
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.updateTodo('todo-1', {
          due_date: '2026-03-01T12:00:00Z',
        });
      });

      expect(reminderService.updateAutoReminders).toHaveBeenCalled();
    });
  });

  describe('deleteTodo', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: [mockTodo],
      });
    });

    it('should delete a todo with optimistic update', async () => {
      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.deleteTodo('todo-1');
      });

      expect(deleteMock.delete).toHaveBeenCalled();
      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_deleted',
        })
      );
    });

    it('should rollback on delete error', async () => {
      deleteMock.eq.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      const success = await act(async () => {
        return await result.current.deleteTodo('todo-1');
      });

      expect(success).toBe(false);
      // Should have restored the todo
      const state = useTodoStore.getState();
      expect(state.todos).toHaveLength(1);
    });
  });

  describe('toggleComplete', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: [mockTodo],
      });
    });

    it('should toggle completion status', async () => {
      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.toggleComplete('todo-1');
      });

      expect(updateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: true,
          status: 'done',
        })
      );

      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_completed',
        })
      );
    });

    it('should reopen completed task', async () => {
      useTodoStore.setState({
        todos: [{ ...mockTodo, completed: true, status: 'done' }],
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.toggleComplete('todo-1');
      });

      expect(updateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: false,
          status: 'todo',
        })
      );

      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_reopened',
        })
      );
    });
  });

  describe('loadMoreTodos', () => {
    it('should load more todos with pagination', async () => {
      useTodoStore.setState({
        todos: [mockTodo],
        hasMoreTodos: true,
        loadingMore: false,
      });

      selectMock.range.mockResolvedValue({
        data: [{ ...mockTodo, id: 'todo-2', text: 'Second task' }],
        error: null,
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.loadMoreTodos();
      });

      const state = useTodoStore.getState();
      expect(state.todos).toHaveLength(2);
    });

    it('should not load if already loading', async () => {
      useTodoStore.setState({
        todos: [mockTodo],
        hasMoreTodos: true,
        loadingMore: true,
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.loadMoreTodos();
      });

      // Should not have called range query
      expect(selectMock.range).not.toHaveBeenCalled();
    });

    it('should not load if no more todos', async () => {
      useTodoStore.setState({
        todos: [mockTodo],
        hasMoreTodos: false,
        loadingMore: false,
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.loadMoreTodos();
      });

      expect(selectMock.range).not.toHaveBeenCalled();
    });
  });

  describe('real-time subscription', () => {
    it('should set up subscription on mount', () => {
      renderHook(() => useTodoData(mockUser));

      expect(supabase.channel).toHaveBeenCalledWith('todos-all');
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'todos',
        }),
        expect.any(Function)
      );
      expect(channelMock.subscribe).toHaveBeenCalled();
    });

    it('should clean up subscription on unmount', () => {
      const { unmount } = renderHook(() => useTodoData(mockUser));

      unmount();

      expect(supabase.removeChannel).toHaveBeenCalledWith(channelMock);
    });

    it('should set connected status on subscription', async () => {
      renderHook(() => useTodoData(mockUser));

      await waitFor(() => {
        const state = useTodoStore.getState();
        expect(state.connected).toBe(true);
      });
    });
  });

  describe('reordering protection', () => {
    it('should provide setReordering function', () => {
      const { result } = renderHook(() => useTodoData(mockUser));

      expect(result.current.setReordering).toBeDefined();
      expect(typeof result.current.setReordering).toBe('function');
    });

    it('should set reordering ref', () => {
      const { result } = renderHook(() => useTodoData(mockUser));

      act(() => {
        result.current.setReordering(true);
      });

      // Internal ref should be set (not directly testable, but function should not error)
      expect(() => result.current.setReordering(false)).not.toThrow();
    });
  });

  describe('refresh', () => {
    it('should refetch todos', async () => {
      selectMock.select.mockResolvedValue({
        data: [mockTodo],
        error: null,
        count: 1,
      });

      const { result } = renderHook(() => useTodoData(mockUser));

      await act(async () => {
        await result.current.refresh();
      });

      // Should have called fetchTodos again
      expect(supabase.from).toHaveBeenCalledWith('todos');
    });
  });
});
