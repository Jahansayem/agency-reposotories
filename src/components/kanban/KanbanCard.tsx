'use client';

import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Flag,
  User,
  Trash2,
  Clock,
  AlertCircle,
  FileText,
  Edit3,
  CheckSquare,
  Paperclip,
  Music,
  Mic,
} from 'lucide-react';
import { Todo, TodoPriority, PRIORITY_CONFIG } from '@/types/todo';
import { formatDueDate, isOverdue, isDueToday, isDueSoon, getSnoozeDate } from './kanbanUtils';

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
  const [showActions, setShowActions] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const handleSnooze = (days: number) => {
    onSetDueDate(todo.id, getSnoozeDate(days));
    setShowSnoozeMenu(false);
  };

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
  const subtaskCount = todo.subtasks?.length || 0;
  const completedSubtasks = todo.subtasks?.filter(s => s.completed).length || 0;
  const attachmentCount = todo.attachments?.length || 0;

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
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group rounded-[var(--radius-xl)] border-2 overflow-hidden transition-all cursor-grab active:cursor-grabbing bg-[var(--surface)] touch-manipulation ${
        isDragging
          ? 'shadow-2xl ring-2 ring-[var(--accent)] border-[var(--accent)]'
          : 'shadow-[var(--shadow-sm)] border-[var(--border-subtle)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-hover)]'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
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

            {/* "Has more" indicator - subtle dot when task has hidden content */}
            {(hasNotes || subtaskCount > 0 || attachmentCount > 0 || hasTranscription) && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-40 group-hover:opacity-0 transition-opacity"
                title="Hover for more details"
              />
            )}
          </div>

          {/* SECONDARY ROW: Hidden by default, revealed on hover - Progressive Disclosure */}
          {(hasNotes || subtaskCount > 0 || attachmentCount > 0 || hasTranscription) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                const hasAudio = todo.attachments?.some(a => a.file_type === 'audio');
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

          {/* Footer row - edit indicator */}
          <div className="flex items-center justify-end mt-2">
            <Edit3 className="w-3 h-3 text-[var(--text-light)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          </div>
        </div>

        {/* Quick actions */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-[var(--border-subtle)] overflow-hidden"
            >
              {/* Row 1: Date and Assignee */}
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={todo.due_date ? todo.due_date.split('T')[0] : ''}
                  onChange={(e) => onSetDueDate(todo.id, e.target.value || null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 text-sm sm:text-xs px-2 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] touch-manipulation"
                />
                <select
                  value={todo.assigned_to || ''}
                  onChange={(e) => onAssign(todo.id, e.target.value || null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 text-sm sm:text-xs px-2 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] touch-manipulation"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>
              {/* Row 2: Priority and Action Buttons */}
              <div className="flex items-center gap-2">
                <select
                  value={priority}
                  onChange={(e) => onSetPriority(todo.id, e.target.value as TodoPriority)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 text-sm sm:text-xs px-2 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] touch-manipulation"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                {/* Snooze button */}
                {!todo.completed && (
                  <div className="relative flex-shrink-0">
                    <motion.button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSnoozeMenu(!showSnoozeMenu);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-[var(--radius-lg)] hover:bg-amber-50 dark:hover:bg-amber-900/30 text-[var(--text-muted)] hover:text-amber-500 transition-colors touch-manipulation flex items-center justify-center"
                      aria-label="Snooze task"
                      title="Snooze (reschedule)"
                    >
                      <Clock className="w-5 h-5 sm:w-4 sm:h-4" />
                    </motion.button>
                    {showSnoozeMenu && (
                      <div
                        className="absolute right-0 bottom-full mb-1 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] z-50 py-1 min-w-[140px]"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSnooze(1); }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                        >
                          Tomorrow
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSnooze(2); }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                        >
                          In 2 Days
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSnooze(7); }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                        >
                          Next Week
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSnooze(30); }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                        >
                          Next Month
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <motion.button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(todo.id);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex-shrink-0 p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-[var(--radius-lg)] hover:bg-red-50 dark:hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-500 transition-colors touch-manipulation flex items-center justify-center"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
