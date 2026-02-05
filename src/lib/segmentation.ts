/**
 * Customer Segmentation - Single Source of Truth
 *
 * This module provides the canonical customer segmentation algorithm used across
 * the entire application. All segmentation logic should import from here.
 *
 * IMPORTANT: Do NOT duplicate this logic elsewhere. Always import from this module.
 *
 * Segmentation Philosophy:
 * - Uses BOTH premium AND policy count for accurate tiering
 * - High premium OR high policy count can qualify for upper tiers
 * - Thresholds designed for insurance agency book of business
 *
 * Segment Characteristics:
 * - Elite: High-value multi-policy customers (97% retention, $18K LTV)
 * - Premium: Solid bundled customers (91% retention, $9K LTV)
 * - Standard: Growing relationship (72% retention, $4.5K LTV)
 * - Entry: New or single-policy (65% retention, $1.8K LTV)
 */

// ============================================
// Types
// ============================================

/**
 * Customer segment tiers from highest to lowest value
 */
export type SegmentTier = 'elite' | 'premium' | 'standard' | 'entry';

/**
 * Service tier for customer handling
 */
export type ServiceTier = 'white_glove' | 'standard' | 'automated';

/**
 * Configuration for each segment tier including display properties
 */
export interface SegmentConfig {
  /** Human-readable label */
  label: string;
  /** Hex color for UI display */
  color: string;
  /** Average lifetime value for this segment */
  avgLtv: number;
  /** Average retention rate (0-1) */
  avgRetention: number;
  /** Recommended customer acquisition cost */
  recommendedCac: number;
  /** Service tier for handling */
  serviceTier: ServiceTier;
  /** Brief description */
  description: string;
}

// ============================================
// Segment Configuration
// ============================================

/**
 * Canonical segment configurations with display and analytics properties.
 * These values are aligned with insurance industry benchmarks.
 */
export const SEGMENT_CONFIGS: Record<SegmentTier, SegmentConfig> = {
  elite: {
    label: 'Elite',
    color: '#C9A227', // Gold
    avgLtv: 18000,
    avgRetention: 0.97,
    recommendedCac: 1200,
    serviceTier: 'white_glove',
    description: 'High-value multi-product customer',
  },
  premium: {
    label: 'Premium',
    color: '#9333EA', // Purple
    avgLtv: 9000,
    avgRetention: 0.91,
    recommendedCac: 700,
    serviceTier: 'standard',
    description: 'Bundled product customer',
  },
  standard: {
    label: 'Standard',
    color: '#3B82F6', // Blue
    avgLtv: 4500,
    avgRetention: 0.72,
    recommendedCac: 400,
    serviceTier: 'standard',
    description: 'Growth potential customer',
  },
  entry: {
    label: 'Entry',
    color: '#0EA5E9', // Sky blue
    avgLtv: 1800,
    avgRetention: 0.65,
    recommendedCac: 200,
    serviceTier: 'automated',
    description: 'New or single-product customer',
  },
};

// ============================================
// Segmentation Thresholds
// ============================================

/**
 * Threshold configuration for segmentation algorithm.
 * Modify these values to adjust segmentation boundaries.
 */
export const SEGMENT_THRESHOLDS = {
  elite: {
    // Qualify via high premium AND multiple policies
    premiumWithPolicies: { premium: 15000, policies: 3 },
    // OR exceptionally high in one dimension
    premiumOnly: 20000,
    policiesOnly: 5,
  },
  premium: {
    // Qualify via good premium AND bundled
    premiumWithPolicies: { premium: 7000, policies: 2 },
    // OR high in one dimension
    premiumOnly: 10000,
    policiesOnly: 4,
  },
  standard: {
    // Qualify via minimum premium OR multiple policies
    premium: 3000,
    policies: 2,
  },
  // Entry: everything else
};

// ============================================
// Segmentation Function
// ============================================

