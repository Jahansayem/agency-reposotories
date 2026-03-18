'use client';

import { useMemo } from 'react';
import {
  Inbox,
  AlertTriangle,
  CalendarClock,
  PhoneForwarded,
  Flag,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  User,
} from 'lucide-react';
import { useTodoStore } from '@/store/todoStore';
import { Todo, TodoPriority, Subtask, PRIORITY_CONFIG, isFollowUpOverdue, formatWaitingDuration } from '@/types/todo';

// ═══════════════════════════════════════════════════════════════════════════
// AI INBOX VIEW
// Smart task dashboard: surfaces overdue tasks, upcoming deadlines,
// and follow-up reminders from the todo store.
// ═══════════════════════════════════════════════════════════════════════════

// Keep exported types for backward compatibility with MainApp
export interface AIInboxItem {
  id: string;
  type: 'email' | 'voicemail' | 'document' | 'duplicate';
  source: {
    label: string;
    preview: string;
    receivedAt: string;
    from?: string;
  };
  proposedTask: {
    text: string;
    priority: TodoPriority;
    dueDate?: string;
    assignedTo?: string;
    subtasks?: Subtask[];
    notes?: string;
  };
  confidence: number;
  status: 'pending' | 'accepted' | 'dismissed';
  createdAt: string;
}

