/**
 * Enhanced Scoring Module
 *
 * Combines the existing allstate-parser scoring (0-150 range) with the
 * sophisticated lead-scoring model (0-100 range) for more accurate prioritization.
 *
 * The enhanced scoring:
 * - Uses allstate-parser for quick, file-based scoring (existing behavior)
 * - Optionally applies lead-scoring model for deeper analysis
 * - Maintains backward compatibility with 0-150 score range
 * - Provides detailed scoring factors for transparency
 *
 * Usage:
 *   import { calculateEnhancedScore, EnhancedScoreResult } from '@/lib/analytics/enhanced-scoring';
 *
 *   const result = calculateEnhancedScore(record, { useLeadScoring: true });
 */

import {
  calculatePriorityScore as calculateBaseScore,
  calculatePriorityTier as calculateBaseTier,
} from '../allstate-parser';

import {
  scoreLead,
  type LeadData,
  type LeadScore,
  type LeadQualityTier,
} from '../lead-scoring';

import type {
  ParsedCrossSellRecord,
  CrossSellPriorityTier,
  CrossSellSegment,
} from '@/types/allstate-analytics';

// ============================================
// Types
// ============================================

export interface EnhancedScoringOptions {
  /**
   * Whether to use the advanced lead-scoring model
   * Default: false (use existing allstate-parser scoring)
   */
  useLeadScoring?: boolean;

  /**
   * Weight for blending scores (0-1)
   * 0 = 100% base score, 1 = 100% lead score
   * Default: 0.6 (60% lead score, 40% base score)
   */
  blendWeight?: number;

  /**
   * Minimum threshold to apply lead scoring
   * Records with base score below this won't get enhanced scoring
   * Default: 30
   */
  minBaseScoreForEnhancement?: number;

  /**
   * Include detailed scoring breakdown in result
   * Default: false
   */
  includeBreakdown?: boolean;
}

export interface ScoreBreakdown {
  // Base scoring components (from allstate-parser)
  gapScore: number;         // 0-40: Product gap opportunity
  timingScore: number;      // 0-25: Renewal timing
  valueScore: number;       // 0-20: Customer value
  riskScore: number;        // 0-10: Retention risk
  contactScore: number;     // 0-5: Contact quality

  // Lead scoring components (from lead-scoring model)
  productIntentScore?: number;  // Product intent signals
  bundlePotentialScore?: number; // Bundle opportunity
  premiumScore?: number;         // Premium tier
  demographicScore?: number;     // Demographic factors
  engagementScore?: number;      // Engagement level
  creditScore?: number;          // Credit tier
  sourceScore?: number;          // Lead source quality
}

export interface EnhancedScoreResult {
  /**
   * Final blended score (0-150 range for backward compatibility)
   */
  score: number;

  /**
   * Priority tier based on score
   */
  tier: CrossSellPriorityTier;

  /**
   * Base score from allstate-parser (0-150)
   */
  baseScore: number;

  /**
   * Lead score if enhanced scoring was used (0-100)
   */
  leadScore?: number;

  /**
   * Lead quality tier from lead-scoring model
   */
  leadTier?: LeadQualityTier;

  /**
   * Whether enhanced scoring was applied
   */
  enhanced: boolean;

  /**
   * Detailed breakdown if requested
   */
  breakdown?: ScoreBreakdown;

  /**
   * Top factors contributing to the score
   */
  topFactors?: string[];

  /**
   * Confidence level in the score (0-1)
   */
  confidence: number;
}

// ============================================
// Score Conversion
// ============================================

/**
 * Convert lead score (0-100) to base score range (0-150)
 */
function convertLeadScoreToBaseRange(leadScore: number): number {
  // Lead score 0-100 → Base score 0-150
  return Math.round((leadScore / 100) * 150);
}

/**
 * Convert base score (0-150) to lead score range (0-100)
 */
function convertBaseScoreToLeadRange(baseScore: number): number {
  // Base score 0-150 → Lead score 0-100
  return Math.round((baseScore / 150) * 100);
}

/**
 * Map lead quality tier to cross-sell priority tier
 */
function mapLeadTierToBaseTier(leadTier: LeadQualityTier): CrossSellPriorityTier {
  const mapping: Record<LeadQualityTier, CrossSellPriorityTier> = {
    elite: 'HOT',
    premium: 'HIGH',
    standard: 'MEDIUM',
    low_value: 'LOW',
  };
  return mapping[leadTier];
}

