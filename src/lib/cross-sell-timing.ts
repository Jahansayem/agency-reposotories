/**
 * Cross-Sell Timing Optimizer
 *
 * EXACT PORT from Python bealer-lead-model/src/cross_sell_timing_model.py
 *
 * Purpose:
 * - Determine best timing for cross-sell offers (30/60/90 days after initial sale)
 * - Optimize product sequence (auto → home → umbrella → life)
 * - Score customer readiness for additional products
 * - Calculate retention lift from multi-product households
 * - Project LTV increase from cross-sell success
 *
 * Critical Insight for Derrick's Agency:
 * - Current retention: 89.64% overall
 * - Umbrella retention: 95.19% (+10pts vs auto/home)
 * - Life retention: 99.09% (+14pts vs auto/home!)
 * - Multi-product households have 25% higher retention
 * - Each customer upgraded from 1→2 products = $4,500 additional LTV
 * - Target: Increase avg products/customer from ~1.3 to 1.8+
 *
 * Opportunity: 450 single-product customers × 15% conversion = 68 upgrades = $306k LTV gain
 *
 * Source: bealer-lead-model/src/cross_sell_timing_model.py
 */

// ============================================
// Types (Source: lines 29-78)
// ============================================

/**
 * Insurance product types
 * Source: cross_sell_timing_model.py lines 29-38
 */
export type ProductType =
  | 'auto'
  | 'home'
  | 'umbrella'
  | 'life'
  | 'flood'
  | 'motorcycle'
  | 'rv'
  | 'boat';

/**
 * Customer segments based on product count
 * Source: cross_sell_timing_model.py lines 41-45
 */
export type CustomerSegment =
  | 'standard'   // 1 product (72% retention)
  | 'premium'    // 2 products (91% retention)
  | 'elite';     // 3+ products (97% retention)

/**
 * Confidence level for timing analysis
 * Source: cross_sell_timing_model.py line 78
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Represents a cross-sell opportunity for a specific customer
 * Source: cross_sell_timing_model.py lines 48-59
 */
export interface CrossSellOpportunity {
  customerId: string;
  currentProducts: ProductType[];
  recommendedProduct: ProductType;
  priorityScore: number;          // 0-100
  optimalTimingDays: number;
  expectedConversionRate: number;
  ltvIncrease: number;
  retentionLift: number;
  reasoning: string;
}

/**
 * Optimal product sequence for cross-selling
 * Source: cross_sell_timing_model.py lines 62-68
 */
export interface ProductSequence {
  sequence: ProductType[];
  avgConversionRate: number;
  avgTimeBetweenProductsDays: number;
  totalLtvPotential: number;
}

/**
 * Analysis of cross-sell timing effectiveness
 * Source: cross_sell_timing_model.py lines 71-78
 */
export interface TimingAnalysis {
  daysSinceInitial: number;
  conversionRate: number;
  avgLtv: number;
  sampleSize: number;
  confidence: ConfidenceLevel;
}

/**
 * Customer characteristics for opportunity scoring
 */
export interface CustomerCharacteristics {
  homeowner?: boolean;
  highCoverage?: boolean;
  age?: number;
  income?: number;
}

/**
 * Historical data record for timing analysis
 */
export interface HistoricalDataRecord {
  daysSinceInitial: number;
  converted: boolean;
  ltv: number;
}

/**
 * Customer portfolio entry
 */
export interface CustomerPortfolioEntry {
  customerId: string;
  products: ProductType[];
  daysSinceLastPurchase?: number;
  characteristics?: CustomerCharacteristics;
}

/**
 * Segment analysis within portfolio
 */
export interface SegmentAnalysisResult {
  customerCount: number;
  avgConversionRate: number;
  expectedConversions: number;
  ltvOpportunity: number;
  priorityOpportunities: CrossSellOpportunity[];
}

/**
 * Full portfolio analysis result
 */
