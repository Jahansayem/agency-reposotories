/**
 * OpportunityBadge Component
 *
 * Displays a compact cross-sell opportunity indicator in task list rows.
 * Color-coded by priority tier with icons.
 */

'use client';
import { Flame, Zap, TrendingUp } from 'lucide-react';
import type { OpportunityTier } from '@/hooks/useCustomerOpportunities';

interface OpportunityBadgeProps {
  tier: OpportunityTier;
  onClick?: () => void;
}

const TIER_CONFIG = {
  HOT: {
    icon: Flame,
    label: 'HOT',
    className: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
  HIGH: {
    icon: Zap,
    label: 'HIGH',
    className: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  MEDIUM: {
    icon: TrendingUp,
    label: 'OPP',
    className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  },
  LOW: {
    icon: TrendingUp,
    label: 'OPP',
    className: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
} as const;

export default function OpportunityBadge({ tier, onClick }: OpportunityBadgeProps) {
  const { icon: Icon, label, className } = TIER_CONFIG[tier];

  return (
    <button
      onClick={onClick}
      type="button"
      title={`Cross-sell opportunity: ${tier}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${className} transition-opacity hover:opacity-80`}
    >
      <Icon className="w-2.5 h-2.5" aria-hidden />
      {label}
    </button>
  );
}
