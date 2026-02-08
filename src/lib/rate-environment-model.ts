/**
 * Rate Environment & Price Elasticity Model
 *
 * EXACT PORT from Python bealer-lead-model/src/rate_environment_model.py
 *
 * Models impact of premium rate increases on retention and revenue
 *
 * Key Economics:
 * - Insurance premiums are inflating 8-12% annually (2024-2025)
 * - Rate increases cause additional churn (price elasticity)
 * - Revenue growth = Policy Growth + Rate Growth - Rate-Driven Churn
 *
 * Source: bealer-lead-model/src/rate_environment_model.py
 */

// ============================================
// Types (from Python lines 13-42)
// ============================================

/**
 * Market competitiveness levels
 * Source: Python line 38
 */
export type MarketCompetitiveness = 'soft' | 'moderate' | 'hard';

/**
 * Product types for rate analysis
 * Source: Python lines 203-208
 */
export type ProductType = 'auto' | 'home' | 'umbrella' | 'life';

/**
 * Rate increase severity levels
 * Source: Python lines 78-86
 */
export type RateSeverity = 'mild' | 'moderate' | 'severe';

/**
 * Configuration for the rate environment model
 * Source: Python lines 24-42 (dataclass fields)
 */
export interface RateEnvironmentConfig {
  // Rate trend assumptions (Python lines 25-29)
  baselineAnnualRateIncrease: number; // 8% baseline
  autoRateIncrease: number;           // Auto seeing 10% increases
  homeRateIncrease: number;           // Home seeing 12% (CAT-driven)
  umbrellaRateIncrease: number;       // Umbrella more stable
  lifeRateIncrease: number;           // Life very stable

  // Price elasticity coefficients (Python lines 32-35)
  // Elasticity = % change in retention / % change in price
  // -0.30 = 10% price increase causes 3% additional churn
  retentionElasticity: number;
  quoteElasticity: number; // Quotes decline faster than retention

  // Competitive environment (Python line 38)
  marketCompetitiveness: MarketCompetitiveness;

  // Rate shock thresholds (Python lines 41-42)
  moderateIncreaseThreshold: number; // 10%+ = noticeable
  severeIncreaseThreshold: number;   // 15%+ = severe sticker shock
}

/**
 * Result of rate-driven churn calculation
 * Source: Python lines 88-98
 */
export interface RateDrivenChurnResult {
  rateIncreasePct: number;
  baseRetention: number;
  additionalChurn: number;
  adjustedRetention: number;
  retentionDeclinePct: number;
  severity: RateSeverity;
  customerReaction: string;
  elasticityUsed: number;
  marketEnvironment: MarketCompetitiveness;
}

/**
 * Year data for revenue decomposition
 * Source: Python lines 143-147, 148-152
 */
export interface YearData {
  policies: number;
  avgPremium: number;
  totalRevenue: number;
}

/**
 * Growth rates breakdown
 * Source: Python lines 153-157
 */
export interface GrowthRates {
  totalRevenueGrowth: number;
  policyCountGrowth: number;
  premiumRateGrowth: number;
}

/**
 * Growth contribution analysis
 * Source: Python lines 158-163
 */
export interface GrowthContribution {
  organicContributionPct: number;
  rateContributionPct: number;
  organicPercentageOfGrowth: number;
  ratePercentageOfGrowth: number;
}

/**
 * Result of revenue growth decomposition
 * Source: Python lines 142-167
 */
export interface RevenueDecomposition {
  year1: YearData;
  year2: YearData;
  growthRates: GrowthRates;
  contribution: GrowthContribution;
  interpretation: string;
}

/**
 * Scenario data for retention projection
 * Source: Python lines 218-236
 */
export interface RetentionScenario {
  rateIncrease: number;
  retention: number;
  policiesRetainedPer1000: number;
}

/**
 * Result of retention projection
 * Source: Python lines 239-248
 */
export interface RetentionProjection {
  product: ProductType;
  baseRetention: number;
  plannedRateIncrease: number;
  projectedRetention: number;
  policiesLostPer1000: number;
  severity: RateSeverity;
  scenarios: {
    noRateIncrease: RetentionScenario;
    plannedIncrease: RetentionScenario;
    severeIncrease: RetentionScenario;
  };
  recommendation: string;
}

/**
 * Yearly breakdown for LTV calculation
 * Source: Python lines 316-323
 */
export interface YearlyLtvBreakdown {
  year: number;
  retentionProbability: number;
  premiumWithoutInflation: number;
  premiumWithInflation: number;
  commissionWithoutInflation: number;
  commissionWithInflation: number;
}

