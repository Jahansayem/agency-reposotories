'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Todo } from '@/types/todo';
import TodoItem from './TodoItem';

/**
 * VirtualTodoList Component
 * Sprint 3 Issue #33: Virtual Scrolling
 *
 * Renders a virtualized list of todos for optimal performance with large datasets
 * Only renders visible items + overscan buffer
 *
 * Performance improvements:
 * - Renders only ~10-15 items at a time (vs all items)
 * - Smooth scrolling with 60fps
 * - Handles 1000+ todos without performance degradation
 */

interface VirtualTodoListProps {
  todos: Todo[];
  users: string[];
  currentUserName: string;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSetPriority: (id: string, priority: any) => void;
  onStatusChange?: (id: string, status: any) => void;
  onUpdateText?: (id: string, text: string) => void;
  onDuplicate?: (todo: Todo) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onSetRecurrence?: (id: string, recurrence: any) => void;
  onUpdateSubtasks?: (id: string, subtasks: any[]) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onUpdateAttachments?: (id: string, attachments: any[], skipDbUpdate?: boolean) => void;
  estimatedItemHeight?: number;
  overscan?: number;
}

export function VirtualTodoList({
  todos,
  users,
  currentUserName,
  onToggle,
  onDelete,
  onAssign,
  onSetDueDate,
  onSetPriority,
  onStatusChange,
  onUpdateText,
  onDuplicate,
  onUpdateNotes,
  onSetRecurrence,
  onUpdateSubtasks,
  onSaveAsTemplate,
  onUpdateAttachments,
  estimatedItemHeight = 120,
  overscan = 5,
}: VirtualTodoListProps) {
  // Parent element ref
  const parentRef = useRef<HTMLDivElement>(null);

  // Create virtualizer
  const rowVirtualizer = useVirtualizer({
    count: todos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{
        contain: 'strict', // CSS containment for better performance
      }}
    >
      {/* Spacer div to create scroll height */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Render only visible items */}
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const todo = todos[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TodoItem
                todo={todo}
                users={users}
                currentUserName={currentUserName}
                onToggle={onToggle}
                onDelete={onDelete}
                onAssign={onAssign}
                onSetDueDate={onSetDueDate}
                onSetPriority={onSetPriority}
                onStatusChange={onStatusChange}
                onUpdateText={onUpdateText}
                onDuplicate={onDuplicate}
                onUpdateNotes={onUpdateNotes}
                onSetRecurrence={onSetRecurrence}
                onUpdateSubtasks={onUpdateSubtasks}
                onSaveAsTemplate={onSaveAsTemplate}
                onUpdateAttachments={onUpdateAttachments}
              />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {todos.length === 0 && (
        <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
          <p>No tasks to display</p>
        </div>
      )}
    </div>
  );
}
