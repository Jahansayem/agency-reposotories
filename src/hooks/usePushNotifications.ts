'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types/todo';
import {
  isPushSupported,
  getNotificationPermission,
  enablePushNotifications,
  disablePushNotifications,
  getServiceWorkerRegistration,
} from '@/lib/webPushService';
import { logger } from '@/lib/logger';

/**
 * usePushNotifications Hook
 *
 * Manages Web Push notification subscriptions and permissions.
 * Delegates all subscription logic to webPushService which uses
 * the /api/push-subscribe endpoint and device_tokens table.
 *
 * Usage:
 * ```tsx
 * const { permission, subscribe, unsubscribe, isSubscribed, supported } = usePushNotifications(currentUser);
 * ```
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';

export function usePushNotifications(currentUser?: User) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check if Push API is supported
  const supported = isPushSupported();

  /**
   * Subscribe to push notifications
   * Uses webPushService.enablePushNotifications which handles:
   * - Permission request
   * - Service worker registration + activation wait
   * - Push subscription creation
   * - Server-side save via /api/push-subscribe
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      setError('Push notifications not supported');
      return false;
    }

    if (!currentUser) {
      setError('User not logged in');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await enablePushNotifications(currentUser.id, currentUser.name);

      if (result.success) {
        setPermission('granted');
        setIsSubscribed(true);
        // Try to get the subscription object for local state
        const reg = await getServiceWorkerRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setSubscription(sub);
        }
        return true;
      } else {
        setError(result.error || 'Failed to subscribe');
        // Update permission if it was denied
        if (result.error?.includes('denied')) {
          setPermission('denied');
        }
        return false;
      }
    } catch (err) {
      logger.error('Subscription error', err as Error, { component: 'usePushNotifications', action: 'subscribe', userId: currentUser?.id });
      setError(err instanceof Error ? err.message : 'Subscription failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, currentUser]);

  /**
   * Unsubscribe from push notifications
   * Uses webPushService.disablePushNotifications which handles:
   * - Server-side removal via /api/push-subscribe DELETE
   * - Local push manager unsubscribe
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      setError('User not logged in');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await disablePushNotifications(currentUser.id, currentUser.name);

      if (success) {
        setSubscription(null);
        setIsSubscribed(false);
        return true;
      } else {
        setError('Failed to unsubscribe');
        return false;
      }
    } catch (err) {
      logger.error('Unsubscribe error', err as Error, { component: 'usePushNotifications', action: 'unsubscribe', userId: currentUser?.id });
      setError(err instanceof Error ? err.message : 'Unsubscribe failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Check current subscription status on mount.
   * Uses getRegistration() instead of navigator.serviceWorker.ready
   * to avoid hanging when no service worker is registered.
   */
  useEffect(() => {
    if (!supported || !currentUser) return;

    const checkStatus = async () => {
      const perm = getNotificationPermission() as NotificationPermission;
      setPermission(perm);

      if (perm === 'granted') {
        try {
          const reg = await getServiceWorkerRegistration();
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              setSubscription(sub);
              setIsSubscribed(true);
            }
          }
        } catch {
          // SW not available, subscription status unknown
        }
      }
    };

    checkStatus();
  }, [supported, currentUser]);

  return {
    /** Whether Push API is supported */
    supported,

    /** Current notification permission status */
    permission,

    /** Whether user is subscribed to push notifications */
    isSubscribed,

    /** Whether an operation is in progress */
    loading,

    /** Error message if any */
    error,

    /** Current push subscription */
    subscription,

    /** Subscribe to push notifications */
    subscribe,

    /** Unsubscribe from push notifications */
    unsubscribe,

    /** Clear error state */
    clearError: () => setError(null),
  };
}
