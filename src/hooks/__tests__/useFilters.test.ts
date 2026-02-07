import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilters } from '../useFilters';

describe('useFilters', () => {
  it('should initialize with default filter state', () => {
    const { result } = renderHook(() => useFilters());
    
    expect(result.current.filters.quickFilter).toBe('all');
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.statusFilter).toBe('active');
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.setSearchQuery('test query');
    });
    
    expect(result.current.filters.searchQuery).toBe('test query');
  });

  it('should update quick filter', () => {
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.setQuickFilter('my-tasks');
    });
    
    expect(result.current.filters.quickFilter).toBe('my-tasks');
  });

  it('should handle keyboard shortcuts', () => {
    const { result } = renderHook(() => useFilters());
    
    // Simulate 'm' key for my-tasks
    act(() => {
      result.current.handleKeyboardShortcut('m');
    });
    
    expect(result.current.filters.quickFilter).toBe('my-tasks');
  });

  it('should reset all filters', () => {
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.setSearchQuery('test');
      result.current.setQuickFilter('my-tasks');
      result.current.setStatusFilter('completed');
    });
    
    act(() => {
      result.current.resetFilters();
    });
    
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.quickFilter).toBe('all');
    expect(result.current.filters.statusFilter).toBe('active');
  });
});
