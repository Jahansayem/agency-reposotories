/**
 * Cash Flow Timing Model
 *
 * EXACT PORT from Python bealer-lead-model/src/cash_flow_model.py
 *
 * Models commission payment lag and working capital requirements for insurance agencies.
 *
 * Key Realities:
 * - Commission paid 45-60 days after policy effective date
 * - Chargebacks occur when policies cancel in first 60-90 days
 * - Growth requires working capital buffer
 * - Cash flow != Profit (timing mismatch)
 *
 * Source: bealer-lead-model/src/cash_flow_model.py
 */

// ============================================
// Types (from Python dataclass CashFlowModel, lines 14-38)
// ============================================

/**
 * Configuration for cash flow model
 * Source: Python CashFlowModel dataclass (lines 14-38)
 */
export interface CashFlowModelConfig {
  /** Commission payment timing - Allstate-specific, typical 45-60 days (line 27) */
  commissionPaymentLagDays: number;
  /** 8% of new policies cancel early (line 30) */
  chargebackRateFirst60Days: number;
  /** Carrier recoups 95% of commission paid (line 31) */
  chargebackRecoveryRate: number;
  /** Minimum 2 months operating expenses (line 34) */
  minCashBufferMonths: number;
  /** Add 1 month buffer per 10% monthly growth (line 35) */
  growthBufferMonthsPer10PctGrowth: number;
  /** 7% blended commission rate (line 38) */
  avgCommissionRate: number;
}

/**
 * Cash flow breakdown for a single month
 * Source: Python calculate_monthly_cash_flow() return (lines 91-110)
 */
export interface CashFlowBreakdown {
  cashInCommissions: number;
  cashOutChargebacks: number;
  cashOutExpenses: number;
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
}

/**
 * Accrual accounting figures for comparison
 * Source: Python calculate_monthly_cash_flow() return (lines 100-104)
 */
export interface AccrualAccounting {
  revenue: number;
  expenses: number;
  profit: number;
}

/**
 * Comparison between cash and accrual accounting
 * Source: Python calculate_monthly_cash_flow() return (lines 105-109)
 */
export interface CashAccrualComparison {
  cashVsAccrualGap: number;
  cashFlowWarning: boolean;
  warningMessage: string | null;
}

/**
 * Complete monthly cash flow analysis result
 * Source: Python calculate_monthly_cash_flow() return (lines 91-110)
 */
export interface MonthlyCashFlowResult {
  cashFlow: CashFlowBreakdown;
  accrualAccounting: AccrualAccounting;
  comparison: CashAccrualComparison;
}

/**
 * Working capital requirement analysis
 * Source: Python calculate_working_capital_need() return (lines 144-156)
 */
export interface WorkingCapitalResult {
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
 * Single month projection row
 * Source: Python project_cash_flow_12_months() DataFrame columns (lines 226-237)
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
 * Source: Python analyze_cash_flow_stress_test() return (lines 280-289)
 */
export interface StressTestScenarioResult {
  growthRate: number;
  minCashBalance: number;
  maxCashBalance: number;
  monthsCashNegative: number;
  totalCashBurn: number;
  workingCapitalNeeded: number;
  sustainable: boolean;
  projection: MonthlyProjection[];
}

/**
 * Complete stress test results
 * Source: Python analyze_cash_flow_stress_test() return (lines 259-291)
 */
export interface StressTestResults {
  [scenarioKey: string]: StressTestScenarioResult;
}

// ============================================
// Default Configuration Constants (from Python lines 27-38)
// ============================================

/**
 * Default cash flow model configuration
 * Source: Python CashFlowModel dataclass defaults (lines 27-38)
 */
export const DEFAULT_CASH_FLOW_CONFIG: CashFlowModelConfig = {
  // Commission payment timing (Allstate-specific, verify with agent) - line 27
  commissionPaymentLagDays: 48, // Typical 45-60 days

  // Chargeback provisions - lines 30-31
  chargebackRateFirst60Days: 0.08, // 8% of new policies cancel early
  chargebackRecoveryRate: 0.95, // Carrier recoups 95% of commission paid

  // Working capital requirements - lines 34-35
  minCashBufferMonths: 2.0, // Minimum 2 months operating expenses
  growthBufferMonthsPer10PctGrowth: 1.0, // Add 1 month per 10% monthly growth

  // Payment assumptions - line 38
  avgCommissionRate: 0.07, // 7% blended
};

// ============================================
// Cash Flow Model Class
// ============================================

/**
 * Cash Flow Timing Model
 *
 * Models cash flow vs accrual revenue accounting for insurance agencies.
 *
 * EXACT PORT from Python CashFlowModel class (lines 14-291)
 */
export class CashFlowModel {
  private config: CashFlowModelConfig;

