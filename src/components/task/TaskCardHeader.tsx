/**
 * TaskCardHeader
 *
 * Task title with checkbox - core interactive area
 * Implements proper typography scale and line clamping
 */

'use client';

import { Todo } from '@/types/todo';
import { Check } from 'lucide-react';
import { TYPOGRAPHY, SPACING, RADIUS, ICON_SIZE } from '@/lib/design-tokens';
import { haptics } from '@/lib/haptics';
import { useState, useCallback, useRef } from 'react';
import { useAnnouncementContext } from '@/components/LiveRegion';

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
  const { announce } = useAnnouncementContext();
  const checkboxRef = useRef<HTMLButtonElement>(null);

  const moveFocusToNextTask = useCallback(() => {
    const button = checkboxRef.current;
    if (!button) return;

    // Find the parent task card element
    const taskCard = button.closest('[data-task-id]');
    if (!taskCard) return;

    // Collect all task cards in the same parent container
    const container = taskCard.parentElement;
    if (!container) return;

    const allCards = Array.from(container.querySelectorAll('[data-task-id]'));
    const currentIndex = allCards.indexOf(taskCard);

    // After React re-renders, try to focus the next task's checkbox
    requestAnimationFrame(() => {
      // Look for the next task card's checkbox
      const remainingCards = container.querySelectorAll('[data-task-id]');
      const nextCheckbox = remainingCards.length > 0
        ? remainingCards[Math.min(currentIndex, remainingCards.length - 1)]?.querySelector<HTMLButtonElement>('button[aria-pressed]')
        : null;

      if (nextCheckbox) {
        nextCheckbox.focus();
      } else {
        // No more tasks - focus the add task input
        const addTaskInput = document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="task"]');
        if (addTaskInput) {
          addTaskInput.focus();
        }
      }
    });
  }, []);

  const titleStyle =
    density === 'compact'
      ? { fontSize: TYPOGRAPHY.taskTitle.size, lineHeight: TYPOGRAPHY.taskTitle.lineHeight }
      : {
          fontSize: TYPOGRAPHY.taskTitle.size,
          fontWeight: TYPOGRAPHY.taskTitle.weight,
          lineHeight: TYPOGRAPHY.taskTitle.lineHeight,
        };

  const maxLines = variant === 'board' ? 2 : 1;
  const checkboxSize = ICON_SIZE.lg; // 20px for consistent sizing

  return (
    <div className="flex items-start" style={{ gap: SPACING.md }}>
      {/* Checkbox - 44x44px touch target */}
      {onToggleComplete && (
        <button
          ref={checkboxRef}
          onClick={(e) => {
            e.stopPropagation();
            haptics.medium();
            const isCompleting = !todo.completed;
            onToggleComplete(todo.id);
            announce(
              isCompleting
                ? `Task completed: ${todo.text}`
                : `Task reopened: ${todo.text}`,
              'assertive'
            );
            if (isCompleting) {
              moveFocusToNextTask();
            }
          }}
          className="flex-shrink-0 group touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          style={{
            marginTop: '2px',
            borderRadius: RADIUS.md,
          }}
          aria-label={`${todo.completed ? 'Mark as incomplete' : 'Mark as complete'}: ${todo.text || 'task'}`}
          type="button"
          aria-pressed={todo.completed}
        >
          <span
            className={`
              flex items-center justify-center
              border-2
              transition-[background-color,border-color,transform] duration-100 ease-out
              group-hover:scale-105 group-active:scale-95
              ${
                todo.completed
                  ? 'bg-[var(--success)] border-[var(--success)] shadow-sm'
                  : 'border-[var(--border)] group-hover:border-[var(--success)] group-hover:bg-[var(--success)]/10'
              }
            `}
            style={{
              width: `${checkboxSize}px`,
              height: `${checkboxSize}px`,
              borderRadius: RADIUS.md,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            aria-hidden="true"
          >
            {todo.completed && (
              <Check
                size={ICON_SIZE.md}
                className="text-white"
                strokeWidth={3}
              />
            )}
          </span>
        </button>
      )}

      {/* Title - clickable to expand */}
      <button
        onClick={onTitleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-1 text-left cursor-pointer bg-transparent border-none p-0 hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded"
        type="button"
        aria-label={`View details for task: ${todo.text || 'untitled task'}`}
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
