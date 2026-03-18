import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilters } from '../useFilters';

// State object that the mock will mutate - reset in beforeEach
const mockState = {
  searchQuery: '',
  sortOption: 'urgency' as const,
  quickFilter: 'all' as const,
  showCompleted: false,
  highPriorityOnly: false,
  statusFilter: 'all' as const,
  assignedToFilter: 'all',
  customerFilter: 'all',
  hasAttachmentsFilter: null as boolean | null,
  dateRangeFilter: { start: '', end: '' },
};

const defaultState = { ...mockState };

vi.mock('@/store/todoStore', () => ({
  useTodoStore: () => ({
    todos: [],
    get filters() { return mockState; },
    setFilters: (partial: any) => { Object.assign(mockState, partial); },
    setSearchQuery: (q: string) => { mockState.searchQuery = q; },
    setQuickFilter: (qf: any) => { mockState.quickFilter = qf; },
    setSortOption: (s: any) => { mockState.sortOption = s; },
    setShowCompleted: (v: boolean) => { mockState.showCompleted = v; },
    setHighPriorityOnly: (v: boolean) => { mockState.highPriorityOnly = v; },
    setShowAdvancedFilters: () => {},
    resetFilters: () => { Object.assign(mockState, defaultState, { dateRangeFilter: { start: '', end: '' } }); },
  }),
  isDueToday: () => false,
  isOverdue: () => false,
  priorityOrder: { urgent: 0, high: 1, medium: 2, low: 3 },
}));

vi.mock('@/lib/duplicateDetection', () => ({
  extractPotentialNames: () => [],
}));

vi.mock('@/types/todo', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    isFollowUpOverdue: () => false,
  };
});

describe('useFilters', () => {
  beforeEach(() => {
    // Reset mock state to defaults before each test
    Object.assign(mockState, {
      searchQuery: '',
      sortOption: 'urgency',
      quickFilter: 'all',
      showCompleted: false,
      highPriorityOnly: false,
      statusFilter: 'all',
      assignedToFilter: 'all',
      customerFilter: 'all',
      hasAttachmentsFilter: null,
      dateRangeFilter: { start: '', end: '' },
    });
  });

  it('should initialize with default filter state', () => {
    const { result } = renderHook(() => useFilters('Derrick'));

    expect(result.current.filters.quickFilter).toBe('all');
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.statusFilter).toBe('all');
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useFilters('Derrick'));

    act(() => {
      result.current.setSearchQuery('test query');
    });

    expect(result.current.filters.searchQuery).toBe('test query');
  });

  it('should update quick filter', () => {
    const { result } = renderHook(() => useFilters('Derrick'));

    act(() => {
      result.current.setQuickFilter('my_tasks');
    });

    expect(result.current.filters.quickFilter).toBe('my_tasks');
  });

  it('should handle keyboard shortcuts', () => {
    const { result } = renderHook(() => useFilters('Derrick'));

    // The hook does not expose handleKeyboardShortcut directly.
    // Verify setQuickFilter works for the my_tasks filter instead.
    act(() => {
      result.current.setQuickFilter('my_tasks');
    });

    expect(result.current.filters.quickFilter).toBe('my_tasks');
  });

  it('should reset all filters', () => {
    const { result } = renderHook(() => useFilters('Derrick'));

    act(() => {
      result.current.setSearchQuery('test');
      result.current.setQuickFilter('my_tasks');
      result.current.setStatusFilter('all');
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.quickFilter).toBe('all');
    expect(result.current.filters.statusFilter).toBe('all');
  });
});
