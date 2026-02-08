/**
 * Centralized Model Constants & Assumptions
 *
 * This file contains all hardcoded values, assumptions, and benchmarks used
 * throughout the agency growth model. Centralizing these values ensures
 * consistency and makes assumptions explicit and auditable.
 *
 * Data Source: All Purpose Audit (Nov 14, 2025) - Derrick Bealer Agency A0C6581
 * Last Updated: 2025-11-21
 */

// =============================================================================
// AGENCY CURRENT STATE (From All Purpose Audit Nov 14, 2025)
// =============================================================================

export const AGENCY_AUDIT_DATA = {
  /** Snapshot date for all audit metrics */
  auditDate: '2025-11-14',

  /** Total policies in force from audit */
  totalPolicies: 1424,

  /** Unique customer count */
  totalCustomers: 876,

  /** Calculated: totalPolicies / totalCustomers */
  policiesPerCustomer: 1.63,

  /** Total 12-month written premium */
  totalWrittenPremium: 4218886,

  /** Calculated: totalWrittenPremium / totalPolicies */
  averagePremiumPerPolicy: 2963,

  /** Calculated: totalWrittenPremium / totalCustomers */
  averagePremiumPerCustomer: 4816,

  /** Actual retention from audit - VERIFIED */
  overallRetention: 0.8964,

  /** Product-specific retention (verified from audit) */
  umbrellaRetention: 0.9519,
  lifeRetention: 0.9909,
} as const;

// =============================================================================
// PRODUCT MIX (From All Purpose Audit)
// =============================================================================

export const PRODUCT_MIX = {
  /** Private Passenger (585) + Special (35) */
  auto: { count: 620, percentage: 43.5 },

  /** Homeowners (369) */
  homeowners: { count: 369, percentage: 25.9 },

  /** Renters (168) */
  renters: { count: 168, percentage: 11.8 },

  /** Condominiums (124) */
  condo: { count: 124, percentage: 8.7 },

  /** Personal Umbrella (74) */
  umbrella: { count: 74, percentage: 5.2 },

  /** Landlords (60) */
  landlords: { count: 60, percentage: 4.2 },

  /** Boat Owners (9) */
  boat: { count: 9, percentage: 0.6 },
} as const;

// =============================================================================
// PRODUCT PREMIUMS (From product_economics.csv)
// =============================================================================

export const PRODUCT_PREMIUMS = {
  /** Auto average premium - verified from data */
  auto: 2800,

  /** Homeowners average premium - verified from data */
  homeowners: 2963,

  /** Renters average premium - verified from data */
  renters: 175,

  /** Condo average premium - verified from data */
  condo: 746,

  /** Umbrella average premium - verified from data ($150-300 range) */
  umbrella: 225,

  /** Landlords/Dwelling Fire average premium */
  landlords: 1198,

  /** Boat average premium - verified from data */
  boat: 158,

  /** Commercial estimate (not in audit data) */
  commercial: 3500,

  /** Cyber estimate (not in audit data) */
  cyber: 2000,
} as const;

// =============================================================================
// ELIGIBLE PREMIUM FACTOR (Allstate-Specific)
// =============================================================================

/**
 * Agency bonus/commission revenue is calculated on "eligible written premium"
 * which is total written premium NET OF catastrophe reinsurance.
 *
 * Per 2025 Compensation FAQ (pages 19-20), eligible premium EXCLUDES:
 * - Flood
 * - Motor Club
 * - CA Earthquake
 * - HI Hurricane Relief
 * - Facility
 * - JUA
 * - Service Fee
 * - Ivantage
 * - North Light
 * - Life & Retirement products
 *
 * This factor has been calibrated to match Allstate's official agency bonus calculator.
 *
 * IMPORTANT: Only apply this factor to BONUS calculations, NOT to base commission
 * calculations for LTV. Base commission is paid on full premium.
 */
export const ELIGIBLE_PREMIUM_FACTOR = 0.474;

/**
 * Context for when to use ELIGIBLE_PREMIUM_FACTOR:
 * - Use for: Agency bonus calculations (PBR, PG bonuses)
 * - Do NOT use for: Base commission income, LTV calculations
 */

// =============================================================================
// COMMISSION RATES (2025 Allstate Structure)
// =============================================================================