/**
 * Canonical customer segmentation algorithm.
 *
 * Determines customer segment based on total premium and policy count.
 * Uses a combination of AND/OR logic for nuanced tiering:
 *
 * - Elite: (premium >= $15K AND policies >= 3) OR (premium >= $20K) OR (policies >= 5)
 * - Premium: (premium >= $7K AND policies >= 2) OR (premium >= $10K) OR (policies >= 4)
 * - Standard: premium >= $3K OR policies >= 2
 * - Entry: everything else
 *
 * @param totalPremium - Total annual premium in dollars
 * @param policyCount - Number of policies/products held
 * @returns The customer's segment tier
 *
 * @example
 * ```typescript
 * // High-value multi-policy customer
 * getCustomerSegment(18000, 4); // returns 'elite'
 *
 * // Single high-premium policy
 * getCustomerSegment(25000, 1); // returns 'elite' (premium alone qualifies)
 *
 * // Growing customer
 * getCustomerSegment(5000, 2); // returns 'standard'
 *
 * // New customer
 * getCustomerSegment(1500, 1); // returns 'entry'
 * ```
 */
export function getCustomerSegment(totalPremium: number, policyCount: number): SegmentTier {
  const { elite, premium, standard } = SEGMENT_THRESHOLDS;

  // Elite: High-value multi-policy customers
  // Must have BOTH high premium AND multiple policies, OR exceptional in one dimension
  if (
    (totalPremium >= elite.premiumWithPolicies.premium && policyCount >= elite.premiumWithPolicies.policies) ||
    totalPremium >= elite.premiumOnly ||
    policyCount >= elite.policiesOnly
  ) {
    return 'elite';
  }

  // Premium: Solid book customers
  // Must have good premium AND be bundled, OR high in one dimension
  if (
    (totalPremium >= premium.premiumWithPolicies.premium && policyCount >= premium.premiumWithPolicies.policies) ||
    totalPremium >= premium.premiumOnly ||
    policyCount >= premium.policiesOnly
  ) {
    return 'premium';
  }

  // Standard: Growing relationship
  // Either decent premium OR multiple policies
  if (totalPremium >= standard.premium || policyCount >= standard.policies) {
    return 'standard';
  }

  // Entry: New or single-policy
  return 'entry';
}

/**
 * Get segment configuration for a customer.
 *
 * @param totalPremium - Total annual premium in dollars
 * @param policyCount - Number of policies/products held
 * @returns Object containing segment tier and its configuration
 */
export function getCustomerSegmentWithConfig(
  totalPremium: number,
  policyCount: number
): { segment: SegmentTier; config: SegmentConfig } {
  const segment = getCustomerSegment(totalPremium, policyCount);
  return {
    segment,
    config: SEGMENT_CONFIGS[segment],
  };
}

/**
 * Calculate estimated LTV for a customer based on segment.
 *
 * Uses segment-specific retention rates and a simple LTV calculation:
 * LTV = (Premium × Commission Rate × Expected Years) - Servicing Costs
 *
 * @param totalPremium - Total annual premium
 * @param policyCount - Number of policies
 * @param commissionRate - Commission rate (default 7%)
 * @param servicingCostPerPolicy - Annual cost per policy (default $50)
 * @returns Estimated lifetime value
 */
export function calculateSegmentLtv(
  totalPremium: number,
  policyCount: number,
  commissionRate: number = 0.07,
  servicingCostPerPolicy: number = 50
): number {
  const segment = getCustomerSegment(totalPremium, policyCount);
  const config = SEGMENT_CONFIGS[segment];

  // Expected years based on retention (geometric series approximation)
  const retention = config.avgRetention;
  const expectedYears = retention < 1.0 ? -1 / Math.log(retention) : 20;

  // Annual commission revenue
  const annualCommission = totalPremium * commissionRate;

  // Lifetime calculations
  const lifetimeRevenue = annualCommission * expectedYears;
  const lifetimeServicingCost = servicingCostPerPolicy * policyCount * expectedYears;

  return Math.max(0, lifetimeRevenue - lifetimeServicingCost);
}

// ============================================
// Backward Compatibility Aliases
// ============================================

/**
 * @deprecated Use getCustomerSegment instead
 * Alias for backward compatibility with existing code
 */
export const getSegmentTier = getCustomerSegment;

/**
 * @deprecated Use SEGMENT_CONFIGS instead
 * Alias for backward compatibility
 */
export const SEGMENT_CONFIG = SEGMENT_CONFIGS;

// ============================================
// Default Export
// ============================================

export default {
  getCustomerSegment,
  getCustomerSegmentWithConfig,
  calculateSegmentLtv,
  SEGMENT_CONFIGS,
  SEGMENT_THRESHOLDS,
  // Backward compatibility
  getSegmentTier,
  SEGMENT_CONFIG,
};