  /**
   * Create a new CashFlowModel instance
   *
   * @param config - Optional configuration overrides
   * Source: Python CashFlowModel.__init__ (implicit via dataclass, lines 14-38)
   */
  constructor(config: Partial<CashFlowModelConfig> = {}) {
    this.config = { ...DEFAULT_CASH_FLOW_CONFIG, ...config };
  }

  /**
   * Calculate actual cash in/out vs accrual accounting
   *
   * EXACT PORT from Python calculate_monthly_cash_flow() (lines 40-110)
   *
   * @param currentMonthRevenueAccrual - New premium written this month (accrual)
   * @param currentMonthExpenses - Operating expenses this month (cash out)
   * @param priorMonthRevenueAccrual - Premium written 1 month ago
   * @param twoMonthsAgoRevenue - Premium written 2 months ago
   * @param currentMonthCancellationsPremium - Premium cancelled this month
   * @returns Cash flow analysis
   */
  calculateMonthlyCashFlow(
    currentMonthRevenueAccrual: number,
    currentMonthExpenses: number,
    priorMonthRevenueAccrual: number,
    twoMonthsAgoRevenue: number,
    currentMonthCancellationsPremium: number
  ): MonthlyCashFlowResult {
    // CASH IN: Commission from prior month(s) policies (lines 59-69)
    // Assuming 48-day lag ~ 1.5 months, use weighted average
    let cashInCommissions: number;

    if (this.config.commissionPaymentLagDays <= 30) {
      // Line 62
      cashInCommissions = priorMonthRevenueAccrual * this.config.avgCommissionRate;
    } else if (this.config.commissionPaymentLagDays <= 45) {
      // Lines 63-66: Weight between 1 and 2 months ago
      cashInCommissions =
        (priorMonthRevenueAccrual * 0.7 + twoMonthsAgoRevenue * 0.3) *
        this.config.avgCommissionRate;
    } else {
      // Lines 67-69: Primarily 2 months ago
      cashInCommissions = twoMonthsAgoRevenue * this.config.avgCommissionRate;
    }

    // CASH OUT: Commission chargebacks (early cancellations) (lines 71-74)
    const cashOutChargebacks =
      currentMonthCancellationsPremium *
      this.config.avgCommissionRate *
      this.config.chargebackRecoveryRate;

    // CASH OUT: Operating expenses (paid immediately) (lines 76-77)
    const cashOutExpenses = currentMonthExpenses;

    // Net cash flow (lines 79-82)
    const totalCashIn = cashInCommissions;
    const totalCashOut = cashOutChargebacks + cashOutExpenses;
    const netCashFlow = totalCashIn - totalCashOut;

    // Accrual accounting (for comparison) (lines 84-86)
    const accrualRevenue = currentMonthRevenueAccrual * this.config.avgCommissionRate;
    const accrualProfit = accrualRevenue - currentMonthExpenses;

    // Cash vs accrual gap (line 89)
    const cashAccrualGap = netCashFlow - accrualProfit;

    // Build result (lines 91-110)
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
   * EXACT PORT from Python calculate_working_capital_need() (lines 112-156)
   *
   * @param monthlyOperatingExpenses - Monthly operating expenses
   * @param monthlyGrowthRate - Expected monthly revenue growth rate (default: 0.05)
   * @returns Working capital requirement analysis
   */
  calculateWorkingCapitalNeed(
    monthlyOperatingExpenses: number,
    monthlyGrowthRate: number = 0.05
  ): WorkingCapitalResult {
    // Base buffer: Cover X months of expenses (line 126)
    const baseBuffer = this.config.minCashBufferMonths * monthlyOperatingExpenses;

    // Growth buffer: Higher growth = more working capital needed (lines 128-130)
    // 10% monthly growth = additional 1 month buffer
    const growthBuffer =
      (monthlyGrowthRate / 0.1) *
      this.config.growthBufferMonthsPer10PctGrowth *
      monthlyOperatingExpenses;

    // Commission lag buffer: Premium in flight (lines 132-134)
    const lagMonths = this.config.commissionPaymentLagDays / 30;
    const lagBuffer = lagMonths * (monthlyOperatingExpenses * 0.5); // Conservative estimate

    // Total working capital need (line 137)
    const totalWorkingCapital = baseBuffer + growthBuffer + lagBuffer;

    // Monthly cash reserve burn rate (if growing rapidly) (lines 140-142)
    const monthlyCashBurnDuringGrowth =
      monthlyOperatingExpenses * (1 + monthlyGrowthRate) -
      monthlyOperatingExpenses * 0.7; // Assume 70% comes in from lag

    // Calculate months of runway (line 151)
    const monthsOfRunway =
      monthlyOperatingExpenses > 0 ? totalWorkingCapital / monthlyOperatingExpenses : 0;

    // Generate recommendation (lines 153-155)
    const recommendation = this._generateWorkingCapitalRecommendation(
      totalWorkingCapital,
      monthlyOperatingExpenses,
      monthlyGrowthRate
    );

    return {
      monthlyExpenses: monthlyOperatingExpenses,
      monthlyGrowthRate,
      baseBuffer,
      growthBuffer,
      lagBuffer,
      totalWorkingCapitalNeed: totalWorkingCapital,
      monthsOfRunway,
      monthlyCashBurnDuringGrowth: Math.max(0, monthlyCashBurnDuringGrowth),
      recommendation,
    };
  }

  /**
   * Generate working capital recommendation
   *
   * EXACT PORT from Python _generate_working_capital_recommendation() (lines 158-176)
   *
   * @param totalWc - Total working capital needed
   * @param monthlyExp - Monthly expenses
   * @param growthRate - Monthly growth rate
   * @returns Recommendation string
   */
  private _generateWorkingCapitalRecommendation(
    totalWc: number,
    monthlyExp: number,
    growthRate: number
  ): string {
    const monthsRunway = monthlyExp > 0 ? totalWc / monthlyExp : 0;
    const formattedWc = totalWc.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });

