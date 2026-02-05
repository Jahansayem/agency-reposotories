/**
 * Customer Segmentation & LTV Stratification Model
 *
 * EXACT PORT from Python bealer-lead-model/src/customer_segmentation_model.py
 *
 * Key Insight: Top 40% of customers = 83% of profit
 * Not all customers are created equal!
 *
 * Segments:
 * - Elite: 3+ products, $3000+ premium, $18K LTV, 97% retention
 * - Premium: 2+ products, $2000+ premium, $9K LTV, 91% retention
 * - Standard: 1+ product, $800+ premium, $4.5K LTV, 72% retention
 * - Low-Value: everything else, $1.8K LTV, 65% retention
 */

// ============================================
// Types
// ============================================

export type CustomerSegmentName = 'elite' | 'premium' | 'standard' | 'low_value';
export type ServiceTier = 'white_glove' | 'standard' | 'automated';

export interface CustomerSegmentDefinition {
  name: string;
  minProducts: number;
  minAnnualPremium: number;
  avgLtv: number;
  avgRetention: number;
  avgProducts: number;
  claimsFrequency: number;
  recommendedCac: number;
  serviceTier: ServiceTier;
  valueDrivers: string[];
}

export interface CustomerClassification {
  segment: CustomerSegmentName;
  ltv: number;
  recommendedCac: number;
  retention: number;
  serviceTier: ServiceTier;
}

export interface PortfolioAnalysis {
  totalCustomers: number;
  totalLtv: number;
  totalPremium: number;
  avgLtv: number;
  avgPremium: number;
  segments: Record<CustomerSegmentName, SegmentAnalysis>;
  keyInsights: string[];
}

export interface SegmentAnalysis {
  count: number;
  percentageOfBook: number;
  totalLtv: number;
  totalPremium: number;
  avgLtv: number;
  avgPremium: number;
  recommendedCac: number;
  serviceTier: ServiceTier;
  ltvContributionPct: number;
}

export interface MarketingAllocation {
  totalBudget: number;
  allocations: Record<CustomerSegmentName, AllocationDetails>;
  totalExpectedCustomers: number;
  totalExpectedLtv: number;
  blendedRoi: number;
}

export interface AllocationDetails {
  targetPercentage: number;
  recommendedBudget: number;
  recommendedCac: number;
  expectedCustomers: number;
  expectedLtvReturn: number;
  roiPercent: number;
}

// ============================================
// Segment Definitions (from Python)
// ============================================

export const CUSTOMER_SEGMENTS: Record<CustomerSegmentName, CustomerSegmentDefinition> = {
  elite: {
    name: 'Elite',
    minProducts: 3,
    minAnnualPremium: 3000,
    avgLtv: 18000,
    avgRetention: 0.97,
    avgProducts: 3.8,
    claimsFrequency: 0.12,
    recommendedCac: 1200,
    serviceTier: 'white_glove',
    valueDrivers: ['bundling', 'low_claims', 'high_premium', 'longevity'],
  },
  premium: {
    name: 'Premium',
    minProducts: 2,
    minAnnualPremium: 2000,
    avgLtv: 9000,
    avgRetention: 0.91,
    avgProducts: 2.2,
    claimsFrequency: 0.18,
    recommendedCac: 700,
    serviceTier: 'standard',
    valueDrivers: ['bundling', 'acceptable_claims', 'moderate_premium'],
  },
  standard: {
    name: 'Standard',
    minProducts: 1,
    minAnnualPremium: 800,
    avgLtv: 4500,
    avgRetention: 0.72,
    avgProducts: 1.1,
    claimsFrequency: 0.22,
    recommendedCac: 400,
    serviceTier: 'standard',
    valueDrivers: ['volume', 'cross_sell_potential'],
  },
  low_value: {
    name: 'Low-Value',
    minProducts: 1,
    minAnnualPremium: 0,
    avgLtv: 1800,
    avgRetention: 0.65,
    avgProducts: 1.0,
    claimsFrequency: 0.28,
    recommendedCac: 200,
    serviceTier: 'automated',
    valueDrivers: [],
  },
};

// Commission and cost assumptions (from Python)
const AVG_COMMISSION_RATE = 0.07;
const SERVICING_COST_PER_POLICY_PER_YEAR = 50;

// Target distribution for marketing (optimal)
const TARGET_DISTRIBUTION: Record<CustomerSegmentName, number> = {
  elite: 0.15,      // 15% of new customers
  premium: 0.35,    // 35% of new customers
  standard: 0.40,   // 40% of new customers
  low_value: 0.10,  // 10% of new customers (minimize)
};

// ============================================
// Classification Functions
// ============================================

/**
 * Classify customer into segment based on product count and premium
 *
 * EXACT PORT from Python CustomerSegmentationModel.classify_customer()
 */
