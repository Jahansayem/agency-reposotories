/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { todoService } from '@/lib/db/todoService';
import { supabase } from '@/lib/supabaseClient';
import { createMockTodo } from '../factories/todoFactory';

vi.mock('@/lib/supabaseClient');
vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: vi.fn(() => false), // Default: flags off
}));

// Mock logger to avoid Sentry issues
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('TodoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTodo', () => {
    it('should create todo via RPC', async () => {
      const mockTodo = createMockTodo({ text: 'Test task' });

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockTodo, error: null } as any);

      const result = await todoService.createTodo({
        text: 'Test task',
        created_by: 'TestUser',
      });

      expect(result.text).toBe('Test task');
      expect(supabase.rpc).toHaveBeenCalledWith('todo_create_with_sync', expect.objectContaining({
        p_text: 'Test task',
        p_created_by: 'TestUser',
      }));
    });

    it('should handle creation errors gracefully', async () => {
      const error = new Error('Database error');

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error } as any);

      await expect(
        todoService.createTodo({ text: 'Test', created_by: 'User' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateTodo', () => {
    it('should update todo successfully via RPC', async () => {
      const updatedTodo = createMockTodo({ text: 'Updated text' });

      vi.mocked(supabase.rpc).mockResolvedValue({ data: updatedTodo, error: null } as any);

      const result = await todoService.updateTodo('todo-id', { text: 'Updated text' });

      expect(result.text).toBe('Updated text');
      expect(supabase.rpc).toHaveBeenCalledWith('todo_update_with_sync', expect.objectContaining({
        p_todo_id: 'todo-id',
      }));
    });
  });

  describe('getTodo', () => {
    it('should fetch todo by id', async () => {
      const mockTodo = createMockTodo();

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTodo, error: null }),
          }),
        }),
      } as any);

      const result = await todoService.getTodo('todo-id');

      expect(result).toEqual(mockTodo);
    });

    it('should return null if todo not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any);

      const result = await todoService.getTodo('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getTodos', () => {
    /**
     * Helper to mock supabase.from('todos') for paginated getTodos.
     * getTodos now issues two parallel queries:
     *   1. Count query: select('*', { count: 'exact', head: true }) + filters
     *   2. Data query: select('*').order(...).range(...) + filters
     *
     * This helper returns a mockImplementation that routes the first call
     * to the count mock and the second call to the data mock.
     */
    function mockPaginatedFrom(mockTodos: any[], totalCount?: number, filters?: Record<string, any>) {
      const count = totalCount ?? mockTodos.length;

      // Count query mock chain: select -> [eq...] -> resolves { count, error: null }
      const countChainable: any = {
        eq: vi.fn().mockReturnThis(),
      };
      countChainable.then = (resolve: (value: any) => void) => {
        resolve({ count, error: null });
        return countChainable;
      };
      const countSelect = vi.fn().mockReturnValue(countChainable);

      // Data query mock chain: select -> order -> [eq...] -> range -> resolves { data, error: null }
      const dataChainable: any = {
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };
      dataChainable.then = (resolve: (value: any) => void) => {
        resolve({ data: mockTodos, error: null });
        return dataChainable;
      };
      const dataOrder = vi.fn().mockReturnValue(dataChainable);
      const dataSelect = vi.fn().mockReturnValue({ order: dataOrder });

      let callIdx = 0;
      vi.mocked(supabase.from).mockImplementation((() => {
        callIdx++;
        if (callIdx === 1) {
          // Count query
          return { select: countSelect } as any;
        }
        // Data query
        return { select: dataSelect } as any;
      }) as any);

      return { countChainable, dataChainable };
    }

    it('should fetch todos with default pagination', async () => {
      const mockTodos = [createMockTodo(), createMockTodo()];
      mockPaginatedFrom(mockTodos);

      const result = await todoService.getTodos();

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(50);
      expect(result.pagination.totalCount).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it('should support explicit pagination params', async () => {
      const mockTodos = [createMockTodo()];
      mockPaginatedFrom(mockTodos, 25);

      const result = await todoService.getTodos(undefined, { page: 2, pageSize: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalCount).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should filter todos by assignedTo', async () => {
      const mockTodos = [createMockTodo({ assigned_to: 'Derrick' })];
      const { countChainable, dataChainable } = mockPaginatedFrom(mockTodos);

      const result = await todoService.getTodos({ assignedTo: 'Derrick' });

      expect(result.data[0].assigned_to).toBe('Derrick');
      expect(countChainable.eq).toHaveBeenCalledWith('assigned_to', 'Derrick');
      expect(dataChainable.eq).toHaveBeenCalledWith('assigned_to', 'Derrick');
    });

    it('should return empty result with pagination metadata on error', async () => {
      // Mock count query to fail
      const countChainable: any = {
        eq: vi.fn().mockReturnThis(),
      };
      countChainable.then = (resolve: (value: any) => void) => {
        resolve({ count: null, error: new Error('DB error') });
        return countChainable;
      };

      let callIdx = 0;
      vi.mocked(supabase.from).mockImplementation((() => {
        callIdx++;
        if (callIdx === 1) {
          return { select: vi.fn().mockReturnValue(countChainable) } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        } as any;
      }) as any);

      const result = await todoService.getTodos();

      expect(result.data).toEqual([]);
      expect(result.pagination.totalCount).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo successfully via RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      await expect(todoService.deleteTodo('todo-id')).resolves.not.toThrow();
      expect(supabase.rpc).toHaveBeenCalledWith('todo_delete_with_sync', expect.objectContaining({
        p_todo_id: 'todo-id',
      }));
    });

    it('should throw on delete error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('Delete failed') } as any);

      await expect(todoService.deleteTodo('todo-id')).rejects.toThrow('Delete failed');
    });
  });

  describe('updateTodo error handling', () => {
    it('should throw on update error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('Update failed') } as any);

      await expect(todoService.updateTodo('todo-id', { text: 'updated' })).rejects.toThrow('Update failed');
    });
  });

  describe('getTodo error handling', () => {
    it('should return null on getTodo error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
          }),
        }),
      } as any);

      const result = await todoService.getTodo('todo-id');

      expect(result).toBeNull();
    });
  });

  describe('getTodos with filters', () => {
    /**
     * Helper to mock supabase.from('todos') for paginated getTodos with filters.
     * See the helper in the 'getTodos' describe block for full documentation.
     */
    function mockPaginatedFrom(mockTodos: any[], totalCount?: number) {
      const count = totalCount ?? mockTodos.length;

      const countChainable: any = {
        eq: vi.fn().mockReturnThis(),
      };
      countChainable.then = (resolve: (value: any) => void) => {
        resolve({ count, error: null });
        return countChainable;
      };

      const dataChainable: any = {
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };
      dataChainable.then = (resolve: (value: any) => void) => {
        resolve({ data: mockTodos, error: null });
        return dataChainable;
      };

      let callIdx = 0;
      vi.mocked(supabase.from).mockImplementation((() => {
        callIdx++;
        if (callIdx === 1) {
          return { select: vi.fn().mockReturnValue(countChainable) } as any;
        }
        return { select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue(dataChainable) }) } as any;
      }) as any);

      return { countChainable, dataChainable };
    }

    it('should filter by createdBy', async () => {
      const mockTodos = [createMockTodo({ created_by: 'TestUser' })];
      const { countChainable, dataChainable } = mockPaginatedFrom(mockTodos);

      const result = await todoService.getTodos({ createdBy: 'TestUser' });

      expect(countChainable.eq).toHaveBeenCalledWith('created_by', 'TestUser');
      expect(dataChainable.eq).toHaveBeenCalledWith('created_by', 'TestUser');
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const mockTodos = [createMockTodo({ status: 'in_progress' })];
      const { countChainable, dataChainable } = mockPaginatedFrom(mockTodos);

      const result = await todoService.getTodos({ status: 'in_progress' });

      expect(countChainable.eq).toHaveBeenCalledWith('status', 'in_progress');
      expect(dataChainable.eq).toHaveBeenCalledWith('status', 'in_progress');
      expect(result.data).toHaveLength(1);
    });

    it('should filter by completed', async () => {
      const mockTodos = [createMockTodo({ completed: true })];
      const { countChainable, dataChainable } = mockPaginatedFrom(mockTodos);

      const result = await todoService.getTodos({ completed: true });

      expect(countChainable.eq).toHaveBeenCalledWith('completed', true);
      expect(dataChainable.eq).toHaveBeenCalledWith('completed', true);
      expect(result.data).toHaveLength(1);
    });

    it('should return empty data with pagination metadata when data is null', async () => {
      const countChainable: any = {
        eq: vi.fn().mockReturnThis(),
      };
      countChainable.then = (resolve: (value: any) => void) => {
        resolve({ count: 0, error: null });
        return countChainable;
      };

      const dataChainable: any = {
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };
      dataChainable.then = (resolve: (value: any) => void) => {
        resolve({ data: null, error: null });
        return dataChainable;
      };

      let callIdx = 0;
      vi.mocked(supabase.from).mockImplementation((() => {
        callIdx++;
        if (callIdx === 1) {
          return { select: vi.fn().mockReturnValue(countChainable) } as any;
        }
        return { select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue(dataChainable) }) } as any;
      }) as any);

      const result = await todoService.getTodos();

      expect(result.data).toEqual([]);
      expect(result.pagination.totalCount).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
    });
  });
});

