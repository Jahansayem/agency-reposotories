'use client';

/**
 * Customer Badge
 *
 * Compact badge showing customer name and segment tier.
 * Used on task cards and in lists.
 */

import type { CustomerSegment } from '@/types/customer';
import { SEGMENT_CONFIGS, type CustomerSegment as ImportedSegment } from '@/constants/customerSegments';

interface CustomerBadgeProps {
  name: string;
  segment: CustomerSegment;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  onClick?: () => void;
}

// Generate segment styles from shared constants
const SEGMENT_STYLES = Object.fromEntries(
  Object.entries(SEGMENT_CONFIGS).map(([key, config]) => [
    key,
    {
      bg: config.gradient.split(' ')[0].replace('from-', 'bg-'), // Extract base color from gradient
      border: config.border,
      text: config.text,
      icon: config.icon,
    },
  ])
) as Record<CustomerSegment, {
  bg: string;
  border: string;
  text: string;
  icon: typeof SEGMENT_CONFIGS.elite.icon;
}>;

export function CustomerBadge({
  name,
  segment,
  size = 'sm',
  showIcon = true,
  onClick,
}: CustomerBadgeProps) {
  const style = SEGMENT_STYLES[segment];
  const Icon = style.icon;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        inline-flex items-center rounded-full font-medium
        ${style.bg} ${style.border} border ${style.text}
        ${sizeClasses}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}
      `}
    >
      {showIcon && <Icon className={iconSize} />}
      <span className="truncate max-w-[120px]">{name}</span>
    </button>
  );
}

/**
 * Minimal segment indicator (just icon + tier)
 */
export function SegmentIndicator({
  segment,
  size = 'sm',
}: {
  segment: CustomerSegment;
  size?: 'sm' | 'md';
}) {
  const style = SEGMENT_STYLES[segment];
  const Icon = style.icon;

  const sizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div
      className={`
        inline-flex items-center justify-center rounded-full
        ${style.bg} ${style.border} border ${style.text}
        ${sizeClasses}
      `}
      title={`${segment.charAt(0).toUpperCase() + segment.slice(1)} tier customer`}
    >
      <Icon className={iconSize} />
    </div>
  );
}

export default CustomerBadge;
