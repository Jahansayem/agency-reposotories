/**
 * Lead Scoring & ROI Model
 *
 * EXACT PORT from Python bealer-lead-model/src/lead_scoring_model.py
 *
 * Purpose:
 * - Score leads based on likelihood of becoming Elite/Premium customers
 * - Analyze lead vendor ROI and efficiency
 * - Calculate CAC by segment and source
 * - Optimize marketing budget allocation
 * - Predict customer segment from lead characteristics
 *
 * Key Metrics:
 * - Lead quality score (0-100)
 * - Vendor efficiency (ROI, conversion rate, avg LTV)
 * - CAC by segment (Elite: $1,200, Premium: $700, Standard: $400, Low: $200)
 * - LTV:CAC ratio by source (target >3.0, ideal >8.0)
 *
 * Opportunity:
 * - Reduce CAC by 20-30% through better vendor allocation
 * - Increase Elite/Premium customer % from 40% to 55%
 * - Improve blended LTV:CAC from 8x to 11x+
 */

// ============================================
// Types and Enums
// Source: lead_scoring_model.py lines 31-91
// ============================================

/**
 * Lead source types
 * Source: lead_scoring_model.py lines 31-43
 */
export type LeadSource =
  | 'smartfinancial'
  | 'everquote'
  | 'insurify'
  | 'quotewizard'
  | 'tiktok'
  | 'facebook'
  | 'google_search'
  | 'google_display'
  | 'referral'
  | 'organic'
  | 'direct';

/**
 * Lead quality tiers based on score
 * Source: lead_scoring_model.py lines 46-51
 */
export type LeadQualityTier =
  | 'elite'      // 90-100 score
  | 'premium'    // 70-89 score
  | 'standard'   // 50-69 score
  | 'low_value'; // <50 score

/**
 * Vendor performance rating
 * Source: lead_scoring_model.py lines 79 (rating field)
 */
export type VendorRating =
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'UNDERPERFORMING';

/**
 * Scored lead with segment prediction
 * Source: lead_scoring_model.py lines 54-63
 */
export interface LeadScore {
  leadId: string;
  score: number;  // 0-100
  predictedSegment: LeadQualityTier;
  predictedLtv: number;
  recommendedCac: number;
  conversionProbability: number;
  keyFactors: Record<string, number>;  // Factor -> contribution to score
}

/**
 * Performance metrics for a lead vendor
 * Source: lead_scoring_model.py lines 67-80
 */
export interface VendorPerformance {
  vendorName: string;
  totalSpend: number;
  leadsReceived: number;
  conversions: number;
  conversionRate: number;
  avgLtv: number;
  totalRevenue: number;  // Commission from conversions
  roi: number;  // (Revenue - Spend) / Spend
  cac: number;  // Cost per conversion
  ltvCacRatio: number;
  rating: VendorRating;
  recommendation: string;
}

/**
 * Recommended marketing budget allocation
 * Source: lead_scoring_model.py lines 83-91
 */
export interface BudgetAllocation {
  vendorName: string;
  currentAllocation: number;
  recommendedAllocation: number;
  change: number;  // Dollar amount to shift
  changePercentage: number;
  reasoning: string;
}

/**
 * Lead data for scoring
 */
export interface LeadData {
  leadId: string;
  productsShopping: string[];
  homeownerStatus: 'owner' | 'renter' | 'unknown';
  ageRange: string;
  estimatedPremium?: number;
  creditTier?: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  engagementLevel?: 'high' | 'medium' | 'low';
  leadSource?: LeadSource;
}

/**
 * Lead outcome data for vendor analysis
 */
export interface LeadOutcome {
  leadId: string;
  converted: boolean;
  ltv?: number;
  productsSold?: string[];
}

/**
 * Blended metrics across all vendors
 */
export interface BlendedMetrics {
  totalSpend: number;
  totalLeads: number;
  totalConversions: number;
  totalRevenue: number;
  blendedConversionRate: number;
  blendedCac: number;
  blendedLtv: number;
  blendedLtvCacRatio: number;
  blendedRoi: number;
}

