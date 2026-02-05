/**
 * Loss Ratio & Profitability Model
 *
 * EXACT PORT from Python bealer-lead-model/src/loss_ratio_model.py
 *
 * Key Insurance Economics:
 * - Loss Ratio = Claims Paid / Premium Earned
 * - Expense Ratio = Operating Expenses / Premium Earned
 * - Combined Ratio = Loss Ratio + Expense Ratio
 * - Target: <95% for bonus eligibility, <100% for profitability
 *
 * Integrates claims data to calculate true profitability for insurance agencies.
 */

// ============================================
// Types (from Python loss_ratio_model.py lines 10-11)
// ============================================

/**
 * Product types supported by the model
 * Source: loss_ratio_model.py lines 33-36, 132
 */
export type ProductType = 'auto' | 'home' | 'umbrella' | 'life';

/**
 * Bonus eligibility status
 * Source: loss_ratio_model.py lines 74-89
 */
export type BonusStatus = 'full_bonus' | 'reduced_bonus' | 'warning' | 'ineligible';

/**
 * Profitability status
 * Source: loss_ratio_model.py lines 152, 215
 */
export type ProfitabilityStatus = 'profitable' | 'loss' | 'unprofitable';

/**
 * Bonus multiplier result
 * Source: loss_ratio_model.py lines 67-99, return dict on lines 91-99
 */
export interface BonusMultiplierResult {
  multiplier: number;
  status: BonusStatus;
  message: string;
  combinedRatio: number;
  thresholdFull: number;
  thresholdWarning: number;
  thresholdCritical: number;
}

/**
 * Product profitability calculation result
 * Source: loss_ratio_model.py lines 101-153, return dict on lines 139-153
 */
export interface ProductProfitabilityResult {
  product: ProductType;
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
 * Portfolio metrics calculation result
 * Source: loss_ratio_model.py lines 155-216, return dict on lines 203-216
 */
export interface PortfolioMetricsResult {
  totalPremiumEarned: number;
  totalClaimsPaid: number;
  totalPolicies: number;
  totalCommissionRevenue: number;
  totalServicingCost: number;
  portfolioLossRatio: number;
  portfolioCombinedRatio: number;
  portfolioAgencyProfit: number;
  profitPerPolicy: number;
  bonusEligibility: BonusMultiplierResult;
  productBreakdown: ProductProfitabilityResult[];
  profitabilityStatus: ProfitabilityStatus;
}

/**
 * Claims projection result
 * Source: loss_ratio_model.py lines 218-267, return dict on lines 259-267
 */
export interface ClaimsProjectionResult {
  projectedPremium: number;
  expectedLossRatio: number;
  expectedClaims: number;
  combinedRatio: number;
  commissionRevenue: number;
  underwritingResult: number;
  profitable: boolean;
}

/**
 * Product mix input for portfolio metrics
 * Source: loss_ratio_model.py lines 162-166
 */
export interface ProductMixInput {
  premium: number;
  claims: number;
  policies: number;
}

// ============================================
// Constants (from Python loss_ratio_model.py lines 33-48)
// ============================================

/**
 * Industry benchmark loss ratios by product
 * Source: loss_ratio_model.py lines 33-36
 */
export const LOSS_RATIO_BENCHMARKS: Record<ProductType, number> = {
  auto: 0.68,      // 68% industry avg (line 33)
  home: 0.62,      // 62% industry avg (line 34)
  umbrella: 0.35,  // Very profitable (line 35)
  life: 0.0,       // Commission-only, no underwriting (line 36)
};

/**
 * Default expense ratio (agency operating costs as % of premium)
 * Source: loss_ratio_model.py line 39
 */
export const DEFAULT_EXPENSE_RATIO = 0.25; // 25% typical for agencies

/**
 * Bonus eligibility thresholds (Allstate-specific)
 * Source: loss_ratio_model.py lines 42-44
 */
export const BONUS_THRESHOLDS = {
  eligible: 0.95,    // <95% = full bonus (line 42)
  warning: 1.00,     // 95-100% = reduced bonus (line 43)
  critical: 1.05,    // >105% = no bonus (line 44)
};

/**
 * CAT (Catastrophe) loading for Santa Barbara
 * Source: loss_ratio_model.py line 47
 */
export const WILDFIRE_CAT_LOAD = 0.05; // Additional 5% expected loss from wildfires

/**
 * Default commission rate
 * Source: loss_ratio_model.py lines 125, 254
 */
export const DEFAULT_COMMISSION_RATE = 0.07; // 7% average

/**
 * Average servicing cost per policy by product type
 * Source: loss_ratio_model.py line 132
 */
export const SERVICING_COST_PER_POLICY: Record<ProductType, number> = {
  auto: 45,
  home: 65,
  umbrella: 25,
  life: 40,
};

// ============================================
// Model Configuration (from Python @dataclass lines 21-50)
// ============================================

/**
 * Loss Ratio Model configuration
 * Source: loss_ratio_model.py lines 21-50
 */
export interface LossRatioModelConfig {
  /** Industry benchmark loss ratios by product (lines 33-36) */
  autoLossRatioBenchmark: number;
  homeLossRatioBenchmark: number;
  umbrellaLossRatioBenchmark: number;
  lifeLossRatioBenchmark: number;

