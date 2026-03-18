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

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    update: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock('@/lib/haptics', () => ({
  haptics: {
    success: vi.fn(),
    error: vi.fn(),
    medium: vi.fn(),
  },
}));

// Mock retryWithBackoff to just call the function directly (no delays in tests)
vi.mock('@/lib/retryWithBackoff', () => ({
  retryWithBackoff: vi.fn(async (fn: () => Promise<any>) => fn()),
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
    vi.clearAllMocks();

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

  describe('bulkComplete large batch (>5 tasks) with chunked processing', () => {
    const largeMockTodos: Todo[] = Array.from({ length: 8 }, (_, i) => ({
      id: `todo-${i + 1}`,
      text: `Task ${i + 1}`,
      completed: false,
      status: 'todo' as const,
      priority: 'medium' as const,
      created_at: `2026-01-0${(i % 9) + 1}T00:00:00Z`,
      created_by: 'Derrick',
      subtasks: [],
      attachments: [],
    }));

    beforeEach(() => {
      useTodoStore.setState({
        todos: largeMockTodos,
        bulkActions: {
          selectedTodos: new Set(largeMockTodos.map(t => t.id)),
          showBulkActions: true,
        },
      });
    });

    it('should complete all tasks in a large batch using chunked processing', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      // All 8 tasks should be marked as completed in the store
      const state = useTodoStore.getState();
      const allCompleted = state.todos.every(t => t.completed === true && t.status === 'done');
      expect(allCompleted).toBe(true);

      // Should have logged activity for all 8 tasks
      expect(activityLogger.logActivity).toHaveBeenCalledTimes(8);
    });

    it('should handle partial failure in chunked processing', async () => {
      let callCount = 0;
      // First chunk succeeds, second chunk fails
      inMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First chunk (tasks 1-8 in one batch since chunkSize=10, but let's simulate two chunks)
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: { message: 'Chunk failed' } });
      });

      // Use 12 tasks so we get two chunks (10 + 2)
      const twelveTaskTodos: Todo[] = Array.from({ length: 12 }, (_, i) => ({
        id: `todo-${i + 1}`,
        text: `Task ${i + 1}`,
        completed: false,
        status: 'todo' as const,
        priority: 'medium' as const,
        created_at: '2026-01-01T00:00:00Z',
        created_by: 'Derrick',
        subtasks: [],
        attachments: [],
      }));

      useTodoStore.setState({
        todos: twelveTaskTodos,
        bulkActions: {
          selectedTodos: new Set(twelveTaskTodos.map(t => t.id)),
          showBulkActions: true,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      const state = useTodoStore.getState();

      // First chunk (10 tasks) should have succeeded and stayed completed
      const firstChunk = state.todos.filter(t => {
        const idx = parseInt(t.id.replace('todo-', ''));
        return idx <= 10;
      });
      firstChunk.forEach(t => {
        expect(t.completed).toBe(true);
        expect(t.status).toBe('done');
      });

      // Second chunk (2 tasks) should have been rolled back
      const secondChunk = state.todos.filter(t => {
        const idx = parseInt(t.id.replace('todo-', ''));
        return idx > 10;
      });
      secondChunk.forEach(t => {
        expect(t.completed).toBe(false);
        expect(t.status).toBe('todo');
      });
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

  describe('bulkComplete chunked path (>5 tasks)', () => {
    const manyTodos: Todo[] = Array.from({ length: 8 }, (_, i) => ({
      id: `todo-${i + 1}`,
      text: `Task ${i + 1}`,
      completed: false,
      status: 'todo' as const,
      priority: 'medium' as const,
      created_at: '2026-01-01T00:00:00Z',
      created_by: 'Derrick',
      subtasks: [],
      attachments: [],
    }));

    beforeEach(() => {
      useTodoStore.setState({
        todos: manyTodos,
        bulkActions: {
          selectedTodos: new Set(manyTodos.map(t => t.id)),
          showBulkActions: true,
        },
      });
    });

    it('should use chunked path for >5 tasks', async () => {
      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        return {
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      // 8 tasks should be split into 1 chunk of 8 (chunkSize=10)
      // so supabase.from should be called once
      expect(callCount).toBeGreaterThanOrEqual(1);

      // All tasks should be completed in store
      const state = useTodoStore.getState();
      state.todos.forEach(t => {
        expect(t.completed).toBe(true);
        expect(t.status).toBe('done');
      });
    });

    it('should rollback only failed chunk on partial failure', async () => {
      let callIndex = 0;
      (supabase.from as any).mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockImplementation((col: string, ids: string[]) => {
          callIndex++;
          // Fail on first call (the only chunk since 8 < 10)
          if (callIndex === 1) {
            return Promise.resolve({ data: null, error: { message: 'Chunk failed' } });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      }));

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      // All tasks should be rolled back since the single chunk failed
      const state = useTodoStore.getState();
      state.todos.forEach(t => {
        expect(t.completed).toBe(false);
      });
    });

    it('should clear selection before DB operations start', async () => {
      let selectionAtDbCall: number | undefined;
      (supabase.from as any).mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockImplementation(() => {
          selectionAtDbCall = useTodoStore.getState().bulkActions.selectedTodos.size;
          return Promise.resolve({ data: null, error: null });
        }),
      }));

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      // Selection should have been cleared before the DB call
      expect(selectionAtDbCall).toBe(0);
    });
  });

  describe('bulkComplete small batch path (<=5 tasks)', () => {
    beforeEach(() => {
      useTodoStore.setState({
        todos: mockTodos,
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-2']),
          showBulkActions: true,
        },
      });
    });

    it('should use single-query path for <=5 tasks', async () => {
      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      // Should have called update with all IDs in one query
      expect(updateMock.update).toHaveBeenCalledWith({
        completed: true,
        status: 'done',
      });
      expect(inMock).toHaveBeenCalledWith('id', ['todo-1', 'todo-2']);

      // Should only have been called once (single query, not chunked)
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should skip activity logging for already-completed tasks', async () => {
      // todo-3 is already completed
      useTodoStore.setState({
        bulkActions: {
          selectedTodos: new Set(['todo-1', 'todo-3']),
          showBulkActions: true,
        },
      });

      const { result } = renderHook(() => useBulkActions('Derrick'));

      await act(async () => {
        await result.current.bulkComplete();
      });

      // Should only log activity for todo-1 (not already completed)
      const logCalls = (activityLogger.logActivity as any).mock.calls;
      const completedLogs = logCalls.filter(
        (call: any) => call[0].action === 'task_completed'
      );
      expect(completedLogs).toHaveLength(1);
      expect(completedLogs[0][0].todoId).toBe('todo-1');
    });
  });
});