// ============================================
// Scoring Weights and Constants
// Source: lead_scoring_model.py lines 97-179
// ============================================

/**
 * Scoring factors and weights (sum to 1.0)
 * Source: lead_scoring_model.py lines 101-109
 */
export const SCORING_WEIGHTS: Record<string, number> = {
  product_intent: 0.25,      // What products they're shopping for
  bundle_potential: 0.20,    // Likelihood of multi-product
  premium_range: 0.15,       // Higher premium = higher LTV
  demographics: 0.15,        // Age, homeowner status, etc.
  engagement: 0.10,          // How engaged is the lead
  credit_tier: 0.10,         // Credit quality (proxy for retention)
  source_quality: 0.05,      // Quality of lead source
};

/**
 * Product intent scoring
 * Customers shopping for multiple products = higher score
 * Source: lead_scoring_model.py lines 113-123
 */
export const PRODUCT_INTENT_SCORES: Record<string, number> = {
  'auto': 50,
  'home': 55,
  'auto,home': 85,           // Bundle intent = high score
  'auto,umbrella': 75,
  'home,umbrella': 80,
  'auto,home,umbrella': 95,  // Elite potential
  'life': 45,
  'motorcycle': 40,
  'renters': 35,
};

/**
 * Homeowner status multiplier (strong predictor of LTV)
 * Source: lead_scoring_model.py lines 126-130
 */
export const HOMEOWNER_MULTIPLIER: Record<string, number> = {
  owner: 1.3,    // Homeowners: higher premium, better retention
  renter: 0.9,   // Renters: lower premium
  unknown: 1.0,
};

/**
 * Age scoring (insurance sweet spots)
 * 30-50 = ideal (established, stable, multi-product potential)
 * 25-29 = good (growing income)
 * 50-65 = good (peak earnings, loyalty)
 * 18-24 = lower (price-sensitive, high churn)
 * 65+ = mixed (excellent retention but lower premium growth)
 * Source: lead_scoring_model.py lines 138-146
 */
export const AGE_SCORES: Record<string, number> = {
  '18-24': 40,
  '25-29': 65,
  '30-39': 85,
  '40-49': 90,
  '50-59': 85,
  '60-69': 75,
  '70+': 60,
};

/**
 * Credit tier scoring (proxy for retention and payment reliability)
 * Source: lead_scoring_model.py lines 149-155
 */
export const CREDIT_SCORES: Record<string, number> = {
  excellent: 95,
  good: 80,
  fair: 60,
  poor: 35,
  unknown: 70,  // Neutral
};

/**
 * Engagement level scores
 * Source: lead_scoring_model.py line 248
 */
export const ENGAGEMENT_SCORES: Record<string, number> = {
  high: 90,
  medium: 70,
  low: 40,
};

/**
 * LTV estimates by predicted segment
 * Source: lead_scoring_model.py lines 158-163
 */
export const SEGMENT_LTV: Record<LeadQualityTier, number> = {
  elite: 18000,
  premium: 9000,
  standard: 4500,
  low_value: 1800,
};

/**
 * Recommended CAC by segment (maintain LTV:CAC > 3.0)
 * Source: lead_scoring_model.py lines 166-171
 */
export const SEGMENT_CAC: Record<LeadQualityTier, number> = {
  elite: 1200,
  premium: 700,
  standard: 400,
  low_value: 200,
};

/**
 * Base conversion rates by segment
 * Source: lead_scoring_model.py lines 174-179
 */
export const SEGMENT_CONVERSION_RATES: Record<LeadQualityTier, number> = {
  elite: 0.42,
  premium: 0.28,
  standard: 0.12,
  low_value: 0.04,
};

// ============================================
// Lead Scoring Functions
// Source: lead_scoring_model.py lines 181-299
// ============================================

/**
 * Get product intent score for a list of products
 * Normalizes product list and looks up in PRODUCT_INTENT_SCORES
 * Source: lead_scoring_model.py lines 210-213
 */
