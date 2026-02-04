'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import {
  X,
  Check,
  Calendar,
  User,
  Flag,
  Clock,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  MoreHorizontal,
  ListChecks,
  FileText,
  Mic,
  Mail,
  AlertTriangle,
  Archive,
  Copy,
  Share2,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { Todo, TodoPriority, TodoStatus, Subtask, User as UserType, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/todo';
import { sanitizeTranscription } from '@/lib/sanitize';

// ===============================================================================
// TASK BOTTOM SHEET
// A mobile-optimized bottom sheet for viewing and editing task details
// Features:
// - Slides up from bottom of screen
// - Drag handle for dismissal via swipe down
// - Full task details with inline editing
// - Subtask management
// - Notes/attachments/transcription sections
// - Accessible with proper ARIA attributes
// ===============================================================================

interface TaskBottomSheetProps {
  task: Todo;
  users: UserType[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Todo>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onArchive?: (taskId: string) => Promise<void>;
  onGenerateEmail?: (task: Todo) => void;
}

// Threshold for dismissing the sheet (in pixels)
const DISMISS_THRESHOLD = 100;
// Velocity threshold for quick swipe dismiss
const VELOCITY_THRESHOLD = 500;

export default function TaskBottomSheet({
  task,
  users,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onArchive,
  onGenerateEmail,
}: TaskBottomSheetProps) {
  const { theme } = useTheme();
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Editing states
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(task.notes || '');
  const [newSubtask, setNewSubtask] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showAttachments, setShowAttachments] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Update local state when task changes
  useEffect(() => {
    setEditedText(task.text);
    setEditedNotes(task.notes || '');
  }, [task.id, task.text, task.notes]);

  // Reset animation when opening
  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0 });
    }
  }, [isOpen, controls]);

  // Handle body scroll lock when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard shortcuts and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const sheet = sheetRef.current;
    if (!sheet) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }

      // Cmd/Ctrl+Down to dismiss (macOS/Windows convention)
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        onClose();
      }

      // Tab focus trap
      if (e.key === 'Tab') {
        const focusableElements = sheet.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements).filter(
          (el) => el.offsetParent !== null && !el.hasAttribute('aria-hidden')
        );

        if (focusableArray.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableArray[0];
        const lastElement = focusableArray[focusableArray.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        if (e.shiftKey && activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        } else if (!sheet.contains(activeElement)) {
          // If focus is outside sheet, bring it back
          e.preventDefault();
          if (e.shiftKey) {
            lastElement.focus();
          } else {
            firstElement.focus();
          }
        }
      }
    };

    // Prevent mouse clicks outside from stealing focus
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sheet && !sheet.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [isOpen, onClose]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const shouldDismiss =
        info.offset.y > DISMISS_THRESHOLD || info.velocity.y > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        controls.start({ y: '100%' }).then(() => {
          onClose();
        });
      } else {
        controls.start({ y: 0 });
      }
    },
    [controls, onClose]
  );

  const handleSaveText = useCallback(async () => {
    if (editedText.trim() && editedText !== task.text) {
      setSaving(true);
      await onUpdate(task.id, { text: editedText.trim() });
      setSaving(false);
    }
    setIsEditingText(false);
  }, [task.id, task.text, editedText, onUpdate]);

  const handleSaveNotes = useCallback(async () => {
    if (editedNotes !== (task.notes || '')) {
      setSaving(true);
      await onUpdate(task.id, { notes: editedNotes });
      setSaving(false);
    }
    setIsEditingNotes(false);
  }, [task.id, task.notes, editedNotes, onUpdate]);

  const handleToggleComplete = useCallback(async () => {
    await onUpdate(task.id, { completed: !task.completed });
  }, [task.id, task.completed, onUpdate]);

  const handlePriorityChange = useCallback(
    async (priority: TodoPriority) => {
      await onUpdate(task.id, { priority });
    },
    [task.id, onUpdate]
  );

  const handleStatusChange = useCallback(
    async (status: TodoStatus) => {
      await onUpdate(task.id, { status });
    },
    [task.id, onUpdate]
  );

  const handleAssigneeChange = useCallback(
    async (assignedTo: string | null) => {
      await onUpdate(task.id, { assigned_to: assignedTo || undefined });
    },
    [task.id, onUpdate]
  );

  const handleAddSubtask = useCallback(async () => {
    if (!newSubtask.trim()) return;

    const newSubtaskItem: Subtask = {
      id: crypto.randomUUID(),
      text: newSubtask.trim(),
      completed: false,
      priority: 'medium',
    };

    await onUpdate(task.id, {
      subtasks: [...(task.subtasks || []), newSubtaskItem],
    });
    setNewSubtask('');
  }, [task.id, task.subtasks, newSubtask, onUpdate]);

  const handleToggleSubtask = useCallback(
    async (subtaskId: string) => {
      const updatedSubtasks = task.subtasks?.map((s) =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      );
      await onUpdate(task.id, { subtasks: updatedSubtasks });
    },
    [task.id, task.subtasks, onUpdate]
  );

  const handleDeleteSubtask = useCallback(
    async (subtaskId: string) => {
      const updatedSubtasks = task.subtasks?.filter((s) => s.id !== subtaskId);
      await onUpdate(task.id, { subtasks: updatedSubtasks });
    },
    [task.id, task.subtasks, onUpdate]
  );

  const handleDeleteTask = useCallback(async () => {
    await onDelete(task.id);
    onClose();
  }, [task.id, onDelete, onClose]);

  // Due date info
  const dueDateInfo = task.due_date
    ? (() => {
        const dueDate = new Date(task.due_date);
        const isOverdue = isPast(dueDate) && !isToday(dueDate) && !task.completed;
        return {
          formatted: format(dueDate, 'MMM d, yyyy'),
          relative: formatDistanceToNow(dueDate, { addSuffix: true }),
          isOverdue,
          isToday: isToday(dueDate),
        };
      })()
    : null;

  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={controls}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={`
              fixed inset-x-0 bottom-0 z-50
              max-h-[92vh] rounded-t-3xl overflow-hidden
              flex flex-col
              ${'bg-[var(--surface)]'}
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-sheet-title"
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
              aria-label="Drag to close"
            >
              <div
                className={`
                  w-10 h-1.5 rounded-full
                  ${'bg-gray-300'}
                `}
              />
            </div>

            {/* Header */}
            <header
              className={`
                flex items-center justify-between px-5 pb-3 border-b flex-shrink-0
                ${'border-gray-200'}
              `}
            >
              <div className="flex items-center gap-3">
                {/* Complete checkbox */}
                <button
                  onClick={handleToggleComplete}
                  className={`
                    w-7 h-7 rounded-[var(--radius-lg)] border-2 flex items-center justify-center
                    transition-all touch-manipulation
                    ${
                      task.completed
                        ? 'bg-[var(--success)] border-[var(--success)]'
                        : 'border-gray-300 dark:border-white/30 active:border-[var(--accent)]'
                    }
                  `}
                  aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {task.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>

                <h2
                  id="task-sheet-title"
                  className={`font-semibold ${'text-gray-900'}`}
                >
                  Task Details
                </h2>
              </div>

              <div className="flex items-center gap-1">
                {/* More actions */}
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className={`
                    p-2.5 rounded-[var(--radius-xl)] transition-colors touch-manipulation
                    ${
                      'text-gray-500 active:bg-gray-100'}
                  `}
                  aria-label="More actions"
                  aria-expanded={showMoreActions}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className={`
                    p-2.5 rounded-[var(--radius-xl)] transition-colors touch-manipulation
                    ${
                      'text-gray-500 active:bg-gray-100'}
                  `}
                  aria-label="Close task details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* More Actions Menu */}
            <AnimatePresence>
              {showMoreActions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`
                    overflow-hidden border-b flex-shrink-0
                    ${'border-gray-200 bg-gray-50'}
                  `}
                >
                  <div className="flex items-center justify-around px-4 py-3">
                    {onGenerateEmail && (
                      <button
                        onClick={() => {
                          onGenerateEmail(task);
                          setShowMoreActions(false);
                        }}
                        className={`
                          flex flex-col items-center gap-1 p-2 rounded-[var(--radius-xl)] touch-manipulation
                          ${'active:bg-gray-200'}
                        `}
                      >
                        <Mail
                          className={`w-5 h-5 ${'text-gray-600'}`}
                        />
                        <span
                          className={`text-xs ${'text-gray-500'}`}
                        >
                          Email
                        </span>
                      </button>
                    )}
                    {onArchive && (
                      <button
                        onClick={() => {
                          onArchive(task.id);
                          setShowMoreActions(false);
                        }}
                        className={`
                          flex flex-col items-center gap-1 p-2 rounded-[var(--radius-xl)] touch-manipulation
                          ${'active:bg-gray-200'}
                        `}
                      >
                        <Archive
                          className={`w-5 h-5 ${'text-gray-600'}`}
                        />
                        <span
                          className={`text-xs ${'text-gray-500'}`}
                        >
                          Archive
                        </span>
                      </button>
                    )}
                    <button
                      className={`
                        flex flex-col items-center gap-1 p-2 rounded-[var(--radius-xl)] touch-manipulation
                        ${'active:bg-gray-200'}
                      `}
                    >
                      <Copy
                        className={`w-5 h-5 ${'text-gray-600'}`}
                      />
                      <span
                        className={`text-xs ${'text-gray-500'}`}
                      >
                        Copy
                      </span>
                    </button>
                    <button
                      className={`
                        flex flex-col items-center gap-1 p-2 rounded-[var(--radius-xl)] touch-manipulation
                        ${'active:bg-gray-200'}
                      `}
                    >
                      <Share2
                        className={`w-5 h-5 ${'text-gray-600'}`}
                      />
                      <span
                        className={`text-xs ${'text-gray-500'}`}
                      >
                        Share
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
              <div className="px-5 py-4 space-y-5">
                {/* Task Title */}
                <section>
                  {isEditingText ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveText();
                          }
                          if (e.key === 'Escape') {
                            setEditedText(task.text);
                            setIsEditingText(false);
                          }
                        }}
                        autoFocus
                        className={`
                          w-full px-4 py-3 rounded-[var(--radius-xl)] border text-base font-medium
                          resize-none
                          ${
                            'bg-gray-50 border-gray-200 text-gray-900 focus:border-[var(--accent)]'}
                        `}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveText}
                          disabled={saving}
                          className="flex-1 px-4 py-2.5 rounded-[var(--radius-xl)] bg-[var(--accent)] text-white text-sm font-semibold active:brightness-90"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditedText(task.text);
                            setIsEditingText(false);
                          }}
                          className={`
                            px-4 py-2.5 rounded-[var(--radius-xl)] text-sm font-semibold
                            ${
                              'bg-gray-100 text-gray-600'}
                          `}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingText(true)}
                      className={`
                        w-full text-left text-lg font-semibold p-3 -m-3 rounded-[var(--radius-xl)]
                        transition-colors group touch-manipulation
                        ${task.completed ? 'line-through opacity-60' : ''}
                        ${
                          'text-gray-900 active:bg-gray-50'}
                      `}
                    >
                      {task.text}
                      <Edit3
                        className={`
                        inline-block w-4 h-4 ml-2 opacity-0 group-hover:opacity-50
                        ${'text-gray-900'}
                      `}
                      />
                    </button>
                  )}
                </section>

                {/* Properties */}
                <section className="space-y-3">
                  {/* Status */}
                  <PropertyRow
                    label="Status"
                    icon={<Clock className="w-4 h-4" />}
                  >
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e.target.value as TodoStatus)}
                      className={`
                        w-full px-3 py-2.5 rounded-[var(--radius-xl)] border text-sm font-medium
                        cursor-pointer appearance-none
                        ${
                          'bg-gray-50 border-gray-200 text-gray-900'}
                      `}
                    >
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <option key={value} value={value}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </PropertyRow>

                  {/* Priority */}
                  <PropertyRow
                    label="Priority"
                    icon={<Flag className="w-4 h-4" />}
                  >
                    <select
                      value={task.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as TodoPriority)}
                      className={`
                        w-full px-3 py-2.5 rounded-[var(--radius-xl)] border text-sm font-medium
                        cursor-pointer appearance-none
                        ${
                          'bg-gray-50 border-gray-200 text-gray-900'}
                      `}
                      style={{ color: priorityConfig.color }}
                    >
                      {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                        <option key={value} value={value} style={{ color: config.color }}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </PropertyRow>

                  {/* Assignee */}
                  <PropertyRow
                    label="Assigned to"
                    icon={<User className="w-4 h-4" />}
                  >
                    <select
                      value={task.assigned_to || ''}
                      onChange={(e) => handleAssigneeChange(e.target.value || null)}
                      className={`
                        w-full px-3 py-2.5 rounded-[var(--radius-xl)] border text-sm font-medium
                        cursor-pointer appearance-none
                        ${
                          'bg-gray-50 border-gray-200 text-gray-900'}
                      `}
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.name}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </PropertyRow>

                  {/* Due Date */}
                  <PropertyRow
                    label="Due date"
                    icon={<Calendar className="w-4 h-4" />}
                  >
                    <div className="relative">
                      <input
                        type="date"
                        value={task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''}
                        onChange={(e) =>
                          onUpdate(task.id, {
                            due_date: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          })
                        }
                        className={`
                          w-full px-3 py-2.5 rounded-[var(--radius-xl)] border text-sm font-medium
                          cursor-pointer
                          ${
                            'bg-gray-50 border-gray-200 text-gray-900'}
                          ${dueDateInfo?.isOverdue ? 'text-red-500' : ''}
                        `}
                      />
                      {dueDateInfo?.isOverdue && (
                        <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </PropertyRow>
                </section>

                {/* Subtasks Section */}
                <CollapsibleSection
                  title="Subtasks"
                  icon={<ListChecks className="w-4 h-4" />}
                  count={totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks}` : undefined}
                  isOpen={showSubtasks}
                  onToggle={() => setShowSubtasks(!showSubtasks)}
                >
                  <div className="space-y-2">
                    {/* Existing subtasks */}
                    {task.subtasks?.map((subtask) => (
                      <div
                        key={subtask.id}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] group
                          ${'active:bg-gray-50'}
                        `}
                      >
                        <button
                          onClick={() => handleToggleSubtask(subtask.id)}
                          className={`
                            w-5 h-5 rounded-[var(--radius-md)] border-2 flex items-center justify-center
                            transition-all flex-shrink-0 touch-manipulation
                            ${
                              subtask.completed
                                ? 'bg-[var(--success)] border-[var(--success)]'
                                : 'border-gray-300 dark:border-white/30 active:border-[var(--accent)]'
                            }
                          `}
                        >
                          {subtask.completed && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </button>

                        <span
                          className={`
                            flex-1 text-sm
                            ${subtask.completed ? 'line-through opacity-50' : ''}
                            ${'text-gray-700'}
                          `}
                        >
                          {subtask.text}
                        </span>

                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className={`
                            p-1.5 rounded-[var(--radius-lg)] touch-manipulation
                            ${
                              'text-gray-400 active:text-red-500 active:bg-red-50'}
                          `}
                          aria-label="Delete subtask"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {/* Add subtask input */}
                    <div className="flex items-center gap-2 pt-2">
                      <Plus
                        className={`w-4 h-4 flex-shrink-0 ${
                          'text-gray-400'}`}
                      />
                      <input
                        type="text"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubtask();
                          }
                        }}
                        placeholder="Add a subtask..."
                        className={`
                          flex-1 px-2 py-2 text-sm bg-transparent border-none outline-none
                          ${
                            'text-gray-900 placeholder-gray-400'}
                        `}
                      />
                      {newSubtask.trim() && (
                        <button
                          onClick={handleAddSubtask}
                          className="px-3 py-1.5 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-xs font-semibold touch-manipulation"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Notes Section */}
                <CollapsibleSection
                  title="Notes"
                  icon={<FileText className="w-4 h-4" />}
                  isOpen={showNotes}
                  onToggle={() => setShowNotes(!showNotes)}
                >
                  {isEditingNotes ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        placeholder="Add notes..."
                        autoFocus
                        className={`
                          w-full px-4 py-3 rounded-[var(--radius-xl)] border text-sm
                          resize-none min-h-[120px]
                          ${
                            'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--accent)]'}
                        `}
                        rows={5}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveNotes}
                          disabled={saving}
                          className="flex-1 px-4 py-2.5 rounded-[var(--radius-xl)] bg-[var(--accent)] text-white text-sm font-semibold active:brightness-90"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditedNotes(task.notes || '');
                            setIsEditingNotes(false);
                          }}
                          className={`
                            px-4 py-2.5 rounded-[var(--radius-xl)] text-sm font-semibold
                            ${
                              'bg-gray-100 text-gray-600'}
                          `}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className={`
                        w-full text-left text-sm p-4 rounded-[var(--radius-xl)]
                        transition-colors touch-manipulation
                        ${
                          task.notes
                            ? 'text-gray-700 active:bg-gray-50': 'text-gray-400 active:bg-gray-50 italic'}
                      `}
                    >
                      {task.notes || 'Tap to add notes...'}
                    </button>
                  )}
                </CollapsibleSection>

                {/* Transcription Section (if available) */}
                {task.transcription && (
                  <CollapsibleSection
                    title="Voicemail Transcription"
                    icon={<Mic className="w-4 h-4" />}
                    isOpen={true}
                    onToggle={() => {}}
                  >
                    <div
                      className={`
                        p-4 rounded-[var(--radius-xl)] text-sm italic
                        ${'bg-gray-50 text-gray-600'}
                      `}
                    >
                      &ldquo;{sanitizeTranscription(task.transcription)}&rdquo;
                    </div>
                  </CollapsibleSection>
                )}

                {/* Attachments Section */}
                {task.attachments && task.attachments.length > 0 && (
                  <CollapsibleSection
                    title="Attachments"
                    icon={<Paperclip className="w-4 h-4" />}
                    count={task.attachments.length.toString()}
                    isOpen={showAttachments}
                    onToggle={() => setShowAttachments(!showAttachments)}
                  >
                    <div className="space-y-2">
                      {task.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className={`
                            flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)]
                            ${'bg-gray-50'}
                          `}
                        >
                          <div
                            className={`
                              w-10 h-10 rounded-[var(--radius-xl)] flex items-center justify-center
                              ${'bg-gray-200'}
                            `}
                          >
                            <Paperclip
                              className={`w-5 h-5 ${
                                'text-gray-500'}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                'text-gray-900'}`}
                            >
                              {attachment.file_name}
                            </p>
                            <p
                              className={`text-xs ${
                                'text-gray-500'}`}
                            >
                              {(attachment.file_size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {/* Metadata */}
                <section
                  className={`
                    pt-4 border-t text-xs space-y-1
                    ${
                      'border-gray-200 text-gray-400'}
                  `}
                >
                  <p>
                    Created by {task.created_by}{' '}
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </p>
                  {task.updated_at && task.updated_by && (
                    <p>
                      Updated by {task.updated_by}{' '}
                      {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                    </p>
                  )}
                </section>
              </div>
            </div>

            {/* Footer Actions */}
            <footer
              className={`
                flex items-center justify-between px-5 py-4 border-t flex-shrink-0
                ${'border-gray-200'}
              `}
            >
              <button
                onClick={handleDeleteTask}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-xl)] text-sm font-semibold
                  transition-colors touch-manipulation
                  ${
                    'text-red-500 active:bg-red-50'}
                `}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>

              <button
                onClick={handleToggleComplete}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-xl)] text-sm font-semibold
                  transition-colors touch-manipulation
                  ${
                    task.completed
                      ? 'bg-gray-100 text-gray-700': 'bg-[var(--success)] text-white'
                  }
                `}
              >
                <Check className="w-4 h-4" />
                {task.completed ? 'Reopen' : 'Complete'}
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ===============================================================================
// HELPER COMPONENTS
// ===============================================================================

function PropertyRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          flex items-center gap-2 text-sm font-medium w-28 flex-shrink-0
          ${'text-gray-500'}
        `}
      >
        {icon}
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  count,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`
        rounded-[var(--radius-xl)] overflow-hidden
        ${'bg-gray-50'}
      `}
    >
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold
          transition-colors touch-manipulation
          ${'text-gray-700 active:bg-gray-100'}
        `}
        aria-expanded={isOpen}
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {count && (
          <span
            className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              ${'bg-gray-200 text-gray-600'}
            `}
          >
            {count}
          </span>
        )}
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
