import { TodoPriority } from '@/types/todo';

/** Map priority levels to Badge variants */
export const PRIORITY_TO_BADGE_VARIANT: Record<TodoPriority, 'danger' | 'warning' | 'info' | 'default'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

/**
 * Filter out internal/system user names from display.
 * Replaces system-generated names with user-friendly alternatives.
 */
export function filterSystemUserName(name: string | null | undefined): string | null {
  if (!name) return null;
  const systemNames = ['System Recovery Script', 'System', 'Migration Script', 'Auto Recovery'];
  if (systemNames.some(sn => name.toLowerCase().includes(sn.toLowerCase()))) {
    return null;
  }
  return name;
}

export const formatDueDate = (date: string, includeYear = false) => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDay = new Date(d);
  dueDay.setHours(0, 0, 0, 0);

  if (dueDay.getTime() === today.getTime()) return 'Today';
  if (dueDay.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const options: Intl.DateTimeFormatOptions = includeYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
};

/** Calculate days overdue for severity display */
export const getDaysOverdue = (date: string): number => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const getDueDateStatus = (date: string, completed: boolean): 'overdue' | 'today' | 'upcoming' | 'future' => {
  if (completed) return 'future';
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  d.setHours(0, 0, 0, 0);

  if (d < today) return 'overdue';
  if (d.getTime() === today.getTime()) return 'today';
  if (d <= weekFromNow) return 'upcoming';
  return 'future';
};

/** Helper to get date offset for snooze */
export const getSnoozeDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};
