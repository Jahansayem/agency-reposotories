'use client';

import { memo, useState, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { listItemVariants, prefersReducedMotion, DURATION } from '@/lib/animations';
import { Todo, SortOption, WaitingContactType, Subtask, Attachment } from '@/types/todo';
import SortableTodoItem from '../SortableTodoItem';
import TaskSections from '../TaskSections';
import EmptyState from '../EmptyState';
import { SkeletonKanbanBoard } from '../SkeletonLoader';

// Lazy load KanbanBoard (979 lines) - only needed when switching to kanban view
const KanbanBoard = dynamic(() => import('../KanbanBoard'), {
  ssr: false,
  loading: () => <SkeletonKanbanBoard />,
});
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface TodoListContentProps {
  todos: Todo[];
  users: string[];
  currentUserName: string;
  viewMode: 'list' | 'kanban';
  useSectionedView: boolean;
  shouldUseSections: boolean;
  sortOption: SortOption;

  // Selection
  selectedTodos: Set<string>;
  showBulkActions: boolean;

  // Filters for empty state
  searchQuery: string;
  quickFilter: string;
  stats: { total: number; completed: number };

  // Task auto-expand (for navigating to a specific task)
  selectedTaskId?: string | null;
  onSelectedTaskHandled?: () => void;

  // Handlers
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onSelectTodo: (id: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, user: string | null) => void;
  onSetDueDate: (id: string, date: string | null) => void;
  onSetReminder: (id: string, date: string | null) => void;
  onMarkWaiting?: (id: string, contactType: WaitingContactType, followUpHours?: number) => Promise<void>;
  onClearWaiting?: (id: string) => Promise<void>;
  onSetPriority: (id: string, priority: 'low' | 'medium' | 'high' | 'urgent') => void;
  onStatusChange: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  onUpdateText: (id: string, text: string) => void;
  onDuplicate: (todo: Todo) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onSetRecurrence: (id: string, recurrence: 'daily' | 'weekly' | 'monthly' | null) => void;
  onUpdateSubtasks: (id: string, subtasks: Subtask[]) => void;
  onUpdateAttachments: (id: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onEmailCustomer: (todo: Todo) => void;
  onClearSearch: () => void;
  onAddTask: () => void;
  onOpenDetail?: (todoId: string) => void;
}

function TodoListContent({
  todos,
  users,
  currentUserName,
  viewMode,
  useSectionedView,
  shouldUseSections,
  sortOption,
  selectedTodos,
  showBulkActions,
  searchQuery,
  quickFilter,
  stats,
  selectedTaskId,
  onSelectedTaskHandled,
  onDragStart,
  onDragEnd,
  onSelectTodo,
  onToggle,
  onDelete,
  onAssign,
  onSetDueDate,
  onSetReminder,
  onMarkWaiting,
  onClearWaiting,
  onSetPriority,
  onStatusChange,
  onUpdateText,
  onDuplicate,
  onUpdateNotes,
  onSetRecurrence,
  onUpdateSubtasks,
  onUpdateAttachments,
  onSaveAsTemplate,
  onEmailCustomer,
  onClearSearch,
  onAddTask,
  onOpenDetail,
}: TodoListContentProps) {
  // DnD sensors for drag-and-drop reordering
  // Use distance + delay to prevent accidental drags when clicking on inline controls
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 10px of movement OR 150ms delay to start dragging
        // This prevents accidental drags when clicking quickly on other elements
        distance: 10,
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isDragging, setIsDragging] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragTodo = activeDragId ? todos.find(t => t.id === activeDragId) : null;
  const isDragEnabled = !showBulkActions;

  // Determine empty state variant
  const getEmptyStateVariant = () => {
    if (searchQuery) return 'no-results';
    if (quickFilter === 'due_today') return 'no-due-today';
    if (quickFilter === 'overdue') return 'no-overdue';
    if (stats.total === 0) return 'no-tasks';
    if (stats.completed === stats.total && stats.total > 0) return 'all-done';
    return 'no-tasks';
  };

  const renderEmptyState = () => (
    <motion.div
      key="empty-state"
      initial={prefersReducedMotion() ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.fast }}
    >
      <EmptyState
        variant={getEmptyStateVariant()}
        searchQuery={searchQuery}
        onAddTask={onAddTask}
        onClearSearch={onClearSearch}
        userName={currentUserName}
      />
    </motion.div>
  );

  const renderTodoItem = (todo: Todo, index: number): ReactNode => (
    <motion.div
      key={todo.id}
      layout={!isDragging && !prefersReducedMotion()}
      variants={prefersReducedMotion() ? undefined : listItemVariants}
      initial={prefersReducedMotion() ? false : 'hidden'}
      animate="visible"
      exit="exit"
      transition={{
        layout: { type: 'spring', stiffness: 350, damping: 25 },
        delay: Math.min(index * 0.02, 0.1),
      }}
    >
      <SortableTodoItem
        todo={todo}
        users={users}
        currentUserName={currentUserName}
        selected={selectedTodos.has(todo.id)}
        autoExpand={todo.id === selectedTaskId}
        onAutoExpandHandled={onSelectedTaskHandled}
        onSelect={showBulkActions ? onSelectTodo : undefined}
        onToggle={onToggle}
        onDelete={onDelete}
        onAssign={onAssign}
        onSetDueDate={onSetDueDate}
        onSetReminder={onSetReminder}
        onMarkWaiting={onMarkWaiting}
        onClearWaiting={onClearWaiting}
        onSetPriority={onSetPriority}
        onStatusChange={onStatusChange}
        onUpdateText={onUpdateText}
        onDuplicate={onDuplicate}
        onUpdateNotes={onUpdateNotes}
        onSetRecurrence={onSetRecurrence}
        onUpdateSubtasks={onUpdateSubtasks}
        onUpdateAttachments={onUpdateAttachments}
        onSaveAsTemplate={onSaveAsTemplate}
        onEmailCustomer={onEmailCustomer}
        onOpenDetail={onOpenDetail}
        isDragEnabled={isDragEnabled}
      />
    </motion.div>
  );

  // Generate status message for screen readers
  const getStatusMessage = () => {
    if (todos.length === 0) {
      if (searchQuery) return `No tasks found for "${searchQuery}"`;
      return 'No tasks to display';
    }
    const taskWord = todos.length === 1 ? 'task' : 'tasks';
    if (searchQuery) {
      return `Showing ${todos.length} ${taskWord} matching "${searchQuery}"`;
    }
    if (quickFilter && quickFilter !== 'all') {
      return `Showing ${todos.length} ${taskWord}`;
    }
    return `${todos.length} ${taskWord} in list`;
  };

  return (
    <>
      {/* Screen reader status announcement for task list changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {getStatusMessage()}
      </div>

      <AnimatePresence mode="wait" initial={false}>
      {viewMode === 'list' ? (
        <motion.div
          key="list-view"
          initial={prefersReducedMotion() ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion() ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: DURATION.fast }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => {
              setActiveDragId(event.active.id as string);
              setIsDragging(true);
              onDragStart?.(event);
            }}
            onDragEnd={(event) => {
              setActiveDragId(null);
              setIsDragging(false);
              onDragEnd(event);
            }}
            onDragCancel={() => {
              setActiveDragId(null);
              setIsDragging(false);
            }}
          >
            <SortableContext
              items={todos.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Render sectioned view or flat list based on toggle */}
              {useSectionedView && shouldUseSections ? (
                <TaskSections
                  todos={todos}
                  users={users}
                  currentUserName={currentUserName}
                  selectedTodos={selectedTodos}
                  showBulkActions={showBulkActions}
                  onSelectTodo={showBulkActions ? onSelectTodo : undefined}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onAssign={onAssign}
                  onSetDueDate={onSetDueDate}
                  onSetReminder={onSetReminder}
                  onMarkWaiting={onMarkWaiting}
                  onClearWaiting={onClearWaiting}
                  onSetPriority={onSetPriority}
                  onStatusChange={onStatusChange}
                  onUpdateText={onUpdateText}
                  onDuplicate={onDuplicate}
                  onUpdateNotes={onUpdateNotes}
                  onSetRecurrence={onSetRecurrence}
                  onUpdateSubtasks={onUpdateSubtasks}
                  onUpdateAttachments={onUpdateAttachments}
                  onSaveAsTemplate={onSaveAsTemplate}
                  onEmailCustomer={onEmailCustomer}
                  isDragEnabled={isDragEnabled}
                  renderTodoItem={renderTodoItem}
                  emptyState={renderEmptyState()}
                />
              ) : (
                /* Flat list view (original behavior) */
                <div className="space-y-2" role="list" aria-label="Task list">
                  <AnimatePresence initial={false}>
                    {todos.length === 0 ? (
                      renderEmptyState()
                    ) : (
                      todos.map((todo, index) => renderTodoItem(todo, index))
                    )}
                  </AnimatePresence>
                </div>
              )}
            </SortableContext>
            {/* DragOverlay renders dragged item in a portal, escaping overflow-hidden
                containers in TaskSections so tasks can be dragged upward across sections */}
            <DragOverlay dropAnimation={null}>
              {activeDragTodo ? (
                <div className="bg-[var(--surface)] border-2 border-[var(--accent)] rounded-[var(--radius-xl)] shadow-2xl px-4 py-3 max-w-md">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {activeDragTodo.text}
                  </p>
                  {activeDragTodo.assigned_to && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                      {activeDragTodo.assigned_to}
                    </p>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </motion.div>
      ) : (
        <motion.div
          key="kanban-view"
          initial={prefersReducedMotion() ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion() ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: DURATION.fast }}
        >
          <KanbanBoard
            todos={todos}
            users={users}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onAssign={onAssign}
            onSetDueDate={onSetDueDate}
            onSetReminder={onSetReminder}
            onMarkWaiting={onMarkWaiting}
            onClearWaiting={onClearWaiting}
            onSetPriority={onSetPriority}
            onUpdateNotes={onUpdateNotes}
            onUpdateText={onUpdateText}
            onUpdateSubtasks={onUpdateSubtasks}
            onToggle={onToggle}
            onDuplicate={onDuplicate}
            onSetRecurrence={onSetRecurrence}
            onUpdateAttachments={onUpdateAttachments}
            onSaveAsTemplate={onSaveAsTemplate}
            onEmailCustomer={onEmailCustomer}
            onOpenDetail={onOpenDetail}
            showBulkActions={showBulkActions}
            selectedTodos={selectedTodos}
            onSelectTodo={onSelectTodo}
            useSectionedView={useSectionedView}
          />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

export default memo(TodoListContent);
