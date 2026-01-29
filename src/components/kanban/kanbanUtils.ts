/**
 * Kanban Board Utility Functions
 *
 * Helper functions for date formatting, status mapping, urgency scoring,
 * and date section grouping used across the Kanban board components.
 */

import { Todo, TodoStatus, PRIORITY_CONFIG } from '@/types/todo';
import {
  ClipboardList,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  CalendarClock,
  CalendarX,
  LucideIcon,
} from 'lucide-react';

// ============================================
// Column Configuration
// ============================================

export const columns: { id: TodoStatus; title: string; Icon: LucideIcon; color: string; bgColor: string }[] = [
  { id: 'todo', title: 'To Do', Icon: ClipboardList, color: 'var(--accent)', bgColor: 'var(--accent-light)' },
  { id: 'in_progress', title: 'In Progress', Icon: Zap, color: 'var(--warning)', bgColor: 'var(--warning-light)' },
  { id: 'done', title: 'Done', Icon: CheckCircle2, color: 'var(--success)', bgColor: 'var(--success-light)' },
];

// ============================================
// Date Formatting & Comparison
// ============================================

export const formatDueDate = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDay = new Date(d);
  dueDay.setHours(0, 0, 0, 0);

  if (dueDay.getTime() === today.getTime()) return 'Today';
  if (dueDay.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const isOverdue = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

export const isDueToday = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
};

export const isDueSoon = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  return d > today && d <= threeDaysFromNow;
};

// ============================================
// Urgency Scoring & Sorting
// ============================================

export const getUrgencyScore = (todo: Todo) => {
  if (todo.completed) return -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daysOverdue = 0;
  if (todo.due_date) {
    const dueDate = new Date(todo.due_date);
    dueDate.setHours(0, 0, 0, 0);
    daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
  }
  const priorityWeight = { urgent: 100, high: 50, medium: 25, low: 0 }[todo.priority || 'medium'];
  return (daysOverdue * 10) + priorityWeight;
};

export const getTodosByStatus = (todos: Todo[], status: TodoStatus) => {
  return todos
    .filter((todo) => (todo.status || 'todo') === status)
    .sort((a, b) => {
      const scoreDiff = getUrgencyScore(b) - getUrgencyScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
};

// ============================================
// Snooze Helpers
// ============================================

export const getSnoozeDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// ============================================
// Date Sections (for sectioned view)
// ============================================

export type DateSection = 'overdue' | 'today' | 'upcoming' | 'no_date';

export const getDateSection = (todo: Todo): DateSection => {
  if (!todo.due_date) return 'no_date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(todo.due_date);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today && !todo.completed) return 'overdue';
  if (dueDate.getTime() === today.getTime()) return 'today';
  return 'upcoming';
};

export const dateSectionConfig: Record<DateSection, { label: string; color: string; bgColor: string; Icon: LucideIcon }> = {
  overdue: { label: 'Overdue', color: 'var(--error)', bgColor: 'var(--error-light)', Icon: AlertTriangle },
  today: { label: 'Today', color: 'var(--accent)', bgColor: 'var(--accent-light)', Icon: Calendar },
  upcoming: { label: 'Upcoming', color: 'var(--success)', bgColor: 'var(--success-light)', Icon: CalendarClock },
  no_date: { label: 'No Date', color: 'var(--text-muted)', bgColor: 'var(--surface-2)', Icon: CalendarX },
};

export const groupTodosByDateSection = (columnTodos: Todo[]): Record<DateSection, Todo[]> => {
  const groups: Record<DateSection, Todo[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    no_date: [],
  };
  columnTodos.forEach(todo => {
    const section = getDateSection(todo);
    groups[section].push(todo);
  });
  return groups;
};

// ============================================
// File Helpers (used in TaskDetailModal)
// ============================================

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