export function classifyCustomer(
  productCount: number,
  annualPremium: number
): CustomerSegmentName {
  const { elite, premium, standard } = CUSTOMER_SEGMENTS;

  // Elite tier
  if (productCount >= elite.minProducts && annualPremium >= elite.minAnnualPremium) {
    return 'elite';
  }

  // Premium tier
  if (productCount >= premium.minProducts && annualPremium >= premium.minAnnualPremium) {
    return 'premium';
  }

  // Standard tier
  if (annualPremium >= standard.minAnnualPremium) {
    return 'standard';
  }

  // Low-value tier
  return 'low_value';
}

/**
 * Calculate customer-specific LTV based on segment
 *
 * EXACT PORT from Python CustomerSegmentationModel.calculate_segment_ltv()
 */
export function calculateCustomerLtv(
  segmentName: CustomerSegmentName,
  actualPremium: number,
  actualProductCount: number,
  claimsHistory?: number[] // optional claims history for adjustment
): number {
  const segment = CUSTOMER_SEGMENTS[segmentName];

  // Expected years as customer (geometric series based on retention)
  const retention = segment.avgRetention;
  const expectedYears = retention < 1.0
    ? -1 / Math.log(retention)
    : 20;

  // Annual commission revenue
  const annualCommission = actualPremium * AVG_COMMISSION_RATE;

  // Lifetime commission revenue
  const lifetimeRevenue = annualCommission * expectedYears;

  // Lifetime servicing cost
  const servicingCost = SERVICING_COST_PER_POLICY_PER_YEAR *
    actualProductCount *
    expectedYears;

  // Claims cost impact (optional - for more sophisticated model)
  let claimsCostImpact = 0;
  if (claimsHistory && claimsHistory.length > segment.avgProducts * segment.claimsFrequency * 5) {
    // Customer has higher claims than expected
    claimsCostImpact = 500; // Penalty for high claims
  }

  // Calculate LTV
  const ltv = lifetimeRevenue - servicingCost - claimsCostImpact;

  return Math.max(0, ltv);
}

/**
 * Get full customer classification with all derived metrics
 */
export function getCustomerClassification(
  productCount: number,
  annualPremium: number,
  claimsHistory?: number[]
): CustomerClassification {
  const segment = classifyCustomer(productCount, annualPremium);
  const segmentDef = CUSTOMER_SEGMENTS[segment];
  const ltv = calculateCustomerLtv(segment, annualPremium, productCount, claimsHistory);

  return {
    segment,
    ltv,
    recommendedCac: segmentDef.recommendedCac,
    retention: segmentDef.avgRetention,
    serviceTier: segmentDef.serviceTier,
  };
}

// ============================================
// Portfolio Analysis
// ============================================

interface CustomerData {
  customerId?: string;
  productCount: number;
  annualPremium: number;
  claimsHistory?: number[];
}

/**
 * Analyze entire customer portfolio by segment
 *
 * EXACT PORT from Python CustomerSegmentationModel.analyze_customer_portfolio()
 */
export function analyzePortfolio(customers: CustomerData[]): PortfolioAnalysis {
  const segmentsSummary: Record<CustomerSegmentName, Array<{
    customerId?: string;
    ltv: number;
    premium: number;
    products: number;
  }>> = {
    elite: [],
    premium: [],
    standard: [],
    low_value: [],
  };

  // Classify each customer
  for (const customer of customers) {
    const segment = classifyCustomer(customer.productCount, customer.annualPremium);
    const ltv = calculateCustomerLtv(
      segment,
      customer.annualPremium,
      customer.productCount,
      customer.claimsHistory
    );

    segmentsSummary[segment].push({
      customerId: customer.customerId,
      ltv,
      premium: customer.annualPremium,
      products: customer.productCount,
    });
  }

  // Calculate segment statistics
  const totalCustomers = customers.length;
  let totalLtv = 0;
  let totalPremium = 0;

  const segments: Record<CustomerSegmentName, SegmentAnalysis> = {} as Record<CustomerSegmentName, SegmentAnalysis>;

  const segmentNames: CustomerSegmentName[] = ['elite', 'premium', 'standard', 'low_value'];

  for (const segmentName of segmentNames) {
    const segmentCustomers = segmentsSummary[segmentName];
    const count = segmentCustomers.length;

    if (count > 0) {
      const segmentLtv = segmentCustomers.reduce((sum, c) => sum + c.ltv, 0);
      const segmentPremium = segmentCustomers.reduce((sum, c) => sum + c.premium, 0);
      totalLtv += segmentLtv;
      totalPremium += segmentPremium;

      segments[segmentName] = {
        count,
        percentageOfBook: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
        totalLtv: segmentLtv,
        totalPremium: segmentPremium,
        avgLtv: segmentLtv / count,
        avgPremium: segmentPremium / count,
        recommendedCac: CUSTOMER_SEGMENTS[segmentName].recommendedCac,
        serviceTier: CUSTOMER_SEGMENTS[segmentName].serviceTier,
        ltvContributionPct: 0, // Calculated below
      };
    } else {
      segments[segmentName] = {
        count: 0,
        percentageOfBook: 0,
        totalLtv: 0,
        totalPremium: 0,
        avgLtv: 0,
        avgPremium: 0,
        recommendedCac: CUSTOMER_SEGMENTS[segmentName].recommendedCac,
        serviceTier: 'standard',
        ltvContributionPct: 0,
      };
    }
  }

  // Calculate contribution to LTV
  for (const segmentName of segmentNames) {
    if (totalLtv > 0) {
      segments[segmentName].ltvContributionPct =
        (segments[segmentName].totalLtv / totalLtv) * 100;
    }
  }

  // Generate insights
  const keyInsights = generateInsights(segments, totalCustomers);

  return {
    totalCustomers,
    totalLtv,
    totalPremium,
    avgLtv: totalCustomers > 0 ? totalLtv / totalCustomers : 0,
    avgPremium: totalCustomers > 0 ? totalPremium / totalCustomers : 0,
    segments,
    keyInsights,
  };
}