    if (growthRate > 0.1) {
      // Lines 166-169
      return (
        `HIGH GROWTH MODE: Maintain ${formattedWc} working capital ` +
        `(${monthsRunway.toFixed(1)} months runway). Rapid growth requires significant ` +
        `cash buffer due to commission lag.`
      );
    } else if (growthRate > 0.05) {
      // Lines 170-173
      return (
        `MODERATE GROWTH: Maintain ${formattedWc} working capital ` +
        `(${monthsRunway.toFixed(1)} months runway). Growth is sustainable with proper ` +
        `cash management.`
      );
    } else {
      // Lines 174-176
      return (
        `STABLE OPERATIONS: Maintain ${formattedWc} working capital ` +
        `(${monthsRunway.toFixed(1)} months runway). Current cash buffer is adequate.`
      );
    }
  }

  /**
   * Project 12-month cash flow with growth
   *
   * EXACT PORT from Python project_cash_flow_12_months() (lines 178-242)
   *
   * @param startingMonthlyRevenue - Starting monthly premium written
   * @param monthlyGrowthRate - Monthly revenue growth rate
   * @param monthlyExpenses - Starting monthly expenses
   * @param expenseGrowthRate - Monthly expense growth rate (default: 0.02)
   * @returns Array of monthly projections
   */
  projectCashFlow12Months(
    startingMonthlyRevenue: number,
    monthlyGrowthRate: number,
    monthlyExpenses: number,
    expenseGrowthRate: number = 0.02
  ): MonthlyProjection[] {
    const months: MonthlyProjection[] = [];

    // Initialize with Month 0 and Month -1 for lag calculations (line 198)
    const revenueHistory: number[] = [
      startingMonthlyRevenue * 0.95,
      startingMonthlyRevenue,
    ];

    for (let month = 1; month <= 12; month++) {
      // Revenue (accrual) (lines 202-204)
      const currentRevenue =
        revenueHistory[revenueHistory.length - 1] * (1 + monthlyGrowthRate);
      const priorMonthRevenue = revenueHistory[revenueHistory.length - 1];
      const twoMonthsAgoRevenue =
        revenueHistory.length >= 2
          ? revenueHistory[revenueHistory.length - 2]
          : revenueHistory[revenueHistory.length - 1];

      // Expenses (grow more slowly) (line 207)
      const currentExpenses = monthlyExpenses * Math.pow(1 + expenseGrowthRate, month);

      // Assume 8% of new premium cancels (chargebacks) (lines 209-210)
      const cancellations = currentRevenue * this.config.chargebackRateFirst60Days;

      // Calculate cash flow (lines 212-219)
      const cashFlow = this.calculateMonthlyCashFlow(
        currentRevenue,
        currentExpenses,
        priorMonthRevenue,
        twoMonthsAgoRevenue,
        cancellations
      );

      // Cumulative cash balance (starting from $0) (lines 221-224)
      const previousCumulativeCash =
        months.length > 0 ? months[months.length - 1].cumulativeCash : 0;
      const cumulativeCash = previousCumulativeCash + cashFlow.cashFlow.netCashFlow;

      // Build month entry (lines 226-237)
      months.push({
        month,
        premiumWrittenAccrual: currentRevenue,
        commissionRevenueAccrual: currentRevenue * this.config.avgCommissionRate,
        expenses: currentExpenses,
        accrualProfit: cashFlow.accrualAccounting.profit,
        cashIn: cashFlow.cashFlow.totalCashIn,
        cashOut: cashFlow.cashFlow.totalCashOut,
        netCashFlow: cashFlow.cashFlow.netCashFlow,
        cumulativeCash,
        cashVsAccrualGap: cashFlow.comparison.cashVsAccrualGap,
      });

      // Update revenue history (line 239)
      revenueHistory.push(currentRevenue);
    }

    return months;
  }