export interface PortfolioAnalysisResult {
  totalCustomers: number;
  totalOpportunities: number;
  totalLtvOpportunity: number;
  segmentBreakdown: Record<string, SegmentAnalysisResult>;
  topOpportunities: CrossSellOpportunity[];
  keyInsights: string[];
}

/**
 * Retention lift value calculation result
 */
export interface RetentionLiftValue {
  currentSegment: CustomerSegment;
  targetSegment: CustomerSegment;
  customerCount: number;
  currentRetention: number;
  targetRetention: number;
  retentionLift: number;
  retentionLiftPercentagePoints: number;
  customersSavedAnnually: number;
  retentionLiftValue: number;
  additionalAnnualRevenue: number;
  totalAnnualValue: number;
  recommendation: string;
}

// ============================================
// Constants (Source: lines 84-153)
// ============================================

/**
 * Industry-standard conversion rates by timing (days after initial sale)
 * Source: cross_sell_timing_model.py lines 89-96
 */
export const TIMING_CONVERSION_RATES: Record<number, number> = {
  30: 0.15,   // Too soon - customer still onboarding
  60: 0.22,   // OPTIMAL - customer satisfied, trust established
  90: 0.18,   // Good - customer settled
  120: 0.12,  // Declining - momentum lost
  180: 0.08,  // Low - customer relationship cooling
  365: 0.05,  // Very low - effectively cold lead
};

/**
 * Product-specific conversion rates (from existing customer base)
 * Source: cross_sell_timing_model.py lines 99-113
 */
export const PRODUCT_CONVERSION_RATES: Record<string, number> = {
  // From single product
  'auto->home': 0.22,       // High (bundling)
  'auto->umbrella': 0.12,   // Medium (wealth indicator)
  'auto->life': 0.08,       // Lower (different category)
  'home->auto': 0.25,       // High (bundling)
  'home->umbrella': 0.18,   // Medium-high (wealth)
  'home->flood': 0.15,      // Medium (location-dependent)

  // From two products (higher baseline trust)
  'auto,home->umbrella': 0.35,  // High
  'auto,home->life': 0.20,      // Medium
  'auto,umbrella->life': 0.25,  // Medium-high
  'home,umbrella->life': 0.28,  // Medium-high
};

/**
 * Retention by product count (from Derrick's actual data)
 * Source: cross_sell_timing_model.py lines 116-121
 */
export const RETENTION_BY_PRODUCT_COUNT: Record<number, number> = {
  1: 0.72,   // Standard customers (single product)
  2: 0.91,   // Premium customers (19pt lift!)
  3: 0.97,   // Elite customers (25pt lift!)
  4: 0.98,   // Super-elite (26pt lift)
};

/**
 * Product-specific retention rates (from Derrick's actual data)
 * Source: cross_sell_timing_model.py lines 124-129
 */
export const PRODUCT_RETENTION_RATES: Record<ProductType, number> = {
  auto: 0.8519,
  home: 0.8491,
  umbrella: 0.9519,   // EXCEPTIONAL - 10pts above auto/home
  life: 0.9909,       // OUTSTANDING - almost perfect retention
  flood: 0.85,        // Default estimate
  motorcycle: 0.80,   // Default estimate
  rv: 0.82,           // Default estimate
  boat: 0.80,         // Default estimate
};

/**
 * Product-specific average premiums (industry benchmarks)
 * Source: cross_sell_timing_model.py lines 132-141
 */
export const PRODUCT_AVG_PREMIUMS: Record<ProductType, number> = {
  auto: 1200,
  home: 1500,
  umbrella: 500,
  life: 800,
  flood: 600,
  motorcycle: 400,
  rv: 800,
  boat: 450,
};

/**
 * Commission rates by product
 * Source: cross_sell_timing_model.py lines 144-153
 */
export const COMMISSION_RATES: Record<ProductType, number> = {
  auto: 0.07,
  home: 0.07,
  umbrella: 0.07,
  life: 0.55,        // Much higher for life insurance
  flood: 0.15,
  motorcycle: 0.07,
  rv: 0.07,
  boat: 0.07,
};