function getProductIntentScore(products: string[]): number {
  const normalizedProducts = [...products].sort().join(',');
  return PRODUCT_INTENT_SCORES[normalizedProducts] ?? 50;
}

/**
 * Get bundle potential score based on product count
 * Source: lead_scoring_model.py lines 216-223
 */
function getBundlePotentialScore(productCount: number): number {
  if (productCount >= 3) {
    return 95;
  } else if (productCount === 2) {
    return 80;
  } else {
    return 40;
  }
}

/**
 * Get premium range score based on estimated premium
 * Source: lead_scoring_model.py lines 226-237
 */
function getPremiumRangeScore(estimatedPremium?: number): number {
  if (!estimatedPremium) {
    return 60;  // Unknown, use median
  }

  if (estimatedPremium >= 4000) {
    return 95;  // High-premium customer
  } else if (estimatedPremium >= 2500) {
    return 75;
  } else if (estimatedPremium >= 1500) {
    return 60;
  } else {
    return 40;  // Low premium
  }
}

/**
 * Get demographics score combining age and homeowner status
 * Source: lead_scoring_model.py lines 240-245
 */
function getDemographicsScore(ageRange: string, homeownerStatus: string): number {
  const ageScore = AGE_SCORES[ageRange] ?? 70;
  const homeownerMult = HOMEOWNER_MULTIPLIER[homeownerStatus] ?? 1.0;
  const demoScore = ageScore * homeownerMult;
  return Math.min(100, demoScore);  // Cap at 100
}

/**
 * Get source quality score based on lead source
 * Some sources consistently produce better leads
 * Source: lead_scoring_model.py lines 257-268
 */
function getSourceQualityScore(leadSource?: LeadSource): number {
  if (!leadSource) {
    return 70;  // Default
  }

  switch (leadSource) {
    case 'referral':
      return 95;  // Referrals = highest quality
    case 'organic':
      return 85;  // Organic = high intent
    case 'smartfinancial':
    case 'google_search':
      return 75;  // Good sources
    case 'facebook':
    case 'tiktok':
      return 60;  // Social = mixed quality
    default:
      return 70;  // Default
  }
}

/**
 * Classify score into quality tier
 * Source: lead_scoring_model.py lines 276-284
 */
function classifyTier(score: number): LeadQualityTier {
  if (score >= 90) {
    return 'elite';
  } else if (score >= 70) {
    return 'premium';
  } else if (score >= 50) {
    return 'standard';
  } else {
    return 'low_value';
  }
}

/**
 * Score a lead and predict segment
 *
 * EXACT PORT from Python LeadScoringModel.score_lead()
 * Source: lead_scoring_model.py lines 181-299
 *
 * @param lead - Lead data to score
 * @returns LeadScore with detailed scoring
 */
