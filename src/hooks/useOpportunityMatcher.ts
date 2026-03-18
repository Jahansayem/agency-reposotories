'use client';
import { useState, useEffect, useCallback } from 'react';

export type MatchState = 'idle' | 'loading' | 'matched' | 'confirmed' | 'dismissed' | 'none';

export interface MatchedCustomer {
  id: string;
  name: string;
  segment: string;
}

export interface MatchedOpportunity {
  id: string;
  priorityTier: 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  recommendedProduct: string;
  potentialPremiumAdd: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  currentProducts: string;
  tenureYears: number;
  currentPremium: number;
  daysUntilRenewal: number;
}

interface UseOpportunityMatcherOptions {
  taskId: string | null;
  taskText: string;
  agencyId: string;
  existingCustomerId: string | null;
  onConfirm?: (customer: MatchedCustomer) => Promise<void>;
}

interface UseOpportunityMatcherReturn {
  state: MatchState;
  customer: MatchedCustomer | null;
  opportunity: MatchedOpportunity | null;
  confirm: () => Promise<void>;
  dismiss: () => void;
}

export function useOpportunityMatcher({
  taskId,
  taskText,
  agencyId,
  existingCustomerId,
  onConfirm,
}: UseOpportunityMatcherOptions): UseOpportunityMatcherReturn {
  const [state, setState] = useState<MatchState>(existingCustomerId ? 'idle' : taskId ? 'loading' : 'idle');
  const [customer, setCustomer] = useState<MatchedCustomer | null>(null);
  const [opportunity, setOpportunity] = useState<MatchedOpportunity | null>(null);

  useEffect(() => {
    // Skip if already linked, no task yet, or text too short
    if (!taskId || existingCustomerId || taskText.trim().length < 3) return;

    let cancelled = false;

    const run = async () => {
      setState('loading');
      try {
        const res = await fetch('/api/ai/match-customer-opportunity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskText, agencyId }),
        });
        if (cancelled) return;

        const data = await res.json();
        if (cancelled) return;

        if (data.matched && data.customer && data.opportunity) {
          setCustomer(data.customer);
          setOpportunity(data.opportunity);
          setState('matched');
        } else {
          setState('none');
        }
      } catch {
        if (!cancelled) setState('none');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = useCallback(async () => {
    if (!customer || !taskId) return;
    setState('confirmed');
    if (onConfirm) {
      await onConfirm(customer);
    }
    // Link opportunity.task_id if not already set
    if (opportunity?.id) {
      await fetch(`/api/analytics/cross-sell/${opportunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      }).catch(() => {}); // non-critical
    }
  }, [customer, opportunity, taskId, onConfirm]);

  const dismiss = useCallback(() => {
    setState('dismissed');
  }, []);

  return { state, customer, opportunity, confirm, dismiss };
}
