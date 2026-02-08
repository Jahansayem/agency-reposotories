/**
 * TodoList Utility Functions
 *
 * Extracted pure utility functions for the TodoList component.
 * These functions have no side effects and can be easily tested.
 */

import { Todo, TodoPriority, SortOption, QuickFilter, TodoStatus } from '@/types/todo';

// ============================================
// Date & Time Utilities
// ============================================

/**
 * Get the completion timestamp in milliseconds for a todo item.
 * Uses updated_at if completed, falls back to created_at.
 */
export const getCompletedAtMs = (todo: Todo): number | null => {
  // Try updated_at first if task is completed
  if (todo.completed && todo.updated_at) {
    const updatedMs = new Date(todo.updated_at).getTime();
    if (!isNaN(updatedMs)) return updatedMs;
  }
  // Fallback to created_at
  if (todo.created_at) {
    const createdMs = new Date(todo.created_at).getTime();
    if (!isNaN(createdMs)) return createdMs;
  }
  return null;
};

/**
 * Get a date string offset by a number of days from today.
 * Commonly used for bulk reschedule operations.
 */
export const getDateOffset = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/**
 * Check if a date is today
 */
export const isToday = (dateString: string | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if a date is in the past (overdue)
 */
export const isPastDate = (dateString: string | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// ============================================
// Priority Utilities
// ============================================

/**
 * Priority ranking for comparison (lower number = higher priority)
 */
export const priorityRank: Record<TodoPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Get the higher priority between two priorities
 */
export const getHigherPriority = (p1: TodoPriority, p2: TodoPriority): TodoPriority => {
  return priorityRank[p1] < priorityRank[p2] ? p1 : p2;
};

/**
 * Find the highest priority among multiple todos
 */
export const findHighestPriority = (todos: Todo[]): TodoPriority => {
  return todos.reduce((highest, t) => {
    const priority = t.priority || 'medium';
    return priorityRank[priority] < priorityRank[highest] ? priority : highest;
  }, 'medium' as TodoPriority);
};

// ============================================
// Filtering Utilities
// ============================================

/**
 * Check if a todo has any active advanced filters applied
 */
export const hasActiveFilters = (
  quickFilter: QuickFilter,
  highPriorityOnly: boolean,
  showCompleted: boolean,
  searchQuery: string,
  statusFilter: TodoStatus | 'all',
  assignedToFilter: string,
  customerFilter: string,
  hasAttachmentsFilter: boolean | null,
  dateRangeFilter: { start: string; end: string }
): boolean => {
  return (
    quickFilter !== 'all' ||
    highPriorityOnly ||
    showCompleted ||
    !!searchQuery ||
    statusFilter !== 'all' ||
    assignedToFilter !== 'all' ||
    customerFilter !== 'all' ||
    hasAttachmentsFilter !== null ||
    !!dateRangeFilter.start ||
    !!dateRangeFilter.end
  );
};

/**
 * Count the number of active advanced filters
 */
export const countAdvancedFilters = (
  statusFilter: TodoStatus | 'all',
  assignedToFilter: string,
  customerFilter: string,
  hasAttachmentsFilter: boolean | null,
  dateRangeFilter: { start: string; end: string }
): number => {
  return [
    statusFilter !== 'all',
    assignedToFilter !== 'all',
    customerFilter !== 'all',
    hasAttachmentsFilter !== null,
    dateRangeFilter.start || dateRangeFilter.end,
  ].filter(Boolean).length;
};

// ============================================
// Empty State Utilities
// ============================================

export type EmptyStateVariant =
  | 'no-results'
  | 'no-due-today'
  | 'no-overdue'
  | 'no-tasks'
  | 'all-done';

/**
 * Determine which empty state variant to show based on current filters
 */
export const getEmptyStateVariant = (
  searchQuery: string,
  quickFilter: QuickFilter,
  stats: { total: number; completed: number }
): EmptyStateVariant => {
  if (searchQuery) return 'no-results';
  if (quickFilter === 'due_today') return 'no-due-today';
  if (quickFilter === 'overdue') return 'no-overdue';
  if (stats.total === 0) return 'no-tasks';
  if (stats.completed === stats.total && stats.total > 0) return 'all-done';
  return 'no-tasks';
};

// ============================================
// Merge Utilities
// ============================================

/**
 * Combine notes from multiple todos with merge history
 */
export const combineNotesForMerge = (
  primaryTodo: Todo,
  secondaryTodos: Todo[]
): string => {
  return [
    primaryTodo.notes,
    ...secondaryTodos.map((t) => t.notes),
    // Add merge history
    `\n--- Merged Tasks (${new Date().toLocaleString()}) ---`,
    ...secondaryTodos.map(
      (t) =>
        `• "${t.text}" (created ${new Date(t.created_at).toLocaleDateString()})`
    ),
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * Combine text for merged tasks
 */
export const combineTextForMerge = (
  primaryTodo: Todo,
  secondaryTodos: Todo[]
): string => {
  return secondaryTodos.length > 0
    ? `${primaryTodo.text} [+${secondaryTodos.length} merged]`
    : primaryTodo.text;
};

// ============================================
// Due Date Utilities
// ============================================

/**
 * Get the earlier due date between two dates (for merging)
 */
export const getEarlierDueDate = (
  date1: string | undefined,
  date2: string | undefined
): string | undefined => {
  if (!date1) return date2;
  if (!date2) return date1;
  return new Date(date1) < new Date(date2) ? date1 : date2;
};

/**
 * Calculate next recurrence date based on pattern
 */
export const calculateNextRecurrenceDate = (
  currentDue: string,
  recurrence: 'daily' | 'weekly' | 'monthly'
): string => {
  const current = new Date(currentDue);
  const next = new Date(current);

  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next.toISOString().split('T')[0];
};

// ============================================
// Stats Calculation
// ============================================

export interface TodoStats {
  total: number;
  completed: number;
  active: number;
  dueToday: number;
  overdue: number;
}

/**
 * Calculate stats from a list of todos
 */
export const calculateStats = (
  todos: Todo[],
  isDueToday: (date: string | undefined) => boolean,
  isOverdue: (date: string | undefined, completed: boolean, status?: string) => boolean
): TodoStats => {
  return {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    active: todos.filter((t) => !t.completed).length,
    dueToday: todos.filter((t) => isDueToday(t.due_date) && !t.completed && t.status !== 'done').length,
    overdue: todos.filter((t) => isOverdue(t.due_date, t.completed, t.status)).length,
  };
};

// ============================================
// Custom Order Sorting
// ============================================

/**
 * Apply custom order sorting to a list of todos
 */
export const applyCustomOrder = (todos: Todo[], customOrder: string[]): Todo[] => {
  if (customOrder.length === 0) return todos;

  const result = [...todos];
  result.sort((a, b) => {
    const aIndex = customOrder.indexOf(a.id);
    const bIndex = customOrder.indexOf(b.id);
    // Items not in custom order go to the end
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  return result;
};

// ============================================
// Accessibility Helpers
// ============================================

/**
 * Generate status message for screen readers
 */
export const getScreenReaderStatusMessage = (
  todosLength: number,
  searchQuery: string,
  quickFilter: QuickFilter
): string => {
  if (todosLength === 0) {
    if (searchQuery) return `No tasks found for "${searchQuery}"`;
    return 'No tasks to display';
  }
  const taskWord = todosLength === 1 ? 'task' : 'tasks';
  if (searchQuery) {
    return `Showing ${todosLength} ${taskWord} matching "${searchQuery}"`;
  }
  if (quickFilter && quickFilter !== 'all') {
    return `Showing ${todosLength} ${taskWord}`;
  }
  return `${todosLength} ${taskWord} in list`;
};
