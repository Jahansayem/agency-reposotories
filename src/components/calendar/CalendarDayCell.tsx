'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { Todo, DashboardTaskCategory } from '@/types/todo';

// Category color mapping for task indicators
const CATEGORY_COLORS: Record<DashboardTaskCategory, string> = {
  quote: 'bg-blue-500',
  renewal: 'bg-purple-500',
  claim: 'bg-red-500',
  service: 'bg-amber-500',
  'follow-up': 'bg-emerald-500',
  prospecting: 'bg-cyan-500',
  other: 'bg-slate-500',
};

// Category labels for hover preview
const CATEGORY_LABELS: Record<DashboardTaskCategory, string> = {
  quote: 'Quote',
  renewal: 'Renewal',
  claim: 'Claim',
  service: 'Service',
  'follow-up': 'Follow-up',
  prospecting: 'Prospecting',
  other: 'Other',
};

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
}

// Draggable task item inside the popup
function DraggableTaskItem({
  todo,
  onTaskClick,
  enableDrag,
}: {
  todo: Todo;
  onTaskClick: (todo: Todo) => void;
  enableDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `calendar-task-${todo.id}`,
    data: { todoId: todo.id, type: 'calendar-task' },
    disabled: !enableDrag,
  });

  const category = todo.category || 'other';
  const isOverdue = todo.due_date ? new Date(todo.due_date + 'T00:00:00') < new Date(new Date().toDateString()) : false;

  // Overdue border takes precedence over priority border
  const borderClass = isOverdue
    ? 'border-l-2 border-l-red-500'
    : PRIORITY_BORDER[todo.priority] || 'border-l-2 border-l-transparent';

  return (
    <div
      ref={setNodeRef}
      className={`flex items-start gap-2 p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors text-left ${borderClass} ${isDragging ? 'opacity-30' : ''}`}
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
        className="flex-1 flex items-start gap-2 min-w-0 text-left"
      >
        <div
          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${CATEGORY_COLORS[category]}`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${isOverdue ? 'text-red-500' : 'text-[var(--foreground)]'}`}>
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
        </div>
      </button>
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
}: CalendarDayCellProps) {
  const [showPopup, setShowPopup] = useState(false);

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
    todos.length > 0 ? `, ${todos.length} task${todos.length !== 1 ? 's' : ''}` : ''
  }`;

  const handleCellClick = useCallback(() => {
    if (todos.length > 0) {
      setShowPopup((prev) => !prev);
    } else {
      onClick();
    }
  }, [todos.length, onClick]);

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

  // Determine popup positioning based on cell position in grid
  const popupHorizontal = columnIndex !== undefined && columnIndex >= 5 ? 'right-0' : 'left-0';
  const popupVertical = rowIndex !== undefined && rowIndex >= 4 ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div
      ref={setDroppableRef}
      className="relative"
      onMouseEnter={() => !isDragActive && !showPopup && todos.length > 0 && setShowPopup(true)}
      onMouseLeave={() => !isDragActive && setShowPopup(false)}
    >
      <motion.button
        role="gridcell"
        aria-label={fullDateLabel}
        onClick={handleCellClick}
        whileHover={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        whileTap={{ scale: 0.98 }}
        className={`
          group w-full aspect-square sm:aspect-auto sm:min-h-[100px] min-h-[80px] sm:min-h-[100px] p-2 rounded-lg
          flex flex-col items-start justify-start
          transition-all duration-200 border
          ${isOver
            ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/20 border-[var(--accent)]'
            : isToday
              ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30'
              : isCurrentMonth
                ? 'bg-[var(--surface-2)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]'
                : 'bg-[var(--background)] dark:bg-[var(--background)] border-[var(--border-muted)]'
          }
        `}
      >
        {/* Day Number */}
        <span
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

        {/* Hover "+" on empty cells */}
        {todos.length === 0 && (
          <span className="opacity-0 group-hover:opacity-60 transition-opacity text-[var(--text-muted)] text-lg">+</span>
        )}

        {/* Task Previews */}
        {todos.length > 0 && (
          <div className="w-full flex-1 flex flex-col gap-0.5 min-h-0 overflow-hidden">
            {todos.slice(0, 3).map((todo) => {
              const cat = todo.category || 'other';
              const isOverdue = todo.due_date ? new Date(todo.due_date + 'T00:00:00') < new Date(new Date().toDateString()) : false;
              return (
                <div
                  key={todo.id}
                  className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] sm:text-xs truncate bg-[var(--surface)]/60"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[cat]}`} />
                  <span className={`truncate ${isOverdue ? 'text-red-500' : 'text-[var(--text-light)]'}`}>
                    {todo.customer_name || todo.text}
                  </span>
                </div>
              );
            })}
            {todos.length > 3 && (
              <span className="text-[10px] text-[var(--text-muted)] px-1">
                +{todos.length - 3} more
              </span>
            )}
          </div>
        )}
      </motion.button>

      {/* Popup with draggable tasks */}
      <AnimatePresence>
        {showPopup && todos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${popupVertical} ${popupHorizontal} min-w-[220px] max-w-[280px] p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] shadow-lg dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)]`}
            style={{ pointerEvents: 'auto' }}
            onMouseEnter={() => setShowPopup(true)}
            onMouseLeave={() => !isDragActive && setShowPopup(false)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                {format(date, 'EEEE, MMM d')}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  (onAddTask || onClick)();
                }}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                + Add
              </button>
            </div>

            {/* Task List — show all tasks; container scrolls via max-h + overflow-y-auto */}
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
              {todos.map((todo) => (
                <DraggableTaskItem
                  key={todo.id}
                  todo={todo}
                  onTaskClick={onTaskClick}
                  enableDrag={enableDragDrop}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { DraggableTaskItem, CATEGORY_COLORS, CATEGORY_LABELS };
