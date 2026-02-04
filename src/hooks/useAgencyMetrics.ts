'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAgency } from '@/contexts/AgencyContext';
import { logger } from '@/lib/logger';
import type { AgencyMetrics, Todo } from '@/types/todo';

// ============================================
// Constants
// ============================================

/** Maximum retry attempts for fetching metrics */
const MAX_RETRIES = 3;
/** Initial delay for exponential backoff (ms) */
const INITIAL_RETRY_DELAY = 1000;
/** Error codes that indicate "no data" rather than a real error */
const NO_DATA_ERROR_CODES = ['PGRST116', '42P01']; // No rows, table doesn't exist

// ============================================
// Types
// ============================================

interface UseAgencyMetricsReturn {
  /** Current month's metrics from agency_metrics table */
  metrics: AgencyMetrics | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether metrics data is available (not loading, no error, agency exists) */
  isAvailable: boolean;
  /** Whether the current agency has no metrics yet (new agency) */
  isNewAgency: boolean;
  /** Refresh metrics from database */
  refreshMetrics: () => Promise<void>;
  /** Calculate pipeline value from open quotes */
  calculatePipelineValue: (todos: Todo[]) => { value: number; count: number };
  /** Calculate policies closed this week */
  calculatePoliciesThisWeek: (todos: Todo[]) => number;
  /** Calculate premium MTD from completed quotes */
  calculatePremiumMTD: (todos: Todo[]) => number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get the start of the current week (Sunday)
 */
function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

/**
 * Get the start of the current month
 */
function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

// ============================================
// Hook
// ============================================

export function useAgencyMetrics(): UseAgencyMetricsReturn {
  const { currentAgencyId } = useAgency();
  const [metrics, setMetrics] = useState<AgencyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track retry count to prevent infinite retry loops
  const retryCountRef = useRef(0);
  // Track if we've already logged an error for this agency to prevent console spam
  const hasLoggedErrorRef = useRef<string | null>(null);

  /**
   * Fetch metrics from agency_metrics table for current month
   * Includes retry logic with exponential backoff for transient errors
   */
  const fetchMetrics = useCallback(async () => {
    if (!currentAgencyId) {
      setMetrics(null);
      setLoading(false);
      return;
    }

    // Reset retry count when agency changes
    if (hasLoggedErrorRef.current !== currentAgencyId) {
      retryCountRef.current = 0;
      hasLoggedErrorRef.current = null;
    }

    setLoading(true);
    setError(null);

    const attemptFetch = async (attempt: number): Promise<void> => {
      try {
        const currentMonth = getCurrentMonth();

        const { data, error: fetchError } = await supabase
          .from('agency_metrics')
          .select('*')
          .eq('agency_id', currentAgencyId)
          .eq('month', currentMonth)
          .single();

        if (fetchError) {
          // Handle expected "no data" cases gracefully (no error, no retry)
          if (NO_DATA_ERROR_CODES.includes(fetchError.code || '')) {
            setMetrics(null);
            setLoading(false);
            return;
          }

          // RLS permission errors - don't retry, just handle gracefully
          if (fetchError.code === '42501' || fetchError.message?.includes('permission denied')) {
            setMetrics(null);
            setLoading(false);
            // Only log once per agency to prevent console spam
            if (hasLoggedErrorRef.current !== currentAgencyId) {
              hasLoggedErrorRef.current = currentAgencyId;
              logger.warn('Agency metrics access denied (RLS policy)', {
                component: 'useAgencyMetrics',
                agencyId: currentAgencyId,
              });
            }
            return;
          }

          throw fetchError;
        } else {
          setMetrics(data as AgencyMetrics);
          setLoading(false);
        }
      } catch (err) {
        // Retry logic for transient errors
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptFetch(attempt + 1);
        }

        // Max retries exhausted - set error state
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
        setError(errorMessage);
        setLoading(false);

        // Only log error once per agency to prevent console spam
        if (hasLoggedErrorRef.current !== currentAgencyId) {
          hasLoggedErrorRef.current = currentAgencyId;
          logger.error('Failed to fetch agency metrics after retries', err as Error, {
            component: 'useAgencyMetrics',
            agencyId: currentAgencyId,
            attempts: attempt + 1,
          });
        }
      }
    };

    await attemptFetch(0);
  }, [currentAgencyId]);

  /**
   * Calculate pipeline value from open quotes (category='quote', !completed)
   */
  const calculatePipelineValue = useCallback((todos: Todo[]): { value: number; count: number } => {
    const openQuotes = todos.filter(
      (t) => t.category === 'quote' && !t.completed
    );

    const totalValue = openQuotes.reduce((sum, t) => {
      return sum + (t.premium_amount || 0);
    }, 0);

    return {
      value: totalValue,
      count: openQuotes.length,
    };
  }, []);

  /**
   * Calculate policies closed this week (completed quotes within current week)
   */
  const calculatePoliciesThisWeek = useCallback((todos: Todo[]): number => {
    const startOfWeek = getStartOfWeek();

    const policiesThisWeek = todos.filter((t) => {
      if (t.category !== 'quote' || !t.completed) return false;
      if (!t.updated_at) return false;

      const updatedAt = new Date(t.updated_at);
      return updatedAt >= startOfWeek;
    });

    return policiesThisWeek.length;
  }, []);

  /**
   * Calculate premium MTD from completed quotes this month
   */
  const calculatePremiumMTD = useCallback((todos: Todo[]): number => {
    const startOfMonth = getStartOfMonth();

    const completedQuotesMTD = todos.filter((t) => {
      if (t.category !== 'quote' || !t.completed) return false;
      if (!t.updated_at) return false;

      const updatedAt = new Date(t.updated_at);
      return updatedAt >= startOfMonth;
    });

    return completedQuotesMTD.reduce((sum, t) => {
      return sum + (t.premium_amount || 0);
    }, 0);
  }, []);

  /**
   * Refresh metrics on demand
   */
  const refreshMetrics = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  // Fetch metrics on mount and when agency changes
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Subscribe to real-time updates for agency_metrics
  useEffect(() => {
    if (!currentAgencyId) return;

    const currentMonth = getCurrentMonth();

    const channel = supabase
      .channel(`agency-metrics-${currentAgencyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agency_metrics',
          filter: `agency_id=eq.${currentAgencyId}`,
        },
        (payload) => {
          // Only update if it's the current month's metrics
          if (payload.new && (payload.new as AgencyMetrics).month === currentMonth) {
            setMetrics(payload.new as AgencyMetrics);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentAgencyId]);

  // Computed properties for UI feedback
  const isAvailable = !loading && !error && currentAgencyId !== null;
  const isNewAgency = isAvailable && metrics === null;

  return {
    metrics,
    loading,
    error,
    isAvailable,
    isNewAgency,
    refreshMetrics,
    calculatePipelineValue,
    calculatePoliciesThisWeek,
    calculatePremiumMTD,
  };
}

export default useAgencyMetrics;