export function scoreLead(lead: LeadData): LeadScore {
  const factorScores: Record<string, number> = {};

  // 1. Product intent (25%)
  // Source: lead_scoring_model.py lines 210-213
  const productScore = getProductIntentScore(lead.productsShopping);
  factorScores['product_intent'] = productScore;

  // 2. Bundle potential (20%)
  // Source: lead_scoring_model.py lines 215-223
  const bundleScore = getBundlePotentialScore(lead.productsShopping.length);
  factorScores['bundle_potential'] = bundleScore;

  // 3. Premium range (15%)
  // Source: lead_scoring_model.py lines 225-237
  const premiumScore = getPremiumRangeScore(lead.estimatedPremium);
  factorScores['premium_range'] = premiumScore;

  // 4. Demographics (15%)
  // Source: lead_scoring_model.py lines 239-245
  const demoScore = getDemographicsScore(lead.ageRange, lead.homeownerStatus);
  factorScores['demographics'] = demoScore;

  // 5. Engagement (10%)
  // Source: lead_scoring_model.py lines 247-250
  const engagementScore = ENGAGEMENT_SCORES[lead.engagementLevel ?? 'medium'] ?? 70;
  factorScores['engagement'] = engagementScore;

  // 6. Credit tier (10%)
  // Source: lead_scoring_model.py lines 252-254
  const creditScore = CREDIT_SCORES[lead.creditTier ?? 'unknown'] ?? 70;
  factorScores['credit_tier'] = creditScore;

  // 7. Source quality (5%)
  // Source: lead_scoring_model.py lines 256-268
  const sourceScore = getSourceQualityScore(lead.leadSource);
  factorScores['source_quality'] = sourceScore;

  // Calculate weighted score
  // Source: lead_scoring_model.py lines 270-274
  let totalScore = 0;
  for (const factor of Object.keys(factorScores)) {
    totalScore += factorScores[factor] * SCORING_WEIGHTS[factor];
  }

  // Classify into tier
  // Source: lead_scoring_model.py lines 276-284
  const tier = classifyTier(totalScore);

  // Get segment-specific metrics
  // Source: lead_scoring_model.py lines 286-289
  const predictedLtv = SEGMENT_LTV[tier];
  const recommendedCac = SEGMENT_CAC[tier];
  const conversionProbability = SEGMENT_CONVERSION_RATES[tier];

  return {
    leadId: lead.leadId,
    score: totalScore,
    predictedSegment: tier,
    predictedLtv,
    recommendedCac,
    conversionProbability,
    keyFactors: factorScores,
  };
}

// ============================================
// Vendor Performance Analysis
// Source: lead_scoring_model.py lines 301-378
// ============================================

/**
 * Calculate mean of an array of numbers
 * Helper function to replace Python's statistics.mean()
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Get vendor rating based on LTV:CAC ratio
 * Source: lead_scoring_model.py lines 348-363
 */
function getVendorRating(ltvCacRatio: number): { rating: VendorRating; recommendation: string } {
  if (ltvCacRatio >= 10) {
    return {
      rating: 'EXCELLENT',
      recommendation: 'Increase budget by 25-50%',
    };
  } else if (ltvCacRatio >= 6) {
    return {
      rating: 'GOOD',
      recommendation: 'Increase budget by 10-25%',
    };
  } else if (ltvCacRatio >= 3) {
    return {
      rating: 'FAIR',
      recommendation: 'Maintain current budget',
    };
  } else if (ltvCacRatio >= 2) {
    return {
      rating: 'POOR',
      recommendation: 'Reduce budget by 25-50%',
    };
  } else {
    return {
      rating: 'UNDERPERFORMING',
      recommendation: 'Consider eliminating this vendor',
    };
  }
}

/**
 * Analyze performance of a lead vendor
 *
 * EXACT PORT from Python LeadScoringModel.analyze_vendor_performance()
 * Source: lead_scoring_model.py lines 301-378
 *
 * @param vendorName - Name of vendor
 * @param totalSpend - Total spend on this vendor
 * @param leadData - List of leads from vendor with outcomes
 * @returns VendorPerformance with detailed metrics
 */
export function analyzeVendorPerformance(
  vendorName: string,
  totalSpend: number,
  leadData: LeadOutcome[]
): VendorPerformance {
  // Source: lead_scoring_model.py lines 327-329
  const leadsReceived = leadData.length;
  const conversions = leadData.filter(lead => lead.converted).length;
  const conversionRate = leadsReceived > 0 ? conversions / leadsReceived : 0;

  // Calculate average LTV for converted customers
  // Source: lead_scoring_model.py lines 331-333
  const convertedLtvs = leadData
    .filter(lead => lead.converted && lead.ltv !== undefined)
    .map(lead => lead.ltv!);
  const avgLtv = mean(convertedLtvs);

  // Revenue = LTV of all conversions (actually commission, but using LTV as proxy)
  // In reality: Revenue = sum of commissions from conversions
  // Source: lead_scoring_model.py lines 335-337
  const totalRevenue = convertedLtvs.reduce((sum, ltv) => sum + ltv, 0);

  // ROI = (Revenue - Spend) / Spend
  // Source: lead_scoring_model.py lines 339-340
  const roi = totalSpend > 0 ? (totalRevenue - totalSpend) / totalSpend : 0;

  // CAC = Spend / Conversions
  // Source: lead_scoring_model.py lines 342-343
  const cac = conversions > 0 ? totalSpend / conversions : 0;

  // LTV:CAC ratio
  // Source: lead_scoring_model.py lines 345-346
  const ltvCacRatio = cac > 0 ? avgLtv / cac : 0;

  // Rate vendor performance
  // Source: lead_scoring_model.py lines 348-363
  const { rating, recommendation } = getVendorRating(ltvCacRatio);

  return {
    vendorName,
    totalSpend,
    leadsReceived,
    conversions,
    conversionRate,
    avgLtv,
    totalRevenue,
    roi,
    cac,
    ltvCacRatio,
    rating,
    recommendation,
  };
}

