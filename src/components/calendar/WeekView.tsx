'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  isToday,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from 'date-fns';
import { Todo } from '@/types/todo';
import { CATEGORY_COLORS } from './CalendarDayCell';

interface WeekViewProps {
  currentDate: Date;
  direction: 'left' | 'right';
  todosByDate: Map<string, Todo[]>;
  onDateClick: (date: Date) => void;
  onTaskClick: (todo: Todo) => void;
  onReschedule?: (todoId: string, newDate: string) => void;
}

const weekVariants = {
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

export default function WeekView({
  currentDate,
  direction,
  todosByDate,
  onDateClick,
  onTaskClick,
  onReschedule,
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(currentDate),
      end: endOfWeek(currentDate),
    });
  }, [currentDate]);

  return (
    <div className="flex-1 p-2 sm:p-4 overflow-auto">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={format(startOfWeek(currentDate), 'yyyy-MM-dd')}
          custom={direction}
          variants={weekVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="grid grid-cols-7 gap-2 h-full"
        >
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTodos = todosByDate.get(dateKey) || [];
            const today = isToday(day);

            return (
              <div
                key={dateKey}
                className={`
                  flex flex-col rounded-lg border overflow-hidden min-h-[200px]
                  ${today
                    ? 'ring-2 ring-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent)]/5'
                    : 'border-[var(--border)] bg-[var(--surface-2)]'
                  }
                `}
              >
                {/* Day Header */}
                <button
                  onClick={() => onDateClick(day)}
                  className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                    {format(day, 'EEE')}
                  </span>
                  <span
                    className={`
                      text-sm font-bold
                      ${today ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTodos.length > 0 && (
                    <span className="ml-auto text-xs text-[var(--text-muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded-full">
                      {dayTodos.length}
                    </span>
                  )}
                </button>

                {/* Tasks */}
                <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                  {dayTodos.map((todo) => {
                    const category = todo.category || 'other';
                    return (
                      <button
                        key={todo.id}
                        onClick={() => onTaskClick(todo)}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors text-left group"
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[category]}`}
                        />
                        <span className="text-xs text-[var(--foreground)] truncate flex-1">
                          {todo.customer_name || todo.text}
                        </span>
                      </button>
                    );
                  })}
                  {dayTodos.length === 0 && (
                    <button
                      onClick={() => onDateClick(day)}
                      className="w-full h-full min-h-[40px] flex items-center justify-center text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)] rounded-md transition-colors"
                    >
                      + Add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
