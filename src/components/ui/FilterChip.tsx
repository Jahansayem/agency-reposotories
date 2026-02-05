'use client';

import { motion, type Variants } from 'framer-motion';
import { X } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/animations';

interface FilterChipProps {
  label: string;
  onClear: () => void;
  variant?: 'default' | 'primary' | 'danger';
  maxWidth?: string;
}

/**
 * FilterChip Component
 *
 * A pill-shaped button showing an active filter with dismiss action.
 *
 * Features:
 * - 44px minimum touch target (WCAG 2.5.5)
 * - Spring entrance animation
 * - Scale exit animation
 * - Truncation for long labels
 * - Accessible dismiss button
 */

const chipVariants: Variants = {
  initial: { opacity: 0, scale: 0.8, x: -10 },
  animate: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    x: 10,
    transition: { duration: 0.15 }
  },
  tap: { scale: 0.95 }
};

const variantStyles = {
  default: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 hover:bg-[var(--accent)]/20',
  primary: 'bg-[var(--accent)] text-white border-transparent hover:bg-[var(--accent)]/90',
  danger: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20 hover:bg-[var(--danger)]/20',
};

export function FilterChip({
  label,
  onClear,
  variant = 'default',
  maxWidth = 'max-w-[180px]',
}: FilterChipProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClear}
      variants={reducedMotion ? undefined : chipVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileTap={reducedMotion ? undefined : "tap"}
      className={`
        inline-flex items-center gap-2
        min-h-[44px] px-3 py-2
        text-sm font-medium
        rounded-full
        border
        transition-colors
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1
        touch-manipulation
        ${variantStyles[variant]}
        ${maxWidth}
      `}
      aria-label={`Remove filter: ${label}`}
    >
      <span className="truncate">{label}</span>
      <X className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
    </motion.button>
  );
}

/**
 * FilterChipOverflow Component
 *
 * Shows a "+N more" indicator when there are additional filters.
 */
interface FilterChipOverflowProps {
  count: number;
  onClick: () => void;
}

export function FilterChipOverflow({ count, onClick }: FilterChipOverflowProps) {
  if (count <= 0) return null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[44px] px-3 py-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 touch-manipulation"
      aria-label={`View ${count} more filters`}
    >
      +{count} more
    </motion.button>
  );
}

export default FilterChip;
