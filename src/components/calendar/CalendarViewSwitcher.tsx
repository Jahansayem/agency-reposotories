'use client';

import { useCallback, useRef } from 'react';
import { CalendarViewMode } from '@/types/calendar';

interface CalendarViewSwitcherProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

const VIEW_OPTIONS: { mode: CalendarViewMode; label: string; shortcut: string }[] = [
  { mode: 'day', label: 'Day', shortcut: 'D' },
  { mode: 'week', label: 'Week', shortcut: 'W' },
  { mode: 'month', label: 'Month', shortcut: 'M' },
];

export default function CalendarViewSwitcher({
  viewMode,
  onViewModeChange,
}: CalendarViewSwitcherProps) {
  const tablistRef = useRef<HTMLDivElement>(null);

  // ARIA tabs keyboard pattern: arrow keys to navigate, only active tab in tab order
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = VIEW_OPTIONS.findIndex((opt) => opt.mode === viewMode);
      let newIndex: number | null = null;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = (currentIndex + 1) % VIEW_OPTIONS.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = (currentIndex - 1 + VIEW_OPTIONS.length) % VIEW_OPTIONS.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newIndex = VIEW_OPTIONS.length - 1;
      }

      if (newIndex !== null) {
        onViewModeChange(VIEW_OPTIONS[newIndex].mode);
        // Focus the newly selected tab
        const tabs = tablistRef.current?.querySelectorAll('[role="tab"]');
        if (tabs?.[newIndex]) {
          (tabs[newIndex] as HTMLElement).focus();
        }
      }
    },
    [viewMode, onViewModeChange]
  );

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label="Calendar view"
      onKeyDown={handleKeyDown}
      className="flex items-center bg-[var(--surface-2)] rounded-lg p-0.5 border border-[var(--border)]"
    >
      {VIEW_OPTIONS.map(({ mode, label, shortcut }) => (
        <button
          key={mode}
          role="tab"
          aria-selected={viewMode === mode}
          tabIndex={viewMode === mode ? 0 : -1}
          onClick={() => onViewModeChange(mode)}
          title={`${label} view (${shortcut})`}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150
            ${
              viewMode === mode
                ? 'bg-[var(--accent)] text-white shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/10'
                : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
            }
          `}
        >
          {label}
          <span className={`ml-1 text-xs ${viewMode === mode ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
            {shortcut}
          </span>
        </button>
      ))}
    </div>
  );
}
