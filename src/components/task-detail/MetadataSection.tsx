'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import type { Todo, TodoStatus, TodoPriority, RecurrencePattern } from '@/types/todo';

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

const STATUS_OPTIONS: { value: TodoStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
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
  { label: 'In 2 Days', days: 2 },
  { label: 'Next Week', days: 7 },
  { label: 'Next Month', days: 30 },
];

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

  const isOverdueAndIncomplete = dueDateStatus === 'overdue' && !todo.completed;

  const selectStyles = [
    'w-full rounded-md px-2.5 py-1.5 text-sm',
    'bg-[var(--surface)] text-[var(--foreground)]',
    'border border-[var(--border)]',
    'focus:outline-none focus:ring-1 focus:ring-[var(--accent)]',
    'appearance-none cursor-pointer',
  ].join(' ');

  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {/* Status */}
      <div className="flex items-center py-2.5 border-b border-[var(--border-subtle)]">
        <span className="text-sm text-[var(--text-muted)] w-28 flex-shrink-0">Status</span>
        <div className="flex-1">
          <select
            value={todo.status}
            onChange={(e) => onStatusChange(e.target.value as TodoStatus)}
            className={selectStyles}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Priority */}
      <div className="flex items-center py-2.5 border-b border-[var(--border-subtle)]">
        <span className="text-sm text-[var(--text-muted)] w-28 flex-shrink-0">Priority</span>
        <div className="flex-1">
          <select
            value={todo.priority}
            onChange={(e) => onPriorityChange(e.target.value as TodoPriority)}
            className={selectStyles}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Due Date */}
      <div className="flex items-center py-2.5 border-b border-[var(--border-subtle)]">
        <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
          <span className="text-sm text-[var(--text-muted)]">Due Date</span>
          {isOverdueAndIncomplete && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[var(--danger)] text-white">
              <AlertTriangle className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="date"
            value={todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : ''}
            onChange={(e) => onDueDateChange(e.target.value || null)}
            className={selectStyles}
          />
          <div className="relative" ref={snoozeRef}>
            <button
              type="button"
              onClick={() => setSnoozeOpen((prev) => !prev)}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
              title="Snooze due date"
              aria-label="Snooze due date"
            >
              <Clock className="w-4 h-4" />
            </button>
            {snoozeOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1">
                {SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => {
                      onSnooze(opt.days);
                      setSnoozeOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--border-subtle)] transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assigned To */}
      <div className="flex items-center py-2.5 border-b border-[var(--border-subtle)]">
        <span className="text-sm text-[var(--text-muted)] w-28 flex-shrink-0">Assigned To</span>
        <div className="flex-1">
          <select
            value={todo.assigned_to || ''}
            onChange={(e) => onAssignChange(e.target.value || null)}
            className={selectStyles}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recurrence */}
      <div className="flex items-center py-2.5 border-b border-[var(--border-subtle)]">
        <span className="text-sm text-[var(--text-muted)] w-28 flex-shrink-0">Repeat</span>
        <div className="flex-1">
          <select
            value={todo.recurrence || ''}
            onChange={(e) =>
              onRecurrenceChange((e.target.value || null) as RecurrencePattern)
            }
            className={selectStyles}
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value || ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
