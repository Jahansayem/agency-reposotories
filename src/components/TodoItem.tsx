'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Subtask, MAX_ATTACHMENTS_PER_TODO } from '@/types/todo';
import { IconButton } from '@/components/ui';
import AttachmentUpload from './AttachmentUpload';
import Celebration from './Celebration';
import ContentToSubtasksImporter from './ContentToSubtasksImporter';
import { haptics } from '@/lib/haptics';
import { checkboxVariants, DURATION } from '@/lib/animations';
import { usePermission } from '@/hooks/usePermission';

import { TodoItemProps, areTodoItemPropsEqual } from './todo-item/types';
import { getDueDateStatus } from './todo-item/utils';
import MetadataBadges from './todo-item/MetadataBadges';
import QuickInlineActions from './todo-item/QuickInlineActions';
import ActionsDropdownMenu from './todo-item/ActionsDropdownMenu';
import DeleteConfirmDialog from './todo-item/DeleteConfirmDialog';
import ExpandedPanel from './todo-item/ExpandedPanel';
import CollapsedPanels from './todo-item/CollapsedPanels';

function TodoItemComponent({
  todo,
  users,
  currentUserName,
  selected,
  autoExpand,
  onAutoExpandHandled,
  onSelect,
  onToggle,
  onDelete,
  onAssign,
  onSetDueDate,
  onSetPriority,
  onStatusChange,
  onUpdateText,
  onDuplicate,
  onUpdateNotes,
  onSetRecurrence,
  onUpdateSubtasks,
  onSaveAsTemplate,
  onUpdateAttachments,
  onEmailCustomer,
  onSetReminder,
  onSetPrivacy,
  onMarkWaiting,
  onClearWaiting,
  onOpenDetail,
}: TodoItemProps) {
  const [expanded, setExpanded] = useState(false);

  // Permission checks
  const canDeleteTasksPerm = usePermission('can_delete_tasks');
  const canDeleteOwnTasks = usePermission('can_delete_own_tasks');
  const canEditAnyTask = usePermission('can_edit_any_task');
  const canEditOwnTasks = usePermission('can_edit_own_tasks');
  const canAssignTasks = usePermission('can_assign_tasks');

  // Ownership check
  const isOwnTask = todo.created_by === currentUserName || todo.assigned_to === currentUserName;

  // Derived permissions
  const canEdit = canEditAnyTask || (canEditOwnTasks && isOwnTask);
  const canDeleteTasks = canDeleteTasksPerm || (canDeleteOwnTasks && isOwnTask);

  // Auto-expand when triggered from external navigation
  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
      onAutoExpandHandled?.();
    }
  }, [autoExpand, onAutoExpandHandled]);

  const [celebrating, setCelebrating] = useState(false);
  const [notes, setNotes] = useState(todo.notes || '');
  const [showNotes, setShowNotes] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showContentImporter, setShowContentImporter] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [text, setText] = useState(todo.text);

  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);

  const priority = todo.priority || 'medium';
  const status = todo.status || 'todo';
  const dueDateStatus = todo.due_date ? getDueDateStatus(todo.due_date, todo.completed) : null;

  // Subtask computations
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  // Cleanup long-press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Long-press handlers for mobile context menu
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('[role="button"]')
    ) {
      return;
    }

    longPressTimerRef.current = setTimeout(() => {
      haptics.heavy();
      setShowActionsMenu(true);
      setLongPressTriggered(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTimeout(() => {
      setLongPressTriggered(false);
    }, 100);
  }, []);

  const handleToggle = () => {
    if (!todo.completed) {
      setCelebrating(true);
      haptics.success();
    }
    onToggle(todo.id, !todo.completed);
  };

  const handleSaveText = () => {
    const trimmed = text.trim();
    if (onUpdateText && trimmed && trimmed !== todo.text) {
      onUpdateText(todo.id, trimmed);
    }
    setEditingText(false);
  };

  // Subtask handlers for collapsed panels
  const toggleSubtask = (subtaskId: string) => {
    if (!onUpdateSubtasks) return;
    const updated = subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onUpdateSubtasks(todo.id, updated);
  };

  const deleteSubtask = (subtaskId: string) => {
    if (!onUpdateSubtasks) return;
    const updated = subtasks.filter(s => s.id !== subtaskId);
    onUpdateSubtasks(todo.id, updated);
  };

  const updateSubtaskText = (subtaskId: string, newText: string) => {
    if (!onUpdateSubtasks) return;
    const updated = subtasks.map(s =>
      s.id === subtaskId ? { ...s, text: newText } : s
    );
    onUpdateSubtasks(todo.id, updated);
  };

  const handleAddImportedSubtasks = (importedSubtasks: Subtask[]) => {
    if (!onUpdateSubtasks) return;
    onUpdateSubtasks(todo.id, [...subtasks, ...importedSubtasks]);
    setShowSubtasks(true);
    setShowContentImporter(false);
  };

  // Sync local text state with todo.text when not editing
  useEffect(() => {
    if (!editingText) {
      setText(todo.text);
    }
  }, [todo.text, editingText]);

  // Sync local notes state with todo.notes when notes panel is closed
  useEffect(() => {
    if (!showNotes) {
      setNotes(todo.notes || '');
    }
  }, [todo.notes, showNotes]);

  // Priority-based left border color
  const getPriorityBorderClass = () => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-l-red-500';
      case 'high': return 'border-l-4 border-l-orange-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      case 'low': return 'border-l-4 border-l-blue-400';
      default: return 'border-l-4 border-l-slate-300 dark:border-l-slate-600';
    }
  };

  // Card styling based on priority x overdue status
  const getCardStyle = () => {
    const priorityBorder = getPriorityBorderClass();

    if (todo.completed) {
      return `bg-[var(--surface)] border-[var(--border-subtle)] opacity-75 ${priorityBorder}`;
    }
    if (selected) {
      return `border-[var(--accent)] bg-[var(--accent-light)] ${priorityBorder}`;
    }
    if (dueDateStatus === 'overdue') {
      const isUrgentPriority = priority === 'urgent';
      const isHighPriority = priority === 'high';
      const overdueBg = 'bg-[var(--danger-light)]';
      if (isUrgentPriority) {
        return `${overdueBg} border-red-500/50 border-4 urgent-pulse ${priorityBorder}`;
      }
      if (isHighPriority) {
        return `${overdueBg} border-red-500/40 border-[3px] ${priorityBorder}`;
      }
      return `${overdueBg} border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)] ${priorityBorder}`;
    }
    return `bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)] ${priorityBorder}`;
  };

  const isOverdue = dueDateStatus === 'overdue' && !todo.completed;

  return (
    <div
      id={`todo-${todo.id}`}
      data-testid="todo-item"
      role="listitem"
      className={`group relative rounded-[var(--radius-xl)] border transition-all duration-200 ${getCardStyle()} ${longPressTriggered ? 'ring-2 ring-[var(--accent)]/50' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <Celebration trigger={celebrating} onComplete={() => setCelebrating(false)} />
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Selection checkbox (for bulk actions) */}
        {onSelect && (
          <div className="relative flex items-center justify-center w-11 h-11 -m-2" style={{ touchAction: 'manipulation' }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(todo.id, e.target.checked)}
              aria-label={`Select task: ${todo.text}`}
              data-testid="todo-checkbox"
              className="w-4 h-4 rounded-[var(--radius-sm)] border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            />
            {selected && (
              <Check
                className="absolute w-3 h-3 text-white pointer-events-none"
                strokeWidth={3}
                aria-hidden="true"
              />
            )}
          </div>
        )}

        {/* Completion checkbox with animation */}
        <motion.button
          onClick={handleToggle}
          disabled={!canEdit}
          className={`relative w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${canEdit ? '' : 'opacity-50 cursor-not-allowed'}`}
          style={{ touchAction: 'manipulation' }}
          title={!canEdit ? 'You do not have permission to modify this task' : todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
          whileHover={canEdit ? { scale: 1.1 } : undefined}
          whileTap={canEdit ? { scale: 0.95 } : undefined}
          transition={{ duration: DURATION.fast }}
        >
          <motion.span
            className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center ${
              todo.completed
                ? 'bg-[var(--success)] border-[var(--success)] shadow-sm'
                : canEdit
                  ? 'border-[var(--border)] group-hover:border-[var(--success)] group-hover:bg-[var(--success)]/10 group-hover:shadow-md'
                  : 'border-[var(--border)]'
            }`}
            initial={false}
            animate={todo.completed ? 'checked' : 'unchecked'}
            variants={checkboxVariants}
          >
            <AnimatePresence mode="wait">
              {todo.completed && (
                <motion.span
                  key="checkmark"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: DURATION.fast, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Check className="w-5 h-5 sm:w-4 sm:h-4 text-white" strokeWidth={3} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </motion.button>

        {/* Content area - clickable to expand/open detail */}
        <div
          className="flex-1 min-w-0 cursor-pointer text-left"
          onClick={() => {
            if (onOpenDetail) {
              onOpenDetail(todo.id);
            } else {
              setExpanded(!expanded);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onOpenDetail) {
                onOpenDetail(todo.id);
              } else {
                setExpanded(!expanded);
              }
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`${todo.text}. Press Enter to ${onOpenDetail ? 'open details' : expanded ? 'collapse' : 'expand'} details`}
        >
          {editingText ? (
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleSaveText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveText();
                if (e.key === 'Escape') {
                  setText(todo.text);
                  setEditingText(false);
                }
              }}
              autoFocus
              className="input-refined w-full text-base sm:text-sm px-3 py-2 text-[var(--foreground)]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className={`font-semibold cursor-pointer line-clamp-2 ${
                todo.completed
                  ? 'text-[var(--text-light)] line-through'
                  : 'text-[var(--foreground)]'
              }`}
              title={todo.text}
            >
              {todo.text}
            </p>
          )}

          {/* Metadata badges row */}
          <MetadataBadges
            todo={todo}
            priority={priority}
            dueDateStatus={dueDateStatus}
            expanded={expanded}
            isOverdue={isOverdue}
            subtasks={subtasks}
            completedSubtasks={completedSubtasks}
            subtaskProgress={subtaskProgress}
            showSubtasks={showSubtasks}
            setShowSubtasks={setShowSubtasks}
            showNotes={showNotes}
            setShowNotes={setShowNotes}
            showTranscription={showTranscription}
            setShowTranscription={setShowTranscription}
            showAttachments={showAttachments}
            setShowAttachments={setShowAttachments}
          />
        </div>

        {/* Quick inline actions - visible on hover for incomplete tasks */}
        {!todo.completed && !showActionsMenu && (
          <QuickInlineActions
            todoId={todo.id}
            dueDate={todo.due_date}
            assignedTo={todo.assigned_to}
            priority={priority}
            users={users}
            canEdit={canEdit}
            canAssignTasks={canAssignTasks}
            onSetDueDate={onSetDueDate}
            onAssign={onAssign}
            onSetPriority={onSetPriority}
          />
        )}

        {/* Action buttons - expand and three-dot menu */}
        <div className="flex items-center gap-1">
          {/* Expand/collapse */}
          <IconButton
            variant="ghost"
            size="md"
            icon={expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse task details' : 'Expand task details'}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          />

          {/* Three-dot actions menu */}
          <ActionsDropdownMenu
            todo={todo}
            canEdit={canEdit}
            canDeleteTasks={canDeleteTasks}
            showActionsMenu={showActionsMenu}
            setShowActionsMenu={setShowActionsMenu}
            setExpanded={setExpanded}
            setEditingText={setEditingText}
            setShowDeleteConfirm={setShowDeleteConfirm}
            onUpdateText={onUpdateText}
            onDuplicate={onDuplicate}
            onSetDueDate={onSetDueDate}
            onSaveAsTemplate={onSaveAsTemplate}
            onEmailCustomer={onEmailCustomer}
            onSetPrivacy={onSetPrivacy}
            menuRef={menuRef}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          todoId={todo.id}
          todoText={todo.text}
          onDelete={onDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Collapsed panels (notes, transcription, subtasks, attachments) */}
      {!expanded && (
        <CollapsedPanels
          todo={todo}
          subtasks={subtasks}
          subtaskProgress={subtaskProgress}
          showNotes={showNotes}
          showTranscription={showTranscription}
          showSubtasks={showSubtasks}
          showAttachments={showAttachments}
          canEdit={canEdit}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onUpdateSubtaskText={updateSubtaskText}
          onUpdateAttachments={onUpdateAttachments}
        />
      )}

      {/* Expanded panel with all sections */}
      {expanded && (
        <ExpandedPanel
          todo={todo}
          users={users}
          priority={priority}
          status={status}
          dueDateStatus={dueDateStatus}
          subtasks={subtasks}
          completedSubtasks={completedSubtasks}
          subtaskProgress={subtaskProgress}
          notes={notes}
          setNotes={setNotes}
          canEdit={canEdit}
          canAssignTasks={canAssignTasks}
          canDeleteTasks={canDeleteTasks}
          onToggle={handleToggle}
          onSetPriority={onSetPriority}
          onSetDueDate={onSetDueDate}
          onAssign={onAssign}
          onStatusChange={onStatusChange}
          onDuplicate={onDuplicate}
          onSaveAsTemplate={onSaveAsTemplate}
          onEmailCustomer={onEmailCustomer}
          onUpdateNotes={onUpdateNotes}
          onSetRecurrence={onSetRecurrence}
          onUpdateSubtasks={onUpdateSubtasks}
          onUpdateAttachments={onUpdateAttachments}
          onSetReminder={onSetReminder}
          onMarkWaiting={onMarkWaiting}
          onClearWaiting={onClearWaiting}
          setExpanded={setExpanded}
          setShowDeleteConfirm={setShowDeleteConfirm}
          setShowContentImporter={setShowContentImporter}
          setShowAttachmentUpload={setShowAttachmentUpload}
        />
      )}

      {/* Content to Subtasks Importer Modal */}
      {showContentImporter && (
        <ContentToSubtasksImporter
          onClose={() => setShowContentImporter(false)}
          onAddSubtasks={handleAddImportedSubtasks}
          parentTaskText={todo.text}
        />
      )}

      {/* Attachment Upload Modal */}
      {showAttachmentUpload && onUpdateAttachments && (
        <AttachmentUpload
          todoId={todo.id}
          userName={currentUserName}
          onUploadComplete={(newAttachment) => {
            const updatedAttachments = [...(todo.attachments || []), newAttachment];
            onUpdateAttachments(todo.id, updatedAttachments, true);
          }}
          onClose={() => setShowAttachmentUpload(false)}
          currentAttachmentCount={todo.attachments?.length || 0}
          maxAttachments={MAX_ATTACHMENTS_PER_TODO}
        />
      )}
    </div>
  );
}

/**
 * Memoized TodoItem component.
 * Uses custom comparison to prevent unnecessary re-renders when todo list changes.
 * Only re-renders when the specific todo's relevant properties change.
 */
const TodoItem = memo(TodoItemComponent, areTodoItemPropsEqual);

export default TodoItem;