// ============================================
// Timing Functions (Source: lines 155-223)
// ============================================

/**
 * Calculate optimal timing for cross-sell based on historical data
 *
 * Source: cross_sell_timing_model.py lines 155-223
 *
 * @param historicalData - Optional list of historical cross-sell data
 * @returns Dict mapping days to TimingAnalysis
 */
export function calculateOptimalTiming(
  historicalData?: HistoricalDataRecord[]
): Record<number, TimingAnalysis> {
  // Source: lines 168-184
  if (!historicalData) {
    // Use default industry benchmarks
    const timingAnalysis: Record<number, TimingAnalysis> = {};

    for (const [daysStr, conversionRate] of Object.entries(TIMING_CONVERSION_RATES)) {
      const days = parseInt(daysStr, 10);
      // Earlier conversions tend to have higher LTV (more engaged customers)
      const baseLtv = 9000;
      const ltvMultiplier = days === 60 ? 1.0 : days === 90 ? 0.95 : 0.90;

      timingAnalysis[days] = {
        daysSinceInitial: days,
        conversionRate,
        avgLtv: baseLtv * ltvMultiplier,
        sampleSize: 100,  // Placeholder
        confidence: 'medium',
      };
    }
    return timingAnalysis;
  }

  // Source: lines 186-222 - Analyze actual historical data
  // Group by timing buckets
  const timingBuckets: Record<number, HistoricalDataRecord[]> = {
    30: [],
    60: [],
    90: [],
    120: [],
    180: [],
    365: [],
  };

  for (const record of historicalData) {
    const days = record.daysSinceInitial;
    // Assign to nearest bucket
    const bucketKeys = Object.keys(timingBuckets).map(Number);
    const bucket = bucketKeys.reduce((prev, curr) =>
      Math.abs(curr - days) < Math.abs(prev - days) ? curr : prev
    );
    timingBuckets[bucket].push(record);
  }

  const timingAnalysis: Record<number, TimingAnalysis> = {};

  for (const [daysStr, records] of Object.entries(timingBuckets)) {
    const days = parseInt(daysStr, 10);
    if (records.length === 0) {
      continue;
    }

    const conversions = records.filter(r => r.converted).length;
    const conversionRate = records.length > 0 ? conversions / records.length : 0;

    const ltvs = records.filter(r => r.ltv > 0).map(r => r.ltv);
    const avgLtv = ltvs.length > 0 ? ltvs.reduce((a, b) => a + b, 0) / ltvs.length : 0;

    // Confidence based on sample size
    let confidence: ConfidenceLevel;
    if (records.length >= 50) {
      confidence = 'high';
    } else if (records.length >= 20) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    timingAnalysis[days] = {
      daysSinceInitial: days,
      conversionRate,
      avgLtv,
      sampleSize: records.length,
      confidence,
    };
  }

  return timingAnalysis;
}

// ============================================
// Product Identification Functions (Source: lines 225-352)
// ============================================

/**
 * Identify the next best product to cross-sell
 *
 * Source: cross_sell_timing_model.py lines 225-352
 *
 * @param currentProducts - List of products customer already has
 * @param customerCharacteristics - Optional dict with customer info
 * @returns Tuple of [recommended_product, conversion_rate, reasoning]
 */
