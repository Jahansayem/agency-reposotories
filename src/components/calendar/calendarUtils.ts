import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from 'date-fns';
import { Todo } from '@/types/todo';

/**
 * Group todos by their due_date string (YYYY-MM-DD).
 * Extracts date portion directly from ISO string to avoid timezone issues.
 */
export function groupTodosByDate(todos: Todo[]): Map<string, Todo[]> {
  const map = new Map<string, Todo[]>();
  for (const todo of todos) {
    if (!todo.due_date) continue;
    const dateKey = todo.due_date.split('T')[0];
    const existing = map.get(dateKey) || [];
    map.set(dateKey, [...existing, todo]);
  }
  return map;
}

/**
 * Get all days in the week containing the given date (Sun-Sat).
 */
export function getWeekDays(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(date),
    end: endOfWeek(date),
  });
}

/**
 * Format a date as YYYY-MM-DD for use as a map key.
 */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