// Import isFeatureEnabled for mocking in normalized schema tests
import { isFeatureEnabled } from '@/lib/featureFlags';

describe('TodoService with Normalized Schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Enable normalized schema for these tests
    vi.mocked(isFeatureEnabled).mockReturnValue(true);
  });

  describe('createTodo with dual-write', () => {
    it('should call RPC with sync_normalized=true when enabled', async () => {
      const mockTodo = createMockTodo({
        text: 'Test task',
        subtasks: [{ id: 'sub-1', text: 'Subtask 1', completed: false, priority: 'medium' }],
        attachments: [{
          id: 'att-1',
          file_name: 'test.pdf',
          file_type: 'document',
          file_size: 1024,
          storage_path: 'path/to/file',
          mime_type: 'application/pdf',
          uploaded_by: 'TestUser',
          uploaded_at: '2025-01-01',
        }],
        assigned_to: 'Derrick',
      });

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockTodo, error: null } as any);

      const result = await todoService.createTodo(mockTodo);

      expect(result.text).toBe('Test task');
      expect(supabase.rpc).toHaveBeenCalledWith('todo_create_with_sync', expect.objectContaining({
        p_sync_normalized: true,
      }));
    });
  });

  describe('updateTodo with dual-write', () => {
    it('should call RPC with sync_normalized=true when enabled', async () => {
      const updatedTodo = createMockTodo({ text: 'Updated' });

      vi.mocked(supabase.rpc).mockResolvedValue({ data: updatedTodo, error: null } as any);

      const result = await todoService.updateTodo('todo-id', { text: 'Updated' });

      expect(result.text).toBe('Updated');
      expect(supabase.rpc).toHaveBeenCalledWith('todo_update_with_sync', expect.objectContaining({
        p_todo_id: 'todo-id',
        p_sync_normalized: true,
      }));
    });
  });

  describe('getTodo with normalized schema', () => {
    it('should enrich todo from normalized schema', async () => {
      const baseTodo = createMockTodo({ text: 'Base todo', subtasks: [], attachments: [] });
      const mockSubtasks = [
        { id: 'sub-1', text: 'Subtask', completed: false, priority: 'high', estimated_minutes: 30, display_order: 0 },
      ];
      const mockAttachments = [
        { id: 'att-1', file_name: 'doc.pdf', file_type: 'document', file_size: 1024, storage_path: 'path', mime_type: 'application/pdf', uploaded_by_name: 'User', uploaded_at: '2025-01-01' },
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'todos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: baseTodo, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'subtasks_v2') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockSubtasks, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'attachments_v2') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockAttachments, error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await todoService.getTodo('todo-id');

      expect(result).not.toBeNull();
      expect(result?.subtasks).toHaveLength(1);
      expect(result?.subtasks?.[0].text).toBe('Subtask');
      expect(result?.attachments).toHaveLength(1);
      expect(result?.attachments?.[0].file_name).toBe('doc.pdf');
    });

    it('should handle enrichment errors gracefully', async () => {
      const baseTodo = createMockTodo({ text: 'Base todo' });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'todos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: baseTodo, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'subtasks_v2') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockRejectedValue(new Error('Subtasks fetch failed')),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await todoService.getTodo('todo-id');

      // Should return original todo on enrichment error
      expect(result).not.toBeNull();
      expect(result?.text).toBe('Base todo');
    });
  });

  describe('getTodos with normalized schema', () => {
    it('should enrich all todos from normalized schema', async () => {
      const baseTodos = [
        createMockTodo({ id: 'todo-1', text: 'Todo 1' }),
        createMockTodo({ id: 'todo-2', text: 'Todo 2' }),
      ];

      // getTodos calls supabase.from('todos') twice (count + data),
      // then enrichTodoFromNormalizedSchema calls from('subtasks_v2') and from('attachments_v2')
      // for each todo. We need to handle all of these.
      let todosCallCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'todos') {
          todosCallCount++;
          if (todosCallCount === 1) {
            // Count query
            return {
              select: vi.fn().mockResolvedValue({ count: baseTodos.length, error: null }),
            } as any;
          }
          // Data query
          const dataChainable: any = {
            range: vi.fn().mockReturnThis(),
          };
          dataChainable.then = (resolve: (value: any) => void) => {
            resolve({ data: baseTodos, error: null });
            return dataChainable;
          };
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue(dataChainable),
            }),
          } as any;
        }
        if (table === 'subtasks_v2') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'attachments_v2') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await todoService.getTodos();

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
    });
  });

  describe('deleteTodo with normalized schema', () => {
    it('should call RPC with sync_normalized=true when enabled', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      await todoService.deleteTodo('todo-id');

      expect(supabase.rpc).toHaveBeenCalledWith('todo_delete_with_sync', expect.objectContaining({
        p_todo_id: 'todo-id',
        p_sync_normalized: true,
      }));
    });
  });

  describe('RPC error handling', () => {
    it('should handle RPC result with error flag gracefully', async () => {
      const rpcError = { error: true, message: 'Sync failed' };

      vi.mocked(supabase.rpc).mockResolvedValue({ data: rpcError, error: null } as any);

      // RPC result with error flag should throw
      await expect(
        todoService.createTodo({ text: 'Test task', created_by: 'TestUser' })
      ).rejects.toThrow('Sync failed');
    });
  });

  describe('createTodo with missing user', () => {
    it('should handle missing user for assignment via RPC', async () => {
      const mockTodo = createMockTodo({
        text: 'Test task',
        assigned_to: 'NonExistentUser',
        subtasks: [],
        attachments: [],
      });

      // RPC handles the user lookup internally; it should succeed even if user not found
      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockTodo, error: null } as any);

      const result = await todoService.createTodo(mockTodo);

      expect(result.text).toBe('Test task');
      expect(supabase.rpc).toHaveBeenCalledWith('todo_create_with_sync', expect.objectContaining({
        p_assigned_to: 'NonExistentUser',
        p_sync_normalized: true,
      }));
    });
  });
});
