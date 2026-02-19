/**
 * useCustomerOpportunities Hook
 *
 * Fetches cross-sell opportunity tiers for all customers linked to visible todos.
 * Single batch fetch with 60-second client-side cache to avoid N+1 queries.
 */

'use client';
import { useEffect, useState } from 'react';
import { useTodos } from '@/store/todoStore';

export type OpportunityTier = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';
type OpportunityMap = Map<string, OpportunityTier>;

// Shared cache across all component instances
let cache: OpportunityMap = new Map();
let lastFetch = 0;
const TTL_MS = 60_000; // 60 seconds

export function useCustomerOpportunities(): OpportunityMap {
  const [map, setMap] = useState<OpportunityMap>(cache);
  const { todos } = useTodos();

  useEffect(() => {
    // Extract unique customer IDs from todos
    const customerIds = [
      ...new Set(
        todos
          .map((t) => t.customer_id)
          .filter((id): id is string => Boolean(id))
      )
    ];

    if (customerIds.length === 0) {
      setMap(new Map());
      return;
    }

    // Use cached data if fresh
    const now = Date.now();
    if (now - lastFetch < TTL_MS && cache.size > 0) {
      setMap(cache);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/cross-sell/by-customer-ids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerIds }),
        });

        if (!res.ok) {
          console.warn('Failed to fetch customer opportunities:', res.status);
          return;
        }

        const data: { customerId: string; priorityTier: OpportunityTier }[] = await res.json();
        const newMap = new Map(data.map((d) => [d.customerId, d.priorityTier]));

        cache = newMap;
        lastFetch = Date.now();
        setMap(newMap);
      } catch (error) {
        // Non-critical — fail silently to avoid breaking UI
        console.warn('Error fetching customer opportunities:', error);
      }
    };

    fetchData();
  }, [todos]);

  return map;
}