// ============================================
// Data Conversion
// ============================================

/**
 * Convert ParsedCrossSellRecord to LeadData format for lead-scoring
 */
function convertToLeadData(record: ParsedCrossSellRecord): LeadData {
  // Determine products shopping from current products and segment
  const productsShopping: string[] = [];
  const currentProducts = record.current_products?.toLowerCase() || '';

  if (currentProducts.includes('auto')) productsShopping.push('auto');
  if (currentProducts.includes('home')) productsShopping.push('home');
  if (currentProducts.includes('umbrella')) productsShopping.push('umbrella');
  if (currentProducts.includes('life')) productsShopping.push('life');

  // Add recommended product based on segment
  if (record.segment_type === 'auto_to_home') productsShopping.push('home');
  if (record.segment_type === 'home_to_auto') productsShopping.push('auto');
  if (record.segment_type === 'add_umbrella') productsShopping.push('umbrella');
  if (record.segment_type === 'add_life') productsShopping.push('life');

  // Deduplicate
  const uniqueProducts = [...new Set(productsShopping)];
  if (uniqueProducts.length === 0) uniqueProducts.push('auto');

  // Estimate age bucket from tenure (heuristic)
  const estimatedAge = record.tenure_years > 10
    ? '45-54'
    : record.tenure_years > 5
      ? '35-44'
      : record.tenure_years > 2
        ? '25-34'
        : '18-24';

  // Determine homeowner status from products
  const homeownerStatus: 'owner' | 'renter' | 'unknown' =
    currentProducts.includes('home') ? 'owner'
    : currentProducts.includes('renter') ? 'renter'
    : 'unknown';

  // Determine credit tier from payment behavior
  const creditTier: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' =
    record.balance_due === 0 && record.ezpay_status === 'Yes'
      ? 'excellent'
      : record.balance_due === 0
        ? 'good'
        : record.balance_due < 100
          ? 'fair'
          : 'poor';

  // Determine engagement level from EZPay and tenure
  const engagementLevel: 'high' | 'medium' | 'low' =
    record.ezpay_status === 'Yes' && record.tenure_years > 3
      ? 'high'
      : record.ezpay_status === 'Yes' || record.tenure_years > 2
        ? 'medium'
        : 'low';

  return {
    leadId: `${record.customer_name}-${Date.now()}`,
    productsShopping: uniqueProducts,
    homeownerStatus,
    ageRange: estimatedAge,
    estimatedPremium: record.current_premium,
    creditTier,
    engagementLevel,
    leadSource: 'direct', // Book of business = direct leads
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate confidence based on data quality
 */
function calculateConfidence(record: ParsedCrossSellRecord, leadResult: LeadScore): number {
  let confidence = 0.5; // Base confidence

  // Better data = higher confidence
  if (record.phone && record.phone.length >= 10) confidence += 0.1;
  if (record.email && record.email.includes('@')) confidence += 0.1;
  if (record.renewal_date) confidence += 0.1;
  if (record.tenure_years > 0) confidence += 0.05;
  if (record.current_premium > 0) confidence += 0.05;
  if (record.ezpay_status !== 'Pending') confidence += 0.05;

  // Higher lead score = more predictable
  if (leadResult.score >= 70) confidence += 0.05;

  return Math.min(0.95, confidence);
}

/**
 * Get top factors from keyFactors record
 */
function getTopFactorsFromKeyFactors(keyFactors: Record<string, number>): string[] {
  // Sort factors by value and return top 3
  const sorted = Object.entries(keyFactors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return sorted.map(([factor, score]) => {
    const factorLabels: Record<string, string> = {
      product_intent: `Product intent (${Math.round(score)}pts)`,
      bundle_potential: `Bundle potential (${Math.round(score)}pts)`,
      premium_range: `Premium tier (${Math.round(score)}pts)`,
      demographics: `Demographics (${Math.round(score)}pts)`,
      engagement: `Engagement level (${Math.round(score)}pts)`,
      credit_tier: `Credit quality (${Math.round(score)}pts)`,
      source_quality: `Source quality (${Math.round(score)}pts)`,
    };
    return factorLabels[factor] || `${factor} (${Math.round(score)}pts)`;
  });
}

// ============================================
// Scoring Functions
// ============================================

/**
 * Calculate base scoring breakdown
 */
function calculateBaseBreakdown(record: ParsedCrossSellRecord): ScoreBreakdown {
  // Gap score (0-40): Based on product gap opportunity
  const gapScore = calculateGapScore(record);

  // Timing score (0-25): Based on renewal timing
  const timingScore = calculateTimingScore(record);

  // Value score (0-20): Based on customer value
  const valueScore = calculateValueScore(record);

  // Risk score (0-10): Based on retention risk
  const riskScore = calculateRiskScore(record);

  // Contact score (0-5): Based on contact quality
  const contactScore = calculateContactScore(record);

  return {
    gapScore,
    timingScore,
    valueScore,
    riskScore,
    contactScore,
    // Lead scoring components are undefined when not using enhanced scoring
    productIntentScore: undefined,
    bundlePotentialScore: undefined,
    premiumScore: undefined,
    demographicScore: undefined,
    engagementScore: undefined,
    creditScore: undefined,
    sourceScore: undefined,
  };
}

function calculateGapScore(record: ParsedCrossSellRecord): number {
  const productCount = record.policy_count || 1;
  const segment = record.segment_type || 'other';

  // Higher gap for single product customers
  let score = productCount === 1 ? 35 : productCount === 2 ? 25 : 15;

  // Bonus for high-value segments
  if (segment === 'mono_to_bundle') score += 5;
  if (segment === 'add_umbrella') score += 3;

  return Math.min(40, score);
}

function calculateTimingScore(record: ParsedCrossSellRecord): number {
  if (!record.renewal_date) return 10;

  const daysUntil = Math.ceil(
    (new Date(record.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil <= 7) return 25;
  if (daysUntil <= 14) return 20;
  if (daysUntil <= 30) return 15;
  if (daysUntil <= 60) return 10;
  return 5;
}

function calculateValueScore(record: ParsedCrossSellRecord): number {
  const premium = record.current_premium || 0;
  const tenure = record.tenure_years || 0;

  let score = 0;

  // Premium tier
  if (premium >= 3000) score += 10;
  else if (premium >= 2000) score += 8;
  else if (premium >= 1000) score += 5;
  else score += 2;

  // Tenure bonus
  if (tenure >= 5) score += 10;
  else if (tenure >= 3) score += 7;
  else if (tenure >= 1) score += 4;

  return Math.min(20, score);
}

function calculateRiskScore(record: ParsedCrossSellRecord): number {
  const balanceDue = record.balance_due || 0;
  const ezpay = record.ezpay_status === 'Yes';

  let score = 5; // Start neutral

  // Payment status
  if (balanceDue > 0) score -= 3;
  if (ezpay) score += 3;

  // Tenure stability
  if (record.tenure_years >= 3) score += 2;

  return Math.max(0, Math.min(10, score));
}

function calculateContactScore(record: ParsedCrossSellRecord): number {
  let score = 3; // Default

  // Has phone
  if (record.phone && record.phone.length >= 10) score += 1;

  // Has email
  if (record.email && record.email.includes('@')) score += 1;

  return Math.min(5, score);
}

/**
 * Calculate enhanced priority score
 *
 * Combines base allstate-parser scoring with sophisticated lead-scoring model
 * for more accurate customer prioritization.
 */
export function calculateEnhancedScore(
  record: ParsedCrossSellRecord,
  options: EnhancedScoringOptions = {}
): EnhancedScoreResult {
  const {
    useLeadScoring = false,
    blendWeight = 0.6,
    minBaseScoreForEnhancement = 30,
    includeBreakdown = false,
  } = options;

  // Calculate base score (existing algorithm)
  const baseScore = calculateBaseScore(record);

  // If not using lead scoring, return base result
  if (!useLeadScoring) {
    return {
      score: baseScore,
      tier: calculateBaseTier(baseScore, record.renewal_date || null),
      baseScore,
      enhanced: false,
      confidence: 0.7, // Base scoring confidence
      breakdown: includeBreakdown ? calculateBaseBreakdown(record) : undefined,
    };
  }

  // Skip enhancement for low-scoring records
  if (baseScore < minBaseScoreForEnhancement) {
    return {
      score: baseScore,
      tier: calculateBaseTier(baseScore, record.renewal_date || null),
      baseScore,
      enhanced: false,
      confidence: 0.6, // Lower confidence for low-scoring records
    };
  }

  // Convert to lead data format and calculate lead score
  const leadData = convertToLeadData(record);
  const leadResult: LeadScore = scoreLead(leadData);

  // Convert lead score to base range for blending
  const leadScoreInBaseRange = convertLeadScoreToBaseRange(leadResult.score);

  // Blend scores
  const blendedScore = Math.round(
    baseScore * (1 - blendWeight) + leadScoreInBaseRange * blendWeight
  );

  // Calculate tier from blended score
  const tier = calculateBaseTier(blendedScore, record.renewal_date || null);

  // Calculate confidence based on data quality
  const confidence = calculateConfidence(record, leadResult);

  // Get top factors from keyFactors
  const topFactors = getTopFactorsFromKeyFactors(leadResult.keyFactors);

  // Build result
  const result: EnhancedScoreResult = {
    score: blendedScore,
    tier,
    baseScore,
    leadScore: leadResult.score,
    leadTier: leadResult.predictedSegment,
    enhanced: true,
    confidence,
    topFactors,
  };

  // Add breakdown if requested
  if (includeBreakdown) {
    const baseBreakdown = calculateBaseBreakdown(record);

    result.breakdown = {
      gapScore: baseBreakdown.gapScore || 0,
      timingScore: baseBreakdown.timingScore || 0,
      valueScore: baseBreakdown.valueScore || 0,
      riskScore: baseBreakdown.riskScore || 0,
      contactScore: baseBreakdown.contactScore || 0,
      productIntentScore: leadResult.keyFactors?.product_intent,
      bundlePotentialScore: leadResult.keyFactors?.bundle_potential,
      premiumScore: leadResult.keyFactors?.premium_range,
      demographicScore: leadResult.keyFactors?.demographics,
      engagementScore: leadResult.keyFactors?.engagement,
      creditScore: leadResult.keyFactors?.credit_tier,
      sourceScore: leadResult.keyFactors?.source_quality,
    };
  }

  return result;
}

/**
 * Calculate enhanced scores for a batch of records
 */
export function calculateEnhancedScoresBatch(
  records: ParsedCrossSellRecord[],
  options: EnhancedScoringOptions = {}
): EnhancedScoreResult[] {
  return records.map(record => calculateEnhancedScore(record, options));
}

/**
 * Get top opportunities sorted by enhanced score
 */
export function getTopEnhancedOpportunities(
  records: ParsedCrossSellRecord[],
  options: EnhancedScoringOptions & { limit?: number } = {}
): Array<{ record: ParsedCrossSellRecord; scoreResult: EnhancedScoreResult }> {
  const { limit = 50, ...scoringOptions } = options;

  const scored = records.map(record => ({
    record,
    scoreResult: calculateEnhancedScore(record, scoringOptions),
  }));

  return scored
    .sort((a, b) => b.scoreResult.score - a.scoreResult.score)
    .slice(0, limit);
}

/**
 * Analyze score distribution for a batch
 */
export function analyzeScoreDistribution(
  records: ParsedCrossSellRecord[],
  options: EnhancedScoringOptions = {}
): {
  tierCounts: Record<CrossSellPriorityTier, number>;
  averageScore: number;
  averageConfidence: number;
  enhancedCount: number;
  scoreHistogram: Record<string, number>;
} {
  const results = calculateEnhancedScoresBatch(records, options);

  const tierCounts: Record<CrossSellPriorityTier, number> = {
    HOT: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  const scoreHistogram: Record<string, number> = {
    '0-25': 0,
    '26-50': 0,
    '51-75': 0,
    '76-100': 0,
    '101-125': 0,
    '126-150': 0,
  };

  let totalScore = 0;
  let totalConfidence = 0;
  let enhancedCount = 0;

  for (const result of results) {
    tierCounts[result.tier]++;
    totalScore += result.score;
    totalConfidence += result.confidence;
    if (result.enhanced) enhancedCount++;

    // Histogram
    if (result.score <= 25) scoreHistogram['0-25']++;
    else if (result.score <= 50) scoreHistogram['26-50']++;
    else if (result.score <= 75) scoreHistogram['51-75']++;
    else if (result.score <= 100) scoreHistogram['76-100']++;
    else if (result.score <= 125) scoreHistogram['101-125']++;
    else scoreHistogram['126-150']++;
  }

  return {
    tierCounts,
    averageScore: results.length > 0 ? totalScore / results.length : 0,
    averageConfidence: results.length > 0 ? totalConfidence / results.length : 0,
    enhancedCount,
    scoreHistogram,
  };
}

// ============================================
// Exports
// ============================================

export default {
  calculateEnhancedScore,
  calculateEnhancedScoresBatch,
  getTopEnhancedOpportunities,
  analyzeScoreDistribution,
};
