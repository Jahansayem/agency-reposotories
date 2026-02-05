/**
 * Seasonality & Monthly Variance Model
 *
 * EXACT PORT from Python bealer-lead-model/src/seasonality_model.py
 *
 * Purpose:
 * - Identify high/low sales months for marketing optimization
 * - Model renewal concentration patterns
 * - Optimize cash flow planning with seasonal adjustments
 * - Project staffing needs based on seasonal volume
 * - Calculate marketing ROI by season
 *
 * Insurance Industry Seasonality Patterns:
 * - Auto insurance: Peaks in spring (tax refunds) and fall (back to school)
 * - Home insurance: Peaks in spring/summer (moving season, home buying)
 * - Life insurance: Peaks in January (new year resolutions) and tax season
 * - Renewals: Typically 12-month policies, creating anniversary concentration
 */

// ============================================
// Types & Enums
// Source: seasonality_model.py lines 26-54
// ============================================

/**
 * Seasonal categories
 * Source: seasonality_model.py lines 26-32
 */
export type Season = 'peak' | 'high' | 'normal' | 'low' | 'valley';

/**
 * Season thresholds (indexed to 100 baseline)
 * Source: seasonality_model.py lines 27-32
 */
export const SEASON_THRESHOLDS = {
  PEAK: 120,    // 20%+ above baseline
  HIGH: 110,    // 10-20% above baseline
  NORMAL: 90,   // ±10% of baseline
  LOW: 80,      // 10-20% below baseline
  // Below 80 = VALLEY (20%+ below baseline)
} as const;

/**
 * Confidence level for patterns
 * Source: seasonality_model.py line 44
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Business type for seasonality patterns
 * Source: seasonality_model.py line 63
 */
export type BusinessType = 'personal_lines' | 'commercial' | 'mixed';

/**
 * Monthly sales/renewal pattern
 * Source: seasonality_model.py lines 36-44
 */
export interface MonthlyPattern {
  month: string;
  monthIndex: number;         // 1-12
  indexedSales: number;       // 100 = baseline
  season: Season;
  historicalValues: number[];
  stdDeviation: number;
  confidence: ConfidenceLevel;
}

/**
 * Marketing/operational recommendation for specific month
 * Source: seasonality_model.py lines 47-54
 */
export interface SeasonalRecommendation {
  month: string;
  action: string;
  reason: string;
  expectedRoi: number;
  budgetAdjustment: number;   // +/- percentage
}

/**
 * Historical data record for seasonal index calculation
 * Source: seasonality_model.py lines 130-131
 */
export interface HistoricalDataRecord {
  month: string;
  sales: number;
}

/**
 * Monthly sales projection
 * Source: seasonality_model.py lines 270-278
 */
export interface MonthlyProjection {
  month: string;
  monthIndex: number;
  projectedSales: number;
  seasonalFactor: number;
  season: Season;
  indexedValue: number;
  vsAverage: string;          // e.g., "+15%" or "-10%"
}

/**
 * Renewal concentration data for a single month
 * Source: seasonality_model.py lines 350-356
 */
export interface MonthConcentrationData {
  renewals: number;
  concentrationRatio: number;
  level: 'VERY_HIGH' | 'HIGH' | 'NORMAL' | 'LOW' | 'VERY_LOW';
  riskAssessment: string;
  percentageOfBook: number;
}

/**
 * Full renewal concentration analysis
 * Source: seasonality_model.py lines 370-376
 */
export interface RenewalConcentrationAnalysis {
  monthlyConcentration: Record<string, MonthConcentrationData>;
  avgRenewalsPerMonth: number;
  concentrationStdDev: number;
  overallRisk: string;
  recommendation: string;
}

/**
 * Monthly staffing recommendation
 * Source: seasonality_model.py lines 496-503
 */
export interface StaffingRecommendation {
  month: string;
  baseStaff: number;
  recommendedStaff: number;
  seasonalFactor: number;
  recommendation: string;
  costImpact: 'INCREASE' | 'DECREASE' | 'STABLE';
}