/**
 * Result of LTV calculation with inflation
 * Source: Python lines 328-338
 */
export interface LtvWithInflationResult {
  basePremium: number;
  annualRateIncrease: number;
  yearsProjected: number;
  ltvWithoutInflation: number;
  ltvWithInflation: number;
  inflationLift: number;
  ltvMultiplier: number;
  interpretation: string;
  yearlyBreakdown?: YearlyLtvBreakdown[];
}

// ============================================
// Constants (from Python lines 24-42)
// ============================================

/**
 * Default configuration values
 * Source: Python RateEnvironmentModel dataclass defaults (lines 24-42)
 */
export const DEFAULT_CONFIG: RateEnvironmentConfig = {
  // Rate trend assumptions (Python lines 25-29)
  baselineAnnualRateIncrease: 0.08, // 8% baseline
  autoRateIncrease: 0.10,           // Auto seeing 10% increases
  homeRateIncrease: 0.12,           // Home seeing 12% (CAT-driven)
  umbrellaRateIncrease: 0.05,       // Umbrella more stable
  lifeRateIncrease: 0.03,           // Life very stable

  // Price elasticity coefficients (Python lines 32-35)
  retentionElasticity: -0.30,
  quoteElasticity: -0.45, // Quotes decline faster than retention

  // Competitive environment (Python line 38)
  marketCompetitiveness: 'hard',

  // Rate shock thresholds (Python lines 41-42)
  moderateIncreaseThreshold: 0.10, // 10%+ = noticeable
  severeIncreaseThreshold: 0.15,   // 15%+ = severe sticker shock
};

/**
 * Product-specific rate increases
 * Source: Python lines 203-208
 */
export const PRODUCT_RATE_INCREASES: Record<ProductType, number> = {
  auto: 0.10,     // Auto seeing 10% increases
  home: 0.12,     // Home seeing 12% (CAT-driven)
  umbrella: 0.05, // Umbrella more stable
  life: 0.03,     // Life very stable
};

/**
 * Competitiveness multipliers for churn calculation
 * Source: Python lines 63-67
 */
export const COMPETITIVENESS_MULTIPLIERS: Record<MarketCompetitiveness, number> = {
  soft: 0.7,      // Less competition = less rate shopping
  moderate: 1.0,  // Normal
  hard: 1.3,      // More competition = more rate sensitivity
};

/**
 * Commission rate for LTV calculations
 * Source: Python line 294
 */
export const COMMISSION_RATE = 0.07; // 7% avg

/**
 * Minimum retention floor (customers have inertia)
 * Source: Python line 75
 */
export const MINIMUM_RETENTION_FLOOR = 0.60;

// ============================================
// Core Functions
// ============================================

/**
 * Calculate additional churn from rate increases
 *
 * EXACT PORT from Python RateEnvironmentModel.calculate_rate_driven_churn()
 * Source: Python lines 44-98
 *
 * @param rateIncrease - Percentage rate increase (e.g., 0.10 for 10%)
 * @param baseRetention - Base retention rate without rate increase
 * @param config - Optional configuration overrides
 * @returns Dictionary with adjusted retention and churn breakdown
 */
export function calculateRateDrivenChurn(
  rateIncrease: number,
  baseRetention: number,
  config: Partial<RateEnvironmentConfig> = {}
): RateDrivenChurnResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Additional churn from price elasticity (Python lines 57-60)
  // Formula: Additional churn = (rate_increase / 0.10) * |elasticity|
  // Example: 10% increase with -0.30 elasticity = 3% additional churn
  let additionalChurn = (rateIncrease / 0.10) * Math.abs(fullConfig.retentionElasticity) / 100;

  // Adjust for market competitiveness (Python lines 62-69)
  const multiplier = COMPETITIVENESS_MULTIPLIERS[fullConfig.marketCompetitiveness];
  additionalChurn = additionalChurn * multiplier;

  // Calculate adjusted retention (Python line 72)
  let adjustedRetention = baseRetention - additionalChurn;

  // Floor retention at realistic minimum (customers have inertia) (Python line 75)
  adjustedRetention = Math.max(MINIMUM_RETENTION_FLOOR, adjustedRetention);

  // Categorize rate increase severity (Python lines 77-86)
  let severity: RateSeverity;
  let customerReaction: string;

  if (rateIncrease >= fullConfig.severeIncreaseThreshold) {
    severity = 'severe';
    customerReaction = 'High shopping activity, significant losses expected';
  } else if (rateIncrease >= fullConfig.moderateIncreaseThreshold) {
    severity = 'moderate';
    customerReaction = 'Moderate shopping, proactive communication needed';
  } else {
    severity = 'mild';
    customerReaction = 'Minimal impact, normal retention expected';
  }

  // Return result (Python lines 88-98)
  return {
    rateIncreasePct: rateIncrease * 100,
    baseRetention,
    additionalChurn,
    adjustedRetention,
    retentionDeclinePct: (baseRetention - adjustedRetention) * 100,
    severity,
    customerReaction,
    elasticityUsed: fullConfig.retentionElasticity,
    marketEnvironment: fullConfig.marketCompetitiveness,
  };
}

