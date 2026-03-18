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
import { useState, useCallback, useRef } from 'react';

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

    // Wait for Framer Motion exit animation (~150ms) to remove the completed card from DOM
    setTimeout(() => {
      // Use double rAF to ensure React has re-rendered and the paint cycle is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const remainingCards = container.querySelectorAll('[data-task-id]');
          const nextCheckbox = remainingCards.length > 0
            ? remainingCards[Math.min(currentIndex, remainingCards.length - 1)]?.querySelector<HTMLButtonElement>('button[data-completion-checkbox]')
            : null;

          if (nextCheckbox) {
            nextCheckbox.focus();
          } else {
            // Fallback chain: try "New Task" button, then main heading, then task list container
            const newTaskButton = document.querySelector<HTMLElement>('button[data-new-task]');
            if (newTaskButton) {
              newTaskButton.focus();
              return;
            }

            const mainHeading = document.querySelector<HTMLElement>('h1, [role="heading"]');
            if (mainHeading) {
              mainHeading.setAttribute('tabindex', '-1');
              mainHeading.focus();
              return;
            }

            const taskListContainer = container.closest('[role="list"]') || container;
            if (taskListContainer instanceof HTMLElement) {
              taskListContainer.setAttribute('tabindex', '-1');
              taskListContainer.focus();
            }
          }
        });
      });
    }, 200);
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
            const isCompleting = !todo.completed;
            onToggleComplete(todo.id);
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
          data-completion-checkbox
        >
          <span
            className={`
              flex items-center justify-center
              border-2
              transition-[background-color,border-color,transform] duration-100
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
