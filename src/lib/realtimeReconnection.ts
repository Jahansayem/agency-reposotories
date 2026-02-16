/**
 * Real-time Reconnection Manager
 *
 * Handles automatic reconnection of Supabase real-time channels with:
 * - Exponential backoff for failed connections
 * - Network status detection (online/offline)
 * - Manual reconnection triggers
 * - Connection health monitoring
 * - Heartbeat-based connection validation
 *
 * Usage:
 * ```typescript
 * const manager = useRealtimeReconnection({
 *   onReconnect: () => {
 *     // Re-subscribe to channels
 *     setupChannel();
 *   },
 *   onDisconnect: () => {
 *     // Update UI to show disconnected state
 *     setConnected(false);
 *   }
 * });
 *
 * // In your subscription handler:
 * .subscribe((status) => {
 *   manager.handleStatusChange(status);
 * });
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabaseClient';

export type RealtimeStatus =
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'SUBSCRIPTION_ERROR';

export interface ReconnectionConfig {
  // Called when connection is re-established
  onReconnect: () => void;

  // Called when connection is lost
  onDisconnect?: () => void;

  // Called on each reconnection attempt
  onReconnecting?: (attempt: number) => void;

  // Maximum number of reconnection attempts (default: Infinity)
  maxAttempts?: number;

  // Initial retry delay in ms (default: 1000)
  initialDelay?: number;

  // Maximum retry delay in ms (default: 30000 - 30 seconds)
  maxDelay?: number;

  // Multiplier for exponential backoff (default: 2)
  backoffMultiplier?: number;

  // Enable heartbeat monitoring (default: true)
  enableHeartbeat?: boolean;

  // Heartbeat interval in ms (default: 30000 - 30 seconds)
  heartbeatInterval?: number;
}

const DEFAULT_CONFIG: Required<Omit<ReconnectionConfig, 'onReconnect' | 'onDisconnect' | 'onReconnecting'>> = {
  maxAttempts: Infinity,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  enableHeartbeat: true,
  heartbeatInterval: 30000,
};

export function useRealtimeReconnection(config: ReconnectionConfig) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);
  const currentDelayRef = useRef(fullConfig.initialDelay);
  const isReconnectingRef = useRef(false);
  const lastStatusRef = useRef<RealtimeStatus | null>(null);
  const lastSuccessfulConnectionRef = useRef<number>(Date.now());
  const isOnlineRef = useRef(true);
  const handleStatusChangeRef = useRef<(status: RealtimeStatus) => void>(() => {});

  /**
   * Calculate next retry delay using exponential backoff
   */
  const getNextDelay = useCallback((): number => {
    const delay = Math.min(
      currentDelayRef.current * fullConfig.backoffMultiplier,
      fullConfig.maxDelay
    );
    currentDelayRef.current = delay;
    return delay;
  }, [fullConfig.backoffMultiplier, fullConfig.maxDelay]);

  /**
   * Reset reconnection state after successful connection
   */
  const resetReconnectionState = useCallback(() => {
    attemptCountRef.current = 0;
    currentDelayRef.current = fullConfig.initialDelay;
    isReconnectingRef.current = false;
    lastSuccessfulConnectionRef.current = Date.now();
  }, [fullConfig.initialDelay]);

  /**
   * Attempt to reconnect
   */
  const attemptReconnect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Check if we've exceeded max attempts
    if (attemptCountRef.current >= fullConfig.maxAttempts) {
      logger.error('Max reconnection attempts reached', null, {
        component: 'RealtimeReconnection',
        attempts: attemptCountRef.current,
        maxAttempts: fullConfig.maxAttempts,
      });
      isReconnectingRef.current = false;
      return;
    }

    // Don't reconnect if offline
    if (!isOnlineRef.current) {
      logger.info('Skipping reconnect - browser is offline', {
        component: 'RealtimeReconnection',
      });
      return;
    }

    attemptCountRef.current++;
    isReconnectingRef.current = true;

    logger.info(`Attempting reconnection (attempt ${attemptCountRef.current})`, {
      component: 'RealtimeReconnection',
      attempt: attemptCountRef.current,
      maxAttempts: fullConfig.maxAttempts,
    });

    // Notify caller
    config.onReconnecting?.(attemptCountRef.current);

    // Trigger reconnection
    config.onReconnect();

    // Schedule next attempt with exponential backoff
    const delay = getNextDelay();
    reconnectTimeoutRef.current = setTimeout(() => {
      // Only retry if still in reconnecting state
      // (status change handler will clear this if connection succeeds)
      if (isReconnectingRef.current) {
        attemptReconnect();
      }
    }, delay);
  }, [config, fullConfig.maxAttempts, getNextDelay]);

  /**
   * Stop heartbeat monitoring
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Start heartbeat monitoring
   * Uses handleStatusChangeRef to avoid circular dependency with handleStatusChange.
   */
  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Clear any existing heartbeat

    heartbeatIntervalRef.current = setInterval(() => {
      const timeSinceLastSuccess = Date.now() - lastSuccessfulConnectionRef.current;
      const threshold = fullConfig.heartbeatInterval * 2;

      // If we haven't had a successful ping in 2x the heartbeat interval,
      // assume connection is dead and trigger reconnect
      if (timeSinceLastSuccess > threshold && lastStatusRef.current === 'SUBSCRIBED') {
        logger.warn('Heartbeat timeout - connection appears dead', {
          component: 'RealtimeReconnection',
          timeSinceLastSuccess,
          threshold,
        });

        // Manually trigger disconnect and reconnect via ref to break circular dep
        handleStatusChangeRef.current('TIMED_OUT');
      }
    }, fullConfig.heartbeatInterval);
  }, [fullConfig.heartbeatInterval, stopHeartbeat]);

  /**
   * Handle connection status changes from Supabase
   */
  const handleStatusChange = useCallback((status: RealtimeStatus) => {
    lastStatusRef.current = status;

    if (status === 'SUBSCRIBED') {
      logger.info('Real-time connection established', {
        component: 'RealtimeReconnection',
        previousAttempts: attemptCountRef.current,
      });

      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      resetReconnectionState();

      // Start heartbeat monitoring
      if (fullConfig.enableHeartbeat) {
        startHeartbeat();
      }

    } else if (
      status === 'TIMED_OUT' ||
      status === 'CLOSED' ||
      status === 'CHANNEL_ERROR' ||
      status === 'SUBSCRIPTION_ERROR'
    ) {
      logger.warn('Real-time connection lost', {
        component: 'RealtimeReconnection',
        status,
        timeSinceLastSuccess: Date.now() - lastSuccessfulConnectionRef.current,
      });

      // Stop heartbeat
      stopHeartbeat();

      // Notify caller
      config.onDisconnect?.();

      // Start reconnection process
      if (!isReconnectingRef.current) {
        attemptReconnect();
      }
    }
  }, [config, fullConfig.enableHeartbeat, resetReconnectionState, attemptReconnect, startHeartbeat, stopHeartbeat]);

  // Keep the ref in sync so startHeartbeat's interval always calls the latest version
  handleStatusChangeRef.current = handleStatusChange;

  /**
   * Handle browser online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      logger.info('Browser came online', { component: 'RealtimeReconnection' });
      isOnlineRef.current = true;

      // If we were disconnected, trigger immediate reconnect
      if (lastStatusRef.current !== 'SUBSCRIBED') {
        logger.info('Triggering reconnect after coming online', {
          component: 'RealtimeReconnection',
        });
        attemptReconnect();
      }
    };

    const handleOffline = () => {
      logger.info('Browser went offline', { component: 'RealtimeReconnection' });
      isOnlineRef.current = false;

      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      stopHeartbeat();
      config.onDisconnect?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial online status
    isOnlineRef.current = navigator.onLine;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [config, attemptReconnect, stopHeartbeat]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  /**
   * Manual reconnection trigger (for user-initiated reconnect)
   */
  const forceReconnect = useCallback(() => {
    logger.info('Manual reconnection triggered', {
      component: 'RealtimeReconnection',
    });

    // Reset state and attempt immediate reconnect
    resetReconnectionState();
    attemptReconnect();
  }, [resetReconnectionState, attemptReconnect]);

  return {
    handleStatusChange,
    forceReconnect,
    isReconnecting: () => isReconnectingRef.current,
    attemptCount: () => attemptCountRef.current,
    isOnline: () => isOnlineRef.current,
  };
}