/**
 * Monthly cash flow projection
 * Source: seasonality_model.py lines 561-571
 */
export interface CashFlowProjection {
  month: string;
  monthIndex: number;
  accrualRevenue: number;
  cashRevenue: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCash: number;
  status: 'BURN' | 'TIGHT' | 'HEALTHY';
  seasonalNote: string;
}

// ============================================
// Constants
// Source: seasonality_model.py lines 79-126
// ============================================

/**
 * Month names in order
 * Source: seasonality_model.py lines 158-159, 305-306
 */
export const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type MonthName = typeof MONTH_ORDER[number];

/**
 * Industry-standard seasonality patterns (indexed to 100 baseline)
 * Source: Insurance industry benchmarks, adjusted for personal lines
 * Source: seasonality_model.py lines 86-126
 */
export const DEFAULT_SEASONAL_PATTERNS: Record<BusinessType, Record<MonthName, number>> = {
  // Personal auto + home insurance seasonal pattern
  // Source: seasonality_model.py lines 88-101
  personal_lines: {
    January: 95,    // Slow start, budgets tight post-holidays
    February: 105,  // Tax refund anticipation begins
    March: 115,     // Tax refunds arrive, spring home buying starts
    April: 120,     // Peak spring season (home buying, moving)
    May: 118,       // Continued spring activity
    June: 110,      // Summer slowdown begins
    July: 95,       // Vacation season, low activity
    August: 100,    // Back to school, activity resumes
    September: 110, // Fall activity pickup
    October: 108,   // Steady fall season
    November: 90,   // Holiday distraction
    December: 85,   // Holiday valley, lowest month
  },

  // Commercial insurance seasonal pattern
  // Source: seasonality_model.py lines 104-117
  commercial: {
    January: 125,   // Budget deployment, fiscal year planning
    February: 115,
    March: 105,
    April: 100,
    May: 95,
    June: 90,
    July: 85,       // Summer valley
    August: 90,
    September: 105, // Q4 push begins
    October: 110,
    November: 108,
    December: 95,   // Year-end slowdown
  },

  // Blended pattern (average of personal_lines and commercial)
  // Source: seasonality_model.py lines 119-126
  mixed: {
    January: 110,   // (95 + 125) / 2
    February: 110,  // (105 + 115) / 2
    March: 110,     // (115 + 105) / 2
    April: 110,     // (120 + 100) / 2
    May: 106.5,     // (118 + 95) / 2
    June: 100,      // (110 + 90) / 2
    July: 90,       // (95 + 85) / 2
    August: 95,     // (100 + 90) / 2
    September: 107.5, // (110 + 105) / 2
    October: 109,   // (108 + 110) / 2
    November: 99,   // (90 + 108) / 2
    December: 90,   // (85 + 95) / 2
  },
};

/**
 * Default values for cash flow projections
 * Source: seasonality_model.py lines 510-512
 */
export const CASH_FLOW_DEFAULTS = {
  COMMISSION_RATE: 0.07,           // 7% commission rate
  COMMISSION_LAG_MONTHS: 1.6,      // 48 days (~1.6 months)
  MONTHLY_EXPENSES: 42000,         // $42K monthly operating expenses
} as const;

/**
 * Marketing ROI baseline
 * Source: seasonality_model.py line 445
 */
export const BASELINE_MARKETING_ROI = 8.5;  // 850% typical insurance marketing ROI

// ============================================
// Helper Functions
// ============================================

/**
 * Classify season based on indexed value
 * Source: seasonality_model.py lines 211-222
 *
 * @param indexedValue - Sales index (100 = baseline)
 * @returns Season classification
 */
export function classifySeason(indexedValue: number): Season {
  if (indexedValue >= SEASON_THRESHOLDS.PEAK) {
    return 'peak';
  } else if (indexedValue >= SEASON_THRESHOLDS.HIGH) {
    return 'high';
  } else if (indexedValue >= SEASON_THRESHOLDS.NORMAL) {
    return 'normal';
  } else if (indexedValue >= SEASON_THRESHOLDS.LOW) {
    return 'low';
  } else {
    return 'valley';
  }
}

