'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/animations';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveIndicatorProps {
  state: SaveState;
  errorMessage?: string;
  className?: string;
}

/**
 * SaveIndicator component for visual feedback on save operations
 * Follows WCAG 2.1 guidelines with ARIA live regions for screen reader announcements
 */
export function SaveIndicator({ state, errorMessage, className = '' }: SaveIndicatorProps) {
  if (state === 'idle') return null;

  const stateConfig = {
    saving: {
      icon: Loader2,
      text: 'Saving...',
      color: 'text-[var(--text-muted)]',
      bgColor: 'bg-[var(--surface-2)]',
      iconClass: 'animate-spin',
    },
    saved: {
      icon: Check,
      text: 'Saved',
      color: 'text-[var(--success)]',
      bgColor: 'bg-[var(--success)]/10',
      iconClass: '',
    },
    error: {
      icon: AlertCircle,
      text: errorMessage || 'Save failed',
      color: 'text-[var(--danger)]',
      bgColor: 'bg-[var(--danger)]/10',
      iconClass: '',
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={prefersReducedMotion() ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${className}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Icon
          className={`w-4 h-4 ${config.color} ${config.iconClass}`}
          aria-hidden="true"
        />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact version for inline use (e.g., in forms)
 */
export function SaveIndicatorCompact({ state, errorMessage }: Omit<SaveIndicatorProps, 'className'>) {
  if (state === 'idle') return null;

  const stateConfig = {
    saving: {
      icon: Loader2,
      color: 'text-[var(--text-muted)]',
      iconClass: 'animate-spin',
      label: 'Saving',
    },
    saved: {
      icon: Check,
      color: 'text-[var(--success)]',
      iconClass: '',
      label: 'Saved',
    },
    error: {
      icon: AlertCircle,
      color: 'text-[var(--danger)]',
      iconClass: '',
      label: errorMessage || 'Error',
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <motion.div
      key={state}
      initial={prefersReducedMotion() ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={config.label}
    >
      <Icon
        className={`w-3.5 h-3.5 ${config.color} ${config.iconClass}`}
        aria-hidden="true"
      />
    </motion.div>
  );
}
