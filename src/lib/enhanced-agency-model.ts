/**
 * Enhanced Agency Model - Phase 1 Integration
 *
 * EXACT PORT from Python bealer-lead-model/src/enhanced_agency_model.py
 * Integrates: Loss Ratios, Rate Environment, Cash Flow, Customer Segmentation
 *
 * This is the comprehensive agency modeling system with all Phase 1 enhancements:
 * 1. Loss ratio & profitability tracking (from loss_ratio_model.py)
 * 2. Rate increase & price elasticity (from rate_environment_model.py)
 * 3. Cash flow timing / commission lag (from cash_flow_model.py)
 * 4. Customer segmentation Elite/Premium/Standard/Low-Value (from customer_segmentation_model.py)
 *
 * Source: bealer-lead-model/src/enhanced_agency_model.py
 * Lines: 1-359
 */

import {
  CUSTOMER_SEGMENTS,
  analyzePortfolio,
  recommendMarketingAllocation,
  type CustomerSegmentName,
  type PortfolioAnalysis,
  type MarketingAllocation,
} from './customer-segmentation';

// ============================================
// Types - Loss Ratio Model
// Source: loss_ratio_model.py, lines 20-30
// ============================================

export type BonusStatus = 'full_bonus' | 'reduced_bonus' | 'warning' | 'ineligible';
export type ProfitabilityStatus = 'profitable' | 'unprofitable' | 'loss';
export type MarketCompetitiveness = 'soft' | 'moderate' | 'hard';
export type RateImpactSeverity = 'mild' | 'moderate' | 'severe';

/**
 * Bonus eligibility result
 * Source: loss_ratio_model.py, lines 67-99
 */
export interface BonusEligibility {
  multiplier: number;
  status: BonusStatus;
  message: string;
  combinedRatio: number;
  thresholdFull: number;
  thresholdWarning: number;
  thresholdCritical: number;
}

/**
 * Product profitability metrics
 * Source: loss_ratio_model.py, lines 101-153
 */
export interface ProductProfitability {
  product: string;
  premiumEarned: number;
  claimsPaid: number;
  lossRatio: number;
  expenseRatio: number;
  combinedRatio: number;
  policyCount: number;
  commissionRevenue: number;
  servicingCost: number;
  agencyProfit: number;
  profitPerPolicy: number;
  underwritingResult: number;
  status: ProfitabilityStatus;
}

/**
 * Portfolio-level profitability metrics
 * Source: loss_ratio_model.py, lines 155-216
 */
export interface PortfolioMetrics {
  totalPremiumEarned: number;
  totalClaimsPaid: number;
  totalPolicies: number;
  totalCommissionRevenue: number;
  totalServicingCost: number;
  portfolioLossRatio: number;
  portfolioCombinedRatio: number;
  portfolioAgencyProfit: number;
  profitPerPolicy: number;
  bonusEligibility: BonusEligibility;
  productBreakdown: ProductProfitability[];
  profitabilityStatus: ProfitabilityStatus;
}

/**
 * Claims projection result
 * Source: loss_ratio_model.py, lines 218-267
 */
export interface ClaimsProjection {
  projectedPremium: number;
  expectedLossRatio: number;
  expectedClaims: number;
  combinedRatio: number;
  commissionRevenue: number;
  underwritingResult: number;
  profitable: boolean;
}

// ============================================
// Types - Rate Environment Model
// Source: rate_environment_model.py, lines 14-39
// ============================================

/**
 * Rate-driven churn analysis result
 * Source: rate_environment_model.py, lines 44-98
 */
export interface RateDrivenChurnResult {
  rateIncreasePct: number;
  baseRetention: number;
  additionalChurn: number;
  adjustedRetention: number;
  retentionDeclinePct: number;
  severity: RateImpactSeverity;
  customerReaction: string;
  elasticityUsed: number;
  marketEnvironment: MarketCompetitiveness;
}

/**
 * Revenue growth decomposition
 * Source: rate_environment_model.py, lines 100-167
 */
export interface RevenueGrowthDecomposition {
  year1: {
    policies: number;
    avgPremium: number;
    totalRevenue: number;
  };
  year2: {
    policies: number;
    avgPremium: number;
    totalRevenue: number;
  };
  growthRates: {
    totalRevenueGrowth: number;
    policyCountGrowth: number;
    premiumRateGrowth: number;
  };
  contribution: {
    organicContributionPct: number;
    rateContributionPct: number;
    organicPercentageOfGrowth: number;
    ratePercentageOfGrowth: number;
  };
  interpretation: string;
}

/**
 * Retention projection with scenarios
 * Source: rate_environment_model.py, lines 187-248
 */
export interface RetentionProjection {
  product: string;
  baseRetention: number;
  plannedRateIncrease: number;
  projectedRetention: number;
  policiesLostPer1000: number;
  severity: RateImpactSeverity;
  scenarios: Record<string, {
    rateIncrease: number;
    retention: number;
    policiesRetainedPer1000: number;
  }>;
  recommendation: string;
}

/**
 * LTV with inflation calculation
 * Source: rate_environment_model.py, lines 268-338
 */
export interface LtvWithInflation {
  basePremium: number;
  annualRateIncrease: number;
  yearsProjected: number;
  ltvWithoutInflation: number;
  ltvWithInflation: number;
  inflationLift: number;
  ltvMultiplier: number;
  interpretation: string;
}

// ============================================
// Types - Cash Flow Model
// Source: cash_flow_model.py, lines 14-38
// ============================================

/**
 * Monthly cash flow calculation result
 * Source: cash_flow_model.py, lines 40-110
 */
export interface MonthlyCashFlowResult {
  cashFlow: {
    cashInCommissions: number;
    cashOutChargebacks: number;
    cashOutExpenses: number;
    totalCashIn: number;
    totalCashOut: number;
    netCashFlow: number;
  };
  accrualAccounting: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  comparison: {
    cashVsAccrualGap: number;
    cashFlowWarning: boolean;
    warningMessage: string | null;
  };
}

/**
 * Working capital requirement analysis
 * Source: cash_flow_model.py, lines 112-156
 */
export interface WorkingCapitalRequirement {
  monthlyExpenses: number;
  monthlyGrowthRate: number;
  baseBuffer: number;
  growthBuffer: number;
  lagBuffer: number;
  totalWorkingCapitalNeed: number;
  monthsOfRunway: number;
  monthlyCashBurnDuringGrowth: number;
  recommendation: string;
}

