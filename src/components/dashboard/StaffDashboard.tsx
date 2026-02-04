'use client';

import { useMemo, useCallback } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Todo } from '@/types/todo';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import {
  isToday,
  isThisWeek,
  isBefore,
  startOfDay,
  addDays,
  format,
} from 'date-fns';

interface StaffDashboardProps {
  userName: string;
  todos: Todo[];
  onTaskClick: (todo: Todo) => void;
}

type StatCardVariant = 'default' | 'success' | 'warning' | 'danger';

type StatCardProps = {
  value: number;
  label: string;
  icon: ComponentType<{ className?: string }>;
  variant?: StatCardVariant;
};

function StatCard({
  value,
  label,
  icon: Icon,
  variant = 'default',
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-slate-50 dark:bg-white/5',
    success: 'bg-emerald-50 dark:bg-emerald-500/10',
    warning: 'bg-amber-50 dark:bg-amber-500/10',
    danger: 'bg-red-50 dark:bg-red-500/10',
  };

  const iconStyles = {
    default: 'text-slate-400 dark:text-slate-500',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  };

  const valueStyles = {
    default: 'text-slate-900 dark:text-white',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={`text-center p-4 rounded-[var(--radius-xl)] transition-colors ${variantStyles[variant]}`}>
      <div className="flex items-center justify-center mb-2">
        <Icon className={`w-5 h-5 ${iconStyles[variant]}`} />
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueStyles[variant]}`}>
        {value}
      </p>
      <p className="text-label text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}

type CardProps = {
  children: ReactNode;
  className?: string;
};

function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-2xl)] p-5 transition-all duration-200 bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

type SectionTitleProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  badge?: number;
};

function SectionTitle({ icon: Icon, title, badge }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center bg-[#0033A0]/8 dark:bg-[#0033A0]/20">
          <Icon className="w-4 h-4 text-[#0033A0] dark:text-[#72B5E8]" />
        </div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </h2>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-0.5 rounded-full text-badge bg-red-500 text-white min-w-[20px] text-center">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

type TaskRowProps = {
  task: Todo;
  index: number;
  showPremium?: boolean;
  prefersReducedMotion: boolean;
  onTaskClick: (todo: Todo) => void;
  isOverdue: (dateStr: string) => boolean;
  formatDueDate: (dateStr: string) => string;
  formatPremium: (amount: number | undefined) => string | null;
};

function TaskRow({
  task,
  index,
  showPremium = false,
  prefersReducedMotion,
  onTaskClick,
  isOverdue,
  formatDueDate,
  formatPremium,
}: TaskRowProps) {
  const overdue = task.due_date ? isOverdue(task.due_date) : false;

  return (
    <motion.button
      initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { delay: index * 0.03 }}
      onClick={() => onTaskClick(task)}
      aria-label={`Open task: ${task.text}`}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] text-left transition-all duration-200 group min-h-[52px] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] focus-visible:ring-offset-2 ${
        overdue
          ? 'bg-red-50/50 dark:bg-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/20'
          : 'hover:bg-slate-50 dark:hover:bg-white/5'
      } active:bg-slate-100 dark:active:bg-white/10 active:scale-[0.98] focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`}
    >
      {/* Due Date */}
      <span className={`text-xs font-medium w-20 flex-shrink-0 ${
        overdue
          ? 'text-red-500'
          : 'text-slate-500 dark:text-slate-400'
      }`}>
        {task.due_date ? formatDueDate(task.due_date) : 'No date'}
      </span>

      {/* Task Text */}
      <span className="flex-1 text-sm font-medium truncate text-slate-800 dark:text-slate-200">
        {task.text}
      </span>

      {/* Premium (for quotes) */}
      {showPremium && task.premium_amount && (
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums flex-shrink-0">
          {formatPremium(task.premium_amount)}
        </span>
      )}

      {/* Priority Badge */}
      {!showPremium && (
        <PriorityBadge priority={task.priority} size="sm" showLabel={false} />
      )}

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-all group-hover:translate-x-0.5 text-slate-400 dark:text-slate-500" />
    </motion.button>
  );
}

/**
 * StaffDashboard - Simplified "My Work" view for staff members (non-owners)
 *
 * Features:
 * - Personal greeting based on time of day
 * - Personal stats (today, week, overdue, quotes)
 * - My Tasks section (due in next 7 days)
 * - My Quotes section (open quote tasks)
 */
