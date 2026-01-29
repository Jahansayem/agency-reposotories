/**
 * Todo Store - Zustand State Management
 *
 * Centralized state for todo management, replacing scattered useState calls
 * across components. This provides:
 * - Single source of truth for todos
 * - Optimistic updates with rollback
 * - Real-time sync handling
 * - Computed values (filtered, sorted lists)
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { Todo, TodoStatus, TodoPriority, QuickFilter, SortOption, ViewMode } from '@/types/todo';

/**
 * Cached midnight timestamp for date calculations.
 * Refreshes every 60 seconds to avoid stale comparisons while
 * eliminating redundant Date object creation during filtering/sorting.
 */
const getTodayMidnight = (() => {
  let cached: number | null = null;
  let lastCheck = 0;
  return () => {
    const now = Date.now();
    if (!cached || now - lastCheck > 60_000) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      cached = d.getTime();
      lastCheck = now;
    }
    return cached;
  };
})();

// Helper functions — use the cached midnight value
const isDueToday = (dueDate?: string) => {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === getTodayMidnight();
};

const isOverdue = (dueDate?: string, completed?: boolean) => {
  if (!dueDate || completed) return false;
  const d = new Date(dueDate);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < getTodayMidnight();
};

const priorityOrder: Record<TodoPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface TodoFilters {
  searchQuery: string;
  quickFilter: QuickFilter;
  sortOption: SortOption;
  showCompleted: boolean;
  highPriorityOnly: boolean;
  statusFilter: TodoStatus | 'all';
  assignedToFilter: string;
  customerFilter: string;
  hasAttachmentsFilter: boolean | null;
  dateRangeFilter: { start: string; end: string };
}

export interface BulkActionState {
  selectedTodos: Set<string>;
  showBulkActions: boolean;
}

export interface UIState {
  viewMode: ViewMode;
  showAdvancedFilters: boolean;
  showCelebration: boolean;
  celebrationText: string;
  showProgressSummary: boolean;
  showWelcomeBack: boolean;
  showWeeklyChart: boolean;
  showShortcuts: boolean;
  showActivityFeed: boolean;
  showStrategicDashboard: boolean;
  showArchiveView: boolean;
  showMergeModal: boolean;
  showDuplicateModal: boolean;
  showEmailModal: boolean;
  focusMode: boolean;
}

export interface TodoState {
  // Core data
  todos: Todo[];
  users: string[];
  usersWithColors: { name: string; color: string }[];
  loading: boolean;
  connected: boolean;
  error: string | null;
  
  // Pagination state for large todo lists
  totalTodoCount: number;
  hasMoreTodos: boolean;
  loadingMore: boolean;

  // Filters
  filters: TodoFilters;

  // Bulk actions
  bulkActions: BulkActionState;

  // UI state
  ui: UIState;

  // Custom ordering
  customOrder: string[];

