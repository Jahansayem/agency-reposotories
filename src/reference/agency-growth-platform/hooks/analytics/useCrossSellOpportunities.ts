/**
 * React Hook: useCrossSellOpportunities
 *
 * Provides easy access to cross-sell opportunities with automatic loading states,
 * error handling, and data refreshing capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchOpportunities,
  fetchTodayOpportunities,
  logContact,
  type CrossSellOpportunity,
  type OpportunitiesResponse,
  type ContactRequest
} from '../lib/api-client';

interface UseCrossSellOpportunitiesOptions {
  tier?: string;
  segment?: string;
  renewalWindow?: number;
  limit?: number;
  autoFetch?: boolean; // Default: true
}

interface UseCrossSellOpportunitiesReturn {
  opportunities: CrossSellOpportunity[];
  meta: OpportunitiesResponse['meta'] | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  logContactAttempt: (opportunityId: string, request: ContactRequest) => Promise<void>;
}

/**
 * Hook to fetch and manage cross-sell opportunities
 */
export function useCrossSellOpportunities(
  options: UseCrossSellOpportunitiesOptions = {}
): UseCrossSellOpportunitiesReturn {
  const {
    tier,
    segment,
    renewalWindow,
    limit = 100,
    autoFetch = true
  } = options;

  const [opportunities, setOpportunities] = useState<CrossSellOpportunity[]>([]);
  const [meta, setMeta] = useState<OpportunitiesResponse['meta'] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchOpportunities({
        tier,
        segment,
        renewalWindow,
        limit
      });

      setOpportunities(response.opportunities);
      setMeta(response.meta);
    } catch (err) {
      // Preserve the original error message from API client
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch opportunities';
      const error = new Error(errorMessage);
      setError(error);
      console.error('[useCrossSellOpportunities] Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [tier, segment, renewalWindow, limit]);

  const logContactAttempt = useCallback(async (
    opportunityId: string,
    request: ContactRequest
  ) => {
    try {
      const response = await logContact(opportunityId, request);

      // Update the opportunity in local state
      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === opportunityId ? response.opportunity : opp
        )
      );
    } catch (err) {
      console.error('Error logging contact:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    opportunities,
    meta,
    loading,
    error,
    refresh: fetchData,
    logContactAttempt
  };
}

/**
 * Hook specifically for TODAY's opportunities
 */
export function useTodayOpportunities(limit: number = 10) {
  const [opportunities, setOpportunities] = useState<CrossSellOpportunity[]>([]);
  const [meta, setMeta] = useState<OpportunitiesResponse['meta'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchTodayOpportunities({
        limit,
        includeRenewalWindow: false
      });

      setOpportunities(response.opportunities);
      setMeta(response.meta);
    } catch (err) {
      // Preserve the original error message from API client
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch today\'s opportunities';
      const error = new Error(errorMessage);
      setError(error);
      console.error('[useTodayOpportunities] Error fetching today\'s opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const logContactAttempt = useCallback(async (
    opportunityId: string,
    request: ContactRequest
  ) => {
    try {
      const response = await logContact(opportunityId, request);

      // Update the opportunity in local state and remove if won/lost
      setOpportunities(prev => {
        const updated = prev.map(opp =>
          opp.id === opportunityId ? response.opportunity : opp
        );

        // Remove from list if status is won or lost
        if (['won', 'lost'].includes(response.opportunity.contactStatus || '')) {
          return updated.filter(opp => opp.id !== opportunityId);
        }

        return updated;
      });
    } catch (err) {
      console.error('Error logging contact:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    opportunities,
    meta,
    loading,
    error,
    refresh: fetchData,
    logContactAttempt
  };
}

/**
 * Hook for renewal window opportunities (next 7 days)
 */
export function useRenewalWindowOpportunities(days: number = 7) {
  const [opportunities, setOpportunities] = useState<CrossSellOpportunity[]>([]);
  const [meta, setMeta] = useState<OpportunitiesResponse['meta'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchOpportunities({
        renewalWindow: days,
        limit: 200
      });

      setOpportunities(response.opportunities);
      setMeta(response.meta);
    } catch (err) {
      // Preserve the original error message from API client
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch renewal window opportunities';
      const error = new Error(errorMessage);
      setError(error);
      console.error('[useRenewalWindowOpportunities] Error fetching renewal window opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  const logContactAttempt = useCallback(async (
    opportunityId: string,
    request: ContactRequest
  ) => {
    try {
      const response = await logContact(opportunityId, request);

      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === opportunityId ? response.opportunity : opp
        )
      );
    } catch (err) {
      console.error('Error logging contact:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    opportunities,
    meta,
    loading,
    error,
    refresh: fetchData,
    logContactAttempt
  };
}
