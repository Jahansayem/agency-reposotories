'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckSquare, ListChecks, ChevronRight } from 'lucide-react';
import { Todo } from '@/types/todo';
import { ProgressRing } from '@/components/ui/ProgressRing';

interface SubtaskProgressWidgetProps {
  todos: Todo[];
  onViewSubtasks?: () => void;
}

// Card component following DoerDashboard pattern
function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-2xl)] p-5 transition-all duration-200 bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

// SectionTitle component following DoerDashboard pattern
function SectionTitle({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: number;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center bg-[#0033A0]/8">
          <Icon className="w-4 h-4 text-[#0033A0]" />
        </div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </h2>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent)] text-white min-w-[20px] text-center">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// Determine progress color based on completion percentage
function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'var(--success)';
  if (percentage >= 50) return 'var(--accent)';
  if (percentage >= 25) return 'var(--warning)';
  return 'var(--text-muted)';
}

/**
 * SubtaskProgressWidget Component
 *
 * Displays subtask completion progress across all todos with a circular progress ring.
 * Shows total subtasks, completed count, and completion percentage.
 * Follows the Card/SectionTitle patterns from DoerDashboard.
 */
export default function SubtaskProgressWidget({
  todos,
  onViewSubtasks,
}: SubtaskProgressWidgetProps) {
  const prefersReducedMotion = useReducedMotion();

  // Calculate subtask statistics
  const subtaskStats = useMemo(() => {
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    let tasksWithSubtasks = 0;

    for (const todo of todos) {
      if (todo.subtasks && todo.subtasks.length > 0) {
        tasksWithSubtasks++;
        for (const subtask of todo.subtasks) {
          totalSubtasks++;
          if (subtask.completed) {
            completedSubtasks++;
          }
        }
      }
    }

    const completionPercentage =
      totalSubtasks > 0
        ? Math.round((completedSubtasks / totalSubtasks) * 100)
        : 0;

    return {
      total: totalSubtasks,
      completed: completedSubtasks,
      remaining: totalSubtasks - completedSubtasks,
      percentage: completionPercentage,
      tasksWithSubtasks,
    };
  }, [todos]);

  // If no subtasks exist, show empty state
  if (subtaskStats.total === 0) {
    return (
      <Card>
        <SectionTitle icon={ListChecks} title="Subtask Progress" />
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
            <CheckSquare className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            No subtasks yet
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Break down tasks into subtasks for better tracking
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle
        icon={ListChecks}
        title="Subtask Progress"
        badge={subtaskStats.remaining > 0 ? subtaskStats.remaining : undefined}
      />

      <div className="flex flex-col items-center">
        {/* Progress Ring with percentage */}
        <motion.div
          initial={prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
          }
          className="mb-4"
        >
          <ProgressRing
            progress={subtaskStats.percentage}
            size={100}
            strokeWidth={8}
            color={getProgressColor(subtaskStats.percentage)}
            trackColor="var(--surface-3)"
            showPercentage={true}
            animationDuration={0.8}
          />
        </motion.div>

        {/* Completion text */}
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { delay: 0.2, duration: 0.3 }
          }
          className="text-sm font-medium text-[var(--foreground)] text-center"
          role="status"
          aria-live="polite"
        >
          {subtaskStats.completed} of {subtaskStats.total} subtasks complete
          <span className="text-[var(--text-muted)] ml-1">
            ({subtaskStats.percentage}%)
          </span>
        </motion.p>

        {/* Breakdown stats */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.3 }
          }
          className="grid grid-cols-3 gap-3 w-full mt-4 pt-4 border-t border-[var(--border)]"
        >
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums text-[var(--foreground)]">
              {subtaskStats.total}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Total</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums text-[var(--success)]">
              {subtaskStats.completed}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Complete</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums text-[var(--warning)]">
              {subtaskStats.remaining}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Remaining</p>
          </div>
        </motion.div>

        {/* Tasks with subtasks indicator */}
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Across {subtaskStats.tasksWithSubtasks} task
          {subtaskStats.tasksWithSubtasks !== 1 ? 's' : ''} with subtasks
        </p>

        {/* View Tasks with Subtasks action button */}
        {onViewSubtasks && (
          <motion.button
            initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { delay: 0.4, duration: 0.3 }
            }
            onClick={onViewSubtasks}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-xl)] text-sm font-medium text-[#0033A0] bg-[#0033A0]/5 hover:bg-[#0033A0]/10 transition-colors duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            aria-label="View all tasks with subtasks"
          >
            <CheckSquare className="w-4 h-4" aria-hidden="true" />
            <span>View Tasks with Subtasks</span>
            <ChevronRight
              className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </motion.button>
        )}
      </div>
    </Card>
  );
}
