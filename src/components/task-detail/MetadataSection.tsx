'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, AlertTriangle, Circle, Timer, CheckCircle2, User, CalendarDays, Repeat } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Todo, TodoStatus, TodoPriority, RecurrencePattern } from '@/types/todo';
import { PRIORITY_CONFIG } from '@/types/todo';

interface MetadataSectionProps {
  todo: Todo;
  users: string[];
  dueDateStatus: 'none' | 'overdue' | 'today' | 'future';
  onStatusChange: (status: TodoStatus) => void;
  onPriorityChange: (priority: TodoPriority) => void;
  onDueDateChange: (date: string | null) => void;
  onAssignChange: (user: string | null) => void;
  onRecurrenceChange: (recurrence: RecurrencePattern) => void;
  onSnooze: (days: number) => void;
}

const STATUS_OPTIONS: { value: TodoStatus; label: string; icon: typeof Circle; color: string }[] = [
  { value: 'todo', label: 'To Do', icon: Circle, color: 'var(--text-muted)' },
  { value: 'in_progress', label: 'In Progress', icon: Timer, color: 'var(--accent)' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: '#16A34A' },
];

const PRIORITY_OPTIONS: { value: TodoPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const RECURRENCE_OPTIONS: { value: RecurrencePattern; label: string }[] = [
  { value: null, label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const SNOOZE_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 2 days', days: 2 },
  { label: 'Next week', days: 7 },
  { label: 'Next month', days: 30 },
];

const labelClass = 'flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1';
const selectClass = [
  'w-full rounded-lg px-2.5 py-[6px] text-sm font-medium',
  'bg-[var(--surface-2)] text-[var(--foreground)]',
  'border border-transparent',
  'hover:border-[var(--border)] hover:bg-[var(--surface)]',
  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
  'appearance-none cursor-pointer transition-all duration-150',
].join(' ');

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dueDay.getTime() === today.getTime()) return 'Today';
  if (dueDay.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export default function MetadataSection({
  todo,
  users,
  dueDateStatus,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onAssignChange,
  onRecurrenceChange,
  onSnooze,
}: MetadataSectionProps) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const snoozeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) {
        setSnoozeOpen(false);
      }
    }
    if (snoozeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [snoozeOpen]);

  const currentStatus = STATUS_OPTIONS.find(s => s.value === todo.status) || STATUS_OPTIONS[0];
  const StatusIcon = currentStatus.icon;
  const priorityColor = PRIORITY_CONFIG[todo.priority].color;

  const stagger = {
    initial: { opacity: 0, x: -6 },
    animate: { opacity: 1, x: 0 },
  };

  return (
    <div className="rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border-subtle)] p-3">
      {/* Compact 2-column grid for metadata */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {/* Status */}
        <motion.div {...stagger} transition={{ delay: 0.04 }}>
          <div className={labelClass}>
            <StatusIcon size={12} style={{ color: currentStatus.color }} />
            Status
          </div>
          <select
            value={todo.status}
            onChange={(e) => onStatusChange(e.target.value as TodoStatus)}
            className={selectClass}
            aria-label="Task status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Priority */}
        <motion.div {...stagger} transition={{ delay: 0.06 }}>
          <div className={labelClass}>
            <span
              className="w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
              style={{ borderColor: priorityColor, backgroundColor: priorityColor + '30' }}
            />
            Priority
          </div>
          <select
            value={todo.priority}
            onChange={(e) => onPriorityChange(e.target.value as TodoPriority)}
            className={selectClass}
            aria-label="Task priority"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Due Date */}
        <motion.div {...stagger} transition={{ delay: 0.08 }}>
          <div className={labelClass}>
            <CalendarDays size={12} />
            Due Date
            {dueDateStatus === 'overdue' && !todo.completed && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--danger-light)] text-[var(--danger)] ml-1">
                <AlertTriangle size={9} />
                Overdue
              </span>
            )}
            {dueDateStatus === 'today' && !todo.completed && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 ml-1">
                Today
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : ''}
              onChange={(e) => onDueDateChange(e.target.value || null)}
              className={`${selectClass} flex-1`}
              aria-label="Due date"
            />
            {/* Snooze */}
            <div className="relative" ref={snoozeRef}>
              <button
                type="button"
                onClick={() => setSnoozeOpen(!snoozeOpen)}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all duration-150"
                title="Snooze"
                aria-label="Snooze due date"
              >
                <Clock size={13} />
              </button>
              {snoozeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 z-50 min-w-[150px] rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)] py-1.5 overflow-hidden"
                >
                  {SNOOZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => {
                        onSnooze(opt.days);
                        setSnoozeOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors duration-100"
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Assigned To */}
        <motion.div {...stagger} transition={{ delay: 0.1 }}>
          <div className={labelClass}>
            <User size={12} />
            Assigned To
          </div>
          <select
            value={todo.assigned_to || ''}
            onChange={(e) => onAssignChange(e.target.value || null)}
            className={selectClass}
            aria-label="Assigned to"
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Recurrence - spans full width */}
        <motion.div className="col-span-2" {...stagger} transition={{ delay: 0.12 }}>
          <div className={labelClass}>
            <Repeat size={12} />
            Repeat
          </div>
          <select
            value={todo.recurrence || ''}
            onChange={(e) =>
              onRecurrenceChange((e.target.value || null) as RecurrencePattern)
            }
            className={`${selectClass} max-w-[50%]`}
            aria-label="Recurrence"
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value || ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </motion.div>
      </div>
    </div>
  );
}
