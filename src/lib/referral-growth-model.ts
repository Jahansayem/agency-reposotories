/**
 * Referral Growth Model
 *
 * EXACT PORT from Python bealer-lead-model/src/referral_growth_model.py
 *
 * Leverage satisfied customer base to generate low-CAC, high-quality leads
 *
 * Purpose:
 * - Identify customers most likely to refer (referral propensity scoring)
 * - Optimize referral incentive structure
 * - Calculate viral coefficient and organic growth potential
 * - Track referral program ROI
 * - Project growth from referral program
 *
 * Critical Insight for Derrick's Agency:
 * - 89.64% retention = high customer satisfaction
 * - Satisfied customers = best referral sources
 * - Referral leads: 35% conversion (vs 12% paid leads)
 * - Referral CAC: $120 (vs $400-1200 paid CAC)
 * - LTV:CAC ratio: 68x for referrals (vs 8-11x for paid)
 *
 * Opportunity:
 * - 8-10% referral rate among top 2 tiers = 68 referrals/year
 * - 35% conversion = 24 new customers
 * - Referral CAC ($120) vs paid CAC ($700 avg) = 83% cost savings
 * - Annual value: $200k+ in CAC savings + higher quality customers
 */

// ============================================
// Types and Enums
// Source: referral_growth_model.py lines 33-85
// ============================================

/**
 * Referral propensity tiers
 * Source: referral_growth_model.py lines 33-38
 */
export type ReferralTier = 'champion' | 'promoter' | 'passive' | 'detractor';

/**
 * Referral tier descriptions
 * - champion: 20%+ referral rate
 * - promoter: 10-20% referral rate
 * - passive: 3-10% referral rate
 * - detractor: <3% referral rate
 */
export const REFERRAL_TIER_DESCRIPTIONS: Record<ReferralTier, string> = {
  champion: '20%+ referral rate',
  promoter: '10-20% referral rate',
  passive: '3-10% referral rate',
  detractor: '<3% referral rate',
};

/**
 * Types of referral incentives
 * Source: referral_growth_model.py lines 41-47
 */
export type IncentiveType =
  | 'cash'
  | 'gift_card'
  | 'premium_credit'
  | 'charitable_donation'
  | 'tiered_reward';

/**
 * Customer referral propensity assessment
 * Source: referral_growth_model.py lines 50-58
 */
export interface ReferralPropensityScore {
  customerId: string;
  propensityScore: number; // 0-100
  tier: ReferralTier;
  estimatedReferralsPerYear: number;
  factors: Record<string, number>;
  recommendedApproach: string;
}

/**
 * Referral incentive scenario analysis
 * Source: referral_growth_model.py lines 61-73
 */
export interface IncentiveScenario {
  incentiveType: IncentiveType;
  incentiveAmount: number;
  expectedReferralRate: number;
  expectedReferrals: number;
  expectedConversions: number;
  totalIncentiveCost: number;
  referralCac: number;
  ltvCacRatio: number;
  roi: number;
  recommendation: string;
}

/**
 * Viral growth coefficient and projections
 * Source: referral_growth_model.py lines 76-84
 */
export interface ViralGrowthProjection {
  viralCoefficient: number; // k-factor
  referralRate: number;
  conversionRate: number;
  avgReferralsPerReferrer: number;
  interpretation: string;
  monthProjections: MonthProjection[];
}

/**
 * Monthly projection data
 * Source: referral_growth_model.py lines 416-422
 */
export interface MonthProjection {
  month: number;
  totalCustomers: number;
  newFromReferrals: number;
  cumulativeReferralCustomers: number;
  growthRate: number;
}

/**
 * Referral program ROI analysis
 * Source: referral_growth_model.py lines 489-520
 */
export interface ReferralRoiAnalysis {
  referralProgramCosts: {
    setup: number;
    monthlyOperations: number;
    incentives: number;
    total: number;
  };
  referralMetrics: {
    totalCustomers: number;
    cac: number;
    avgLtv: number;
    ltvCacRatio: number;
    revenue: number;
    roi: number;
  };
  vsPaidAcquisition: {
    paidCac: number;
    paidLtv: number;
    costToAcquireViaPaid: number;
    costSavings: number;
    qualityPremium: number;
    totalValueVsPaid: number;
  };
  summary: {
    referralCac: number;
    paidCac: number;
    cacSavingsPerCustomer: number;
    cacSavingsPercentage: number;
    totalProgramValue: number;
    breakEvenConversions: number;
  };
}