  /** Expense ratio (line 39) */
  expenseRatio: number;

  /** Bonus eligibility thresholds (lines 42-44) */
  bonusEligibleCombinedRatio: number;
  warningCombinedRatio: number;
  criticalCombinedRatio: number;

  /** CAT loading for Santa Barbara (line 47) */
  wildfireCatLoad: number;

  /** Actual loss ratios from data (line 50) */
  actualLossRatios: Partial<Record<ProductType, number>>;
}

/**
 * Default model configuration
 * Source: loss_ratio_model.py lines 33-50
 */
export const DEFAULT_MODEL_CONFIG: LossRatioModelConfig = {
  autoLossRatioBenchmark: 0.68,
  homeLossRatioBenchmark: 0.62,
  umbrellaLossRatioBenchmark: 0.35,
  lifeLossRatioBenchmark: 0.0,
  expenseRatio: 0.25,
  bonusEligibleCombinedRatio: 0.95,
  warningCombinedRatio: 1.00,
  criticalCombinedRatio: 1.05,
  wildfireCatLoad: 0.05,
  actualLossRatios: {},
};

// ============================================
// Core Calculation Functions
// ============================================

/**
 * Calculate Combined Ratio
 * Combined Ratio = Loss Ratio + Expense Ratio
 *
 * < 100% = Underwriting profit
 * > 100% = Underwriting loss
 *
 * EXACT PORT from Python LossRatioModel.calculate_combined_ratio()
 * Source: loss_ratio_model.py lines 52-65
 *
 * @param lossRatio - The loss ratio (claims paid / premium earned)
 * @param expenseRatio - Optional expense ratio (defaults to 0.25)
 * @returns Combined ratio
 */
export function calculateCombinedRatio(
  lossRatio: number,
  expenseRatio: number = DEFAULT_EXPENSE_RATIO
): number {
  // Source: loss_ratio_model.py line 65
  return lossRatio + expenseRatio;
}

/**
 * Calculate bonus eligibility based on combined ratio
 *
 * EXACT PORT from Python LossRatioModel.get_bonus_multiplier()
 * Source: loss_ratio_model.py lines 67-99
 *
 * @param combinedRatio - The combined ratio
 * @param config - Optional model configuration
 * @returns Bonus multiplier result with status and message
 */
export function getBonusMultiplier(
  combinedRatio: number,
  config: LossRatioModelConfig = DEFAULT_MODEL_CONFIG
): BonusMultiplierResult {
  let multiplier: number;
  let status: BonusStatus;
  let message: string;

  // Source: loss_ratio_model.py lines 74-89
  if (combinedRatio <= config.bonusEligibleCombinedRatio) {
    // Line 74-77
    multiplier = 1.0;
    status = 'full_bonus';
    message = 'Full bonus eligible - excellent underwriting';
  } else if (combinedRatio <= config.warningCombinedRatio) {
    // Line 78-81
    multiplier = 0.75;
    status = 'reduced_bonus';
    message = 'Reduced bonus (75%) - underwriting needs improvement';
  } else if (combinedRatio <= config.criticalCombinedRatio) {
    // Line 82-85
    multiplier = 0.50;
    status = 'warning';
    message = 'Minimal bonus (50%) - critical underwriting issues';
  } else {
    // Line 86-89
    multiplier = 0.0;
    status = 'ineligible';
    message = 'No bonus - unprofitable book of business';
  }

  // Source: loss_ratio_model.py lines 91-99
  return {
    multiplier,
    status,
    message,
    combinedRatio,
    thresholdFull: config.bonusEligibleCombinedRatio,
    thresholdWarning: config.warningCombinedRatio,
    thresholdCritical: config.criticalCombinedRatio,
  };
}

/**
 * Calculate profitability metrics for a specific product line
 *
 * EXACT PORT from Python LossRatioModel.calculate_product_profitability()
 * Source: loss_ratio_model.py lines 101-153
 *
 * @param product - Product type (auto, home, umbrella, etc.)
 * @param premiumEarned - Total premium earned for period
 * @param claimsPaid - Total claims paid for period
 * @param policyCount - Number of policies
 * @param config - Optional model configuration
 * @returns Product profitability metrics
 */
export function calculateProductProfitability(
  product: ProductType,
  premiumEarned: number,
  claimsPaid: number,
  policyCount: number,
  config: LossRatioModelConfig = DEFAULT_MODEL_CONFIG
): ProductProfitabilityResult {
  // Loss ratio (line 119)
  const lossRatio = premiumEarned > 0 ? claimsPaid / premiumEarned : 0;

  // Combined ratio (line 122)
  const combinedRatio = calculateCombinedRatio(lossRatio, config.expenseRatio);

  // Commission revenue (assuming 7% avg) - lines 125-126
  const commissionRate = DEFAULT_COMMISSION_RATE;
  const commissionRevenue = premiumEarned * commissionRate;

  // Underwriting profit/loss (carrier perspective) - line 129
  const underwritingResult =
    premiumEarned - claimsPaid - premiumEarned * config.expenseRatio;

  // Agency profit (commission minus servicing costs) - lines 132-134
  const avgServicingCostPerPolicy = SERVICING_COST_PER_POLICY[product] ?? 50;
  const totalServicingCost = policyCount * avgServicingCostPerPolicy;
  const agencyProfit = commissionRevenue - totalServicingCost;

  // Profitability per policy (line 137)
  const profitPerPolicy = policyCount > 0 ? agencyProfit / policyCount : 0;

  // Source: loss_ratio_model.py lines 139-153
  return {
    product,
    premiumEarned,
    claimsPaid,
    lossRatio,
    expenseRatio: config.expenseRatio,
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
 * EXACT PORT from Python LossRatioModel.calculate_portfolio_metrics()
 * Source: loss_ratio_model.py lines 155-216
 *
 * @param productMix - Dictionary of products with their metrics
 * @param config - Optional model configuration
 * @returns Portfolio-level profitability summary
 */
export function calculatePortfolioMetrics(
  productMix: Partial<Record<ProductType, ProductMixInput>>,
  config: LossRatioModelConfig = DEFAULT_MODEL_CONFIG
): PortfolioMetricsResult {
  // Source: loss_ratio_model.py lines 171-176
  let totalPremium = 0;
  let totalClaims = 0;
  let totalPolicies = 0;
  let totalCommission = 0;
  let totalServicingCost = 0;

  const productResults: ProductProfitabilityResult[] = [];

  // Source: loss_ratio_model.py lines 179-193
  for (const [product, metrics] of Object.entries(productMix)) {
    if (!metrics) continue;

    const premium = metrics.premium ?? 0;
    const claims = metrics.claims ?? 0;
    const policies = metrics.policies ?? 0;

    const result = calculateProductProfitability(
      product as ProductType,
      premium,
      claims,
      policies,
      config
    );
    productResults.push(result);

    totalPremium += premium;
    totalClaims += claims;
    totalPolicies += policies;
    totalCommission += result.commissionRevenue;
    totalServicingCost += result.servicingCost;
  }

  // Portfolio-level metrics (lines 196-198)
  const portfolioLossRatio = totalPremium > 0 ? totalClaims / totalPremium : 0;
  const portfolioCombinedRatio = calculateCombinedRatio(
    portfolioLossRatio,
    config.expenseRatio
  );
  const portfolioAgencyProfit = totalCommission - totalServicingCost;

  // Bonus eligibility (line 201)
  const bonusInfo = getBonusMultiplier(portfolioCombinedRatio, config);

  // Source: loss_ratio_model.py lines 203-216
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
 * EXACT PORT from Python LossRatioModel.project_claims_cost()
 * Source: loss_ratio_model.py lines 218-267
 *
 * @param projectedPremium - Expected premium volume
 * @param product - Product line
 * @param useActualLossRatio - Use actual vs benchmark loss ratio
 * @param config - Optional model configuration
 * @returns Expected claims and profitability
 */
export function projectClaimsCost(
  projectedPremium: number,
  product: ProductType,
  useActualLossRatio: boolean = true,
  config: LossRatioModelConfig = DEFAULT_MODEL_CONFIG
): ClaimsProjectionResult {
  // Determine loss ratio to use (lines 234-243)
  let lossRatio: number;

  if (useActualLossRatio && config.actualLossRatios[product] !== undefined) {
    // Line 235-236
    lossRatio = config.actualLossRatios[product]!;
  } else {
    // Lines 237-243
    const lossRatioMap: Record<ProductType, number> = {
      auto: config.autoLossRatioBenchmark,
      home: config.homeLossRatioBenchmark,
      umbrella: config.umbrellaLossRatioBenchmark,
      life: config.lifeLossRatioBenchmark,
    };
    lossRatio = lossRatioMap[product] ?? 0.65;
  }

  // Add CAT loading for home in Santa Barbara (lines 246-247)
  if (product === 'home') {
    lossRatio += config.wildfireCatLoad;
  }

  // Project claims (line 250)
  const expectedClaims = projectedPremium * lossRatio;
  const combinedRatio = calculateCombinedRatio(lossRatio, config.expenseRatio);

  // Commission revenue (line 254)
  const commissionRevenue = projectedPremium * DEFAULT_COMMISSION_RATE;

  // Expected profit/loss (line 257)
  const underwritingResult = projectedPremium * (1 - combinedRatio);

  // Source: loss_ratio_model.py lines 259-267
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
// Risk Assessment Functions
// ============================================

/**
 * Assess overall risk level based on loss ratios and combined ratio
 *
 * Extension of Python model for risk assessment functionality
 */
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  factors: string[];
  recommendations: string[];
}

/**
 * Assess risk level for a portfolio based on loss ratio metrics
 *
 * @param portfolioMetrics - Portfolio metrics result
 * @returns Risk assessment with score and recommendations
 */
export function assessPortfolioRisk(
  portfolioMetrics: PortfolioMetricsResult
): RiskAssessmentResult {
  const factors: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  // Combined ratio risk (major factor)
  const combinedRatio = portfolioMetrics.portfolioCombinedRatio;
  if (combinedRatio > 1.05) {
    riskScore += 40;
    factors.push(`Combined ratio ${(combinedRatio * 100).toFixed(1)}% exceeds critical threshold`);
    recommendations.push('Immediate action required: review high-loss policies');
  } else if (combinedRatio > 1.0) {
    riskScore += 25;
    factors.push(`Combined ratio ${(combinedRatio * 100).toFixed(1)}% above breakeven`);
    recommendations.push('Review underwriting standards and claims handling');
  } else if (combinedRatio > 0.95) {
    riskScore += 10;
    factors.push('Combined ratio approaching warning threshold');
    recommendations.push('Monitor closely for any adverse claims trends');
  }

  // Loss ratio analysis by product
  for (const product of portfolioMetrics.productBreakdown) {
    const benchmark = LOSS_RATIO_BENCHMARKS[product.product];
    if (product.lossRatio > benchmark + 0.15) {
      riskScore += 15;
      factors.push(
        `${product.product.toUpperCase()} loss ratio ${(product.lossRatio * 100).toFixed(1)}% ` +
        `significantly exceeds benchmark ${(benchmark * 100).toFixed(1)}%`
      );
      recommendations.push(`Review ${product.product} book for high-risk policies`);
    } else if (product.lossRatio > benchmark + 0.05) {
      riskScore += 5;
      factors.push(
        `${product.product.toUpperCase()} loss ratio above benchmark`
      );
    }
  }

  // Bonus eligibility impact
  if (portfolioMetrics.bonusEligibility.status === 'ineligible') {
    riskScore += 20;
    factors.push('Currently ineligible for carrier bonus');
    recommendations.push('Focus on improving loss ratio to restore bonus eligibility');
  } else if (portfolioMetrics.bonusEligibility.status === 'warning') {
    riskScore += 10;
    factors.push('Bonus eligibility at risk');
  }

  // Determine risk level
  let riskLevel: RiskLevel;
  if (riskScore >= 60) {
    riskLevel = 'critical';
  } else if (riskScore >= 40) {
    riskLevel = 'high';
  } else if (riskScore >= 20) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'low';
  }

  // Add positive factors if risk is low
  if (riskLevel === 'low') {
    factors.push('Portfolio operating within healthy parameters');
    recommendations.push('Continue current underwriting practices');
  }

  return {
    riskLevel,
    riskScore: Math.min(100, riskScore),
    factors,
    recommendations,
  };
}

/**
 * Calculate loss ratio trend analysis
 *
 * @param historicalLossRatios - Array of historical loss ratios (oldest to newest)
 * @returns Trend analysis with direction and momentum
 */
export interface LossRatioTrendResult {
  currentLossRatio: number;
  averageLossRatio: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  momentum: number; // Positive = improving, negative = deteriorating
  periods: number;
}

export function analyzeLossRatioTrend(
  historicalLossRatios: number[]
): LossRatioTrendResult | null {
  if (historicalLossRatios.length < 2) {
    return null;
  }

  const current = historicalLossRatios[historicalLossRatios.length - 1];
  const average =
    historicalLossRatios.reduce((sum, lr) => sum + lr, 0) /
    historicalLossRatios.length;

  // Calculate momentum (weighted recent vs older)
  const midpoint = Math.floor(historicalLossRatios.length / 2);
  const recentAvg =
    historicalLossRatios.slice(midpoint).reduce((sum, lr) => sum + lr, 0) /
    (historicalLossRatios.length - midpoint);
  const olderAvg =
    historicalLossRatios.slice(0, midpoint).reduce((sum, lr) => sum + lr, 0) /
    midpoint;

  // Negative momentum means improving (lower loss ratio is better)
  const momentum = recentAvg - olderAvg;

  let trend: 'improving' | 'stable' | 'deteriorating';
  if (momentum < -0.02) {
    trend = 'improving';
  } else if (momentum > 0.02) {
    trend = 'deteriorating';
  } else {
    trend = 'stable';
  }

  return {
    currentLossRatio: current,
    averageLossRatio: average,
    trend,
    momentum: -momentum, // Flip sign so positive = improving
    periods: historicalLossRatios.length,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format loss ratio as percentage string
 *
 * @param lossRatio - Loss ratio as decimal (e.g., 0.68)
 * @returns Formatted percentage string (e.g., "68.0%")
 */
export function formatLossRatio(lossRatio: number): string {
  return `${(lossRatio * 100).toFixed(1)}%`;
}

/**
 * Format currency value
 *
 * @param value - Dollar amount
 * @returns Formatted currency string (e.g., "$1,234,567")
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Get loss ratio benchmark for a product
 *
 * Source: loss_ratio_model.py lines 33-36
 *
 * @param product - Product type
 * @returns Benchmark loss ratio
 */
export function getLossRatioBenchmark(product: ProductType): number {
  return LOSS_RATIO_BENCHMARKS[product];
}

/**
 * Check if a loss ratio is within acceptable range for a product
 *
 * @param product - Product type
 * @param lossRatio - Actual loss ratio
 * @param tolerance - Acceptable deviation from benchmark (default 0.05 = 5%)
 * @returns Whether the loss ratio is acceptable
 */
export function isLossRatioAcceptable(
  product: ProductType,
  lossRatio: number,
  tolerance: number = 0.05
): boolean {
  const benchmark = LOSS_RATIO_BENCHMARKS[product];
  return lossRatio <= benchmark + tolerance;
}

// ============================================
// Default Export
// ============================================

export default {
  // Constants
  LOSS_RATIO_BENCHMARKS,
  DEFAULT_EXPENSE_RATIO,
  BONUS_THRESHOLDS,
  WILDFIRE_CAT_LOAD,
  DEFAULT_COMMISSION_RATE,
  SERVICING_COST_PER_POLICY,
  DEFAULT_MODEL_CONFIG,

  // Core Functions
  calculateCombinedRatio,
  getBonusMultiplier,
  calculateProductProfitability,
  calculatePortfolioMetrics,
  projectClaimsCost,

  // Risk Assessment
  assessPortfolioRisk,
  analyzeLossRatioTrend,

  // Utilities
  formatLossRatio,
  formatCurrency,
  getLossRatioBenchmark,
  isLossRatioAcceptable,
};
