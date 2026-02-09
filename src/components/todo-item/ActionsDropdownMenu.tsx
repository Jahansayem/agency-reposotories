'use client';

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Copy, Clock, ChevronDown, FileText, Mail, Trash2, MoreVertical } from 'lucide-react';
import { Todo } from '@/types/todo';
import { IconButton } from '@/components/ui';
import { getSnoozeDate } from './utils';

export interface ActionsDropdownMenuProps {
  todo: Todo;
  canEdit: boolean;
  canDeleteTasks: boolean;
  showActionsMenu: boolean;
  setShowActionsMenu: (show: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setEditingText: (editing: boolean) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  onUpdateText?: (id: string, text: string) => void;
  onDuplicate?: (todo: Todo) => void;
  onSetDueDate: (id: string, dueDate: string | null) => void;
  onSaveAsTemplate?: (todo: Todo) => void;
  onEmailCustomer?: (todo: Todo) => void;
  /** Ref for the menu container (used for click-outside detection) */
  menuRef: RefObject<HTMLDivElement | null>;
}

export default function ActionsDropdownMenu({
  todo,
  canEdit,
  canDeleteTasks,
  showActionsMenu,
  setShowActionsMenu,
  setExpanded,
  setEditingText,
  setShowDeleteConfirm,
  onUpdateText,
  onDuplicate,
  onSetDueDate,
  onSaveAsTemplate,
  onEmailCustomer,
  menuRef,
}: ActionsDropdownMenuProps) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const menuFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (menuFocusTimerRef.current) clearTimeout(menuFocusTimerRef.current);
    };
  }, []);

  const handleSnooze = (days: number) => {
    onSetDueDate(todo.id, getSnoozeDate(days));
    setShowSnoozeMenu(false);
  };

  // Calculate dropdown position when menu opens
  useEffect(() => {
    if (showActionsMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 180;
      let left = rect.right - dropdownWidth;
      let top = rect.bottom + 4;

      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      const estimatedHeight = 280;
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
  }, [showActionsMenu, todo.id, menuRef, setShowActionsMenu]);

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
          setShowActionsMenu(false);
          setShowSnoozeMenu(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showActionsMenu, setShowActionsMenu]);

  // Focus first menu item when menu opens
  useEffect(() => {
    if (showActionsMenu && menuItemsRef.current[0]) {
      if (menuFocusTimerRef.current) clearTimeout(menuFocusTimerRef.current);
      menuFocusTimerRef.current = setTimeout(() => {
        menuItemsRef.current[0]?.focus();
        setFocusedMenuIndex(0);
      }, 10);
    }
  }, [showActionsMenu]);

  return (
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

              {/* Delete */}
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
  );
}
