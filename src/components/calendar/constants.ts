import { DashboardTaskCategory } from '@/types/todo';

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
