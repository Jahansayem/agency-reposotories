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
 * - ?: Show keyboard shortcuts help
 *
 * This hook provides reusable, testable keyboard shortcut management.
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
}: UseTodoKeyboardShortcutsProps) {

  // Track last completed task for undo
  const lastCompletedRef = useRef<{ id: string; text: string } | null>(null);

  // Get the focused task ID from the DOM
  const getFocusedTaskId = useCallback((): string | null => {
    const activeEl = document.activeElement;
    if (!activeEl) return null;
    const taskCard = activeEl.closest('[data-task-id]');
    return taskCard?.getAttribute('data-task-id') ?? null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/contentEditable (except for Cmd/Ctrl shortcuts)
      const target = e.target as HTMLElement;
      const isInInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
      if (isInInput && !e.metaKey && !e.ctrlKey) {
        return;
      }

      // Cmd/Ctrl + Shift + C - complete focused task
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        if (!onToggleComplete) return;

        const taskId = getFocusedTaskId();
        if (!taskId) return;

        e.preventDefault();
        const currentTodos = useTodoStore.getState().todos;
        const todo = currentTodos.find(t => t.id === taskId);
        if (!todo || todo.completed) return;

        lastCompletedRef.current = { id: todo.id, text: todo.text };
        onToggleComplete(taskId, true);
        return;
      }

      // Cmd/Ctrl + Z - undo last completion
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (!onToggleComplete || !lastCompletedRef.current) return;

        // Only handle undo if not in an input field or contentEditable
        if (isInInput) return;

        e.preventDefault();
        const { id } = lastCompletedRef.current;
        onToggleComplete(id, false);
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
      }

      // '/' - focus search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const search = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (search) search.focus();
      }

      // 'Escape' - clear selection or exit focus mode
      if (e.key === 'Escape') {
        // If in focus mode, exit it first
        const currentFocusMode = useTodoStore.getState().ui.focusMode;
        if (currentFocusMode) {
          setFocusMode(false);
          return;
        }
        // If bulk selection is active, clear it
        if (showBulkActions && selectedTodos.size > 0) {
          e.preventDefault();
          clearSelection();
          setShowBulkActions(false);
          return;
        }
        clearSelection();
        setSearchQuery('');
        setShowBulkActions(false);
      }

      // Cmd/Ctrl + A - select all visible todos
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        // Only trigger if not typing in an input field
        const target = e.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        if (!isInputField && visibleTodos.length > 0) {
          e.preventDefault();
          const visibleIds = visibleTodos.map(t => t.id);
          selectAll(visibleIds);
          setShowBulkActions(true);
        }
      }

      // Cmd/Ctrl + Shift + F - toggle focus mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFocusMode();
      }

      // '1-4' - quick filter shortcuts
      if (e.key === '1') { e.preventDefault(); setQuickFilter('all'); }
      if (e.key === '2') { e.preventDefault(); setQuickFilter('my_tasks'); }
      if (e.key === '3') { e.preventDefault(); setQuickFilter('due_today'); }
      if (e.key === '4') { e.preventDefault(); setQuickFilter('overdue'); }

      // '?' - show keyboard shortcuts help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        openShortcuts();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBulkActions, selectedTodos.size, onToggleComplete, getFocusedTaskId,
      setSearchQuery, setQuickFilter, setShowBulkActions, setFocusMode, toggleFocusMode,
      clearSelection, selectAll, openShortcuts, visibleTodos]);

  // No return value - this hook only sets up keyboard listeners
}