/**
 * Monthly projection row
 * Source: cash_flow_model.py, lines 178-242
 */
export interface MonthlyProjection {
  month: number;
  premiumWrittenAccrual: number;
  commissionRevenueAccrual: number;
  expenses: number;
  accrualProfit: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  cumulativeCash: number;
  cashVsAccrualGap: number;
}

/**
 * Stress test scenario result
 * Source: cash_flow_model.py, lines 244-291
 */
export interface StressTestResult {
  growthRate: number;
  minCashBalance: number;
  maxCashBalance: number;
  monthsCashNegative: number;
  totalCashBurn: number;
  workingCapitalNeeded: number;
  sustainable: boolean;
  projection: MonthlyProjection[];
}

// ============================================
// Types - Enhanced Agency Model
// Source: enhanced_agency_model.py, lines 19-36
// ============================================

/**
 * Product mix input for portfolio analysis
 * Source: enhanced_agency_model.py, line 48
 */
export interface ProductMix {
  [product: string]: {
    premium: number;
    claims: number;
    policies: number;
  };
}

/**
 * Customer input for segmentation
 * Source: enhanced_agency_model.py, line 49
 */
export interface CustomerInput {
  customerId?: string;
  productCount: number;
  annualPremium: number;
}

/**
 * Monthly simulation result
 * Source: enhanced_agency_model.py, lines 102-133
 */
export interface MonthlySimulationResult {
  profitability: {
    combinedRatio: number;
    lossRatio: number;
    bonusStatus: BonusStatus;
    bonusMultiplier: number;
    agencyProfit: number;
    profitable: boolean;
  };
  retention: {
    baseRetention: number;
    adjustedRetention: number;
    rateIncrease: number;
    rateImpact: RateDrivenChurnResult | null;
  };
  cashFlow: {
    netCashFlow: number;
    accrualProfit: number;
    cashBurnWarning: boolean;
    workingCapitalNeeded: number;
  };
  customerQuality: {
    totalCustomers: number;
    avgLtv: number;
    elitePercentage: number;
    premiumPercentage: number;
    topTierLtvContribution: number;
  };
}

/**
 * Comprehensive agency health report
 * Source: enhanced_agency_model.py, lines 135-191
 */
export interface AgencyHealthReport {
  executiveSummary: {
    totalCustomers: number;
    totalPortfolioLtv: number;
    avgCustomerLtv: number;
    eliteTierPercentage: number;
    topTierValueConcentration: number;
  };
  profitabilityHealth: {
    combinedRatio: number;
    bonusEligible: boolean;
    agencyProfitMargin: number;
  };
  customerSegmentation: PortfolioAnalysis;
  marketingRecommendations: MarketingAllocation;
  ltvProjectionWithInflation: LtvWithInflation;
  keyInsights: string[];
}

// ============================================
// Constants - Loss Ratio Model
// Source: loss_ratio_model.py, lines 31-48
// ============================================

/**
 * Industry benchmark loss ratios by product
 */
export const LOSS_RATIO_BENCHMARKS = {
  auto: 0.68, // 68% industry avg
  home: 0.62, // 62% industry avg
  umbrella: 0.35, // Very profitable
  life: 0.0, // Commission-only, no underwriting
} as const;

/**
 * Default expense ratio (agency operating costs as % of premium)
 */
export const DEFAULT_EXPENSE_RATIO = 0.25; // 25% typical for agencies

/**
 * Bonus eligibility thresholds (Allstate-specific)
 * Source: loss_ratio_model.py, lines 42-44
 */
export const BONUS_THRESHOLDS = {
  bonusEligible: 0.95, // <95% = full bonus
  warning: 1.0, // 95-100% = reduced bonus
  critical: 1.05, // >105% = no bonus
} as const;

/**
 * CAT (Catastrophe) loading for Santa Barbara
 * Source: loss_ratio_model.py, line 47
 */
export const WILDFIRE_CAT_LOAD = 0.05; // Additional 5% expected loss from wildfires

/**
 * Average servicing cost per policy per product
 * Source: loss_ratio_model.py, line 132
 */
export const SERVICING_COSTS_PER_POLICY: Record<string, number> = {
  auto: 45,
  home: 65,
  umbrella: 25,
  life: 40,
  default: 50,
};

// ============================================
// Constants - Rate Environment Model
// Source: rate_environment_model.py, lines 24-37
// ============================================

/**
 * Rate trend assumptions by product
 */
export const RATE_INCREASES = {
  baseline: 0.08, // 8% baseline
  auto: 0.1, // Auto seeing 10% increases
  home: 0.12, // Home seeing 12% (CAT-driven)
  umbrella: 0.05, // Umbrella more stable
  life: 0.03, // Life very stable
} as const;

/**
 * Price elasticity coefficients
 * Elasticity = % change in retention / % change in price
 * -0.30 = 10% price increase causes 3% additional churn
 */
export const ELASTICITY_COEFFICIENTS = {
  retention: -0.3,
  quote: -0.45, // Quotes decline faster than retention
} as const;

/**
 * Rate shock thresholds
 */
export const RATE_SHOCK_THRESHOLDS = {
  moderate: 0.1, // 10%+ = noticeable
  severe: 0.15, // 15%+ = severe sticker shock
} as const;

/**
 * Market competitiveness multipliers
 * Source: rate_environment_model.py, lines 62-66
 */
export const COMPETITIVENESS_MULTIPLIERS: Record<MarketCompetitiveness, number> = {
  soft: 0.7, // Less competition = less rate shopping
  moderate: 1.0, // Normal
  hard: 1.3, // More competition = more rate sensitivity
};

// ============================================
// Constants - Cash Flow Model
// Source: cash_flow_model.py, lines 26-38
// ============================================

/**
 * Commission payment timing (Allstate-specific)
 */
export const DEFAULT_COMMISSION_LAG_DAYS = 48; // Typical 45-60 days

/**
 * Chargeback provisions
 */
export const CHARGEBACK_CONFIG = {
  rateFirst60Days: 0.08, // 8% of new policies cancel early
  recoveryRate: 0.95, // Carrier recoups 95% of commission paid
};

