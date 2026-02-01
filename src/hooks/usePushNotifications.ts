'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@/types/todo';

/**
 * usePushNotifications Hook
 * Sprint 3 Issue #36: Push Notifications
 *
 * Manages Web Push notification subscriptions and permissions.
 * Handles service worker registration, subscription management,
 * and sending push notifications.
 *
 * Usage:
 * ```tsx
 * const { permission, subscribe, unsubscribe, isSubscribed, supported } = usePushNotifications(currentUser);
 * ```
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications(currentUser?: User) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check if Push API is supported
  const supported = typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  /**
   * Get current notification permission status
   */
  const checkPermission = useCallback(() => {
    if (!supported) return 'denied';
    return Notification.permission as NotificationPermission;
  }, [supported]);

  /**
   * Register service worker
   */
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!supported) {
      console.warn('Service workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('✅ Service worker registered');
      return registration;
    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
      setError('Failed to register service worker');
      return null;
    }
  }, [supported]);

  /**
   * Get current push subscription
   */
  const getCurrentSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (!supported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }, [supported]);

  /**
   * Convert subscription to JSON
   */
  const subscriptionToJSON = (sub: PushSubscription): PushSubscriptionJSON => {
    const json = sub.toJSON();
    return {
      endpoint: json.endpoint!,
      keys: {
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
      },
    };
  };

  /**
   * Save subscription to database
   */
  const saveSubscription = useCallback(async (
    sub: PushSubscription,
    userId: string
  ): Promise<boolean> => {
    try {
      const subJSON = subscriptionToJSON(sub);

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', subJSON.endpoint)
        .single();

      if (existing) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('push_subscriptions')
          .update({
            user_id: userId,
            p256dh_key: subJSON.keys.p256dh,
            auth_key: subJSON.keys.auth,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new subscription
        const { error: insertError } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: userId,
            endpoint: subJSON.endpoint,
            p256dh_key: subJSON.keys.p256dh,
            auth_key: subJSON.keys.auth,
          });

        if (insertError) throw insertError;
      }

      console.log('✅ Subscription saved to database');
      return true;
    } catch (error) {
      console.error('Failed to save subscription:', error);
      setError('Failed to save subscription');
      return false;
    }
  }, []);

  /**
   * Delete subscription from database
   */
  const deleteSubscription = useCallback(async (endpoint: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      if (error) throw error;

      console.log('✅ Subscription deleted from database');
      return true;
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      return false;
    }
  }, []);

  /**
   * Subscribe to push notifications
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
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermission);

      if (perm !== 'granted') {
        setError('Notification permission denied');
        setLoading(false);
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        setLoading(false);
        return false;
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      // In production, this should be loaded from a secure endpoint
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BNxsVGmiA6-Lx-qP7YQdKn9K7k4lN9l5Gi5lUP2VhQCj7BDqCJKf8bKwZ9L5YxLjN8K7k4lN9l5Gi5lUP2VhQCj';

      // Convert VAPID key to Uint8Array
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      setSubscription(sub);

      // Save subscription to database
      const saved = await saveSubscription(sub, currentUser.id);

      if (saved) {
        setIsSubscribed(true);
        console.log('✅ Subscribed to push notifications');
        setLoading(false);
        return true;
      } else {
        // Unsubscribe if save failed
        await sub.unsubscribe();
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setError(error instanceof Error ? error.message : 'Subscription failed');
      setLoading(false);
      return false;
    }
  }, [supported, currentUser, registerServiceWorker, saveSubscription]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      setError('No active subscription');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const subJSON = subscriptionToJSON(subscription);

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Delete from database
      await deleteSubscription(subJSON.endpoint);

      setSubscription(null);
      setIsSubscribed(false);

      console.log('✅ Unsubscribed from push notifications');
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setError(error instanceof Error ? error.message : 'Unsubscribe failed');
      setLoading(false);
      return false;
    }
  }, [subscription, deleteSubscription]);

  /**
   * Check current subscription status on mount
   */
  useEffect(() => {
    if (!supported || !currentUser) return;

    const checkStatus = async () => {
      const perm = checkPermission();
      setPermission(perm);

      if (perm === 'granted') {
        const sub = await getCurrentSubscription();
        if (sub) {
          setSubscription(sub);
          setIsSubscribed(true);
        }
      }
    };

    checkStatus();
  }, [supported, currentUser, checkPermission, getCurrentSubscription]);

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

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray as BufferSource;
}