// ============================================
// Constants
// Source: referral_growth_model.py lines 90-131
// ============================================

/**
 * Referral conversion rates (industry benchmarks for insurance)
 * Referrals convert MUCH better than cold leads
 * Source: referral_growth_model.py lines 93-96
 */
export const REFERRAL_CONVERSION_RATE = 0.35; // 35% vs 12% for paid leads
export const PAID_LEAD_CONVERSION_RATE = 0.12;

/**
 * Average referrals per referring customer
 * Active referrers give 1-2 referrals
 * Source: referral_growth_model.py lines 98-99
 */
export const AVG_REFERRALS_PER_REFERRER = 1.4;

/**
 * Referral quality metrics
 * Referrals tend to match the quality of the referrer
 * Source: referral_growth_model.py lines 101-108
 */
export const REFERRAL_QUALITY_MULTIPLIER: Record<string, number> = {
  elite_referrer: 1.4, // Elite customers refer elite prospects
  premium_referrer: 1.2, // Premium -> premium
  standard_referrer: 1.0, // Standard -> standard
  low_value_referrer: 0.8, // Low-value -> low-value
};

/**
 * Referral propensity factors and weights
 * Source: referral_growth_model.py lines 110-118
 */
export const PROPENSITY_WEIGHTS: Record<string, number> = {
  tenure: 0.25, // Long-term customers more likely to refer
  product_count: 0.2, // Multi-product = higher satisfaction
  retention_history: 0.2, // Never churned = satisfied
  engagement: 0.15, // High engagement = brand advocates
  claims_experience: 0.1, // Good claims experience = referral trigger
  nps_score: 0.1, // Net Promoter Score (if available)
};

/**
 * Incentive effectiveness (how much each $ of incentive lifts referral rate)
 * Diminishing returns: $50 -> 6%, $100 -> 8%, $150 -> 9% (not linear)
 * Source: referral_growth_model.py lines 120-128
 */
export const INCENTIVE_EFFECTIVENESS: Record<number, number> = {
  50: 0.06, // $50 incentive -> 6% referral rate
  100: 0.08, // $100 -> 8%
  150: 0.09, // $150 -> 9%
  200: 0.095, // $200 -> 9.5% (diminishing returns)
  250: 0.098, // $250 -> 9.8% (minimal additional benefit)
};

/**
 * LTV of referred customers (typically slightly lower than paid, but higher retention)
 * Source: referral_growth_model.py lines 130-131
 */
export const REFERRED_CUSTOMER_AVG_LTV = 8200; // vs $7000 paid leads

/**
 * Paid acquisition benchmarks for comparison
 * Source: referral_growth_model.py lines 473-475
 */
export const PAID_CAC_BENCHMARK = 700; // Blended paid CAC
export const PAID_LTV_BENCHMARK = 7000; // Average paid lead LTV

// ============================================
// Engagement Level Type
// ============================================

export type EngagementLevel = 'high' | 'medium' | 'low';

// ============================================
// Referral Propensity Scoring
// Source: referral_growth_model.py lines 133-257
// ============================================

/**
 * Calculate customer's likelihood to refer others
 *
 * EXACT PORT from Python ReferralGrowthModel.calculate_referral_propensity()
 * Source: referral_growth_model.py lines 133-257
 *
 * @param customerId - Customer identifier
 * @param tenureMonths - Months as customer
 * @param productCount - Number of products with agency
 * @param retentionScore - 0-1 where 1.0 = never churned, perfect retention
 * @param engagementLevel - Customer engagement (high/medium/low)
 * @param claimsSatisfied - Whether customer satisfied with claims experience (optional)
 * @param npsScore - Net Promoter Score if available (-100 to 100, optional)
 * @returns ReferralPropensityScore with detailed assessment
 */