  // Actions - Core data
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  setUsers: (users: string[]) => void;
  setUsersWithColors: (users: { name: string; color: string }[]) => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions - Pagination
  setTotalTodoCount: (count: number) => void;
  setHasMoreTodos: (hasMore: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  appendTodos: (todos: Todo[]) => void;

  // Actions - Filters
  setFilters: (filters: Partial<TodoFilters>) => void;
  setSearchQuery: (query: string) => void;
  setQuickFilter: (filter: QuickFilter) => void;
  setSortOption: (option: SortOption) => void;
  setShowCompleted: (show: boolean) => void;
  setHighPriorityOnly: (high: boolean) => void;
  setStatusFilter: (status: TodoStatus | 'all') => void;
  setAssignedToFilter: (user: string) => void;
  setCustomerFilter: (customer: string) => void;
  setHasAttachmentsFilter: (has: boolean | null) => void;
  setDateRangeFilter: (range: { start: string; end: string }) => void;
  resetFilters: () => void;

  // Actions - Bulk
  setSelectedTodos: (ids: Set<string>) => void;
  toggleTodoSelection: (id: string) => void;
  selectAllTodos: (ids: string[]) => void;
  clearSelection: () => void;
  setShowBulkActions: (show: boolean) => void;

  // Actions - UI
  setViewMode: (mode: ViewMode) => void;
  setShowAdvancedFilters: (show: boolean) => void;
  setShowCelebration: (show: boolean, text?: string) => void;
  setShowProgressSummary: (show: boolean) => void;
  setShowWelcomeBack: (show: boolean) => void;
  setShowWeeklyChart: (show: boolean) => void;
  setShowShortcuts: (show: boolean) => void;
  setShowActivityFeed: (show: boolean) => void;
  setShowStrategicDashboard: (show: boolean) => void;
  setShowArchiveView: (show: boolean) => void;
  setShowMergeModal: (show: boolean) => void;
  setShowDuplicateModal: (show: boolean) => void;
  setShowEmailModal: (show: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;

  // Actions - Custom order
  setCustomOrder: (order: string[]) => void;

  // Computed - these are selectors, called outside the store
}

const defaultFilters: TodoFilters = {
  searchQuery: '',
  quickFilter: 'all',
  sortOption: 'urgency',
  showCompleted: false,
  highPriorityOnly: false,
  statusFilter: 'all',
  assignedToFilter: 'all',
  customerFilter: 'all',
  hasAttachmentsFilter: null,
  dateRangeFilter: { start: '', end: '' },
};

const defaultBulkActions: BulkActionState = {
  selectedTodos: new Set(),
  showBulkActions: false,
};

const defaultUI: UIState = {
  viewMode: 'list',
  showAdvancedFilters: false,
  showCelebration: false,
  celebrationText: '',
  showProgressSummary: false,
  showWelcomeBack: false,
  showWeeklyChart: false,
  showShortcuts: false,
  showActivityFeed: false,
  showStrategicDashboard: false,
  showArchiveView: false,
  showMergeModal: false,
  showDuplicateModal: false,
  showEmailModal: false,
  focusMode: false, // Will be hydrated from localStorage
};

export const useTodoStore = create<TodoState>()(
  devtools(
    subscribeWithSelector((set, _get) => ({
      // Initial state
      todos: [],
      users: [],
      usersWithColors: [],
      loading: true,
      connected: false,
      error: null,
      totalTodoCount: 0,
      hasMoreTodos: false,
      loadingMore: false,
      filters: defaultFilters,
      bulkActions: defaultBulkActions,
      ui: defaultUI,
      customOrder: [],

      // Core data actions
      setTodos: (todos) => set({ todos }, false, 'setTodos'),

      addTodo: (todo) => set(
        (state) => ({ todos: [todo, ...state.todos] }),
        false,
        'addTodo'
      ),

      updateTodo: (id, updates) => set(
        (state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }),
        false,
        'updateTodo'
      ),

      deleteTodo: (id) => set(
        (state) => ({
          todos: state.todos.filter((t) => t.id !== id),
          bulkActions: {
            ...state.bulkActions,
            selectedTodos: new Set(
              [...state.bulkActions.selectedTodos].filter((tid) => tid !== id)
            ),
          },
        }),
        false,
        'deleteTodo'
      ),

      setUsers: (users) => set({ users }, false, 'setUsers'),
      setUsersWithColors: (usersWithColors) => set({ usersWithColors }, false, 'setUsersWithColors'),
      setLoading: (loading) => set({ loading }, false, 'setLoading'),
      setConnected: (connected) => set({ connected }, false, 'setConnected'),
      setError: (error) => set({ error }, false, 'setError'),

      // Pagination actions
      setTotalTodoCount: (totalTodoCount) => set({ totalTodoCount }, false, 'setTotalTodoCount'),
      setHasMoreTodos: (hasMoreTodos) => set({ hasMoreTodos }, false, 'setHasMoreTodos'),
      setLoadingMore: (loadingMore) => set({ loadingMore }, false, 'setLoadingMore'),
      appendTodos: (newTodos) => set(
        (state) => ({
          todos: [...state.todos, ...newTodos.filter(
            (newTodo) => !state.todos.some((t) => t.id === newTodo.id)
          )],
        }),
        false,
        'appendTodos'
      ),

      // Filter actions
      setFilters: (filterUpdates) => set(
        (state) => ({ filters: { ...state.filters, ...filterUpdates } }),
        false,
        'setFilters'
      ),

      setSearchQuery: (searchQuery) => set(
        (state) => ({ filters: { ...state.filters, searchQuery } }),
        false,
        'setSearchQuery'
      ),

      setQuickFilter: (quickFilter) => set(
        (state) => ({ filters: { ...state.filters, quickFilter } }),
        false,
        'setQuickFilter'
      ),

      setSortOption: (sortOption) => set(
        (state) => ({ filters: { ...state.filters, sortOption } }),
        false,
        'setSortOption'
      ),

      setShowCompleted: (showCompleted) => set(
        (state) => ({ filters: { ...state.filters, showCompleted } }),
        false,
        'setShowCompleted'
      ),

      setHighPriorityOnly: (highPriorityOnly) => set(
        (state) => ({ filters: { ...state.filters, highPriorityOnly } }),
        false,
        'setHighPriorityOnly'
      ),

      setStatusFilter: (statusFilter) => set(
        (state) => ({ filters: { ...state.filters, statusFilter } }),
        false,
        'setStatusFilter'
      ),

      setAssignedToFilter: (assignedToFilter) => set(
        (state) => ({ filters: { ...state.filters, assignedToFilter } }),
        false,
        'setAssignedToFilter'
      ),

      setCustomerFilter: (customerFilter) => set(
        (state) => ({ filters: { ...state.filters, customerFilter } }),
        false,
        'setCustomerFilter'
      ),

      setHasAttachmentsFilter: (hasAttachmentsFilter) => set(
        (state) => ({ filters: { ...state.filters, hasAttachmentsFilter } }),
        false,
        'setHasAttachmentsFilter'
      ),

      setDateRangeFilter: (dateRangeFilter) => set(
        (state) => ({ filters: { ...state.filters, dateRangeFilter } }),
        false,
        'setDateRangeFilter'
      ),

      resetFilters: () => set(
        { filters: defaultFilters },
        false,
        'resetFilters'
      ),

      // Bulk action actions
      setSelectedTodos: (selectedTodos) => set(
        (state) => ({
          bulkActions: {
            ...state.bulkActions,
            selectedTodos,
            showBulkActions: selectedTodos.size > 0,
          },
        }),
        false,
        'setSelectedTodos'
      ),

      toggleTodoSelection: (id) => set(
        (state) => {
          const newSelected = new Set(state.bulkActions.selectedTodos);
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
          return {
            bulkActions: {
              ...state.bulkActions,
              selectedTodos: newSelected,
              showBulkActions: newSelected.size > 0,
            },
          };
        },
        false,
        'toggleTodoSelection'
      ),

      selectAllTodos: (ids) => set(
        (state) => ({
          bulkActions: {
            ...state.bulkActions,
            selectedTodos: new Set(ids),
            showBulkActions: ids.length > 0,
          },
        }),
        false,
        'selectAllTodos'
      ),

      clearSelection: () => set(
        (state) => ({
          bulkActions: {
            ...state.bulkActions,
            selectedTodos: new Set(),
            showBulkActions: false,
          },
        }),
        false,
        'clearSelection'
      ),

      setShowBulkActions: (showBulkActions) => set(
        (state) => ({
          bulkActions: { ...state.bulkActions, showBulkActions },
        }),
        false,
        'setShowBulkActions'
      ),

      // UI actions
      setViewMode: (viewMode) => set(
        (state) => ({ ui: { ...state.ui, viewMode } }),
        false,
        'setViewMode'
      ),

      setShowAdvancedFilters: (showAdvancedFilters) => set(
        (state) => ({ ui: { ...state.ui, showAdvancedFilters } }),
        false,
        'setShowAdvancedFilters'
      ),

      setShowCelebration: (showCelebration, celebrationText = '') => set(
        (state) => ({ ui: { ...state.ui, showCelebration, celebrationText } }),
        false,
        'setShowCelebration'
      ),

      setShowProgressSummary: (showProgressSummary) => set(
        (state) => ({ ui: { ...state.ui, showProgressSummary } }),
        false,
        'setShowProgressSummary'
      ),

      setShowWelcomeBack: (showWelcomeBack) => set(
        (state) => ({ ui: { ...state.ui, showWelcomeBack } }),
        false,
        'setShowWelcomeBack'
      ),

      setShowWeeklyChart: (showWeeklyChart) => set(
        (state) => ({ ui: { ...state.ui, showWeeklyChart } }),
        false,
        'setShowWeeklyChart'
      ),

      setShowShortcuts: (showShortcuts) => set(
        (state) => ({ ui: { ...state.ui, showShortcuts } }),
        false,
        'setShowShortcuts'
      ),

      setShowActivityFeed: (showActivityFeed) => set(
        (state) => ({ ui: { ...state.ui, showActivityFeed } }),
        false,
        'setShowActivityFeed'
      ),

      setShowStrategicDashboard: (showStrategicDashboard) => set(
        (state) => ({ ui: { ...state.ui, showStrategicDashboard } }),
        false,
        'setShowStrategicDashboard'
      ),

      setShowArchiveView: (showArchiveView) => set(
        (state) => ({ ui: { ...state.ui, showArchiveView } }),
        false,
        'setShowArchiveView'
      ),

      setShowMergeModal: (showMergeModal) => set(
        (state) => ({ ui: { ...state.ui, showMergeModal } }),
        false,
        'setShowMergeModal'
      ),

      setShowDuplicateModal: (showDuplicateModal) => set(
        (state) => ({ ui: { ...state.ui, showDuplicateModal } }),
        false,
        'setShowDuplicateModal'
      ),

      setShowEmailModal: (showEmailModal) => set(
        (state) => ({ ui: { ...state.ui, showEmailModal } }),
        false,
        'setShowEmailModal'
      ),

      setFocusMode: (focusMode) => {
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('focusMode', String(focusMode));
          } catch {
            // Ignore localStorage errors
          }
        }
        set(
          (state) => ({ ui: { ...state.ui, focusMode } }),
          false,
          'setFocusMode'
        );
      },

      toggleFocusMode: () => {
        const currentFocusMode = useTodoStore.getState().ui.focusMode;
        const newFocusMode = !currentFocusMode;
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('focusMode', String(newFocusMode));
          } catch {
            // Ignore localStorage errors
          }
        }
        set(
          (state) => ({ ui: { ...state.ui, focusMode: newFocusMode } }),
          false,
          'toggleFocusMode'
        );
      },

      // Custom order
      setCustomOrder: (customOrder) => set({ customOrder }, false, 'setCustomOrder'),
    })),
    { name: 'TodoStore' }
  )
);

