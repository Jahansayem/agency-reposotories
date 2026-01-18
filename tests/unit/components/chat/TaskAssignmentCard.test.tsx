import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskAssignmentCard } from '@/components/chat/TaskAssignmentCard';
import { Todo } from '@/types/todo';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <article {...props}>{children}</article>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TaskAssignmentCard', () => {
  const mockTodo: Todo = {
    id: 'test-todo-1',
    text: 'Test task for John Smith',
    completed: false,
    status: 'todo',
    priority: 'high',
    created_at: new Date().toISOString(),
    created_by: 'Derrick',
    assigned_to: 'Sefra',
    due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    notes: 'This is a test note for the task',
    subtasks: [
      { id: 'st-1', text: 'Review coverage', completed: true, priority: 'medium' },
      { id: 'st-2', text: 'Calculate premium', completed: false, priority: 'medium' },
      { id: 'st-3', text: 'Send quote', completed: false, priority: 'high' },
    ],
  };

  const mockOnViewTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders task title', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('Test task for John Smith')).toBeInTheDocument();
    });

    it('renders notification header for task assignment', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      expect(screen.getByText('from Derrick')).toBeInTheDocument();
    });

    it('renders notification header for task completion', () => {
      render(
        <TaskAssignmentCard
          todo={{ ...mockTodo, completed: true }}
          notificationType="task_completion"
          actionBy="Sefra"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      expect(screen.getByText('by Sefra')).toBeInTheDocument();
    });

    it('renders notification header for task reassignment', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_reassignment"
          actionBy="Derrick"
          previousAssignee="John"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('Task Reassigned')).toBeInTheDocument();
      expect(screen.getByText('from John by Derrick')).toBeInTheDocument();
    });

    it('renders priority badge for high priority tasks', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('renders priority badge for urgent tasks', () => {
      render(
        <TaskAssignmentCard
          todo={{ ...mockTodo, priority: 'urgent' }}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('does not render priority badge for medium/low priority tasks', () => {
      render(
        <TaskAssignmentCard
          todo={{ ...mockTodo, priority: 'medium' }}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.queryByText('Medium')).not.toBeInTheDocument();
    });

    it('renders due date', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('Due tomorrow')).toBeInTheDocument();
    });

    it('renders overdue indicator for past due dates', () => {
      const overdueTodo = {
        ...mockTodo,
        due_date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      };

      render(
        <TaskAssignmentCard
          todo={overdueTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText(/Overdue/)).toBeInTheDocument();
    });

    it('renders subtask count and preview', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('1/3 subtasks')).toBeInTheDocument();
      expect(screen.getByText('Review coverage')).toBeInTheDocument();
      expect(screen.getByText('Calculate premium')).toBeInTheDocument();
      expect(screen.getByText('Send quote')).toBeInTheDocument();
    });

    it('renders notes preview', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('This is a test note for the task')).toBeInTheDocument();
    });

    it('renders View Task button', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      // Use the more specific aria-label to find the button
      expect(screen.getByRole('button', { name: /View task: Test task for John Smith/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onViewTask when card is clicked', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      const card = screen.getByRole('button', { name: /New Task Assigned/i });
      fireEvent.click(card);

      expect(mockOnViewTask).toHaveBeenCalledTimes(1);
    });

    it('calls onViewTask when View Task button is clicked', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      const button = screen.getByRole('button', { name: /View task: Test task for John Smith/i });
      fireEvent.click(button);

      expect(mockOnViewTask).toHaveBeenCalledTimes(1);
    });

    it('calls onViewTask when Enter key is pressed', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      const card = screen.getByRole('button', { name: /New Task Assigned/i });
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockOnViewTask).toHaveBeenCalledTimes(1);
    });

    it('calls onViewTask when Space key is pressed', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      const card = screen.getByRole('button', { name: /New Task Assigned/i });
      fireEvent.keyDown(card, { key: ' ' });

      expect(mockOnViewTask).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has proper aria-label on the card', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      const card = screen.getByRole('button', { name: /New Task Assigned: Test task for John Smith. high priority. Click to view task./i });
      expect(card).toBeInTheDocument();
    });

    it('has proper aria-label on the View Task button', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      const button = screen.getByRole('button', { name: /View task: Test task for John Smith/i });
      expect(button).toBeInTheDocument();
    });

    it('has screen reader text for subtask completion status', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('(completed)')).toBeInTheDocument();
      expect(screen.getAllByText('(pending)').length).toBe(2);
    });

    it('card is focusable with tabIndex 0', () => {
      render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      const card = screen.getByRole('button', { name: /New Task Assigned/i });
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('edge cases', () => {
    it('renders without subtasks', () => {
      const todoWithoutSubtasks = { ...mockTodo, subtasks: undefined };

      render(
        <TaskAssignmentCard
          todo={todoWithoutSubtasks}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.queryByText(/subtasks/)).not.toBeInTheDocument();
    });

    it('renders without notes', () => {
      const todoWithoutNotes = { ...mockTodo, notes: undefined };

      render(
        <TaskAssignmentCard
          todo={todoWithoutNotes}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.queryByText('This is a test note for the task')).not.toBeInTheDocument();
    });

    it('renders without due date', () => {
      const todoWithoutDueDate = { ...mockTodo, due_date: undefined };

      render(
        <TaskAssignmentCard
          todo={todoWithoutDueDate}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
    });

    it('shows +N more for subtasks beyond 3', () => {
      const todoWithManySubtasks = {
        ...mockTodo,
        subtasks: [
          { id: 'st-1', text: 'Subtask 1', completed: false, priority: 'medium' as const },
          { id: 'st-2', text: 'Subtask 2', completed: false, priority: 'medium' as const },
          { id: 'st-3', text: 'Subtask 3', completed: false, priority: 'medium' as const },
          { id: 'st-4', text: 'Subtask 4', completed: false, priority: 'medium' as const },
          { id: 'st-5', text: 'Subtask 5', completed: false, priority: 'medium' as const },
        ],
      };

      render(
        <TaskAssignmentCard
          todo={todoWithManySubtasks}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
        />
      );

      expect(screen.getByText('+2 more...')).toBeInTheDocument();
    });

    it('handles isOwnMessage prop for alignment', () => {
      const { container } = render(
        <TaskAssignmentCard
          todo={mockTodo}
          notificationType="task_assignment"
          actionBy="Derrick"
          onViewTask={mockOnViewTask}
          isOwnMessage={true}
        />
      );

      const card = container.querySelector('article');
      expect(card?.className).toContain('ml-auto');
    });
  });
});