export function identifyNextProduct(
  currentProducts: ProductType[],
  customerCharacteristics?: CustomerCharacteristics
): [ProductType, number, string] {
  // Source: lines 241-280 - Define product sequence strategies for single-product customers
  if (currentProducts.length === 1) {
    const baseProduct = currentProducts[0];

    if (baseProduct === 'auto') {
      // Auto-only customers → recommend HOME (high bundling rate)
      // UNLESS they rent (then recommend UMBRELLA or LIFE)
      if (customerCharacteristics?.homeowner) {
        return [
          'home',
          0.22,
          'Bundling auto + home increases retention by 19pts (72% → 91%)',
        ];
      } else {
        return [
          'umbrella',
          0.12,
          'Umbrella adds wealth protection and has 95% retention',
        ];
      }
    } else if (baseProduct === 'home') {
      return [
        'auto',
        0.25,
        'Bundling home + auto increases retention by 19pts and saves customer 15-25%',
      ];
    } else if (baseProduct === 'umbrella') {
      // Umbrella-only is rare, but high-net-worth indicator
      return [
        'home',
        0.20,
        'Umbrella customer likely homeowner - recommend home insurance',
      ];
    } else if (baseProduct === 'life') {
      return [
        'auto',
        0.18,
        'Life customer shows risk awareness - recommend auto for bundling',
      ];
    }
  }

  // Source: lines 282-324 - Two-product customers → recommend UMBRELLA or LIFE
  if (currentProducts.length === 2) {
    const hasAuto = currentProducts.includes('auto');
    const hasHome = currentProducts.includes('home');
    const hasUmbrella = currentProducts.includes('umbrella');
    // const hasLife = currentProducts.includes('life');

    if (hasAuto && hasHome) {
      // Perfect bundle - recommend UMBRELLA for wealth protection
      if (customerCharacteristics?.highCoverage) {
        return [
          'umbrella',
          0.35,
          'Auto+Home bundle with high coverage → Umbrella (95% retention, 97% total)',
        ];
      } else {
        return [
          'life',
          0.20,
          'Auto+Home bundle → Life insurance (99% retention!)',
        ];
      }
    } else if (hasAuto && hasUmbrella) {
      return [
        'life',
        0.25,
        'Umbrella customer shows wealth - Life insurance fits profile (99% retention)',
      ];
    } else if (hasHome && hasUmbrella) {
      return [
        'life',
        0.28,
        'Home+Umbrella → Life completes wealth protection suite',
      ];
    } else if (hasAuto && currentProducts.includes('life')) {
      return [
        'home',
        0.22,
        'Auto+Life → Add Home for complete bundle',
      ];
    }
  }

  // Source: lines 325-349 - Elite customers - identify missing products
  if (currentProducts.length >= 3) {
    const existing = new Set(currentProducts);
    const coreProducts: ProductType[] = ['auto', 'home', 'umbrella', 'life'];
    const missing = coreProducts.filter(p => !existing.has(p));

    if (missing.length > 0) {
      // Recommend highest-value missing product
      const priorityOrder: ProductType[] = ['life', 'umbrella', 'home', 'auto'];
      for (const product of priorityOrder) {
        if (missing.includes(product)) {
          return [
            product,
            0.40,  // High conversion for elite customers
            `Elite customer (3+ products) - Complete portfolio with ${product}`,
          ];
        }
      }
    }

    // All core products covered - recommend specialty
    const specialtyProducts: ProductType[] = ['motorcycle', 'rv', 'boat', 'flood'];
    for (const specialty of specialtyProducts) {
      if (!existing.has(specialty)) {
        return [
          specialty,
          0.15,  // Lower but still valuable
          `Elite customer - Consider specialty coverage (${specialty})`,
        ];
      }
    }
  }

  // Source: line 352 - Default: Recommend HOME (highest average value)
  return ['home', 0.18, 'Default recommendation: Home insurance'];
}

// ============================================
// Timing Multiplier (Source: lines 432-445)
// ============================================

/**
 * Get timing multiplier based on days since last purchase
 *
 * Source: cross_sell_timing_model.py lines 432-445
 */
export function getTimingMultiplier(daysSinceLast: number): number {
  if (daysSinceLast <= 30) {
    return 0.68;  // 30-day bucket: 15% × 0.68 ≈ optimal
  } else if (daysSinceLast <= 60) {
    return 1.00;  // OPTIMAL window
  } else if (daysSinceLast <= 90) {
    return 0.82;  // Still good
  } else if (daysSinceLast <= 120) {
    return 0.55;  // Declining
  } else if (daysSinceLast <= 180) {
    return 0.36;  // Low
  } else {
    return 0.23;  // Very low
  }
}