/**
 * Calculate mean of array
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation of array
 * Source: Uses statistics.stdev equivalent
 */
function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  // Sample standard deviation (n-1 denominator, matching Python statistics.stdev)
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

/**
 * Get recommendation based on concentration std dev
 * Source: seasonality_model.py lines 378-385
 *
 * @param stdDev - Concentration standard deviation
 * @returns Recommendation string
 */
function getConcentrationRecommendation(stdDev: number): string {
  if (stdDev > 0.4) {
    return 'Consider staggering policy effective dates for new business to smooth cash flow';
  } else if (stdDev > 0.25) {
    return 'Monitor high concentration months for retention initiatives';
  } else {
    return 'Renewal distribution is healthy - maintain current approach';
  }
}

// ============================================
// Seasonal Index Calculation
// Source: seasonality_model.py lines 128-209
// ============================================

/**
 * Calculate seasonal index from historical data
 *
 * @param historicalData - List of records with month and sales
 * @param businessType - Type of insurance business (affects default patterns)
 * @returns Dict mapping month to MonthlyPattern
 *
 * Source: seasonality_model.py lines 128-209
 */
export function calculateSeasonalIndex(
  historicalData: HistoricalDataRecord[],
  businessType: BusinessType = 'personal_lines'
): Record<MonthName, MonthlyPattern> {
  const defaultPatterns = DEFAULT_SEASONAL_PATTERNS[businessType];

  // Group by month
  // Source: seasonality_model.py lines 143-150
  const monthData: Record<string, number[]> = {};
  for (const record of historicalData) {
    const month = record.month;
    if (!monthData[month]) {
      monthData[month] = [];
    }
    monthData[month].push(record.sales);
  }

  // Calculate average across all months
  // Source: seasonality_model.py lines 153-154
  const allSales = historicalData.map(record => record.sales);
  const overallAvg = mean(allSales);

  // Calculate indexed pattern for each month
  // Source: seasonality_model.py lines 157-207
  const patterns: Record<MonthName, MonthlyPattern> = {} as Record<MonthName, MonthlyPattern>;

  for (let idx = 0; idx < MONTH_ORDER.length; idx++) {
    const month = MONTH_ORDER[idx] as MonthName;
    const monthIndex = idx + 1;

    if (monthData[month] && monthData[month].length > 0) {
      const monthValues = monthData[month];
      const monthAvg = mean(monthValues);
      const indexed = (monthAvg / overallAvg) * 100;

      // Calculate standard deviation and confidence
      // Source: seasonality_model.py lines 168-174
      let stdDeviation: number;
      let confidence: ConfidenceLevel;

      if (monthValues.length > 1) {
        stdDeviation = stdev(monthValues);
        const cv = stdDeviation / monthAvg;  // Coefficient of variation
        confidence = cv < 0.15 ? 'high' : cv < 0.30 ? 'medium' : 'low';
      } else {
        stdDeviation = 0;
        confidence = 'low';
      }

      // Classify season
      // Source: seasonality_model.py lines 177-186
      const season = classifySeason(indexed);

      patterns[month] = {
        month,
        monthIndex,
        indexedSales: indexed,
        season,
        historicalValues: monthValues,
        stdDeviation,
        confidence,
      };
    } else {
      // Use default pattern if no historical data
      // Source: seasonality_model.py lines 198-207
      patterns[month] = {
        month,
        monthIndex,
        indexedSales: defaultPatterns[month],
        season: classifySeason(defaultPatterns[month]),
        historicalValues: [],
        stdDeviation: 0,
        confidence: 'low',
      };
    }
  }

  return patterns;
}

// ============================================
// Monthly Sales Projection
// Source: seasonality_model.py lines 224-283
// ============================================

/**
 * Project monthly sales based on seasonal patterns
 *
 * @param annualSalesTarget - Total annual sales goal
 * @param seasonalPatterns - Custom patterns (or use defaults)
 * @param businessType - Type of insurance business (if using defaults)
 * @returns List of monthly projections with seasonality applied
 *
 * Source: seasonality_model.py lines 224-283
 */
