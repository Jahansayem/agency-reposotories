/**
 * TaskCardMetadata
 *
 * Single-line metadata display (due date • assignee • priority)
 * Implements explicit semantics - never force inference
 */

'use client';

import { formatDueDate, getTaskStatusStyle, TYPOGRAPHY } from '@/lib/design-tokens';
import { Todo, TodoPriority } from '@/types/todo';
import { useMemo } from 'react';

interface TaskCardMetadataProps {
  todo: Todo;
  density?: 'compact' | 'comfortable';
}

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TaskCardMetadata({ todo, density = 'comfortable' }: TaskCardMetadataProps) {
  const statusStyle = useMemo(
    () => getTaskStatusStyle(todo.due_date ?? null, todo.completed),
    [todo.due_date, todo.completed]
  );

  const parts = useMemo(() => {
    const items: React.ReactNode[] = [];

    // Due date with explicit semantics
    if (todo.due_date) {
      const formattedDate = formatDueDate(todo.due_date, todo.completed);
      items.push(
        <span
          key="due"
          className="font-medium"
          style={{ color: statusStyle.dueDateColor }}
          aria-label={`Due date: ${formattedDate}`}
        >
          {formattedDate}
        </span>
      );
    } else if (!todo.completed) {
      items.push(
        <span key="no-due" className="text-[var(--text-muted)]" aria-label="No due date set">
          No due date
        </span>
      );
    }

    // Assignee
    if (todo.assigned_to) {
      items.push(
        <span key="assignee" className="text-[var(--text-secondary)]" aria-label={`Assigned to: ${todo.assigned_to}`}>
          {todo.assigned_to}
        </span>
      );
    }

    // Priority (only show if not medium to reduce noise)
    if (todo.priority && todo.priority !== 'medium') {
      const priorityColor =
        todo.priority === 'urgent'
          ? 'var(--danger)'
          : todo.priority === 'high'
            ? 'var(--warning)'
            : 'var(--text-muted)';

      items.push(
        <span key="priority" style={{ color: priorityColor }} aria-label={`Priority: ${PRIORITY_LABELS[todo.priority]}`}>
          {PRIORITY_LABELS[todo.priority]}
        </span>
      );
    }

    return items;
  }, [todo, statusStyle]);

  if (parts.length === 0) return null;

  const fontSize = density === 'compact' ? TYPOGRAPHY.caption.size : TYPOGRAPHY.metadata.size;

  return (
    <div
      className="flex items-center flex-wrap"
      style={{
        fontSize,
        lineHeight: TYPOGRAPHY.metadata.lineHeight,
        gap: '8px',
      }}
      role="group"
      aria-label="Task metadata"
    >
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span style={{ color: 'var(--border)', margin: '0 4px' }} aria-hidden="true">•</span>}
          {part}
        </span>
      ))}
    </div>
  );
}
