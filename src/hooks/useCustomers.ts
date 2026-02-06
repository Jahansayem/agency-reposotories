'use client';

/**
 * Customer Hooks
 *
 * React hooks for customer search and detail fetching.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Customer,
  CustomerDetail,
  CustomerOpportunity,
  CustomerTask,
  CustomerSearchResult,
  CustomerDetailResult,
} from '@/types/customer';

// ============================================
// Customer Search Hook
// ============================================

interface UseCustomerSearchOptions {
  debounceMs?: number;
  minChars?: number;
  limit?: number;
  agencyId?: string;
}

export function useCustomerSearch(options: UseCustomerSearchOptions = {}) {
  const {
    debounceMs = 300,
    minChars = 2,
    limit = 10,
    agencyId,
  } = options;

  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setCustomers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: String(limit),
      });

      if (agencyId) {
        params.append('agency_id', agencyId);
      }

      const response = await fetch(`/api/customers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search customers');
      }

      const data: CustomerSearchResult = await response.json();
      setCustomers(data.customers);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [minChars, limit, agencyId]);

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= minChars) {
      debounceRef.current = setTimeout(() => {
        search(query);
      }, debounceMs);
    } else {
      setCustomers([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search, debounceMs, minChars]);

  const clear = useCallback(() => {
    setQuery('');
    setCustomers([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    customers,
    loading,
    error,
    search,
    clear,
  };
}

// ============================================
// Customer Detail Hook
// ============================================

interface UseCustomerDetailState {
  customer: CustomerDetail | null;
  opportunities: CustomerOpportunity[];
  tasks: CustomerTask[];
  stats: {
    totalOpportunities: number;
    activeOpportunities: number;
    linkedTasks: number;
    completedTasks: number;
  } | null;
  loading: boolean;
  error: Error | null;
}

export function useCustomerDetail(customerId: string | null) {
  const [state, setState] = useState<UseCustomerDetailState>({
    customer: null,
    opportunities: [],
    tasks: [],
    stats: null,
    loading: false,
    error: null,
  });

  const fetchCustomer = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/customers/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Customer not found');
        }
        throw new Error('Failed to fetch customer');
      }

      const data: CustomerDetailResult = await response.json();

      setState({
        customer: data.customer,
        opportunities: data.opportunities,
        tasks: data.tasks,
        stats: data.stats,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to fetch customer'),
      }));
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCustomer(customerId);
    } else {
      setState({
        customer: null,
        opportunities: [],
        tasks: [],
        stats: null,
        loading: false,
        error: null,
      });
    }
  }, [customerId, fetchCustomer]);

  return {
    ...state,
    refresh: () => customerId && fetchCustomer(customerId),
  };
}

// ============================================
// Create Task from Opportunity Hook
// ============================================

interface CreateTaskFromOpportunityParams {
  opportunityId: string;
  assignedTo: string;
  createdBy: string;
  priority?: string;
}

export function useCreateTaskFromOpportunity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTask = useCallback(async (params: CreateTaskFromOpportunityParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/opportunities/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const data = await response.json();
      return data.taskId as string;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create task');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createTask,
    loading,
    error,
  };
}

// ============================================
// Dismiss Opportunity Hook
// ============================================

interface DismissOpportunityParams {
  opportunityId: string;
  dismissedBy?: string;
  reason?: string;
}

export function useDismissOpportunity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const dismissOpportunity = useCallback(async (params: DismissOpportunityParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/opportunities/${params.opportunityId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dismissed_by: params.dismissedBy,
          reason: params.reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss opportunity');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to dismiss opportunity');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    dismissOpportunity,
    loading,
    error,
  };
}

// ============================================
// Customer List Hook (for browse/filter)
// ============================================

interface UseCustomerListOptions {
  segment?: string;
  limit?: number;
  agencyId?: string;
}

export function useCustomerList(options: UseCustomerListOptions = {}) {
  const { segment, limit = 50, agencyId } = options;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchCustomers = useCallback(async (resetList = true) => {
    if (resetList) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const currentOffset = resetList ? 0 : offset;
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(currentOffset),
      });

      if (segment) {
        params.append('segment', segment);
      }

      if (agencyId) {
        params.append('agency_id', agencyId);
      }

      const response = await fetch(`/api/customers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data: CustomerSearchResult = await response.json();

      if (resetList) {
        setCustomers(data.customers);
        setOffset(data.customers.length);
      } else {
        setCustomers(prev => [...prev, ...data.customers]);
        setOffset(prev => prev + data.customers.length);
      }

      // If we got back exactly the limit, there might be more
      setHasMore(data.customers.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch customers'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [segment, limit, agencyId, offset]);

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchCustomers(false);
    }
  }, [fetchCustomers, loadingMore, hasMore]);

  // Reset and fetch when filters change
  useEffect(() => {
    fetchCustomers(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, limit, agencyId]);

  return {
    customers,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh: () => fetchCustomers(true),
  };
}