// ============================================
// Cross-Sell Opportunity Calculation (Source: lines 354-430)
// ============================================

/**
 * Calculate comprehensive cross-sell opportunity for a customer
 *
 * Source: cross_sell_timing_model.py lines 354-430
 *
 * @param customerId - Customer identifier
 * @param currentProducts - Products customer currently has
 * @param daysSinceLastPurchase - Days since last policy purchase
 * @param customerCharacteristics - Optional customer data
 * @returns CrossSellOpportunity with recommendation
 */
export function calculateCrossSellOpportunity(
  customerId: string,
  currentProducts: ProductType[],
  daysSinceLastPurchase: number,
  customerCharacteristics?: CustomerCharacteristics
): CrossSellOpportunity {
  // Source: lines 374-377 - Identify next product
  const [recommendedProduct, baseConversionRate, reasoning] = identifyNextProduct(
    currentProducts,
    customerCharacteristics
  );

  // Source: lines 379-381 - Adjust conversion rate based on timing
  const timingMultiplier = getTimingMultiplier(daysSinceLastPurchase);
  const expectedConversionRate = baseConversionRate * timingMultiplier;

  // Source: lines 383-389 - Calculate optimal timing (if not already at optimal)
  let optimalTimingDays: number;
  if (daysSinceLastPurchase < 60) {
    optimalTimingDays = 60 - daysSinceLastPurchase;
  } else if (daysSinceLastPurchase > 90) {
    optimalTimingDays = 0;  // Contact now, momentum fading
  } else {
    optimalTimingDays = 0;  // Already in optimal window
  }

  // Source: lines 391-403 - Calculate LTV increase
  const currentProductCount = currentProducts.length;
  const newProductCount = currentProductCount + 1;

  const currentRetention = RETENTION_BY_PRODUCT_COUNT[currentProductCount] ?? 0.72;
  const newRetention = RETENTION_BY_PRODUCT_COUNT[newProductCount] ?? 0.97;

  // LTV = (Annual Premium × Commission Rate) × (1 / (1 - Retention))
  // Simplified: Use avg premium and retention lift
  const currentLtv = currentRetention < 1
    ? 4500 * (1 / (1 - currentRetention))
    : 4500 * 10;
  const newLtv = newRetention < 1
    ? (4500 + (PRODUCT_AVG_PREMIUMS[recommendedProduct] ?? 1000)) * (1 / (1 - newRetention))
    : 50000;

  const ltvIncrease = newLtv - currentLtv;
  const retentionLift = newRetention - currentRetention;

  // Source: lines 405-418 - Calculate priority score (0-100)
  // Factors: timing (40%), expected conversion (30%), LTV increase (20%), retention lift (10%)
  let timingScore: number;
  if (daysSinceLastPurchase >= 60 && daysSinceLastPurchase <= 90) {
    timingScore = 100;
  } else if (daysSinceLastPurchase >= 30 && daysSinceLastPurchase <= 120) {
    timingScore = 70;
  } else {
    timingScore = 40;
  }

  const conversionScore = expectedConversionRate * 100;
  const ltvScore = Math.min(100, (ltvIncrease / 10000) * 100);
  const retentionScore = (retentionLift / 0.25) * 100;  // 0.25 = max lift (1 prod → 3 prod)

  const priorityScore =
    timingScore * 0.40 +
    conversionScore * 0.30 +
    ltvScore * 0.20 +
    retentionScore * 0.10;

  return {
    customerId,
    currentProducts,
    recommendedProduct,
    priorityScore,
    optimalTimingDays,
    expectedConversionRate,
    ltvIncrease,
    retentionLift,
    reasoning,
  };
}

// ============================================
// Portfolio Analysis (Source: lines 447-528)
// ============================================

