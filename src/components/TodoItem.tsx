'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Calendar, User, Flag, Copy, MessageSquare, ChevronDown, ChevronUp, Repeat, ListTree, Plus, Mail, Pencil, FileText, Paperclip, Music, Mic, Clock, MoreVertical, AlertTriangle, Bell, BellOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Todo, TodoPriority, TodoStatus, PRIORITY_CONFIG, RecurrencePattern, Subtask, Attachment, MAX_ATTACHMENTS_PER_TODO, WaitingContactType } from '@/types/todo';
import { Badge, Button, IconButton } from '@/components/ui';
import AttachmentList from './AttachmentList';
import AttachmentUpload from './AttachmentUpload';
import Celebration from './Celebration';
import ReminderPicker from './ReminderPicker';
import ContentToSubtasksImporter from './ContentToSubtasksImporter';
import { WaitingStatusBadge, WaitingBadge } from './WaitingStatusBadge';
import { sanitizeTranscription } from '@/lib/sanitize';
import { haptics } from '@/lib/haptics';
import { triggerHaptic } from '@/lib/microInteractions';
import { checkboxVariants, checkmarkPathVariants, DURATION } from '@/lib/animations';
import { usePermission } from '@/hooks/usePermission';

// Map priority levels to Badge variants
const PRIORITY_TO_BADGE_VARIANT: Record<TodoPriority, 'danger' | 'warning' | 'info' | 'default'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

// Subtask item component with inline editing
interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
}

