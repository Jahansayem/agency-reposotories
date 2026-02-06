'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@/types/todo';

/**
 * TypingIndicator Component
 * Sprint 3 Issue #38: Enhanced Typing Indicators
 *
 * Displays animated "User is typing..." indicators for real-time chat
 * Shows up to 3 users with animated dots
 *
 * Usage:
 * ```tsx
 * <TypingIndicator typingUsers={typingUsers} />
 * ```
 */

interface TypingState {
  user: string;
  userId: string;
  color: string;
  channel: string;
  timestamp: number;
}

interface TypingIndicatorProps {
  /**
   * Users currently typing
   */
  typingUsers: TypingState[];

  /**
   * Maximum users to display (default: 3)
   */
  maxUsers?: number;

  /**
   * Component size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Animated typing dots
 */
function TypingDots({ color }: { color?: string }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ y: 0 }}
          animate={{
            y: [-2, 0, -2],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: color || '#6B7280',
          }}
        />
      ))}
    </div>
  );
}

export function TypingIndicator({
  typingUsers,
  maxUsers = 3,
  size = 'md',
  className = '',
}: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const displayUsers = typingUsers.slice(0, maxUsers);
  const remainingCount = typingUsers.length - maxUsers;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  // Format user names
  const formatUserNames = () => {
    if (displayUsers.length === 0) return '';
    if (displayUsers.length === 1) {
      return `${displayUsers[0].user} is typing`;
    }
    if (displayUsers.length === 2) {
      return `${displayUsers[0].user} and ${displayUsers[1].user} are typing`;
    }
    if (displayUsers.length === 3 && remainingCount === 0) {
      return `${displayUsers[0].user}, ${displayUsers[1].user}, and ${displayUsers[2].user} are typing`;
    }
    // More than 3 users
    return `${displayUsers[0].user}, ${displayUsers[1].user}, and ${remainingCount + 1} others are typing`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`
          inline-flex items-center gap-2
          rounded-full
          bg-[var(--surface-2)]
          ${sizeClasses[size]}
          ${className}
        `}
        role="status"
        aria-live="polite"
        aria-label={formatUserNames()}
      >
        {/* User avatars */}
        <div className="flex items-center -space-x-1">
          {displayUsers.map((user, index) => (
            <div
              key={user.userId}
              className={`
                flex items-center justify-center
                rounded-full
                border-2 border-[var(--surface)]
                ${size === 'sm' ? 'w-5 h-5 text-xs' : ''}
                ${size === 'md' ? 'w-6 h-6 text-xs' : ''}
                ${size === 'lg' ? 'w-8 h-8 text-sm' : ''}
              `}
              style={{
                backgroundColor: user.color,
                zIndex: displayUsers.length - index,
              }}
              title={user.user}
            >
              <span className="text-white font-medium">
                {user.user.charAt(0).toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Typing text */}
        <span className="text-[var(--text-muted)] font-medium">
          {formatUserNames()}
        </span>

        {/* Animated dots */}
        <TypingDots color={displayUsers[0]?.color} />
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Minimal typing indicator (just animated dots)
 * For use in compact spaces like chat input footer
 */
export function TypingIndicatorMinimal({
  typingUsers,
  className = '',
}: {
  typingUsers: TypingState[];
  className?: string;
}) {
  if (typingUsers.length === 0) return null;

  const formatUserNames = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].user} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].user} and ${typingUsers[1].user} are typing...`;
    }
    return `${typingUsers.length} people are typing...`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-muted)] ${className}`}
        role="status"
        aria-live="polite"
        aria-label={formatUserNames()}
      >
        <TypingDots />
        <span>{formatUserNames()}</span>
      </motion.div>
    </AnimatePresence>
  );
}