/**
 * Analyze entire customer portfolio for cross-sell opportunities
 *
 * Source: cross_sell_timing_model.py lines 447-528
 *
 * @param customerPortfolio - List of customers with current products
 * @returns Portfolio-level insights and prioritized opportunities
 */
export function analyzePortfolioOpportunities(
  customerPortfolio: CustomerPortfolioEntry[]
): PortfolioAnalysisResult {
  const opportunities: CrossSellOpportunity[] = [];
  const segmentBreakdown: Record<CustomerSegment, CustomerPortfolioEntry[]> = {
    standard: [],
    premium: [],
    elite: [],
  };

  // Source: lines 476-496 - Classify and calculate opportunities
  for (const customer of customerPortfolio) {
    // Classify customer segment
    const productCount = customer.products.length;
    let segment: CustomerSegment;
    if (productCount === 1) {
      segment = 'standard';
    } else if (productCount === 2) {
      segment = 'premium';
    } else {
      segment = 'elite';
    }

    segmentBreakdown[segment].push(customer);

    // Calculate opportunity
    const opportunity = calculateCrossSellOpportunity(
      customer.customerId,
      customer.products,
      customer.daysSinceLastPurchase ?? 65,
      customer.characteristics
    );

    opportunities.push(opportunity);
  }

  // Sort by priority score
  opportunities.sort((a, b) => b.priorityScore - a.priorityScore);

  // Source: lines 502-503 - Calculate portfolio-level metrics
  const totalLtvOpportunity = opportunities.reduce(
    (sum, opp) => sum + opp.expectedConversionRate * opp.ltvIncrease,
    0
  );

  // Source: lines 505-519 - Segment-specific analysis
  const segmentAnalysis: Record<string, SegmentAnalysisResult> = {};

  for (const [segment, customers] of Object.entries(segmentBreakdown)) {
    const targetProductCount = segment === 'standard' ? 1 : segment === 'premium' ? 2 : 3;
    const segmentOpps = opportunities.filter(
      opp => opp.currentProducts.length === targetProductCount
    );

    const avgConversion = segmentOpps.length > 0
      ? segmentOpps.reduce((sum, opp) => sum + opp.expectedConversionRate, 0) / segmentOpps.length
      : 0;
    const expectedConversions = segmentOpps.reduce(
      (sum, opp) => sum + opp.expectedConversionRate,
      0
    );
    const segmentLtvOpportunity = segmentOpps.reduce(
      (sum, opp) => sum + opp.expectedConversionRate * opp.ltvIncrease,
      0
    );

    segmentAnalysis[segment] = {
      customerCount: customers.length,
      avgConversionRate: avgConversion,
      expectedConversions,
      ltvOpportunity: segmentLtvOpportunity,
      priorityOpportunities: segmentOpps.slice(0, 10),  // Top 10
    };
  }

  // Generate insights
  const keyInsights = generateInsights(segmentBreakdown, opportunities);

  return {
    totalCustomers: customerPortfolio.length,
    totalOpportunities: opportunities.length,
    totalLtvOpportunity,
    segmentBreakdown: segmentAnalysis,
    topOpportunities: opportunities.slice(0, 50),  // Top 50 overall
    keyInsights,
  };
}

// ============================================
// Insights Generation (Source: lines 530-579)
// ============================================

/**
 * Generate actionable insights from portfolio analysis
 *
 * Source: cross_sell_timing_model.py lines 530-579
 */
