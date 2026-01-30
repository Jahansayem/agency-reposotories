'use client';

import { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import type { Todo, AuthUser, WaitingContactType, Attachment } from '@/types/todo';
import { MAX_ATTACHMENTS_PER_TODO } from '@/types/todo';
import { useTaskDetail } from './useTaskDetail';
import TaskDetailHeader from './TaskDetailHeader';
import MetadataSection from './MetadataSection';
import ReminderRow from './ReminderRow';
import WaitingRow from './WaitingRow';
import NotesSection from './NotesSection';
import SubtasksSection from './SubtasksSection';
import AttachmentsSection from './AttachmentsSection';
import OverflowMenu from './OverflowMenu';
import TaskDetailFooter from './TaskDetailFooter';

export interface TaskDetailModalProps {
  todo: Todo;
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  users: string[];
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

export default function TaskDetailModal({
  todo,
  isOpen,
  onClose,
  currentUser,
  users,
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
}: TaskDetailModalProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const detail = useTaskDetail({
    todo,
    currentUser,
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
  });

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    detail.deleteTodo();
    onClose();
  }, [confirmDelete, detail, onClose]);

  const handleToggleComplete = useCallback(() => {
    detail.toggleComplete();
  }, [detail]);

  const handleClose = useCallback(() => {
    // Save any pending notes before closing
    detail.saveNotes();
    onClose();
  }, [detail, onClose]);

  // Stub for subtask import — opens no UI in the modal for now
  const handleImportSubtasks = useCallback(() => {
    // Could integrate ContentToSubtasksImporter in the future
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={todo.text}
      size="lg"
      showCloseButton={false}
      className="flex flex-col"
    >
      {/* Header with priority bar, editable title, close & overflow */}
      <TaskDetailHeader
        title={detail.title}
        priority={todo.priority}
        completed={todo.completed}
        editingTitle={detail.editingTitle}
        onTitleChange={detail.setTitle}
        onSaveTitle={detail.saveTitle}
        onStartEditTitle={() => detail.setEditingTitle(true)}
        onCancelEditTitle={() => {
          detail.setTitle(todo.text);
          detail.setEditingTitle(false);
        }}
        onClose={handleClose}
        onOverflowClick={() => setOverflowOpen(!overflowOpen)}
        todoText={todo.text}
      />

      {/* Overflow dropdown menu */}
      <OverflowMenu
        isOpen={overflowOpen}
        onToggle={() => setOverflowOpen(!overflowOpen)}
        onDelete={handleDelete}
        onDuplicate={detail.duplicate}
        onSaveAsTemplate={detail.saveAsTemplate}
        onEmailCustomer={detail.emailCustomer}
        onSnooze={detail.snooze}
        completed={todo.completed}
      />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {/* Key-value metadata rows */}
        <MetadataSection
          todo={todo}
          users={users}
          dueDateStatus={detail.dueDateStatus}
          onStatusChange={detail.setStatus}
          onPriorityChange={detail.setPriority}
          onDueDateChange={detail.setDueDate}
          onAssignChange={detail.setAssignedTo}
          onRecurrenceChange={detail.setRecurrence}
          onSnooze={detail.snooze}
        />

        {/* Reminder row */}
        <ReminderRow
          reminderAt={todo.reminder_at}
          dueDate={todo.due_date || undefined}
          completed={todo.completed}
          onSetReminder={detail.setReminder}
        />

        {/* Waiting for response row */}
        {onMarkWaiting && onClearWaiting && (
          <WaitingRow
            todo={todo}
            onMarkWaiting={detail.markWaiting}
            onClearWaiting={detail.clearWaiting}
          />
        )}

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)] my-3" />

        {/* Notes section */}
        <NotesSection
          notes={detail.notes}
          onNotesChange={detail.setNotes}
          onSaveNotes={detail.saveNotes}
          transcription={todo.transcription}
        />

        {/* Subtasks section */}
        <SubtasksSection
          subtasks={detail.subtasks}
          completedCount={detail.completedSubtasks}
          progress={detail.subtaskProgress}
          newSubtaskText={detail.newSubtaskText}
          onNewSubtaskTextChange={detail.setNewSubtaskText}
          onAddSubtask={detail.addSubtask}
          onToggleSubtask={detail.toggleSubtask}
          onDeleteSubtask={detail.deleteSubtask}
          onUpdateSubtaskText={detail.updateSubtaskText}
          onImportSubtasks={handleImportSubtasks}
        />

        {/* Attachments section */}
        <AttachmentsSection
          attachments={detail.attachments}
          todoId={todo.id}
          currentUserName={currentUser.name}
          maxAttachments={MAX_ATTACHMENTS_PER_TODO}
          onUpdateAttachments={detail.onUpdateAttachments}
        />
      </div>

      {/* Footer with timestamps and complete button */}
      <TaskDetailFooter
        createdBy={todo.created_by}
        createdAt={todo.created_at}
        updatedBy={todo.updated_by}
        updatedAt={todo.updated_at}
        completed={todo.completed}
        onToggleComplete={handleToggleComplete}
        onClose={handleClose}
      />
    </Modal>
  );
}