/**
 * Generate interpretation of growth decomposition
 *
 * EXACT PORT from Python RateEnvironmentModel._interpret_growth_decomposition()
 * Source: Python lines 169-185
 *
 * @param organicPct - Organic percentage of growth
 * @param totalGrowth - Total revenue growth
 * @returns Interpretation string
 */
function interpretGrowthDecomposition(
  organicPct: number,
  totalGrowth: number
): string {
  // Python lines 174-185
  if (totalGrowth < 0) {
    return 'DECLINING: Business is shrinking despite rate increases';
  } else if (organicPct < 0) {
    return 'RATE-DRIVEN: Growth entirely from rate, policy count declining';
  } else if (organicPct < 0.3) {
    return 'MOSTLY RATE: <30% organic, heavily dependent on rate increases';
  } else if (organicPct < 0.6) {
    return 'BALANCED: Mix of organic and rate-driven growth';
  } else if (organicPct < 0.9) {
    return 'MOSTLY ORGANIC: Healthy policy count growth, some rate tailwind';
  } else {
    return 'FULLY ORGANIC: Growth driven by policy count, minimal rate impact';
  }
}

/**
 * Decompose revenue growth into organic (policy count) vs rate components
 *
 * This is critical for understanding TRUE business growth vs inflation
 *
 * EXACT PORT from Python RateEnvironmentModel.decompose_revenue_growth()
 * Source: Python lines 100-167
 *
 * @param policiesYear1 - Policy count year 1
 * @param policiesYear2 - Policy count year 2
 * @param premiumYear1 - Average premium year 1
 * @param premiumYear2 - Average premium year 2
 * @returns Growth decomposition analysis
 */
export function decomposeRevenueGrowth(
  policiesYear1: number,
  policiesYear2: number,
  premiumYear1: number,
  premiumYear2: number
): RevenueDecomposition {
  // Revenue calculations (Python lines 119-121)
  const revenueY1 = policiesYear1 * premiumYear1;
  const revenueY2 = policiesYear2 * premiumYear2;

  // Growth rates (Python lines 123-126)
  const totalRevenueGrowth = revenueY1 > 0 ? (revenueY2 / revenueY1 - 1) : 0;
  const policyGrowth = policiesYear1 > 0 ? (policiesYear2 / policiesYear1 - 1) : 0;
  const rateGrowth = premiumYear1 > 0 ? (premiumYear2 / premiumYear1 - 1) : 0;

  // Contribution analysis (Python lines 128-140)
  // Revenue growth ~ policy growth + rate growth (approximate, not exact due to compounding)
  const organicContribution = policyGrowth;
  const rateContribution = rateGrowth;

  // What % of growth came from organic vs rate?
  const totalGrowthAbsolute = policyGrowth + rateGrowth;
  let organicPercentage: number;
  let ratePercentage: number;

  if (totalGrowthAbsolute !== 0) {
    organicPercentage = policyGrowth / totalGrowthAbsolute;
    ratePercentage = rateGrowth / totalGrowthAbsolute;
  } else {
    organicPercentage = 0;
    ratePercentage = 0;
  }

  // Return result (Python lines 142-167)
  return {
    year1: {
      policies: policiesYear1,
      avgPremium: premiumYear1,
      totalRevenue: revenueY1,
    },
    year2: {
      policies: policiesYear2,
      avgPremium: premiumYear2,
      totalRevenue: revenueY2,
    },
    growthRates: {
      totalRevenueGrowth,
      policyCountGrowth: policyGrowth,
      premiumRateGrowth: rateGrowth,
    },
    contribution: {
      organicContributionPct: organicContribution * 100,
      rateContributionPct: rateContribution * 100,
      organicPercentageOfGrowth: organicPercentage * 100,
      ratePercentageOfGrowth: ratePercentage * 100,
    },
    interpretation: interpretGrowthDecomposition(organicPercentage, totalRevenueGrowth),
  };
}

