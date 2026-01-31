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
        >
          {formattedDate}
        </span>
      );
    } else if (!todo.completed) {
      items.push(
        <span key="no-due" className="text-[var(--text-muted)]">
          No due date
        </span>
      );
    }

    // Assignee
    if (todo.assigned_to) {
      items.push(
        <span key="assignee" className="text-[var(--text-secondary)]">
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
        <span key="priority" style={{ color: priorityColor }}>
          {PRIORITY_LABELS[todo.priority]}
        </span>
      );
    }

    return items;
  }, [todo, statusStyle]);

  if (parts.length === 0) return null;

  const fontSize = density === 'compact' ? '12px' : TYPOGRAPHY.metadata.size;

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{
        fontSize,
        lineHeight: TYPOGRAPHY.metadata.lineHeight,
      }}
    >
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span className="text-[var(--border)] mx-1">•</span>}
          {part}
        </span>
      ))}
    </div>
  );
}
