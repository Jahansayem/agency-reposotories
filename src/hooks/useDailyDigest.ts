'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuthUser } from '@/types/todo';
import { logger } from '@/lib/logger';

// Types based on the API response
export interface DailyDigestTask {
  id: string;
  text: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  status: string;
  subtasks_count: number;
  subtasks_completed: number;
}

export interface DailyDigestData {
  greeting: string;
  overdueTasks: {
    count: number;
    summary: string;
    tasks: DailyDigestTask[];
  };
  todaysTasks: {
    count: number;
    summary: string;
    tasks: DailyDigestTask[];
  };
  teamActivity: {
    summary: string;
    highlights: string[];
  };
  focusSuggestion: string;
  generatedAt: string;
}

interface UseDailyDigestOptions {
  currentUser: AuthUser | null;
  autoFetch?: boolean;
  enabled?: boolean;
}

interface UseDailyDigestReturn {
  digest: DailyDigestData | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  refetch: () => Promise<boolean>;
  generateNow: () => Promise<void>;
  lastFetched: Date | null;
  isNew: boolean;
  digestType: 'morning' | 'afternoon' | null;
  nextScheduled: Date | null;
  hasDigest: boolean;
}

// Helper to get CSRF token from the /api/csrf endpoint
// The new HttpOnly pattern requires fetching the token from the server
// since the csrf_secret cookie is HttpOnly and cannot be read by JS
const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const response = await fetch('/api/csrf', { credentials: 'include' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.token || null; // Returns format: "nonce:signature"
  } catch {
    return null;
  }
};

export function useDailyDigest({
  currentUser,
  autoFetch = true,
  enabled = true,
}: UseDailyDigestOptions): UseDailyDigestReturn {
  const [digest, setDigest] = useState<DailyDigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [digestType, setDigestType] = useState<'morning' | 'afternoon' | null>(null);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [hasDigest, setHasDigest] = useState(false);
  const autoGenerateAttempted = useRef(false);

  const fetchDigest = useCallback(async (): Promise<boolean> => {
    if (!currentUser?.name || !enabled) return false;

    setLoading(true);
    setError(null);

    try {
      // Fetch CSRF token first (required for protected endpoints)
      const csrfToken = await fetchCsrfToken();

      // Fetch from stored digests instead of generating on-demand
      const response = await fetch('/api/digest/latest', {
        method: 'GET',
        credentials: 'include', // Important: include cookies for session
        headers: {
          'Content-Type': 'application/json',
          'X-User-Name': currentUser.name,
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch daily digest');
      }

      // Handle response from /api/digest/latest
      if (data.hasDigest) {
        setDigest(data.digest);
        setIsNew(data.isNew || false);
        setDigestType(data.digestType || null);
        setHasDigest(true);
      } else {
        setDigest(null);
        setIsNew(false);
        setDigestType(null);
        setHasDigest(false);
      }

      if (data.nextScheduled) {
        setNextScheduled(new Date(data.nextScheduled));
      }

      setLastFetched(new Date());
      return !!data.hasDigest;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      // Mark as fetched even on error to prevent infinite retry loop
      setLastFetched(new Date());
      logger.error('Error fetching daily digest', err as Error, { component: 'useDailyDigest', action: 'fetchDigest', userName: currentUser?.name });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.name, enabled]);

  // Generate a fresh digest on demand
  const generateNow = useCallback(async () => {
    if (!currentUser?.name || !enabled) return;

    setGenerating(true);
    setError(null);

    try {
      // Fetch CSRF token first (required for protected endpoints)
      const csrfToken = await fetchCsrfToken();

      const response = await fetch('/api/ai/daily-digest', {
        method: 'POST',
        credentials: 'include', // Important: include cookies for session
        headers: {
          'Content-Type': 'application/json',
          'X-User-Name': currentUser.name,
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({ userName: currentUser.name }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate digest');
      }

      // The on-demand endpoint returns the digest directly
      const generatedDigest: DailyDigestData = {
        greeting: data.greeting,
        overdueTasks: data.overdueTasks,
        todaysTasks: data.todaysTasks,
        teamActivity: data.teamActivity,
        focusSuggestion: data.focusSuggestion,
        generatedAt: data.generatedAt,
      };

      setDigest(generatedDigest);
      setIsNew(true);
      setDigestType(new Date().getHours() < 12 ? 'morning' : 'afternoon');
      setHasDigest(true);
      setLastFetched(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate digest';
      setError(errorMessage);
      // Mark as fetched even on error to prevent infinite retry loop
      setLastFetched(new Date());
      logger.error('Error generating daily digest', err as Error, { component: 'useDailyDigest', action: 'generateNow', userName: currentUser?.name });
    } finally {
      setGenerating(false);
    }
  }, [currentUser?.name, enabled]);

  // Auto-fetch on mount if enabled, and auto-generate if no stored digest exists
  // Note: error check prevents retry loops, lastFetched prevents initial re-triggers
  useEffect(() => {
    if (autoFetch && enabled && !digest && !loading && !generating && !lastFetched && !error) {
      fetchDigest().then((found) => {
        if (!found && !autoGenerateAttempted.current) {
          autoGenerateAttempted.current = true;
          generateNow();
        }
      });
    }
  }, [autoFetch, enabled, digest, loading, generating, lastFetched, error, fetchDigest, generateNow]);

  return {
    digest,
    loading,
    generating,
    error,
    refetch: fetchDigest,
    generateNow,
    lastFetched,
    isNew,
    digestType,
    nextScheduled,
    hasDigest,
  };
}

// Priority color mapping helper
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-[var(--brand-blue)]';
    case 'low':
      return 'bg-slate-400';
    default:
      return 'bg-[var(--brand-blue)]';
  }
};

// Format relative due date helper
export const formatDigestDueDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < -1) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === -1) {
    return 'Yesterday';
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
};
