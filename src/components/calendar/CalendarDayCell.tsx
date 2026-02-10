'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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

interface CalendarDayCellProps {
  date: Date;
  todos: Todo[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: () => void;
  onTaskClick: (todo: Todo) => void;
  enableDragDrop?: boolean;
  isDragActive?: boolean;
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

  return (
    <div
      ref={setNodeRef}
      className={`flex items-start gap-2 p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors text-left ${isDragging ? 'opacity-30' : ''}`}
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
          <p className="text-sm text-[var(--foreground)] truncate">
            {todo.customer_name || todo.text}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {CATEGORY_LABELS[category]}
            {todo.premium_amount && (
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
  onTaskClick,
  enableDragDrop = false,
  isDragActive = false,
}: CalendarDayCellProps) {
  const [showPopup, setShowPopup] = useState(false);

  const dateKey = format(date, 'yyyy-MM-dd');

  // Make the cell a droppable target
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `calendar-day-${dateKey}`,
    data: { dateKey, type: 'calendar-day' },
    disabled: !enableDragDrop,
  });

  // Group todos by category for dot display
  const categoryGroups = useMemo(() => {
    const groups: Record<DashboardTaskCategory, Todo[]> = {
      quote: [], renewal: [], claim: [], service: [],
      'follow-up': [], prospecting: [], other: [],
    };
    todos.forEach((todo) => {
      const category = todo.category || 'other';
      groups[category].push(todo);
    });
    return Object.entries(groups)
      .filter(([, tasks]) => tasks.length > 0)
      .map(([category, tasks]) => ({
        category: category as DashboardTaskCategory,
        tasks,
        count: tasks.length,
      }));
  }, [todos]);

  const MAX_VISIBLE_DOTS = 3;
  const visibleCategories = categoryGroups.slice(0, MAX_VISIBLE_DOTS);
  const hiddenCount = categoryGroups.length - MAX_VISIBLE_DOTS;
  const dayNumber = date.getDate();

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

  return (
    <div
      ref={setDroppableRef}
      className="relative"
      onMouseEnter={() => !showPopup && todos.length > 0 && setShowPopup(true)}
      onMouseLeave={() => !isDragActive && setShowPopup(false)}
    >
      <motion.button
        onClick={handleCellClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full aspect-square min-h-[80px] sm:min-h-[100px] p-2 rounded-lg
          flex flex-col items-start justify-start
          transition-all duration-200 border
          ${isOver
            ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/20 border-[var(--accent)]'
            : isToday
              ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30'
              : isCurrentMonth
                ? 'bg-[var(--surface-2)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]'
                : 'bg-[var(--surface)] border-[var(--border-muted)]'
          }
        `}
      >
        {/* Day Number */}
        <span
          className={`
            text-sm font-semibold mb-1
            ${isToday
              ? 'text-[var(--accent)]'
              : isCurrentMonth
                ? 'text-[var(--foreground)]'
                : 'text-[var(--text-muted)]'
            }
          `}
        >
          {dayNumber}
        </span>

        {/* Category Dots */}
        {categoryGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {visibleCategories.map(({ category, count }) => (
              <div key={category} className="flex items-center gap-0.5">
                <div
                  className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category]}`}
                  title={`${count} ${CATEGORY_LABELS[category]}${count > 1 ? 's' : ''}`}
                />
                {count > 1 && (
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">
                    {count}
                  </span>
                )}
              </div>
            ))}
            {hiddenCount > 0 && (
              <span className="text-[10px] font-medium text-[var(--text-muted)]">
                +{hiddenCount}
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
            className="absolute z-50 top-full left-0 mt-1 min-w-[220px] max-w-[280px] p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] shadow-lg"
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
                  onClick();
                }}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                + Add
              </button>
            </div>

            {/* Task List — show all tasks; container scrolls via max-h + overflow-y-auto */}
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
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

export { CATEGORY_COLORS, CATEGORY_LABELS };
