'use client';

import { AlertTriangle, Flag, Minus, ChevronDown } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/animations';

/**
 * Priority levels supported by the application.
 */
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export interface PriorityBadgeProps {
  /** The priority level to display */
  priority: PriorityLevel;
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the label text */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Priority configuration with escalating visual weight:
 * - URGENT: Solid red fill + subtle pulse + AlertTriangle icon
 * - HIGH:   Solid orange fill + Flag icon
 * - MEDIUM: Light accent fill + border
 * - LOW:    Ghost/outline only, muted text
 */
const priorityConfig: Record<
  PriorityLevel,
  {
    label: string;
    icon: typeof AlertTriangle;
    containerClass: string;
    iconClass: string;
    textClass: string;
    pulse: boolean;
  }
> = {
  urgent: {
    label: 'Urgent',
    icon: AlertTriangle,
    containerClass:
      'bg-[#DC2626] border-[#DC2626] text-white priority-badge-urgent-pulse',
    iconClass: 'text-white',
    textClass: 'text-white font-semibold',
    pulse: true,
  },
  high: {
    label: 'High',
    icon: Flag,
    containerClass:
      'bg-[#D97706] border-[#D97706] text-white',
    iconClass: 'text-white',
    textClass: 'text-white font-semibold',
    pulse: false,
  },
  medium: {
    label: 'Medium',
    icon: Minus,
    containerClass:
      'bg-[var(--accent-light)] border-[var(--accent)]/30 text-[var(--accent)]',
    iconClass: 'text-[var(--accent)]',
    textClass: 'text-[var(--accent)] font-medium',
    pulse: false,
  },
  low: {
    label: 'Low',
    icon: ChevronDown,
    containerClass:
      'bg-transparent border-[var(--border)] text-[var(--text-muted)]',
    iconClass: 'text-[var(--text-muted)]',
    textClass: 'text-[var(--text-muted)] font-normal',
    pulse: false,
  },
};

const sizeConfig = {
  sm: {
    container: 'px-1.5 py-0.5 gap-1 text-badge',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2 py-0.5 gap-1 text-xs',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'px-2.5 py-1 gap-1.5 text-sm',
    icon: 'w-4 h-4',
  },
};

/**
 * PriorityBadge - Displays task priority with escalating visual hierarchy.
 *
 * Visual weight increases with priority:
 * - URGENT: Solid red fill with pulse animation + warning icon
 * - HIGH: Solid orange fill + flag icon
 * - MEDIUM: Light accent fill with subtle border
 * - LOW: Ghost/outline style, minimal visual weight
 *
 * Accessibility:
 * - Pulse animation disabled for prefers-reduced-motion
 * - Includes aria-label for screen readers
 * - Icon paired with text label for clarity
 */
export function PriorityBadge({
  priority,
  size = 'md',
  showLabel = true,
  className = '',
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const sizeStyle = sizeConfig[size];
  const reducedMotion = prefersReducedMotion();
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={`Priority: ${config.label}`}
      className={`
        inline-flex items-center
        ${sizeStyle.container}
        ${config.containerClass}
        border rounded-full
        leading-none whitespace-nowrap
        transition-colors duration-150
        ${config.pulse && !reducedMotion ? '' : 'priority-badge-no-pulse'}
        ${className}
      `}
    >
      <Icon
        className={`${sizeStyle.icon} ${config.iconClass} flex-shrink-0`}
        strokeWidth={priority === 'urgent' ? 2.5 : 2}
      />
      {showLabel && (
        <span className={config.textClass}>{config.label}</span>
      )}
    </span>
  );
}

export default PriorityBadge;