// Selectors - computed values derived from state
export const selectFilteredTodos = (
  todos: Todo[],
  filters: TodoFilters,
  userName: string,
  customOrder: string[]
): Todo[] => {
  let filtered = [...todos];

  // Filter out completed tasks unless showCompleted is true
  if (!filters.showCompleted) {
    filtered = filtered.filter((t) => !t.completed);
  }

  // Apply quick filter
  switch (filters.quickFilter) {
    case 'my_tasks':
      filtered = filtered.filter((t) => t.assigned_to === userName);
      break;
    case 'due_today':
      filtered = filtered.filter((t) => isDueToday(t.due_date));
      break;
    case 'overdue':
      filtered = filtered.filter((t) => isOverdue(t.due_date, t.completed));
      break;
  }

  // Apply search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.text.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query) ||
        t.assigned_to?.toLowerCase().includes(query) ||
        t.created_by?.toLowerCase().includes(query)
    );
  }

  // Apply advanced filters
  if (filters.statusFilter !== 'all') {
    filtered = filtered.filter((t) => t.status === filters.statusFilter);
  }

  if (filters.assignedToFilter !== 'all') {
    filtered = filtered.filter((t) => t.assigned_to === filters.assignedToFilter);
  }

  if (filters.highPriorityOnly) {
    filtered = filtered.filter((t) => t.priority === 'urgent' || t.priority === 'high');
  }

  if (filters.hasAttachmentsFilter !== null) {
    filtered = filtered.filter((t) =>
      filters.hasAttachmentsFilter
        ? (t.attachments?.length || 0) > 0
        : (t.attachments?.length || 0) === 0
    );
  }

  // Apply sorting
  switch (filters.sortOption) {
    case 'priority':
      filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      break;
    case 'due_date':
      filtered.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
      break;
    case 'created':
      filtered.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
    case 'alphabetical':
      filtered.sort((a, b) => a.text.localeCompare(b.text));
      break;
    case 'urgency':
      filtered.sort((a, b) => {
        // Overdue first
        const aOverdue = isOverdue(a.due_date, a.completed);
        const bOverdue = isOverdue(b.due_date, b.completed);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        // Then priority
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then due date
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        return 0;
      });
      break;
    case 'custom':
      if (customOrder.length > 0) {
        filtered.sort((a, b) => {
          const aIndex = customOrder.indexOf(a.id);
          const bIndex = customOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      }
      break;
  }

  return filtered;
};

export const selectTodoStats = (todos: Todo[]) => {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const overdue = todos.filter((t) => isOverdue(t.due_date, t.completed)).length;
  const dueToday = todos.filter((t) => isDueToday(t.due_date) && !t.completed).length;
  const urgent = todos.filter((t) => (t.priority === 'urgent' || t.priority === 'high') && !t.completed).length;

  return { total, completed, overdue, dueToday, urgent };
};

// Hydrate focus mode from localStorage on client side
export const hydrateFocusMode = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('focusMode');
      if (stored === 'true') {
        useTodoStore.getState().setFocusMode(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }
};

// Export helper functions for use in components
export { isDueToday, isOverdue, priorityOrder };

/**
 * Granular selectors with shallow equality comparison
 * 
 * These hooks use shallow comparison to prevent unnecessary re-renders.
 * Components should use these instead of selecting the entire store state.
 * 
 * Usage:
 * ```tsx
 * // Instead of:
 * const { todos, loading, error } = useTodoStore();
 * 
 * // Use:
 * const { todos, loading, error } = useTodos();
 * ```
 */

/**
 * Select core todo data with shallow equality
 * Use this when you need access to todos, loading state, or error
 */
export const useTodos = () => useTodoStore(
  useShallow((state) => ({
    todos: state.todos,
    loading: state.loading,
    error: state.error,
    connected: state.connected,
    totalTodoCount: state.totalTodoCount,
    hasMoreTodos: state.hasMoreTodos,
    loadingMore: state.loadingMore,
  }))
);

/**
 * Select filter state with shallow equality
 * Use this when you need access to filters
 */
export const useFilters = () => useTodoStore(
  useShallow((state) => ({
    filters: state.filters,
    setFilters: state.setFilters,
    setSearchQuery: state.setSearchQuery,
    setQuickFilter: state.setQuickFilter,
    setSortOption: state.setSortOption,
    setShowCompleted: state.setShowCompleted,
    setHighPriorityOnly: state.setHighPriorityOnly,
    setStatusFilter: state.setStatusFilter,
    setAssignedToFilter: state.setAssignedToFilter,
    resetFilters: state.resetFilters,
  }))
);

/**
 * Select UI state with shallow equality
 * Use this when you need access to UI flags
 */
export const useUiState = () => useTodoStore(
  useShallow((state) => ({
    ui: state.ui,
    setViewMode: state.setViewMode,
    setShowAdvancedFilters: state.setShowAdvancedFilters,
    setShowCelebration: state.setShowCelebration,
    setShowProgressSummary: state.setShowProgressSummary,
    setShowWelcomeBack: state.setShowWelcomeBack,
    setShowWeeklyChart: state.setShowWeeklyChart,
    setShowShortcuts: state.setShowShortcuts,
    setShowActivityFeed: state.setShowActivityFeed,
    setShowStrategicDashboard: state.setShowStrategicDashboard,
    setShowArchiveView: state.setShowArchiveView,
    setFocusMode: state.setFocusMode,
    toggleFocusMode: state.toggleFocusMode,
  }))
);

/**
 * Select bulk action state with shallow equality
 * Use this when you need bulk selection functionality
 */
export const useBulkActions = () => useTodoStore(
  useShallow((state) => ({
    bulkActions: state.bulkActions,
    setSelectedTodos: state.setSelectedTodos,
    toggleTodoSelection: state.toggleTodoSelection,
    selectAllTodos: state.selectAllTodos,
    clearSelection: state.clearSelection,
    setShowBulkActions: state.setShowBulkActions,
  }))
);

/**
 * Select user data with shallow equality
 * Use this when you need access to user lists
 */
export const useUsers = () => useTodoStore(
  useShallow((state) => ({
    users: state.users,
    usersWithColors: state.usersWithColors,
    setUsers: state.setUsers,
    setUsersWithColors: state.setUsersWithColors,
  }))
);