export const COMMISSION_RATES = {
  /** New Business rates by product line */
  newBusiness: {
    auto: 0.16,        // 16% - from compensation2025.ts
    homeowners: 0.20,  // 20%
    condo: 0.20,       // 20%
    renters: 0.15,     // 15%
    umbrella: 0.18,    // 18%
    motorcycle: 0.14,  // 14%
    commercial: 0.12,  // 12%
    life: 0.25,        // 25%
  },

  /** Renewal rates (standard agents) */
  renewal: {
    auto: 0.025,       // 2.5%
    homeowners: 0.025, // 2.5%
    condo: 0.025,      // 2.5%
    renters: 0.020,    // 2.0%
    umbrella: 0.025,   // 2.5%
    motorcycle: 0.020, // 2.0%
    commercial: 0.020, // 2.0%
    life: 0.030,       // 3.0%
  },

  /** Renewal rates (Elite status) */
  renewalElite: {
    auto: 0.035,       // 3.5%
    homeowners: 0.035, // 3.5%
    condo: 0.035,      // 3.5%
    renters: 0.030,    // 3.0%
    umbrella: 0.035,   // 3.5%
    motorcycle: 0.025, // 2.5%
    commercial: 0.025, // 2.5%
    life: 0.040,       // 4.0%
  },

  /** Blended effective commission rate (base + avg bonus) */
  blendedEffective: 0.10, // 10% - 7% base + ~3% avg bonus
} as const;

// =============================================================================
// RETENTION BENCHMARKS
// =============================================================================

export const RETENTION_BENCHMARKS = {
  /**
   * Retention by policies-per-customer tier
   * Based on industry research: bundled customers retain significantly better
   */
  byBundling: {
    /** Single policy customers (1.0 PPC) - highest churn */
    monoline: 0.67,

    /** 1.5+ PPC - base bundled retention */
    bundled: 0.91,

    /** 1.8+ PPC - optimal bundling threshold */
    optimalBundled: 0.95,

    /** 3+ products - elite retention */
    elite: 0.97,
  },

  /** Derrick's actual retention rates (from audit) */
  actual: {
    overall: 0.8964,   // 89.64%
    umbrella: 0.9519,  // 95.19%
    life: 0.9909,      // 99.09%
  },

  /** Monthly churn calculation helpers */
  monthlyFromAnnual: (annualRetention: number) => Math.pow(annualRetention, 1/12),
  annualFromMonthly: (monthlyRetention: number) => Math.pow(monthlyRetention, 12),

  /** Derrick's observed churn: avg 3 policies/month (range 0-6) */
  derrickMonthlyPolicyChurn: {
    average: 3,
    min: 0,
    max: 6,
  },
} as const;

// =============================================================================
// POLICIES PER CUSTOMER THRESHOLDS
// =============================================================================

export const PPC_THRESHOLDS = {
  /** Below this = monoline customer, highest churn risk */
  monoline: 1.0,

  /** At or above this = bundled, good retention */
  bundled: 1.5,

  /** At or above this = optimal bundling, best retention */
  optimal: 1.8,

  /** Target for agency performance */
  target: 1.8,

  /** Derrick's current PPC */
  current: 1.63,

  /** Gap to optimal */
  gapToOptimal: 0.17, // 1.8 - 1.63
} as const;

// =============================================================================
// MARKETING CHANNEL METRICS
// =============================================================================

export const CHANNEL_METRICS = {
  referral: {
    costPerLead: 15,
    conversionRate: 0.08,  // 8% - trust factor, warm introduction
    policiesPerCustomer: 1.3, // Referrals bundle better
    description: 'Warm introductions from existing customers',
  },

  digital: {
    costPerLead: 30,
    conversionRate: 0.005, // 0.5% - internet leads, very low intent
    policiesPerCustomer: 1.0,
    description: 'Internet leads, robocalls - high volume, low quality',
  },

  liveTransfer: {
    costPerLead: 55,
    conversionRate: 0.10,  // 10% - pre-screened, on phone, ready to quote
    policiesPerCustomer: 1.0,
    description: 'Live transfers - Derrick\'s primary paid channel',
  },

  partnerships: {
    costPerLead: 25,
    conversionRate: 0.06,  // 6% - pre-qualified
    policiesPerCustomer: 1.1,
    description: 'Bank, realtor, and other business partnerships',
  },
} as const;

// =============================================================================
// CAPACITY & STAFFING BENCHMARKS
// =============================================================================

