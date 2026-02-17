/**
 * Custom hook to manage TodoList keyboard shortcuts
 *
 * Extracts all keyboard handling logic:
 * - n: Focus new task input
 * - /: Focus search
 * - Escape: Clear selection / exit focus mode
 * - Cmd/Ctrl+A: Select all visible todos
 * - Cmd/Ctrl+Shift+F: Toggle focus mode
 * - Cmd/Ctrl+Shift+C: Complete focused task
 * - Cmd/Ctrl+Z: Undo last completion
 * - 1-4: Quick filter shortcuts
 *
 * This hook provides reusable, testable keyboard shortcut management.
 * Uses refs for callbacks and data to avoid re-registering the event listener
 * on every change while keeping data fresh.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Todo, QuickFilter } from '@/types/todo';
import { useTodoStore } from '@/store/todoStore';

interface UseTodoKeyboardShortcutsProps {
  visibleTodos: Todo[];
  showBulkActions: boolean;
  selectedTodos: Set<string>;
  setSearchQuery: (query: string) => void;
  setQuickFilter: (filter: QuickFilter) => void;
  setShowBulkActions: (show: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  openShortcuts: () => void;
  onToggleComplete?: (id: string, completed: boolean) => void;
  showToast?: (message: string) => void;
}

export function useTodoKeyboardShortcuts({
  visibleTodos,
  showBulkActions,
  selectedTodos,
  setSearchQuery,
  setQuickFilter,
  setShowBulkActions,
  setFocusMode,
  toggleFocusMode,
  clearSelection,
  selectAll,
  openShortcuts,
  onToggleComplete,
  showToast,
}: UseTodoKeyboardShortcutsProps) {

  // Track last completed task for undo
  const lastCompletedRef = useRef<{ id: string; text: string } | null>(null);

  // Bug 1 & 12: Ref-based approach for visibleTodos to avoid stale closures
  const visibleTodosRef = useRef(visibleTodos);
  visibleTodosRef.current = visibleTodos;

  // Bug 2: Store ALL callback props in refs to avoid stale closures
  const setSearchQueryRef = useRef(setSearchQuery);
  setSearchQueryRef.current = setSearchQuery;

  const setQuickFilterRef = useRef(setQuickFilter);
  setQuickFilterRef.current = setQuickFilter;

  const setShowBulkActionsRef = useRef(setShowBulkActions);
  setShowBulkActionsRef.current = setShowBulkActions;

  const setFocusModeRef = useRef(setFocusMode);
  setFocusModeRef.current = setFocusMode;

  const toggleFocusModeRef = useRef(toggleFocusMode);
  toggleFocusModeRef.current = toggleFocusMode;

  const clearSelectionRef = useRef(clearSelection);
  clearSelectionRef.current = clearSelection;

  const selectAllRef = useRef(selectAll);
  selectAllRef.current = selectAll;

  const openShortcutsRef = useRef(openShortcuts);
  openShortcutsRef.current = openShortcuts;

  const onToggleCompleteRef = useRef(onToggleComplete);
  onToggleCompleteRef.current = onToggleComplete;

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Refs for non-callback props that change frequently
  const showBulkActionsRef = useRef(showBulkActions);
  showBulkActionsRef.current = showBulkActions;

  const selectedTodosRef = useRef(selectedTodos);
  selectedTodosRef.current = selectedTodos;

  // Get the focused task ID from the DOM
  const getFocusedTaskId = useCallback((): string | null => {
    const activeEl = document.activeElement;
    if (!activeEl) return null;
    const taskCard = activeEl.closest('[data-task-id]');
    return taskCard?.getAttribute('data-task-id') ?? null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bug 7: Skip all shortcuts when a modal/dialog is open
      if (document.querySelector('[role="dialog"]')) return;

      // Bug 5: Don't trigger if typing in input/contentEditable (except for Cmd/Ctrl shortcuts)
      const target = e.target as HTMLElement;
      const isInInput = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target.isContentEditable;
      if (isInInput && !e.metaKey && !e.ctrlKey) {
        return;
      }

      // Cmd/Ctrl + Shift + C - complete focused task
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        // Bug 3: Only preventDefault after confirming action will execute
        if (!onToggleCompleteRef.current) return;

        const taskId = getFocusedTaskId();
        if (!taskId) return;

        e.preventDefault();
        const currentTodos = useTodoStore.getState().todos;
        const todo = currentTodos.find(t => t.id === taskId);
        if (!todo || todo.completed) return;

        lastCompletedRef.current = { id: todo.id, text: todo.text };
        onToggleCompleteRef.current(taskId, true);

        // Queue focus move to the next task using double rAF after animation
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskCard) {
          const container = taskCard.parentElement;
          if (container) {
            const allCards = Array.from(container.querySelectorAll('[data-task-id]'));
            const currentIndex = allCards.indexOf(taskCard);

            setTimeout(() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const remainingCards = container.querySelectorAll('[data-task-id]');
                  const nextCheckbox = remainingCards.length > 0
                    ? remainingCards[Math.min(currentIndex, remainingCards.length - 1)]?.querySelector<HTMLButtonElement>('button[data-completion-checkbox]')
                    : null;

                  if (nextCheckbox) {
                    nextCheckbox.focus();
                  } else {
                    // Also check TodoItem-style items
                    const todoItems = container.querySelectorAll('[data-testid="todo-item"]');
                    if (todoItems.length > 0) {
                      const nextTodoCheckbox = todoItems[Math.min(currentIndex, todoItems.length - 1)]?.querySelector<HTMLButtonElement>('button[data-completion-checkbox]');
                      if (nextTodoCheckbox) {
                        nextTodoCheckbox.focus();
                        return;
                      }
                    }
                    // Fallback chain
                    const newTaskButton = document.querySelector<HTMLElement>('button[data-new-task]');
                    if (newTaskButton) {
                      newTaskButton.focus();
                      return;
                    }
                    const mainHeading = document.querySelector<HTMLElement>('h1, [role="heading"]');
                    if (mainHeading) {
                      mainHeading.setAttribute('tabindex', '-1');
                      mainHeading.focus();
                    }
                  }
                });
              });
            }, 200);
          }
        }
        return;
      }

      // Cmd/Ctrl + Z - undo last completion
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        // Bug 4: Only intercept Cmd+Z when a task list element is focused
        const activeEl = document.activeElement;
        const isInTaskList = activeEl?.closest('[data-task-list]') != null;
        if (!isInTaskList) return; // Let browser handle undo normally

        if (!onToggleCompleteRef.current || !lastCompletedRef.current) return;

        // Only handle undo if not in an input field or contentEditable
        if (isInInput) return;

        e.preventDefault();
        const { id, text } = lastCompletedRef.current;
        onToggleCompleteRef.current(id, false);
        // Bug 4: Show toast on successful undo
        showToastRef.current?.(`Undo: restored ${text}`);
        lastCompletedRef.current = null;
        return;
      }

      // Don't process remaining shortcuts if in input
      if (isInInput) return;

      // 'n' - focus new task input
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const input = document.querySelector('textarea[placeholder*="task"]') as HTMLTextAreaElement;
        if (input) input.focus();
        return;
      }

      // '/' - focus search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const search = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (search) search.focus();
        return;
      }

      // 'Escape' - clear selection or exit focus mode
      if (e.key === 'Escape') {
        // If in focus mode, exit it first
        const currentFocusMode = useTodoStore.getState().ui.focusMode;
        if (currentFocusMode) {
          setFocusModeRef.current(false);
          return;
        }
        // If bulk selection is active, clear it
        if (showBulkActionsRef.current && selectedTodosRef.current.size > 0) {
          e.preventDefault();
          clearSelectionRef.current();
          setShowBulkActionsRef.current(false);
          return;
        }
        clearSelectionRef.current();
        setSearchQueryRef.current('');
        setShowBulkActionsRef.current(false);
        return;
      }

      // Cmd/Ctrl + A - select all visible todos
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        // Only trigger if not typing in an input field
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        // Bug 12: Use ref-based visibleTodos
        const currentVisibleTodos = visibleTodosRef.current;
        if (!isInputField && currentVisibleTodos.length > 0) {
          e.preventDefault();
          const visibleIds = currentVisibleTodos.map(t => t.id);
          selectAllRef.current(visibleIds);
          setShowBulkActionsRef.current(true);
        }
        return;
      }

      // Cmd/Ctrl + Shift + F - toggle focus mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFocusModeRef.current();
        return;
      }

      // Bug 11: '1-4' - quick filter shortcuts (with early returns)
      if (e.key === '1') { e.preventDefault(); setQuickFilterRef.current('all'); return; }
      if (e.key === '2') { e.preventDefault(); setQuickFilterRef.current('my_tasks'); return; }
      if (e.key === '3') { e.preventDefault(); setQuickFilterRef.current('due_today'); return; }
      if (e.key === '4') { e.preventDefault(); setQuickFilterRef.current('overdue'); return; }

      // Bug 6: Removed '?' handler — AppShell.tsx handles it globally
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getFocusedTaskId]);

  // No return value - this hook only sets up keyboard listeners
}
