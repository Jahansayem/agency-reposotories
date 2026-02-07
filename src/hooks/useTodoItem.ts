/**
 * useTodoItem Hook
 *
 * Extracted from TodoItem.tsx (Phase 3 Refactoring)
 * Consolidates all TodoItem state management and handlers:
 * - Expand/collapse state
 * - Edit mode state
 * - Saving/loading feedback states
 * - Menu states (actions, snooze, delete confirm)
 * - Section visibility (subtasks, attachments, notes, transcription)
 * - Handlers (snooze, duplicate, email, etc.)
 *
 * This hook reduces TodoItem.tsx complexity from 1,807 lines to ~200 lines.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Todo, TodoPriority, TodoStatus } from '@/types/todo';
import { triggerHaptic } from '@/lib/microInteractions';

export interface UseTodoItemOptions {
  todo: Todo;
  onDelete: (id: string) => void;
  onDuplicate?: (todo: Todo) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onEmailCustomer?: (todo: Todo) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSetPriority: (id: string, priority: TodoPriority) => void;
  onStatusChange?: (id: string, status: TodoStatus) => void;
  onUpdateText?: (id: string, text: string) => void;
}

export function useTodoItem({
  todo,
  onDelete,
  onDuplicate,
  onSaveAsTemplate,
  onEmailCustomer,
  onSetDueDate,
  onSetPriority,
  onStatusChange,
  onUpdateText,
}: UseTodoItemOptions) {
  // Expansion state
  const [expanded, setExpanded] = useState(false);

  // Edit states
  const [editingText, setEditingText] = useState(false);
  const [text, setText] = useState(todo.text);

  // Saving states for loading feedback
  const [savingDate, setSavingDate] = useState(false);
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [savedField, setSavedField] = useState<'date' | 'assignee' | 'priority' | null>(null);

  // Menu states
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Section visibility states
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);

  // Dropdown position for portal rendering
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // Refs for menu keyboard navigation and focus management
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const menuFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState(-1);

  // Long press detection for mobile actions
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Update text when todo changes (for controlled input)
   */
  useEffect(() => {
    setText(todo.text);
  }, [todo.text]);

  /**
   * Long press handlers for mobile
   */
  const handleLongPressStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic('heavy');
      setShowActionsMenu(true);
      setLongPressTriggered(true);
    }, 500); // 500ms threshold
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressTriggered(false);
  }, []);

  /**
   * Calculate dropdown position when menu opens
   */
  useEffect(() => {
    if (showActionsMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = 400; // Approximate max menu height

      // Check if menu would overflow bottom
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top: number;
      if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
        // Position below button
        top = rect.bottom + 4;
      } else {
        // Position above button
        top = rect.top - menuHeight;
      }

      setDropdownPosition({
        top,
        left: rect.left,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [showActionsMenu]);

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    if (!showActionsMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideMenuRef = menuRef.current?.contains(target);
      const portalDropdown = document.getElementById(`action-menu-portal-${todo.id}`);
      const isInsidePortal = portalDropdown?.contains(target);

      if (!isInsideMenuRef && !isInsidePortal) {
        setShowActionsMenu(false);
        setShowSnoozeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu, todo.id]);

  /**
   * Keyboard navigation for dropdown menu
   */
  useEffect(() => {
    if (!showActionsMenu) {
      setFocusedMenuIndex(-1);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedMenuIndex(prev => {
            const next = Math.min(prev + 1, menuItemsRef.current.length - 1);
            menuItemsRef.current[next]?.focus();
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedMenuIndex(prev => {
            const next = Math.max(prev - 1, 0);
            menuItemsRef.current[next]?.focus();
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
          setShowActionsMenu(false);
          setShowSnoozeMenu(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showActionsMenu]);

  /**
   * Focus first menu item when menu opens
   */
  useEffect(() => {
    if (showActionsMenu && menuItemsRef.current[0]) {
      if (menuFocusTimerRef.current) clearTimeout(menuFocusTimerRef.current);
      menuFocusTimerRef.current = setTimeout(() => {
        menuItemsRef.current[0]?.focus();
        setFocusedMenuIndex(0);
      }, 10);
    }
  }, [showActionsMenu]);

  /**
   * Auto-expand when subtasks/notes/attachments present
   */
  useEffect(() => {
    const hasSubtasks = todo.subtasks && todo.subtasks.length > 0;
    const hasNotes = todo.notes && todo.notes.trim().length > 0;
    const hasAttachments = todo.attachments && todo.attachments.length > 0;

    if (hasSubtasks) setShowSubtasks(true);
    if (hasNotes) setShowNotes(true);
    if (hasAttachments) setShowAttachments(true);
  }, [todo.subtasks, todo.notes, todo.attachments]);

  /**
   * Snooze task (set due date to future)
   */
  const handleSnooze = useCallback(async (days: number) => {
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + days);
    await onSetDueDate(todo.id, newDueDate.toISOString());
    setShowSnoozeMenu(false);
  }, [todo.id, onSetDueDate]);

  /**
   * Save edited text
   */
  const handleSaveText = useCallback(async () => {
    if (text.trim() === '' || text === todo.text) {
      setText(todo.text); // Revert if empty or unchanged
      setEditingText(false);
      return;
    }

    await onUpdateText?.(todo.id, text);
    setEditingText(false);
  }, [text, todo.text, todo.id, onUpdateText]);

  /**
   * Handle priority change with feedback
   */
  const handlePriorityChange = useCallback(async (priority: TodoPriority) => {
    setSavingPriority(true);
    await onSetPriority(todo.id, priority);
    setSavingPriority(false);
    setSavedField('priority');

    if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
    savedFieldTimerRef.current = setTimeout(() => setSavedField(null), 1500);
  }, [todo.id, onSetPriority]);

  /**
   * Handle due date change with feedback
   */
  const handleDueDateChange = useCallback(async (dueDate: string | null) => {
    setSavingDate(true);
    await onSetDueDate(todo.id, dueDate);
    setSavingDate(false);
    setSavedField('date');

    if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
    savedFieldTimerRef.current = setTimeout(() => setSavedField(null), 1500);
  }, [todo.id, onSetDueDate]);

  /**
   * Toggle expansion
   */
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  /**
   * Close all menus
   */
  const closeAllMenus = useCallback(() => {
    setShowActionsMenu(false);
    setShowSnoozeMenu(false);
    setShowDeleteConfirm(false);
  }, []);

  /**
   * Cleanup timers on unmount
   */
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (menuFocusTimerRef.current) clearTimeout(menuFocusTimerRef.current);
      if (savedFieldTimerRef.current) clearTimeout(savedFieldTimerRef.current);
    };
  }, []);

  return {
    // Expansion
    expanded,
    setExpanded,
    toggleExpanded,

    // Edit state
    editingText,
    setEditingText,
    text,
    setText,
    handleSaveText,

    // Saving states
    savingDate,
    savingAssignee,
    savingPriority,
    savedField,
    handlePriorityChange,
    handleDueDateChange,

    // Menu states
    showActionsMenu,
    setShowActionsMenu,
    showSnoozeMenu,
    setShowSnoozeMenu,
    showDeleteConfirm,
    setShowDeleteConfirm,
    dropdownPosition,

    // Section visibility
    showSubtasks,
    setShowSubtasks,
    showNotes,
    setShowNotes,
    showAttachments,
    setShowAttachments,
    showTranscription,
    setShowTranscription,

    // Refs for menu navigation
    menuRef,
    menuButtonRef,
    menuItemsRef,
    focusedMenuIndex,

    // Long press (mobile)
    longPressTriggered,
    handleLongPressStart,
    handleLongPressEnd,

    // Actions
    handleSnooze,
    closeAllMenus,
  };
}
