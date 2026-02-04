'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Flag,
  User,
  Clock,
  AlertCircle,
  FileText,
  CheckSquare,
  Paperclip,
  Music,
  Mic,
  GripVertical,
} from 'lucide-react';
import { Todo, TodoPriority, PRIORITY_CONFIG } from '@/types/todo';
import { formatDueDate, isOverdue, isDueToday, isDueSoon } from './kanbanUtils';

// ============================================
// SortableCard Props & Memo Comparison
// ============================================

export interface SortableCardProps {
  todo: Todo;
  users: string[];
  onDelete: (id: string) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
  onCardClick: (todo: Todo) => void;
  // Selection support
  showBulkActions?: boolean;
  isSelected?: boolean;
  onSelectTodo?: (id: string, selected: boolean) => void;
}

/**
 * Custom comparison for memoized SortableCard.
 * Prevents all Kanban cards from re-rendering when a single card changes.
 */
function areSortableCardPropsEqual(
  prevProps: SortableCardProps,
  nextProps: SortableCardProps,
): boolean {
  const prev = prevProps.todo;
  const next = nextProps.todo;

  if (
    prev.id !== next.id ||
    prev.text !== next.text ||
    prev.completed !== next.completed ||
    prev.status !== next.status ||
    prev.priority !== next.priority ||
    prev.due_date !== next.due_date ||
    prev.assigned_to !== next.assigned_to ||
    prev.notes !== next.notes ||
    prev.transcription !== next.transcription
  ) {
    return false;
  }

  // Subtasks: length + completion
  const pSub = prev.subtasks || [];
  const nSub = next.subtasks || [];
  if (pSub.length !== nSub.length) return false;
  for (let i = 0; i < pSub.length; i++) {
    if (pSub[i].completed !== nSub[i].completed) return false;
  }

  // Attachments: length only
  if ((prev.attachments?.length || 0) !== (next.attachments?.length || 0)) return false;

  // Selection state
  if (prevProps.isSelected !== nextProps.isSelected || prevProps.showBulkActions !== nextProps.showBulkActions) {
    return false;
  }

  // Users array: only if length changed
  if (prevProps.users !== nextProps.users && prevProps.users.length !== nextProps.users.length) {
    return false;
  }

  return true;
}

// ============================================
// SortableCard Component (memoized)
// ============================================