export function projectMonthlySales(
  annualSalesTarget: number,
  seasonalPatterns?: Record<MonthName, MonthlyPattern>,
  businessType: BusinessType = 'personal_lines'
): MonthlyProjection[] {
  // Use default patterns if not provided
  // Source: seasonality_model.py lines 239-255
  const patterns = seasonalPatterns || createDefaultPatterns(businessType);

  // Calculate base monthly value (what uniform distribution would be)
  // Source: seasonality_model.py lines 260-261
  const baseMonthly = annualSalesTarget / 12;

  // Apply seasonal adjustment to each month
  // Source: seasonality_model.py lines 264-278
  const projections: MonthlyProjection[] = [];

  for (const month of MONTH_ORDER) {
    const pattern = patterns[month];

    // Seasonal factor = this month's index / 100
    // Source: seasonality_model.py line 267
    const seasonalFactor = pattern.indexedSales / 100;
    const projectedSales = baseMonthly * seasonalFactor;

    // Calculate vs average string
    // Source: seasonality_model.py line 277
    const vsAveragePct = ((pattern.indexedSales - 100) / 100) * 100;
    const vsAverage = `${vsAveragePct >= 0 ? '+' : ''}${vsAveragePct.toFixed(0)}%`;

    projections.push({
      month,
      monthIndex: pattern.monthIndex,
      projectedSales,
      seasonalFactor,
      season: pattern.season,
      indexedValue: pattern.indexedSales,
      vsAverage,
    });
  }

  // Sort by month index (should already be in order, but ensure)
  // Source: seasonality_model.py line 281
  projections.sort((a, b) => a.monthIndex - b.monthIndex);

  return projections;
}

/**
 * Create default MonthlyPattern objects from default seasonal patterns
 * Source: seasonality_model.py lines 241-254
 */
function createDefaultPatterns(
  businessType: BusinessType
): Record<MonthName, MonthlyPattern> {
  const defaultPatterns = DEFAULT_SEASONAL_PATTERNS[businessType];
  const patterns: Record<MonthName, MonthlyPattern> = {} as Record<MonthName, MonthlyPattern>;

  for (let idx = 0; idx < MONTH_ORDER.length; idx++) {
    const month = MONTH_ORDER[idx] as MonthName;
    patterns[month] = {
      month,
      monthIndex: idx + 1,
      indexedSales: defaultPatterns[month],
      season: classifySeason(defaultPatterns[month]),
      historicalValues: [],
      stdDeviation: 0,
      confidence: 'medium',
    };
  }

  return patterns;
}

// ============================================
// Renewal Concentration Analysis
// Source: seasonality_model.py lines 285-376
// ============================================

/**
 * Calculate renewal concentration by month
 *
 * High concentration = cash flow risk (all renewals in 1-2 months)
 * Low concentration = steady cash flow
 *
 * @param policyStartDates - List of policy effective dates (YYYY-MM, YYYY-MM-DD, or "Month DD, YYYY" format)
 * @param currentBookSize - Total number of policies
 * @returns Renewal concentration metrics
 *
 * Source: seasonality_model.py lines 285-376
 */