function generateInsights(
  segmentBreakdown: Record<CustomerSegment, CustomerPortfolioEntry[]>,
  opportunities: CrossSellOpportunity[]
): string[] {
  const insights: string[] = [];

  // Source: lines 539-546 - Insight 1: Single-product opportunity
  const singleCount = segmentBreakdown.standard.length;
  if (singleCount > 0) {
    const expectedConverts = Math.floor(singleCount * 0.15);  // Conservative 15% conversion
    const ltvGain = expectedConverts * 4500;
    insights.push(
      `${singleCount} single-product customers → ${expectedConverts} expected conversions ` +
      `= $${ltvGain.toLocaleString()} LTV gain + 19pt retention lift`
    );
  }

  // Source: lines 548-555 - Insight 2: Two-product → Elite opportunity
  const twoProductCount = segmentBreakdown.premium.length;
  if (twoProductCount > 0) {
    const expectedConverts = Math.floor(twoProductCount * 0.25);  // Higher conversion for engaged customers
    insights.push(
      `${twoProductCount} two-product customers → ${expectedConverts} expected elite upgrades ` +
      `(97% retention target)`
    );
  }

  // Source: lines 557-563 - Insight 3: Umbrella opportunity
  const umbrellaOpps = opportunities.filter(opp => opp.recommendedProduct === 'umbrella');
  if (umbrellaOpps.length > 0) {
    insights.push(
      `${umbrellaOpps.length} umbrella opportunities (95% retention product!) ` +
      `- prioritize high-coverage auto+home bundles`
    );
  }

  // Source: lines 565-571 - Insight 4: Life insurance opportunity
  const lifeOpps = opportunities.filter(opp => opp.recommendedProduct === 'life');
  if (lifeOpps.length > 0) {
    insights.push(
      `${lifeOpps.length} life insurance opportunities (99% retention!) ` +
      `- highest retention product in portfolio`
    );
  }

  // Source: lines 573-578 - Insight 5: Timing urgency
  const urgentOpps = opportunities.filter(
    opp => opp.optimalTimingDays === 0 && opp.priorityScore > 60
  );
  if (urgentOpps.length > 0) {
    insights.push(
      `${urgentOpps.length} opportunities in optimal timing window - contact immediately`
    );
  }

  return insights;
}

// ============================================
// Retention Lift Value Calculation (Source: lines 582-647)
// ============================================

/**
 * Calculate the value of moving customers up segments via cross-sell
 *
 * Source: cross_sell_timing_model.py lines 582-647
 *
 * @param currentSegment - Current customer segment
 * @param targetSegment - Target segment after cross-sell
 * @param customerCount - Number of customers to upgrade
 * @param avgAnnualPremium - Average annual premium per customer
 * @returns Retention lift value metrics
 */
