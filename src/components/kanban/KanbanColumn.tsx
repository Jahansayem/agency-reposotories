'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Todo, TodoStatus, TodoPriority } from '@/types/todo';
import { SortableCard } from './KanbanCard';
import {
  columns,
  DateSection,
  dateSectionConfig,
  groupTodosByDateSection,
} from './kanbanUtils';
import { LucideIcon } from 'lucide-react';

// ============================================
// DroppableColumn (inner drop zone)
// ============================================

interface DroppableColumnProps {
  id: TodoStatus;
  children: React.ReactNode;
  color: string;
  isActive: boolean;
  isCurrentOver: boolean;
}

export function DroppableColumn({ id, children, color, isActive, isCurrentOver }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const showHighlight = isOver || isCurrentOver;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 p-2 sm:p-3 min-h-[180px] sm:min-h-[250px] space-y-2 sm:space-y-3 transition-all rounded-[var(--radius-lg)] ${
        showHighlight
          ? 'bg-[var(--surface-2)]'
          : isActive
            ? 'bg-[var(--surface-2)]/50'
            : 'bg-[var(--surface-2)]/30'
      }`}
      style={{
        borderLeft: showHighlight ? `4px solid ${color}` : isActive ? `4px solid ${color}40` : '4px solid transparent',
        borderRight: showHighlight ? `4px solid ${color}` : isActive ? `4px solid ${color}40` : '4px solid transparent',
        boxShadow: showHighlight ? `inset 0 0 0 2px ${color}` : 'none',
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// KanbanColumn (full column with header)
// ============================================

interface KanbanColumnProps {
  column: { id: TodoStatus; title: string; Icon: LucideIcon; color: string; bgColor: string };
  columnTodos: Todo[];
  users: string[];
  activeId: string | null;
  overId: string | null;
  onDelete: (id: string) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
  onCardClick: (todo: Todo) => void;
  showBulkActions?: boolean;
  selectedTodos?: Set<string>;
  onSelectTodo?: (id: string, selected: boolean) => void;
  useSectionedView?: boolean;
}

export function KanbanColumn({
  column,
  columnTodos,
  users,
  activeId,
  overId,
  onDelete,
  onAssign,
  onSetDueDate,
  onSetPriority,
  onCardClick,
  showBulkActions,
  selectedTodos,
  onSelectTodo,
  useSectionedView,
}: KanbanColumnProps) {
  return (
    <motion.div
      key={column.id}
      layout
      className="flex flex-col bg-[var(--surface)] rounded-[var(--radius-xl)] sm:rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] border-2 border-[var(--border-subtle)] overflow-hidden"
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b-2"
        style={{ backgroundColor: column.bgColor, borderColor: column.color + '30' }}
      >
        <div className="flex items-center gap-2">
          <column.Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: column.color }} />
          <h3 className="font-semibold text-sm sm:text-base text-[var(--foreground)]">
            {column.title}
          </h3>
        </div>
        <span
          className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-[var(--radius-lg)] text-xs sm:text-sm font-bold"
          style={{ backgroundColor: column.color, color: 'white' }}
        >
          {columnTodos.length}
        </span>
      </div>

      {/* Column body */}
      <SortableContext
        items={columnTodos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <DroppableColumn id={column.id} color={column.color} isActive={!!activeId} isCurrentOver={overId === column.id}>
          {useSectionedView ? (
            // Sectioned view - group by date
            (() => {
              const groupedTodos = groupTodosByDateSection(columnTodos);
              const sectionOrder: DateSection[] = ['overdue', 'today', 'upcoming', 'no_date'];
              const hasAnyTodos = columnTodos.length > 0;

              return (
                <>
                  {sectionOrder.map((sectionKey) => {
                    const sectionTodos = groupedTodos[sectionKey];
                    const config = dateSectionConfig[sectionKey];
                    if (sectionTodos.length === 0) return null;

                    return (
                      <div key={sectionKey} className="mb-2">
                        {/* Section header */}
                        <div
                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md mb-1"
                          style={{ backgroundColor: config.bgColor, color: config.color }}
                        >
                          <config.Icon className="w-3.5 h-3.5" />
                          <span>{config.label}</span>
                          <span className="ml-auto opacity-70">({sectionTodos.length})</span>
                        </div>
                        {/* Section cards */}
                        <AnimatePresence mode="popLayout">
                          {sectionTodos.map((todo) => (
                            <SortableCard
                              key={todo.id}
                              todo={todo}
                              users={users}
                              onDelete={onDelete}
                              onAssign={onAssign}
                              onSetDueDate={onSetDueDate}
                              onSetPriority={onSetPriority}
                              onCardClick={onCardClick}
                              showBulkActions={showBulkActions}
                              isSelected={selectedTodos?.has(todo.id)}
                              onSelectTodo={onSelectTodo}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {!hasAnyTodos && (
                    <EmptyColumnPlaceholder column={column} />
                  )}
                </>
              );
            })()
          ) : (
            // Flat view - no sections
            <>
              <AnimatePresence mode="popLayout">
                {columnTodos.map((todo) => (
                  <SortableCard
                    key={todo.id}
                    todo={todo}
                    users={users}
                    onDelete={onDelete}
                    onAssign={onAssign}
                    onSetDueDate={onSetDueDate}
                    onSetPriority={onSetPriority}
                    onCardClick={onCardClick}
                    showBulkActions={showBulkActions}
                    isSelected={selectedTodos?.has(todo.id)}
                    onSelectTodo={onSelectTodo}
                  />
                ))}
              </AnimatePresence>

              {columnTodos.length === 0 && (
                <EmptyColumnPlaceholder column={column} />
              )}
            </>
          )}
        </DroppableColumn>
      </SortableContext>
    </motion.div>
  );
}

// ============================================
// Empty Column Placeholder
// ============================================

function EmptyColumnPlaceholder({ column }: { column: { id: TodoStatus; Icon: LucideIcon; color: string; bgColor: string } }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-8 sm:py-12 text-[var(--text-muted)]"
    >
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-[var(--radius-xl)] flex items-center justify-center mb-2 sm:mb-3"
        style={{ backgroundColor: column.bgColor }}
      >
        <column.Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: column.color }} />
      </div>
      <p className="text-xs sm:text-sm font-medium">
        {column.id === 'done' ? 'Complete tasks to see them here' : 'Drop tasks here'}
      </p>
    </motion.div>
  );
}
