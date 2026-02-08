'use client';

import { useState } from 'react';
import { Users, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresence, type OnlineUser } from '@/hooks/usePresence';
import { formatDistance } from 'date-fns';

/**
 * PresenceIndicator Component
 * Sprint 3 Issue #37: Real-Time Presence Indicators
 *
 * Shows which users are currently online
 * Displays user avatars, status, and location
 */

interface PresenceIndicatorProps {
  currentUser: { name: string; id: string; color: string };
  location?: string;
  showAvatars?: boolean;
  maxAvatars?: number;
}

export function PresenceIndicator({
  currentUser,
  location,
  showAvatars = true,
  maxAvatars = 5,
}: PresenceIndicatorProps) {
  const { onlineUsers, onlineCount } = usePresence(currentUser, location);
  const [showTooltip, setShowTooltip] = useState(false);

  // Filter out current user from list
  const otherUsers = onlineUsers.filter((u) => u.userId !== currentUser.id);
  const displayUsers = otherUsers.slice(0, maxAvatars);
  const remainingCount = Math.max(0, otherUsers.length - maxAvatars);

  // Get location label
  const getLocationLabel = (loc?: string) => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      tasks: 'Tasks',
      chat: 'Chat',
      activity: 'Activity',
      goals: 'Goals',
    };
    return labels[loc || 'tasks'] || 'App';
  };

  if (otherUsers.length === 0) {
    return null; // Don't show if no one else is online
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Avatar Stack */}
      {showAvatars && (
        <div className="flex items-center -space-x-2">
          {displayUsers.map((user, index) => (
            <div
              key={user.userId}
              className="relative"
              style={{ zIndex: displayUsers.length - index }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-[var(--surface)] flex items-center justify-center text-white text-xs font-semibold shadow-md"
                style={{ backgroundColor: user.color }}
                title={user.user}
              >
                {user.user.charAt(0).toUpperCase()}
              </div>

              {/* Online indicator dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] border-2 border-[var(--surface)] rounded-full">
                <div className="w-full h-full bg-[var(--success)] rounded-full animate-pulse" />
              </div>
            </div>
          ))}

          {/* +N more indicator */}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full border-2 border-[var(--surface)] bg-[var(--text-muted)] flex items-center justify-center text-white text-xs font-semibold shadow-md">
              +{remainingCount}
            </div>
          )}
        </div>
      )}

      {/* Compact indicator (no avatars) */}
      {!showAvatars && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
          <Circle className="w-2 h-2 fill-current animate-pulse" />
          <span className="text-sm font-medium">{otherUsers.length} online</span>
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 mt-2 w-64 p-3 bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] z-50"
          >
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
              <Users className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {otherUsers.length} {otherUsers.length === 1 ? 'person' : 'people'} online
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {otherUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--success)] border-2 border-[var(--surface)] rounded-full" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {user.user}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span>{getLocationLabel(user.location)}</span>
                      <span>•</span>
                      <span>{formatDistance(user.onlineAt, new Date(), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
