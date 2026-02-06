'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { User } from '@/types/todo';

/**
 * PushNotificationSettings Component
 * Sprint 3 Issue #36: Push Notifications
 *
 * Allows users to enable/disable push notifications.
 * Shows permission status and handles subscription management.
 *
 * Usage:
 * ```tsx
 * <PushNotificationSettings currentUser={currentUser} />
 * ```
 */

interface PushNotificationSettingsProps {
  currentUser: User;
  className?: string;
}

export function PushNotificationSettings({
  currentUser,
  className = '',
}: PushNotificationSettingsProps) {
  const {
    supported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    clearError,
  } = usePushNotifications(currentUser);

  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent setState after unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleToggle = useCallback(async () => {
    // Clear any existing timeout
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        setShowSuccess(true);
        successTimeoutRef.current = setTimeout(() => {
          setShowSuccess(false);
          successTimeoutRef.current = null;
        }, 3000);
      }
    } else {
      const success = await subscribe();
      if (success) {
        setShowSuccess(true);
        successTimeoutRef.current = setTimeout(() => {
          setShowSuccess(false);
          successTimeoutRef.current = null;
        }, 3000);
      }
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  // Not supported
  if (!supported) {
    return (
      <div className={`p-4 rounded-lg bg-[var(--surface-2)] ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-[var(--foreground)]">
              Push Notifications Not Supported
            </h4>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Your browser doesn't support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className={`p-4 rounded-lg bg-[var(--danger)]/10 ${className}`}>
        <div className="flex items-start gap-3">
          <BellOff className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-[var(--danger)]">
              Notifications Blocked
            </h4>
            <p className="text-sm text-[var(--danger)]/80 mt-1">
              You've blocked notifications for this site. To enable them, go to your browser settings and allow notifications for this website.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-[var(--accent)]/10' : 'bg-[var(--surface)]'}`}>
            <Bell className={`w-5 h-5 ${isSubscribed ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
          </div>
          <div>
            <h4 className="font-semibold text-[var(--foreground)]">
              Push Notifications
            </h4>
            <p className="text-sm text-[var(--text-muted)]">
              {isSubscribed
                ? 'You will receive push notifications for task reminders and mentions'
                : 'Enable notifications to stay updated on tasks and mentions'
              }
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isSubscribed ? 'bg-[var(--accent)]' : 'bg-[var(--surface)]'}
          `}
          role="switch"
          aria-checked={isSubscribed}
          aria-label="Toggle push notifications"
        >
          {loading ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                transition duration-200 ease-in-out
                ${isSubscribed ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          )}
        </button>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 rounded-lg bg-[var(--danger)]/10"
          >
            <X className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-[var(--danger)] hover:text-[var(--danger)]/80"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-[var(--success)]/10"
          >
            <Check className="w-5 h-5 text-[var(--success)]" />
            <p className="text-sm text-[var(--success)]">
              {isSubscribed
                ? "Push notifications enabled! You'll now receive notifications for task reminders and mentions."
                : 'Push notifications disabled.'
              }
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info about what notifications are sent */}
      {isSubscribed && (
        <div className="p-4 rounded-lg bg-[var(--accent)]/10">
          <h5 className="font-medium text-[var(--accent)] mb-2">
            You'll receive notifications for:
          </h5>
          <ul className="space-y-1 text-sm text-[var(--accent)]/80">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              Task reminders (when you set a reminder)
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              When someone mentions you in chat
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              When a task is assigned to you
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              Daily briefing (if enabled in settings)
            </li>
          </ul>
        </div>
      )}

      {/* Permission request hint */}
      {permission === 'default' && !isSubscribed && (
        <div className="p-4 rounded-lg bg-[var(--surface-2)]">
          <p className="text-sm text-[var(--text-muted)]">
            💡 Enabling notifications will ask for browser permission. Make sure to click "Allow" when prompted.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact push notification toggle button
 * For use in headers/toolbars
 */
export function PushNotificationToggle({
  currentUser,
  className = '',
}: {
  currentUser: User;
  className?: string;
}) {
  const {
    supported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  } = usePushNotifications(currentUser);

  if (!supported || permission === 'denied') {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        p-2 rounded-lg transition-colors
        ${isSubscribed
          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
      aria-label={isSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="w-5 h-5" />
      ) : (
        <BellOff className="w-5 h-5" />
      )}
    </button>
  );
}