/**
 * Working capital requirements
 */
export const WORKING_CAPITAL_CONFIG = {
  minCashBufferMonths: 2.0, // Minimum 2 months operating expenses
  growthBufferMonthsPer10PctGrowth: 1.0, // Add 1 month per 10% monthly growth
};

/**
 * Average commission rate
 */
export const AVG_COMMISSION_RATE = 0.07; // 7% blended

// ============================================
// Loss Ratio Model Functions
// Source: loss_ratio_model.py, lines 52-267
// ============================================

/**
 * Calculate Combined Ratio
 * Combined Ratio = Loss Ratio + Expense Ratio
 * < 100% = Underwriting profit
 * > 100% = Underwriting loss
 *
 * Source: loss_ratio_model.py, lines 52-65
 */
export function calculateCombinedRatio(
  lossRatio: number,
  expenseRatio: number = DEFAULT_EXPENSE_RATIO
): number {
  return lossRatio + expenseRatio;
}

/**
 * Calculate bonus eligibility based on combined ratio
 *
 * Source: loss_ratio_model.py, lines 67-99
 */
export function getBonusMultiplier(combinedRatio: number): BonusEligibility {
  let multiplier: number;
  let status: BonusStatus;
  let message: string;

  if (combinedRatio <= BONUS_THRESHOLDS.bonusEligible) {
    multiplier = 1.0;
    status = 'full_bonus';
    message = 'Full bonus eligible - excellent underwriting';
  } else if (combinedRatio <= BONUS_THRESHOLDS.warning) {
    multiplier = 0.75;
    status = 'reduced_bonus';
    message = 'Reduced bonus (75%) - underwriting needs improvement';
  } else if (combinedRatio <= BONUS_THRESHOLDS.critical) {
    multiplier = 0.5;
    status = 'warning';
    message = 'Minimal bonus (50%) - critical underwriting issues';
  } else {
    multiplier = 0.0;
    status = 'ineligible';
    message = 'No bonus - unprofitable book of business';
  }

  return {
    multiplier,
    status,
    message,
    combinedRatio,
    thresholdFull: BONUS_THRESHOLDS.bonusEligible,
    thresholdWarning: BONUS_THRESHOLDS.warning,
    thresholdCritical: BONUS_THRESHOLDS.critical,
  };
}

/**
 * Calculate profitability metrics for a specific product line
 *
 * Source: loss_ratio_model.py, lines 101-153
 *
 * @param product - Product type (auto, home, umbrella, etc.)
 * @param premiumEarned - Total premium earned for period
 * @param claimsPaid - Total claims paid for period
 * @param policyCount - Number of policies
 */
export function calculateProductProfitability(
  product: string,
  premiumEarned: number,
  claimsPaid: number,
  policyCount: number
): ProductProfitability {
  // Loss ratio
  const lossRatio = premiumEarned > 0 ? claimsPaid / premiumEarned : 0;

  // Combined ratio
  const combinedRatio = calculateCombinedRatio(lossRatio);

  // Commission revenue (assuming 7% avg)
  const commissionRate = 0.07;
  const commissionRevenue = premiumEarned * commissionRate;

  // Underwriting profit/loss (carrier perspective)
  const underwritingResult =
    premiumEarned - claimsPaid - premiumEarned * DEFAULT_EXPENSE_RATIO;

  // Agency profit (commission minus servicing costs)
  const avgServicingCostPerPolicy =
    SERVICING_COSTS_PER_POLICY[product] || SERVICING_COSTS_PER_POLICY.default;
  const totalServicingCost = policyCount * avgServicingCostPerPolicy;
  const agencyProfit = commissionRevenue - totalServicingCost;

  // Profitability per policy
  const profitPerPolicy = policyCount > 0 ? agencyProfit / policyCount : 0;

  return {
    product,
    premiumEarned,
    claimsPaid,
    lossRatio,
    expenseRatio: DEFAULT_EXPENSE_RATIO,
    combinedRatio,
    policyCount,
    commissionRevenue,
    servicingCost: totalServicingCost,
    agencyProfit,
    profitPerPolicy,
    underwritingResult,
    status: combinedRatio < 1.0 ? 'profitable' : 'loss',
  };
}

/**
 * Calculate blended portfolio-level metrics
 *
 * Source: loss_ratio_model.py, lines 155-216
 *
 * @param productMix - Dictionary of products with their metrics
 */
export function calculatePortfolioMetrics(productMix: ProductMix): PortfolioMetrics {
  let totalPremium = 0;
  let totalClaims = 0;
  let totalPolicies = 0;
  let totalCommission = 0;
  let totalServicingCost = 0;

  const productResults: ProductProfitability[] = [];

  for (const [product, metrics] of Object.entries(productMix)) {
    const premium = metrics.premium || 0;
    const claims = metrics.claims || 0;
    const policies = metrics.policies || 0;

    const result = calculateProductProfitability(product, premium, claims, policies);
    productResults.push(result);

    totalPremium += premium;
    totalClaims += claims;
    totalPolicies += policies;
    totalCommission += result.commissionRevenue;
    totalServicingCost += result.servicingCost;
  }

  // Portfolio-level metrics
  const portfolioLossRatio = totalPremium > 0 ? totalClaims / totalPremium : 0;
  const portfolioCombinedRatio = calculateCombinedRatio(portfolioLossRatio);
  const portfolioAgencyProfit = totalCommission - totalServicingCost;

  // Bonus eligibility
  const bonusInfo = getBonusMultiplier(portfolioCombinedRatio);

  return {
    totalPremiumEarned: totalPremium,
    totalClaimsPaid: totalClaims,
    totalPolicies,
    totalCommissionRevenue: totalCommission,
    totalServicingCost,
    portfolioLossRatio,
    portfolioCombinedRatio,
    portfolioAgencyProfit,
    profitPerPolicy: totalPolicies > 0 ? portfolioAgencyProfit / totalPolicies : 0,
    bonusEligibility: bonusInfo,
    productBreakdown: productResults,
    profitabilityStatus: portfolioCombinedRatio < 1.0 ? 'profitable' : 'unprofitable',
  };
}

