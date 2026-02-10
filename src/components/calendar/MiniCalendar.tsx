'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { Todo } from '@/types/todo';

interface MiniCalendarProps {
  currentDate: Date;
  todosByDate: Map<string, Todo[]>;
  onDateClick: (date: Date) => void;
}

export default function MiniCalendar({
  currentDate,
  todosByDate,
  onDateClick,
}: MiniCalendarProps) {
  const [miniMonth, setMiniMonth] = useState(currentDate);

  // Sync mini calendar month when parent navigates to a different month
  useEffect(() => {
    setMiniMonth(currentDate);
  }, [currentDate]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(miniMonth);
    const monthEnd = endOfMonth(miniMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [miniMonth]);

  const goToPrevMonth = useCallback(() => {
    setMiniMonth((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setMiniMonth((prev) => addMonths(prev, 1));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goToPrevMonth}
          className="p-1 rounded hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        </button>
        <span className="text-xs font-semibold text-[var(--foreground)]">
          {format(miniMonth, 'MMM yyyy')}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-1 rounded hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-[var(--text-muted)]">
            {d}
          </div>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const hasTasks = (todosByDate.get(dateKey)?.length || 0) > 0;
          const isCurrentMonth = isSameMonth(day, miniMonth);
          const isSelected = isSameDay(day, currentDate);
          const today = isToday(day);

          return (
            <button
              key={dateKey}
              onClick={() => onDateClick(day)}
              className={`
                relative w-full aspect-square flex items-center justify-center rounded text-[11px] transition-colors
                ${isSelected
                  ? 'bg-[var(--accent)] text-white font-bold'
                  : today
                    ? 'text-[var(--accent)] font-bold hover:bg-[var(--accent)]/10'
                    : isCurrentMonth
                      ? 'text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                      : 'text-[var(--text-muted)]/50 hover:bg-[var(--surface-hover)]'
                }
              `}
            >
              {day.getDate()}
              {hasTasks && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
