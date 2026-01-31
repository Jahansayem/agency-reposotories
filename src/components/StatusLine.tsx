'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { QuickFilter } from '@/types/todo';

interface Stats {
  total: number;
  completed: number;
  active: number;
  dueToday: number;
  overdue: number;
}

interface StatusLineProps {
  stats: Stats;
  quickFilter: QuickFilter;
  highPriorityOnly: boolean;
  showCompleted: boolean;
  onFilterAll: () => void;
  onFilterDueToday: () => void;
  onFilterOverdue: () => void;
}

export default function StatusLine({
  stats,
  quickFilter,
  highPriorityOnly,
  showCompleted,
  onFilterAll,
  onFilterDueToday,
  onFilterOverdue,
}: StatusLineProps) {
  const { theme } = useTheme();

  // Determine the active state for styling
  const isAllActive = quickFilter === 'all' && !showCompleted;
  const isDueTodayActive = quickFilter === 'due_today';
  const isOverdueActive = quickFilter === 'overdue';

  const baseClass = `inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-md)] text-xs font-medium transition-all cursor-pointer`;

  const getSegmentClass = (isActive: boolean, color: 'accent' | 'warning' | 'danger') => {
    if (isActive) {
      return `${baseClass} bg-[var(--${color}-light)] text-[var(--${color})] dark:bg-[var(--${color})]/20 ring-1 ring-[var(--${color})]/30`;
    }
    return `${baseClass} ${
      'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'}`;
  };

  // All caught up message
  if (stats.active === 0 && !showCompleted) {
    return (
      <div className={`text-xs ${'text-[var(--text-muted)]'}`}>
        <span className="text-[var(--success)] font-medium">All caught up!</span>
        {stats.completed > 0 && (
          <span> {stats.completed} tasks completed</span>
        )}
      </div>
    );
  }

  // Context-aware filter message
  if (highPriorityOnly) {
    return (
      <div className={`text-xs ${'text-[var(--text-muted)]'}`}>
        Showing <span className="text-[var(--danger)] font-medium">{stats.active} high priority</span> tasks
        {stats.dueToday > 0 && (
          <>
            {' '}
            <span className="text-[var(--text-muted)]">•</span>{' '}
            <button
              onClick={onFilterDueToday}
              className={getSegmentClass(isDueTodayActive, 'warning')}
            >
              {stats.dueToday} due today
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-xs flex-wrap ${'text-[var(--text-muted)]'}`}>
      {/* Active tasks count - clickable to filter to all */}
      <button
        onClick={onFilterAll}
        className={getSegmentClass(isAllActive, 'accent')}
        aria-label={`${stats.active} active tasks`}
      >
        <span className="font-semibold">{stats.active}</span>
        <span>active</span>
      </button>

      {/* Due today - clickable to filter */}
      {stats.dueToday > 0 && (
        <>
          <span className={'text-[var(--text-muted)]'}>•</span>
          <button
            onClick={onFilterDueToday}
            className={getSegmentClass(isDueTodayActive, 'warning')}
            aria-label={`${stats.dueToday} tasks due today`}
          >
            <span className="font-semibold">{stats.dueToday}</span>
            <span>due today</span>
          </button>
        </>
      )}

      {/* Overdue - clickable to filter - PROMINENT when count is high */}
      {stats.overdue > 0 && (
        <>
          <span className={'text-[var(--text-muted)]'}>•</span>
          <button
            onClick={onFilterOverdue}
            className={`${getSegmentClass(isOverdueActive, 'danger')} ${
              stats.overdue >= 5
                ? 'animate-pulse ring-2 ring-red-500/50 bg-red-500/20'
                : stats.overdue >= 3
                ? 'ring-1 ring-red-500/40'
                : ''
            }`}
            aria-label={`${stats.overdue} overdue tasks`}
          >
            <span className="font-bold">{stats.overdue}</span>
            <span className="font-medium">overdue</span>
          </button>
        </>
      )}
    </div>
  );
}
