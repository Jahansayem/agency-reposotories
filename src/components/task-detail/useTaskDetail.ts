'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Todo, Subtask, TodoStatus, TodoPriority, RecurrencePattern, WaitingContactType, Attachment } from '@/types/todo';
import type { AuthUser } from '@/types/todo';

interface UseTaskDetailOptions {
  todo: Todo;
  currentUser: AuthUser;
  onUpdate: (id: string, updates: Partial<Todo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onComplete: (id: string, completed: boolean) => void;
  onMarkWaiting?: (id: string, contactType: WaitingContactType, followUpHours?: number) => Promise<void>;
  onClearWaiting?: (id: string) => Promise<void>;
  onSetReminder?: (id: string, reminderAt: string | null) => void;
  onDuplicate?: (todo: Todo) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onEmailCustomer?: (todo: Todo) => void;
  onUpdateAttachments?: (id: string, attachments: Attachment[], skipDbUpdate?: boolean) => void;
}

export function useTaskDetail({
  todo,
  onUpdate,
  onDelete,
  onComplete,
  onMarkWaiting,
  onClearWaiting,
  onSetReminder,
  onDuplicate,
  onSaveAsTemplate,
  onEmailCustomer,
  onUpdateAttachments,
}: UseTaskDetailOptions) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(todo.text);
  const [notes, setNotes] = useState(todo.notes || '');
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Sync local state with incoming prop changes (real-time updates)
  useEffect(() => {
    if (!editingTitle) setTitle(todo.text);
  }, [todo.text, editingTitle]);

  useEffect(() => {
    setNotes(todo.notes || '');
  }, [todo.notes]);

  const subtasks = useMemo(() => todo.subtasks || [], [todo.subtasks]);
  const attachments = useMemo(() => todo.attachments || [], [todo.attachments]);

  const completedSubtasks = useMemo(
    () => subtasks.filter((s) => s.completed).length,
    [subtasks]
  );

  const subtaskProgress = useMemo(
    () => (subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0),
    [completedSubtasks, subtasks.length]
  );

  // Title editing
  const saveTitle = useCallback(() => {
    if (title.trim() && title.trim() !== todo.text) {
      onUpdate(todo.id, { text: title.trim() });
    } else {
      setTitle(todo.text);
    }
    setEditingTitle(false);
  }, [title, todo.text, todo.id, onUpdate]);

  // Notes
  const saveNotes = useCallback(() => {
    if (notes !== (todo.notes || '')) {
      onUpdate(todo.id, { notes });
    }
  }, [notes, todo.notes, todo.id, onUpdate]);

  // Status / Priority / Due Date / Assigned
  const setStatus = useCallback(
    (status: TodoStatus) => onUpdate(todo.id, { status }),
    [todo.id, onUpdate]
  );

  const setPriority = useCallback(
    (priority: TodoPriority) => onUpdate(todo.id, { priority }),
    [todo.id, onUpdate]
  );

  const setDueDate = useCallback(
    (dueDate: string | null) => onUpdate(todo.id, { due_date: dueDate || undefined }),
    [todo.id, onUpdate]
  );

  const setAssignedTo = useCallback(
    (assignedTo: string | null) => onUpdate(todo.id, { assigned_to: assignedTo || undefined }),
    [todo.id, onUpdate]
  );

  const setRecurrence = useCallback(
    (recurrence: RecurrencePattern) => onUpdate(todo.id, { recurrence }),
    [todo.id, onUpdate]
  );

  // Subtask operations
  const toggleSubtask = useCallback(
    (subtaskId: string) => {
      const updated = subtasks.map((s) =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      );
      onUpdate(todo.id, { subtasks: updated });
    },
    [subtasks, todo.id, onUpdate]
  );

  const addSubtask = useCallback(() => {
    if (!newSubtaskText.trim()) return;
    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
      priority: 'medium',
    };
    onUpdate(todo.id, { subtasks: [...subtasks, newSubtask] });
    setNewSubtaskText('');
  }, [newSubtaskText, subtasks, todo.id, onUpdate]);

  const deleteSubtask = useCallback(
    (subtaskId: string) => {
      const updated = subtasks.filter((s) => s.id !== subtaskId);
      onUpdate(todo.id, { subtasks: updated });
    },
    [subtasks, todo.id, onUpdate]
  );

  const updateSubtaskText = useCallback(
    (subtaskId: string, text: string) => {
      const updated = subtasks.map((s) =>
        s.id === subtaskId ? { ...s, text } : s
      );
      onUpdate(todo.id, { subtasks: updated });
    },
    [subtasks, todo.id, onUpdate]
  );

  const addImportedSubtasks = useCallback(
    (imported: Subtask[]) => {
      onUpdate(todo.id, { subtasks: [...subtasks, ...imported] });
    },
    [subtasks, todo.id, onUpdate]
  );

  // Snooze
  const snooze = useCallback(
    (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      date.setHours(9, 0, 0, 0);
      onUpdate(todo.id, { due_date: date.toISOString() });
    },
    [todo.id, onUpdate]
  );

  // Completion
  const toggleComplete = useCallback(
    () => onComplete(todo.id, !todo.completed),
    [todo.id, todo.completed, onComplete]
  );

  // Delete
  const deleteTodo = useCallback(() => onDelete(todo.id), [todo.id, onDelete]);

  // Waiting
  const markWaiting = useCallback(
    (contactType: WaitingContactType, followUpHours?: number) => {
      return onMarkWaiting?.(todo.id, contactType, followUpHours) ?? Promise.resolve();
    },
    [todo.id, onMarkWaiting]
  );

  const clearWaiting = useCallback(
    () => onClearWaiting?.(todo.id) ?? Promise.resolve(),
    [todo.id, onClearWaiting]
  );

  // Reminder
  const setReminder = useCallback(
    (time: string | null) => onSetReminder?.(todo.id, time),
    [todo.id, onSetReminder]
  );

  // Quick actions
  const duplicate = useCallback(() => onDuplicate?.(todo), [todo, onDuplicate]);
  const saveAsTemplate = useCallback(() => onSaveAsTemplate?.(todo), [todo, onSaveAsTemplate]);
  const emailCustomer = useCallback(() => onEmailCustomer?.(todo), [todo, onEmailCustomer]);

  // Due date status
  const dueDateStatus = useMemo((): 'none' | 'overdue' | 'today' | 'future' => {
    if (!todo.due_date || todo.completed) return 'none';
    const due = new Date(todo.due_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    if (dueDay < today) return 'overdue';
    if (dueDay.getTime() === today.getTime()) return 'today';
    return 'future';
  }, [todo.due_date, todo.completed]);

  return {
    // Title
    editingTitle,
    setEditingTitle,
    title,
    setTitle,
    saveTitle,

    // Notes
    notes,
    setNotes,
    saveNotes,

    // Subtasks
    subtasks,
    completedSubtasks,
    subtaskProgress,
    newSubtaskText,
    setNewSubtaskText,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    updateSubtaskText,
    addImportedSubtasks,

    // Attachments
    attachments,

    // Metadata setters
    setStatus,
    setPriority,
    setDueDate,
    setAssignedTo,
    setRecurrence,
    snooze,

    // Completion & deletion
    toggleComplete,
    deleteTodo,

    // Waiting
    markWaiting,
    clearWaiting,

    // Reminder
    setReminder,

    // Quick actions
    duplicate,
    saveAsTemplate,
    emailCustomer,

    // Status helpers
    dueDateStatus,

    // Expose attachment handler for child components
    onUpdateAttachments,
  };
}