/**
 * Generate recommendation based on rate impact
 *
 * EXACT PORT from Python RateEnvironmentModel._generate_rate_recommendation()
 * Source: Python lines 250-266
 *
 * @param impact - Rate impact result
 * @returns Recommendation string
 */
function generateRateRecommendation(impact: RateDrivenChurnResult): string {
  const { severity, retentionDeclinePct } = impact;

  // Python lines 256-266
  if (severity === 'severe') {
    return (
      `HIGH RISK: ${retentionDeclinePct.toFixed(1)}% additional churn expected. ` +
      'Consider: (1) Phased rate increases, (2) Proactive customer communication, ' +
      '(3) Retention offers for high-value customers'
    );
  } else if (severity === 'moderate') {
    return (
      `MODERATE RISK: ${retentionDeclinePct.toFixed(1)}% additional churn. ` +
      'Recommend: (1) Clear renewal communication, (2) Bundle incentives, ' +
      '(3) Monitor shopping activity'
    );
  } else {
    return (
      `LOW RISK: ${retentionDeclinePct.toFixed(1)}% minimal impact. ` +
      'Standard renewal process appropriate.'
    );
  }
}

/**
 * Project retention given a planned rate increase
 *
 * EXACT PORT from Python RateEnvironmentModel.project_retention_with_rate_change()
 * Source: Python lines 187-248
 *
 * @param baseRetention - Current retention rate
 * @param plannedRateIncrease - Planned rate increase (0.10 = 10%)
 * @param product - Product line
 * @param config - Optional configuration overrides
 * @returns Retention projection with scenarios
 */
export function projectRetentionWithRateChange(
  baseRetention: number,
  plannedRateIncrease: number | null,
  product: ProductType = 'auto',
  config: Partial<RateEnvironmentConfig> = {}
): RetentionProjection {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Get product-specific rate increase if not provided (Python lines 202-211)
  const effectiveRateIncrease = plannedRateIncrease ??
    PRODUCT_RATE_INCREASES[product] ??
    fullConfig.baselineAnnualRateIncrease;

  // Calculate impact (Python line 214)
  const impact = calculateRateDrivenChurn(effectiveRateIncrease, baseRetention, fullConfig);

  // Calculate severe scenario (Python lines 228-236)
  const severeImpact = calculateRateDrivenChurn(
    fullConfig.severeIncreaseThreshold,
    baseRetention,
    fullConfig
  );

  // Scenario analysis (Python lines 217-237)
  const scenarios = {
    noRateIncrease: {
      rateIncrease: 0.0,
      retention: baseRetention,
      policiesRetainedPer1000: baseRetention * 1000,
    },
    plannedIncrease: {
      rateIncrease: effectiveRateIncrease,
      retention: impact.adjustedRetention,
      policiesRetainedPer1000: impact.adjustedRetention * 1000,
    },
    severeIncrease: {
      rateIncrease: fullConfig.severeIncreaseThreshold,
      retention: severeImpact.adjustedRetention,
      policiesRetainedPer1000: severeImpact.adjustedRetention * 1000,
    },
  };

  // Return result (Python lines 239-248)
  return {
    product,
    baseRetention,
    plannedRateIncrease: effectiveRateIncrease,
    projectedRetention: impact.adjustedRetention,
    policiesLostPer1000: (baseRetention - impact.adjustedRetention) * 1000,
    severity: impact.severity,
    scenarios,
    recommendation: generateRateRecommendation(impact),
  };
}

/**
 * Calculate LTV accounting for premium inflation over time
 *
 * Traditional LTV assumes static premiums - this is wrong in insurance!
 * Premiums inflate 8-12% annually, increasing LTV significantly.
 *
 * EXACT PORT from Python RateEnvironmentModel.calculate_ltv_with_inflation()
 * Source: Python lines 268-338
 *
 * @param basePremium - Current premium
 * @param baseRetention - Retention rate
 * @param years - Years to project (default 10)
 * @param annualRateIncrease - Annual premium inflation (optional)
 * @param includeBreakdown - Whether to include yearly breakdown (default false)
 * @param config - Optional configuration overrides
 * @returns LTV calculation with inflation
 */
