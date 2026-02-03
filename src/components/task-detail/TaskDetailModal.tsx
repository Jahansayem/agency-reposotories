'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../ui/Modal';
import type { Todo, AuthUser, WaitingContactType, Attachment } from '@/types/todo';
import { MAX_ATTACHMENTS_PER_TODO } from '@/types/todo';
import { useTaskDetail } from './useTaskDetail';
import { usePermission } from '@/hooks/usePermission';
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
  todo: Todo | null;
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

const sectionStagger = {
  hidden: { opacity: 0, y: 4 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.04 * i, duration: 0.15 },
  }),
};

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

  // Permission checks
  const canDeleteTasks = usePermission('can_delete_tasks');
  const canEditAnyTask = usePermission('can_edit_any_task');
  const canAssignTasks = usePermission('can_assign_tasks');
  const canUseAiFeatures = usePermission('can_use_ai_features');

  // Derived permission: user owns the task OR has the general permission
  const isOwner = useMemo(() => {
    return todo ? todo.created_by === currentUser?.name : false;
  }, [todo, currentUser?.name]);

  const canDelete = canDeleteTasks || isOwner;
  const canEdit = canEditAnyTask || isOwner;

  const detail = useTaskDetail({
    todo: todo!,  // Assert non-null since parent guards with conditional render
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

  // Guard against null todo after hooks
  if (!todo) {
    return null;
  }

  const handleDelete = useCallback(() => {
    detail.deleteTodo();
    onClose();
  }, [detail, onClose]);

  const handleToggleComplete = useCallback(() => {
    detail.toggleComplete();
  }, [detail]);

  const handleClose = useCallback(() => {
    // Save any pending notes before closing
    detail.saveNotes();
    onClose();
  }, [detail, onClose]);

  // Stub for subtask import -- opens no UI in the modal for now
  const handleImportSubtasks = useCallback(() => {
    // Could integrate ContentToSubtasksImporter in the future
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={todo.text}
      size="2xl"
      showCloseButton={false}
      className="flex flex-col h-[92vh] sm:h-[85vh]"
    >
      {/* Header with overflow menu positioned inside a relative container */}
      <div className="relative">
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
          canEdit={canEdit}
        />

        {/* Overflow dropdown menu -- inside the relative header wrapper */}
        <OverflowMenu
          isOpen={overflowOpen}
          onToggle={() => setOverflowOpen(!overflowOpen)}
          onDelete={handleDelete}
          onDuplicate={detail.duplicate}
          onSaveAsTemplate={detail.saveAsTemplate}
          onEmailCustomer={canUseAiFeatures ? detail.emailCustomer : undefined}
          onSnooze={detail.snooze}
          completed={todo.completed}
          canDelete={canDelete}
        />
      </div>

      {/* Scrollable body with gradient fade hints */}
      <div className="relative flex-1 min-h-0">
        {/* Top fade */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[var(--surface)] to-transparent" />

        <div className="absolute inset-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
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
            canEdit={canEdit}
            canAssign={canAssignTasks}
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
          <div className="border-t border-[var(--border)] my-4" />

          {/* Notes section */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={sectionStagger}
            className="bg-[var(--surface-2)]/30 rounded-xl p-4 border border-[var(--border)]/50"
          >
            <NotesSection
              notes={detail.notes}
              onNotesChange={detail.setNotes}
              onSaveNotes={detail.saveNotes}
              transcription={todo.transcription}
              canEdit={canEdit}
            />
          </motion.div>

          {/* Subtasks section */}
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={sectionStagger}
            className="bg-[var(--surface-2)]/30 rounded-xl p-4 border border-[var(--border)]/50"
          >
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
              canEdit={canEdit}
            />
          </motion.div>

          {/* Attachments section */}
          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={sectionStagger}
            className="bg-[var(--surface-2)]/30 rounded-xl p-4 border border-[var(--border)]/50"
          >
            <AttachmentsSection
              attachments={detail.attachments}
              todoId={todo.id}
              currentUserName={currentUser.name}
              maxAttachments={MAX_ATTACHMENTS_PER_TODO}
              onUpdateAttachments={detail.onUpdateAttachments}
              canEdit={canEdit}
            />
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-[var(--surface)] to-transparent" />
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
