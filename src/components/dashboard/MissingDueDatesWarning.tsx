'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarX, Calendar, ChevronRight } from 'lucide-react';
import { Todo } from '@/types/todo';

interface MissingDueDatesWarningProps {
  todos: Todo[];
  onSetDueDates?: () => void;
  onTaskClick?: (taskId: string) => void;
}

export default function MissingDueDatesWarning({
  todos,
  onSetDueDates,
  onTaskClick,
}: MissingDueDatesWarningProps) {
  const prefersReducedMotion = useReducedMotion();

  // Filter to incomplete tasks without due dates
  const tasksWithoutDueDates = useMemo(() => {
    return todos.filter((todo) => !todo.completed && !todo.due_date);
  }, [todos]);

  // Don't render if no tasks are missing due dates
  if (tasksWithoutDueDates.length === 0) {
    return null;
  }

  const count = tasksWithoutDueDates.length;
  const displayTasks = tasksWithoutDueDates.slice(0, 3);
  const remainingCount = count - displayTasks.length;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-[var(--radius-2xl)] p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center bg-slate-200/80 dark:bg-slate-700">
            <CalendarX className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Missing Due Dates
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {count} task{count !== 1 ? 's' : ''} without a due date
            </p>
          </div>
        </div>

        {onSetDueDates && (
          <button
            onClick={onSetDueDates}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[var(--radius-lg)] bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-800"
          >
            <Calendar className="w-3.5 h-3.5" />
            Set Due Dates
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-1.5">
        {displayTasks.map((task, index) => (
          <motion.button
            key={task.id}
            initial={prefersReducedMotion ? false : { opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: index * 0.05 }}
            onClick={() => onTaskClick?.(task.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] text-left transition-all duration-200 group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-800"
          >
            {/* Priority indicator */}
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                task.priority === 'urgent'
                  ? 'bg-red-500'
                  : task.priority === 'high'
                    ? 'bg-orange-500'
                    : task.priority === 'medium'
                      ? 'bg-blue-500'
                      : 'bg-slate-400'
              }`}
            />
            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {task.text}
            </span>
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
          </motion.button>
        ))}

        {/* Show more indicator */}
        {remainingCount > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-1">
            +{remainingCount} more task{remainingCount !== 1 ? 's' : ''} without due dates
          </p>
        )}
      </div>
    </motion.div>
  );
}
