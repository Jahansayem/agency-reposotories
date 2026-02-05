'use client';

/**
 * Hook to fetch today's cross-sell opportunities
 * Uses the /api/opportunities/today endpoint
 */

import { useState, useEffect, useCallback } from 'react';

export interface TodayOpportunity {
  id: string;
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

export interface ContactRequest {
  contactType: 'call' | 'email' | 'sms';
  outcome: 'reached' | 'no_answer' | 'left_message' | 'scheduled_callback';
  notes?: string;
}

export function useTodayOpportunities(limit: number = 10) {
  const [opportunities, setOpportunities] = useState<TodayOpportunity[]>([]);
  const [meta, setMeta] = useState<TodayOpportunitiesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/opportunities/today?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }

      const data = await response.json();

      // Map API response to component format
      const mapped = (data.opportunities || []).map((opp: Record<string, unknown>) => ({
        id: opp.id,
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

      setOpportunities(mapped);
      setMeta({
        todayCount: data.meta?.todayCount || mapped.length,
        urgentCount: data.meta?.urgentCount || 0,
        upcomingCount: data.meta?.upcomingCount || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const logContactAttempt = useCallback(async (
    opportunityId: string,
    request: ContactRequest
  ) => {
    const response = await fetch(`/api/opportunities/${opportunityId}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_type: request.contactType,
        outcome: request.outcome,
        notes: request.notes,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log contact');
    }

    // Refresh the list after logging
    await fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  return {
    opportunities,
    meta,
    loading,
    error,
    refresh: fetchOpportunities,
    logContactAttempt,
  };
}
