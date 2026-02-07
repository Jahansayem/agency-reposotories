/**
 * MetadataSection Component
 *
 * Extracted from TodoItem.tsx (Phase 3 Refactoring)
 * Handles task metadata fields in the expanded view:
 * - Status
 * - Priority
 * - Due date (with overdue warning)
 * - Assigned to
 * - Recurrence
 * - Reminder
 * - Waiting for customer response
 *
 * Reduces TodoItem.tsx complexity by ~100 lines.
 */

'use client';

import { AlertTriangle } from 'lucide-react';
import type { Todo, TodoPriority, TodoStatus, RecurrencePattern, WaitingContactType } from '@/types/todo';
import ReminderPicker from '../ReminderPicker';
import { WaitingStatusBadge } from '../WaitingStatusBadge';

interface MetadataSectionProps {
  todo: Todo;
  users: string[];
  dueDateStatus: 'normal' | 'today' | 'overdue' | 'upcoming';
  onStatusChange?: (id: string, status: TodoStatus) => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onSetRecurrence?: (id: string, recurrence: RecurrencePattern) => void;
  onSetReminder?: (id: string, reminderAt: string | null) => void;
  onMarkWaiting?: (id: string, contactType: WaitingContactType, followUpHours: number) => Promise<void>;
  onClearWaiting?: (id: string) => Promise<void>;
  canAssignTasks: boolean;
  className?: string;
}

export function MetadataSection({
  todo,
  users,
  dueDateStatus,
  onStatusChange,
  onSetPriority,
  onSetDueDate,
  onAssign,
  onSetRecurrence,
  onSetReminder,
  onMarkWaiting,
  onClearWaiting,
  canAssignTasks,
  className = '',
}: MetadataSectionProps) {
  return (
    <div className={className}>
      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Status */}
        {onStatusChange && (
          <div>
            <label className="text-label text-[var(--text-muted)] mb-1 block">Status</label>
            <select
              value={todo.status || 'todo'}
              onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
              className="input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)]"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}

        {/* Priority */}
        <div>
          <label className="text-label text-[var(--text-muted)] mb-1 block">Priority</label>
          <select
            value={todo.priority || 'medium'}
            onChange={(e) => onSetPriority(todo.id, e.target.value as TodoPriority)}
            className="input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Due date with overdue warning */}
        <div>
          <label className="text-label text-[var(--text-muted)] mb-1 block flex items-center gap-1.5">
            Due Date
            {dueDateStatus === 'overdue' && !todo.completed && (
              <span className="inline-flex items-center gap-0.5 text-red-500">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                <span className="text-badge normal-case">Overdue</span>
              </span>
            )}
          </label>
          <input
            type="date"
            value={todo.due_date ? todo.due_date.split('T')[0] : ''}
            onChange={(e) => onSetDueDate(todo.id, e.target.value || null)}
            className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${
              dueDateStatus === 'overdue' && !todo.completed ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''
            }`}
          />
        </div>

        {/* Assigned to */}
        <div>
          <label className="text-label text-[var(--text-muted)] mb-1 block">Assigned To</label>
          <select
            value={todo.assigned_to || ''}
            onChange={(e) => onAssign(todo.id, e.target.value || null)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            disabled={!canAssignTasks}
            className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${
              !canAssignTasks ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>

        {/* Recurrence */}
        {onSetRecurrence && (
          <div>
            <label className="text-label text-[var(--text-muted)] mb-1 block">Repeat</label>
            <select
              value={todo.recurrence || ''}
              onChange={(e) => onSetRecurrence(todo.id, (e.target.value || null) as RecurrencePattern)}
              className="input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)]"
            >
              <option value="">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        {/* Reminder */}
        {onSetReminder && !todo.completed && (
          <div>
            <label className="text-label text-[var(--text-muted)] mb-1 block">Reminder</label>
            <ReminderPicker
              value={todo.reminder_at || undefined}
              dueDate={todo.due_date || undefined}
              onChange={(time) => onSetReminder(todo.id, time)}
              compact
            />
          </div>
        )}
      </div>

      {/* Waiting for Customer Response */}
      {onMarkWaiting && onClearWaiting && !todo.completed && (
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
          <span className="text-label text-[var(--text-muted)] shrink-0">Customer Response</span>
          <WaitingStatusBadge
            todo={todo}
            onMarkWaiting={(contactType, followUpHours) => onMarkWaiting(todo.id, contactType, followUpHours ?? 24)}
            onClearWaiting={() => onClearWaiting(todo.id)}
          />
        </div>
      )}
    </div>
  );
}
