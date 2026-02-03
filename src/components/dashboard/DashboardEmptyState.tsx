'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ListTodo,
  Target,
  Sparkles,
  Plus,
  ArrowRight,
} from 'lucide-react';

type EmptyStateVariant = 'no-tasks' | 'all-done' | 'no-overdue' | 'no-due-today';

interface DashboardEmptyStateProps {
  variant: EmptyStateVariant;
  userName?: string;
  onAddTask?: () => void;
  onViewTasks?: () => void;
  className?: string;
}

const variants: Record<EmptyStateVariant, {
  icon: typeof CheckCircle2;
  title: string;
  description: string;
  actionLabel?: string;
  actionType: 'add' | 'view' | 'none';
  iconColor: string;
  bgGradient: string;
}> = {
  'no-tasks': {
    icon: ListTodo,
    title: 'No tasks yet',
    description: 'Create your first task to get started on your productivity journey.',
    actionLabel: 'Add Task',
    actionType: 'add',
    iconColor: 'text-blue-500',
    bgGradient: 'from-blue-500/10 to-sky-500/5',
  },
  'all-done': {
    icon: CheckCircle2,
    title: 'All caught up!',
    description: 'Great work! You\'ve completed all your tasks. Time to plan ahead or take a well-deserved break.',
    actionLabel: 'Add New Task',
    actionType: 'add',
    iconColor: 'text-emerald-500',
    bgGradient: 'from-emerald-500/10 to-green-500/5',
  },
  'no-overdue': {
    icon: Target,
    title: 'No overdue tasks',
    description: 'You\'re staying on top of your deadlines. Keep up the excellent work!',
    actionType: 'none',
    iconColor: 'text-emerald-500',
    bgGradient: 'from-emerald-500/10 to-green-500/5',
  },
  'no-due-today': {
    icon: Sparkles,
    title: 'Nothing due today',
    description: 'Your schedule is clear for today. Consider working ahead on upcoming tasks.',
    actionLabel: 'View All Tasks',
    actionType: 'view',
    iconColor: 'text-amber-500',
    bgGradient: 'from-amber-500/10 to-orange-500/5',
  },
};

/**
 * DashboardEmptyState Component
 *
 * A friendly, informative empty state for dashboard sections.
 * Provides context-appropriate messaging and actionable next steps.
 */
export default function DashboardEmptyState({
  variant,
  userName,
  onAddTask,
  onViewTasks,
  className = '',
}: DashboardEmptyStateProps) {
  const config = variants[variant];
  const Icon = config.icon;

  const handleAction = () => {
    if (config.actionType === 'add' && onAddTask) {
      onAddTask();
    } else if (config.actionType === 'view' && onViewTasks) {
      onViewTasks();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`text-center py-8 px-6 rounded-2xl bg-gradient-to-br ${config.bgGradient} border border-[var(--border)] ${className}`}
    >
      {/* Animated Icon */}
      <motion.div
        className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-white/50 dark:bg-white/10 border border-[var(--border)]`}
        animate={{
          scale: [1, 1.02, 1],
          rotate: variant === 'all-done' ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Icon className={`w-8 h-8 ${config.iconColor}`} />
      </motion.div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
        {userName && variant === 'all-done' ? `Great job, ${userName}!` : config.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto mb-5">
        {config.description}
      </p>

      {/* Action Button */}
      {config.actionLabel && (config.actionType === 'add' ? onAddTask : onViewTasks) && (
        <button
          onClick={handleAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-blue)] text-white font-medium text-sm hover:bg-[#0047CC] transition-colors min-h-[48px] touch-manipulation"
        >
          {config.actionType === 'add' ? (
            <Plus className="w-4 h-4" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {config.actionLabel}
        </button>
      )}
    </motion.div>
  );
}