/**
 * Project expected claims cost for planning/budgeting
 *
 * Source: loss_ratio_model.py, lines 218-267
 *
 * @param projectedPremium - Expected premium volume
 * @param product - Product line
 * @param useActualLossRatio - Use actual vs benchmark loss ratio
 * @param actualLossRatios - Optional map of actual loss ratios by product
 */
export function projectClaimsCost(
  projectedPremium: number,
  product: string,
  useActualLossRatio: boolean = true,
  actualLossRatios?: Record<string, number>
): ClaimsProjection {
  // Determine loss ratio to use
  let lossRatio: number;
  if (useActualLossRatio && actualLossRatios && product in actualLossRatios) {
    lossRatio = actualLossRatios[product];
  } else {
    lossRatio =
      (LOSS_RATIO_BENCHMARKS as Record<string, number>)[product] || 0.65;
  }

  // Add CAT loading for home in Santa Barbara
  if (product === 'home') {
    lossRatio += WILDFIRE_CAT_LOAD;
  }

  // Project claims
  const expectedClaims = projectedPremium * lossRatio;
  const combinedRatio = calculateCombinedRatio(lossRatio);

  // Commission revenue
  const commissionRevenue = projectedPremium * 0.07;

  // Expected profit/loss
  const underwritingResult = projectedPremium * (1 - combinedRatio);

  return {
    projectedPremium,
    expectedLossRatio: lossRatio,
    expectedClaims,
    combinedRatio,
    commissionRevenue,
    underwritingResult,
    profitable: combinedRatio < 1.0,
  };
}

// ============================================
// Rate Environment Model Functions
// Source: rate_environment_model.py, lines 44-338
// ============================================

/**
 * Calculate additional churn from rate increases
 *
 * Source: rate_environment_model.py, lines 44-98
 *
 * @param rateIncrease - Percentage rate increase (e.g., 0.10 for 10%)
 * @param baseRetention - Base retention rate without rate increase
 * @param marketCompetitiveness - Market competitiveness level
 * @param retentionElasticity - Retention elasticity coefficient
 */
export function calculateRateDrivenChurn(
  rateIncrease: number,
  baseRetention: number,
  marketCompetitiveness: MarketCompetitiveness = 'hard',
  retentionElasticity: number = ELASTICITY_COEFFICIENTS.retention
): RateDrivenChurnResult {
  // Additional churn from price elasticity
  // Formula: Additional churn = (rate_increase / 0.10) * |elasticity|
  // Example: 10% increase with -0.30 elasticity = 3% additional churn
  let additionalChurn =
    (rateIncrease / 0.1) * Math.abs(retentionElasticity) / 100;

  // Adjust for market competitiveness
  const multiplier = COMPETITIVENESS_MULTIPLIERS[marketCompetitiveness];
  additionalChurn = additionalChurn * multiplier;

  // Calculate adjusted retention
  let adjustedRetention = baseRetention - additionalChurn;

  // Floor retention at realistic minimum (customers have inertia)
  adjustedRetention = Math.max(0.6, adjustedRetention);

  // Categorize rate increase severity
  let severity: RateImpactSeverity;
  let customerReaction: string;
  if (rateIncrease >= RATE_SHOCK_THRESHOLDS.severe) {
    severity = 'severe';
    customerReaction = 'High shopping activity, significant losses expected';
  } else if (rateIncrease >= RATE_SHOCK_THRESHOLDS.moderate) {
    severity = 'moderate';
    customerReaction = 'Moderate shopping, proactive communication needed';
  } else {
    severity = 'mild';
    customerReaction = 'Minimal impact, normal retention expected';
  }

  return {
    rateIncreasePct: rateIncrease * 100,
    baseRetention,
    additionalChurn,
    adjustedRetention,
    retentionDeclinePct: (baseRetention - adjustedRetention) * 100,
    severity,
    customerReaction,
    elasticityUsed: retentionElasticity,
    marketEnvironment: marketCompetitiveness,
  };
}

/**
 * Decompose revenue growth into organic (policy count) vs rate components
 *
 * This is critical for understanding TRUE business growth vs inflation
 *
 * Source: rate_environment_model.py, lines 100-167
 */