export default function StaffDashboard({
  userName,
  todos,
  onTaskClick,
}: StaffDashboardProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  // Extract first name for greeting
  const firstName = userName.split(' ')[0];

  // Get time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Filter to only MY tasks
  const myTodos = useMemo(() => {
    return todos.filter(t =>
      t.assigned_to === userName ||
      (!t.assigned_to && t.created_by === userName)
    );
  }, [todos, userName]);

  // Calculate personal stats
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const completedTodos = myTodos.filter(t => t.completed);
    const activeTodos = myTodos.filter(t => !t.completed);

    // Completed today
    const completedToday = completedTodos.filter(t => {
      if (!t.updated_at) return false;
      return isToday(new Date(t.updated_at));
    }).length;

    // Completed this week
    const completedThisWeek = completedTodos.filter(t => {
      if (!t.updated_at) return false;
      return isThisWeek(new Date(t.updated_at), { weekStartsOn: 1 });
    }).length;

    // Overdue tasks
    const overdueTasks = activeTodos.filter(t => {
      if (!t.due_date) return false;
      const dueDate = startOfDay(new Date(t.due_date));
      return isBefore(dueDate, today);
    });

    // Open quotes (category === 'quote' and not completed)
    const openQuotes = activeTodos.filter(t => t.category === 'quote');

    return {
      completedToday,
      completedThisWeek,
      overdueCount: overdueTasks.length,
      openQuotesCount: openQuotes.length,
    };
  }, [myTodos]);

  // Get tasks due in next 7 days
  const tasksDueSoon = useMemo(() => {
    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, 7);

    return myTodos
      .filter(t => {
        if (t.completed) return false;
        if (!t.due_date) return false;
        const dueDate = startOfDay(new Date(t.due_date));
        // Include overdue and next 7 days
        return isBefore(dueDate, sevenDaysFromNow);
      })
      .sort((a, b) => {
        const dateA = new Date(a.due_date || '').getTime();
        const dateB = new Date(b.due_date || '').getTime();
        return dateA - dateB;
      })
      .slice(0, 8);
  }, [myTodos]);

  // Get open quotes
  const openQuotes = useMemo(() => {
    return myTodos
      .filter(t => !t.completed && t.category === 'quote')
      .sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [myTodos]);

  // Format due date for display
  const formatDueDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const today = startOfDay(new Date());
    const dueDate = startOfDay(date);

    if (isToday(dueDate)) return 'Today';
    if (isBefore(dueDate, today)) {
      return format(date, 'MMM d') + ' (Overdue)';
    }
    return format(date, 'MMM d');
  }, []);

  // Check if task is overdue
  const isOverdue = useCallback((dateStr: string) => {
    const date = startOfDay(new Date(dateStr));
    const today = startOfDay(new Date());
    return isBefore(date, today);
  }, []);

  // Format premium amount
  const formatPremium = (amount: number | undefined) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-1"
      >
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {greeting}, {firstName}!
        </h1>
      </motion.div>

      {/* Personal Stats Row */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1 }}
      >
        <Card>
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              value={stats.completedToday}
              label="Today"
              icon={CheckCircle}
              variant={stats.completedToday > 0 ? 'success' : 'default'}
            />
            <StatCard
              value={stats.completedThisWeek}
              label="Week"
              icon={TrendingUp}
              variant={stats.completedThisWeek > 0 ? 'success' : 'default'}
            />
            <StatCard
              value={stats.overdueCount}
              label="Overdue"
              icon={AlertTriangle}
              variant={stats.overdueCount > 0 ? 'danger' : 'default'}
            />
            <StatCard
              value={stats.openQuotesCount}
              label="Quotes"
              icon={FileText}
              variant="default"
            />
          </div>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* My Tasks Due Soon */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2 }}
        >
          <Card>
            <SectionTitle
              icon={Calendar}
              title="My Tasks Due Soon"
              badge={tasksDueSoon.filter(t => t.due_date && isOverdue(t.due_date)).length}
            />

            {tasksDueSoon.length > 0 ? (
              <div className="space-y-1">
                {tasksDueSoon.map((task, index) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={index}
                    prefersReducedMotion={prefersReducedMotion}
                    onTaskClick={onTaskClick}
                    isOverdue={isOverdue}
                    formatDueDate={formatDueDate}
                    formatPremium={formatPremium}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 py-6 px-4 rounded-[var(--radius-xl)] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  No upcoming tasks - you&apos;re all caught up!
                </span>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* My Open Quotes */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 }}
        >
          <Card>
            <SectionTitle icon={FileText} title="My Open Quotes" />

            {openQuotes.length > 0 ? (
              <div className="space-y-1">
                {openQuotes.map((task, index) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={index}
                    showPremium
                    prefersReducedMotion={prefersReducedMotion}
                    onTaskClick={onTaskClick}
                    isOverdue={isOverdue}
                    formatDueDate={formatDueDate}
                    formatPremium={formatPremium}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 py-6 px-4 rounded-[var(--radius-xl)] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No open quotes at the moment
                </span>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Quick Encouragement if doing well */}
      {stats.completedToday >= 3 && stats.overdueCount === 0 && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.4 }}
          className="flex items-center gap-3 p-4 rounded-[var(--radius-2xl)] bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200/50 dark:border-emerald-500/20"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Great progress today!
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">
              You&apos;ve completed {stats.completedToday} tasks with no overdue items
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
