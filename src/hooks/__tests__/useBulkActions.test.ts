import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkActions } from '../useBulkActions';
import { supabase } from '@/lib/supabaseClient';
import { useTodoStore } from '@/store/todoStore';
import type { Todo } from '@/types/todo';
import * as activityLogger from '@/lib/activityLogger';

// Mock dependencies
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/activityLogger', () => ({
  logActivity: vi.fn(),
}));

const mockTodos: Todo[] = [
  {
    id: 'todo-1',
    text: 'First task',
    completed: false,
    status: 'todo',
    priority: 'medium',
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'Derrick',
    subtasks: [],
    attachments: [],
  },
  {
    id: 'todo-2',
    text: 'Second task',
    completed: false,
    status: 'in_progress',
    priority: 'high',
    created_at: '2026-01-02T00:00:00Z',
    created_by: 'Derrick',
    assigned_to: 'Sefra',
    subtasks: [{ id: 'sub-1', text: 'Subtask', completed: false }],
    attachments: [],
  },
  {
    id: 'todo-3',
    text: 'Third task',
    completed: true,
    status: 'done',
    priority: 'low',
    created_at: '2026-01-03T00:00:00Z',
    created_by: 'Sefra',
    subtasks: [],
    attachments: [],
  },
];

describe('useBulkActions', () => {
  let updateMock: any;
  let deleteMock: any;
  let inMock: any;

  beforeEach(() => {
    // Reset store
    useTodoStore.setState({
      todos: mockTodos,
      bulkActions: {
        selectedTodos: new Set(),
        showBulkActions: false,
      },
    });

    // Mock Supabase query chain
    inMock = vi.fn().mockResolvedValue({ data: null, error: null });
    updateMock = {
      update: vi.fn().mockReturnThis(),
      in: inMock,
    };
    deleteMock = {
      delete: vi.fn().mockReturnThis(),
      in: inMock,
    };

    (supabase.from as any).mockReturnValue({
      ...updateMock,
      ...deleteMock,
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    vi.clearAllMocks();
  });

  describe('selection management', () => {
    it('should initialize with empty selection', () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.showBulkActions).toBe(false);
    });

    it('should select a todo', () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      act(() => {
        result.current.handleSelectTodo('todo-1', true);
      });

      const state = useTodoStore.getState();
      expect(state.bulkActions.selectedTodos.has('todo-1')).toBe(true);
    });

    it('should select all visible todos', () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      act(() => {
        result.current.selectAll(['todo-1', 'todo-2', 'todo-3']);
      });

      const state = useTodoStore.getState();
      expect(state.bulkActions.selectedTodos.size).toBe(3);
    });

    it('should clear selection', () => {
      useTodoStore.setState({
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      act(() => {
        result.current.clearSelection();
      });

      const state = useTodoStore.getState();
      expect(state.bulkActions.selectedTodos.size).toBe(0);
    });

    it('should get selected todo objects', () => {
      useTodoStore.setState({
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      const selected = result.current.getSelectedTodos();
      expect(selected).toHaveLength(2);
      expect(selected.map(t => t.id)).toEqual(['todo-1', 'todo-2']);
    });
  });

  describe('bulkDelete', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: mockTodos,
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });
    });

    it('should delete selected todos', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkDelete((count, action) => {
          expect(count).toBe(2);
          action();
        });
      });

      expect(supabase.from).toHaveBeenCalledWith('todos');
      expect(deleteMock.delete).toHaveBeenCalled();
      expect(inMock).toHaveBeenCalledWith('id', ['todo-1', 'todo-2']);

      // Should log activity for each deleted todo
      expect(activityLogger.logActivity).toHaveBeenCalledTimes(2);
      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_deleted',
          details: { bulk_action: true },
        })
      );
    });

    it('should rollback on delete error', async () => {
      inMock.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkDelete((count, action) => action());
      });

      // Should have restored todos to store
      const state = useTodoStore.getState();
      expect(state.todos).toHaveLength(3);
    });

    it('should not delete if no todos selected', async () => {
      useTodoStore.setState({
        bulkActions: {
          selectedTodos: new Set(),
          showBulkActions: false,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));
      const onConfirm = vi.fn();

      await act(async () => {
        await result.current.bulkDelete(onConfirm);
      });

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('bulkAssign', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: mockTodos,
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });
    });

    it('should assign todos to user', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkAssign('Sefra');
      });

      expect(updateMock.update).toHaveBeenCalledWith({
        assigned_to: 'Sefra',
      });
      expect(inMock).toHaveBeenCalledWith('id', ['todo-1', 'todo-2']);

      // Should log activity
      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'assigned_to_changed',
          details: expect.objectContaining({
            to: 'Sefra',
            bulk_action: true,
          }),
        })
      );
    });

    it('should rollback on assign error', async () => {
      inMock.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkAssign('Sefra');
      });

      // Should have rolled back to original assignments
      const state = useTodoStore.getState();
      const todo1 = state.todos.find(t => t.id === 'todo-1');
      expect(todo1?.assigned_to).toBeUndefined();
    });
  });

  describe('bulkComplete', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: mockTodos,
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });
    });

    it('should complete selected todos', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      expect(updateMock.update).toHaveBeenCalledWith({
        completed: true,
        status: 'done',
      });
      expect(inMock).toHaveBeenCalledWith('id', ['todo-1', 'todo-2']);

      // Should only log for todos that weren't already completed
      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_completed',
          details: { bulk_action: true },
        })
      );
    });

    it('should rollback on complete error', async () => {
      inMock.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      // Should have rolled back to original status
      const state = useTodoStore.getState();
      const todo1 = state.todos.find(t => t.id === 'todo-1');
      expect(todo1?.completed).toBe(false);
      expect(todo1?.status).toBe('todo');
    });
  });

  describe('bulkReschedule', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: mockTodos,
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });
    });

    it('should reschedule todos to new date', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));
      const newDate = '2026-02-15T12:00:00Z';

      await act(async () => {
        await result.current.bulkReschedule(newDate);
      });

      expect(updateMock.update).toHaveBeenCalledWith({
        due_date: newDate,
      });
      expect(inMock).toHaveBeenCalledWith('id', ['todo-1', 'todo-2']);

      // Should log activity
      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'due_date_changed',
          details: expect.objectContaining({
            to: newDate,
            bulk_action: true,
          }),
        })
      );
    });

    it('should rollback on reschedule error', async () => {
      inMock.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkReschedule('2026-02-15');
      });

      // Should have rolled back due dates
      const state = useTodoStore.getState();
      const todo1 = state.todos.find(t => t.id === 'todo-1');
      expect(todo1?.due_date).toBeUndefined();
    });
  });

  describe('bulkSetPriority', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: mockTodos,
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });
    });

    it('should set priority for todos', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkSetPriority('urgent');
      });

      expect(updateMock.update).toHaveBeenCalledWith({
        priority: 'urgent',
      });
      expect(inMock).toHaveBeenCalledWith('id', ['todo-1', 'todo-2']);

      // Should log activity
      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'priority_changed',
          details: expect.objectContaining({
            to: 'urgent',
            bulk_action: true,
          }),
        })
      );
    });

    it('should rollback on priority error', async () => {
      inMock.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkSetPriority('urgent');
      });

      // Should have rolled back priorities
      const state = useTodoStore.getState();
      const todo1 = state.todos.find(t => t.id === 'todo-1');
      expect(todo1?.priority).toBe('medium');
    });
  });

  describe('mergeTodos', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: [
          {
            ...mockTodos[0],
            notes: 'Primary notes',
            attachments: [{ id: 'att-1', file_name: 'file1.pdf' }] as any,
          },
          {
            ...mockTodos[1],
            notes: 'Secondary notes',
            subtasks: [{ id: 'sub-1', text: 'Subtask', completed: false }],
          },
        ],
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });

      // Mock both update and delete
      (supabase.from as any).mockImplementation((table: string) => ({
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));
    });

    it('should merge multiple todos into one', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      const success = await act(async () => {
        return await result.current.mergeTodos('todo-1');
      });

      expect(success).toBe(true);

      // Should have updated primary todo with combined data
      expect(supabase.from).toHaveBeenCalledWith('todos');

      // Should log merge activity
      expect(activityLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tasks_merged',
          details: expect.objectContaining({
            merged_count: 1,
            merged_ids: ['todo-2'],
          }),
        })
      );
    });

    it('should combine notes from all todos', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.mergeTodos('todo-1');
      });

      const state = useTodoStore.getState();
      const primaryTodo = state.todos.find(t => t.id === 'todo-1');

      expect(primaryTodo?.notes).toContain('Primary notes');
      expect(primaryTodo?.notes).toContain('Secondary notes');
      expect(primaryTodo?.notes).toContain('Merged Tasks');
    });

    it('should keep highest priority', async () => {
      useTodoStore.setState({
        todos: [
          { ...mockTodos[0], priority: 'low' },
          { ...mockTodos[1], priority: 'urgent' },
          { ...mockTodos[2], priority: 'medium' },
        ],
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2', 'todo-3']),
          showBulkActions: true,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.mergeTodos('todo-1');
      });

      const state = useTodoStore.getState();
      const primaryTodo = state.todos.find(t => t.id === 'todo-1');
      expect(primaryTodo?.priority).toBe('urgent');
    });

    it('should not merge if less than 2 todos selected', async () => {
      useTodoStore.setState({
        bulkActions: {
          selectedTodos: new Set(['todo-1']),
          showBulkActions: true,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      const success = await act(async () => {
        return await result.current.mergeTodos('todo-1');
      });

      expect(success).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle merge errors gracefully', async () => {
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      const success = await act(async () => {
        return await result.current.mergeTodos('todo-1');
      });

      expect(success).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should calculate date offset', () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      const today = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(today.getDate() + 3);

      const offset = result.current.getDateOffset(3);
      expect(offset).toBe(threeDaysLater.toISOString().split('T')[0]);
    });

    it('should calculate negative date offset', () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);

      const offset = result.current.getDateOffset(-3);
      expect(offset).toBe(threeDaysAgo.toISOString().split('T')[0]);
    });
  });

  describe('state management', () => {
    it('should clear selection after bulk operations', async () => {
      useTodoStore.setState({
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      const state = useTodoStore.getState();
      expect(state.bulkActions.selectedTodos.size).toBe(0);
      expect(state.bulkActions.showBulkActions).toBe(false);
    });

    it('should track selected count', () => {
      useTodoStore.setState({
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2', 'todo-3']),
          showBulkActions: true,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      expect(result.current.selectedCount).toBe(3);
    });
  });
});
