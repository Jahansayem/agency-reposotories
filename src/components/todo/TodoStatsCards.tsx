'use client';

import { memo } from 'react';
import { QuickFilter } from '@/types/todo';

interface TodoStatsCardsProps {
  stats: {
    active: number;
    completed: number;
    dueToday: number;
    overdue: number;
  };
  quickFilter: QuickFilter;
  showCompleted: boolean;
  setQuickFilter: (filter: QuickFilter) => void;
  setShowCompleted: (show: boolean) => void;
}

function TodoStatsCards({
  stats,
  quickFilter,
  showCompleted,
  setQuickFilter,
  setShowCompleted,
}: TodoStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <button
        type="button"
        onClick={() => { setQuickFilter('all'); setShowCompleted(false); }}
        className={`group relative rounded-[var(--radius-lg)] p-4 border text-left transition-all duration-300 hover:shadow-[var(--shadow-md)] overflow-hidden ${
          quickFilter === 'all' && !showCompleted
            ? 'ring-2 ring-[var(--accent)] border-[var(--accent)] bg-[var(--accent-light)]'
            : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
        }`}
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--accent)]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
        <p className="text-2xl sm:text-3xl font-bold text-[var(--accent)] relative">{stats.active}</p>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-0.5 relative">To Do</p>
      </button>
      <button
        type="button"
        onClick={() => setQuickFilter('due_today')}
        className={`group relative rounded-[var(--radius-lg)] p-4 border text-left transition-all duration-300 hover:shadow-[var(--shadow-md)] overflow-hidden ${
          quickFilter === 'due_today'
            ? 'ring-2 ring-[var(--warning)] border-[var(--warning)] bg-[var(--warning-light)]'
            : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
        }`}
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--warning)]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
        <p className="text-2xl sm:text-3xl font-bold text-[var(--warning)] relative">{stats.dueToday}</p>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-0.5 relative">Due Today</p>
      </button>
      <button
        type="button"
        onClick={() => setQuickFilter('overdue')}
        className={`group relative rounded-[var(--radius-lg)] p-4 border text-left transition-all duration-300 hover:shadow-[var(--shadow-md)] overflow-hidden ${
          quickFilter === 'overdue'
            ? 'ring-2 ring-[var(--danger)] border-[var(--danger)] bg-[var(--danger-light)]'
            : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
        }`}
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--danger)]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
        <p className={`text-2xl sm:text-3xl font-bold relative ${stats.overdue > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
          {stats.overdue}
        </p>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-0.5 relative">Overdue</p>
      </button>
    </div>
  );
}

export default memo(TodoStatsCards);