export function calculateReferralPropensity(
  customerId: string,
  tenureMonths: number,
  productCount: number,
  retentionScore: number, // 0-1 (never churned = 1.0)
  engagementLevel: EngagementLevel,
  claimsSatisfied?: boolean | null,
  npsScore?: number | null
): ReferralPropensityScore {
  const factorScores: Record<string, number> = {};

  // 1. Tenure (25%)
  // Long-term customers more likely to refer
  // Source: referral_growth_model.py lines 160-172
  let tenureScore: number;
  if (tenureMonths >= 60) {
    // 5+ years
    tenureScore = 95;
  } else if (tenureMonths >= 36) {
    // 3-5 years
    tenureScore = 85;
  } else if (tenureMonths >= 24) {
    // 2-3 years
    tenureScore = 70;
  } else if (tenureMonths >= 12) {
    // 1-2 years
    tenureScore = 55;
  } else {
    // <1 year
    tenureScore = 35;
  }
  factorScores['tenure'] = tenureScore;

  // 2. Product count (20%)
  // Multi-product = higher satisfaction, more reasons to refer
  // Source: referral_growth_model.py lines 174-184
  let productScore: number;
  if (productCount >= 4) {
    productScore = 98;
  } else if (productCount === 3) {
    productScore = 90;
  } else if (productCount === 2) {
    productScore = 70;
  } else {
    productScore = 40;
  }
  factorScores['product_count'] = productScore;

  // 3. Retention history (20%)
  // Perfect retention = satisfied customer
  // Source: referral_growth_model.py lines 186-189
  const retentionHistoryScore = retentionScore * 100;
  factorScores['retention_history'] = retentionHistoryScore;

  // 4. Engagement (15%)
  // Source: referral_growth_model.py lines 191-194
  const engagementScores: Record<EngagementLevel, number> = {
    high: 95,
    medium: 70,
    low: 35,
  };
  const engagementScore = engagementScores[engagementLevel] ?? 70;
  factorScores['engagement'] = engagementScore;

  // 5. Claims experience (10%)
  // Good claims experience is a major referral trigger
  // Source: referral_growth_model.py lines 196-204
  let claimsScore: number;
  if (claimsSatisfied === null || claimsSatisfied === undefined) {
    claimsScore = 70; // Neutral if unknown
  } else if (claimsSatisfied) {
    claimsScore = 95; // Very likely to refer after good claims experience
  } else {
    claimsScore = 20; // Unlikely to refer after bad claims experience
  }
  factorScores['claims_experience'] = claimsScore;

  // 6. NPS Score (10%)
  // NPS ranges from -100 to 100
  // Promoters (9-10): 50-100 NPS -> high referral
  // Passives (7-8): 0-49 NPS -> medium referral
  // Detractors (0-6): -100 to -1 NPS -> low referral
  // Source: referral_growth_model.py lines 206-222
  let npsScoreScaled: number;
  if (npsScore !== null && npsScore !== undefined) {
    if (npsScore >= 50) {
      npsScoreScaled = 95;
    } else if (npsScore >= 0) {
      npsScoreScaled = 70;
    } else if (npsScore >= -50) {
      npsScoreScaled = 40;
    } else {
      npsScoreScaled = 15;
    }
  } else {
    npsScoreScaled = 70; // Neutral if unknown
  }
  factorScores['nps_score'] = npsScoreScaled;

  // Calculate weighted propensity score
  // Source: referral_growth_model.py lines 224-228
  let propensityScore = 0;
  for (const factor of Object.keys(factorScores)) {
    propensityScore += factorScores[factor] * PROPENSITY_WEIGHTS[factor];
  }

  // Classify into tier
  // Source: referral_growth_model.py lines 230-248
  let tier: ReferralTier;
  let estimatedReferralRate: number;
  let recommendedApproach: string;

  if (propensityScore >= 80) {
    tier = 'champion';
    estimatedReferralRate = 0.2; // 20% of champions refer
    recommendedApproach =
      'Priority outreach: Personal ask from agent + premium incentive';
  } else if (propensityScore >= 60) {
    tier = 'promoter';
    estimatedReferralRate = 0.12; // 12% of promoters refer
    recommendedApproach = 'Email campaign + standard incentive offer';
  } else if (propensityScore >= 40) {
    tier = 'passive';
    estimatedReferralRate = 0.05; // 5% of passives refer
    recommendedApproach = 'Gentle reminder in policy renewal communications';
  } else {
    tier = 'detractor';
    estimatedReferralRate = 0.01; // 1% of detractors refer
    recommendedApproach =
      'Focus on improving satisfaction before asking for referrals';
  }

  const estimatedReferralsPerYear =
    estimatedReferralRate * AVG_REFERRALS_PER_REFERRER;

  return {
    customerId,
    propensityScore,
    tier,
    estimatedReferralsPerYear,
    factors: factorScores,
    recommendedApproach,
  };
}

