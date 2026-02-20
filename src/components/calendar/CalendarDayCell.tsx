'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { GripVertical, Clock, AlertTriangle, Bell, CheckCircle2, X, Repeat } from 'lucide-react';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { Todo } from '@/types/todo';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  isTaskOverdue,
  STATUS_BORDER,
  SEGMENT_COLORS,
  SEGMENT_LABELS,
  getSubtaskProgress,
  isFollowUpOverdue,
  getInitials,
  formatPremiumCompact,
  hasPendingReminders,
  PREMIUM_DISPLAY_THRESHOLD,
} from './constants';

// Priority-based left border colors
const PRIORITY_BORDER: Record<string, string> = {
  urgent: 'border-l-2 border-l-red-500',
  high: 'border-l-2 border-l-orange-500',
  medium: 'border-l-2 border-l-transparent',
  low: 'border-l-2 border-l-transparent',
};

interface CalendarDayCellProps {
  date: Date;
  todos: Todo[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: () => void;
  onAddTask?: () => void;
  onTaskClick: (todo: Todo) => void;
  enableDragDrop?: boolean;
  isDragActive?: boolean;
  columnIndex?: number;
  rowIndex?: number;
  totalRows?: number;
  onQuickComplete?: (todoId: string) => void;
  onToggleWaiting?: (todoId: string, waiting: boolean) => void;
  onQuickAdd?: (dateKey: string, text: string) => void;
  isFocused?: boolean;
}

// Draggable task item inside the popup
function DraggableTaskItem({
  todo,
  onTaskClick,
  enableDrag,
  onQuickComplete,
  onToggleWaiting,
}: {
  todo: Todo;
  onTaskClick: (todo: Todo) => void;
  enableDrag: boolean;
  onQuickComplete?: (todoId: string) => void;
  onToggleWaiting?: (todoId: string, waiting: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `calendar-task-${todo.id}`,
    data: { todoId: todo.id, type: 'calendar-task' },
    disabled: !enableDrag,
  });

  const category = todo.category || 'other';
  const isOverdue = !todo.completed && isTaskOverdue(todo.due_date);

  // Overdue border takes precedence, then status border, then priority border
  const borderClass = isOverdue
    ? 'border-l-2 border-l-red-500'
    : STATUS_BORDER[todo.status] || PRIORITY_BORDER[todo.priority] || 'border-l-2 border-l-transparent';

  const subtaskProgress = getSubtaskProgress(todo.subtasks);
  const followUpOverdue = todo.waiting_for_response
    ? isFollowUpOverdue(todo.waiting_since, todo.follow_up_after_hours)
    : false;

  return (
    <div
      ref={setNodeRef}
      className={`group/task flex items-start gap-2 p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors text-left ${borderClass} ${isDragging ? 'opacity-30' : ''}`}
    >
      {enableDrag && (
        <button
          {...listeners}
          {...attributes}
          className="mt-1 cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--foreground)] flex-shrink-0"
          aria-label={`Drag ${todo.customer_name || todo.text}`}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTaskClick(todo);
        }}
        aria-label={`Open task: ${todo.customer_name || todo.text}, ${CATEGORY_LABELS[category]}${isOverdue ? ', overdue' : ''}${todo.waiting_for_response ? ', waiting for response' : ''}`}
        className="flex-1 flex items-start gap-2 min-w-0 text-left"
      >
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${CATEGORY_COLORS[category]}`}
          title={CATEGORY_LABELS[category]}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm truncate ${isOverdue ? 'text-red-500' : 'text-[var(--foreground)]'}`}
            title={todo.customer_name || todo.text}
          >
            {todo.customer_name || todo.text}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {CATEGORY_LABELS[category]}
            {todo.premium_amount != null && todo.premium_amount > 0 && (
              <span className="ml-1">
                - ${todo.premium_amount.toLocaleString()}
              </span>
            )}
          </p>
          {/* Wave 1: Visual indicators row */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap" aria-hidden="true">
            {todo.status === 'in_progress' && !isOverdue && (
              <span className="text-[10px] text-amber-500 font-medium">In Progress</span>
            )}
            {subtaskProgress && (
              <span className="text-[10px] text-[var(--text-muted)]">{subtaskProgress}</span>
            )}
            {todo.waiting_for_response && (
              <Clock
                className={`w-3 h-3 ${followUpOverdue ? 'text-red-500' : 'text-amber-500'}`}
                aria-label={followUpOverdue ? 'Follow-up overdue' : 'Waiting for response'}
              />
            )}
            {todo.customer_segment && (
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${SEGMENT_COLORS[todo.customer_segment] || ''}`}
                title={SEGMENT_LABELS[todo.customer_segment] || todo.customer_segment}
              />
            )}
            {todo.renewal_status === 'at-risk' && (
              <AlertTriangle className="w-3 h-3 text-amber-500" aria-label="At-risk renewal" />
            )}
            {hasPendingReminders(todo.reminders, todo.reminder_at) && (
              <Bell className="w-3 h-3 text-[var(--text-muted)]" aria-label="Has reminders" />
            )}
            {todo.recurrence && (
              <Repeat className="w-3 h-3 text-[var(--text-muted)]" aria-label={`Repeats ${todo.recurrence}`} />
            )}
            {todo.assigned_to && (
              <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--surface)] px-1 rounded" title={`Assigned to ${todo.assigned_to}`}>
                {getInitials(todo.assigned_to)}
              </span>
            )}
          </div>
        </div>
      </button>
      {/* Quick action buttons — visible on hover */}
      {(onQuickComplete || onToggleWaiting) && (
        <div className="flex items-center gap-1 flex-shrink-0 mt-1 opacity-0 group-hover/task:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
          {onQuickComplete && !todo.completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickComplete(todo.id);
              }}
              className="text-[var(--text-muted)] hover:text-emerald-500 transition-colors"
              data-testid={`quick-complete-${todo.id}`}
              aria-label="Mark complete"
              title="Mark complete"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {onToggleWaiting && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWaiting(todo.id, !todo.waiting_for_response);
              }}
              className={`transition-colors ${
                todo.waiting_for_response
                  ? 'text-amber-500 hover:text-[var(--text-muted)]'
                  : 'text-[var(--text-muted)] hover:text-amber-500'
              }`}
              data-testid={`quick-waiting-${todo.id}`}
              aria-label={todo.waiting_for_response ? 'Remove waiting status' : 'Mark as waiting'}
              title={todo.waiting_for_response ? 'Remove waiting status' : 'Mark as waiting'}
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CalendarDayCell({
  date,
  todos,
  isCurrentMonth,
  isToday,
  onClick,
  onAddTask,
  onTaskClick,
  enableDragDrop = false,
  isDragActive = false,
  columnIndex,
  rowIndex,
  totalRows,
  onQuickComplete,
  onToggleWaiting,
  onQuickAdd,
  isFocused,
}: CalendarDayCellProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouchDevice();

  const dateKey = format(date, 'yyyy-MM-dd');

  // Make the cell a droppable target
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `calendar-day-${dateKey}`,
    data: { dateKey, type: 'calendar-day' },
    disabled: !enableDragDrop,
  });

  const dayNumber = date.getDate();

  // Full date label for screen readers (e.g. "Monday, February 9, 2026, 3 tasks")
  const fullDateLabel = `${format(date, 'EEEE, MMMM d, yyyy')}${
    isToday ? ', today' : ''
  }${todos.length > 0 ? `, ${todos.length} task${todos.length !== 1 ? 's' : ''}` : ''}`;

  const handleCellClick = useCallback(() => {
    if (isTouch && todos.length > 0 && !showPopup) {
      // Touch: first tap opens popup instead of navigating
      setShowPopup(true);
      return;
    }
    // Desktop: always navigate. Touch with popup open: navigate on second tap.
    onClick();
  }, [onClick, isTouch, todos.length, showPopup]);

  // Close popup when drag ends (isDragActive transitions from true to false)
  // Without this, the popup can get stuck open because onMouseLeave won't fire
  // if the mouse hasn't moved after the drag completes
  const prevIsDragActive = useRef(isDragActive);
  useEffect(() => {
    if (prevIsDragActive.current && !isDragActive) {
      setShowPopup(false);
    }
    prevIsDragActive.current = isDragActive;
  }, [isDragActive]);

  // Handle Escape key to close popup and return focus to cell
  useEffect(() => {
    if (!showPopup) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowPopup(false);
        cellRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPopup]);

  // Close popup on outside tap (touch devices)
  useEffect(() => {
    if (!showPopup || !isTouch) return;

    function handleTouchOutside(e: TouchEvent) {
      const container = cellRef.current?.parentElement;
      if (container && !container.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }

    document.addEventListener('touchstart', handleTouchOutside, { passive: true });
    return () => document.removeEventListener('touchstart', handleTouchOutside);
  }, [showPopup, isTouch]);

  // Determine popup positioning based on cell position in grid
  const popupHorizontal = columnIndex !== undefined && columnIndex >= 5 ? 'right-0' : 'left-0';
  // Flip popup above the cell when in the bottom half of the grid
  const rowThreshold = totalRows !== undefined ? Math.ceil(totalRows / 2) : 4;
  const popupVertical = rowIndex !== undefined && rowIndex >= rowThreshold ? 'bottom-full mb-1' : 'top-full mt-1';

  // Workload heatmap: subtle background tint based on task count
  const heatmapClass =
    isCurrentMonth && !isOver && !isToday
      ? todos.length >= 7
        ? 'bg-red-500/5 dark:bg-red-500/10'
        : todos.length >= 4
          ? 'bg-amber-500/5 dark:bg-amber-500/8'
          : ''
      : '';

  // Auto-focus the quick-add input when it appears
  useEffect(() => {
    if (showQuickAdd && quickAddInputRef.current) {
      quickAddInputRef.current.focus();
    }
  }, [showQuickAdd]);

  // Scroll the cell into view when it becomes focused via keyboard navigation
  useEffect(() => {
    if (isFocused && cellRef.current) {
      cellRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isFocused]);

  const handleQuickAddSubmit = useCallback(() => {
    const trimmed = quickAddText.trim();
    if (trimmed && onQuickAdd) {
      onQuickAdd(dateKey, trimmed);
    }
    setQuickAddText('');
    setShowQuickAdd(false);
  }, [quickAddText, onQuickAdd, dateKey]);

  const handleQuickAddKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickAddSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setQuickAddText('');
        setShowQuickAdd(false);
      }
    },
    [handleQuickAddSubmit]
  );

  const handleQuickAddBlur = useCallback(() => {
    if (!quickAddText.trim()) {
      setQuickAddText('');
      setShowQuickAdd(false);
    }
  }, [quickAddText]);

  return (
    <div
      ref={setDroppableRef}
      className="relative"
      data-testid={`calendar-cell-${dateKey}`}
      data-cell-row={rowIndex}
      data-cell-col={columnIndex}
      onMouseEnter={() => !isTouch && !isDragActive && !showPopup && todos.length > 0 && setShowPopup(true)}
      onMouseLeave={() => !isTouch && !isDragActive && setShowPopup(false)}
    >
      <motion.button
        ref={cellRef}
        role="gridcell"
        aria-label={fullDateLabel}
        aria-selected={isToday}
        aria-current={isToday ? 'date' : undefined}
        onClick={handleCellClick}
        whileHover={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        whileTap={{ scale: 0.98 }}
        className={`
          group w-full min-h-[72px] sm:min-h-[100px] p-2 rounded-lg
          flex flex-col items-start justify-start
          transition-all duration-200 border
          ${isOver
            ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/20 border-[var(--accent)]'
            : isToday
              ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30'
              : isCurrentMonth
                ? `bg-[var(--surface-2)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] ${heatmapClass} ${isDragActive ? 'border-dashed border-[var(--accent)]/40' : ''}`
                : `bg-[var(--background)] border-[var(--border-muted)] ${isDragActive ? 'border-dashed border-[var(--accent)]/30' : ''}`
          }
          ${isFocused ? 'outline outline-2 outline-offset-2 outline-[var(--accent)]' : ''}
        `}
      >
        {/* Day Number */}
        <span
          aria-hidden="true"
          className={`
            mb-1 inline-flex items-center justify-center
            ${isToday
              ? 'text-white bg-[var(--accent)] w-7 h-7 rounded-full text-sm font-bold'
              : isCurrentMonth
                ? 'text-[var(--foreground)] text-base font-bold'
                : 'text-[var(--text-muted)] dark:text-[var(--text-muted)]/50 text-sm font-medium'
            }
          `}
        >
          {dayNumber}
        </span>

        {/* "+ Add task" hint on empty cells — inline quick-add if onQuickAdd provided */}
        {todos.length === 0 && !showQuickAdd && (
          <span
            className="opacity-50 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] text-xs"
            onClick={(e) => {
              if (onQuickAdd) {
                e.stopPropagation();
                setShowQuickAdd(true);
              }
            }}
          >
            + Add task
          </span>
        )}
        {todos.length === 0 && showQuickAdd && (
          <input
            ref={quickAddInputRef}
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={handleQuickAddKeyDown}
            onBlur={handleQuickAddBlur}
            onClick={(e) => e.stopPropagation()}
            placeholder="Quick add..."
            aria-label={`Quick add task for ${format(date, 'MMMM d')}`}
            data-testid="calendar-quickadd-input"
            className="w-full text-xs bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] placeholder:text-[var(--text-muted)] py-0.5"
          />
        )}

        {/* Task Previews — full text on sm+, dots-only on mobile */}
        {todos.length > 0 && (
          <>
            {/* Mobile: colored dots + count badge */}
            <div className="w-full flex-1 flex flex-col gap-0.5 sm:hidden" aria-hidden="true">
              <div className="flex items-center gap-1 flex-wrap">
                {todos.slice(0, 6).map((todo) => {
                  const cat = todo.category || 'other';
                  const isOverdue = !todo.completed && isTaskOverdue(todo.due_date);
                  return (
                    <div
                      key={todo.id}
                      className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : CATEGORY_COLORS[cat]}`}
                      title={todo.customer_name || todo.text}
                    />
                  );
                })}
                {todos.length > 6 && (
                  <span className="text-[9px] text-[var(--text-muted)]">+{todos.length - 6}</span>
                )}
              </div>
            </div>

            {/* Desktop (sm+): full text previews */}
            <div className="w-full flex-1 flex-col gap-0.5 min-h-0 overflow-hidden hidden sm:flex" aria-hidden="true">
              {todos.slice(0, 3).map((todo) => {
                const cat = todo.category || 'other';
                const isOverdue = !todo.completed && isTaskOverdue(todo.due_date);
                const isAtRisk = todo.renewal_status === 'at-risk';
                const isWaiting = todo.waiting_for_response;
                const waitingOverdue = isWaiting
                  ? isFollowUpOverdue(todo.waiting_since, todo.follow_up_after_hours)
                  : false;
                const hasIncompleteSubtasks = todo.subtasks?.some((s) => !s.completed);
                const showSegmentDot =
                  todo.customer_segment === 'elite' || todo.customer_segment === 'premium';
                return (
                  <div
                    key={todo.id}
                    className="flex items-center gap-1 px-1 py-0.5 rounded text-xs truncate bg-[var(--surface)]/60"
                  >
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat]}`}
                        title={CATEGORY_LABELS[cat]}
                      />
                      {showSegmentDot && (
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${SEGMENT_COLORS[todo.customer_segment!]}`}
                          title={SEGMENT_LABELS[todo.customer_segment!]}
                        />
                      )}
                    </div>
                    {isWaiting && (
                      <Clock
                        className={`w-2.5 h-2.5 flex-shrink-0 ${waitingOverdue ? 'text-red-500' : 'text-amber-500'}`}
                      />
                    )}
                    <span
                      className={`truncate ${
                        isOverdue
                          ? 'text-red-500'
                          : isAtRisk
                            ? 'text-amber-500'
                            : 'text-[var(--text-light)]'
                      }`}
                      title={todo.customer_name || todo.text}
                    >
                      {todo.customer_name || todo.text}
                    </span>
                    {hasIncompleteSubtasks && (
                      <span className="text-[8px] text-[var(--text-muted)] flex-shrink-0" title="Has incomplete subtasks">●</span>
                    )}
                    {todo.premium_amount != null && todo.premium_amount >= PREMIUM_DISPLAY_THRESHOLD && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">
                        {formatPremiumCompact(todo.premium_amount)}
                      </span>
                    )}
                    {hasPendingReminders(todo.reminders, todo.reminder_at) && (
                      <Bell className="w-2.5 h-2.5 text-[var(--text-muted)] flex-shrink-0" />
                    )}
                    {todo.recurrence && (
                      <Repeat className="w-2.5 h-2.5 text-[var(--text-muted)] flex-shrink-0" aria-label={`Repeats ${todo.recurrence}`} />
                    )}
                  </div>
                );
              })}
              {todos.length > 3 && (
                <span
                  className="text-[10px] text-[var(--accent)] font-medium px-1 cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPopup(true);
                  }}
                >
                  +{todos.length - 3} more
                </span>
              )}
            </div>
          </>
        )}
      </motion.button>

      {/* Popup with draggable tasks */}
      <AnimatePresence>
        {showPopup && todos.length > 0 && (
          <motion.div
            ref={popupRef}
            role="dialog"
            aria-label={`Tasks for ${format(date, 'EEEE, MMMM d')}`}
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            data-testid={`calendar-popup-${dateKey}`}
            className={`absolute z-[500] ${popupVertical} ${popupHorizontal} min-w-[220px] max-w-[280px] p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] shadow-lg dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)]`}
            style={{ pointerEvents: 'auto' }}
            onMouseEnter={() => setShowPopup(true)}
            onMouseLeave={() => !isDragActive && setShowPopup(false)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopup(false);
                  onClick();
                }}
                className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide hover:text-[var(--accent)] transition-colors"
                aria-label={`View ${format(date, 'EEEE, MMMM d')} in day view`}
                title="View day"
              >
                {format(date, 'EEEE, MMM d')}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    (onAddTask || onClick)();
                  }}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                  aria-label={`Add task for ${format(date, 'MMMM d')}`}
                >
                  + Add
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPopup(false);
                    cellRef.current?.focus();
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                  aria-label="Close task list popup"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Task List — show all tasks; container scrolls via max-h + overflow-y-auto */}
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto" role="list" aria-label="Tasks">
              {todos.map((todo) => (
                <DraggableTaskItem
                  key={todo.id}
                  todo={todo}
                  onTaskClick={onTaskClick}
                  enableDrag={enableDragDrop}
                  onQuickComplete={onQuickComplete}
                  onToggleWaiting={onToggleWaiting}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { DraggableTaskItem };
