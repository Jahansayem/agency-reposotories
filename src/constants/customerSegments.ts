/**
 * Customer Segment Constants - Single Source of Truth
 *
 * Comprehensive segment configuration with display properties, icons, and analytics data.
 * All components should import segment definitions from this file.
 *
 * IMPORTANT: Do NOT duplicate segment definitions elsewhere. Always import from this module.
 *
 * Related modules:
 * - src/lib/segmentation.ts - Core segmentation algorithm (uses these configs)
 * - src/types/customer.ts - CustomerSegment type definition
 */

import { Crown, Star, Shield, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================
// Types
// ============================================

/**
 * Customer segment tiers from highest to lowest value
 */
export type CustomerSegment = 'elite' | 'premium' | 'standard' | 'entry';

/**
 * Tailwind color classes for each segment
 */
export type SegmentColorClass = 'amber' | 'purple' | 'blue' | 'sky';

/**
 * Comprehensive segment configuration including display and analytics properties
 */
export interface SegmentConfig {
  /** Segment tier identifier */
  segment: CustomerSegment;
  /** Human-readable label */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tailwind color class (for text/bg utilities) */
  color: SegmentColorClass;
  /** Hex color code for direct styling */
  hexColor: string;
  /** Tailwind gradient classes */
  gradient: string;
  /** Tailwind border classes */
  border: string;
  /** Tailwind text color classes */
  text: string;
  /** Brief description */
  description: string;
  /** Average lifetime value */
  avgLtv: number;
  /** Target customer acquisition cost */
  targetCac: number;
  /** Key characteristics for display */
  characteristics: string[];
}

// ============================================
// Segment Configurations
// ============================================

/**
 * Canonical segment configurations.
 * Single source of truth for all segment-related display and data properties.
 */
export const SEGMENT_CONFIGS: Record<CustomerSegment, SegmentConfig> = {
  elite: {
    segment: 'elite',
    label: 'Elite',
    icon: Crown,
    color: 'amber',
    hexColor: '#C9A227',
    gradient: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    description: 'High-value customers with 4+ products',
    avgLtv: 18000,
    targetCac: 1200,
    characteristics: ['4+ policies', 'High retention', 'Referral source'],
  },
  premium: {
    segment: 'premium',
    label: 'Premium',
    icon: Star,
    color: 'purple',
    hexColor: '#9333EA',
    gradient: 'from-purple-500/20 to-purple-500/5',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    description: 'Multi-product bundled customers',
    avgLtv: 9000,
    targetCac: 700,
    characteristics: ['2-3 policies', 'Bundled', 'Auto + Home'],
  },
  standard: {
    segment: 'standard',
    label: 'Standard',
    icon: Shield,
    color: 'blue',
    hexColor: '#3B82F6',
    gradient: 'from-blue-500/20 to-blue-500/5',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    description: 'Single or dual product customers',
    avgLtv: 4500,
    targetCac: 400,
    characteristics: ['1-2 policies', 'Mid-tenure', 'Growth potential'],
  },
  entry: {
    segment: 'entry',
    label: 'Entry',
    icon: Users,
    color: 'sky',
    hexColor: '#0EA5E9',
    gradient: 'from-sky-500/20 to-sky-500/5',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    description: 'New or low-premium customers',
    avgLtv: 1800,
    targetCac: 200,
    characteristics: ['Single policy', 'New customer', 'Conversion target'],
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get segment configuration by tier.
 * Returns undefined if segment doesn't exist (type-safe).
 *
 * @param segment - The customer segment tier
 * @returns Segment configuration or undefined
 */
export function getSegmentConfig(segment: CustomerSegment): SegmentConfig | undefined {
  return SEGMENT_CONFIGS[segment];
}

/**
 * Get all segment tiers in order (elite → entry).
 *
 * @returns Array of all segment tiers
 */
export const ALL_SEGMENTS: CustomerSegment[] = ['elite', 'premium', 'standard', 'entry'];

/**
 * Get segment color class for Tailwind utilities.
 *
 * @param segment - The customer segment tier
 * @returns Tailwind color class or undefined
 */
export function getSegmentColor(segment: CustomerSegment): SegmentColorClass | undefined {
  return SEGMENT_CONFIGS[segment]?.color;
}

/**
 * Get segment hex color for direct styling.
 *
 * @param segment - The customer segment tier
 * @returns Hex color code or undefined
 */
export function getSegmentHexColor(segment: CustomerSegment): string | undefined {
  return SEGMENT_CONFIGS[segment]?.hexColor;
}

/**
 * Get segment icon component.
 *
 * @param segment - The customer segment tier
 * @returns Lucide icon component or undefined
 */
export function getSegmentIcon(segment: CustomerSegment): LucideIcon | undefined {
  return SEGMENT_CONFIGS[segment]?.icon;
}

// ============================================
// Default Export
// ============================================

export default {
  SEGMENT_CONFIGS,
  getSegmentConfig,
  getSegmentColor,
  getSegmentHexColor,
  getSegmentIcon,
  ALL_SEGMENTS,
};
