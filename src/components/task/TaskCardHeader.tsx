/**
 * TaskCardHeader
 *
 * Task title with checkbox - core interactive area
 * Implements proper typography scale and line clamping
 */

'use client';

import { Todo } from '@/types/todo';
import { Check } from 'lucide-react';
import { TYPOGRAPHY } from '@/lib/design-tokens';
import { useState } from 'react';

interface TaskCardHeaderProps {
  todo: Todo;
  variant?: 'list' | 'board' | 'archive';
  density?: 'compact' | 'comfortable';
  onToggleComplete?: (id: string) => void;
  onTitleClick?: () => void;
}

export function TaskCardHeader({
  todo,
  variant = 'list',
  density = 'comfortable',
  onToggleComplete,
  onTitleClick,
}: TaskCardHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);

  const titleStyle =
    density === 'compact'
      ? { fontSize: '15px', lineHeight: '1.4' }
      : {
          fontSize: TYPOGRAPHY.taskTitle.size,
          fontWeight: TYPOGRAPHY.taskTitle.weight,
          lineHeight: TYPOGRAPHY.taskTitle.lineHeight,
        };

  const maxLines = variant === 'board' ? 2 : 1;

  return (
    <div className="flex items-start gap-3">
      {/* Checkbox - 44x44px touch target */}
      {onToggleComplete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(todo.id);
          }}
          className="flex-shrink-0 mt-0.5 group touch-manipulation"
          aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
          type="button"
        >
          <span
            className={`
              flex items-center justify-center
              w-5 h-5 rounded-md border-2 transition-all
              ${
                todo.completed
                  ? 'bg-[var(--success)] border-[var(--success)] shadow-sm'
                  : 'border-[var(--border)] group-hover:border-[var(--success)] group-hover:bg-[var(--success)]/10'
              }
            `}
          >
            {todo.completed && (
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            )}
          </span>
        </button>
      )}

      {/* Title - clickable to expand */}
      <button
        onClick={onTitleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-1 text-left cursor-pointer bg-transparent border-none p-0 hover:text-[var(--accent)] transition-colors"
        type="button"
      >
        <span
          className={`
            block
            ${todo.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--foreground)]'}
            ${isHovered && !todo.completed ? 'text-[var(--accent)]' : ''}
          `}
          style={{
            ...titleStyle,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {todo.text}
        </span>
      </button>
    </div>
  );
}
