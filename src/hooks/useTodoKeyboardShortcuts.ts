/**
 * Custom hook to manage TodoList keyboard shortcuts
 *
 * Extracts all keyboard handling logic:
 * - n: Focus new task input
 * - /: Focus search
 * - Escape: Clear selection / exit focus mode
 * - Cmd/Ctrl+A: Select all visible todos
 * - Cmd/Ctrl+Shift+F: Toggle focus mode
 * - 1-4: Quick filter shortcuts
 * - ?: Show keyboard shortcuts help
 *
 * This hook provides reusable, testable keyboard shortcut management.
 */

import { useEffect } from 'react';
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
}: UseTodoKeyboardShortcutsProps) {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTodos.length, showBulkActions, selectedTodos.size]);

  // No return value - this hook only sets up keyboard listeners
}