export function calculateRenewalConcentration(
  policyStartDates: string[],
  currentBookSize: number
): RenewalConcentrationAnalysis {
  // Count policies by month
  // Source: seasonality_model.py lines 304-322
  const monthCounts: Record<string, number> = {};

  for (const dateStr of policyStartDates) {
    try {
      let monthIdx: number;

      if (dateStr.includes(',')) {
        // Handle "Month DD, YYYY" format
        // Source: seasonality_model.py lines 312-314
        const monthStr = dateStr.split(' ')[0];
        monthIdx = MONTH_ORDER.indexOf(monthStr as MonthName) + 1;
      } else {
        // Handle "YYYY-MM" or "YYYY-MM-DD" format
        // Source: seasonality_model.py lines 316-318
        const parts = dateStr.split('-');
        monthIdx = parseInt(parts[1], 10);
      }

      if (monthIdx >= 1 && monthIdx <= 12) {
        const month = MONTH_ORDER[monthIdx - 1];
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    } catch {
      // Skip invalid dates
      // Source: seasonality_model.py lines 322-323
      continue;
    }
  }

  // Calculate concentration metrics
  // Source: seasonality_model.py lines 326-356
  const avgRenewalsPerMonth = currentBookSize / 12;

  const concentrationData: Record<string, MonthConcentrationData> = {};

  for (const month of MONTH_ORDER) {
    const renewals = monthCounts[month] || 0;
    const concentrationRatio = avgRenewalsPerMonth > 0
      ? renewals / avgRenewalsPerMonth
      : 0;

    // Classify concentration level
    // Source: seasonality_model.py lines 334-348
    let level: MonthConcentrationData['level'];
    let riskAssessment: string;

    if (concentrationRatio >= 1.5) {
      level = 'VERY_HIGH';
      riskAssessment = 'High cash flow concentration risk';
    } else if (concentrationRatio >= 1.2) {
      level = 'HIGH';
      riskAssessment = 'Moderate concentration risk';
    } else if (concentrationRatio >= 0.8) {
      level = 'NORMAL';
      riskAssessment = 'Healthy distribution';
    } else if (concentrationRatio >= 0.5) {
      level = 'LOW';
      riskAssessment = 'Below average renewals';
    } else {
      level = 'VERY_LOW';
      riskAssessment = 'Very few renewals - investigate';
    }

    concentrationData[month] = {
      renewals,
      concentrationRatio,
      level,
      riskAssessment,
      percentageOfBook: currentBookSize > 0
        ? (renewals / currentBookSize) * 100
        : 0,
    };
  }

  // Overall metrics
  // Source: seasonality_model.py lines 359-368
  const concentrationValues = Object.values(concentrationData).map(d => d.concentrationRatio);
  const concentrationStdDev = stdev(concentrationValues);

  // High std deviation = uneven distribution
  // Source: seasonality_model.py lines 363-368
  let overallRisk: string;
  if (concentrationStdDev > 0.4) {
    overallRisk = 'HIGH - Uneven renewal distribution creates cash flow volatility';
  } else if (concentrationStdDev > 0.25) {
    overallRisk = 'MODERATE - Some concentration, monitor high months';
  } else {
    overallRisk = 'LOW - Well-distributed renewals';
  }

  return {
    monthlyConcentration: concentrationData,
    avgRenewalsPerMonth,
    concentrationStdDev,
    overallRisk,
    recommendation: getConcentrationRecommendation(concentrationStdDev),
  };
}

// ============================================
// Marketing Timing Optimization
// Source: seasonality_model.py lines 387-456
// ============================================

/**
 * Optimize marketing spend allocation by month based on seasonality
 *
 * @param annualMarketingBudget - Total annual marketing budget
 * @param seasonalPatterns - Seasonal sales patterns
 * @param roiByMonth - Historical ROI by month (optional)
 * @returns List of monthly recommendations
 *
 * Source: seasonality_model.py lines 387-456
 */
export function optimizeMarketingTiming(
  annualMarketingBudget: number,
  seasonalPatterns: Record<MonthName, MonthlyPattern>,
  roiByMonth?: Record<string, number>
): SeasonalRecommendation[] {
  const recommendations: SeasonalRecommendation[] = [];
  const baseMonthlyBudget = annualMarketingBudget / 12;

  for (const month of MONTH_ORDER) {
    const pattern = seasonalPatterns[month];

    let budgetAdjustment: number;
    let action: string;
    let reason: string;
    let expectedRoiLift: number;

    // Default strategy: Increase budget in high seasons
    // Source: seasonality_model.py lines 409-437
    switch (pattern.season) {
      case 'peak':
        // Source: seasonality_model.py lines 409-413
        budgetAdjustment = 0.25;  // +25% budget
        action = `Increase marketing spend by 25% ($${(baseMonthlyBudget * 1.25).toLocaleString(undefined, { maximumFractionDigits: 0 })})`;
        reason = 'Peak season - maximize market share capture';
        expectedRoiLift = 1.20;  // Assume 20% better ROI in peak season
        break;

      case 'high':
        // Source: seasonality_model.py lines 415-419
        budgetAdjustment = 0.15;  // +15% budget
        action = `Increase marketing spend by 15% ($${(baseMonthlyBudget * 1.15).toLocaleString(undefined, { maximumFractionDigits: 0 })})`;
        reason = 'High season - capitalize on increased demand';
        expectedRoiLift = 1.10;
        break;

      case 'normal':
        // Source: seasonality_model.py lines 421-425
        budgetAdjustment = 0.0;  // Maintain budget
        action = `Maintain baseline spend ($${baseMonthlyBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })})`;
        reason = 'Normal season - steady state operations';
        expectedRoiLift = 1.0;
        break;

      case 'low':
        // Source: seasonality_model.py lines 427-431
        budgetAdjustment = -0.15;  // -15% budget
        action = `Reduce marketing spend by 15% ($${(baseMonthlyBudget * 0.85).toLocaleString(undefined, { maximumFractionDigits: 0 })})`;
        reason = 'Low season - focus on efficiency, not volume';
        expectedRoiLift = 0.85;
        break;

      case 'valley':
      default:
        // Source: seasonality_model.py lines 433-437
        budgetAdjustment = -0.30;  // -30% budget
        action = `Reduce marketing spend by 30% ($${(baseMonthlyBudget * 0.70).toLocaleString(undefined, { maximumFractionDigits: 0 })})`;
        reason = 'Valley season - minimal new business activity, focus on retention';
        expectedRoiLift = 0.70;
        break;
    }

    // If we have actual ROI data, use it
    // Source: seasonality_model.py lines 440-446
    let expectedRoi: number;
    if (roiByMonth && roiByMonth[month] !== undefined) {
      expectedRoi = roiByMonth[month];
    } else {
      // Estimate ROI based on seasonality
      // Source: seasonality_model.py lines 445-446
      expectedRoi = BASELINE_MARKETING_ROI * expectedRoiLift;
    }

    recommendations.push({
      month,
      action,
      reason,
      expectedRoi,
      budgetAdjustment,
    });
  }

  return recommendations;
}

// ============================================
// Staffing Needs Calculation
// Source: seasonality_model.py lines 458-505
// ============================================

/**
 * Calculate staffing needs based on seasonal volume
 *
 * @param baseStaffCount - Baseline staff count
 * @param monthlyProjections - Monthly sales projections
 * @param policiesPerStaffPerMonth - Productivity assumption (default: 25)
 * @returns List of monthly staffing recommendations
 *
 * Source: seasonality_model.py lines 458-505
 */
export function calculateStaffingNeeds(
  baseStaffCount: number,
  monthlyProjections: MonthlyProjection[],
  policiesPerStaffPerMonth: number = 25
): StaffingRecommendation[] {
  const staffingRecs: StaffingRecommendation[] = [];

  for (const projection of monthlyProjections) {
    // Required staff based on seasonal demand
    // Source: seasonality_model.py lines 480-483
    const seasonalFactor = projection.seasonalFactor;
    const requiredStaff = Math.max(1, Math.round(baseStaffCount * seasonalFactor));

    // Staffing decision
    // Source: seasonality_model.py lines 486-494
    let recommendation: string;
    let costImpact: StaffingRecommendation['costImpact'];

    if (requiredStaff > baseStaffCount) {
      recommendation = `Consider ${requiredStaff - baseStaffCount} temporary staff`;
      costImpact = 'INCREASE';
    } else if (requiredStaff < baseStaffCount) {
      recommendation = `Reduce hours or reassign ${baseStaffCount - requiredStaff} staff to other tasks`;
      costImpact = 'DECREASE';
    } else {
      recommendation = 'Maintain current staffing';
      costImpact = 'STABLE';
    }

    staffingRecs.push({
      month: projection.month,
      baseStaff: baseStaffCount,
      recommendedStaff: requiredStaff,
      seasonalFactor,
      recommendation,
      costImpact,
    });
  }

  return staffingRecs;
}

// ============================================
// Seasonal Cash Flow Projection
// Source: seasonality_model.py lines 507-573
// ============================================

/**
 * Project monthly cash flow with seasonal variance
 *
 * @param monthlyProjections - Monthly sales projections
 * @param commissionRate - Commission rate (default: 7%)
 * @param commissionLagMonths - Commission payment lag in months (default: 1.6 = 48 days)
 * @param monthlyExpenses - Fixed monthly operating expenses (default: $42,000)
 * @returns List of monthly cash flow projections with seasonal adjustments
 *
 * Source: seasonality_model.py lines 507-573
 */
export function projectSeasonalCashFlow(
  monthlyProjections: MonthlyProjection[],
  commissionRate: number = CASH_FLOW_DEFAULTS.COMMISSION_RATE,
  commissionLagMonths: number = CASH_FLOW_DEFAULTS.COMMISSION_LAG_MONTHS,
  monthlyExpenses: number = CASH_FLOW_DEFAULTS.MONTHLY_EXPENSES
): CashFlowProjection[] {
  const cashFlowProjections: CashFlowProjection[] = [];

  for (let i = 0; i < monthlyProjections.length; i++) {
    const projection = monthlyProjections[i];

    // Accrual revenue (this month's sales x commission rate)
    // Source: seasonality_model.py lines 529-530
    const accrualRevenue = projection.projectedSales * commissionRate;

    // Cash revenue (lagged commission from previous months)
    // Source: seasonality_model.py lines 532-545
    let cashRevenue: number;

    if (i === 0) {
      // First month - assume baseline
      // Source: seasonality_model.py lines 534-535
      cashRevenue = accrualRevenue * 0.5;  // Partial month effect
    } else {
      // Weight: 60% from last month, 40% from 2 months ago (48-day lag)
      // Source: seasonality_model.py lines 538-545
      if (i >= 2) {
        const lastMonthRevenue = monthlyProjections[i - 1].projectedSales * commissionRate * 0.6;
        const twoMonthsAgoRevenue = monthlyProjections[i - 2].projectedSales * commissionRate * 0.4;
        cashRevenue = lastMonthRevenue + twoMonthsAgoRevenue;
      } else {
        // Only have 1 month history
        cashRevenue = monthlyProjections[i - 1].projectedSales * commissionRate;
      }
    }

    // Net cash flow
    // Source: seasonality_model.py line 548
    const netCashFlow = cashRevenue - monthlyExpenses;

    // Cumulative cash flow
    // Source: seasonality_model.py lines 550-551
    const previousCumulativeCash = cashFlowProjections.length > 0
      ? cashFlowProjections.reduce((sum, cf) => sum + cf.netCashFlow, 0)
      : 0;
    const cumulativeCash = previousCumulativeCash + netCashFlow;

    // Cash flow status
    // Source: seasonality_model.py lines 554-559
    let status: CashFlowProjection['status'];
    if (netCashFlow < 0) {
      status = 'BURN';
    } else if (netCashFlow < monthlyExpenses * 0.2) {
      status = 'TIGHT';
    } else {
      status = 'HEALTHY';
    }

    // Seasonal note
    // Source: seasonality_model.py line 570
    const seasonalNote = `${projection.season} season (${projection.vsAverage} vs avg)`;

    cashFlowProjections.push({
      month: projection.month,
      monthIndex: projection.monthIndex,
      accrualRevenue,
      cashRevenue,
      expenses: monthlyExpenses,
      netCashFlow,
      cumulativeCash,
      status,
      seasonalNote,
    });
  }

  return cashFlowProjections;
}

// ============================================
// SeasonalityModel Class (Optional OOP Interface)
// Source: seasonality_model.py lines 57-574
// ============================================

/**
 * Model seasonal variance in insurance agency operations
 *
 * This class provides an OOP interface matching the Python implementation.
 * All methods delegate to the standalone functions above.
 *
 * Source: seasonality_model.py lines 57-574
 */
export class SeasonalityModel {
  private baselineMonthlySales: number;
  private businessType: BusinessType;

  /**
   * Initialize seasonality model
   *
   * @param baselineMonthlySales - Average monthly sales (baseline = 100)
   * @param businessType - Type of insurance business (affects seasonality patterns)
   *
   * Source: seasonality_model.py lines 60-77
   */
  constructor(
    baselineMonthlySales: number = 100.0,
    businessType: BusinessType = 'personal_lines'
  ) {
    this.baselineMonthlySales = baselineMonthlySales;
    this.businessType = businessType;
  }

  /**
   * Get default seasonal patterns based on business type
   * Source: seasonality_model.py lines 79-126
   */
  getDefaultSeasonalPatterns(): Record<MonthName, number> {
    return { ...DEFAULT_SEASONAL_PATTERNS[this.businessType] };
  }

  /**
   * Calculate seasonal index from historical data
   * Source: seasonality_model.py lines 128-209
   */
  calculateSeasonalIndex(
    historicalData: HistoricalDataRecord[]
  ): Record<MonthName, MonthlyPattern> {
    return calculateSeasonalIndex(historicalData, this.businessType);
  }

  /**
   * Project monthly sales based on seasonal patterns
   * Source: seasonality_model.py lines 224-283
   */
  projectMonthlySales(
    annualSalesTarget: number,
    seasonalPatterns?: Record<MonthName, MonthlyPattern>
  ): MonthlyProjection[] {
    return projectMonthlySales(annualSalesTarget, seasonalPatterns, this.businessType);
  }

  /**
   * Calculate renewal concentration by month
   * Source: seasonality_model.py lines 285-376
   */
  calculateRenewalConcentration(
    policyStartDates: string[],
    currentBookSize: number
  ): RenewalConcentrationAnalysis {
    return calculateRenewalConcentration(policyStartDates, currentBookSize);
  }

  /**
   * Optimize marketing spend allocation by month based on seasonality
   * Source: seasonality_model.py lines 387-456
   */
  optimizeMarketingTiming(
    annualMarketingBudget: number,
    seasonalPatterns: Record<MonthName, MonthlyPattern>,
    roiByMonth?: Record<string, number>
  ): SeasonalRecommendation[] {
    return optimizeMarketingTiming(annualMarketingBudget, seasonalPatterns, roiByMonth);
  }

  /**
   * Calculate staffing needs based on seasonal volume
   * Source: seasonality_model.py lines 458-505
   */
  calculateStaffingNeeds(
    baseStaffCount: number,
    monthlyProjections: MonthlyProjection[],
    policiesPerStaffPerMonth: number = 25
  ): StaffingRecommendation[] {
    return calculateStaffingNeeds(baseStaffCount, monthlyProjections, policiesPerStaffPerMonth);
  }

  /**
   * Project monthly cash flow with seasonal variance
   * Source: seasonality_model.py lines 507-573
   */
  projectSeasonalCashFlow(
    monthlyProjections: MonthlyProjection[],
    commissionRate: number = CASH_FLOW_DEFAULTS.COMMISSION_RATE,
    commissionLagMonths: number = CASH_FLOW_DEFAULTS.COMMISSION_LAG_MONTHS,
    monthlyExpenses: number = CASH_FLOW_DEFAULTS.MONTHLY_EXPENSES
  ): CashFlowProjection[] {
    return projectSeasonalCashFlow(
      monthlyProjections,
      commissionRate,
      commissionLagMonths,
      monthlyExpenses
    );
  }
}

// ============================================
// Default Export
// ============================================

export default {
  // Types re-exported for convenience
  MONTH_ORDER,
  SEASON_THRESHOLDS,
  DEFAULT_SEASONAL_PATTERNS,
  CASH_FLOW_DEFAULTS,
  BASELINE_MARKETING_ROI,

  // Functions
  classifySeason,
  calculateSeasonalIndex,
  projectMonthlySales,
  calculateRenewalConcentration,
  optimizeMarketingTiming,
  calculateStaffingNeeds,
  projectSeasonalCashFlow,

  // Class
  SeasonalityModel,
};