export const SortableCard = memo(function SortableCard({ todo, users, onDelete, onAssign, onSetDueDate, onSetPriority, onCardClick, showBulkActions, isSelected, onSelectTodo }: SortableCardProps) {
  // Removed hover-based showActions state - cards no longer expand on hover

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = todo.priority || 'medium';
  const priorityConfig = PRIORITY_CONFIG[priority];
  const overdue = todo.due_date && !todo.completed && isOverdue(todo.due_date);
  const hasNotes = todo.notes && todo.notes.trim().length > 0;
  const hasTranscription = todo.transcription && todo.transcription.trim().length > 0;
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];
  const subtaskCount = subtasks.length;
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const attachments = Array.isArray(todo.attachments) ? todo.attachments : [];
  const attachmentCount = attachments.length;

  // Handle click to open detail modal (not during drag)
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on action buttons
    if ((e.target as HTMLElement).closest('button, input, select')) {
      return;
    }
    onCardClick(todo);
  };

  return (
    <motion.div
      id={`todo-${todo.id}`}
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: priorityConfig.color }}
      {...attributes}
      {...listeners}
      initial={false}
      animate={{ opacity: isDragging ? 0.5 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group rounded-[var(--radius-xl)] border-l-4 border-y-2 border-r-2 overflow-hidden transition-all cursor-grab active:cursor-grabbing bg-[var(--surface)] touch-manipulation ${
        isDragging
          ? 'shadow-2xl ring-2 ring-[var(--accent)] border-[var(--accent)]'
          : 'shadow-[var(--shadow-sm)] border-[var(--border-subtle)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-hover)]'
      }`}
      onClick={handleCardClick}
    >
      <div className="p-3 sm:p-3">
        {/* Card content */}
        <div className="flex items-start gap-2">
          {/* Selection checkbox with 44x44px touch target for mobile accessibility */}
          {showBulkActions && onSelectTodo && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectTodo(todo.id, !isSelected);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-shrink-0 w-11 h-11 -m-3 flex items-center justify-center cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border)] hover:border-[var(--accent)]'
              }`}>
                {isSelected && <CheckSquare className="w-3 h-3" />}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-base sm:text-sm font-medium leading-snug ${
              todo.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--foreground)]'
            }`}>
              {todo.text}
            </p>

          {/* PRIMARY ROW: Essential info always visible for quick scanning */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {/* Priority */}
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium"
              style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
            >
              <Flag className="w-2.5 h-2.5" />
              {priorityConfig.label}
            </span>

            {/* Due date */}
            {todo.due_date && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${
                todo.completed
                  ? 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                  : overdue
                    ? 'bg-red-500 text-white'
                    : isDueToday(todo.due_date)
                      ? 'bg-orange-500 text-white'
                      : isDueSoon(todo.due_date)
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'text-[var(--text-muted)]'
              }`}>
                {overdue ? <AlertCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                {formatDueDate(todo.due_date)}
              </span>
            )}

            {/* Assignee - always visible as it's key for knowing who owns the task */}
            {todo.assigned_to && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                <User className="w-2.5 h-2.5" />
                {todo.assigned_to}
              </span>
            )}

          </div>

          {/* SECONDARY ROW: Always visible - shows additional task metadata */}
          {(hasNotes || subtaskCount > 0 || attachmentCount > 0 || hasTranscription) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {hasTranscription && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--accent)]">
                  <Mic className="w-3 h-3" />
                </span>
              )}
              {hasNotes && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-light)]">
                  <FileText className="w-3 h-3" />
                </span>
              )}
              {subtaskCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-light)]">
                  <CheckSquare className="w-3 h-3" />
                  {completedSubtasks}/{subtaskCount}
                </span>
              )}
              {attachmentCount > 0 && (() => {
                const hasAudio = attachments.some(a => a.file_type === 'audio');
                const AttachmentIcon = hasAudio ? Music : Paperclip;
                const colorClass = hasAudio ? 'text-[var(--accent)]' : 'text-amber-500 dark:text-amber-400';
                return (
                  <span className={`inline-flex items-center gap-1 text-xs ${colorClass}`}>
                    <AttachmentIcon className="w-3 h-3" />
                    {attachmentCount}
                  </span>
                );
              })()}
            </div>
          )}

          </div>
        </div>
      </div>
    </motion.div>
  );
}, areSortableCardPropsEqual);

// ============================================
// KanbanCard (Drag Overlay)
// ============================================

/**
 * Simplified card used in the DragOverlay to show a preview of the dragged item.
 */
export function KanbanCard({ todo }: { todo: Todo }) {
  const priority = todo.priority || 'medium';
  const priorityConfig = PRIORITY_CONFIG[priority];
  const overdue = todo.due_date && !todo.completed && isOverdue(todo.due_date);

  return (
    <div className="bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-2xl border-2 border-[var(--accent)] overflow-hidden ring-4 ring-[var(--accent)]/20">
      <div className="h-1.5" style={{ backgroundColor: priorityConfig.color }} />
      <div className="p-3">
        <p className="text-sm font-medium text-[var(--foreground)]">{todo.text}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium"
            style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
          >
            <Flag className="w-2.5 h-2.5" />
            {priorityConfig.label}
          </span>
          {todo.due_date && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${
              overdue
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-[var(--accent)]/10 text-[var(--accent)]'
            }`}>
              <Clock className="w-2.5 h-2.5" />
              {formatDueDate(todo.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
