import useSWR from 'swr';
import { TodoPriority } from '@/types/todo';

export interface SuggestedDefaults {
  assignedTo: string | null;
  priority: TodoPriority;
  dueDate: string | null;
  confidence: number;
  metadata: {
    basedOnTasks: number;
    lookbackDays: number;
    patterns: {
      assigneeFrequency: Record<string, number>;
      priorityDistribution: Record<string, number>;
      avgDueDateDays: number | null;
    };
  };
  cached?: boolean;
}

const fetcher = async (url: string, userName: string): Promise<SuggestedDefaults> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }

  return response.json();
};

/**
 * Hook to fetch smart default suggestions for a user based on their task creation patterns.
 *
 * Uses SWR for:
 * - Client-side caching (5 minutes)
 * - Automatic revalidation
 * - Deduplication of requests
 *
 * @param userName - The user's name
 * @param enabled - Whether to fetch suggestions (default: true)
 * @returns Suggestions object with assignedTo, priority, dueDate, and confidence score
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, error } = useSuggestedDefaults('Derrick');
 *
 * if (suggestions && suggestions.confidence >= 0.5) {
 *   // Use suggestions as defaults
 *   setAssignedTo(suggestions.assignedTo);
 *   setPriority(suggestions.priority);
 * }
 * ```
 */
export function useSuggestedDefaults(userName: string | undefined, enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<SuggestedDefaults>(
    // Only fetch if userName exists and enabled is true
    userName && enabled ? ['/api/ai/suggest-defaults', userName] : null,
    ([url, user]: [string, string]) => fetcher(url, user),
    {
      // Don't revalidate on focus (suggestions are stable)
      revalidateOnFocus: false,
      // Don't revalidate on reconnect
      revalidateOnReconnect: false,
      // Cache for 5 minutes before considering stale
      dedupingInterval: 300000,
      // Keep data even if error occurs
      shouldRetryOnError: false,
      // Revalidate in background after 5 minutes
      refreshInterval: 300000,
    }
  );

  return {
    suggestions: data,
    isLoading,
    error,
    /**
     * Manually refresh suggestions (call after creating a task)
     */
    refresh: mutate,
  };
}
