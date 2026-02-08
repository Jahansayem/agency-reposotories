/**
 * Custom hook to manage TodoList component state
 *
 * Consolidates state management from multiple hooks:
 * - useTodoData (data fetching, real-time sync)
 * - useFilters (search, sort, quick filters)
 * - useBulkActions (multi-select operations)
 * - useTodoModals (modal state management)
 *
 * This hook provides a single source of truth for TodoList state,
 * making the component easier to test and maintain.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTodoStore } from '@/store/todoStore';
import { useTodoData, useFilters, useBulkActions, useTodoModals, useEscapeKey } from '@/hooks';
import { ViewMode, QuickFilter, AuthUser } from '@/types/todo';
import { useAnnouncement } from '@/components/LiveRegion';

interface UseTodoListStateProps {
  currentUser: AuthUser;
  initialFilter?: QuickFilter | null;
  onInitialFilterApplied?: () => void;
}

export function useTodoListState({
  currentUser,
  initialFilter,
  onInitialFilterApplied
}: UseTodoListStateProps) {
  const userName = currentUser.name;

  // Core data from Zustand store
  const {
    todos,
    users,
    usersWithColors,
    loading,
    connected,
    error,
    addTodo: addTodoToStore,
    updateTodo: updateTodoInStore,
    deleteTodo: deleteTodoFromStore,
    setTodos: setTodosInStore,
    toggleTodoSelection,
  } = useTodoStore();

  // Data fetching and real-time subscriptions
  const { refresh: refreshTodos } = useTodoData(currentUser);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Sectioned view toggle
  const [useSectionedView, setUseSectionedView] = useState(true);

  // "More" dropdown state
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Add Task modal state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Filter state
  const {
    filters,
    visibleTodos,
    filteredAndSortedTodos,
    archivedTodos,
    uniqueCustomers,
    setSearchQuery,
    setQuickFilter,
    setSortOption,
    setShowCompleted,
    setHighPriorityOnly,
    setShowAdvancedFilters,
    setStatusFilter,
    setAssignedToFilter,
    setCustomerFilter,
    setHasAttachmentsFilter,
    setDateRangeFilter,
    filterArchivedTodos,
  } = useFilters(userName);

  // Destructure filter values
  const {
    searchQuery,
    sortOption,
    quickFilter,
    showCompleted,
    highPriorityOnly,
    statusFilter,
    assignedToFilter,
    customerFilter,
    hasAttachmentsFilter,
    dateRangeFilter,
  } = filters;

  // Focus mode from UI state
  const { showAdvancedFilters, focusMode } = useTodoStore((state) => state.ui);
  const toggleFocusMode = useTodoStore((state) => state.toggleFocusMode);
  const setFocusMode = useTodoStore((state) => state.setFocusMode);

  // Bulk actions
  const {
    selectedTodos,
    showBulkActions,
    handleSelectTodo,
    selectAll,
    clearSelection,
    setShowBulkActions,
    bulkDelete: hookBulkDelete,
    bulkAssign: hookBulkAssign,
    bulkComplete: hookBulkComplete,
    bulkReschedule: hookBulkReschedule,
    getDateOffset,
  } = useBulkActions(userName);

  // Modal state management
  const modalState = useTodoModals();

  // Screen reader announcements
  const { announcement, announce } = useAnnouncement();

  // Close "More" dropdown on Escape key
  useEscapeKey(() => setShowMoreDropdown(false), { enabled: showMoreDropdown });

  // Apply initial filter from props
  useEffect(() => {
    if (initialFilter) {
      setQuickFilter(initialFilter);
      onInitialFilterApplied?.();
    }
  }, [initialFilter, setQuickFilter, onInitialFilterApplied]);

  // Track previous filter to announce changes (A11Y)
  const prevFilterRef = useRef(quickFilter);
  useEffect(() => {
    if (prevFilterRef.current !== quickFilter && !loading) {
      const filterLabels: Record<string, string> = {
        all: 'all tasks',
        my_tasks: 'my tasks',
        assigned_by_me: 'tasks I assigned',
        due_today: 'tasks due today',
        overdue: 'overdue tasks',
        high_priority: 'high priority tasks',
        unassigned: 'unassigned tasks',
      };
      const label = filterLabels[quickFilter] || quickFilter;
      const count = visibleTodos.length;
      announce(`Showing ${label}: ${count} task${count !== 1 ? 's' : ''}`);
      prevFilterRef.current = quickFilter;
    }
  }, [quickFilter, visibleTodos.length, announce, loading]);

  // Computed: todosMap for efficient lookup
  const todosMap = useMemo(() => new Map(todos.map(t => [t.id, t])), [todos]);

  // Computed: stats based on filter context
  const stats = useMemo(() => {
    let baseSet = [...visibleTodos];

    // Apply assignment filter
    if (quickFilter === 'my_tasks') {
      baseSet = baseSet.filter((t) => t.assigned_to === userName || t.created_by === userName);
    }

    // Apply high priority filter
    if (highPriorityOnly) {
      baseSet = baseSet.filter((t) => t.priority === 'urgent' || t.priority === 'high');
    }

    return {
      total: baseSet.length,
      completed: baseSet.filter((t) => t.completed).length,
      active: baseSet.filter((t) => !t.completed).length,
      dueToday: baseSet.filter((t) => {
        if (!t.due_date || t.completed || t.status === 'done') return false;
        const today = new Date().toISOString().split('T')[0];
        return t.due_date === today;
      }).length,
      overdue: baseSet.filter((t) => {
        if (!t.due_date || t.completed || t.status === 'done') return false;
        const today = new Date().toISOString().split('T')[0];
        return t.due_date < today;
      }).length,
    };
  }, [visibleTodos, quickFilter, highPriorityOnly, userName]);

  return {
    // Core data
    todos,
    users,
    usersWithColors,
    loading,
    connected,
    error,
    todosMap,
    stats,

    // Store actions
    addTodoToStore,
    updateTodoInStore,
    deleteTodoFromStore,
    setTodosInStore,
    toggleTodoSelection,
    refreshTodos,

    // View state
    viewMode,
    setViewMode,
    useSectionedView,
    setUseSectionedView,
    showMoreDropdown,
    setShowMoreDropdown,
    showTemplatePicker,
    setShowTemplatePicker,
    showAddTaskModal,
    setShowAddTaskModal,

    // Filter state
    filters,
    visibleTodos,
    filteredAndSortedTodos,
    archivedTodos,
    uniqueCustomers,
    searchQuery,
    sortOption,
    quickFilter,
    showCompleted,
    highPriorityOnly,
    statusFilter,
    assignedToFilter,
    customerFilter,
    hasAttachmentsFilter,
    dateRangeFilter,
    showAdvancedFilters,

    // Filter actions
    setSearchQuery,
    setQuickFilter,
    setSortOption,
    setShowCompleted,
    setHighPriorityOnly,
    setShowAdvancedFilters,
    setStatusFilter,
    setAssignedToFilter,
    setCustomerFilter,
    setHasAttachmentsFilter,
    setDateRangeFilter,
    filterArchivedTodos,

    // Focus mode
    focusMode,
    toggleFocusMode,
    setFocusMode,

    // Bulk actions
    selectedTodos,
    showBulkActions,
    handleSelectTodo,
    selectAll,
    clearSelection,
    setShowBulkActions,
    hookBulkDelete,
    hookBulkAssign,
    hookBulkComplete,
    hookBulkReschedule,
    getDateOffset,

    // Modal state
    modalState,

    // Accessibility
    announcement,
    announce,
  };
}
