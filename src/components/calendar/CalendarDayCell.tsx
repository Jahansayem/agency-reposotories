'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Todo, DashboardTaskCategory } from '@/types/todo';

// Category color mapping for task indicators
const CATEGORY_COLORS: Record<DashboardTaskCategory, string> = {
  quote: 'bg-blue-500',
  renewal: 'bg-purple-500',
  claim: 'bg-red-500',
  service: 'bg-amber-500',
  'follow-up': 'bg-emerald-500',
  prospecting: 'bg-cyan-500',
  other: 'bg-slate-500',
};

// Category labels for hover preview
const CATEGORY_LABELS: Record<DashboardTaskCategory, string> = {
  quote: 'Quote',
  renewal: 'Renewal',
  claim: 'Claim',
  service: 'Service',
  'follow-up': 'Follow-up',
  prospecting: 'Prospecting',
  other: 'Other',
};

interface CalendarDayCellProps {
  date: Date;
  todos: Todo[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: () => void;
  onTaskClick: (todo: Todo) => void;
}

export default function CalendarDayCell({
  date,
  todos,
  isCurrentMonth,
  isToday,
  onClick,
  onTaskClick,
}: CalendarDayCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Group todos by category for dot display
  const categoryGroups = useMemo(() => {
    const groups: Record<DashboardTaskCategory, Todo[]> = {
      quote: [],
      renewal: [],
      claim: [],
      service: [],
      'follow-up': [],
      prospecting: [],
      other: [],
    };

    todos.forEach((todo) => {
      const category = todo.category || 'other';
      groups[category].push(todo);
    });

    // Return only categories that have tasks
    return Object.entries(groups)
      .filter(([, tasks]) => tasks.length > 0)
      .map(([category, tasks]) => ({
        category: category as DashboardTaskCategory,
        tasks,
        count: tasks.length,
      }));
  }, [todos]);

  // Max visible dots (show +N more if exceeding)
  const MAX_VISIBLE_DOTS = 3;
  const visibleCategories = categoryGroups.slice(0, MAX_VISIBLE_DOTS);
  const hiddenCount = categoryGroups.length - MAX_VISIBLE_DOTS;

  const dayNumber = date.getDate();

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full aspect-square min-h-[80px] sm:min-h-[100px] p-2 rounded-lg
          flex flex-col items-start justify-start
          transition-all duration-200 border
          ${
            isToday
              ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30'
              : isCurrentMonth
                ? 'bg-[var(--surface-2)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]'
                : 'bg-[var(--surface)] border-[var(--border-muted)]'
          }
        `}
      >
        {/* Day Number */}
        <span
          className={`
            text-sm font-semibold mb-1
            ${
              isToday
                ? 'text-[var(--accent)]'
                : isCurrentMonth
                  ? 'text-[var(--foreground)]'
                  : 'text-[var(--text-muted)]'
            }
          `}
        >
          {dayNumber}
        </span>

        {/* Category Dots */}
        {categoryGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {visibleCategories.map(({ category, count }) => (
              <div key={category} className="flex items-center gap-0.5">
                <div
                  className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category]}`}
                  title={`${count} ${CATEGORY_LABELS[category]}${count > 1 ? 's' : ''}`}
                />
                {count > 1 && (
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">
                    {count}
                  </span>
                )}
              </div>
            ))}
            {hiddenCount > 0 && (
              <span className="text-[10px] font-medium text-[var(--text-muted)]">
                +{hiddenCount}
              </span>
            )}
          </div>
        )}
      </motion.button>

      {/* Hover Preview Popup */}
      <AnimatePresence>
        {isHovered && todos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 mt-1 min-w-[200px] max-w-[280px] p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] shadow-lg"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Header */}
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
              {format(date, 'EEEE, MMM d')}
            </div>

            {/* Task List Preview */}
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {todos.slice(0, 5).map((todo) => {
                const category = todo.category || 'other';
                return (
                  <button
                    key={todo.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(todo);
                    }}
                    className="w-full flex items-start gap-2 p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors text-left"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${CATEGORY_COLORS[category]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--foreground)] truncate">
                        {todo.customer_name || todo.text}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {CATEGORY_LABELS[category]}
                        {todo.premium_amount && (
                          <span className="ml-1">
                            - ${todo.premium_amount.toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
              {todos.length > 5 && (
                <p className="text-xs text-[var(--text-muted)] text-center pt-1">
                  +{todos.length - 5} more tasks
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { CATEGORY_COLORS, CATEGORY_LABELS };
