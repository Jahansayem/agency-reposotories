'use client';

import { useState, useRef } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { TodoPriority } from '@/types/todo';

export interface QuickInlineActionsProps {
  todoId: string;
  dueDate?: string | null;
  assignedTo?: string | null;
  priority: string;
  users: string[];
  canEdit: boolean;
  canAssignTasks: boolean;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
}

export default function QuickInlineActions({
  todoId,
  dueDate,
  assignedTo,
  priority,
  users,
  canEdit,
  canAssignTasks,
  onSetDueDate,
  onAssign,
  onSetPriority,
}: QuickInlineActionsProps) {
  const [savingDate, setSavingDate] = useState(false);
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [savedField, setSavedField] = useState<'date' | 'assignee' | 'priority' | null>(null);
  const savedFieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div
      className="hidden sm:flex items-center gap-2 mt-2 pl-0 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Due date with loading/success feedback */}
      <div className="relative inline-flex items-center">
        <input
          type="date"
          value={dueDate ? dueDate.split('T')[0] : ''}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onChange={async (e) => {
            setSavingDate(true);
            await onSetDueDate(todoId, e.target.value || null);
            setSavingDate(false);
            setSavedField('date');
            if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
            savedFieldTimerRef.current = setTimeout(() => setSavedField(null), 1500);
          }}
          disabled={savingDate || !canEdit}
          className={`text-xs px-2 py-1 rounded-[var(--radius-sm)] border bg-[var(--surface)] text-[var(--foreground)] outline-none transition-all ${
            !canEdit
              ? 'opacity-60 cursor-not-allowed'
              : savingDate
                ? 'border-[var(--accent)] opacity-70 cursor-wait'
                : savedField === 'date'
                  ? 'border-[var(--success)]'
                  : 'border-[var(--border)] hover:border-[var(--accent)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]'
          }`}
          aria-label="Set due date"
        />
        {savingDate && (
          <Loader2 className="absolute right-1 w-3 h-3 text-[var(--accent)] animate-spin" aria-hidden="true" />
        )}
        {savedField === 'date' && !savingDate && (
          <CheckCircle2 className="absolute right-1 w-3 h-3 text-[var(--success)]" aria-hidden="true" />
        )}
      </div>

      {/* Assignee with loading/success feedback */}
      <div className="relative inline-flex items-center">
        <select
          value={assignedTo || ''}
          onChange={async (e) => {
            setSavingAssignee(true);
            await onAssign(todoId, e.target.value || null);
            setSavingAssignee(false);
            setSavedField('assignee');
            if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
            savedFieldTimerRef.current = setTimeout(() => setSavedField(null), 1500);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          disabled={savingAssignee || !canAssignTasks}
          className={`text-xs px-2 py-1 pr-5 rounded-[var(--radius-sm)] border bg-[var(--surface)] text-[var(--foreground)] outline-none min-w-[90px] transition-all ${
            !canAssignTasks ? 'opacity-60 cursor-not-allowed' : savingAssignee
              ? 'border-[var(--accent)] opacity-70 cursor-wait'
              : savedField === 'assignee'
                ? 'border-[var(--success)]'
                : 'border-[var(--border)] hover:border-[var(--accent)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]'
          }`}
          aria-label="Assign task to user"
        >
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
        {savingAssignee && (
          <Loader2 className="absolute right-1 w-3 h-3 text-[var(--accent)] animate-spin pointer-events-none" aria-hidden="true" />
        )}
        {savedField === 'assignee' && !savingAssignee && (
          <CheckCircle2 className="absolute right-1 w-3 h-3 text-[var(--success)] pointer-events-none" aria-hidden="true" />
        )}
      </div>

      {/* Priority with loading/success feedback */}
      <div className="relative inline-flex items-center">
        <select
          value={priority}
          onChange={async (e) => {
            setSavingPriority(true);
            await onSetPriority(todoId, e.target.value as TodoPriority);
            setSavingPriority(false);
            setSavedField('priority');
            if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
            savedFieldTimerRef.current = setTimeout(() => setSavedField(null), 1500);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          disabled={savingPriority || !canEdit}
          className={`text-xs px-2 py-1 pr-5 rounded-[var(--radius-sm)] border bg-[var(--surface)] text-[var(--foreground)] outline-none transition-all ${
            !canEdit ? 'opacity-60 cursor-not-allowed' : savingPriority
              ? 'border-[var(--accent)] opacity-70 cursor-wait'
              : savedField === 'priority'
                ? 'border-[var(--success)]'
                : 'border-[var(--border)] hover:border-[var(--accent)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]'
          }`}
          aria-label="Set task priority"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        {savingPriority && (
          <Loader2 className="absolute right-1 w-3 h-3 text-[var(--accent)] animate-spin pointer-events-none" aria-hidden="true" />
        )}
        {savedField === 'priority' && !savingPriority && (
          <CheckCircle2 className="absolute right-1 w-3 h-3 text-[var(--success)] pointer-events-none" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
