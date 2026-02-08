'use client';

import { Circle } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';

/**
 * PresenceBadge Component
 * Sprint 3 Issue #37: Real-Time Presence Indicators
 *
 * Simple online/offline badge for a specific user
 * Can be attached to user avatars or names
 */

interface PresenceBadgeProps {
  userId: string;
  currentUser?: { name: string; id: string; color: string };
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PresenceBadge({
  userId,
  currentUser,
  size = 'md',
  showLabel = false,
}: PresenceBadgeProps) {
  const { onlineUsers } = usePresence(currentUser);

  const isOnline = onlineUsers.some((u) => u.userId === userId);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  if (showLabel) {
    return (
      <div
        className={`flex items-center gap-1.5 ${
          isOnline
            ? 'text-[var(--success)]'
            : 'text-[var(--text-muted)]'
        }`}
      >
        <Circle className={`${sizeClasses[size]} fill-current ${isOnline ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-medium">{isOnline ? 'Online' : 'Offline'}</span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${
        isOnline
          ? 'bg-[var(--success)] animate-pulse'
          : 'bg-[var(--text-muted)]'
      }`}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}