interface AIInboxProps {
  items: AIInboxItem[];
  users: string[];
  onAccept: (item: AIInboxItem, editedTask?: Partial<AIInboxItem['proposedTask']>) => Promise<void>;
  onDismiss: (itemId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Parse a date string to local date parts, ignoring timezone */
function parseDateLocal(dateStr: string): Date | null {
  const part = dateStr.split('T')[0];
  const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

/** Check if a todo is overdue */
function isOverdue(todo: Todo): boolean {
  if (!todo.due_date || todo.completed || todo.status === 'done') return false;
  const d = parseDateLocal(todo.due_date);
  if (!d) return false;
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() < Date.now();
}

/** Check if a todo is due within the next N days (exclusive of overdue) */
function isDueWithinDays(todo: Todo, days: number): boolean {
  if (!todo.due_date || todo.completed || todo.status === 'done') return false;
  const d = parseDateLocal(todo.due_date);
  if (!d) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const futureEnd = new Date(todayStart);
  futureEnd.setDate(futureEnd.getDate() + days);
  futureEnd.setHours(23, 59, 59, 999);
  // Must be today or in the future (not overdue), and within range
  return d.getTime() >= todayStart.getTime() && d.getTime() <= futureEnd.getTime();
}

/** Format a due date for display */
function formatDueDate(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  if (!d) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** How many days overdue */
function daysOverdue(dateStr: string): number {
  const d = parseDateLocal(dateStr);
  if (!d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const PRIORITY_ORDER: Record<TodoPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AIInbox({
  items: _items,
  users: _users,
  onAccept: _onAccept,
  onDismiss: _onDismiss,
  onRefresh: _onRefresh,
  isLoading: _isLoading,
}: AIInboxProps) {
  const todos = useTodoStore((state) => state.todos);

  // --- Overdue tasks (Smart Suggestions) ---
  const overdueTasks = useMemo(() => {
    return todos
      .filter((t) => isOverdue(t))
      .sort((a, b) => {
        // Sort by priority first, then by how overdue
        const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pDiff !== 0) return pDiff;
        return daysOverdue(b.due_date!) - daysOverdue(a.due_date!);
      })
      .slice(0, 8);
  }, [todos]);

  // --- Upcoming deadlines (next 3 days) ---
  const upcomingTasks = useMemo(() => {
    return todos
      .filter((t) => isDueWithinDays(t, 3))
      .sort((a, b) => {
        // Sort by date, then priority
        const aDate = parseDateLocal(a.due_date!)?.getTime() || 0;
        const bDate = parseDateLocal(b.due_date!)?.getTime() || 0;
        if (aDate !== bDate) return aDate - bDate;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      })
      .slice(0, 8);
  }, [todos]);

  // --- Follow-up reminders (waiting for response) ---
  const followUpTasks = useMemo(() => {
    return todos
      .filter((t) => t.waiting_for_response && !t.completed && t.status !== 'done')
      .sort((a, b) => {
        // Overdue follow-ups first, then by waiting duration
        const aOverdue = isFollowUpOverdue(a) ? 0 : 1;
        const bOverdue = isFollowUpOverdue(b) ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        // Longer waiting first
        const aTime = a.waiting_since ? new Date(a.waiting_since).getTime() : Infinity;
        const bTime = b.waiting_since ? new Date(b.waiting_since).getTime() : Infinity;
        return aTime - bTime;
      })
      .slice(0, 8);
  }, [todos]);

  const totalItems = overdueTasks.length + upcomingTasks.length + followUpTasks.length;

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)]">
            <Inbox className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              AI Inbox
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {totalItems > 0
                ? `${totalItems} item${totalItems !== 1 ? 's' : ''} need your attention`
                : 'No action items right now'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-xs font-medium text-[var(--text-muted)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          Smart suggestions
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {totalItems === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Smart Task Suggestions (Overdue) */}
            {overdueTasks.length > 0 && (
              <SectionCard
                icon={<AlertTriangle className="w-5 h-5" />}
                iconBg="bg-red-500/15"
                iconColor="text-red-500"
                title="Smart Task Suggestions"
                subtitle={`${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} need action`}
                badge={overdueTasks.length}
                badgeColor="bg-red-500/15 text-red-500"
              >
                <div className="divide-y divide-[var(--border)]">
                  {overdueTasks.map((todo) => (
                    <OverdueTaskRow key={todo.id} todo={todo} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Upcoming Deadlines */}
            {upcomingTasks.length > 0 && (
              <SectionCard
                icon={<CalendarClock className="w-5 h-5" />}
                iconBg="bg-amber-500/15"
                iconColor="text-amber-500"
                title="Upcoming Deadlines"
                subtitle={`${upcomingTasks.length} task${upcomingTasks.length !== 1 ? 's' : ''} due in the next 3 days`}
                badge={upcomingTasks.length}
                badgeColor="bg-amber-500/15 text-amber-500"
              >
                <div className="divide-y divide-[var(--border)]">
                  {upcomingTasks.map((todo) => (
                    <UpcomingTaskRow key={todo.id} todo={todo} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Follow-up Reminders */}
            {followUpTasks.length > 0 && (
              <SectionCard
                icon={<PhoneForwarded className="w-5 h-5" />}
                iconBg="bg-blue-500/15"
                iconColor="text-blue-500"
                title="Follow-up Reminders"
                subtitle={`${followUpTasks.length} task${followUpTasks.length !== 1 ? 's' : ''} waiting for a response`}
                badge={followUpTasks.length}
                badgeColor="bg-blue-500/15 text-blue-500"
              >
                <div className="divide-y divide-[var(--border)]">
                  {followUpTasks.map((todo) => (
                    <FollowUpTaskRow key={todo.id} todo={todo} />
                  ))}
                </div>
              </SectionCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION CARD
// ═══════════════════════════════════════════════════════════════════════════

interface SectionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge: number;
  badgeColor: string;
  children: React.ReactNode;
}

function SectionCard({ icon, iconBg, iconColor, title, subtitle, badge, badgeColor, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
          {badge}
        </span>
      </div>
      {/* Card Body */}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK ROW COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function PriorityBadge({ priority }: { priority: TodoPriority }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      <Flag className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function AssigneeBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--text-muted)] flex-shrink-0">
      <User className="w-3 h-3" />
      {name}
    </span>
  );
}

function OverdueTaskRow({ todo }: { todo: Todo }) {
  const days = todo.due_date ? daysOverdue(todo.due_date) : 0;
  return (
    <div className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
      <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{todo.text}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-xs font-medium text-red-500">
            {days === 0 ? 'Due today' : days === 1 ? '1 day overdue' : `${days} days overdue`}
          </span>
          <PriorityBadge priority={todo.priority} />
          {todo.assigned_to && <AssigneeBadge name={todo.assigned_to} />}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
    </div>
  );
}

function UpcomingTaskRow({ todo }: { todo: Todo }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Clock className="w-3.5 h-3.5 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{todo.text}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {todo.due_date && (
            <span className="text-xs font-medium text-amber-500">
              {formatDueDate(todo.due_date)}
            </span>
          )}
          <PriorityBadge priority={todo.priority} />
          {todo.assigned_to && <AssigneeBadge name={todo.assigned_to} />}
        </div>
      </div>
    </div>
  );
}

function FollowUpTaskRow({ todo }: { todo: Todo }) {
  const overdue = isFollowUpOverdue(todo);
  const waitingDuration = todo.waiting_since ? formatWaitingDuration(todo.waiting_since) : null;

  return (
    <div className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${overdue ? 'bg-red-500/15' : 'bg-blue-500/15'}`}>
        <PhoneForwarded className={`w-3.5 h-3.5 ${overdue ? 'text-red-500' : 'text-blue-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{todo.text}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {overdue ? (
            <span className="text-xs font-medium text-red-500">
              Follow-up overdue
            </span>
          ) : (
            <span className="text-xs font-medium text-blue-500">
              Waiting for response
            </span>
          )}
          {waitingDuration && (
            <span className="text-xs text-[var(--text-muted)]">
              ({waitingDuration})
            </span>
          )}
          <PriorityBadge priority={todo.priority} />
          {todo.assigned_to && <AssigneeBadge name={todo.assigned_to} />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-[var(--accent)]/10 border border-[var(--accent)]/20">
        <CheckCircle2 className="w-8 h-8 text-[var(--accent)]" />
      </div>
      <h2 className="text-lg font-semibold mb-2 text-[var(--foreground)]">
        You&apos;re all caught up!
      </h2>
      <p className="text-sm text-center max-w-sm text-[var(--text-muted)]">
        No overdue tasks, upcoming deadlines, or pending follow-ups.
        Check back later for smart suggestions.
      </p>
    </div>
  );
}