// ============================================
// Budget Optimization
// Source: lead_scoring_model.py lines 380-461
// ============================================

/**
 * Optimize marketing budget allocation across vendors
 *
 * Strategy:
 * - Shift spend from low-ROI vendors to high-ROI vendors
 * - Maintain minimum viable spend on fair performers
 * - Eliminate underperformers
 *
 * EXACT PORT from Python LeadScoringModel.optimize_budget_allocation()
 * Source: lead_scoring_model.py lines 380-461
 *
 * @param currentBudget - Total current marketing budget
 * @param vendorPerformances - List of VendorPerformance objects
 * @returns List of BudgetAllocation recommendations
 */
export function optimizeBudgetAllocation(
  currentBudget: number,
  vendorPerformances: VendorPerformance[]
): BudgetAllocation[] {
  // Sort vendors by LTV:CAC ratio (efficiency metric)
  // Source: lead_scoring_model.py line 404
  const sortedVendors = [...vendorPerformances].sort(
    (a, b) => b.ltvCacRatio - a.ltvCacRatio
  );

  // Allocation strategy:
  // - Top tier (LTV:CAC >= 10): 40% of budget
  // - Good (LTV:CAC 6-10): 35% of budget
  // - Fair (LTV:CAC 3-6): 20% of budget
  // - Poor (LTV:CAC 2-3): 5% of budget
  // - Underperforming (LTV:CAC < 2): 0% of budget
  // Source: lead_scoring_model.py lines 406-411

  const allocations: BudgetAllocation[] = [];

  // Count vendors in each tier for proportional allocation
  // Source: lead_scoring_model.py lines 420-441
  const excellentCount = sortedVendors.filter(v => v.ltvCacRatio >= 10).length;
  const goodCount = sortedVendors.filter(v => v.ltvCacRatio >= 6 && v.ltvCacRatio < 10).length;
  const fairCount = sortedVendors.filter(v => v.ltvCacRatio >= 3 && v.ltvCacRatio < 6).length;
  const poorCount = sortedVendors.filter(v => v.ltvCacRatio >= 2 && v.ltvCacRatio < 3).length;

  for (const vendor of sortedVendors) {
    const currentAllocation = vendor.totalSpend;
    let recommendedAllocation: number;
    let reasoning: string;

    // Determine recommended allocation
    // Source: lead_scoring_model.py lines 419-447
    if (vendor.ltvCacRatio >= 10) {
      // Excellent - allocate 40% of budget proportionally among excellent vendors
      recommendedAllocation = excellentCount > 0
        ? (currentBudget * 0.40) / excellentCount
        : currentBudget * 0.40;
      reasoning = `Excellent ROI (${formatPercent(vendor.roi)}) - increase allocation significantly`;
    } else if (vendor.ltvCacRatio >= 6) {
      // Good - allocate 35% proportionally
      recommendedAllocation = goodCount > 0
        ? (currentBudget * 0.35) / goodCount
        : currentBudget * 0.35;
      reasoning = `Good ROI (${formatPercent(vendor.roi)}) - increase allocation moderately`;
    } else if (vendor.ltvCacRatio >= 3) {
      // Fair - allocate 20% proportionally
      recommendedAllocation = fairCount > 0
        ? (currentBudget * 0.20) / fairCount
        : currentBudget * 0.20;
      reasoning = `Fair ROI (${formatPercent(vendor.roi)}) - maintain with slight reduction`;
    } else if (vendor.ltvCacRatio >= 2) {
      // Poor - allocate 5% proportionally
      recommendedAllocation = poorCount > 0
        ? (currentBudget * 0.05) / poorCount
        : currentBudget * 0.05;
      reasoning = `Poor ROI (${formatPercent(vendor.roi)}) - reduce significantly`;
    } else {
      // Underperforming - eliminate
      recommendedAllocation = 0;
      reasoning = `Underperforming (ROI: ${formatPercent(vendor.roi)}) - eliminate and reallocate`;
    }

    // Calculate change
    // Source: lead_scoring_model.py lines 449-450
    const change = recommendedAllocation - currentAllocation;
    const changePercentage = currentAllocation > 0
      ? (change / currentAllocation) * 100
      : 0;

    allocations.push({
      vendorName: vendor.vendorName,
      currentAllocation,
      recommendedAllocation,
      change,
      changePercentage,
      reasoning,
    });
  }

  return allocations;
}

