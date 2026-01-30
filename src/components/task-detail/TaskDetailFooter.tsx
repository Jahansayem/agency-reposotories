'use client';

import { Check, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface TaskDetailFooterProps {
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  completed: boolean;
  onToggleComplete: () => void;
  onClose: () => void;
}

function formatAbsoluteDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatAbsoluteDate(dateStr);
}

export default function TaskDetailFooter({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  completed,
  onToggleComplete,
  onClose,
}: TaskDetailFooterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="flex-shrink-0 flex items-center justify-between border-t border-[var(--border)] py-3 px-4 bg-[var(--surface-2)]/60 backdrop-blur-sm"
    >
      {/* Left side: metadata */}
      <div className="text-xs text-[var(--text-muted)] leading-relaxed">
        {createdBy && (
          <span title={createdAt ? formatAbsoluteDate(createdAt) : undefined}>
            Created by {createdBy}
            {createdAt && <> &middot; {formatRelativeTime(createdAt)}</>}
          </span>
        )}
        {updatedBy && (
          <span
            className="hidden sm:inline"
            title={updatedAt ? formatAbsoluteDate(updatedAt) : undefined}
          >
            {' '}&middot; Updated by {updatedBy}
            {updatedAt && <> {formatRelativeTime(updatedAt)}</>}
          </span>
        )}
      </div>

      {/* Right side: primary action */}
      <button
        onClick={onToggleComplete}
        className={`
          flex items-center gap-1.5 rounded-[var(--radius-lg)] px-5 py-2.5 text-sm font-medium text-white transition-colors shadow-[var(--shadow-sm)]
          ${completed
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
          }
        `}
      >
        {completed ? (
          <>
            <RotateCcw size={15} />
            Reopen
          </>
        ) : (
          <>
            <Check size={15} />
            Mark Done
          </>
        )}
      </button>
    </motion.div>
  );
}
