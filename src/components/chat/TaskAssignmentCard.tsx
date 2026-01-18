'use client';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  FileText,
  ChevronRight,
  AlertTriangle,
  User,
  RefreshCw,
} from 'lucide-react';
import { Todo, PRIORITY_CONFIG } from '@/types/todo';

// ============================================
// Types
// ============================================

export type SystemNotificationType =
  | 'task_assignment'
  | 'task_completion'
  | 'task_reassignment';

interface TaskAssignmentCardProps {
  /** The task being notified about */
  todo: Todo;
  /** Type of notification */
  notificationType: SystemNotificationType;
  /** Who triggered this notification */
  actionBy: string;
  /** Optional: who was previously assigned (for reassignment) */
  previousAssignee?: string;
  /** Callback when user wants to view the task */
  onViewTask: () => void;
  /** Whether the current user is the message sender (affects styling) */
  isOwnMessage?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format due date for display with relative terms
 */
function formatDueDate(dueDate: string): { text: string; isOverdue: boolean } {
  const date = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const isOverdue = dateOnly < today;
  const isToday = dateOnly.getTime() === today.getTime();
  const isTomorrow = dateOnly.getTime() === tomorrow.getTime();

  if (isToday) {
    return { text: 'Due today', isOverdue: false };
  }
  if (isTomorrow) {
    return { text: 'Due tomorrow', isOverdue: false };
  }
  if (isOverdue) {
    return { text: `Overdue (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`, isOverdue: true };
  }
  return { text: `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, isOverdue: false };
}

/**
 * Get notification header content based on type
 */
function getNotificationHeader(
  type: SystemNotificationType,
  actionBy: string,
  previousAssignee?: string
): { icon: React.ReactNode; title: string; subtitle: string } {
  switch (type) {
    case 'task_assignment':
      return {
        icon: <User className="w-4 h-4" aria-hidden="true" />,
        title: 'New Task Assigned',
        subtitle: `from ${actionBy}`,
      };
    case 'task_completion':
      return {
        icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
        title: 'Task Completed',
        subtitle: `by ${actionBy}`,
      };
    case 'task_reassignment':
      return {
        icon: <RefreshCw className="w-4 h-4" aria-hidden="true" />,
        title: 'Task Reassigned',
        subtitle: previousAssignee
          ? `from ${previousAssignee} by ${actionBy}`
          : `by ${actionBy}`,
      };
    default:
      return {
        icon: <FileText className="w-4 h-4" aria-hidden="true" />,
        title: 'Task Update',
        subtitle: `by ${actionBy}`,
      };
  }
}

// ============================================
// Component
// ============================================

export const TaskAssignmentCard = memo(function TaskAssignmentCard({
  todo,
  notificationType,
  actionBy,
  previousAssignee,
  onViewTask,
  isOwnMessage = false,
}: TaskAssignmentCardProps) {
  const priorityConfig = PRIORITY_CONFIG[todo.priority || 'medium'];
  const subtasksCompleted = todo.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = todo.subtasks?.length || 0;
  const header = getNotificationHeader(notificationType, actionBy, previousAssignee);

  // Due date formatting
  const dueInfo = todo.due_date ? formatDueDate(todo.due_date) : null;

  // Handle card click
  const handleCardClick = useCallback(() => {
    onViewTask();
  }, [onViewTask]);

  // Handle keyboard activation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onViewTask();
      }
    },
    [onViewTask]
  );

  // Handle button click (prevent double-firing)
  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onViewTask();
    },
    [onViewTask]
  );

  // Get priority border color
  const getPriorityBorderColor = () => {
    switch (todo.priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${header.title}: ${todo.text}. ${todo.priority} priority. Click to view task.`}
      className={`
        w-full sm:max-w-xs
        bg-[var(--surface)] dark:bg-[var(--surface)]
        rounded-xl
        border border-[var(--border)]
        overflow-hidden
        shadow-sm hover:shadow-md
        transition-all duration-200
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 dark:focus:ring-offset-[var(--background)]
        ${isOwnMessage ? 'ml-auto' : ''}
      `}
    >
      {/* Priority color bar */}
      <div
        className={`h-1 w-full ${getPriorityBorderColor()}`}
        aria-hidden="true"
      />

      <div className="p-4">
        {/* Notification header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`
              w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
              ${notificationType === 'task_completion'
                ? 'bg-[var(--success-light)] text-[var(--success)]'
                : 'bg-[var(--accent-light)] text-[var(--accent)]'
              }
            `}
          >
            {header.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--foreground)]">
              {header.title}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {header.subtitle}
            </p>
          </div>
        </div>

        {/* Task title + priority badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-[var(--foreground)] text-sm leading-snug flex-1 line-clamp-2">
            {todo.text}
          </h4>
          {(todo.priority === 'urgent' || todo.priority === 'high') && (
            <span
              className="px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0"
              style={{
                backgroundColor: priorityConfig.bgColor,
                color: priorityConfig.color,
              }}
            >
              {priorityConfig.label}
            </span>
          )}
        </div>

        {/* Due date */}
        {dueInfo && (
          <div
            className={`flex items-center gap-1.5 text-xs mb-3 ${
              dueInfo.isOverdue
                ? 'text-[var(--danger)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {dueInfo.isOverdue ? (
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{dueInfo.text}</span>
          </div>
        )}

        {/* Subtasks preview */}
        {subtasksTotal > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {subtasksCompleted}/{subtasksTotal} subtasks
              </span>
            </div>
            <ul className="space-y-1" aria-label="Subtask preview">
              {todo.subtasks?.slice(0, 3).map((subtask) => (
                <li
                  key={subtask.id}
                  className={`text-xs flex items-center gap-2 ${
                    subtask.completed
                      ? 'text-[var(--text-light)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <span
                    className={subtask.completed ? 'text-[var(--success)]' : 'text-[var(--text-light)]'}
                    aria-hidden="true"
                  >
                    {subtask.completed ? '\u2713' : '\u25CB'}
                  </span>
                  <span className={subtask.completed ? 'line-through' : ''}>
                    {subtask.text}
                  </span>
                  <span className="sr-only">
                    {subtask.completed ? '(completed)' : '(pending)'}
                  </span>
                </li>
              ))}
              {subtasksTotal > 3 && (
                <li className="text-xs text-[var(--text-light)] italic pl-5">
                  +{subtasksTotal - 3} more...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Notes preview */}
        {todo.notes && (
          <div className="flex items-start gap-1.5 text-xs text-[var(--text-muted)] mb-3">
            <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="line-clamp-2">{todo.notes}</p>
          </div>
        )}

        {/* Action footer */}
        <div className="flex items-center justify-end pt-2 border-t border-[var(--border-subtle)]">
          <button
            onClick={handleButtonClick}
            className="
              flex items-center gap-1.5
              px-3 py-1.5
              text-xs font-medium
              text-[var(--accent)]
              bg-[var(--accent-light)]
              rounded-lg
              hover:bg-[var(--accent)]/20
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 dark:focus:ring-offset-[var(--surface)]
            "
            aria-label={`View task: ${todo.text}`}
          >
            View Task
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.article>
  );
});

export default TaskAssignmentCard;
