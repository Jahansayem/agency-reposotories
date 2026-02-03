'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge variant determines color scheme */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Add pulsing animation for attention */
  pulse?: boolean;
  /** Add dot indicator before text */
  dot?: boolean;
  /** Dot color (only used when dot is true) */
  dotColor?: string;
  /** Icon to show before text */
  icon?: ReactNode;
  /** Make badge interactive (hover states) */
  interactive?: boolean;
}

/**
 * Consistent badge variant styles
 * All badges use the same pattern: light bg + darker text for better contrast
 * Minimum contrast ratio: 4.5:1 for WCAG AA compliance
 */
const variantStyles = {
  default: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: '#64748b',
  },
  primary: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: '#2563eb',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: '#059669',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: '#d97706',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    dot: '#dc2626',
  },
  info: {
    bg: 'bg-sky-50 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    dot: '#0284c7',
  },
  brand: {
    bg: 'bg-gradient-to-r from-[#0033A0] to-[#0047CC]',
    text: 'text-white',
    border: 'border-transparent',
    dot: 'white',
  },
};

const sizeStyles = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    dot: 'w-1.5 h-1.5',
    icon: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-xs',
    dot: 'w-2 h-2',
    icon: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    dot: 'w-2.5 h-2.5',
    icon: 'w-4 h-4',
    gap: 'gap-2',
  },
};

/**
 * Badge Component
 *
 * A versatile badge/tag component for status indicators, labels, and counts.
 * Supports multiple variants, sizes, and optional animations.
 *
 * Features:
 * - Multiple color variants for different contexts
 * - Optional pulsing animation for attention-grabbing
 * - Optional status dot indicator
 * - Icon support
 * - Interactive mode with hover states
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      pulse = false,
      dot = false,
      dotColor,
      icon,
      interactive = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center ${sizeStyle.gap}
          ${sizeStyle.padding} ${sizeStyle.text}
          ${variantStyle.bg} ${variantStyle.text}
          border ${variantStyle.border}
          rounded-full font-medium
          transition-all duration-150 ease-out
          ${interactive ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Pulsing dot */}
        {dot && (
          <span className="relative flex">
            <span
              className={`${sizeStyle.dot} rounded-full`}
              style={{ backgroundColor: dotColor || variantStyle.dot }}
            />
            {pulse && (
              <span
                className={`absolute ${sizeStyle.dot} rounded-full animate-ping`}
                style={{ backgroundColor: dotColor || variantStyle.dot, opacity: 0.75 }}
              />
            )}
          </span>
        )}

        {/* Icon */}
        {!dot && icon && (
          <span className={`${sizeStyle.icon} flex-shrink-0`}>
            {icon}
          </span>
        )}

        {/* Text content */}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/**
 * Animated Badge with entrance/exit animations
 */
export interface AnimatedBadgeProps extends BadgeProps {
  /** Whether the badge is visible */
  show?: boolean;
}

export function AnimatedBadge({ show = true, ...props }: AnimatedBadgeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -4 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        >
          <Badge {...props} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/**
 * Count Badge for notification counts
 */
export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function CountBadge({
  count,
  max = 99,
  variant = 'danger',
  size = 'sm',
  className = ''
}: CountBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  const sizeClasses = {
    sm: 'min-w-[18px] h-[18px] text-badge px-1',
    md: 'min-w-[22px] h-[22px] text-xs px-1.5',
  };

  const variantClasses = {
    default: 'bg-[var(--surface-3)] text-[var(--foreground)]',
    primary: 'bg-[var(--accent)] text-white',
    danger: 'bg-[var(--danger)] text-white',
  };

  return (
    <motion.span
      key={count}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      className={`
        inline-flex items-center justify-center
        ${sizeClasses[size]} ${variantClasses[variant]}
        rounded-full font-semibold
        ${className}
      `}
    >
      {displayCount}
    </motion.span>
  );
}

/**
 * Status Badge with preset configurations
 */
export type StatusType = 'online' | 'away' | 'busy' | 'offline' | 'todo' | 'in_progress' | 'done';

const statusConfig: Record<StatusType, { label: string; variant: BadgeProps['variant']; pulse?: boolean }> = {
  online: { label: 'Online', variant: 'success', pulse: true },
  away: { label: 'Away', variant: 'warning' },
  busy: { label: 'Busy', variant: 'danger' },
  offline: { label: 'Offline', variant: 'default' },
  todo: { label: 'To Do', variant: 'primary' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  done: { label: 'Done', variant: 'success' },
};

export interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showLabel = true,
  className = ''
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      size={size}
      dot
      pulse={config.pulse}
      className={className}
    >
      {showLabel && config.label}
    </Badge>
  );
}

export default Badge;