/**
 * Generate strategic insights from segmentation
 *
 * EXACT PORT from Python CustomerSegmentationModel._generate_insights()
 */
function generateInsights(
  segmentResults: Record<CustomerSegmentName, SegmentAnalysis>,
  totalCustomers: number
): string[] {
  const insights: string[] = [];

  // Elite + Premium concentration
  const elitePremiumCount = segmentResults.elite.count + segmentResults.premium.count;
  const elitePremiumPct = totalCustomers > 0
    ? (elitePremiumCount / totalCustomers) * 100
    : 0;

  const elitePremiumLtv = segmentResults.elite.ltvContributionPct +
    segmentResults.premium.ltvContributionPct;

  insights.push(
    `Top tier (Elite + Premium) = ${elitePremiumPct.toFixed(0)}% of customers ` +
    `but ${elitePremiumLtv.toFixed(0)}% of lifetime value`
  );

  // Low-value warning
  const lowValuePct = segmentResults.low_value.percentageOfBook;
  if (lowValuePct > 20) {
    insights.push(
      `⚠️ ${lowValuePct.toFixed(0)}% of book is low-value customers - ` +
      `review acquisition channels`
    );
  }

  // Upgrade opportunity
  const standardCount = segmentResults.standard.count;
  if (standardCount > 0) {
    const upgradeRevenueOpportunity = standardCount * (
      CUSTOMER_SEGMENTS.premium.avgLtv - CUSTOMER_SEGMENTS.standard.avgLtv
    );
    insights.push(
      `💰 Upgrading Standard → Premium = $${upgradeRevenueOpportunity.toLocaleString()} ` +
      `LTV opportunity ($${(upgradeRevenueOpportunity / standardCount).toLocaleString()} per customer)`
    );
  }

  return insights;
}

// ============================================
// Marketing Budget Allocation
// ============================================

/**
 * Recommend marketing budget allocation by target segment
 *
 * EXACT PORT from Python CustomerSegmentationModel.recommend_marketing_allocation()
 */
export function recommendMarketingAllocation(
  totalMarketingBudget: number
): MarketingAllocation {
  // Calculate budget allocation based on recommended CAC
  const segmentNames: CustomerSegmentName[] = ['elite', 'premium', 'standard', 'low_value'];

  const totalWeightedCac = segmentNames.reduce((sum, seg) =>
    sum + TARGET_DISTRIBUTION[seg] * CUSTOMER_SEGMENTS[seg].recommendedCac, 0);

  const allocations: Record<CustomerSegmentName, AllocationDetails> = {} as Record<CustomerSegmentName, AllocationDetails>;

  for (const segmentName of segmentNames) {
    const segment = CUSTOMER_SEGMENTS[segmentName];
    const targetPct = TARGET_DISTRIBUTION[segmentName];

    // Budget proportional to (target % × CAC)
    const budget = (targetPct * segment.recommendedCac / totalWeightedCac) * totalMarketingBudget;

    // Expected customers from this budget
    const expectedCustomers = segment.recommendedCac > 0
      ? budget / segment.recommendedCac
      : 0;

    // Expected LTV return
    const expectedLtvReturn = expectedCustomers * segment.avgLtv;

    // ROI
    const roi = budget > 0
      ? ((expectedLtvReturn - budget) / budget) * 100
      : 0;

    allocations[segmentName] = {
      targetPercentage: targetPct * 100,
      recommendedBudget: budget,
      recommendedCac: segment.recommendedCac,
      expectedCustomers,
      expectedLtvReturn,
      roiPercent: roi,
    };
  }

  const totalExpectedCustomers = Object.values(allocations)
    .reduce((sum, a) => sum + a.expectedCustomers, 0);

  const totalExpectedLtv = Object.values(allocations)
    .reduce((sum, a) => sum + a.expectedLtvReturn, 0);

  const blendedRoi = totalMarketingBudget > 0
    ? ((totalExpectedLtv - totalMarketingBudget) / totalMarketingBudget) * 100
    : 0;

  return {
    totalBudget: totalMarketingBudget,
    allocations,
    totalExpectedCustomers,
    totalExpectedLtv,
    blendedRoi,
  };
}

// ============================================
// Exports
// ============================================

export default {
  CUSTOMER_SEGMENTS,
  classifyCustomer,
  calculateCustomerLtv,
  getCustomerClassification,
  analyzePortfolio,
  recommendMarketingAllocation,
};
