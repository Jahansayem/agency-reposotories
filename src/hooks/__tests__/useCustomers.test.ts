import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useCustomerSearch,
  useCustomerDetail,
  useCreateTaskFromOpportunity,
  useDismissOpportunity,
  useCustomerList,
} from '../useCustomers';
import type { Customer, CustomerDetail, CustomerSearchResult, CustomerDetailResult } from '@/types/customer';

// Mock fetch
global.fetch = vi.fn();

const mockCustomer: Customer = {
  id: 'customer-1',
  name: 'John Smith',
  email: 'john@example.com',
  phone: '555-1234',
  segment: 'MONOLINE_AUTO',
  total_premium: 1500,
  policy_count: 2,
  cross_sell_score: 85,
  opportunity_count: 2,
};

const mockCustomerDetail: CustomerDetail = {
  ...mockCustomer,
  address: '123 Main St',
  policies: [
    {
      policy_number: 'AUTO123',
      policy_type: 'AUTO',
      premium: 1000,
      start_date: '2025-01-01',
      end_date: '2026-01-01',
    },
  ],
};

describe('useCustomerSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCustomerSearch());

    expect(result.current.query).toBe('');
    expect(result.current.customers).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not search if query is below minimum characters', async () => {
    const { result } = renderHook(() => useCustomerSearch({ minChars: 3 }));

    act(() => {
      result.current.setQuery('ab');
    });

    vi.advanceTimersByTime(300);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.customers).toEqual([]);
  });

  it('should debounce search queries', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [mockCustomer] }),
    });

    const { result } = renderHook(() => useCustomerSearch({ debounceMs: 300 }));

    act(() => {
      result.current.setQuery('John');
    });

    // Should not call immediately
    expect(global.fetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(global.fetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should search when query meets minimum characters', async () => {
    const mockSearchResult: CustomerSearchResult = {
      customers: [mockCustomer],
      stats: {
        total_count: 1,
        total_premium: 1500,
        avg_premium: 1500,
        policy_count: 2,
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockSearchResult,
    });

    const { result } = renderHook(() => useCustomerSearch({ minChars: 2 }));

    act(() => {
      result.current.setQuery('John');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/customers?q=John')
    );
    expect(result.current.customers).toEqual([mockCustomer]);
  });

  it('should include agency_id in search if provided', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [] }),
    });

    const { result } = renderHook(() =>
      useCustomerSearch({ agencyId: 'agency-123' })
    );

    act(() => {
      result.current.setQuery('John Smith');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('agency_id=agency-123')
      );
    });
  });

  it('should handle search errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCustomerSearch());

    act(() => {
      result.current.setQuery('John');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe('Failed to search customers');
    expect(result.current.customers).toEqual([]);
  });

  it('should clear search results', () => {
    const { result } = renderHook(() => useCustomerSearch());

    act(() => {
      result.current.setQuery('John');
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.query).toBe('');
    expect(result.current.customers).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should respect limit parameter', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [] }),
    });

    const { result } = renderHook(() => useCustomerSearch({ limit: 25 }));

    act(() => {
      result.current.setQuery('Smith');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=25')
      );
    });
  });
});

