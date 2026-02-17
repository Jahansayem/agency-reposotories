'use client';

/**
 * Hook to fetch today's cross-sell opportunities
 * Uses the /api/opportunities/today endpoint
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/csrf';

// Module-level cache: persists across component mount/unmount cycles
interface CacheEntry {
  data: { opportunities: TodayOpportunity[]; meta: TodayOpportunitiesMeta };
  timestamp: number;
}
const CACHE_TTL_MS = 60_000; // 60 seconds fresh window
const cache = new Map<number, CacheEntry>(); // key = limit

/**
 * Prefetch today's opportunities into the module-level cache.
 * Call this from the app shell during idle time so the Opportunities tab
 * renders instantly on first navigation.
 */
export async function prefetchTodayOpportunities(limit = 10): Promise<void> {
  // Skip if cache is fresh
  const entry = cache.get(limit);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) return;

  try {
    const res = await fetch(`/api/opportunities/today?limit=${limit}&enrich=false`);
    if (!res.ok) return;
    const data = await res.json();

    const mapped = (data.opportunities || []).map((opp: Record<string, unknown>) => ({
      id: opp.id,
      taskId: (opp.task_id as string) || null,
      customerInsightId: (opp.customer_insight_id as string) || null,
      customerName: opp.customer_name,
      phone: opp.phone || '',
      email: opp.email || '',
      address: opp.address || '',
      city: opp.city || '',
      zipCode: opp.zip_code || '',
      currentProducts: opp.current_products || '',
      recommendedProduct: opp.recommended_product || '',
      segment: opp.segment || '',
      priorityTier: opp.priority_tier || 'MEDIUM',
      priorityScore: opp.priority_score || 0,
      currentPremium: opp.current_premium || 0,
      potentialPremiumAdd: opp.potential_premium_add || 0,
      expectedConversionPct: opp.expected_conversion_pct || 0,
      talkingPoint1: opp.talking_point_1 || '',
      talkingPoint2: opp.talking_point_2 || '',
      talkingPoint3: opp.talking_point_3 || '',
      tenureYears: opp.tenure_years || 0,
      policyCount: opp.policy_count || 0,
      ezpayStatus: opp.ezpay_status || 'Unknown',
      balanceDue: opp.balance_due || 0,
      renewalStatus: opp.renewal_status || 'Unknown',
    }));

    const meta = {
      todayCount: data.meta?.todayCount || mapped.length,
      urgentCount: data.meta?.urgentCount || 0,
      upcomingCount: data.meta?.upcomingCount || 0,
    };

    cache.set(limit, { data: { opportunities: mapped, meta }, timestamp: Date.now() });
  } catch {
    // Prefetch is best-effort — silently ignore errors
  }
}

export interface TodayOpportunity {
  id: string;
  taskId: string | null;
  customerInsightId: string | null;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  currentProducts: string;
  recommendedProduct: string;
  segment: string;
  priorityTier: string;
  priorityScore: number;
  currentPremium: number;
  potentialPremiumAdd: number;
  expectedConversionPct: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  tenureYears: number;
  policyCount: number;
  ezpayStatus: string;
  balanceDue: number;
  renewalStatus: string;
}

export interface TodayOpportunitiesMeta {
  todayCount: number;
  urgentCount: number;
  upcomingCount: number;
}

import type { ContactMethod, ContactOutcome } from '@/types/allstate-analytics';

/**
 * Contact request for logging contact attempts
 * Uses the enhanced contact outcomes for model training
 */
export interface ContactRequest {
  contactMethod: ContactMethod;
  outcome: ContactOutcome;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string;
}

export function useTodayOpportunities(limit: number = 10) {
  const cached = cache.get(limit);

  const [opportunities, setOpportunities] = useState<TodayOpportunity[]>(
    cached ? cached.data.opportunities : []
  );
  const [meta, setMeta] = useState<TodayOpportunitiesMeta | null>(
    cached ? cached.data.meta : null
  );
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);

  const fetchOpportunities = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/opportunities/today?limit=${limit}&enrich=false`);

      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }

      const data = await response.json();

      // Map API response to component format
      const mapped = (data.opportunities || []).map((opp: Record<string, unknown>) => ({
        id: opp.id,
        taskId: (opp.task_id as string) || null,
        customerInsightId: (opp.customer_insight_id as string) || null,
        customerName: opp.customer_name,
        phone: opp.phone || '',
        email: opp.email || '',
        address: opp.address || '',
        city: opp.city || '',
        zipCode: opp.zip_code || '',
        currentProducts: opp.current_products || '',
        recommendedProduct: opp.recommended_product || '',
        segment: opp.segment || '',
        priorityTier: opp.priority_tier || 'MEDIUM',
        priorityScore: opp.priority_score || 0,
        currentPremium: opp.current_premium || 0,
        potentialPremiumAdd: opp.potential_premium_add || 0,
        expectedConversionPct: opp.expected_conversion_pct || 0,
        talkingPoint1: opp.talking_point_1 || '',
        talkingPoint2: opp.talking_point_2 || '',
        talkingPoint3: opp.talking_point_3 || '',
        tenureYears: opp.tenure_years || 0,
        policyCount: opp.policy_count || 0,
        ezpayStatus: opp.ezpay_status || 'Unknown',
        balanceDue: opp.balance_due || 0,
        renewalStatus: opp.renewal_status || 'Unknown',
      }));

      const newMeta = {
        todayCount: data.meta?.todayCount || mapped.length,
        urgentCount: data.meta?.urgentCount || 0,
        upcomingCount: data.meta?.upcomingCount || 0,
      };

      // Write to module-level cache
      cache.set(limit, { data: { opportunities: mapped, meta: newMeta }, timestamp: Date.now() });

      setOpportunities(mapped);
      setMeta(newMeta);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const logContactAttempt = useCallback(async (
    opportunityId: string,
    request: ContactRequest,
    userId: string
  ) => {
    const response = await fetchWithCsrf(`/api/opportunities/${opportunityId}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        contact_method: request.contactMethod,
        contact_outcome: request.outcome,
        notes: request.notes,
        next_action: request.nextAction,
        next_action_date: request.nextActionDate,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log contact');
    }

    // Invalidate cache so next load is fresh, then re-fetch
    cache.delete(limit);
    await fetchOpportunities();
  }, [limit, fetchOpportunities]);

  useEffect(() => {
    const entry = cache.get(limit);
    if (!entry) {
      // No cache: fetch normally with loading spinner
      fetchOpportunities(true);
    } else if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
      // Stale cache: show existing data immediately, refresh in background
      fetchOpportunities(false);
    }
    // Fresh cache: skip fetch entirely — state was already initialized from cache
  }, [fetchOpportunities, limit]);

  return {
    opportunities,
    meta,
    loading,
    error,
    refresh: fetchOpportunities,
    logContactAttempt,
  };
}