export function calculateLtvWithInflation(
  basePremium: number,
  baseRetention: number,
  years: number = 10,
  annualRateIncrease?: number,
  includeBreakdown: boolean = false,
  config: Partial<RateEnvironmentConfig> = {}
): LtvWithInflationResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Use default rate increase if not provided (Python lines 288-289)
  const effectiveRateIncrease = annualRateIncrease ?? fullConfig.baselineAnnualRateIncrease;

  // Year-by-year projection (Python lines 291-323)
  let ltvWithoutInflation = 0;
  let ltvWithInflation = 0;
  const commissionRate = COMMISSION_RATE; // Python line 294

  let cumulativeRetention = 1.0;
  let currentPremium = basePremium;

  const yearlyBreakdown: YearlyLtvBreakdown[] = [];

  for (let year = 1; year <= years; year++) {
    // Retention compounds (Python line 302)
    cumulativeRetention *= baseRetention;

    // Premium inflates (Python lines 305-307)
    if (year > 1) {
      currentPremium *= (1 + effectiveRateIncrease);
    }

    // Commission this year (only if customer retained) (Python lines 309-311)
    const commissionWithoutInflation = basePremium * commissionRate * cumulativeRetention;
    const commissionWithInflation = currentPremium * commissionRate * cumulativeRetention;

    ltvWithoutInflation += commissionWithoutInflation;
    ltvWithInflation += commissionWithInflation;

    // Python lines 316-323
    yearlyBreakdown.push({
      year,
      retentionProbability: cumulativeRetention,
      premiumWithoutInflation: basePremium,
      premiumWithInflation: currentPremium,
      commissionWithoutInflation,
      commissionWithInflation,
    });
  }

  // LTV multiplier from inflation (Python line 326)
  const ltvMultiplier = ltvWithoutInflation > 0
    ? ltvWithInflation / ltvWithoutInflation
    : 1.0;

  // Return result (Python lines 328-338)
  const result: LtvWithInflationResult = {
    basePremium,
    annualRateIncrease: effectiveRateIncrease,
    yearsProjected: years,
    ltvWithoutInflation,
    ltvWithInflation,
    inflationLift: ltvWithInflation - ltvWithoutInflation,
    ltvMultiplier,
    interpretation: (
      `Premium inflation adds ${((ltvMultiplier - 1) * 100).toFixed(0)}% ` +
      'to customer lifetime value'
    ),
  };

  if (includeBreakdown) {
    result.yearlyBreakdown = yearlyBreakdown;
  }

  return result;
}

// ============================================
// Class-based API (matches Python structure)
// ============================================

/**
 * Rate Environment Model Class
 *
 * Provides a class-based API matching the Python dataclass structure.
 * Source: Python lines 13-338
 */
export class RateEnvironmentModel {
  private config: RateEnvironmentConfig;

  constructor(config: Partial<RateEnvironmentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate rate-driven churn
   * Source: Python lines 44-98
   */
  calculateRateDrivenChurn(
    rateIncrease: number,
    baseRetention: number
  ): RateDrivenChurnResult {
    return calculateRateDrivenChurn(rateIncrease, baseRetention, this.config);
  }

  /**
   * Decompose revenue growth
   * Source: Python lines 100-167
   */
  decomposeRevenueGrowth(
    policiesYear1: number,
    policiesYear2: number,
    premiumYear1: number,
    premiumYear2: number
  ): RevenueDecomposition {
    return decomposeRevenueGrowth(policiesYear1, policiesYear2, premiumYear1, premiumYear2);
  }

  /**
   * Project retention with rate change
   * Source: Python lines 187-248
   */
  projectRetentionWithRateChange(
    baseRetention: number,
    plannedRateIncrease: number | null,
    product: ProductType = 'auto'
  ): RetentionProjection {
    return projectRetentionWithRateChange(baseRetention, plannedRateIncrease, product, this.config);
  }

  /**
   * Calculate LTV with inflation
   * Source: Python lines 268-338
   */
  calculateLtvWithInflation(
    basePremium: number,
    baseRetention: number,
    years: number = 10,
    annualRateIncrease?: number,
    includeBreakdown: boolean = false
  ): LtvWithInflationResult {
    return calculateLtvWithInflation(
      basePremium,
      baseRetention,
      years,
      annualRateIncrease,
      includeBreakdown,
      this.config
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): RateEnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RateEnvironmentConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ============================================
// Exports
// ============================================

export default {
  // Constants
  DEFAULT_CONFIG,
  PRODUCT_RATE_INCREASES,
  COMPETITIVENESS_MULTIPLIERS,
  COMMISSION_RATE,
  MINIMUM_RETENTION_FLOOR,

  // Functions
  calculateRateDrivenChurn,
  decomposeRevenueGrowth,
  projectRetentionWithRateChange,
  calculateLtvWithInflation,

  // Class
  RateEnvironmentModel,
};