  /**
   * Stress test cash flow under different growth scenarios
   *
   * EXACT PORT from Python analyze_cash_flow_stress_test() (lines 244-291)
   *
   * @param monthlyRevenue - Current monthly revenue
   * @param monthlyExpenses - Current monthly expenses
   * @param growthScenarios - List of monthly growth rates to test (default: [0.05, 0.10, 0.15])
   * @returns Stress test results by scenario
   */
  analyzeCashFlowStressTest(
    monthlyRevenue: number,
    monthlyExpenses: number,
    growthScenarios: number[] = [0.05, 0.1, 0.15]
  ): StressTestResults {
    const results: StressTestResults = {};

    for (const growthRate of growthScenarios) {
      // Project 12 months (lines 263-267)
      const projection = this.projectCashFlow12Months(
        monthlyRevenue,
        growthRate,
        monthlyExpenses
      );

      // Calculate metrics (lines 269-273)
      const cumulativeCashValues = projection.map((p) => p.cumulativeCash);
      const minCashBalance = Math.min(...cumulativeCashValues);
      const maxCashBalance = Math.max(...cumulativeCashValues);
      const monthsCashNegative = cumulativeCashValues.filter((c) => c < 0).length;
      const totalCashBurn = minCashBalance < 0 ? Math.abs(minCashBalance) : 0;

      // Working capital needed (lines 276-278)
      const wcNeed = this.calculateWorkingCapitalNeed(monthlyExpenses, growthRate);

      // Format scenario key (line 280)
      const scenarioKey = `${Math.round(growthRate * 100)}%_growth`;

      // Store results (lines 280-289)
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
}

// ============================================
// Convenience Functions (stateless)
// ============================================

/**
 * Calculate monthly cash flow with default configuration
 *
 * Convenience function that creates a CashFlowModel with defaults.
 * For repeated calls, instantiate CashFlowModel directly.
 */
export function calculateMonthlyCashFlow(
  currentMonthRevenueAccrual: number,
  currentMonthExpenses: number,
  priorMonthRevenueAccrual: number,
  twoMonthsAgoRevenue: number,
  currentMonthCancellationsPremium: number,
  config?: Partial<CashFlowModelConfig>
): MonthlyCashFlowResult {
  const model = new CashFlowModel(config);
  return model.calculateMonthlyCashFlow(
    currentMonthRevenueAccrual,
    currentMonthExpenses,
    priorMonthRevenueAccrual,
    twoMonthsAgoRevenue,
    currentMonthCancellationsPremium
  );
}

/**
 * Calculate working capital need with default configuration
 *
 * Convenience function that creates a CashFlowModel with defaults.
 * For repeated calls, instantiate CashFlowModel directly.
 */
export function calculateWorkingCapitalNeed(
  monthlyOperatingExpenses: number,
  monthlyGrowthRate: number = 0.05,
  config?: Partial<CashFlowModelConfig>
): WorkingCapitalResult {
  const model = new CashFlowModel(config);
  return model.calculateWorkingCapitalNeed(monthlyOperatingExpenses, monthlyGrowthRate);
}

/**
 * Project 12-month cash flow with default configuration
 *
 * Convenience function that creates a CashFlowModel with defaults.
 * For repeated calls, instantiate CashFlowModel directly.
 */
export function projectCashFlow12Months(
  startingMonthlyRevenue: number,
  monthlyGrowthRate: number,
  monthlyExpenses: number,
  expenseGrowthRate: number = 0.02,
  config?: Partial<CashFlowModelConfig>
): MonthlyProjection[] {
  const model = new CashFlowModel(config);
  return model.projectCashFlow12Months(
    startingMonthlyRevenue,
    monthlyGrowthRate,
    monthlyExpenses,
    expenseGrowthRate
  );
}

/**
 * Run stress test with default configuration
 *
 * Convenience function that creates a CashFlowModel with defaults.
 * For repeated calls, instantiate CashFlowModel directly.
 */
export function analyzeCashFlowStressTest(
  monthlyRevenue: number,
  monthlyExpenses: number,
  growthScenarios: number[] = [0.05, 0.1, 0.15],
  config?: Partial<CashFlowModelConfig>
): StressTestResults {
  const model = new CashFlowModel(config);
  return model.analyzeCashFlowStressTest(monthlyRevenue, monthlyExpenses, growthScenarios);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format currency for display (helper)
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/**
 * Format percentage for display (helper)
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Generate summary of cash flow projection
 *
 * Utility function to summarize a 12-month projection
 */
export function summarizeCashFlowProjection(projection: MonthlyProjection[]): {
  totalAccrualProfit: number;
  totalNetCashFlow: number;
  finalCumulativeCash: number;
  monthsWithNegativeCash: number;
  minCashBalance: number;
  maxCashBalance: number;
  averageCashVsAccrualGap: number;
} {
  const totalAccrualProfit = projection.reduce((sum, p) => sum + p.accrualProfit, 0);
  const totalNetCashFlow = projection.reduce((sum, p) => sum + p.netCashFlow, 0);
  const finalCumulativeCash = projection[projection.length - 1]?.cumulativeCash ?? 0;
  const cumulativeCashValues = projection.map((p) => p.cumulativeCash);
  const monthsWithNegativeCash = cumulativeCashValues.filter((c) => c < 0).length;
  const minCashBalance = Math.min(...cumulativeCashValues);
  const maxCashBalance = Math.max(...cumulativeCashValues);
  const averageCashVsAccrualGap =
    projection.reduce((sum, p) => sum + p.cashVsAccrualGap, 0) / projection.length;

  return {
    totalAccrualProfit,
    totalNetCashFlow,
    finalCumulativeCash,
    monthsWithNegativeCash,
    minCashBalance,
    maxCashBalance,
    averageCashVsAccrualGap,
  };
}

// ============================================
// Default Export
// ============================================

export default {
  CashFlowModel,
  DEFAULT_CASH_FLOW_CONFIG,
  calculateMonthlyCashFlow,
  calculateWorkingCapitalNeed,
  projectCashFlow12Months,
  analyzeCashFlowStressTest,
  summarizeCashFlowProjection,
  formatCurrency,
  formatPercentage,
};
