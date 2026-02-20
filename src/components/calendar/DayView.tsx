'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isPast, startOfDay } from 'date-fns';
import { ChevronRight, CheckCircle2, Clock, AlertTriangle, Bell, Sun, Moon, Calendar, Repeat } from 'lucide-react';
import { Todo, TodoPriority } from '@/types/todo';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  isTaskOverdue,
  STATUS_BORDER,
  SEGMENT_COLORS,
  SEGMENT_LABELS,
  getSubtaskProgress,
  isFollowUpOverdue,
  getInitials,
  formatPremiumCompact,
  hasPendingReminders,
  PREMIUM_DISPLAY_THRESHOLD,
} from './constants';

interface DayViewProps {
  currentDate: Date;
  direction: 'left' | 'right';
  todosByDate: Map<string, Todo[]>;
  onDateClick: (date: Date) => void;
  onTaskClick: (todo: Todo) => void;
  onQuickComplete?: (todoId: string) => void;
  onToggleWaiting?: (todoId: string, waiting: boolean) => void;
  onQuickAdd?: (dateKey: string, text: string) => void;
}

const PRIORITY_BADGES: Record<TodoPriority, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  low: { label: 'Low', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const dayVariants = {
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

/** Time period for grouping tasks */
type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'all-day';

/** Extract the hour from a due_date, or null if no time component */
function extractHour(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  if (!dueDate.includes('T')) return null;
  const timePart = dueDate.split('T')[1];
  if (!timePart) return null;
  if (timePart.startsWith('00:00:00') || timePart.startsWith('00:00')) return null;
  try {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return null;
    return d.getHours();
  } catch {
    return null;
  }
}

/** Format time from a due_date string (e.g. "2:30 PM") */
function formatTime(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  if (!dueDate.includes('T')) return null;
  const timePart = dueDate.split('T')[1];
  if (!timePart) return null;
  if (timePart.startsWith('00:00:00') || timePart.startsWith('00:00')) return null;
  try {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return null;
    return format(d, 'h:mm a');
  } catch {
    return null;
  }
}

/** Determine which time period a task belongs to */
function getTimePeriod(dueDate: string | null | undefined): TimePeriod {
  const hour = extractHour(dueDate);
  if (hour === null) return 'all-day';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const TIME_PERIOD_CONFIG: Record<TimePeriod, { label: string; icon: typeof Sun; className: string }> = {
  'all-day': { label: 'All Day', icon: Calendar, className: 'text-[var(--text-muted)]' },
  morning: { label: 'Morning', icon: Sun, className: 'text-amber-500' },
  afternoon: { label: 'Afternoon', icon: Sun, className: 'text-orange-500' },
  evening: { label: 'Evening', icon: Moon, className: 'text-indigo-500' },
};

const TIME_PERIOD_ORDER: TimePeriod[] = ['all-day', 'morning', 'afternoon', 'evening'];

export default function DayView({
  currentDate,
  direction,
  todosByDate,
  onDateClick,
  onTaskClick,
  onQuickComplete,
  onToggleWaiting,
  onQuickAdd,
}: DayViewProps) {
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const dayTodos = useMemo(() => todosByDate.get(dateKey) || [], [todosByDate, dateKey]);
  const today = isToday(currentDate);
  const isPastDay = !today && isPast(startOfDay(currentDate));

  // Inline quick-add state
  const [quickAddText, setQuickAddText] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Reset quick-add state when navigating to a different date
  const prevDateKey = useRef(dateKey);
  useEffect(() => {
    if (prevDateKey.current !== dateKey) {
      setQuickAddText('');
      setShowQuickAdd(false);
      prevDateKey.current = dateKey;
    }
  }, [dateKey]);

  // Current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());
  const timeIndicatorRef = useRef<HTMLDivElement>(null);

  // Update current time every minute for the time indicator
  useEffect(() => {
    if (!today) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [today]);

  // Scroll current time indicator into view on mount or when tasks load
  useEffect(() => {
    if (today && timeIndicatorRef.current && dayTodos.length > 0) {
      requestAnimationFrame(() => {
        timeIndicatorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
  }, [today, dayTodos.length]);

  const handleQuickAddSubmit = useCallback(() => {
    const trimmed = quickAddText.trim();
    if (trimmed && onQuickAdd) {
      onQuickAdd(dateKey, trimmed);
      setQuickAddText('');
      setShowQuickAdd(false);
    }
  }, [quickAddText, onQuickAdd, dateKey]);

  // Group tasks by time period and sort by time within each group
  const groupedTodos = useMemo(() => {
    const groups: Record<TimePeriod, Todo[]> = {
      'all-day': [],
      morning: [],
      afternoon: [],
      evening: [],
    };

    dayTodos.forEach((todo) => {
      const period = getTimePeriod(todo.due_date);
      groups[period].push(todo);
    });

    // Sort each group: tasks with times sort by time
    Object.values(groups).forEach((arr) => {
      arr.sort((a, b) => {
        const hourA = extractHour(a.due_date);
        const hourB = extractHour(b.due_date);
        if (hourA !== null && hourB !== null) {
          return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
        }
        return 0;
      });
    });

    return groups;
  }, [dayTodos]);

  // Check if we have tasks in multiple periods (to decide whether to show headers)
  const activePeriods = TIME_PERIOD_ORDER.filter((p) => groupedTodos[p].length > 0);
  const showPeriodHeaders = activePeriods.length > 1 || (activePeriods.length === 1 && activePeriods[0] !== 'all-day');

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={dateKey}
          custom={direction}
          variants={dayVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {/* Day Header */}
          <div className="flex items-center gap-3 mb-4">
            {today && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                Today
              </span>
            )}
            {isPastDay && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--surface)] text-[var(--text-muted)]">
                Past
              </span>
            )}
            <span className="text-sm text-[var(--text-muted)]">
              {dayTodos.length} {dayTodos.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {/* Current Time Indicator (today only) */}
          {today && dayTodos.length > 0 && (
            <div ref={timeIndicatorRef} className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <div className="flex-1 h-px bg-[var(--accent)]/50" />
              <span className="text-xs font-medium text-[var(--accent)]">
                {format(currentTime, 'h:mm a')}
              </span>
            </div>
          )}

          {/* Task Cards - grouped by time period */}
          {dayTodos.length > 0 ? (
            <div className="space-y-4">
              {TIME_PERIOD_ORDER.map((period) => {
                const periodTodos = groupedTodos[period];
                if (periodTodos.length === 0) return null;
                const config = TIME_PERIOD_CONFIG[period];
                const PeriodIcon = config.icon;

                return (
                  <div key={period}>
                    {/* Period Header */}
                    {showPeriodHeaders && (
                      <div className="flex items-center gap-2 mb-2">
                        <PeriodIcon className={`w-4 h-4 ${config.className}`} />
                        <span className={`text-xs font-semibold uppercase tracking-wide ${config.className}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          ({periodTodos.length})
                        </span>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                      </div>
                    )}

                    {/* Tasks in this period */}
                    <div className="space-y-3" role="list" aria-label="Tasks">
                      {periodTodos.map((todo) => {
                        const category = todo.category || 'other';
                        const priority = todo.priority || 'medium';
                        const priorityBadge = PRIORITY_BADGES[priority];
                        const isOverdue = !todo.completed && isTaskOverdue(todo.due_date);
                        const subtaskProgress = getSubtaskProgress(todo.subtasks);
                        const isWaitingOverdue = isFollowUpOverdue(todo.waiting_since, todo.follow_up_after_hours);
                        const timeLabel = formatTime(todo.due_date);

                        const statusClass = isOverdue
                          ? 'border-l-2 border-l-red-500'
                          : STATUS_BORDER[todo.status] || '';

                        return (
                          <div key={todo.id} className={`relative rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] transition-all group ${statusClass}`}>
                            <button
                              onClick={() => onTaskClick(todo)}
                              className="w-full text-left p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-1 self-stretch rounded-full ${CATEGORY_COLORS[category]}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
                                      {todo.customer_name || todo.text}
                                    </h3>
                                    {priorityBadge && (
                                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${priorityBadge.className}`}>
                                        {priorityBadge.label}
                                      </span>
                                    )}
                                    {isOverdue && (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        Overdue
                                      </span>
                                    )}
                                    {todo.status === 'in_progress' && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-500/10 text-blue-500">
                                        In Progress
                                      </span>
                                    )}
                                    {todo.recurrence && (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[var(--surface)] text-[var(--text-muted)]" title={`Repeats ${todo.recurrence}`}>
                                        <Repeat className="w-3 h-3" />
                                        {todo.recurrence.charAt(0).toUpperCase() + todo.recurrence.slice(1)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Details Row with time display */}
                                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                    {timeLabel && (
                                      <span className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                                        <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                                        {timeLabel}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[category]}`} />
                                      {CATEGORY_LABELS[category]}
                                    </span>
                                    {todo.assigned_to && (
                                      <span className="flex items-center gap-1">
                                        <span className="w-4 h-4 rounded-full bg-[var(--surface)] flex items-center justify-center text-[9px] font-bold">
                                          {getInitials(todo.assigned_to)}
                                        </span>
                                        {todo.assigned_to}
                                      </span>
                                    )}
                                    {subtaskProgress && (
                                      <span>{subtaskProgress}</span>
                                    )}
                                  </div>

                                  {/* Indicators Row */}
                                  {(todo.waiting_for_response || todo.renewal_status === 'at-risk' || (todo.customer_segment === 'elite' || todo.customer_segment === 'premium') || hasPendingReminders(todo.reminders, todo.reminder_at) || (todo.premium_amount != null && todo.premium_amount >= PREMIUM_DISPLAY_THRESHOLD)) && (
                                    <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                                      {todo.waiting_for_response && (
                                        <span className={`flex items-center gap-1 ${isWaitingOverdue ? 'text-red-500' : 'text-amber-500'}`}>
                                          <Clock className="w-3.5 h-3.5" />
                                          {isWaitingOverdue ? 'Follow-up overdue' : 'Waiting'}
                                        </span>
                                      )}
                                      {todo.renewal_status === 'at-risk' && (
                                        <span className="flex items-center gap-1 text-amber-500">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                          At-risk
                                        </span>
                                      )}
                                      {(todo.customer_segment === 'elite' || todo.customer_segment === 'premium') && (
                                        <span className="flex items-center gap-1">
                                          <span className={`w-2 h-2 rounded-full ${SEGMENT_COLORS[todo.customer_segment]}`} />
                                          <span className="text-[var(--text-muted)]">{SEGMENT_LABELS[todo.customer_segment]}</span>
                                        </span>
                                      )}
                                      {hasPendingReminders(todo.reminders, todo.reminder_at) && (
                                        <span className="flex items-center gap-1 text-[var(--text-muted)]">
                                          <Bell className="w-3.5 h-3.5" />
                                          Reminder
                                        </span>
                                      )}
                                      {todo.premium_amount != null && todo.premium_amount >= PREMIUM_DISPLAY_THRESHOLD && (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                          {formatPremiumCompact(todo.premium_amount)}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {todo.notes && (
                                    <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2">
                                      {todo.notes}
                                    </p>
                                  )}
                                </div>

                                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                              </div>
                            </button>

                            {(onQuickComplete || onToggleWaiting) && (
                              <div className="absolute top-2 right-8 flex items-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                                {onQuickComplete && !todo.completed && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onQuickComplete(todo.id); }}
                                    data-testid={`dayview-complete-${todo.id}`}
                                    className="p-1 rounded hover:bg-green-500/20 text-[var(--text-muted)] hover:text-green-500 transition-colors"
                                    title="Mark complete"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                {onToggleWaiting && !todo.completed && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onToggleWaiting(todo.id, !todo.waiting_for_response); }}
                                    data-testid={`dayview-waiting-${todo.id}`}
                                    className={`p-1 rounded transition-colors ${todo.waiting_for_response ? 'text-amber-500 hover:bg-amber-500/20' : 'text-[var(--text-muted)] hover:bg-amber-500/20 hover:text-amber-500'}`}
                                    title={todo.waiting_for_response ? 'Stop waiting' : 'Mark waiting'}
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              {isPastDay ? (
                <p className="text-[var(--text-muted)]">
                  No tasks were scheduled for {format(currentDate, 'EEEE, MMMM d')}
                </p>
              ) : (
                <>
                  <p className="text-[var(--text-muted)] mb-4">
                    No tasks for {format(currentDate, 'EEEE, MMMM d')}
                  </p>
                  <button
                    onClick={() => onDateClick(currentDate)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 transition-colors"
                  >
                    + Create Task
                  </button>
                </>
              )}
            </div>
          )}

          {/* Inline Quick Add */}
          {onQuickAdd && (
            <div className="mt-4">
              {showQuickAdd ? (
                <input
                  autoFocus
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickAddSubmit();
                    if (e.key === 'Escape') { setShowQuickAdd(false); setQuickAddText(''); }
                  }}
                  onBlur={() => { if (!quickAddText.trim()) { setShowQuickAdd(false); setQuickAddText(''); } }}
                  placeholder="Task name — press Enter to add"
                  aria-label={`Quick add task for ${format(currentDate, 'MMMM d')}`}
                  data-testid="dayview-quickadd-input"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
              ) : (
                <button
                  onClick={() => setShowQuickAdd(true)}
                  data-testid="dayview-quickadd-btn"
                  className="w-full px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg border border-dashed border-[var(--border)] transition-colors"
                >
                  + Quick add task
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
