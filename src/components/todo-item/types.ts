import { Todo, TodoPriority, TodoStatus, RecurrencePattern, Subtask, Attachment, WaitingContactType } from '@/types/todo';

export interface TodoItemProps {
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
}

/**
 * Custom comparison function for React.memo.
 * Only re-renders when essential todo properties change.
 * This prevents all TodoItems from re-rendering when one item changes.
 */
export function areTodoItemPropsEqual(
  prevProps: TodoItemProps,
  nextProps: TodoItemProps
): boolean {
  const prevTodo = prevProps.todo;
  const nextTodo = nextProps.todo;

  if (
    prevTodo.id !== nextTodo.id ||
    prevTodo.completed !== nextTodo.completed ||
    prevTodo.text !== nextTodo.text ||
    prevTodo.priority !== nextTodo.priority ||
    prevTodo.status !== nextTodo.status ||
    prevTodo.due_date !== nextTodo.due_date ||
    prevTodo.assigned_to !== nextTodo.assigned_to ||
    prevTodo.customer_name !== nextTodo.customer_name ||
    prevTodo.customer_segment !== nextTodo.customer_segment ||
    prevTodo.waiting_for_response !== nextTodo.waiting_for_response ||
    prevTodo.notes !== nextTodo.notes ||
    prevTodo.recurrence !== nextTodo.recurrence ||
    prevTodo.reminder_at !== nextTodo.reminder_at ||
    prevTodo.reminder_sent !== nextTodo.reminder_sent ||
    prevTodo.transcription !== nextTodo.transcription ||
    prevTodo.updated_at !== nextTodo.updated_at ||
    prevTodo.merged_from !== nextTodo.merged_from
  ) {
    return false;
  }

  // Check subtasks array (shallow comparison of length and completion states)
  const prevSubtasks = prevTodo.subtasks || [];
  const nextSubtasks = nextTodo.subtasks || [];
  if (prevSubtasks.length !== nextSubtasks.length) return false;
  for (let i = 0; i < prevSubtasks.length; i++) {
    if (
      prevSubtasks[i].id !== nextSubtasks[i].id ||
      prevSubtasks[i].completed !== nextSubtasks[i].completed ||
      prevSubtasks[i].text !== nextSubtasks[i].text
    ) {
      return false;
    }
  }

  // Check attachments array (shallow comparison)
  const prevAttachments = prevTodo.attachments || [];
  const nextAttachments = nextTodo.attachments || [];
  if (prevAttachments.length !== nextAttachments.length) return false;
  for (let i = 0; i < prevAttachments.length; i++) {
    if (prevAttachments[i].id !== nextAttachments[i].id) return false;
  }

  // Check callback references
  if (prevProps.onSelect !== nextProps.onSelect) {
    return false;
  }

  // Check other props that affect rendering
  if (
    prevProps.selected !== nextProps.selected ||
    prevProps.autoExpand !== nextProps.autoExpand ||
    prevProps.currentUserName !== nextProps.currentUserName
  ) {
    return false;
  }

  // Check users array
  if (prevProps.users !== nextProps.users &&
      (prevProps.users.length !== nextProps.users.length ||
       prevProps.users.some((u, i) => u !== nextProps.users[i]))) {
    return false;
  }

  return true;
}
