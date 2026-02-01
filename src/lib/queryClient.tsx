'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * React Query Configuration for Sprint 3 Issue #31
 *
 * Provides centralized data fetching, caching, and state management.
 *
 * Features:
 * - Automatic caching (5 minutes)
 * - Stale data refetching (30 seconds)
 * - Optimistic updates support
 * - Error handling and retry logic
 * - No refetch on window focus (prevents unnecessary requests)
 */

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Create QueryClient in component state to ensure it's created once per app lifecycle
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Consider data stale after 30 seconds
            staleTime: 30000,
            // Keep unused data in cache for 5 minutes
            gcTime: 300000, // Previously cacheTime in v4
            // Don't refetch on window focus (prevents unnecessary requests when switching tabs)
            refetchOnWindowFocus: false,
            // Retry failed requests 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Retry mutations once before failing
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
