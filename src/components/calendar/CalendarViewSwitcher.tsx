'use client';

import { CalendarViewMode } from '@/types/calendar';

interface CalendarViewSwitcherProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

const VIEW_OPTIONS: { mode: CalendarViewMode; label: string }[] = [
  { mode: 'day', label: 'Day' },
  { mode: 'week', label: 'Week' },
  { mode: 'month', label: 'Month' },
];

export default function CalendarViewSwitcher({
  viewMode,
  onViewModeChange,
}: CalendarViewSwitcherProps) {
  return (
    <div className="flex items-center bg-[var(--surface-2)] rounded-lg p-0.5 border border-[var(--border)]">
      {VIEW_OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150
            ${
              viewMode === mode
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
