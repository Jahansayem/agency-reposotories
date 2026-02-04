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
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Todo, DashboardTaskCategory } from '@/types/todo';
import CalendarDayCell, { CATEGORY_COLORS, CATEGORY_LABELS } from './CalendarDayCell';

interface CalendarViewProps {
  todos: Todo[];
  onTaskClick: (todo: Todo) => void;
  onDateClick: (date: Date) => void;
}

// Day of week headers
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// All available categories
const ALL_CATEGORIES: DashboardTaskCategory[] = [
  'quote',
  'renewal',
  'claim',
  'service',
  'follow-up',
  'prospecting',
  'other',
];

export default function CalendarView({
  todos,
  onTaskClick,
  onDateClick,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCategories, setSelectedCategories] = useState<Set<DashboardTaskCategory>>(
    new Set(ALL_CATEGORIES)
  );
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    setDirection('left');
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    setDirection('right');
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  // Go to today
  const goToToday = useCallback(() => {
    const today = new Date();
    setDirection(today > currentMonth ? 'right' : 'left');
    setCurrentMonth(today);
  }, [currentMonth]);

  // Toggle category filter
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

  // Select all categories
  const selectAllCategories = useCallback(() => {
    setSelectedCategories(new Set(ALL_CATEGORIES));
  }, []);

  // Clear all categories
  const clearAllCategories = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  // Calculate calendar days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart); // Start from Sunday
    const calendarEnd = endOfWeek(monthEnd); // End on Saturday

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Filter todos by selected categories and map by date
  const todosByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();

    todos
      .filter((todo) => {
        // Only include todos with due dates
        if (!todo.due_date) return false;
        // Filter by selected categories
        const category = todo.category || 'other';
        return selectedCategories.has(category);
      })
      .forEach((todo) => {
        const dateKey = format(new Date(todo.due_date!), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, todo]);
      });

    return map;
  }, [todos, selectedCategories]);

  // Calculate category counts for filter badges
  const categoryCounts = useMemo(() => {
    const counts: Record<DashboardTaskCategory, number> = {
      quote: 0,
      renewal: 0,
      claim: 0,
      service: 0,
      'follow-up': 0,
      prospecting: 0,
      other: 0,
    };

    todos.forEach((todo) => {
      if (!todo.due_date) return;
      const dueDate = new Date(todo.due_date);
      if (!isSameMonth(dueDate, currentMonth)) return;
      const category = todo.category || 'other';
      counts[category]++;
    });

    return counts;
  }, [todos, currentMonth]);

  // Animation variants for month transitions
  const monthVariants = {
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          {/* Previous Month Button */}
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Month/Year Display */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.h2
              key={format(currentMonth, 'yyyy-MM')}
              custom={direction}
              variants={monthVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white min-w-[160px] text-center"
            >
              {format(currentMonth, 'MMMM yyyy')}
            </motion.h2>
          </AnimatePresence>

          {/* Next Month Button */}
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Today Button */}
          <button
            onClick={goToToday}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#0033A0] dark:text-[#72B5E8] hover:bg-[#0033A0]/10 dark:hover:bg-[#72B5E8]/10 transition-colors"
          >
            <CalendarIcon className="w-4 h-4" />
            Today
          </button>
        </div>

        {/* Filter Button */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                showFilterMenu || selectedCategories.size < ALL_CATEGORIES.length
                  ? 'bg-[#0033A0] dark:bg-[#72B5E8] text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
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
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFilterMenu(false)}
                />

                {/* Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50"
                >
                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-2 border-b border-slate-200 dark:border-slate-700">
                    <button
                      onClick={selectAllCategories}
                      className="text-xs font-medium text-[#0033A0] dark:text-[#72B5E8] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      onClick={clearAllCategories}
                      className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Category Options */}
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
                            ${
                              isSelected
                                ? 'bg-slate-100 dark:bg-slate-700'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }
                          `}
                        >
                          {/* Checkbox */}
                          <div
                            className={`
                              w-4 h-4 rounded flex items-center justify-center transition-colors
                              ${
                                isSelected
                                  ? 'bg-[#0033A0] dark:bg-[#72B5E8]'
                                  : 'border-2 border-slate-300 dark:border-slate-600'
                              }
                            `}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            )}
                          </div>

                          {/* Color Dot */}
                          <div
                            className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category]}`}
                          />

                          {/* Label */}
                          <span className="flex-1 text-left text-sm text-slate-700 dark:text-slate-300">
                            {CATEGORY_LABELS[category]}
                          </span>

                          {/* Count */}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {count}
                          </span>
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

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Main Calendar */}
        <div className="flex-1 p-2 sm:p-4 overflow-auto">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={format(currentMonth, 'yyyy-MM')}
              custom={direction}
              variants={monthVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="grid grid-cols-7 gap-1"
            >
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayTodos = todosByDate.get(dateKey) || [];

                return (
                  <CalendarDayCell
                    key={dateKey}
                    date={day}
                    todos={dayTodos}
                    isCurrentMonth={isSameMonth(day, currentMonth)}
                    isToday={isToday(day)}
                    onClick={() => onDateClick(day)}
                    onTaskClick={onTaskClick}
                  />
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Category Legend Sidebar (visible on larger screens) */}
        <div className="hidden lg:flex flex-col w-48 p-4 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
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
                    ${
                      isSelected
                        ? 'bg-white dark:bg-slate-700 shadow-sm'
                        : 'opacity-50 hover:opacity-75'
                    }
                  `}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[category]}`}
                  />
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend Divider */}
          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-[#0033A0] dark:ring-[#72B5E8]" />
                Today
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600" />
                Other months
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CATEGORY_COLORS, CATEGORY_LABELS };
