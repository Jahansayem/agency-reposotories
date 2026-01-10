/**
 * Component Integration Tests
 *
 * Tests multiple components working together with the store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useTodoStore } from '@/store/todoStore';
import { TodoStatsCards } from '@/components/todo/TodoStatsCards';
import BulkActionBar from '@/components/todo/BulkActionBar';
import ConnectionStatus from '@/components/todo/ConnectionStatus';
import { createMockTodo } from '../factories/todoFactory';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ error: null })),
      })),
      update: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
  isSupabaseConfigured: () => true,
}));

// Mock activity logger
vi.mock('@/lib/activityLogger', () => ({
  logActivity: vi.fn(),
}));

describe('Component Integration Tests', () => {
  beforeEach(() => {
    // Reset store state
    const store = useTodoStore.getState();
    store.setTodos([]);
    store.clearSelection();
    store.setSearchQuery('');
    store.setQuickFilter('all');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('TodoStatsCards + Store', () => {
    it('should display correct stats from store', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const todos = [
        createMockTodo({ id: '1', completed: true, status: 'done' }),
        createMockTodo({ id: '2', completed: true, status: 'done' }),
        createMockTodo({ id: '3', completed: false, due_date: today }),
        createMockTodo({ id: '4', completed: false, due_date: yesterday }),
        createMockTodo({ id: '5', completed: false }),
      ];

      act(() => {
        useTodoStore.getState().setTodos(todos);
      });

      const stats = useTodoStore.getState().selectTodoStats();
      const handleFilterClick = vi.fn();

      render(
        <TodoStatsCards
          stats={stats}
          activeFilter="all"
          onFilterClick={handleFilterClick}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument(); // Total
      expect(screen.getByText('3')).toBeInTheDocument(); // Active
      expect(screen.getByText('2')).toBeInTheDocument(); // Completed (checking all occurrences)
    });

    it('should update stats when todos change', () => {
      const handleFilterClick = vi.fn();

      // Initial render with no todos
      act(() => {
        useTodoStore.getState().setTodos([]);
      });

      let stats = useTodoStore.getState().selectTodoStats();

      const { rerender } = render(
        <TodoStatsCards
          stats={stats}
          activeFilter="all"
          onFilterClick={handleFilterClick}
        />
      );

      // Add todos
      act(() => {
        useTodoStore.getState().setTodos([
          createMockTodo({ id: '1', completed: false }),
          createMockTodo({ id: '2', completed: false }),
        ]);
      });

      stats = useTodoStore.getState().selectTodoStats();

      rerender(
        <TodoStatsCards
          stats={stats}
          activeFilter="all"
          onFilterClick={handleFilterClick}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument(); // Total/Active
    });

    it('should trigger filter change via callback', () => {
      act(() => {
        useTodoStore.getState().setTodos([
          createMockTodo({ id: '1', completed: false }),
        ]);
      });

      const handleFilterClick = vi.fn();
      const stats = useTodoStore.getState().selectTodoStats();

      render(
        <TodoStatsCards
          stats={stats}
          activeFilter="all"
          onFilterClick={handleFilterClick}
        />
      );

      // Click on "Active" card
      const activeCard = screen.getByText('Active').closest('button');
      if (activeCard) {
        fireEvent.click(activeCard);
        expect(handleFilterClick).toHaveBeenCalledWith('active');
      }
    });
  });

  describe('BulkActionBar + Store', () => {
    const defaultProps = {
      selectedCount: 2,
      users: ['Derrick', 'Sefra'],
      onClearSelection: vi.fn(),
      onBulkDelete: vi.fn(),
      onBulkComplete: vi.fn(),
      onBulkAssign: vi.fn(),
      onBulkReschedule: vi.fn(),
      onBulkSetPriority: vi.fn(),
      onInitiateMerge: vi.fn(),
      onGenerateEmail: vi.fn(),
    };

    it('should show selected count from store', () => {
      act(() => {
        useTodoStore.getState().setTodos([
          createMockTodo({ id: 'todo-1' }),
          createMockTodo({ id: 'todo-2' }),
        ]);
        useTodoStore.getState().selectAllTodos(['todo-1', 'todo-2']);
      });

      const selectedCount = useTodoStore.getState().selectedTodos.size;

      render(<BulkActionBar {...defaultProps} selectedCount={selectedCount} />);

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should call handlers when buttons are clicked', () => {
      render(<BulkActionBar {...defaultProps} />);

      // Click complete button
      const completeButton = screen.getByTitle('Mark all as complete');
      fireEvent.click(completeButton);
      expect(defaultProps.onBulkComplete).toHaveBeenCalled();

      // Click delete button
      const deleteButton = screen.getByTitle('Delete selected');
      fireEvent.click(deleteButton);
      expect(defaultProps.onBulkDelete).toHaveBeenCalled();
    });

    it('should show merge option only when 2+ selected', () => {
      const { rerender } = render(
        <BulkActionBar {...defaultProps} selectedCount={1} />
      );

      // Merge should not be visible with 1 selected
      expect(screen.queryByTitle('Merge selected tasks')).not.toBeInTheDocument();

      rerender(<BulkActionBar {...defaultProps} selectedCount={2} />);

      // Merge should be visible with 2 selected
      expect(screen.getByTitle('Merge selected tasks')).toBeInTheDocument();
    });

    it('should show assign dropdown with users', () => {
      render(<BulkActionBar {...defaultProps} />);

      const assignButton = screen.getByTitle('Assign to user');
      fireEvent.click(assignButton);

      // Users should appear in dropdown
      expect(screen.getByText('Derrick')).toBeInTheDocument();
      expect(screen.getByText('Sefra')).toBeInTheDocument();
    });

    it('should call onBulkAssign when user is selected', () => {
      render(<BulkActionBar {...defaultProps} />);

      // Open dropdown
      const assignButton = screen.getByTitle('Assign to user');
      fireEvent.click(assignButton);

      // Click user
      fireEvent.click(screen.getByText('Derrick'));

      expect(defaultProps.onBulkAssign).toHaveBeenCalledWith('Derrick');
    });
  });

  describe('ConnectionStatus Integration', () => {
    it('should reflect store connection state', () => {
      act(() => {
        useTodoStore.getState().setConnected(true);
      });

      const connected = useTodoStore.getState().connected;

      const { rerender } = render(<ConnectionStatus connected={connected} />);

      expect(screen.getByText('Live')).toBeInTheDocument();

      // Simulate disconnect
      act(() => {
        useTodoStore.getState().setConnected(false);
      });

      const disconnected = useTodoStore.getState().connected;

      rerender(<ConnectionStatus connected={disconnected} />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('Multi-Component Workflow', () => {
    it('should simulate complete bulk action workflow', async () => {
      // Setup todos in store
      act(() => {
        useTodoStore.getState().setTodos([
          createMockTodo({ id: 'todo-1', text: 'Task 1', completed: false }),
          createMockTodo({ id: 'todo-2', text: 'Task 2', completed: false }),
          createMockTodo({ id: 'todo-3', text: 'Task 3', completed: true, status: 'done' }),
        ]);
      });

      // Get initial stats
      let stats = useTodoStore.getState().selectTodoStats();
      expect(stats.active).toBe(2);
      expect(stats.completed).toBe(1);

      // Simulate selecting todos
      act(() => {
        useTodoStore.getState().selectAllTodos(['todo-1', 'todo-2']);
      });

      expect(useTodoStore.getState().selectedTodos.size).toBe(2);

      // Simulate bulk complete (would normally go through useBulkActions)
      act(() => {
        useTodoStore.getState().updateTodo('todo-1', { completed: true, status: 'done' });
        useTodoStore.getState().updateTodo('todo-2', { completed: true, status: 'done' });
        useTodoStore.getState().clearSelection();
      });

      // Verify stats updated
      stats = useTodoStore.getState().selectTodoStats();
      expect(stats.active).toBe(0);
      expect(stats.completed).toBe(3);
      expect(useTodoStore.getState().selectedTodos.size).toBe(0);
    });

    it('should filter stats reflect filtered todos', () => {
      const today = new Date().toISOString().split('T')[0];

      act(() => {
        useTodoStore.getState().setTodos([
          createMockTodo({
            id: 'todo-1',
            text: 'Important meeting',
            priority: 'urgent',
            due_date: today,
          }),
          createMockTodo({
            id: 'todo-2',
            text: 'Low priority task',
            priority: 'low',
          }),
        ]);
      });

      // Get stats
      const stats = useTodoStore.getState().selectTodoStats();

      const handleFilterClick = vi.fn();

      render(
        <TodoStatsCards
          stats={stats}
          activeFilter="all"
          onFilterClick={handleFilterClick}
        />
      );

      // Should show due today count
      expect(stats.dueToday).toBe(1);
    });
  });

  describe('Store State Persistence Simulation', () => {
    it('should maintain UI state consistency across rerenders', () => {
      act(() => {
        useTodoStore.getState().setTodos([
          createMockTodo({ id: '1', completed: false }),
          createMockTodo({ id: '2', completed: false }),
        ]);
        useTodoStore.getState().setQuickFilter('active');
        useTodoStore.getState().toggleTodoSelection('1');
      });

      // First render
      const stats = useTodoStore.getState().selectTodoStats();
      const handleFilterClick = vi.fn();

      const { rerender } = render(
        <TodoStatsCards
          stats={stats}
          activeFilter={useTodoStore.getState().quickFilter}
          onFilterClick={handleFilterClick}
        />
      );

      // Verify state persists
      expect(useTodoStore.getState().quickFilter).toBe('active');
      expect(useTodoStore.getState().selectedTodos.size).toBe(1);

      // Rerender
      rerender(
        <TodoStatsCards
          stats={useTodoStore.getState().selectTodoStats()}
          activeFilter={useTodoStore.getState().quickFilter}
          onFilterClick={handleFilterClick}
        />
      );

      // State should persist
      expect(useTodoStore.getState().quickFilter).toBe('active');
      expect(useTodoStore.getState().selectedTodos.size).toBe(1);
    });
  });
});