function SubtaskItem({ subtask, onToggle, onDelete, onUpdate }: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(subtask.text);

  const handleSave = () => {
    if (editText.trim() && editText.trim() !== subtask.text) {
      onUpdate(subtask.id, editText.trim());
    } else {
      setEditText(subtask.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(subtask.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-2.5 rounded-[var(--radius-md)] transition-colors ${
        subtask.completed ? 'bg-[var(--surface-2)] opacity-75' : 'bg-[var(--surface)]'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(subtask.id)}
        role="checkbox"
        aria-checked={subtask.completed}
        aria-label={`${subtask.completed ? 'Completed' : 'Incomplete'}: ${subtask.text}`}
        className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all touch-manipulation ${
          subtask.completed
            ? 'bg-[var(--accent)] border-[var(--accent)]'
            : 'border-[var(--border)] hover:border-[var(--accent)] active:border-[var(--accent)]'
        }`}
      >
        {subtask.completed && <Check className="w-4 h-4 sm:w-3 sm:h-3 text-white" strokeWidth={3} aria-hidden="true" />}
      </button>

      {/* Text or edit input */}
      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 text-sm px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-light)] bg-[var(--surface)] text-[var(--foreground)]"
        />
      ) : (
        <span
          onClick={() => !subtask.completed && setIsEditing(true)}
          className={`flex-1 text-sm leading-snug cursor-pointer ${
            subtask.completed ? 'text-[var(--text-light)] line-through' : 'text-[var(--foreground)] hover:text-[var(--accent)]'
          }`}
          title={subtask.completed ? undefined : 'Click to edit'}
        >
          {subtask.text}
        </span>
      )}

      {/* Estimated time */}
      {subtask.estimatedMinutes && !isEditing && (
        <span className="text-xs text-[var(--text-light)] whitespace-nowrap">{subtask.estimatedMinutes}m</span>
      )}

      {/* Edit button */}
      {!isEditing && !subtask.completed && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-light)] hover:text-[var(--accent)] active:text-[var(--accent-hover)] rounded transition-colors touch-manipulation opacity-0 group-hover:opacity-100 sm:opacity-100"
          aria-label="Edit subtask"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(subtask.id)}
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-light)] hover:text-[var(--danger)] active:text-[var(--danger)] rounded transition-colors touch-manipulation"
        aria-label="Delete subtask"
      >
        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

interface TodoItemProps {
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

const formatDueDate = (date: string, includeYear = false) => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDay = new Date(d);
  dueDay.setHours(0, 0, 0, 0);

  if (dueDay.getTime() === today.getTime()) return 'Today';
  if (dueDay.getTime() === tomorrow.getTime()) return 'Tomorrow';

  // Use "Dec 18, 2025" format for clarity
  const options: Intl.DateTimeFormatOptions = includeYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
};

// Calculate days overdue for severity display
const getDaysOverdue = (date: string): number => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getDueDateStatus = (date: string, completed: boolean): 'overdue' | 'today' | 'upcoming' | 'future' => {
  if (completed) return 'future';
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  d.setHours(0, 0, 0, 0);

  if (d < today) return 'overdue';
  if (d.getTime() === today.getTime()) return 'today';
  if (d <= weekFromNow) return 'upcoming';
  return 'future';
};

/**
 * Custom comparison function for React.memo
 * Only re-renders when essential todo properties change
 * This prevents all TodoItems from re-rendering when one item changes
 */
function areTodoItemPropsEqual(
  prevProps: TodoItemProps,
  nextProps: TodoItemProps
): boolean {
  // Check essential todo properties that affect display
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
  
  // Check other props that affect rendering
  if (
    prevProps.selected !== nextProps.selected ||
    prevProps.autoExpand !== nextProps.autoExpand ||
    prevProps.currentUserName !== nextProps.currentUserName
  ) {
    return false;
  }
  
  // Check users array (reference equality is fine for this)
  if (prevProps.users !== nextProps.users &&
      (prevProps.users.length !== nextProps.users.length ||
       prevProps.users.some((u, i) => u !== nextProps.users[i]))) {
    return false;
  }
  
  // Callbacks are typically stable (useCallback), so we skip checking them
  // If they change reference but are functionally the same, re-render is wasteful
  
  return true;
}

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
  onMarkWaiting,
  onClearWaiting,
  onOpenDetail,
}: TodoItemProps) {
  const [expanded, setExpanded] = useState(false);

  // Permission checks
  const canDeleteTasksPerm = usePermission('can_delete_tasks');
  const canEditAnyTask = usePermission('can_edit_any_task');
  const canAssignTasks = usePermission('can_assign_tasks');

  // Ownership check - users can always modify their own tasks
  const isOwner = todo.created_by === currentUserName;

  // Derived permissions combining permission flags with ownership
  const canEdit = canEditAnyTask || isOwner;
  const canDeleteTasks = canDeleteTasksPerm || isOwner;

  // Auto-expand when triggered from external navigation (e.g., dashboard task click)
  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
      // Notify parent that we've handled the auto-expand
      onAutoExpandHandled?.();
    }
  }, [autoExpand, onAutoExpandHandled]);
  const [celebrating, setCelebrating] = useState(false);
  const [notes, setNotes] = useState(todo.notes || '');
  const [showNotes, setShowNotes] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showContentImporter, setShowContentImporter] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [text, setText] = useState(todo.text);
  // Inline input saving states for loading feedback
  const [savingDate, setSavingDate] = useState(false);
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [savedField, setSavedField] = useState<'date' | 'assignee' | 'priority' | null>(null);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const menuFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteDescriptionId = `delete-dialog-description-${todo.id}`;
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const priority = todo.priority || 'medium';
  const status = todo.status || 'todo';
  void status; // Used for status-based logic elsewhere

  // Long-press context menu state (Issue #20)
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (menuFocusTimerRef.current) clearTimeout(menuFocusTimerRef.current);
      if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Long-press handlers for mobile context menu (Issue #20)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't trigger long-press if user is interacting with inputs or buttons
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
      // Haptic feedback for long-press activation
      haptics.heavy();

      // Open actions menu
      setShowActionsMenu(true);
      setLongPressTriggered(true);
    }, 500); // 500ms threshold
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Reset long-press state after a delay
    setTimeout(() => {
      setLongPressTriggered(false);
    }, 100);
  }, []);

  // Calculate dropdown position when menu opens
  useEffect(() => {
    if (showActionsMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      // For fixed positioning, use viewport-relative coordinates (no scroll offset needed)
      // getBoundingClientRect() already returns viewport-relative values
      const dropdownWidth = 180;
      let left = rect.right - dropdownWidth; // Align right edge
      let top = rect.bottom + 4; // 4px gap below button

      // Ensure dropdown doesn't go off-screen on the left
      if (left < 8) {
        left = 8;
      }

      // Ensure dropdown doesn't go off-screen on the right
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      // If dropdown would go below viewport, position it above the button
      const estimatedHeight = 280; // Approximate dropdown height
      if (top + estimatedHeight > window.innerHeight) {
        top = rect.top - estimatedHeight - 4;
      }

      setDropdownPosition({ top, left });
    } else {
      setDropdownPosition(null);
    }
  }, [showActionsMenu]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showActionsMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Check both the menu container and the portal dropdown
      const target = event.target as Node;
      const isInsideMenuRef = menuRef.current?.contains(target);
      const portalDropdown = document.getElementById(`todo-dropdown-${todo.id}`);
      const isInsidePortal = portalDropdown?.contains(target);

      if (!isInsideMenuRef && !isInsidePortal) {
        setShowActionsMenu(false);
        setShowSnoozeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu, todo.id]);

  // Keyboard navigation for dropdown menu
  useEffect(() => {
    if (!showActionsMenu) {
      setFocusedMenuIndex(-1);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const menuItems = menuItemsRef.current.filter(Boolean);
      const itemCount = menuItems.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedMenuIndex(prev => {
            const next = prev < itemCount - 1 ? prev + 1 : 0;
            menuItems[next]?.focus();
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedMenuIndex(prev => {
            const next = prev > 0 ? prev - 1 : itemCount - 1;
            menuItems[next]?.focus();
            return next;
          });
          break;
        case 'Escape':
          e.preventDefault();
          setShowActionsMenu(false);
          setShowSnoozeMenu(false);
          menuButtonRef.current?.focus();
          break;
        case 'Tab':
          // Close menu on tab out
          setShowActionsMenu(false);
          setShowSnoozeMenu(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showActionsMenu]);

  // Focus first menu item when menu opens
  useEffect(() => {
    if (showActionsMenu && menuItemsRef.current[0]) {
      // Small delay to ensure portal is rendered
      if (menuFocusTimerRef.current) clearTimeout(menuFocusTimerRef.current);
      menuFocusTimerRef.current = setTimeout(() => {
        menuItemsRef.current[0]?.focus();
        setFocusedMenuIndex(0);
      }, 10);
    }
  }, [showActionsMenu]);

  // Focus management for delete confirmation dialog
  useEffect(() => {
    if (showDeleteConfirm && deleteDialogRef.current) {
      // Focus the dialog when it opens
      deleteDialogRef.current.focus();
    }
  }, [showDeleteConfirm]);

  // Helper to get date offset for snooze
  const getSnoozeDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleSnooze = (days: number) => {
    onSetDueDate(todo.id, getSnoozeDate(days));
    setShowSnoozeMenu(false);
  };
  const priorityConfig = PRIORITY_CONFIG[priority];
  const dueDateStatus = todo.due_date ? getDueDateStatus(todo.due_date, todo.completed) : null;

  const handleToggle = () => {
    if (!todo.completed) {
      setCelebrating(true);
      // Haptic feedback for task completion
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

  const handleNotesBlur = () => {
    if (onUpdateNotes && notes !== todo.notes) {
      onUpdateNotes(todo.id, notes);
    }
  };

  // Subtask functions
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

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

  const addManualSubtask = () => {
    if (!onUpdateSubtasks || !newSubtaskText.trim()) return;
    const newSubtask: Subtask = {
      id: `${todo.id}-sub-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
      priority: 'medium',
    };
    onUpdateSubtasks(todo.id, [...subtasks, newSubtask]);
    setNewSubtaskText('');
  };

  const handleAddImportedSubtasks = (importedSubtasks: Subtask[]) => {
    if (!onUpdateSubtasks) return;
    // Merge imported subtasks with existing ones
    onUpdateSubtasks(todo.id, [...subtasks, ...importedSubtasks]);
    setShowSubtasks(true);
    setShowContentImporter(false);
  };

  // Sync local text state with todo.text when not editing - correct sync pattern
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

  // Priority-based left border color - always visible for quick scanning
  const getPriorityBorderClass = () => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-l-red-500';
      case 'high': return 'border-l-4 border-l-orange-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      case 'low': return 'border-l-4 border-l-blue-400';
      default: return 'border-l-4 border-l-slate-300 dark:border-l-slate-600';
    }
  };

  // Card styling based on priority × overdue status
  const getCardStyle = () => {
    const priorityBorder = getPriorityBorderClass();

    // Completed tasks - keep priority bar but fade overall
    if (todo.completed) {
      return `bg-white dark:bg-[#162236] border-[var(--border-subtle)] opacity-75 ${priorityBorder}`;
    }
    // Selected state
    if (selected) {
      return `border-[var(--accent)] bg-[var(--accent-light)] ${priorityBorder}`;
    }
    // Overdue severity hierarchy
    if (dueDateStatus === 'overdue') {
      const isUrgentPriority = priority === 'urgent';
      const isHighPriority = priority === 'high';
      const overdueBg = 'bg-[var(--danger-light)]';
      if (isUrgentPriority) {
        // CRITICAL OVERDUE URGENT: Pulse animation + thicker border (4px) for maximum urgency
        return `${overdueBg} border-red-500/50 border-4 urgent-pulse ${priorityBorder}`;
      }
      if (isHighPriority) {
        // HIGH PRIORITY OVERDUE: Full red background, thicker border
        return `${overdueBg} border-red-500/40 border-[3px] ${priorityBorder}`;
      }
      // Medium/Low overdue - priority bar + subtle styling
      return `${overdueBg} border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)] ${priorityBorder}`;
    }
    // Default card with priority border
    return `bg-white dark:bg-[#162236] border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)] ${priorityBorder}`;
  };

  // Check if task is overdue for metadata visibility
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
        {/* Selection checkbox (for bulk actions) - 44x44px touch target */}
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
            {/* Visible checkmark overlay for selected state */}
            {selected && (
              <Check
                className="absolute w-3 h-3 text-white pointer-events-none"
                strokeWidth={3}
                aria-hidden="true"
              />
            )}
          </div>
        )}

        {/* Completion checkbox - prominent one-click complete with 44x44px touch target */}
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
          {/* Visual checkbox with animation */}
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

        {/* Content - clickable div (not button) to avoid nesting buttons */}
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

          {/* Meta row - Progressive Disclosure: Essential info always visible */}
          {/* On narrow screens (<400px), use compact layout with smaller gaps and hidden secondary info */}
          <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap min-w-0">
            {/* PRIMARY ROW: Priority + Due Date + Assignee (always visible for quick scanning) */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-wrap">
              {/* Priority badge - compact on narrow screens */}
              <Badge
                variant={PRIORITY_TO_BADGE_VARIANT[priority]}
                size="sm"
                icon={<Flag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                className="flex-shrink-0"
              >
                <span className="hidden sm:inline">{priorityConfig.label}</span>
                <span className="sm:hidden">{priorityConfig.label.charAt(0)}</span>
              </Badge>

              {/* Due date - critical for decision-making */}
              {/* On narrow screens, hide overdue day count to save space */}
              {todo.due_date && dueDateStatus && (() => {
                const daysOverdue = dueDateStatus === 'overdue' ? getDaysOverdue(todo.due_date) : 0;
                const dueDateVariant = todo.completed
                  ? 'default'
                  : dueDateStatus === 'overdue'
                    ? 'danger'
                    : dueDateStatus === 'today'
                      ? 'warning'
                      : dueDateStatus === 'upcoming'
                        ? 'warning'
                        : 'default';
                const dueDateIcon = dueDateStatus === 'overdue' && !todo.completed
                  ? <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  : <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
                const overdueText = dueDateStatus === 'overdue' && !todo.completed
                  ? ` (${daysOverdue === 1 ? '1 day' : `${daysOverdue} days`})`
                  : '';
                return (
                  <Badge
                    variant={dueDateVariant}
                    size="sm"
                    icon={dueDateIcon}
                    pulse={dueDateStatus === 'overdue' && !todo.completed}
                    className="max-w-[120px] sm:max-w-none truncate"
                  >
                    <span className="truncate">
                      {formatDueDate(todo.due_date)}
                      <span className="hidden sm:inline">{overdueText}</span>
                    </span>
                  </Badge>
                );
              })()}

              {/* Assignee - always visible as it's key for knowing who owns the task */}
              {/* On narrow screens, show only first name initial + surname first 3 chars */}
              {todo.assigned_to && (
                <Badge
                  variant="brand"
                  size="sm"
                  icon={<User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                  className="flex-shrink-0 max-w-[80px] sm:max-w-none"
                >
                  <span className="truncate">{todo.assigned_to}</span>
                </Badge>
              )}

              {/* Waiting for response badge */}
              <WaitingBadge todo={todo} />

              {/* "Has more" indicator - subtle dot when task has hidden content */}
              {!expanded && (subtasks.length > 0 || todo.notes || todo.transcription || (Array.isArray(todo.attachments) && todo.attachments.length > 0) || todo.merged_from?.length) && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-40 group-hover:opacity-0 transition-opacity"
                  title="Hover for more details"
                />
              )}
            </div>

            {/* SECONDARY ROW: Hidden by default, revealed on hover - Progressive Disclosure */}
            {/* On very narrow screens (<640px), hide completely unless expanded to reduce clutter */}
            {/* Shows only when there's secondary metadata AND (hovered OR expanded) */}
            {(subtasks.length > 0 || todo.notes || todo.transcription || (Array.isArray(todo.attachments) && todo.attachments.length > 0) || todo.recurrence || (todo.reminder_at && !todo.reminder_sent && !todo.completed) || todo.merged_from?.length) && (
              <>
                {/* Separator - hidden on narrow screens, show on hover for desktop */}
                <div className={`w-px h-4 bg-[var(--border)] mx-1 hidden sm:block ${expanded || isOverdue ? 'sm:block' : 'sm:hidden sm:group-hover:block'}`} />

                {/* Secondary metadata - hidden on narrow screens unless expanded, show on hover for desktop */}
                <div className={`items-center gap-1 sm:gap-2 transition-opacity duration-200 ${
                  expanded
                    ? 'flex opacity-100'
                    : 'hidden sm:flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`}>
                  {/* Recurrence - indicates recurring task */}
                  {todo.recurrence && (
                    <Badge
                      variant="primary"
                      size="sm"
                      icon={<Repeat className="w-3 h-3" />}
                    >
                      {todo.recurrence}
                    </Badge>
                  )}

                  {/* Reminder indicator */}
                  {todo.reminder_at && !todo.reminder_sent && !todo.completed && (
                    <Badge
                      variant="info"
                      size="sm"
                      icon={<Bell className="w-3 h-3" />}
                    >
                      {(() => {
                        const reminderDate = new Date(todo.reminder_at);
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
                        const diffDays = Math.round((reminderDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                        if (diffDays === 0) {
                          return `Today ${reminderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                        } else if (diffDays === 1) {
                          return `Tomorrow`;
                        } else if (diffDays < 0) {
                          return 'Past';
                        } else {
                          return reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                      })()}
                    </Badge>
                  )}

                  {/* Subtasks indicator */}
                  {subtasks.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}
                      className="inline-flex items-center gap-1.5 touch-manipulation"
                    >
                      <Badge
                        variant={subtaskProgress === 100 ? 'success' : 'primary'}
                        size="sm"
                        icon={<ListTree className="w-3 h-3" />}
                        interactive
                      >
                        {completedSubtasks}/{subtasks.length}
                      </Badge>
                    </button>
                  )}

                  {/* Notes indicator */}
                  {todo.notes && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }}
                      className="touch-manipulation"
                    >
                      <Badge
                        variant="default"
                        size="sm"
                        icon={<MessageSquare className="w-3 h-3" />}
                        interactive
                      />
                    </button>
                  )}

                  {/* Transcription indicator */}
                  {todo.transcription && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowTranscription(!showTranscription); }}
                      className="touch-manipulation"
                    >
                      <Badge
                        variant="info"
                        size="sm"
                        icon={<Mic className="w-3 h-3" />}
                        interactive
                      />
                    </button>
                  )}

                  {/* Attachments indicator */}
                  {Array.isArray(todo.attachments) && todo.attachments.length > 0 && (() => {
                    const hasAudio = todo.attachments.some(a => a.file_type === 'audio');
                    const AttachmentIcon = hasAudio ? Music : Paperclip;
                    return (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAttachments(!showAttachments); }}
                        className="inline-flex items-center gap-1.5 touch-manipulation"
                      >
                        <Badge
                          variant={hasAudio ? 'info' : 'warning'}
                          size="sm"
                          icon={<AttachmentIcon className="w-3 h-3" />}
                          interactive
                        >
                          {todo.attachments.length}
                        </Badge>
                      </button>
                    );
                  })()}

                  {/* Merged indicator - shows task has history */}
                  {todo.merged_from && todo.merged_from.length > 0 && (
                    <Badge
                      variant="default"
                      size="sm"
                      icon={<ListTree className="w-3 h-3" />}
                    >
                      +{todo.merged_from.length}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

          {/* Quick inline actions - visible on hover for incomplete tasks (hide when menu is open) */}
          {!todo.completed && !showActionsMenu && (
            <div
              className="hidden sm:flex items-center gap-2 mt-2 pl-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Due date with loading/success feedback */}
              <div className="relative inline-flex items-center">
                <input
                  type="date"
                  value={todo.due_date ? todo.due_date.split('T')[0] : ''}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={async (e) => {
                    setSavingDate(true);
                    await onSetDueDate(todo.id, e.target.value || null);
                    setSavingDate(false);
                    setSavedField('date');
                    if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
                    savedFieldTimerRef.current = setTimeout(() => setSavedField(null), 1500);
                  }}
                  disabled={savingDate || !canEdit}
                  className={`text-xs px-2 py-1 rounded-[var(--radius-sm)] border bg-[var(--surface)] text-[var(--foreground)] outline-none transition-all ${
                    !canEdit
                      ? 'opacity-60 cursor-not-allowed'
                      : savingDate
                        ? 'border-[var(--accent)] opacity-70 cursor-wait'
                        : savedField === 'date'
                          ? 'border-[var(--success)]'
                          : 'border-[var(--border)] hover:border-[var(--accent)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]'
                  }`}
                  aria-label="Set due date"
                />
                {savingDate && (
                  <Loader2 className="absolute right-1 w-3 h-3 text-[var(--accent)] animate-spin" aria-hidden="true" />
                )}
                {savedField === 'date' && !savingDate && (
                  <CheckCircle2 className="absolute right-1 w-3 h-3 text-[var(--success)]" aria-hidden="true" />
                )}
              </div>

              {/* Assignee with loading/success feedback */}
              <div className="relative inline-flex items-center">
                <select
                  value={todo.assigned_to || ''}
                  onChange={async (e) => {
                    setSavingAssignee(true);
                    await onAssign(todo.id, e.target.value || null);
                    setSavingAssignee(false);
                    setSavedField('assignee');
                    if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
                    savedFieldTimerRef.current = setTimeout(() => setSavedField(null), 1500);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  disabled={savingAssignee || !canAssignTasks}
                  className={`text-xs px-2 py-1 pr-5 rounded-[var(--radius-sm)] border bg-[var(--surface)] text-[var(--foreground)] outline-none min-w-[90px] transition-all ${
                    !canAssignTasks ? 'opacity-60 cursor-not-allowed' : savingAssignee
                      ? 'border-[var(--accent)] opacity-70 cursor-wait'
                      : savedField === 'assignee'
                        ? 'border-[var(--success)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]'
                  }`}
                  aria-label="Assign task to user"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
                {savingAssignee && (
                  <Loader2 className="absolute right-1 w-3 h-3 text-[var(--accent)] animate-spin pointer-events-none" aria-hidden="true" />
                )}
                {savedField === 'assignee' && !savingAssignee && (
                  <CheckCircle2 className="absolute right-1 w-3 h-3 text-[var(--success)] pointer-events-none" aria-hidden="true" />
                )}
              </div>

              {/* Priority with loading/success feedback */}
              <div className="relative inline-flex items-center">
                <select
                  value={priority}
                  onChange={async (e) => {
                    setSavingPriority(true);
                    await onSetPriority(todo.id, e.target.value as TodoPriority);
                    setSavingPriority(false);
                    setSavedField('priority');
                    if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
                    savedFieldTimerRef.current = setTimeout(() => setSavedField(null), 1500);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  disabled={savingPriority || !canEdit}
                  className={`text-xs px-2 py-1 pr-5 rounded-[var(--radius-sm)] border bg-[var(--surface)] text-[var(--foreground)] outline-none transition-all ${
                    !canEdit ? 'opacity-60 cursor-not-allowed' : savingPriority
                      ? 'border-[var(--accent)] opacity-70 cursor-wait'
                      : savedField === 'priority'
                        ? 'border-[var(--success)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]'
                  }`}
                  aria-label="Set task priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                {savingPriority && (
                  <Loader2 className="absolute right-1 w-3 h-3 text-[var(--accent)] animate-spin pointer-events-none" aria-hidden="true" />
                )}
                {savedField === 'priority' && !savingPriority && (
                  <CheckCircle2 className="absolute right-1 w-3 h-3 text-[var(--success)] pointer-events-none" aria-hidden="true" />
                )}
              </div>
            </div>
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

          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <IconButton
              ref={menuButtonRef}
              variant="ghost"
              size="md"
              icon={<MoreVertical className="w-4 h-4" />}
              onClick={(e) => { e.stopPropagation(); setShowActionsMenu(!showActionsMenu); }}
              aria-label="Task actions"
              aria-haspopup="true"
              aria-expanded={showActionsMenu}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            />

            {/* Dropdown rendered via Portal to escape stacking context */}
            {showActionsMenu && dropdownPosition && typeof document !== 'undefined' && createPortal(
              (() => {
                // Reset menu items ref array for keyboard navigation
                menuItemsRef.current = [];
                let menuItemIndex = 0;

                return (
                  <div
                    id={`todo-dropdown-${todo.id}`}
                    role="menu"
                    aria-label="Task actions menu"
                    className="fixed bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xl py-1 min-w-[180px]"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                      zIndex: 99999,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Edit */}
                    {onUpdateText && canEdit && (
                      <button
                        ref={(el) => { menuItemsRef.current[menuItemIndex++] = el; }}
                        role="menuitem"
                        onClick={() => { setEditingText(true); setExpanded(true); setShowActionsMenu(false); }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--foreground)] flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                        Edit
                      </button>
                    )}

                    {/* Duplicate */}
                    {onDuplicate && (
                      <button
                        ref={(el) => { menuItemsRef.current[menuItemIndex++] = el; }}
                        role="menuitem"
                        onClick={() => { onDuplicate(todo); setShowActionsMenu(false); }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--foreground)] flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                        Duplicate
                      </button>
                    )}

                    {/* Snooze submenu */}
                    {!todo.completed && (
                      <div className="relative group/snooze" role="none">
                        <button
                          ref={(el) => { menuItemsRef.current[menuItemIndex++] = el; }}
                          role="menuitem"
                          aria-haspopup="true"
                          aria-expanded={showSnoozeMenu}
                          onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--foreground)] flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                          Snooze
                          <ChevronDown className="w-3 h-3 ml-auto text-[var(--text-muted)]" aria-hidden="true" />
                        </button>
                        {showSnoozeMenu && (
                          <div className="pl-6 py-1 border-t border-[var(--border)]" role="menu" aria-label="Snooze options">
                            <button role="menuitem" onClick={() => { handleSnooze(1); setShowActionsMenu(false); }} className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--text-muted)]">Tomorrow</button>
                            <button role="menuitem" onClick={() => { handleSnooze(2); setShowActionsMenu(false); }} className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--text-muted)]">In 2 Days</button>
                            <button role="menuitem" onClick={() => { handleSnooze(7); setShowActionsMenu(false); }} className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--text-muted)]">Next Week</button>
                            <button role="menuitem" onClick={() => { handleSnooze(30); setShowActionsMenu(false); }} className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--text-muted)]">Next Month</button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="h-px bg-[var(--border)] my-1" role="separator" aria-hidden="true" />

                    {/* Save as Template */}
                    {onSaveAsTemplate && (
                      <button
                        ref={(el) => { menuItemsRef.current[menuItemIndex++] = el; }}
                        role="menuitem"
                        onClick={() => { onSaveAsTemplate(todo); setShowActionsMenu(false); }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--foreground)] flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                        Save as Template
                      </button>
                    )}

                    {/* Email Customer */}
                    {onEmailCustomer && (
                      <button
                        ref={(el) => { menuItemsRef.current[menuItemIndex++] = el; }}
                        role="menuitem"
                        onClick={() => { onEmailCustomer(todo); setShowActionsMenu(false); }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none text-[var(--foreground)] flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                        Email Summary
                      </button>
                    )}

                    <div className="h-px bg-[var(--border)] my-1" role="separator" aria-hidden="true" />

                    {/* Delete - shows confirmation (gated on can_delete_tasks permission or own task) */}
                    {canDeleteTasks && (
                      <button
                        ref={(el) => { menuItemsRef.current[menuItemIndex++] = el; }}
                        role="menuitem"
                        onClick={() => { setShowDeleteConfirm(true); setShowActionsMenu(false); }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--danger-light)] focus:bg-[var(--danger-light)] focus:outline-none text-[var(--danger)] flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        Delete
                      </button>
                    )}
                  </div>
                );
              })(),
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div
            ref={deleteDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-dialog-title-${todo.id}`}
            aria-describedby={deleteDescriptionId}
            tabIndex={-1}
            className="bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-xl max-w-sm w-full p-6 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center" aria-hidden="true">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 id={`delete-dialog-title-${todo.id}`} className="font-semibold text-[var(--foreground)]">Delete Task?</h3>
                <p className="text-sm text-[var(--text-muted)]">This action cannot be undone.</p>
              </div>
            </div>
            <p id={deleteDescriptionId} className="text-sm text-[var(--text-muted)] mb-6 line-clamp-2">
              &ldquo;{todo.text}&rdquo;
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowDeleteConfirm(false)}
                fullWidth
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  haptics.heavy(); // Haptic feedback for destructive action
                  onDelete(todo.id);
                  setShowDeleteConfirm(false);
                }}
                fullWidth
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notes display */}
      {showNotes && todo.notes && (
        <div className="mx-4 mb-3 p-3 bg-[var(--surface-2)] rounded-[var(--radius-md)] text-sm text-[var(--text-muted)]">
          {todo.notes}
        </div>
      )}

      {/* Transcription display */}
      {showTranscription && todo.transcription && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent)]/5 rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
            <span className="text-sm font-medium text-[var(--accent)]">Voicemail Transcription</span>
          </div>
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
            {sanitizeTranscription(todo.transcription)}
          </p>
        </div>
      )}

      {/* Subtasks display - separate toggle when not expanded */}
      {!expanded && showSubtasks && subtasks.length > 0 && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent-light)] rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-[var(--accent)] mb-1">
              <span>Progress</span>
              <span>{subtaskProgress}%</span>
            </div>
            <div className="h-2 bg-[var(--accent)]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
          </div>

          {/* Subtask list */}
          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                onToggle={toggleSubtask}
                onDelete={deleteSubtask}
                onUpdate={updateSubtaskText}
              />
            ))}
          </div>
        </div>
      )}

      {/* Attachments display - separate toggle when not expanded */}
      {!expanded && showAttachments && Array.isArray(todo.attachments) && todo.attachments.length > 0 && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 bg-[var(--accent-gold-light)] rounded-[var(--radius-lg)] border border-[var(--accent-gold)]/10">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span className="text-sm font-medium text-[var(--accent-gold)]">Attachments</span>
            <span className="text-xs text-[var(--accent-gold)]/70">({todo.attachments.length})</span>
          </div>
          <AttachmentList
            attachments={todo.attachments}
            todoId={todo.id}
            onRemove={(attachmentId) => {
              if (onUpdateAttachments) {
                // skipDbUpdate=true because the DELETE API already updated the database
                const updated = todo.attachments?.filter(a => a.id !== attachmentId) || [];
                onUpdateAttachments(todo.id, updated, true);
              }
            }}
            canRemove={!!onUpdateAttachments && !todo.completed}
          />
        </div>
      )}

      {/* Expanded actions - redesigned with clear sections */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-[var(--border-subtle)]">

          {/* PRIMARY ACTION - Mark Done/Reopen prominently displayed */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant={todo.completed ? 'secondary' : 'primary'}
              size="md"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleToggle}
            >
              {todo.completed ? 'Reopen Task' : 'Mark Done'}
            </Button>

            {/* Secondary actions: Duplicate, Save Template */}
            <div className="flex items-center gap-2">
              {onDuplicate && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<Copy className="w-4 h-4" />}
                  onClick={() => onDuplicate(todo)}
                  aria-label="Duplicate task"
                />
              )}
              {onSaveAsTemplate && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={() => onSaveAsTemplate(todo)}
                  aria-label="Save as template"
                />
              )}
              {onEmailCustomer && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<Mail className="w-4 h-4" />}
                  onClick={() => onEmailCustomer(todo)}
                  aria-label="Email summary"
                />
              )}
            </div>
          </div>

          {/* SECTION 1: Core Fields - Compact Grid */}
          <div className="rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border-subtle)] p-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {/* Status */}
              {onStatusChange && (
                <div>
                  <label className="text-label text-[var(--text-muted)] mb-1 block">Status</label>
                  <select
                    value={status}
                    onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
                    className="input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)]"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="text-label text-[var(--text-muted)] mb-1 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => onSetPriority(todo.id, e.target.value as TodoPriority)}
                  className="input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Due date with overdue warning */}
              <div>
                <label className="text-label text-[var(--text-muted)] mb-1 block flex items-center gap-1.5">
                  Due Date
                  {dueDateStatus === 'overdue' && !todo.completed && (
                    <span className="inline-flex items-center gap-0.5 text-red-500">
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                      <span className="text-badge normal-case">Overdue</span>
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={todo.due_date ? todo.due_date.split('T')[0] : ''}
                  onChange={(e) => onSetDueDate(todo.id, e.target.value || null)}
                  className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${
                    dueDateStatus === 'overdue' && !todo.completed ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''
                  }`}
                />
              </div>

              {/* Assign to */}
              <div>
                <label className="text-label text-[var(--text-muted)] mb-1 block">Assigned To</label>
                <select
                  value={todo.assigned_to || ''}
                  onChange={(e) => onAssign(todo.id, e.target.value || null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  disabled={!canAssignTasks}
                  className={`input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)] ${!canAssignTasks ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>

              {/* Recurrence - half width */}
              {onSetRecurrence && (
                <div>
                  <label className="text-label text-[var(--text-muted)] mb-1 block">Repeat</label>
                  <select
                    value={todo.recurrence || ''}
                    onChange={(e) => onSetRecurrence(todo.id, (e.target.value || null) as RecurrencePattern)}
                    className="input-refined w-full text-sm px-2.5 py-1.5 text-[var(--foreground)]"
                  >
                    <option value="">No repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}

              {/* Reminder - half width */}
              {onSetReminder && !todo.completed && (
                <div>
                  <label className="text-label text-[var(--text-muted)] mb-1 block">Reminder</label>
                  <ReminderPicker
                    value={todo.reminder_at || undefined}
                    dueDate={todo.due_date || undefined}
                    onChange={(time) => onSetReminder(todo.id, time)}
                    compact
                  />
                </div>
              )}
            </div>

            {/* Waiting for Customer Response - inline */}
            {onMarkWaiting && onClearWaiting && !todo.completed && (
              <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
                <span className="text-label text-[var(--text-muted)] shrink-0">Customer Response</span>
                <WaitingStatusBadge
                  todo={todo}
                  onMarkWaiting={(contactType, followUpHours) => onMarkWaiting(todo.id, contactType, followUpHours)}
                  onClearWaiting={() => onClearWaiting(todo.id)}
                />
              </div>
            )}
          </div>

          {/* SECTION DIVIDER */}
          <div className="h-px bg-[var(--border)] my-3" />

          {/* SECTION 2: Notes - Prominent */}
          {onUpdateNotes && (
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] mb-2">
                <FileText className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes or context..."
                className="input-refined w-full text-sm leading-relaxed px-3 py-2.5 text-[var(--foreground)] resize-none"
                rows={4}
              />
            </div>
          )}

          {/* SECTION 3: Subtasks */}
          {onUpdateSubtasks && (
            <div className="mb-4 p-3 bg-[var(--accent-light)] rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                  <span className="text-sm font-medium text-[var(--accent)]">Subtasks</span>
                  {subtasks.length > 0 && (
                    <span className="text-xs text-[var(--accent)]/70">({completedSubtasks}/{subtasks.length})</span>
                  )}
                </div>
                <button
                  onClick={() => setShowContentImporter(true)}
                  className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-gold-light)] hover:bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  Import
                </button>
              </div>

              {/* Progress bar */}
              {subtasks.length > 0 && (
                <div className="mb-3">
                  <div className="h-2 bg-[var(--accent)]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-300"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Subtask list */}
              {subtasks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {subtasks.map((subtask) => (
                    <SubtaskItem
                      key={subtask.id}
                      subtask={subtask}
                      onToggle={toggleSubtask}
                      onDelete={deleteSubtask}
                      onUpdate={updateSubtaskText}
                    />
                  ))}
                </div>
              )}

              {/* Add subtask input - Enter to add, no separate button */}
              <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSubtaskText.trim()) {
                    addManualSubtask();
                  }
                }}
                placeholder="Add a subtask (press Enter)..."
                className="input-refined w-full text-sm px-3 py-2 text-[var(--foreground)]"
              />
            </div>
          )}

          {/* SECTION 4: Attachments */}
          {onUpdateAttachments && (
            <div className="mb-4 p-3 bg-[var(--accent-gold-light)] rounded-[var(--radius-lg)] border border-[var(--accent-gold)]/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span className="text-sm font-medium text-[var(--accent-gold)]">Attachments</span>
                  {Array.isArray(todo.attachments) && todo.attachments.length > 0 && (
                    <span className="text-xs text-[var(--accent-gold)]/70">
                      ({todo.attachments.length}/{MAX_ATTACHMENTS_PER_TODO})
                    </span>
                  )}
                </div>
                {(Array.isArray(todo.attachments) ? todo.attachments.length : 0) < MAX_ATTACHMENTS_PER_TODO && (
                  <button
                    onClick={() => setShowAttachmentUpload(true)}
                    className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Add
                  </button>
                )}
              </div>

              {/* Attachment list or drop zone */}
              {Array.isArray(todo.attachments) && todo.attachments.length > 0 ? (
                <AttachmentList
                  attachments={todo.attachments}
                  todoId={todo.id}
                  onRemove={(attachmentId) => {
                    const updated = todo.attachments?.filter(a => a.id !== attachmentId) || [];
                    onUpdateAttachments(todo.id, updated, true);
                  }}
                  canRemove={true}
                />
              ) : (
                <button
                  onClick={() => setShowAttachmentUpload(true)}
                  className="w-full p-4 border-2 border-dashed border-[var(--accent-gold)]/30 rounded-[var(--radius-md)] text-center hover:border-[var(--accent-gold)]/50 hover:bg-[var(--accent-gold)]/5 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-5 h-5 text-[var(--accent-gold)]/50 mx-auto mb-1" aria-hidden="true" />
                  <p className="text-xs text-[var(--accent-gold)]/70">
                    Drop files here or click to browse
                  </p>
                </button>
              )}
            </div>
          )}

          {/* SECTION 5: Metadata footer */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-3">
              {todo.created_by && <span>Created by {todo.created_by}</span>}
              {todo.created_at && (
                <span>• {new Date(todo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              )}
              {todo.updated_at && todo.updated_by && (
                <span className="hidden sm:inline">• Updated by {todo.updated_by}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {canDeleteTasks && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)]"
                >
                  Delete
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExpanded(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
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
            // Update local state with the new attachment and trigger activity logging
            // skipDbUpdate=true because the API already saved to database
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
 * Memoized TodoItem component
 * Uses custom comparison to prevent unnecessary re-renders when todo list changes
 * Only re-renders when the specific todo's relevant properties change
 */
const TodoItem = memo(TodoItemComponent, areTodoItemPropsEqual);

export default TodoItem;