// ============================================
// Incentive Scenario Analysis
// Source: referral_growth_model.py lines 259-337
// ============================================

/**
 * Analyze different referral incentive scenarios
 *
 * EXACT PORT from Python ReferralGrowthModel.analyze_incentive_scenarios()
 * Source: referral_growth_model.py lines 259-337
 *
 * @param customerBaseSize - Total customers
 * @param highPropensityCount - Customers with high referral propensity
 * @param mediumPropensityCount - Customers with medium propensity
 * @returns List of IncentiveScenario options
 */
export function analyzeIncentiveScenarios(
  customerBaseSize: number,
  highPropensityCount: number,
  mediumPropensityCount: number
): IncentiveScenario[] {
  const scenarios: IncentiveScenario[] = [];

  // Test different incentive amounts
  // Source: referral_growth_model.py lines 278-279
  const incentiveAmounts = [50, 100, 150, 200, 250];

  for (const amount of incentiveAmounts) {
    // Get expected referral rate for this incentive
    // Source: referral_growth_model.py lines 282-283
    const expectedRate = INCENTIVE_EFFECTIVENESS[amount] ?? 0.08;

    // Calculate participation (high propensity participate more)
    // Source: referral_growth_model.py lines 285-287
    const highPropParticipation = expectedRate * 1.5; // Champions over-index
    const mediumPropParticipation = expectedRate * 0.8; // Promoters at baseline

    // Calculate referrals
    // Source: referral_growth_model.py lines 289-292
    const referralsFromHigh =
      highPropensityCount * highPropParticipation * AVG_REFERRALS_PER_REFERRER;
    const referralsFromMedium =
      mediumPropensityCount *
      mediumPropParticipation *
      AVG_REFERRALS_PER_REFERRER;
    const totalReferrals = referralsFromHigh + referralsFromMedium;

    // Calculate conversions
    // Source: referral_growth_model.py lines 294-295
    const expectedConversions = totalReferrals * REFERRAL_CONVERSION_RATE;

    // Calculate costs
    // Cost = incentive paid per successful referral (not per attempt)
    // Source: referral_growth_model.py lines 297-299
    const totalIncentiveCost = expectedConversions * amount;

    // Calculate referral CAC
    // Source: referral_growth_model.py lines 301-302
    const referralCac =
      expectedConversions > 0 ? totalIncentiveCost / expectedConversions : 0;

    // LTV:CAC ratio
    // Source: referral_growth_model.py lines 304-305
    const ltvCac =
      referralCac > 0 ? REFERRED_CUSTOMER_AVG_LTV / referralCac : 0;

    // ROI = (Revenue - Cost) / Cost
    // Revenue = LTV x Conversions
    // Source: referral_growth_model.py lines 307-310
    const revenue = REFERRED_CUSTOMER_AVG_LTV * expectedConversions;
    const roi =
      totalIncentiveCost > 0
        ? (revenue - totalIncentiveCost) / totalIncentiveCost
        : 0;

    // Recommendation
    // Source: referral_growth_model.py lines 312-322
    let recommendation: string;
    if (ltvCac >= 40) {
      recommendation = 'EXCELLENT - Maximize this incentive level';
    } else if (ltvCac >= 20) {
      recommendation = 'VERY GOOD - Strong program foundation';
    } else if (ltvCac >= 10) {
      recommendation = 'GOOD - Solid ROI';
    } else if (ltvCac >= 5) {
      recommendation = 'FAIR - Consider optimizing';
    } else {
      recommendation = 'POOR - Incentive too high relative to value';
    }

    scenarios.push({
      incentiveType: 'cash',
      incentiveAmount: amount,
      expectedReferralRate: expectedRate,
      expectedReferrals: Math.floor(totalReferrals),
      expectedConversions: Math.floor(expectedConversions),
      totalIncentiveCost,
      referralCac,
      ltvCacRatio: ltvCac,
      roi,
      recommendation,
    });
  }

  return scenarios;
}