describe('useCustomerDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null customer', () => {
    const { result } = renderHook(() => useCustomerDetail(null));

    expect(result.current.customer).toBeNull();
    expect(result.current.opportunities).toEqual([]);
    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch customer details when ID is provided', async () => {
    const mockDetailResult: CustomerDetailResult = {
      customer: mockCustomerDetail,
      opportunities: [],
      tasks: [],
      stats: {
        totalOpportunities: 0,
        activeOpportunities: 0,
        linkedTasks: 0,
        completedTasks: 0,
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockDetailResult,
    });

    const { result } = renderHook(() => useCustomerDetail('customer-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/customers/customer-1');
    expect(result.current.customer).toEqual(mockCustomerDetail);
  });

  it('should handle 404 errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useCustomerDetail('nonexistent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Customer not found');
  });

  it('should handle generic errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCustomerDetail('customer-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Failed to fetch customer');
  });

  it('should reset state when ID becomes null', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        customer: mockCustomerDetail,
        opportunities: [],
        tasks: [],
        stats: null,
      }),
    });

    const { result, rerender } = renderHook(
      ({ id }) => useCustomerDetail(id),
      { initialProps: { id: 'customer-1' as string | null } }
    );

    await waitFor(() => {
      expect(result.current.customer).toBeTruthy();
    });

    rerender({ id: null });

    expect(result.current.customer).toBeNull();
    expect(result.current.opportunities).toEqual([]);
    expect(result.current.tasks).toEqual([]);
  });

  it('should provide refresh function', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        customer: mockCustomerDetail,
        opportunities: [],
        tasks: [],
        stats: null,
      }),
    });

    const { result } = renderHook(() => useCustomerDetail('customer-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refresh();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('useCreateTaskFromOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create task from opportunity', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ taskId: 'task-123' }),
    });

    const { result } = renderHook(() => useCreateTaskFromOpportunity());

    let taskId: string | undefined;

    await act(async () => {
      taskId = await result.current.createTask({
        opportunityId: 'opp-1',
        assignedTo: 'Derrick',
        createdBy: 'Manager',
        priority: 'high',
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/opportunities/create-task',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(taskId).toBe('task-123');
    expect(result.current.error).toBeNull();
  });

  it('should handle creation errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCreateTaskFromOpportunity());

    await expect(async () => {
      await act(async () => {
        await result.current.createTask({
          opportunityId: 'opp-1',
          assignedTo: 'Derrick',
          createdBy: 'Manager',
        });
      });
    }).rejects.toThrow('Failed to create task');

    expect(result.current.error?.message).toBe('Failed to create task');
  });

  it('should manage loading state', async () => {
    (global.fetch as any).mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({ ok: true, json: async () => ({ taskId: 'task-123' }) }), 100)
      )
    );

    const { result } = renderHook(() => useCreateTaskFromOpportunity());

    const createPromise = act(async () => {
      return result.current.createTask({
        opportunityId: 'opp-1',
        assignedTo: 'Derrick',
        createdBy: 'Manager',
      });
    });

    expect(result.current.loading).toBe(true);

    await createPromise;

    expect(result.current.loading).toBe(false);
  });
});

describe('useDismissOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dismiss opportunity', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDismissOpportunity());

    await act(async () => {
      await result.current.dismissOpportunity({
        opportunityId: 'opp-1',
        dismissedBy: 'Derrick',
        reason: 'Customer declined',
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/opportunities/opp-1/dismiss',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(result.current.error).toBeNull();
  });

  it('should handle dismiss errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useDismissOpportunity());

    await expect(async () => {
      await act(async () => {
        await result.current.dismissOpportunity({ opportunityId: 'opp-1' });
      });
    }).rejects.toThrow('Failed to dismiss opportunity');

    expect(result.current.error?.message).toBe('Failed to dismiss opportunity');
  });
});

describe('useCustomerList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch customers on mount', async () => {
    const mockResult: CustomerSearchResult = {
      customers: [mockCustomer],
      stats: {
        total_count: 1,
        total_premium: 1500,
        avg_premium: 1500,
        policy_count: 2,
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResult,
    });

    const { result } = renderHook(() => useCustomerList());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.customers).toEqual([mockCustomer]);
    expect(result.current.stats).toBeTruthy();
  });

  it('should apply segment filter', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [] }),
    });

    renderHook(() => useCustomerList({ segment: 'MONOLINE_AUTO' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('segment=MONOLINE_AUTO')
      );
    });
  });

  it('should apply opportunity type filter', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [] }),
    });

    renderHook(() => useCustomerList({ opportunityType: 'LIFE' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('opportunity_type=LIFE')
      );
    });
  });

  it('should apply sort option', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [] }),
    });

    renderHook(() => useCustomerList({ sortBy: 'score_high' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=score_high')
      );
    });
  });

  it('should support pagination with loadMore', async () => {
    const firstPage = Array(50).fill(mockCustomer).map((c, i) => ({
      ...c,
      id: `customer-${i}`,
    }));

    const secondPage = Array(50).fill(mockCustomer).map((c, i) => ({
      ...c,
      id: `customer-${i + 50}`,
    }));

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: firstPage }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: secondPage }),
      });

    const { result } = renderHook(() => useCustomerList({ limit: 50 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.customers).toHaveLength(50);
    expect(result.current.hasMore).toBe(true);

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.customers).toHaveLength(100);
    });

    expect(result.current.loadingMore).toBe(false);
  });

  it('should not load more if already loading', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: Array(50).fill(mockCustomer) }),
    });

    const { result } = renderHook(() => useCustomerList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Start loading more
    act(() => {
      result.current.loadMore();
    });

    // Try loading again immediately
    act(() => {
      result.current.loadMore();
    });

    // Should only call fetch twice (initial + 1 loadMore, not 2)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should refetch when filters change', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [] }),
    });

    const { rerender } = renderHook(
      ({ segment }) => useCustomerList({ segment }),
      { initialProps: { segment: 'MONOLINE_AUTO' } }
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    rerender({ segment: 'CROSS_SELL' });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should provide refresh function', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [mockCustomer] }),
    });

    const { result } = renderHook(() => useCustomerList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refresh();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle fetch errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCustomerList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Failed to fetch customers');
  });
});
