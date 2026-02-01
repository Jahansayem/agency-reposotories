'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Eye } from 'lucide-react';
import { formatDistance } from 'date-fns';

/**
 * ReadReceipts Component
 * Sprint 3 Issue #39: Read Receipts
 *
 * Displays read status for messages with user avatars and timestamps
 *
 * Usage:
 * ```tsx
 * <ReadReceipts
 *   readBy={['Derrick', 'Sefra']}
 *   readAt={{ Derrick: '2025-01-08T10:00:00Z', Sefra: '2025-01-08T10:05:00Z' }}
 *   users={users}
 * />
 * ```
 */

interface ReadReceiptsProps {
  /**
   * User names who have read the message
   */
  readBy: string[];

  /**
   * Read timestamps (user_name -> timestamp)
   */
  readAt: Record<string, string>;

  /**
   * All users (for color mapping)
   */
  users?: Array<{ name: string; color: string }>;

  /**
   * Message sender (to exclude from read receipts)
   */
  sender?: string;

  /**
   * Show detailed view with avatars
   */
  detailed?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Simple read indicator (checkmarks)
 */
export function ReadIndicator({ readBy, sender }: { readBy: string[]; sender?: string }) {
  const othersRead = sender ? readBy.filter((u) => u !== sender) : readBy;

  if (othersRead.length === 0) {
    // Not read by anyone
    return (
      <Check className="w-3 h-3 text-gray-400 dark:text-gray-500" />
    );
  }

  // Read by at least one person
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <CheckCheck className="w-3 h-3 text-blue-500 dark:text-blue-400" />
    </motion.div>
  );
}

/**
 * Detailed read receipts with avatars
 */
export function ReadReceipts({
  readBy,
  readAt,
  users = [],
  sender,
  detailed = false,
  className = '',
}: ReadReceiptsProps) {
  const othersRead = sender ? readBy.filter((u) => u !== sender) : readBy;

  if (othersRead.length === 0) return null;

  // Get user colors
  const getUserColor = (userName: string) => {
    const user = users.find((u) => u.name === userName);
    return user?.color || '#6B7280';
  };

  // Format read time
  const getReadTime = (userName: string) => {
    const timestamp = readAt[userName];
    if (!timestamp) return '';

    try {
      return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (!detailed) {
    // Simple avatar stack
    return (
      <div className={`flex items-center -space-x-1 ${className}`}>
        {othersRead.slice(0, 3).map((userName, index) => (
          <motion.div
            key={userName}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            className="w-4 h-4 rounded-full border border-white dark:border-gray-900 flex items-center justify-center"
            style={{
              backgroundColor: getUserColor(userName),
              zIndex: othersRead.length - index,
            }}
            title={`Read by ${userName} ${getReadTime(userName)}`}
          >
            <span className="text-[8px] text-white font-medium">
              {userName.charAt(0).toUpperCase()}
            </span>
          </motion.div>
        ))}
        {othersRead.length > 3 && (
          <div
            className="w-4 h-4 rounded-full border border-white dark:border-gray-900 bg-gray-400 dark:bg-gray-600 flex items-center justify-center"
            title={`+${othersRead.length - 3} more`}
          >
            <span className="text-[8px] text-white font-medium">
              +{othersRead.length - 3}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Detailed view with names and timestamps
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`space-y-2 ${className}`}
      >
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Eye className="w-3 h-3" />
          <span>Read by {othersRead.length}</span>
        </div>

        <div className="space-y-1">
          {othersRead.map((userName) => (
            <div
              key={userName}
              className="flex items-center justify-between gap-3 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: getUserColor(userName) }}
                >
                  <span className="text-xs text-white font-medium">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {userName}
                </span>
              </div>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getReadTime(userName)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Read count badge
 * Shows number of users who read a message
 */
export function ReadCountBadge({
  count,
  onClick,
}: {
  count: number;
  onClick?: () => void;
}) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      type="button"
      aria-label={`Read by ${count} ${count === 1 ? 'person' : 'people'}`}
    >
      <CheckCheck className="w-3 h-3" />
      <span>{count}</span>
    </button>
  );
}
