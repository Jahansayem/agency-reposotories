'use client';

/**
 * Customer History Hooks
 *
 * React Query hooks for fetching customer interaction history
 * and logging new interactions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithCsrf } from '@/lib/csrf';
import type { CustomerInteractionWithTask } from '@/types/interaction';

// ============================================
// Types
// ============================================

interface CustomerHistoryResponse {
  success: boolean;
  interactions: CustomerInteractionWithTask[];
  total: number;
  limit: number;
  offset: number;
}

interface UseCustomerHistoryOptions {
  limit?: number;
  offset?: number;
}

interface LogInteractionParams {
  customerId: string;
  interactionType: string;
  summary: string;
  details?: Record<string, any>;
  taskId?: string;
}

// ============================================
// Fetch Hook
// ============================================

/**
 * React Query hook for fetching customer interaction history.
 *
 * @param customerId - The customer to fetch history for
 * @param options - Pagination options (limit, offset)
 */
export function useCustomerHistory(
  customerId: string | null | undefined,
  options: UseCustomerHistoryOptions = {}
) {
  const { limit = 50, offset = 0 } = options;

  return useQuery<CustomerHistoryResponse>({
    queryKey: ['customer-history', customerId, offset, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      const response = await fetch(
        `/api/customers/${customerId}/history?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch customer history');
      }

      return response.json();
    },
    enabled: !!customerId,
    staleTime: 30000,
  });
}

// ============================================
// Mutation Hook
// ============================================

/**
 * Mutation hook for logging a new customer interaction.
 * Invalidates the customer history cache on success.
 */
export function useLogInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogInteractionParams) => {
      const response = await fetchWithCsrf('/api/interactions/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to log interaction');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['customer-history', variables.customerId],
      });
    },
  });
}
