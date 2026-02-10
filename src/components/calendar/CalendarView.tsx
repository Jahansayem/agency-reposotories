'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Check,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Todo, DashboardTaskCategory } from '@/types/todo';
import { CalendarViewMode } from '@/types/calendar';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './CalendarDayCell';
import CalendarViewSwitcher from './CalendarViewSwitcher';
import MonthView from './MonthView';
import WeekView from './WeekView';
import DayView from './DayView';
import MiniCalendar from './MiniCalendar';

interface CalendarViewProps {
  todos: Todo[];
  onTaskClick: (todo: Todo) => void;
  onDateClick: (date: Date) => void;
  onReschedule?: (todoId: string, newDate: string) => void;
}

const ALL_CATEGORIES: DashboardTaskCategory[] = [
  'quote',
  'renewal',
  'claim',
  'service',
  'follow-up',
  'prospecting',
  'other',
];

const headerVariants = {
  enter: (direction: 'left' | 'right') => ({
    x: direction === 'right' ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'left' | 'right') => ({
    x: direction === 'right' ? -50 : 50,
    opacity: 0,
  }),
};

function getHeaderLabel(viewMode: CalendarViewMode, currentDate: Date): string {
  switch (viewMode) {
    case 'month':
      return format(currentDate, 'MMMM yyyy');
    case 'week': {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
      if (sameMonth) {
        return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
      }
      return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    case 'day':
      return format(currentDate, 'EEEE, MMMM d, yyyy');
  }
}

function getHeaderKey(viewMode: CalendarViewMode, currentDate: Date): string {
  switch (viewMode) {
    case 'month':
      return format(currentDate, 'yyyy-MM');
    case 'week':
      return format(startOfWeek(currentDate), 'yyyy-MM-dd');
    case 'day':
      return format(currentDate, 'yyyy-MM-dd');
  }
}

export default function CalendarView({
  todos,
  onTaskClick,
  onDateClick,
  onReschedule,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedCategories, setSelectedCategories] = useState<Set<DashboardTaskCategory>>(
    new Set(ALL_CATEGORIES)
  );
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Navigation
  const goToPrevious = useCallback(() => {
    setDirection('left');
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'month': return subMonths(prev, 1);
        case 'week': return subWeeks(prev, 1);
        case 'day': return subDays(prev, 1);
      }
    });
  }, [viewMode]);

  const goToNext = useCallback(() => {
    setDirection('right');
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'month': return addMonths(prev, 1);
        case 'week': return addWeeks(prev, 1);
        case 'day': return addDays(prev, 1);
      }
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setDirection(today > currentDate ? 'right' : 'left');
    setCurrentDate(today);
  }, [currentDate]);

  const handleMiniCalendarDateClick = useCallback((date: Date) => {
    setDirection(date > currentDate ? 'right' : 'left');
    setCurrentDate(date);
  }, [currentDate]);

  // Category filtering
  const toggleCategory = useCallback((category: DashboardTaskCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const selectAllCategories = useCallback(() => {
    setSelectedCategories(new Set(ALL_CATEGORIES));
  }, []);

  const clearAllCategories = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  // Filtered todos by date
  const todosByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    todos
      .filter((todo) => {
        if (!todo.due_date) return false;
        const category = todo.category || 'other';
        return selectedCategories.has(category);
      })
      .forEach((todo) => {
        const dateKey = todo.due_date!.split('T')[0];
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, todo]);
      });
    return map;
  }, [todos, selectedCategories]);

  // Category counts for current month
  // Uses string-based month extraction to avoid timezone issues with new Date()
  const categoryCounts = useMemo(() => {
    const counts: Record<DashboardTaskCategory, number> = {
      quote: 0, renewal: 0, claim: 0, service: 0,
      'follow-up': 0, prospecting: 0, other: 0,
    };
    const currentYearMonth = format(currentDate, 'yyyy-MM');
    todos.forEach((todo) => {
      if (!todo.due_date) return;
      // Extract YYYY-MM directly from the date string to avoid timezone shift
      const dueDateYearMonth = todo.due_date.substring(0, 7);
      if (dueDateYearMonth !== currentYearMonth) return;
      const category = todo.category || 'other';
      counts[category]++;
    });
    return counts;
  }, [todos, currentDate]);

  // Navigation label
  const navLabel = viewMode === 'month' ? 'month' : viewMode === 'week' ? 'week' : 'day';

  return (
    <div className="flex flex-col h-full bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          {/* Previous Button */}
          <button
            onClick={goToPrevious}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            aria-label={`Previous ${navLabel}`}
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-muted)]" />
          </button>

          {/* Date Display */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.h2
              key={getHeaderKey(viewMode, currentDate)}
              custom={direction}
              variants={headerVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="text-lg sm:text-xl font-semibold text-[var(--foreground)] min-w-[160px] text-center"
            >
              {getHeaderLabel(viewMode, currentDate)}
            </motion.h2>
          </AnimatePresence>

          {/* Next Button */}
          <button
            onClick={goToNext}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            aria-label={`Next ${navLabel}`}
          >
            <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
          </button>

          {/* Today Button */}
          <button
            onClick={goToToday}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
          >
            <CalendarIcon className="w-4 h-4" />
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <CalendarViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} />

          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  showFilterMenu || selectedCategories.size < ALL_CATEGORIES.length
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              {selectedCategories.size < ALL_CATEGORIES.length && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                  {selectedCategories.size}
                </span>
              )}
            </button>

            {/* Filter Dropdown */}
            <AnimatePresence>
              {showFilterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] shadow-xl z-50"
                  >
                    <div className="flex items-center gap-2 px-2 py-1.5 mb-2 border-b border-[var(--border)]">
                      <button
                        onClick={selectAllCategories}
                        className="text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-[var(--text-muted)]">|</span>
                      <button
                        onClick={clearAllCategories}
                        className="text-xs font-medium text-[var(--text-muted)] hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-1">
                      {ALL_CATEGORIES.map((category) => {
                        const isSelected = selectedCategories.has(category);
                        const count = categoryCounts[category];
                        return (
                          <button
                            key={category}
                            onClick={() => toggleCategory(category)}
                            className={`
                              w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors
                              ${isSelected ? 'bg-[var(--surface)]' : 'hover:bg-[var(--surface-hover)]'}
                            `}
                          >
                            <div
                              className={`
                                w-4 h-4 rounded flex items-center justify-center transition-colors
                                ${isSelected ? 'bg-[var(--accent)]' : 'border-2 border-[var(--border)]'}
                              `}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </div>
                            <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category]}`} />
                            <span className="flex-1 text-left text-sm text-[var(--foreground)]">
                              {CATEGORY_LABELS[category]}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Main View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === 'month' && (
            <MonthView
              currentMonth={currentDate}
              direction={direction}
              todosByDate={todosByDate}
              onDateClick={onDateClick}
              onTaskClick={onTaskClick}
              onReschedule={onReschedule}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              direction={direction}
              todosByDate={todosByDate}
              onDateClick={onDateClick}
              onTaskClick={onTaskClick}
              onReschedule={onReschedule}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              todosByDate={todosByDate}
              onDateClick={onDateClick}
              onTaskClick={onTaskClick}
              onReschedule={onReschedule}
            />
          )}
        </div>

        {/* Sidebar: Mini Calendar + Category Legend (visible on larger screens) */}
        <div className="hidden lg:flex flex-col w-56 border-l border-[var(--border)] bg-[var(--surface)]">
          {/* Mini Calendar */}
          <div className="p-3 border-b border-[var(--border)]">
            <MiniCalendar
              currentDate={currentDate}
              todosByDate={todosByDate}
              onDateClick={handleMiniCalendarDateClick}
            />
          </div>

          {/* Category Filters */}
          <div className="flex-1 p-4 overflow-auto">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
              Category Filters
            </h3>
            <div className="space-y-1">
              {ALL_CATEGORIES.map((category) => {
                const isSelected = selectedCategories.has(category);
                const count = categoryCounts[category];
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors
                      ${isSelected ? 'bg-[var(--surface-2)] shadow-sm' : 'opacity-50 hover:opacity-75'}
                    `}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[category]}`} />
                    <span className="flex-1 text-sm text-[var(--foreground)]">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-4 border-t border-[var(--border)]">
              <div className="text-xs text-[var(--text-muted)] space-y-1">
                <p className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full ring-2 ring-[var(--accent)]" />
                  Today
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--border)]" />
                  Other months
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CATEGORY_COLORS, CATEGORY_LABELS };