export const CAPACITY_BENCHMARKS = {
  /**
   * Producer capacity in annual premium managed
   * Derrick manages $4.2M solo - well above benchmark
   */
  producer: {
    withTech: 2500000,    // $2.5M premium per producer with E&O automation
    withoutTech: 2000000, // $2.0M premium per producer without tech
    derrickActual: 4218886, // Derrick's actual - proves tech enables more
  },

  /**
   * Admin capacity in policies supported
   * Based on paperwork/service workload
   */
  admin: {
    withTech: 1500,  // 1,500 policies per admin with automation
    withoutTech: 1000, // 1,000 policies per admin without
  },

  /** Service staff to producer ratio */
  staffingRatio: {
    optimal: 2.8,
    minimum: 2.0,
    maximum: 3.5,
  },

  /** Optimal capacity utilization before quality degrades */
  optimalUtilization: 0.80, // 80%

  /** Conversion/retention penalty when over-capacity */
  overCapacityPenalty: {
    maxPenalty: 0.10, // 10% max reduction
    penaltyRate: 0.15, // 15% per 10% over optimal
  },
} as const;

// =============================================================================
// TECHNOLOGY & RETENTION SYSTEM COSTS
// =============================================================================

export const TECH_COSTS = {
  /** E&O automation system - AMS, quoting tools */
  eoAutomation: {
    monthlyCost: 500,  // Updated from $200 - more realistic
    retentionBoost: 0.02, // +2% annual retention
    capacityBoost: 1.25, // 25% more capacity
  },

  /** Renewal/retention program - automated touchpoints */
  renewalProgram: {
    monthlyCost: 300,  // Updated from $150 - more realistic
    retentionBoost: 0.03, // +3% annual retention
  },

  /** Cross-sell program - product recommendations */
  crossSellProgram: {
    monthlyCost: 200,  // Updated from $100 - more realistic
    ppcBoost: 0.15, // +15% increase in policies per customer
  },

  /** Concierge service - white glove customer service */
  conciergeService: {
    monthlyCost: 500,  // Updated from $300 - more realistic
    retentionBoost: 0.02, // +2% annual retention
    referralBoost: 0.50, // +50% referral rate increase
  },

  /** Newsletter/email system */
  newsletterSystem: {
    monthlyCost: 200,  // Updated from $150
    retentionBoost: 0.015, // +1.5% annual retention
    referralBoost: 0.30, // +30% referral rate increase
  },
} as const;

// =============================================================================
// REFERRAL MODEL PARAMETERS
// =============================================================================

export const REFERRAL_PARAMS = {
  /**
   * Base annual referral rate (satisfied customers who refer)
   * Industry data suggests 5-10% for satisfied customers
   * Derrick at 89.64% retention = high satisfaction
   */
  baseAnnualRate: 0.05, // 5% - updated from 2% (too conservative)

  /** Monthly rate = annual / 12 */
  baseMonthlyRate: 0.05 / 12,

  /** Referral conversion rate */
  conversionRate: 0.35, // 35% - referrals convert much better

  /** Average referrals per referrer */
  avgReferralsPerReferrer: 1.4,

  /** Referral CAC vs paid lead CAC */
  cacComparison: {
    referralCac: 120,
    paidLeadCac: 550,
    savings: 0.78, // 78% CAC savings
  },
} as const;

// =============================================================================
// DIMINISHING RETURNS PARAMETERS
// =============================================================================

export const DIMINISHING_RETURNS = {
  /**
   * Marketing spend threshold before diminishing returns kick in
   * Based on market saturation and lead quality degradation
   */
  spendThreshold: 5000,

  /** Maximum efficiency penalty */
  maxPenalty: 0.30, // 30% reduction at high spend

  /**
   * Spend amount to reach max penalty
   * At $25,000/mo, efficiency is 70% of baseline
   */
  penaltyDenominator: 20000,

  /** Calculate efficiency multiplier */
  calculateEfficiency: (monthlySpend: number) => {
    if (monthlySpend <= 5000) return 1.0;
    return 1.0 - Math.min(0.30, (monthlySpend - 5000) / 20000);
  },
} as const;

// =============================================================================
// SCENARIO MULTIPLIERS
// =============================================================================

