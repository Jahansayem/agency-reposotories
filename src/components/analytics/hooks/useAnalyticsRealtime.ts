'use client';

/**
 * Analytics Real-time Subscriptions
 *
 * Provides real-time updates for analytics data via Supabase channels.
 * Enables live updates when new data is uploaded or metrics change.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface AnalyticsEvent {
  type: 'upload_complete' | 'data_refresh' | 'score_update' | 'segment_change';
  timestamp: string;
  data?: Record<string, unknown>;
  source?: string;
}

export interface RealtimeState {
  connected: boolean;
  lastEvent: AnalyticsEvent | null;
  eventCount: number;
}

// ============================================
// Real-time Analytics Hook
// ============================================

export function useAnalyticsRealtime(
  agencyId?: string,
  onEvent?: (event: AnalyticsEvent) => void
) {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    lastEvent: null,
    eventCount: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep the callback ref updated
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Handle incoming events
  const handleEvent = useCallback((payload: { type: string; data?: Record<string, unknown> }) => {
    const event: AnalyticsEvent = {
      type: payload.type as AnalyticsEvent['type'],
      timestamp: new Date().toISOString(),
      data: payload.data,
    };

    setState(prev => ({
      ...prev,
      lastEvent: event,
      eventCount: prev.eventCount + 1,
    }));

    // Call the callback if provided
    onEventRef.current?.(event);
  }, []);

  // Set up the channel subscription
  useEffect(() => {
    const channelName = agencyId
      ? `analytics:${agencyId}`
      : 'analytics:global';

    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'analytics_update' }, (payload) => {
        handleEvent(payload.payload as { type: string; data?: Record<string, unknown> });
      })
      .subscribe((status) => {
        setState(prev => ({
          ...prev,
          connected: status === 'SUBSCRIBED',
        }));
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agencyId, handleEvent]);

  // Broadcast an event to other subscribers
  const broadcast = useCallback(async (event: Omit<AnalyticsEvent, 'timestamp'>) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'analytics_update',
        payload: {
          ...event,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, []);

  return {
    ...state,
    broadcast,
  };
}

// ============================================
// Upload Progress Tracking
// ============================================

export interface UploadProgress {
  stage: 'validating' | 'parsing' | 'scoring' | 'inserting' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  recordsProcessed?: number;
  totalRecords?: number;
}

export function useUploadProgress(uploadId?: string) {
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'validating',
    progress: 0,
    message: 'Preparing upload...',
  });

  useEffect(() => {
    if (!uploadId) return;

    const channel = supabase.channel(`upload:${uploadId}`)
      .on('broadcast', { event: 'progress' }, (payload) => {
        const p = payload.payload as UploadProgress;
        setProgress(p);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uploadId]);

  return progress;
}

// ============================================
// Live Metrics Subscription
// ============================================

export interface LiveMetrics {
  totalCustomers: number;
  totalPremium: number;
  avgLtv: number;
  highValuePercentage: number;
  lastUpdated: string;
}

export function useLiveMetrics(agencyId?: string, refreshInterval = 60000) {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      // This would fetch from a dedicated metrics endpoint
      // For now, we'll simulate with the segmentation API
      const params = new URLSearchParams();
      if (agencyId) params.append('agency_id', agencyId);

      const response = await fetch(`/api/analytics/segmentation?${params}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();

      if (data.success && data.portfolioAnalysis) {
        setMetrics({
          totalCustomers: data.portfolioAnalysis.totalCustomers,
          totalPremium: data.portfolioAnalysis.totalLtv,
          avgLtv: data.portfolioAnalysis.avgLtv,
          highValuePercentage: data.segments
            ?.filter((s: { segment: string }) => s.segment === 'elite' || s.segment === 'premium')
            .reduce((sum: number, s: { percentage: number }) => sum + s.percentage, 0) || 0,
          lastUpdated: new Date().toISOString(),
        });
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Set up interval for periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  // Listen for real-time updates
  const { lastEvent } = useAnalyticsRealtime(agencyId);

  // Refresh when relevant events occur
  useEffect(() => {
    if (lastEvent?.type === 'upload_complete' || lastEvent?.type === 'data_refresh') {
      fetchMetrics();
    }
  }, [lastEvent, fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}

// ============================================
// Connection Status Hook
// ============================================

export function useAnalyticsConnectionStatus() {
  const { connected } = useAnalyticsRealtime();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch('/api/analytics/simulate', { method: 'GET' });
        setApiStatus(response.ok ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    realtime: connected,
    api: apiStatus,
    overall: connected && apiStatus === 'online' ? 'healthy' : 'degraded',
  };
}

export default {
  useAnalyticsRealtime,
  useUploadProgress,
  useLiveMetrics,
  useAnalyticsConnectionStatus,
};
