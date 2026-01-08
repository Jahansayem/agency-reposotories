import { describe, it, expect, vi, beforeEach } from 'vitest';
import { todoService } from '@/lib/db/todoService';
import { supabase } from '@/lib/supabase';
import { createMockTodo, createMockSubtask } from '../factories/todoFactory';

vi.mock('@/lib/supabase');
vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: vi.fn(() => false), // Default: flags off
}));

describe('TodoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTodo', () => {
    it('should create todo in old schema (JSONB)', async () => {
      const mockTodo = createMockTodo({ text: 'Test task' });

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTodo, error: null }),
          }),
        }),
      } as any);

      const result = await todoService.createTodo({
        text: 'Test task',
        created_by: 'TestUser',
      });

      expect(result.text).toBe('Test task');
      expect(supabase.from).toHaveBeenCalledWith('todos');
    });

    it('should handle creation errors gracefully', async () => {
      const error = new Error('Database error');

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error }),
          }),
        }),
      } as any);

      await expect(
        todoService.createTodo({ text: 'Test', created_by: 'User' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateTodo', () => {
    it('should update todo successfully', async () => {
      const updatedTodo = createMockTodo({ text: 'Updated text' });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedTodo, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await todoService.updateTodo('todo-id', { text: 'Updated text' });

      expect(result.text).toBe('Updated text');
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
    it('should fetch all todos', async () => {
      const mockTodos = [createMockTodo(), createMockTodo()];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockTodos, error: null }),
        }),
      } as any);

      const result = await todoService.getTodos();

      expect(result).toHaveLength(2);
    });

    it('should filter todos by assignedTo', async () => {
      const mockTodos = [createMockTodo({ assigned_to: 'Derrick' })];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockTodos, error: null }),
          }),
        }),
      } as any);

      const result = await todoService.getTodos({ assignedTo: 'Derrick' });

      expect(result[0].assigned_to).toBe('Derrick');
    });

    it('should return empty array on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      } as any);

      const result = await todoService.getTodos();

      expect(result).toEqual([]);
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo successfully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      await expect(todoService.deleteTodo('todo-id')).resolves.not.toThrow();
    });
  });
});
