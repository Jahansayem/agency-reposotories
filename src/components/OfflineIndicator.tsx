'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOfflineStatus, forceSyncNow } from '@/lib/db/offlineSync';
import { logger } from '@/lib/logger';

/**
 * OfflineIndicator Component
 * Sprint 3 Issue #35: Offline Mode with IndexedDB
 *
 * Shows online/offline status and pending sync operations
 * Allows manual sync trigger when online
 */

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const updateStatus = async () => {
      const status = await getOfflineStatus();
      setIsOnline(status.isOnline);
      setPendingSyncCount(status.pendingSyncCount + status.unsyncedMessagesCount);
    };

    // Set initial status
    setIsOnline(navigator.onLine);
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Manual sync
  const handleSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      await forceSyncNow();
      setPendingSyncCount(0);
    } catch (error) {
      logger.error('Sync failed', error as Error, { component: 'OfflineIndicator', action: 'handleSync' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show indicator if online and no pending syncs
  if (isOnline && pendingSyncCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Main indicator */}
          <button
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
              transition-all duration-200
              ${
                isOnline
                  ? 'bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
              }
              ${isSyncing ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
            `}
          >
            {/* Icon */}
            {isOnline ? (
              isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )
            ) : (
              <WifiOff className="w-4 h-4" />
            )}

            {/* Status text */}
            <span className="text-sm font-medium">
              {isOnline
                ? isSyncing
                  ? 'Syncing...'
                  : pendingSyncCount > 0
                  ? `${pendingSyncCount} pending`
                  : 'Online'
                : 'Offline'}
            </span>

            {/* Pending badge */}
            {pendingSyncCount > 0 && !isSyncing && (
              <span className="bg-[var(--warning)] text-[var(--warning-foreground)] text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[var(--surface-2)] text-[var(--foreground)] text-sm rounded-lg shadow-xl border border-[var(--border)]"
              >
                {isOnline ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-4 h-4 text-[var(--success)]" />
                      <span className="font-semibold">Online</span>
                    </div>
                    {pendingSyncCount > 0 ? (
                      <p className="text-[var(--text-muted)]">
                        {pendingSyncCount} change{pendingSyncCount > 1 ? 's' : ''} pending sync.
                        Click to sync now.
                      </p>
                    ) : (
                      <p className="text-[var(--text-muted)]">All changes synced.</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <WifiOff className="w-4 h-4 text-[var(--danger)]" />
                      <span className="font-semibold">Offline</span>
                    </div>
                    <p className="text-[var(--text-muted)]">
                      You can still create and edit tasks. Changes will sync automatically when
                      you&apos;re back online.
                    </p>
                    {pendingSyncCount > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-[var(--warning)]">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">
                          {pendingSyncCount} change{pendingSyncCount > 1 ? 's' : ''} waiting to
                          sync
                        </span>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