/**
 * Get the optimal incentive scenario (highest LTV:CAC ratio)
 *
 * @param scenarios - Array of incentive scenarios
 * @returns The scenario with the highest LTV:CAC ratio
 */
export function getOptimalIncentiveScenario(
  scenarios: IncentiveScenario[]
): IncentiveScenario | null {
  if (scenarios.length === 0) return null;
  return scenarios.reduce((best, current) =>
    current.ltvCacRatio > best.ltvCacRatio ? current : best
  );
}

// ============================================
// Viral Coefficient Calculation
// Source: referral_growth_model.py lines 339-366
// ============================================

/**
 * Calculate viral coefficient (k-factor)
 *
 * EXACT PORT from Python ReferralGrowthModel.calculate_viral_coefficient()
 * Source: referral_growth_model.py lines 339-366
 *
 * Viral coefficient = (% of customers who refer) x (avg referrals per referrer) x (referral conversion rate)
 *
 * k > 1.0 = exponential growth (each customer brings >1 new customer)
 * k = 1.0 = replacement growth (each customer brings exactly 1 new customer)
 * k < 1.0 = sub-exponential growth (referrals provide lift but not explosive growth)
 *
 * @param referralRate - % of customers who actively refer
 * @param conversionRate - % of referrals who convert to customers (optional, defaults to REFERRAL_CONVERSION_RATE)
 * @param avgReferralsPerCustomer - Average referrals per referring customer (optional, defaults to AVG_REFERRALS_PER_REFERRER)
 * @returns Viral coefficient (k-factor)
 */
export function calculateViralCoefficient(
  referralRate: number,
  conversionRate?: number,
  avgReferralsPerCustomer?: number
): number {
  const conversion = conversionRate ?? REFERRAL_CONVERSION_RATE;
  const avgRefs = avgReferralsPerCustomer ?? AVG_REFERRALS_PER_REFERRER;

  const kFactor = referralRate * avgRefs * conversion;
  return kFactor;
}

/**
 * Interpret the viral coefficient value
 *
 * Source: referral_growth_model.py lines 387-397
 *
 * @param kFactor - The viral coefficient
 * @returns Human-readable interpretation
 */
export function interpretViralCoefficient(kFactor: number): string {
  if (kFactor >= 1.0) {
    return 'EXPONENTIAL GROWTH - Viral loop achieved! Each customer brings 1+ new customers.';
  } else if (kFactor >= 0.5) {
    return 'STRONG VIRAL EFFECT - Significant organic growth from referrals.';
  } else if (kFactor >= 0.25) {
    return 'MODERATE VIRAL EFFECT - Referrals provide meaningful customer acquisition lift.';
  } else if (kFactor >= 0.1) {
    return 'SLIGHT VIRAL EFFECT - Referrals supplement other acquisition channels.';
  } else {
    return 'MINIMAL VIRAL EFFECT - Referrals are opportunistic, not strategic growth driver.';
  }
}

// ============================================
// Viral Growth Projection
// Source: referral_growth_model.py lines 368-431
// ============================================

/**
 * Project customer growth from referral program
 *
 * EXACT PORT from Python ReferralGrowthModel.project_viral_growth()
 * Source: referral_growth_model.py lines 368-431
 *
 * @param startingCustomers - Current customer base
 * @param referralRate - Expected % of customers who will refer
 * @param monthsToProject - Number of months to project (default 12)
 * @returns ViralGrowthProjection with month-by-month forecast
 */
