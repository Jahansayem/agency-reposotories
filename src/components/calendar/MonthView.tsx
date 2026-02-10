'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Todo } from '@/types/todo';
import CalendarDayCell from './CalendarDayCell';
import CalendarDragOverlay from './CalendarDragOverlay';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthViewProps {
  currentMonth: Date;
  direction: 'left' | 'right';
  todosByDate: Map<string, Todo[]>;
  onDateClick: (date: Date) => void;
  onTaskClick: (todo: Todo) => void;
  onReschedule?: (todoId: string, newDate: string) => void;
}

const monthVariants = {
  enter: (direction: 'left' | 'right') => ({
    x: direction === 'right' ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'left' | 'right') => ({
    x: direction === 'right' ? -50 : 50,
    opacity: 0,
  }),
};

export default function MonthView({
  currentMonth,
  direction,
  todosByDate,
  onDateClick,
  onTaskClick,
  onReschedule,
}: MonthViewProps) {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);

  // Require 8px of drag distance before starting (prevents accidental drags on click)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Build a flat lookup of all todos for drag resolution
  const allTodos = useMemo(() => {
    const map = new Map<string, Todo>();
    todosByDate.forEach((todos) => {
      todos.forEach((todo) => map.set(todo.id, todo));
    });
    return map;
  }, [todosByDate]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const todoId = event.active.data.current?.todoId;
    if (todoId) {
      setActiveTodo(allTodos.get(todoId) || null);
    }
  }, [allTodos]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTodo(null);
    const { active, over } = event;
    if (!over || !onReschedule) return;

    const todoId = active.data.current?.todoId;
    const newDateKey = over.data.current?.dateKey;

    if (todoId && newDateKey) {
      onReschedule(todoId, newDateKey);
    }
  }, [onReschedule]);

  const enableDragDrop = !!onReschedule;
  const isDragActive = activeTodo !== null;

  const content = (
    <div className="flex-1 p-2 sm:p-4 overflow-auto">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day Grid */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={format(currentMonth, 'yyyy-MM')}
          custom={direction}
          variants={monthVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="grid grid-cols-7 gap-1"
        >
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTodos = todosByDate.get(dateKey) || [];

            return (
              <CalendarDayCell
                key={dateKey}
                date={day}
                todos={dayTodos}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isToday={isToday(day)}
                onClick={() => onDateClick(day)}
                onTaskClick={onTaskClick}
                enableDragDrop={enableDragDrop}
                isDragActive={isDragActive}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  if (!enableDragDrop) return content;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {content}
      <CalendarDragOverlay activeTodo={activeTodo} />
    </DndContext>
  );
}
