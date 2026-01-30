'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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

const sectionStagger = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.2 },
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
      className="flex flex-col h-[85vh]"
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
        />

        {/* Overflow dropdown menu -- inside the relative header wrapper */}
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
      </div>

      {/* Scrollable body with gradient fade hints */}
      <div className="relative flex-1 min-h-0">
        {/* Top fade */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-[var(--surface)] to-transparent" />

        <div className="absolute inset-0 overflow-y-auto px-5 py-4 space-y-1">
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
          <div className="border-t border-[var(--border)] my-4" />

          {/* Notes section */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={sectionStagger}
          >
            <NotesSection
              notes={detail.notes}
              onNotesChange={detail.setNotes}
              onSaveNotes={detail.saveNotes}
              transcription={todo.transcription}
            />
          </motion.div>

          {/* Subtasks section */}
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={sectionStagger}
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
            />
          </motion.div>

          {/* Attachments section */}
          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={sectionStagger}
          >
            <AttachmentsSection
              attachments={detail.attachments}
              todoId={todo.id}
              currentUserName={currentUser.name}
              maxAttachments={MAX_ATTACHMENTS_PER_TODO}
              onUpdateAttachments={detail.onUpdateAttachments}
            />
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-[var(--surface)] to-transparent" />
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
