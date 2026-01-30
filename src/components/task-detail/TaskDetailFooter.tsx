'use client';

import { Check, RotateCcw } from 'lucide-react';

interface TaskDetailFooterProps {
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  completed: boolean;
  onToggleComplete: () => void;
  onClose: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
    <div className="flex items-center justify-between border-t border-[var(--border)] py-3 px-4">
      {/* Left side: metadata */}
      <div className="text-xs text-[var(--text-muted)] leading-relaxed">
        {createdBy && (
          <span>
            Created by {createdBy}
            {createdAt && <> &middot; {formatDate(createdAt)}</>}
          </span>
        )}
        {updatedBy && (
          <span className="hidden sm:inline">
            {' '}&middot; Updated by {updatedBy}
          </span>
        )}
      </div>

      {/* Right side: primary action */}
      <button
        onClick={onToggleComplete}
        className={`
          flex items-center gap-1.5 rounded-[var(--radius-lg)] px-4 py-2 text-sm font-medium text-white transition-colors
          ${completed
            ? 'bg-green-600 hover:bg-green-700'
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
    </div>
  );
}