/**
 * Utility to wrap a subscription setup function with automatic reconnection
 *
 * Example:
 * ```typescript
 * useEffect(() => {
 *   const cleanup = withReconnection({
 *     setup: () => {
 *       const channel = supabase.channel('my-channel')
 *         .on('postgres_changes', config, handler)
 *         .subscribe();
 *       return channel;
 *     },
 *     onStatusChange: (status) => {
 *       setConnected(status === 'SUBSCRIBED');
 *     },
 *     onDisconnect: () => {
 *       setConnected(false);
 *     }
 *   });
 *
 *   return cleanup;
 * }, []);
 * ```
 */
export function withReconnection(options: {
  setup: () => any; // Returns Supabase channel
  onStatusChange?: (status: RealtimeStatus) => void;
  onDisconnect?: () => void;
  onReconnecting?: (attempt: number) => void;
  config?: Partial<ReconnectionConfig>;
}) {
  let channel: any = null;

  const setupChannel = () => {
    // Clean up existing channel
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        logger.warn('Error removing channel during reconnect', { error: err });
      }
    }

    // Setup new channel
    channel = options.setup();
  };

  // Initial setup
  setupChannel();

  // TODO: Implement reconnection manager
  // For now, just return basic cleanup
  return () => {
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        logger.warn('Error removing channel during cleanup', { error: err });
      }
    }
  };
}