export function decomposeRevenueGrowth(
  policiesYear1: number,
  policiesYear2: number,
  premiumYear1: number,
  premiumYear2: number
): RevenueGrowthDecomposition {
  // Revenue calculations
  const revenueY1 = policiesYear1 * premiumYear1;
  const revenueY2 = policiesYear2 * premiumYear2;

  // Growth rates
  const totalRevenueGrowth = revenueY1 > 0 ? revenueY2 / revenueY1 - 1 : 0;
  const policyGrowth = policiesYear1 > 0 ? policiesYear2 / policiesYear1 - 1 : 0;
  const rateGrowth = premiumYear1 > 0 ? premiumYear2 / premiumYear1 - 1 : 0;

  // Contribution analysis
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
 * Generate interpretation of growth decomposition
 *
 * Source: rate_environment_model.py, lines 169-185
 */
function interpretGrowthDecomposition(
  organicPct: number,
  totalGrowth: number
): string {
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
 * Project retention given a planned rate increase
 *
 * Source: rate_environment_model.py, lines 187-248
 */
export function projectRetentionWithRateChange(
  baseRetention: number,
  plannedRateIncrease: number | null,
  product: string = 'auto',
  marketCompetitiveness: MarketCompetitiveness = 'hard'
): RetentionProjection {
  // Get product-specific rate increase if not provided
  const productRates: Record<string, number> = {
    auto: RATE_INCREASES.auto,
    home: RATE_INCREASES.home,
    umbrella: RATE_INCREASES.umbrella,
    life: RATE_INCREASES.life,
  };

  const rateIncrease =
    plannedRateIncrease ?? productRates[product] ?? RATE_INCREASES.baseline;

  // Calculate impact
  const impact = calculateRateDrivenChurn(
    rateIncrease,
    baseRetention,
    marketCompetitiveness
  );

  // Scenario analysis
  const severeImpact = calculateRateDrivenChurn(
    RATE_SHOCK_THRESHOLDS.severe,
    baseRetention,
    marketCompetitiveness
  );

  const scenarios = {
    no_rate_increase: {
      rateIncrease: 0.0,
      retention: baseRetention,
      policiesRetainedPer1000: baseRetention * 1000,
    },
    planned_increase: {
      rateIncrease,
      retention: impact.adjustedRetention,
      policiesRetainedPer1000: impact.adjustedRetention * 1000,
    },
    severe_increase: {
      rateIncrease: RATE_SHOCK_THRESHOLDS.severe,
      retention: severeImpact.adjustedRetention,
      policiesRetainedPer1000: severeImpact.adjustedRetention * 1000,
    },
  };

  return {
    product,
    baseRetention,
    plannedRateIncrease: rateIncrease,
    projectedRetention: impact.adjustedRetention,
    policiesLostPer1000: (baseRetention - impact.adjustedRetention) * 1000,
    severity: impact.severity,
    scenarios,
    recommendation: generateRateRecommendation(impact),
  };
}

/**
 * Generate recommendation based on rate impact
 *
 * Source: rate_environment_model.py, lines 250-266
 */
function generateRateRecommendation(impact: RateDrivenChurnResult): string {
  const { severity, retentionDeclinePct } = impact;

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
 * Calculate LTV accounting for premium inflation over time
 *
 * Traditional LTV assumes static premiums - this is wrong in insurance!
 * Premiums inflate 8-12% annually, increasing LTV significantly.
 *
 * Source: rate_environment_model.py, lines 268-338
 *
 * @param basePremium - Current premium
 * @param baseRetention - Retention rate
 * @param years - Years to project
 * @param annualRateIncrease - Annual premium inflation
 */
export function calculateLtvWithInflation(
  basePremium: number,
  baseRetention: number,
  years: number = 10,
  annualRateIncrease: number = RATE_INCREASES.baseline
): LtvWithInflation {
  // Year-by-year projection
  let ltvWithoutInflation = 0;
  let ltvWithInflation = 0;
  const commissionRate = 0.07; // 7% avg

  let cumulativeRetention = 1.0;
  let currentPremium = basePremium;

  for (let year = 1; year <= years; year++) {
    // Retention compounds
    cumulativeRetention *= baseRetention;

    // Premium inflates
    if (year > 1) {
      currentPremium *= 1 + annualRateIncrease;
    }

    // Commission this year (only if customer retained)
    const commissionWithoutInflation =
      basePremium * commissionRate * cumulativeRetention;
    const commissionWithInflation =
      currentPremium * commissionRate * cumulativeRetention;

    ltvWithoutInflation += commissionWithoutInflation;
    ltvWithInflation += commissionWithInflation;
  }

  // LTV multiplier from inflation
  const ltvMultiplier =
    ltvWithoutInflation > 0 ? ltvWithInflation / ltvWithoutInflation : 1.0;

  return {
    basePremium,
    annualRateIncrease,
    yearsProjected: years,
    ltvWithoutInflation,
    ltvWithInflation,
    inflationLift: ltvWithInflation - ltvWithoutInflation,
    ltvMultiplier,
    interpretation: `Premium inflation adds ${((ltvMultiplier - 1) * 100).toFixed(0)}% to customer lifetime value`,
  };
}

// ============================================
// Cash Flow Model Functions
// Source: cash_flow_model.py, lines 40-291
// ============================================

/**
 * Calculate actual cash in/out vs accrual accounting
 *
 * Source: cash_flow_model.py, lines 40-110
 *
 * @param currentMonthRevenueAccrual - New premium written this month (accrual)
 * @param currentMonthExpenses - Operating expenses this month (cash out)
 * @param priorMonthRevenueAccrual - Premium written 1 month ago
 * @param twoMonthsAgoRevenue - Premium written 2 months ago
 * @param currentMonthCancellationsPremium - Premium cancelled this month
 * @param commissionPaymentLagDays - Days until commission is paid
 */
export function calculateMonthlyCashFlow(
  currentMonthRevenueAccrual: number,
  currentMonthExpenses: number,
  priorMonthRevenueAccrual: number,
  twoMonthsAgoRevenue: number,
  currentMonthCancellationsPremium: number,
  commissionPaymentLagDays: number = DEFAULT_COMMISSION_LAG_DAYS
): MonthlyCashFlowResult {
  // CASH IN: Commission from prior month(s) policies
  // Assuming lag ≈ 1.5 months, use weighted average
  let cashInCommissions: number;
  if (commissionPaymentLagDays <= 30) {
    cashInCommissions = priorMonthRevenueAccrual * AVG_COMMISSION_RATE;
  } else if (commissionPaymentLagDays <= 45) {
    // Weight between 1 and 2 months ago
    cashInCommissions =
      (priorMonthRevenueAccrual * 0.7 + twoMonthsAgoRevenue * 0.3) *
      AVG_COMMISSION_RATE;
  } else {
    // Primarily 2 months ago
    cashInCommissions = twoMonthsAgoRevenue * AVG_COMMISSION_RATE;
  }

  // CASH OUT: Commission chargebacks (early cancellations)
  const cashOutChargebacks =
    currentMonthCancellationsPremium *
    AVG_COMMISSION_RATE *
    CHARGEBACK_CONFIG.recoveryRate;

  // CASH OUT: Operating expenses (paid immediately)
  const cashOutExpenses = currentMonthExpenses;

  // Net cash flow
  const totalCashIn = cashInCommissions;
  const totalCashOut = cashOutChargebacks + cashOutExpenses;
  const netCashFlow = totalCashIn - totalCashOut;

  // Accrual accounting (for comparison)
  const accrualRevenue = currentMonthRevenueAccrual * AVG_COMMISSION_RATE;
  const accrualProfit = accrualRevenue - currentMonthExpenses;

  // Cash vs accrual gap
  const cashAccrualGap = netCashFlow - accrualProfit;

  return {
    cashFlow: {
      cashInCommissions,
      cashOutChargebacks,
      cashOutExpenses,
      totalCashIn,
      totalCashOut,
      netCashFlow,
    },
    accrualAccounting: {
      revenue: accrualRevenue,
      expenses: currentMonthExpenses,
      profit: accrualProfit,
    },
    comparison: {
      cashVsAccrualGap: cashAccrualGap,
      cashFlowWarning: netCashFlow < 0,
      warningMessage:
        netCashFlow < 0 && accrualProfit > 0
          ? 'CASH BURN: Negative cash flow despite positive accrual profit'
          : null,
    },
  };
}

/**
 * Calculate working capital buffer needed to sustain operations and growth
 *
 * Source: cash_flow_model.py, lines 112-156
 *
 * @param monthlyOperatingExpenses - Monthly operating expenses
 * @param monthlyGrowthRate - Expected monthly revenue growth rate
 * @param commissionPaymentLagDays - Days until commission is paid
 */
export function calculateWorkingCapitalNeed(
  monthlyOperatingExpenses: number,
  monthlyGrowthRate: number = 0.05,
  commissionPaymentLagDays: number = DEFAULT_COMMISSION_LAG_DAYS
): WorkingCapitalRequirement {
  // Base buffer: Cover X months of expenses
  const baseBuffer =
    WORKING_CAPITAL_CONFIG.minCashBufferMonths * monthlyOperatingExpenses;

  // Growth buffer: Higher growth = more working capital needed
  // 10% monthly growth = additional 1 month buffer
  const growthBuffer =
    (monthlyGrowthRate / 0.1) *
    WORKING_CAPITAL_CONFIG.growthBufferMonthsPer10PctGrowth *
    monthlyOperatingExpenses;

  // Commission lag buffer: Premium in flight
  const lagMonths = commissionPaymentLagDays / 30;
  const lagBuffer = lagMonths * (monthlyOperatingExpenses * 0.5); // Conservative estimate

  // Total working capital need
  const totalWorkingCapital = baseBuffer + growthBuffer + lagBuffer;

  // Monthly cash reserve burn rate (if growing rapidly)
  const monthlyCashBurnDuringGrowth = Math.max(
    0,
    monthlyOperatingExpenses * (1 + monthlyGrowthRate) -
      monthlyOperatingExpenses * 0.7 // Assume 70% comes in from lag
  );

  return {
    monthlyExpenses: monthlyOperatingExpenses,
    monthlyGrowthRate,
    baseBuffer,
    growthBuffer,
    lagBuffer,
    totalWorkingCapitalNeed: totalWorkingCapital,
    monthsOfRunway:
      monthlyOperatingExpenses > 0
        ? totalWorkingCapital / monthlyOperatingExpenses
        : 0,
    monthlyCashBurnDuringGrowth,
    recommendation: generateWorkingCapitalRecommendation(
      totalWorkingCapital,
      monthlyOperatingExpenses,
      monthlyGrowthRate
    ),
  };
}

/**
 * Generate working capital recommendation
 *
 * Source: cash_flow_model.py, lines 158-176
 */
function generateWorkingCapitalRecommendation(
  totalWc: number,
  monthlyExp: number,
  growthRate: number
): string {
  const monthsRunway = monthlyExp > 0 ? totalWc / monthlyExp : 0;

  if (growthRate > 0.1) {
    return (
      `HIGH GROWTH MODE: Maintain $${totalWc.toLocaleString()} working capital ` +
      `(${monthsRunway.toFixed(1)} months runway). Rapid growth requires significant ` +
      `cash buffer due to commission lag.`
    );
  } else if (growthRate > 0.05) {
    return (
      `MODERATE GROWTH: Maintain $${totalWc.toLocaleString()} working capital ` +
      `(${monthsRunway.toFixed(1)} months runway). Growth is sustainable with proper ` +
      `cash management.`
    );
  } else {
    return (
      `STABLE OPERATIONS: Maintain $${totalWc.toLocaleString()} working capital ` +
      `(${monthsRunway.toFixed(1)} months runway). Current cash buffer is adequate.`
    );
  }
}

/**
 * Project 12-month cash flow with growth
 *
 * Source: cash_flow_model.py, lines 178-242
 *
 * @param startingMonthlyRevenue - Starting monthly premium written
 * @param monthlyGrowthRate - Monthly revenue growth rate
 * @param monthlyExpenses - Starting monthly expenses
 * @param expenseGrowthRate - Monthly expense growth rate
 * @param commissionPaymentLagDays - Days until commission is paid
 */
export function projectCashFlow12Months(
  startingMonthlyRevenue: number,
  monthlyGrowthRate: number,
  monthlyExpenses: number,
  expenseGrowthRate: number = 0.02,
  commissionPaymentLagDays: number = DEFAULT_COMMISSION_LAG_DAYS
): MonthlyProjection[] {
  const months: MonthlyProjection[] = [];

  // Initialize with Month 0 and Month -1 for lag calculations
  const revenueHistory = [
    startingMonthlyRevenue * 0.95,
    startingMonthlyRevenue,
  ];

  let cumulativeCash = 0;

  for (let month = 1; month <= 12; month++) {
    // Revenue (accrual)
    const currentRevenue =
      revenueHistory[revenueHistory.length - 1] * (1 + monthlyGrowthRate);
    const priorMonthRevenue = revenueHistory[revenueHistory.length - 1];
    const twoMonthsAgoRevenue =
      revenueHistory.length >= 2
        ? revenueHistory[revenueHistory.length - 2]
        : revenueHistory[revenueHistory.length - 1];

    // Expenses (grow more slowly)
    const currentExpenses =
      monthlyExpenses * Math.pow(1 + expenseGrowthRate, month);

    // Assume 8% of new premium cancels (chargebacks)
    const cancellations = currentRevenue * CHARGEBACK_CONFIG.rateFirst60Days;

    // Calculate cash flow
    const cashFlowResult = calculateMonthlyCashFlow(
      currentRevenue,
      currentExpenses,
      priorMonthRevenue,
      twoMonthsAgoRevenue,
      cancellations,
      commissionPaymentLagDays
    );

    // Cumulative cash balance
    cumulativeCash += cashFlowResult.cashFlow.netCashFlow;

    months.push({
      month,
      premiumWrittenAccrual: currentRevenue,
      commissionRevenueAccrual: currentRevenue * AVG_COMMISSION_RATE,
      expenses: currentExpenses,
      accrualProfit: cashFlowResult.accrualAccounting.profit,
      cashIn: cashFlowResult.cashFlow.totalCashIn,
      cashOut: cashFlowResult.cashFlow.totalCashOut,
      netCashFlow: cashFlowResult.cashFlow.netCashFlow,
      cumulativeCash,
      cashVsAccrualGap: cashFlowResult.comparison.cashVsAccrualGap,
    });

    revenueHistory.push(currentRevenue);
  }

  return months;
}

/**
 * Stress test cash flow under different growth scenarios
 *
 * Source: cash_flow_model.py, lines 244-291
 *
 * @param monthlyRevenue - Current monthly revenue
 * @param monthlyExpenses - Current monthly expenses
 * @param growthScenarios - List of monthly growth rates to test
 */
export function analyzeCashFlowStressTest(
  monthlyRevenue: number,
  monthlyExpenses: number,
  growthScenarios: number[] = [0.05, 0.1, 0.15]
): Record<string, StressTestResult> {
  const results: Record<string, StressTestResult> = {};

  for (const growthRate of growthScenarios) {
    // Project 12 months
    const projection = projectCashFlow12Months(
      monthlyRevenue,
      growthRate,
      monthlyExpenses
    );

    // Calculate metrics
    const cumulativeCashValues = projection.map((p) => p.cumulativeCash);
    const minCashBalance = Math.min(...cumulativeCashValues);
    const maxCashBalance = Math.max(...cumulativeCashValues);
    const monthsCashNegative = cumulativeCashValues.filter((v) => v < 0).length;
    const totalCashBurn = minCashBalance < 0 ? Math.abs(minCashBalance) : 0;

    // Working capital needed
    const wcNeed = calculateWorkingCapitalNeed(monthlyExpenses, growthRate);

    const scenarioKey = `${(growthRate * 100).toFixed(0)}%_growth`;
    results[scenarioKey] = {
      growthRate,
      minCashBalance,
      maxCashBalance,
      monthsCashNegative,
      totalCashBurn,
      workingCapitalNeeded: wcNeed.totalWorkingCapitalNeed,
      sustainable: minCashBalance > -wcNeed.totalWorkingCapitalNeed,
      projection,
    };
  }

  return results;
}

// ============================================
// Enhanced Agency Model Class
// Source: enhanced_agency_model.py, lines 19-242
// ============================================

/**
 * Comprehensive agency modeling with all Phase 1 enhancements
 *
 * This integrates:
 * 1. Loss ratio & profitability tracking
 * 2. Rate increase & price elasticity
 * 3. Cash flow timing (commission lag)
 * 4. Customer segmentation (Elite/Premium/Standard/Low-Value)
 *
 * Source: enhanced_agency_model.py, lines 19-36
 */
export class EnhancedAgencyModel {
  // Current state - Source: enhanced_agency_model.py, lines 37-40
  currentMonthlyPremium: number;
  currentMonthlyExpenses: number;
  currentCustomerCount: number;

  // Model configuration
  marketCompetitiveness: MarketCompetitiveness;

  constructor(
    currentMonthlyPremium: number = 500000, // $500k/month premium written
    currentMonthlyExpenses: number = 42000, // $42k/month expenses
    currentCustomerCount: number = 500,
    marketCompetitiveness: MarketCompetitiveness = 'hard'
  ) {
    this.currentMonthlyPremium = currentMonthlyPremium;
    this.currentMonthlyExpenses = currentMonthlyExpenses;
    this.currentCustomerCount = currentCustomerCount;
    this.marketCompetitiveness = marketCompetitiveness;
  }

  /**
   * Simulate one month with all enhancements
   *
   * Source: enhanced_agency_model.py, lines 42-133
   *
   * @param newPremiumWritten - New premium written this month (accrual)
   * @param priorMonthPremium - Premium written 1 month ago
   * @param twoMonthsAgoPremium - Premium written 2 months ago
   * @param currentMonthExpenses - Operating expenses
   * @param cancellationsPremium - Premium that cancelled
   * @param productMix - Product breakdown
   * @param newCustomers - List of new customers acquired
   * @param rateIncreaseThisMonth - Rate increase % this month
   */
  simulateMonthEnhanced(
    newPremiumWritten: number,
    priorMonthPremium: number,
    twoMonthsAgoPremium: number,
    currentMonthExpenses: number,
    cancellationsPremium: number,
    productMix: ProductMix,
    newCustomers: CustomerInput[],
    rateIncreaseThisMonth: number = 0.0
  ): MonthlySimulationResult {
    // 1. LOSS RATIO ANALYSIS
    const portfolioProfitability = calculatePortfolioMetrics(productMix);

    // 2. RATE ENVIRONMENT IMPACT
    // If there was a rate increase, calculate retention impact
    let adjustedRetention: number;
    let rateImpact: RateDrivenChurnResult | null;
    if (rateIncreaseThisMonth > 0) {
      const baseRetention = 0.85; // Assume 85% base
      rateImpact = calculateRateDrivenChurn(
        rateIncreaseThisMonth,
        baseRetention,
        this.marketCompetitiveness
      );
      adjustedRetention = rateImpact.adjustedRetention;
    } else {
      adjustedRetention = 0.85;
      rateImpact = null;
    }

    // 3. CASH FLOW ANALYSIS
    const cashFlowResult = calculateMonthlyCashFlow(
      newPremiumWritten,
      currentMonthExpenses,
      priorMonthPremium,
      twoMonthsAgoPremium,
      cancellationsPremium
    );

    // 4. CUSTOMER SEGMENTATION
    const segmentationResult = analyzePortfolio(newCustomers);

    // 5. WORKING CAPITAL REQUIREMENT
    const monthlyGrowth =
      priorMonthPremium > 0
        ? newPremiumWritten / priorMonthPremium - 1
        : 0;
    const wcRequirement = calculateWorkingCapitalNeed(
      currentMonthExpenses,
      monthlyGrowth
    );

    // COMBINED RESULTS
    return {
      profitability: {
        combinedRatio: portfolioProfitability.portfolioCombinedRatio,
        lossRatio: portfolioProfitability.portfolioLossRatio,
        bonusStatus: portfolioProfitability.bonusEligibility.status,
        bonusMultiplier: portfolioProfitability.bonusEligibility.multiplier,
        agencyProfit: portfolioProfitability.portfolioAgencyProfit,
        profitable: portfolioProfitability.profitabilityStatus === 'profitable',
      },
      retention: {
        baseRetention: 0.85,
        adjustedRetention,
        rateIncrease: rateIncreaseThisMonth,
        rateImpact,
      },
      cashFlow: {
        netCashFlow: cashFlowResult.cashFlow.netCashFlow,
        accrualProfit: cashFlowResult.accrualAccounting.profit,
        cashBurnWarning: cashFlowResult.comparison.cashFlowWarning,
        workingCapitalNeeded: wcRequirement.totalWorkingCapitalNeed,
      },
      customerQuality: {
        totalCustomers: segmentationResult.totalCustomers,
        avgLtv: segmentationResult.avgLtv,
        elitePercentage: segmentationResult.segments.elite.percentageOfBook,
        premiumPercentage: segmentationResult.segments.premium.percentageOfBook,
        topTierLtvContribution:
          segmentationResult.segments.elite.ltvContributionPct +
          segmentationResult.segments.premium.ltvContributionPct,
      },
    };
  }

  /**
   * Generate comprehensive agency health report
   *
   * Source: enhanced_agency_model.py, lines 135-191
   *
   * @param historicalMonths - List of monthly data
   * @param currentCustomerPortfolio - Current customer base
   */
  generateComprehensiveReport(
    historicalMonths: Array<{ combined_ratio?: number; profit_margin?: number }>,
    currentCustomerPortfolio: CustomerInput[]
  ): AgencyHealthReport {
    // Calculate current state
    const latestMonth =
      historicalMonths.length > 0
        ? historicalMonths[historicalMonths.length - 1]
        : {};

    // Segmentation analysis
    const portfolioAnalysis = analyzePortfolio(currentCustomerPortfolio);

    // Marketing allocation recommendation
    const marketingAllocation = recommendMarketingAllocation(50000); // Example $50k

    // LTV with inflation
    const ltvInflation = calculateLtvWithInflation(
      1500, // base_premium
      0.85, // base_retention
      10, // years
      0.08 // annual_rate_increase
    );

    return {
      executiveSummary: {
        totalCustomers: portfolioAnalysis.totalCustomers,
        totalPortfolioLtv: portfolioAnalysis.totalLtv,
        avgCustomerLtv: portfolioAnalysis.avgLtv,
        eliteTierPercentage: portfolioAnalysis.segments.elite.percentageOfBook,
        topTierValueConcentration:
          portfolioAnalysis.segments.elite.ltvContributionPct +
          portfolioAnalysis.segments.premium.ltvContributionPct,
      },
      profitabilityHealth: {
        combinedRatio: latestMonth.combined_ratio ?? 0.9,
        bonusEligible: (latestMonth.combined_ratio ?? 0.9) < 0.95,
        agencyProfitMargin: latestMonth.profit_margin ?? 0.2,
      },
      customerSegmentation: portfolioAnalysis,
      marketingRecommendations: marketingAllocation,
      ltvProjectionWithInflation: ltvInflation,
      keyInsights: this.generateKeyInsights(portfolioAnalysis, latestMonth),
    };
  }

  /**
   * Generate strategic insights
   *
   * Source: enhanced_agency_model.py, lines 193-242
   */
  private generateKeyInsights(
    portfolioAnalysis: PortfolioAnalysis,
    latestMonth: { combined_ratio?: number; profit_margin?: number }
  ): string[] {
    const insights: string[] = [];

    // Customer concentration
    const topTierPct =
      portfolioAnalysis.segments.elite.percentageOfBook +
      portfolioAnalysis.segments.premium.percentageOfBook;

    const topTierValue =
      portfolioAnalysis.segments.elite.ltvContributionPct +
      portfolioAnalysis.segments.premium.ltvContributionPct;

    insights.push(
      `Top ${topTierPct.toFixed(0)}% of customers (Elite + Premium) drive ` +
        `${topTierValue.toFixed(0)}% of lifetime value`
    );

    // Low-value warning
    const lowValuePct = portfolioAnalysis.segments.low_value.percentageOfBook;
    if (lowValuePct > 15) {
      insights.push(
        `${lowValuePct.toFixed(0)}% of book is low-value customers - ` +
          `review lead sources and acquisition strategy`
      );
    }

    // Combined ratio health
    const combinedRatio = latestMonth.combined_ratio ?? 0.9;
    if (combinedRatio < 0.9) {
      insights.push(
        `Excellent underwriting with ${(combinedRatio * 100).toFixed(0)}% combined ratio`
      );
    } else if (combinedRatio < 0.95) {
      insights.push(
        `Good underwriting with ${(combinedRatio * 100).toFixed(0)}% combined ratio (bonus eligible)`
      );
    } else if (combinedRatio < 1.0) {
      insights.push(
        `Marginal underwriting at ${(combinedRatio * 100).toFixed(0)}% - bonus at risk`
      );
    } else {
      insights.push(
        `CRITICAL: Unprofitable underwriting at ${(combinedRatio * 100).toFixed(0)}%`
      );
    }

    // Upgrade opportunity
    const standardCount = portfolioAnalysis.segments.standard.count;
    if (standardCount > 0) {
      const standardToPremiumValue = standardCount * 4500; // Avg value difference
      insights.push(
        `Cross-sell opportunity: ${standardCount} Standard customers ` +
          `= $${standardToPremiumValue.toLocaleString()} potential LTV lift`
      );
    }

    return insights;
  }
}

// ============================================
// Exports
// ============================================

export default {
  // Constants
  LOSS_RATIO_BENCHMARKS,
  DEFAULT_EXPENSE_RATIO,
  BONUS_THRESHOLDS,
  WILDFIRE_CAT_LOAD,
  SERVICING_COSTS_PER_POLICY,
  RATE_INCREASES,
  ELASTICITY_COEFFICIENTS,
  RATE_SHOCK_THRESHOLDS,
  COMPETITIVENESS_MULTIPLIERS,
  DEFAULT_COMMISSION_LAG_DAYS,
  CHARGEBACK_CONFIG,
  WORKING_CAPITAL_CONFIG,
  AVG_COMMISSION_RATE,

  // Loss Ratio Functions
  calculateCombinedRatio,
  getBonusMultiplier,
  calculateProductProfitability,
  calculatePortfolioMetrics,
  projectClaimsCost,

  // Rate Environment Functions
  calculateRateDrivenChurn,
  decomposeRevenueGrowth,
  projectRetentionWithRateChange,
  calculateLtvWithInflation,

  // Cash Flow Functions
  calculateMonthlyCashFlow,
  calculateWorkingCapitalNeed,
  projectCashFlow12Months,
  analyzeCashFlowStressTest,

  // Enhanced Model Class
  EnhancedAgencyModel,
};
