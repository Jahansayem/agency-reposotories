'use client';

import { useState } from 'react';
import { Clock, Phone, Mail, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Todo, WaitingContactType } from '@/types/todo';
import {
  WAITING_CONTACT_CONFIG,
  formatWaitingDuration,
  isFollowUpOverdue,
  DEFAULT_FOLLOW_UP_HOURS,
} from '@/types/todo';

interface WaitingStatusBadgeProps {
  todo: Todo;
  onMarkWaiting: (contactType: WaitingContactType, followUpHours?: number) => Promise<void>;
  onClearWaiting: () => Promise<void>;
  compact?: boolean;
  disabled?: boolean; // Disable the badge when user cannot edit
}

export function WaitingStatusBadge({
  todo,
  onMarkWaiting,
  onClearWaiting,
  compact = false,
  disabled = false,
}: WaitingStatusBadgeProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const isWaiting = todo.waiting_for_response && todo.waiting_since;
  const isOverdue = isWaiting && isFollowUpOverdue(todo);
  const contactConfig = todo.waiting_contact_type
    ? WAITING_CONTACT_CONFIG[todo.waiting_contact_type]
    : null;

  const handleMarkWaiting = async (contactType: WaitingContactType) => {
    setLoading(true);
    try {
      await onMarkWaiting(contactType, DEFAULT_FOLLOW_UP_HOURS);
      setShowMenu(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClearWaiting = async () => {
    setLoading(true);
    try {
      await onClearWaiting();
    } finally {
      setLoading(false);
    }
  };

  // Compact view for collapsed task - just show icon and duration
  if (compact && isWaiting) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isOverdue
            ? 'bg-red-500/20 text-red-600 dark:text-red-400'
            : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
        }`}
        title={`Waiting for ${contactConfig?.label || 'response'} - ${formatWaitingDuration(todo.waiting_since!)}`}
      >
        {isOverdue ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <Clock className="w-3 h-3" />
        )}
        <span>{formatWaitingDuration(todo.waiting_since!)}</span>
      </div>
    );
  }

  // Full view for expanded task
  return (
    <div className="relative">
      {isWaiting ? (
        // Currently waiting - show status and clear button
        <div
          className={`flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border ${
            isOverdue
              ? 'bg-red-500/10 border-red-500/30 dark:bg-red-500/15'
              : 'bg-purple-500/10 border-purple-500/30 dark:bg-purple-500/15'
          }`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isOverdue ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <Clock className="w-4 h-4 text-purple-500" />
              )}
              <span className={`text-sm font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
                Waiting for Response
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
              <div className="flex items-center gap-1">
                <span>Since:</span>
                <span className="font-medium">
                  {new Date(todo.waiting_since!).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-[var(--text-tertiary)]">
                  ({formatWaitingDuration(todo.waiting_since!)})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>Contact:</span>
                <span className="font-medium">{contactConfig?.icon} {contactConfig?.label}</span>
              </div>
              {isOverdue && (
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Follow-up overdue!</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleClearWaiting}
            disabled={loading || disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-white text-sm font-medium transition-colors ${
              disabled
                ? 'opacity-60 cursor-not-allowed bg-green-500'
                : 'bg-green-500 hover:bg-green-600 disabled:opacity-50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Responded</span>
          </button>
        </div>
      ) : (
        // Not waiting - show buttons to mark as waiting
        <div className="relative">
          <button
            onClick={() => !disabled && setShowMenu(!showMenu)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] text-sm font-medium transition-colors ${
              disabled
                ? 'opacity-60 cursor-not-allowed bg-[var(--surface)]'
                : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <Clock className="w-4 h-4 text-purple-500" />
            <span>Mark Waiting</span>
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-2 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-lg overflow-hidden min-w-[180px]"
              >
                <div className="p-1">
                  <button
                    onClick={() => handleMarkWaiting('call')}
                    disabled={loading}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-hover)] text-left transition-colors disabled:opacity-50"
                  >
                    <Phone className="w-4 h-4 text-purple-500" />
                    <span>After Phone Call</span>
                  </button>
                  <button
                    onClick={() => handleMarkWaiting('email')}
                    disabled={loading}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-hover)] text-left transition-colors disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span>After Email</span>
                  </button>
                  <button
                    onClick={() => handleMarkWaiting('other')}
                    disabled={loading}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-hover)] text-left transition-colors disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>Other Contact</span>
                  </button>
                </div>
                <div className="border-t border-[var(--border)] px-3 py-2 bg-[var(--surface-secondary)]">
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Reminder after 48 hours
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

// Smaller inline badge for task list
export function WaitingBadge({ todo }: { todo: Todo }) {
  if (!todo.waiting_for_response || !todo.waiting_since) return null;

  const isOverdue = isFollowUpOverdue(todo);
  const contactConfig = todo.waiting_contact_type
    ? WAITING_CONTACT_CONFIG[todo.waiting_contact_type]
    : null;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help ${
        isOverdue
          ? 'bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse'
          : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
      }`}
      title={`Waiting for ${contactConfig?.label || 'response'} since ${new Date(todo.waiting_since).toLocaleString()}`}
    >
      {isOverdue ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      <span>{formatWaitingDuration(todo.waiting_since)}</span>
    </div>
  );
}
