import { DashboardTaskCategory, TodoStatus, Subtask, TaskReminder } from '@/types/todo';

/** Category color mapping — Tailwind bg class for each category */
export const CATEGORY_COLORS: Record<DashboardTaskCategory, string> = {
  quote: 'bg-blue-500',
  renewal: 'bg-purple-500',
  claim: 'bg-red-500',
  service: 'bg-amber-500',
  'follow-up': 'bg-emerald-500',
  prospecting: 'bg-cyan-500',
  other: 'bg-slate-500',
};

/** Human-readable labels for each task category */
export const CATEGORY_LABELS: Record<DashboardTaskCategory, string> = {
  quote: 'Quote',
  renewal: 'Renewal',
  claim: 'Claim',
  service: 'Service',
  'follow-up': 'Follow-up',
  prospecting: 'Prospecting',
  other: 'Other',
};

/** All dashboard task categories in display order */
export const ALL_CATEGORIES: DashboardTaskCategory[] = [
  'quote',
  'renewal',
  'claim',
  'service',
  'follow-up',
  'prospecting',
  'other',
];

/** Priority sort weight — lower number = higher priority */
export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Check whether a task's due date is in the past (before today).
 * Compares date-only (no time component) to avoid timezone issues.
 */
export function isTaskOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const taskDate = new Date(dueDate + 'T00:00:00');
  const today = new Date(new Date().toDateString());
  return taskDate < today;
}

// ============================================
// Wave 1: Status, Segment, Subtask, Waiting, Renewal indicators
// ============================================

/** Tailwind classes for task status indicator (left border) */
export const STATUS_BORDER: Record<TodoStatus, string> = {
  in_progress: 'border-l-2 border-l-amber-400',
  todo: '',
  done: '',
};

/** Customer segment tier colors (Tailwind bg classes) */
export const SEGMENT_COLORS: Record<string, string> = {
  elite: 'bg-yellow-500',    // Gold
  premium: 'bg-purple-500',  // Purple
  standard: 'bg-blue-400',   // Blue
  entry: 'bg-sky-300',       // Sky
};

/** Customer segment tier labels */
export const SEGMENT_LABELS: Record<string, string> = {
  elite: 'Elite',
  premium: 'Premium',
  standard: 'Standard',
  entry: 'Entry',
};

/** Get subtask progress string (e.g. "3/5") or null if no subtasks */
export function getSubtaskProgress(subtasks: Subtask[] | undefined): string | null {
  if (!subtasks || subtasks.length === 0) return null;
  const done = subtasks.filter((s) => s.completed).length;
  return `${done}/${subtasks.length}`;
}

/** Check if a task's follow-up is overdue based on waiting_since and follow_up_after_hours */
export function isFollowUpOverdue(
  waitingSince: string | undefined,
  followUpHours: number | undefined,
): boolean {
  if (!waitingSince) return false;
  const since = new Date(waitingSince);
  const now = new Date();
  const diffHours = (now.getTime() - since.getTime()) / (1000 * 60 * 60);
  return diffHours >= (followUpHours ?? 48);
}

// ============================================
// Wave 2: Assigned user, premium, reminders
// ============================================

/** Get 1-2 character initials from a name string */
export function getInitials(name: string | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

/** Format premium amount for compact display (e.g., "$12K", "$1.2K", "$500") */
export function formatPremiumCompact(amount: number | null | undefined): string | null {
  if (amount == null || amount <= 0) return null;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `$${amount}`;
}

/** Check if a task has any pending reminders */
export function hasPendingReminders(
  reminders: TaskReminder[] | undefined,
  reminderAt: string | undefined,
): boolean {
  if (reminderAt && !isReminderPast(reminderAt)) return true;
  if (reminders?.some((r) => r.status === 'pending')) return true;
  return false;
}

function isReminderPast(reminderAt: string): boolean {
  return new Date(reminderAt) < new Date();
}

/** Premium amount threshold for showing in compact calendar cell previews */
export const PREMIUM_DISPLAY_THRESHOLD = 1000;