export function projectViralGrowth(
  startingCustomers: number,
  referralRate: number,
  monthsToProject: number = 12
): ViralGrowthProjection {
  const kFactor = calculateViralCoefficient(referralRate);

  // Interpret viral coefficient
  // Source: referral_growth_model.py lines 387-397
  const interpretation = interpretViralCoefficient(kFactor);

  // Project month-by-month growth
  // Source: referral_growth_model.py lines 399-422
  const projections: MonthProjection[] = [];
  let currentCustomers = startingCustomers;

  for (let month = 1; month <= monthsToProject; month++) {
    // Customers who will refer this month
    const referringCustomers = currentCustomers * referralRate;

    // Referrals generated
    const referralsGenerated = referringCustomers * AVG_REFERRALS_PER_REFERRER;

    // New customers from referrals
    const newCustomersFromReferrals =
      referralsGenerated * REFERRAL_CONVERSION_RATE;

    // Update customer base (simplified - assumes no churn, just adds referrals)
    currentCustomers += newCustomersFromReferrals;

    projections.push({
      month,
      totalCustomers: Math.floor(currentCustomers),
      newFromReferrals: Math.floor(newCustomersFromReferrals),
      cumulativeReferralCustomers: Math.floor(
        currentCustomers - startingCustomers
      ),
      growthRate: currentCustomers / startingCustomers - 1,
    });
  }

  return {
    viralCoefficient: kFactor,
    referralRate,
    conversionRate: REFERRAL_CONVERSION_RATE,
    avgReferralsPerReferrer: AVG_REFERRALS_PER_REFERRER,
    interpretation,
    monthProjections: projections,
  };
}

// ============================================
// Referral Program ROI Analysis
// Source: referral_growth_model.py lines 433-520
// ============================================

/**
 * Calculate ROI of referral program vs paid acquisition
 *
 * EXACT PORT from Python ReferralGrowthModel.calculate_referral_roi()
 * Source: referral_growth_model.py lines 433-520
 *
 * @param programSetupCost - One-time setup cost (software, marketing materials, etc.)
 * @param monthlyProgramCost - Monthly fixed costs (program management)
 * @param incentivePerConversion - Incentive paid per successful referral
 * @param expectedMonthlyConversions - Expected conversions per month
 * @param months - Time horizon for ROI calculation (default 12)
 * @returns ReferralRoiAnalysis with comprehensive ROI metrics and comparison to paid acquisition
 */
