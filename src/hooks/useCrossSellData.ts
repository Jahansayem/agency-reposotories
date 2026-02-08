/**
 * Hook for managing cross-sell opportunity data
 *
 * Provides access to cross-sell opportunities with filtering,
 * real-time updates, and actions (contact, convert, dismiss).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type {
  CrossSellOpportunity,
  CrossSellPriorityTier,
  CrossSellSegment,
  CrossSellListResponse,
} from '@/types/allstate-analytics';

export interface CrossSellFilters {
  tiers?: CrossSellPriorityTier[];
  segments?: CrossSellSegment[];
  daysUntilRenewalMax?: number;
  minPriorityScore?: number;
  showContacted?: boolean;
  showConverted?: boolean;
  showDismissed?: boolean;
  search?: string;
}

export interface UseCrossSellDataOptions {
  agencyId?: string;
  initialFilters?: CrossSellFilters;
  pageSize?: number;
  autoRefresh?: boolean;
}

export function useCrossSellData(options: UseCrossSellDataOptions = {}) {
  const {
    agencyId,
    initialFilters = {},
    pageSize = 50,
    autoRefresh = true,
  } = options;

  // State
  const [opportunities, setOpportunities] = useState<CrossSellOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CrossSellFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<CrossSellListResponse['summary'] | null>(null);

  // Fetch opportunities
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (agencyId) params.set('agency_id', agencyId);
      if (filters.tiers?.length) params.set('tier', filters.tiers.join(','));
      if (filters.segments?.length) params.set('segment', filters.segments.join(','));
      if (filters.daysUntilRenewalMax) params.set('days_until_renewal_max', filters.daysUntilRenewalMax.toString());
      if (filters.minPriorityScore) params.set('min_priority_score', filters.minPriorityScore.toString());
      if (filters.showContacted !== undefined) params.set('contacted', filters.showContacted.toString());
      if (filters.showConverted !== undefined) params.set('converted', filters.showConverted.toString());
      if (filters.showDismissed !== undefined) params.set('dismissed', filters.showDismissed ? 'all' : 'false');
      if (filters.search) params.set('search', filters.search);

      params.set('limit', pageSize.toString());
      params.set('offset', ((page - 1) * pageSize).toString());

      const response = await fetch(`/api/analytics/cross-sell?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }

      const data: CrossSellListResponse = await response.json();

      setOpportunities(data.opportunities);
      setTotalCount(data.total);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, [agencyId, filters, page, pageSize]);

  // Initial fetch
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Real-time subscription
  useEffect(() => {
    if (!autoRefresh) return;

    const channel = supabase
      .channel('cross-sell-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cross_sell_opportunities',
          filter: agencyId ? `agency_id=eq.${agencyId}` : undefined,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOpportunities((prev) => [payload.new as CrossSellOpportunity, ...prev]);
            setTotalCount((prev) => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            setOpportunities((prev) =>
              prev.map((opp) =>
                opp.id === payload.new.id ? (payload.new as CrossSellOpportunity) : opp
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setOpportunities((prev) => prev.filter((opp) => opp.id !== payload.old.id));
            setTotalCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agencyId, autoRefresh]);

  // Actions
  const markContacted = useCallback(
    async (id: string, contactedBy: string, notes?: string) => {
      try {
        const response = await fetch('/api/analytics/cross-sell', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            mark_contacted: true,
            contacted_by: contactedBy,
            contact_notes: notes,
          }),
        });

        if (!response.ok) throw new Error('Failed to mark as contacted');

        const data = await response.json();

        // Update local state
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === id ? data.opportunity : opp))
        );

        return data.opportunity;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const markConverted = useCallback(
    async (id: string, premium: number, notes?: string) => {
      try {
        const response = await fetch('/api/analytics/cross-sell', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            mark_converted: true,
            converted_premium: premium,
            contact_outcome: 'sold',
            contact_notes: notes,
          }),
        });

        if (!response.ok) throw new Error('Failed to mark as converted');

        const data = await response.json();

        // Update local state
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === id ? data.opportunity : opp))
        );

        return data.opportunity;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const dismiss = useCallback(async (id: string, reason?: string) => {
    try {
      const params = new URLSearchParams({ id });
      if (reason) params.set('reason', reason);

      const response = await fetch(`/api/analytics/cross-sell?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to dismiss opportunity');

      // Remove from local state
      setOpportunities((prev) => prev.filter((opp) => opp.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      throw err;
    }
  }, []);

  const updateOutcome = useCallback(
    async (
      id: string,
      outcome: 'quoted' | 'sold' | 'declined' | 'callback' | 'no_answer',
      notes?: string
    ) => {
      try {
        const response = await fetch('/api/analytics/cross-sell', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            contact_outcome: outcome,
            contact_notes: notes,
          }),
        });

        if (!response.ok) throw new Error('Failed to update outcome');

        const data = await response.json();

        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === id ? data.opportunity : opp))
        );

        return data.opportunity;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const generateTasks = useCallback(
    async (
      opportunityIds?: string[],
      createdBy?: string,
      options?: {
        autoAssignTo?: string;
        createSubtasks?: boolean;
      }
    ) => {
      try {
        const response = await fetch('/api/analytics/cross-sell/generate-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunity_ids: opportunityIds,
            created_by: createdBy || 'System',
            agency_id: agencyId,
            options: {
              auto_assign_to: options?.autoAssignTo,
              create_subtasks: options?.createSubtasks ?? true,
            },
          }),
        });

        if (!response.ok) throw new Error('Failed to generate tasks');

        const data = await response.json();
        return data;
      } catch (err) {
        throw err;
      }
    },
    [agencyId]
  );

  // Computed values
  const hotOpportunities = useMemo(
    () => opportunities.filter((opp) => opp.priority_tier === 'HOT'),
    [opportunities]
  );

  const highOpportunities = useMemo(
    () => opportunities.filter((opp) => opp.priority_tier === 'HIGH'),
    [opportunities]
  );

  const totalPotentialPremium = useMemo(
    () => opportunities.reduce((sum, opp) => sum + (opp.potential_premium_add || 0), 0),
    [opportunities]
  );

  const uncontactedCount = useMemo(
    () => opportunities.filter((opp) => !opp.contacted_at).length,
    [opportunities]
  );

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) setPage((p) => p + 1);
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) setPage((p) => p - 1);
  }, [hasPrevPage]);

  return {
    // Data
    opportunities,
    loading,
    error,
    summary,
    totalCount,

    // Computed
    hotOpportunities,
    highOpportunities,
    totalPotentialPremium,
    uncontactedCount,

    // Filters
    filters,
    setFilters,
    clearFilters: () => setFilters({}),

    // Pagination
    page,
    totalPages,
    pageSize,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,

    // Actions
    refetch: fetchOpportunities,
    markContacted,
    markConverted,
    dismiss,
    updateOutcome,
    generateTasks,
  };
}

export default useCrossSellData;