// ============================================
// Blended Metrics Calculation
// Source: lead_scoring_model.py lines 463-494
// ============================================

/**
 * Calculate blended metrics across all vendors
 *
 * EXACT PORT from Python LeadScoringModel.calculate_blended_metrics()
 * Source: lead_scoring_model.py lines 463-494
 *
 * @param vendorPerformances - List of VendorPerformance objects
 * @returns Portfolio-level metrics
 */
export function calculateBlendedMetrics(
  vendorPerformances: VendorPerformance[]
): BlendedMetrics {
  // Source: lead_scoring_model.py lines 473-476
  const totalSpend = vendorPerformances.reduce((sum, vp) => sum + vp.totalSpend, 0);
  const totalLeads = vendorPerformances.reduce((sum, vp) => sum + vp.leadsReceived, 0);
  const totalConversions = vendorPerformances.reduce((sum, vp) => sum + vp.conversions, 0);
  const totalRevenue = vendorPerformances.reduce((sum, vp) => sum + vp.totalRevenue, 0);

  // Source: lead_scoring_model.py lines 478-482
  const blendedConversionRate = totalLeads > 0 ? totalConversions / totalLeads : 0;
  const blendedCac = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const blendedLtv = totalConversions > 0 ? totalRevenue / totalConversions : 0;
  const blendedLtvCacRatio = blendedCac > 0 ? blendedLtv / blendedCac : 0;
  const blendedRoi = totalSpend > 0 ? (totalRevenue - totalSpend) / totalSpend : 0;

  return {
    totalSpend,
    totalLeads,
    totalConversions,
    totalRevenue,
    blendedConversionRate,
    blendedCac,
    blendedLtv,
    blendedLtvCacRatio,
    blendedRoi,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format a number as a percentage string
 * Helper function for display
 */
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Format a number as currency
 * Helper function for display
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Format LTV:CAC ratio
 * Helper function for display
 */
export function formatLtvCacRatio(value: number): string {
  return `${value.toFixed(1)}x`;
}

/**
 * Get top factors contributing to a lead score
 * Returns factors sorted by weighted contribution
 *
 * @param keyFactors - Factor scores from LeadScore
 * @param topN - Number of top factors to return (default: 3)
 */
export function getTopFactors(
  keyFactors: Record<string, number>,
  topN: number = 3
): Array<{ factor: string; value: number; contribution: number }> {
  const factorsWithContribution = Object.entries(keyFactors).map(([factor, value]) => ({
    factor,
    value,
    contribution: value * SCORING_WEIGHTS[factor],
  }));

  return factorsWithContribution
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, topN);
}

/**
 * Score multiple leads in batch
 *
 * @param leads - Array of lead data to score
 * @returns Array of lead scores
 */
export function scoreLeadsBatch(leads: LeadData[]): LeadScore[] {
  return leads.map(lead => scoreLead(lead));
}

/**
 * Group leads by predicted segment
 *
 * @param scores - Array of lead scores
 * @returns Map of segment to leads
 */
export function groupLeadsBySegment(
  scores: LeadScore[]
): Record<LeadQualityTier, LeadScore[]> {
  const grouped: Record<LeadQualityTier, LeadScore[]> = {
    elite: [],
    premium: [],
    standard: [],
    low_value: [],
  };

  for (const score of scores) {
    grouped[score.predictedSegment].push(score);
  }

  return grouped;
}

/**
 * Calculate expected value for a lead
 * Expected Value = Predicted LTV * Conversion Probability
 *
 * @param score - Lead score
 * @returns Expected value in dollars
 */
export function calculateExpectedValue(score: LeadScore): number {
  return score.predictedLtv * score.conversionProbability;
}

/**
 * Get leads above a certain score threshold
 *
 * @param scores - Array of lead scores
 * @param threshold - Minimum score (default: 70 for Premium+)
 * @returns Filtered lead scores
 */
export function getHighValueLeads(
  scores: LeadScore[],
  threshold: number = 70
): LeadScore[] {
  return scores.filter(score => score.score >= threshold);
}

/**
 * Calculate portfolio summary statistics
 *
 * @param scores - Array of lead scores
 * @returns Summary statistics
 */
export function calculatePortfolioSummary(scores: LeadScore[]): {
  totalLeads: number;
  avgScore: number;
  segmentDistribution: Record<LeadQualityTier, { count: number; percentage: number }>;
  totalPredictedLtv: number;
  totalExpectedValue: number;
} {
  if (scores.length === 0) {
    return {
      totalLeads: 0,
      avgScore: 0,
      segmentDistribution: {
        elite: { count: 0, percentage: 0 },
        premium: { count: 0, percentage: 0 },
        standard: { count: 0, percentage: 0 },
        low_value: { count: 0, percentage: 0 },
      },
      totalPredictedLtv: 0,
      totalExpectedValue: 0,
    };
  }

  const grouped = groupLeadsBySegment(scores);
  const totalLeads = scores.length;

  const segmentDistribution: Record<LeadQualityTier, { count: number; percentage: number }> = {
    elite: {
      count: grouped.elite.length,
      percentage: (grouped.elite.length / totalLeads) * 100,
    },
    premium: {
      count: grouped.premium.length,
      percentage: (grouped.premium.length / totalLeads) * 100,
    },
    standard: {
      count: grouped.standard.length,
      percentage: (grouped.standard.length / totalLeads) * 100,
    },
    low_value: {
      count: grouped.low_value.length,
      percentage: (grouped.low_value.length / totalLeads) * 100,
    },
  };

  const avgScore = mean(scores.map(s => s.score));
  const totalPredictedLtv = scores.reduce((sum, s) => sum + s.predictedLtv, 0);
  const totalExpectedValue = scores.reduce((sum, s) => sum + calculateExpectedValue(s), 0);

  return {
    totalLeads,
    avgScore,
    segmentDistribution,
    totalPredictedLtv,
    totalExpectedValue,
  };
}

// ============================================
// Default Export
// ============================================

export default {
  // Constants
  SCORING_WEIGHTS,
  PRODUCT_INTENT_SCORES,
  HOMEOWNER_MULTIPLIER,
  AGE_SCORES,
  CREDIT_SCORES,
  ENGAGEMENT_SCORES,
  SEGMENT_LTV,
  SEGMENT_CAC,
  SEGMENT_CONVERSION_RATES,

  // Core functions
  scoreLead,
  scoreLeadsBatch,
  analyzeVendorPerformance,
  optimizeBudgetAllocation,
  calculateBlendedMetrics,

  // Utility functions
  formatCurrency,
  formatLtvCacRatio,
  getTopFactors,
  groupLeadsBySegment,
  calculateExpectedValue,
  getHighValueLeads,
  calculatePortfolioSummary,
};