export const SCENARIO_MULTIPLIERS = {
  conservative: {
    conversionMultiplier: 0.85,  // 85% of base conversion
    retentionMultiplier: 1.0,    // Base retention
    description: '25th percentile performance',
  },

  moderate: {
    conversionMultiplier: 1.0,   // Base case
    retentionMultiplier: 1.0,    // Base retention
    description: '50th percentile (median) performance',
  },

  aggressive: {
    conversionMultiplier: 1.15,  // 115% of base conversion
    retentionMultiplier: 1.02,   // +2% retention boost
    description: '75th percentile performance',
  },
} as const;

// =============================================================================
// LTV CALCULATION PARAMETERS
// =============================================================================

export const LTV_PARAMS = {
  /** Maximum customer lifetime in years (cap for high retention) */
  maxLifetimeYears: 10,

  /**
   * Calculate lifetime years from annual retention
   * Formula: 1 / (1 - annual_retention)
   * Capped at maxLifetimeYears
   */
  calculateLifetimeYears: (annualRetention: number) => {
    if (annualRetention >= 1) return 10;
    const lifetime = 1 / (1 - annualRetention);
    return Math.min(lifetime, 10);
  },

  /**
   * LTV Calculation - DO NOT apply ELIGIBLE_PREMIUM_FACTOR here
   * LTV = PPC × Annual Premium × Base Commission Rate × Lifetime Years
   *
   * The eligible premium factor only affects BONUS calculations,
   * not the base commission the agency earns.
   */
  calculateLTV: (
    policiesPerCustomer: number,
    avgAnnualPremium: number,
    baseCommissionRate: number,
    lifetimeYears: number
  ) => {
    return policiesPerCustomer * avgAnnualPremium * baseCommissionRate * lifetimeYears;
  },

  /** LTV:CAC ratio benchmarks */
  benchmarks: {
    losingMoney: 1.0,
    acceptable: 3.0,
    good: 4.0,
    excellent: 5.0,
    underinvested: 5.0, // Above this may indicate under-investment in growth
  },
} as const;

// =============================================================================
// RULE OF 40 / RULE OF 20 METRICS
// =============================================================================

export const GROWTH_BENCHMARKS = {
  /**
   * Rule of 40 (SaaS standard): Growth Rate + Profit Margin = 40
   *
   * For insurance agencies, we use a modified "Rule of 20":
   * Score = Organic Growth % + (0.5 × EBITDA Margin %)
   *
   * The 0.5 multiplier weights profitability less heavily than growth
   * for agencies in growth mode.
   */
  ruleOf20: {
    topPerformer: 25,
    healthy: 20,
    needsImprovement: 15,
    atRisk: 10,
  },

  /** EBITDA margin targets */
  ebitdaMargin: {
    excellent: 0.30, // 30%
    target: 0.25,    // 25%
    acceptable: 0.20, // 20%
  },

  /** Revenue per employee targets */
  revenuePerEmployee: {
    excellent: 300000,
    good: 200000,
    acceptable: 150000,
  },
} as const;

// =============================================================================
// SALES RAMP PARAMETERS
// =============================================================================

export const SALES_RAMP = {
  /**
   * Months for new sales hire to reach full productivity
   * Uses S-curve model: slow start, rapid improvement, plateau
   */
  rampMonths: 3,

  /**
   * S-curve ramp factor calculation
   * More realistic than linear ramp
   */
  calculateRampFactor: (month: number, rampMonths: number = 3) => {
    if (month >= rampMonths) return 1.0;
    // S-curve: slower at start and end, faster in middle
    const t = month / rampMonths;
    return t * t * (3 - 2 * t); // Smoothstep function
  },

  /** Linear ramp (legacy, less realistic) */
  calculateLinearRamp: (month: number, rampMonths: number = 3) => {
    return month < rampMonths ? month / rampMonths : 1.0;
  },
} as const;

// =============================================================================
// EXPORT ALL CONSTANTS
// =============================================================================

export const MODEL_CONSTANTS = {
  AGENCY_AUDIT_DATA,
  PRODUCT_MIX,
  PRODUCT_PREMIUMS,
  ELIGIBLE_PREMIUM_FACTOR,
  COMMISSION_RATES,
  RETENTION_BENCHMARKS,
  PPC_THRESHOLDS,
  CHANNEL_METRICS,
  CAPACITY_BENCHMARKS,
  TECH_COSTS,
  REFERRAL_PARAMS,
  DIMINISHING_RETURNS,
  SCENARIO_MULTIPLIERS,
  LTV_PARAMS,
  GROWTH_BENCHMARKS,
  SALES_RAMP,
} as const;

export default MODEL_CONSTANTS;