export function calculateReferralRoi(
  programSetupCost: number,
  monthlyProgramCost: number,
  incentivePerConversion: number,
  expectedMonthlyConversions: number,
  months: number = 12
): ReferralRoiAnalysis {
  // Referral program costs
  // Source: referral_growth_model.py lines 454-458
  const totalSetupCost = programSetupCost;
  const totalMonthlyCosts = monthlyProgramCost * months;
  const totalIncentiveCosts =
    incentivePerConversion * expectedMonthlyConversions * months;
  const totalReferralCosts =
    totalSetupCost + totalMonthlyCosts + totalIncentiveCosts;

  // Total referral customers
  // Source: referral_growth_model.py lines 460-461
  const totalReferralCustomers = expectedMonthlyConversions * months;

  // Referral CAC
  // Source: referral_growth_model.py lines 463-464
  const referralCac =
    totalReferralCustomers > 0
      ? totalReferralCosts / totalReferralCustomers
      : 0;

  // Referral revenue (LTV x customers)
  // Source: referral_growth_model.py lines 466-467
  const referralRevenue = REFERRED_CUSTOMER_AVG_LTV * totalReferralCustomers;

  // Referral ROI
  // Source: referral_growth_model.py lines 469-470
  const referralRoi =
    totalReferralCosts > 0
      ? (referralRevenue - totalReferralCosts) / totalReferralCosts
      : 0;

  // Compare to paid acquisition
  // Assumption: Paid CAC = $700 (blended), Paid LTV = $7000
  // Source: referral_growth_model.py lines 472-475
  const paidCac = PAID_CAC_BENCHMARK;
  const paidLtv = PAID_LTV_BENCHMARK;

  // Cost to acquire same number of customers via paid
  // Source: referral_growth_model.py lines 477-478
  const paidAcquisitionCost = paidCac * totalReferralCustomers;

  // Savings from referral program
  // Source: referral_growth_model.py lines 480-481
  const costSavings = paidAcquisitionCost - totalReferralCosts;

  // Quality benefit (referred customers typically have higher LTV and retention)
  // Source: referral_growth_model.py lines 483-484
  const qualityPremium =
    (REFERRED_CUSTOMER_AVG_LTV - paidLtv) * totalReferralCustomers;

  // Total program value
  // Source: referral_growth_model.py lines 486-487
  const totalProgramValue = costSavings + qualityPremium;

  // Break-even conversions
  // Source: referral_growth_model.py lines 518
  const breakEvenConversions =
    incentivePerConversion > 0
      ? (totalSetupCost + totalMonthlyCosts) / incentivePerConversion
      : 0;

  return {
    referralProgramCosts: {
      setup: totalSetupCost,
      monthlyOperations: totalMonthlyCosts,
      incentives: totalIncentiveCosts,
      total: totalReferralCosts,
    },
    referralMetrics: {
      totalCustomers: totalReferralCustomers,
      cac: referralCac,
      avgLtv: REFERRED_CUSTOMER_AVG_LTV,
      ltvCacRatio: referralCac > 0 ? REFERRED_CUSTOMER_AVG_LTV / referralCac : 0,
      revenue: referralRevenue,
      roi: referralRoi,
    },
    vsPaidAcquisition: {
      paidCac,
      paidLtv,
      costToAcquireViaPaid: paidAcquisitionCost,
      costSavings,
      qualityPremium,
      totalValueVsPaid: totalProgramValue,
    },
    summary: {
      referralCac,
      paidCac,
      cacSavingsPerCustomer: paidCac - referralCac,
      cacSavingsPercentage: paidCac > 0 ? (paidCac - referralCac) / paidCac : 0,
      totalProgramValue,
      breakEvenConversions,
    },
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Count customers by referral tier from propensity scores
 *
 * @param scores - Array of ReferralPropensityScore
 * @returns Record of tier counts
 */
export function countByTier(
  scores: ReferralPropensityScore[]
): Record<ReferralTier, number> {
  const counts: Record<ReferralTier, number> = {
    champion: 0,
    promoter: 0,
    passive: 0,
    detractor: 0,
  };

  for (const score of scores) {
    counts[score.tier]++;
  }

  return counts;
}

/**
 * Get high propensity customers (Champions + Promoters)
 *
 * @param scores - Array of ReferralPropensityScore
 * @returns Filtered array of high propensity customers
 */
export function getHighPropensityCustomers(
  scores: ReferralPropensityScore[]
): ReferralPropensityScore[] {
  return scores.filter((s) => s.tier === 'champion' || s.tier === 'promoter');
}

/**
 * Calculate total estimated referrals from a set of propensity scores
 *
 * @param scores - Array of ReferralPropensityScore
 * @returns Total estimated annual referrals
 */
export function calculateTotalEstimatedReferrals(
  scores: ReferralPropensityScore[]
): number {
  return scores.reduce((sum, s) => sum + s.estimatedReferralsPerYear, 0);
}

/**
 * Format currency for display
 *
 * @param value - Numeric value
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 *
 * @param value - Decimal value (e.g., 0.35 for 35%)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

// ============================================
// Default Export
// ============================================

export default {
  // Constants
  REFERRAL_CONVERSION_RATE,
  PAID_LEAD_CONVERSION_RATE,
  AVG_REFERRALS_PER_REFERRER,
  REFERRAL_QUALITY_MULTIPLIER,
  PROPENSITY_WEIGHTS,
  INCENTIVE_EFFECTIVENESS,
  REFERRED_CUSTOMER_AVG_LTV,
  PAID_CAC_BENCHMARK,
  PAID_LTV_BENCHMARK,
  REFERRAL_TIER_DESCRIPTIONS,

  // Core functions
  calculateReferralPropensity,
  analyzeIncentiveScenarios,
  getOptimalIncentiveScenario,
  calculateViralCoefficient,
  interpretViralCoefficient,
  projectViralGrowth,
  calculateReferralRoi,

  // Utility functions
  countByTier,
  getHighPropensityCustomers,
  calculateTotalEstimatedReferrals,
  formatCurrency,
  formatPercentage,
};
