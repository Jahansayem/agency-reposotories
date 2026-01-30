'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import TodoItem from './TodoItem';
import { Todo, TodoPriority, TodoStatus, RecurrencePattern, Subtask, Attachment, WaitingContactType } from '@/types/todo';

interface SortableTodoItemProps {
  todo: Todo;
  users: string[];
  currentUserName: string;
  selected?: boolean;
  autoExpand?: boolean;
  onAutoExpandHandled?: () => void;
  onSelect?: (id: string, selected: boolean) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, assignedTo: string | null) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
  onStatusChange?: (id: string, status: TodoStatus) => void;
  onUpdateText?: (id: string, text: string) => void;
  onDuplicate?: (todo: Todo) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onSetRecurrence?: (id: string, recurrence: RecurrencePattern) => void;
  onUpdateSubtasks?: (id: string, subtasks: Subtask[]) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onUpdateAttachments?: (id: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
  onEmailCustomer?: (todo: Todo) => void;
  onSetReminder?: (id: string, reminderAt: string | null) => void;
  onMarkWaiting?: (id: string, contactType: WaitingContactType, followUpHours?: number) => Promise<void>;
  onClearWaiting?: (id: string) => Promise<void>;
  onOpenDetail?: (todoId: string) => void;
  isDragEnabled?: boolean;
}

/**
 * Custom comparison for React.memo.
 * Compares todo data properties that affect rendering and skips callback props
 * (callbacks are expected to be stable via useCallback in the parent).
 */
function areSortableTodoItemPropsEqual(
  prevProps: SortableTodoItemProps,
  nextProps: SortableTodoItemProps,
): boolean {
  const prevTodo = prevProps.todo;
  const nextTodo = nextProps.todo;

  if (
    prevTodo.id !== nextTodo.id ||
    prevTodo.text !== nextTodo.text ||
    prevTodo.completed !== nextTodo.completed ||
    prevTodo.status !== nextTodo.status ||
    prevTodo.priority !== nextTodo.priority ||
    prevTodo.due_date !== nextTodo.due_date ||
    prevTodo.assigned_to !== nextTodo.assigned_to ||
    prevTodo.waiting_for_response !== nextTodo.waiting_for_response ||
    prevTodo.notes !== nextTodo.notes ||
    prevTodo.recurrence !== nextTodo.recurrence ||
    prevTodo.reminder_at !== nextTodo.reminder_at ||
    prevTodo.reminder_sent !== nextTodo.reminder_sent ||
    prevTodo.transcription !== nextTodo.transcription ||
    prevTodo.updated_at !== nextTodo.updated_at
  ) {
    return false;
  }

  // Subtasks: compare length and individual completion/text
  const prevSub = prevTodo.subtasks || [];
  const nextSub = nextTodo.subtasks || [];
  if (prevSub.length !== nextSub.length) return false;
  for (let i = 0; i < prevSub.length; i++) {
    if (
      prevSub[i].id !== nextSub[i].id ||
      prevSub[i].completed !== nextSub[i].completed ||
      prevSub[i].text !== nextSub[i].text
    ) {
      return false;
    }
  }

  // Attachments: compare length
  const prevAtt = prevTodo.attachments || [];
  const nextAtt = nextTodo.attachments || [];
  if (prevAtt.length !== nextAtt.length) return false;

  // Non-todo props that affect rendering
  if (
    prevProps.selected !== nextProps.selected ||
    prevProps.autoExpand !== nextProps.autoExpand ||
    prevProps.currentUserName !== nextProps.currentUserName ||
    prevProps.isDragEnabled !== nextProps.isDragEnabled
  ) {
    return false;
  }

  // Users array: only re-render if length changed
  if (
    prevProps.users !== nextProps.users &&
    prevProps.users.length !== nextProps.users.length
  ) {
    return false;
  }

  return true;
}

const SortableTodoItem = memo(function SortableTodoItem({
  todo,
  isDragEnabled = true,
  ...props
}: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: !isDragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'shadow-2xl' : ''}`}
    >
      {isDragEnabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 text-[var(--text-light)] hover:text-[var(--foreground)]"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <div className={isDragEnabled ? 'pl-7' : ''}>
        <TodoItem todo={todo} {...props} />
      </div>
    </div>
  );
}, areSortableTodoItemPropsEqual);

export default SortableTodoItem;