export function calculateRetentionLiftValue(
  currentSegment: CustomerSegment,
  targetSegment: CustomerSegment,
  customerCount: number,
  avgAnnualPremium: number = 3000
): RetentionLiftValue {
  // Source: lines 601-606 - Get retention rates
  const currentProducts = currentSegment === 'standard' ? 1 : 2;
  const targetProducts = targetSegment === 'premium' ? 2 : 3;

  const currentRetention = RETENTION_BY_PRODUCT_COUNT[currentProducts];
  const targetRetention = RETENTION_BY_PRODUCT_COUNT[targetProducts];

  const retentionLift = targetRetention - currentRetention;

  // Source: lines 608-620 - Calculate customers saved annually
  // Current: Lose (1 - current_retention) × customer_count customers/year
  // Target: Lose (1 - target_retention) × customer_count customers/year
  const currentAnnualChurn = (1 - currentRetention) * customerCount;
  const targetAnnualChurn = (1 - targetRetention) * customerCount;
  const customersSaved = currentAnnualChurn - targetAnnualChurn;

  // Value of saved customers (LTV)
  // LTV = Annual Premium × (1 / (1 - Retention))
  const avgLtv = avgAnnualPremium * (1 / (1 - currentRetention));
  const retentionLiftValue = customersSaved * avgLtv;

  // Source: lines 622-630 - Also calculate revenue impact from additional products
  // Moving from 1→2 products adds ~$1,500 premium (home or umbrella)
  // Moving from 2→3 products adds ~$500-800 premium (umbrella or life)
  let additionalPremiumPerCustomer: number;
  if (targetProducts === 2) {
    additionalPremiumPerCustomer = 1500;
  } else {
    additionalPremiumPerCustomer = 650;
  }

  const additionalAnnualRevenue = customerCount * additionalPremiumPerCustomer * 0.07;  // 7% commission

  return {
    currentSegment,
    targetSegment,
    customerCount,
    currentRetention,
    targetRetention,
    retentionLift,
    retentionLiftPercentagePoints: retentionLift * 100,
    customersSavedAnnually: customersSaved,
    retentionLiftValue,
    additionalAnnualRevenue,
    totalAnnualValue: retentionLiftValue + additionalAnnualRevenue,
    recommendation:
      `Upgrading ${customerCount} customers from ${currentSegment} → ${targetSegment} ` +
      `saves ${Math.round(customersSaved)} customers/year ($${Math.round(retentionLiftValue).toLocaleString()} value) ` +
      `+ $${Math.round(additionalAnnualRevenue).toLocaleString()} new revenue`,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the optimal timing day with the highest conversion rate
 */
export function getOptimalTimingDay(
  timingAnalysis?: Record<number, TimingAnalysis>
): { day: number; conversionRate: number } {
  const analysis = timingAnalysis ?? calculateOptimalTiming();

  let optimalDay = 60;
  let highestConversion = 0;

  for (const [dayStr, data] of Object.entries(analysis)) {
    if (data.conversionRate > highestConversion) {
      highestConversion = data.conversionRate;
      optimalDay = parseInt(dayStr, 10);
    }
  }

  return { day: optimalDay, conversionRate: highestConversion };
}

/**
 * Check if a customer is in the optimal timing window for cross-sell
 */
export function isInOptimalTimingWindow(daysSincePurchase: number): boolean {
  return daysSincePurchase >= 60 && daysSincePurchase <= 90;
}

/**
 * Get product conversion rate for a specific transition
 */
export function getProductConversionRate(
  fromProducts: ProductType[],
  toProduct: ProductType
): number {
  // Build the key for lookup
  if (fromProducts.length === 1) {
    const key = `${fromProducts[0]}->${toProduct}`;
    return PRODUCT_CONVERSION_RATES[key] ?? 0.15;  // Default fallback
  } else if (fromProducts.length === 2) {
    const sortedFrom = [...fromProducts].sort().join(',');
    const key = `${sortedFrom}->${toProduct}`;
    return PRODUCT_CONVERSION_RATES[key] ?? 0.20;  // Default for 2-product customers
  }
  return 0.30;  // Default for 3+ product customers (high trust)
}

/**
 * Calculate expected LTV for a product upgrade path
 */
export function calculateUpgradePathLtv(
  currentProducts: ProductType[],
  upgradePath: ProductType[]
): number {
  let totalLtv = 0;
  let products = [...currentProducts];

  for (const nextProduct of upgradePath) {
    const productCount = products.length + 1;
    const retention = RETENTION_BY_PRODUCT_COUNT[productCount] ?? 0.97;
    const premium = PRODUCT_AVG_PREMIUMS[nextProduct] ?? 1000;
    const commission = COMMISSION_RATES[nextProduct] ?? 0.07;

    // LTV contribution from this product
    const productLtv = retention < 1
      ? (premium * commission) * (1 / (1 - retention))
      : (premium * commission) * 20;

    totalLtv += productLtv;
    products.push(nextProduct);
  }

  return totalLtv;
}

// ============================================
// Default Export
// ============================================

export default {
  // Constants
  TIMING_CONVERSION_RATES,
  PRODUCT_CONVERSION_RATES,
  RETENTION_BY_PRODUCT_COUNT,
  PRODUCT_RETENTION_RATES,
  PRODUCT_AVG_PREMIUMS,
  COMMISSION_RATES,

  // Core Functions
  calculateOptimalTiming,
  identifyNextProduct,
  getTimingMultiplier,
  calculateCrossSellOpportunity,
  analyzePortfolioOpportunities,
  calculateRetentionLiftValue,

  // Helper Functions
  getOptimalTimingDay,
  isInOptimalTimingWindow,
  getProductConversionRate,
  calculateUpgradePathLtv,
};
