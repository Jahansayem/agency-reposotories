/**
 * TaskCard - Unified Task Presentation Component
 *
 * Single source of truth for rendering tasks across all views
 * Implements:
 * - Progressive disclosure (secondary metadata on hover)
 * - Status strip for overdue/due soon
 * - Explicit semantics (never force inference)
 * - Consistent design tokens
 *
 * Variants:
 * - list: Standard task list row
 * - board: Kanban card
 * - archive: Archived task (lower emphasis)
 */

'use client';

import { Todo } from '@/types/todo';
import { TaskCardHeader } from './TaskCardHeader';
import { TaskCardMetadata } from './TaskCardMetadata';
import { TaskCardSecondary } from './TaskCardSecondary';
import { TaskCardStatusStrip } from './TaskCardStatusStrip';
import { getTaskStatusStyle, getElevation, getRadius, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/design-tokens';
import { useMemo, useState } from 'react';

export interface TaskCardProps {
  todo: Todo;
  variant?: 'list' | 'board' | 'archive';
  density?: 'compact' | 'comfortable';
  interactive?: boolean;
  selected?: boolean;
  dragging?: boolean;
  onToggleComplete?: (id: string) => void;
  onClick?: () => void;
  onChatClick?: () => void;
  className?: string;
}

export function TaskCard({
  todo,
  variant = 'list',
  density = 'comfortable',
  interactive = true,
  selected = false,
  dragging = false,
  onToggleComplete,
  onClick,
  onChatClick,
  className = '',
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusStyle = useMemo(
    () => getTaskStatusStyle(todo.due_date ?? null, todo.completed),
    [todo.due_date, todo.completed]
  );

  // Variant-specific styling
  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'board':
        return {
          elevation: dragging ? getElevation(3) : getElevation(1),
          radius: getRadius('lg'),
          border: '1px solid var(--border-subtle)',
          bg: 'var(--surface)',
        };
      case 'archive':
        return {
          elevation: getElevation(0),
          radius: getRadius('md'),
          border: '1px solid var(--border-subtle)',
          bg: 'var(--surface)',
          opacity: 0.8,
        };
      case 'list':
      default:
        return {
          elevation: getElevation(0),
          radius: getRadius('lg'),
          border: '1px solid var(--border-subtle)',
          bg: 'var(--surface)',
        };
    }
  }, [variant, dragging]);

  const showSecondaryMetadata = isHovered || variant === 'board';

  // Responsive padding classes based on variant and density
  const getPaddingClasses = () => {
    if (variant === 'archive') {
      return density === 'compact' ? 'p-2 sm:p-3' : 'p-3 sm:p-4';
    }
    if (variant === 'board') {
      return density === 'compact' ? 'p-3 sm:p-4' : 'p-4 sm:p-5';
    }
    // list variant
    return density === 'compact' ? 'p-3 sm:p-4' : 'p-4 sm:p-5';
  };

  return (
    <div
      className={`
        relative group
        transition-all duration-200
        ${getPaddingClasses()}
        ${interactive ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}
        ${selected ? 'ring-2 ring-[var(--accent)] ring-offset-2' : ''}
        ${dragging ? 'opacity-50 rotate-2' : ''}
        ${className}
      `}
      style={{
        borderRadius: variantStyles.radius,
        border: variantStyles.border,
        backgroundColor: variantStyles.bg,
        boxShadow: variantStyles.elevation,
        opacity: variantStyles.opacity,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-task-id={todo.id}
      data-variant={variant}
    >
      {/* Status strip (overdue/due soon indicator) */}
      <TaskCardStatusStrip stripColor={statusStyle.strip} />

      {/* Header: Checkbox + Title */}
      <TaskCardHeader
        todo={todo}
        variant={variant}
        density={density}
        onToggleComplete={onToggleComplete}
        onTitleClick={onClick}
      />

      {/* Metadata row: Due date • Assignee • Priority */}
      <div style={{ marginTop: SPACING.sm }}>
        <TaskCardMetadata todo={todo} density={density} />
      </div>

      {/* Secondary metadata: Notes, voicemail, attachments, chat */}
      {variant !== 'archive' && (
        <div style={{ marginTop: SPACING.sm }}>
          <TaskCardSecondary
            todo={todo}
            isVisible={showSecondaryMetadata}
            onChatClick={onChatClick}
          />
        </div>
      )}

      {/* Subtask progress indicator (compact) */}
      {Array.isArray(todo.subtasks) && todo.subtasks.length > 0 && (
        <div className="flex items-center" style={{ marginTop: SPACING.sm, gap: SPACING.sm }}>
          <div
            className="flex-1 overflow-hidden"
            style={{
              height: '4px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: RADIUS.full,
            }}
          >
            <div
              className="h-full transition-all"
              style={{
                backgroundColor: 'var(--success)',
                width: `${(todo.subtasks.filter((s) => s.completed).length / todo.subtasks.length) * 100}%`,
              }}
            />
          </div>
          <span
            className="font-medium"
            style={{
              fontSize: TYPOGRAPHY.caption.size,
              color: 'var(--text-muted)',
            }}
          >
            {todo.subtasks.filter((s) => s.completed).length}/{todo.subtasks.length}
          </span>
        </div>
      )}

      {/* Archive-specific: Completed date */}
      {variant === 'archive' && todo.completed && (
        <div
          style={{
            marginTop: SPACING.sm,
            fontSize: TYPOGRAPHY.caption.size,
            color: 'var(--text-muted)',
          }}
        >
          Completed {new Date(todo.updated_at || '').toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
