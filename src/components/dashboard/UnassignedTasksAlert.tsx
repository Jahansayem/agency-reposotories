'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UserX, Users, ArrowRight } from 'lucide-react';
import type { Todo } from '@/types/todo';

interface UnassignedTasksAlertProps {
  todos: Todo[];
  onAssignTasks?: () => void;
  onTaskClick?: (taskId: string) => void;
}

/**
 * UnassignedTasksAlert
 *
 * Displays a warning alert banner when there are incomplete tasks without an assignee.
 * Uses amber/warning color scheme to indicate this is actionable but not critical.
 *
 * Features:
 * - Shows count of unassigned incomplete tasks
 * - Displays up to 3 task titles (truncated)
 * - "Assign Tasks" action button
 * - Clickable task titles to open individual tasks
 * - Accessible with proper focus states and ARIA labels
 * - Respects reduced motion preferences
 */
export default function UnassignedTasksAlert({
  todos,
  onAssignTasks,
  onTaskClick,
}: UnassignedTasksAlertProps) {
  const prefersReducedMotion = useReducedMotion();

  // Filter for incomplete, unassigned tasks
  const unassignedTasks = useMemo(() => {
    return todos.filter(todo => !todo.completed && !todo.assigned_to);
  }, [todos]);

  const unassignedCount = unassignedTasks.length;

  // Don't render if no unassigned tasks
  if (unassignedCount === 0) {
    return null;
  }

  // Get up to 3 task titles for preview
  const previewTasks = unassignedTasks.slice(0, 3);
  const remainingCount = unassignedCount - previewTasks.length;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-live="polite"
    >
      <div
        className="w-full flex items-start gap-4 p-4 rounded-[var(--radius-2xl)] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
      >
        {/* Icon container */}
        <div className="flex items-center justify-center w-12 h-12 rounded-[var(--radius-xl)] bg-amber-500/20 flex-shrink-0">
          <UserX className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with count */}
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {unassignedCount} unassigned task{unassignedCount > 1 ? 's' : ''}
          </p>

          {/* Task preview list */}
          <div className="mt-2 space-y-1">
            {previewTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                className="block w-full text-left text-sm text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 truncate transition-colors focus-visible:outline-none focus-visible:underline focus-visible:text-amber-700 dark:focus-visible:text-amber-300"
                aria-label={`Open task: ${task.text}`}
              >
                <span className="mr-1.5 text-amber-500">-</span>
                {task.text}
              </button>
            ))}
            {remainingCount > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                +{remainingCount} more unassigned task{remainingCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Action button */}
        {onAssignTasks && (
          <button
            onClick={onAssignTasks}
            aria-label={`Assign ${unassignedCount} unassigned task${unassignedCount > 1 ? 's' : ''}`}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:focus-visible:ring-offset-amber-950/30 flex-shrink-0 group"
          >
            <Users className="w-4 h-4" />
            <span>Assign Tasks</span>
            <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
