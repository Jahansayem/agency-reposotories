'use client';

import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { Todo } from '@/types/todo';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './CalendarDayCell';

interface DayViewProps {
  currentDate: Date;
  todosByDate: Map<string, Todo[]>;
  onDateClick: (date: Date) => void;
  onTaskClick: (todo: Todo) => void;
  onReschedule?: (todoId: string, newDate: string) => void;
}

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  low: { label: 'Low', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

export default function DayView({
  currentDate,
  todosByDate,
  onDateClick,
  onTaskClick,
  onReschedule,
}: DayViewProps) {
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const dayTodos = useMemo(() => todosByDate.get(dateKey) || [], [todosByDate, dateKey]);
  const today = isToday(currentDate);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      {/* Day Header */}
      <div className="flex items-center gap-3 mb-4">
        {today && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            Today
          </span>
        )}
        <span className="text-sm text-[var(--text-muted)]">
          {dayTodos.length} {dayTodos.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Task Cards */}
      {dayTodos.length > 0 ? (
        <div className="space-y-3">
          {dayTodos.map((todo) => {
            const category = todo.category || 'other';
            const priority = todo.priority || 'medium';
            const priorityBadge = PRIORITY_BADGES[priority];
            const subtaskCount = todo.subtasks?.length || 0;
            const completedSubtasks = todo.subtasks?.filter((s) => s.completed).length || 0;

            return (
              <button
                key={todo.id}
                onClick={() => onTaskClick(todo)}
                className="w-full text-left p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* Category Color Bar */}
                  <div className={`w-1 self-stretch rounded-full ${CATEGORY_COLORS[category]}`} />

                  <div className="flex-1 min-w-0">
                    {/* Title Row */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {todo.customer_name || todo.text}
                      </h3>
                      {priorityBadge && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${priorityBadge.className}`}>
                          {priorityBadge.label}
                        </span>
                      )}
                    </div>

                    {/* Details Row */}
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category]}`} />
                        {CATEGORY_LABELS[category]}
                      </span>
                      {todo.assigned_to && (
                        <span>Assigned to {todo.assigned_to}</span>
                      )}
                      {subtaskCount > 0 && (
                        <span>{completedSubtasks}/{subtaskCount} subtasks</span>
                      )}
                    </div>

                    {/* Notes Preview */}
                    {todo.notes && (
                      <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2">
                        {todo.notes}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-[var(--text-muted)] mb-3">No tasks for this day</p>
          <button
            onClick={() => onDateClick(currentDate)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors"
          >
            + Create Task
          </button>
        </div>
      )}
    </div>
  );
}
