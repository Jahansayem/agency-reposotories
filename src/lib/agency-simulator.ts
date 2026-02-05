/**
 * Agency Growth Simulator v3.0
 *
 * EXACT PORT from Python bealer-lead-model/src/agency_simulator_v3.py
 *
 * Enhanced with comprehensive industry benchmarks and analytics
 *
 * Features:
 * - Marketing channel-specific modeling
 * - Staffing ratio optimization (2.8:1 service:producer)
 * - Revenue per employee tracking
 * - Technology investment ROI
 * - Bundling dynamics (1.8 policies per customer threshold)
 * - Commission structure comparisons
 * - EBITDA and Rule of 20 calculations
 * - LTV:CAC ratio benchmarking
 * - High-ROI investment modeling
 *
 * Source: bealer-lead-model/src/agency_simulator_v3.py
 */

// ============================================================================
// ENUMS & CONSTANTS
// Source: agency_simulator_v3.py lines 24-37
// ============================================================================

/**
 * Agency type enum
 * Source: agency_simulator_v3.py lines 28-31
 */
export type AgencyType = 'independent' | 'captive' | 'hybrid';

/**
 * Growth stage enum
 * Source: agency_simulator_v3.py lines 34-37
 */
export type GrowthStage = 'mature' | 'growth';

// ============================================================================
// TYPES - MARKETING
// Source: agency_simulator_v3.py lines 39-134
// ============================================================================

/**
 * Marketing channel with specific performance characteristics
 * Source: agency_simulator_v3.py lines 44-58
 */
export interface MarketingChannel {
  /** Channel name */
  name: string;
  /** Dollar amount allocated monthly */
  monthlyAllocation: number;
  /** Cost per lead in dollars */
  costPerLead: number;
  /** Lead to policy conversion rate (0-1) */
  conversionRate: number;
  /** Quality score (1-10 scale) */
  qualityScore: number;
}

/**
 * Complete marketing channel mix with benchmarks
 * Source: agency_simulator_v3.py lines 62-134
 */
export interface MarketingMix {
  /** Referral program channel */
  referral: MarketingChannel;
  /** Digital (Google/Facebook) channel */
  digital: MarketingChannel;
  /** Traditional marketing channel */
  traditional: MarketingChannel;
  /** Strategic partnerships channel */
  partnerships: MarketingChannel;
}

// ============================================================================
// TYPES - STAFFING
// Source: agency_simulator_v3.py lines 136-226
// ============================================================================

/**
 * Staffing model with industry benchmarks
 * Source: agency_simulator_v3.py lines 141-226
 */
export interface StaffingModel {
  /** Number of producers */
  producers: number;
  /** Number of service staff (benchmark: 2.8 per producer) */
  serviceStaff: number;
  /** Number of admin staff */
  adminStaff: number;
  /** Producer average annual compensation */
  producerAvgComp: number;
  /** Service staff average annual compensation */
  serviceStaffAvgComp: number;
  /** Admin staff average annual compensation */
  adminStaffAvgComp: number;
  /** Benefits multiplier (1.3 = 30% overhead) */
  benefitsMultiplier: number;
  /** Supported producer accounts per week (with support staff) */
  supportedProducerAccountsPerWeek: number;
  /** Unsupported producer accounts per week (without - 4x worse) */
  unsupportedProducerAccountsPerWeek: number;
  /** Revenue per employee target minimum */
  rpeTargetMin: number;
  /** Revenue per employee target good */
  rpeTargetGood: number;
  /** Revenue per employee target excellent */
  rpeTargetExcellent: number;
}

/**
 * Revenue per employee evaluation result
 * Source: agency_simulator_v3.py lines 198-226
 */
export interface RpeEvaluation {
  rpe: number;
  rating: string;
  status: 'excellent' | 'good' | 'acceptable' | 'warning' | 'error';
  targetMin: number;
  targetGood: number;
  targetExcellent: number;
}

// ============================================================================
// TYPES - TECHNOLOGY
// Source: agency_simulator_v3.py lines 228-311
// ============================================================================

/**
 * Technology investment with ROI tracking
 * Source: agency_simulator_v3.py lines 234-311
 */
export interface TechnologyInvestment {
  /** Agency Management System monthly cost */
  amsCost: number;
  /** CRM monthly cost */
  crmCost: number;
  /** Comparative rating platform monthly cost */
  ratingPlatformCost: number;
  /** E&O automation monthly cost */
  eoAutomationCost: number;
  /** E-signature solution monthly cost */
  esignatureCost: number;
  /** Renewal workflow automation monthly cost */
  renewalAutomationCost: number;
  /** Marketing automation monthly cost */
  marketingAutomationCost: number;
  /** Rating platform time savings (0-1) */
  ratingPlatformTimeSavings: number;
  /** E-signature time savings (0-1) */
  esignatureTimeSavings: number;
  /** Renewal automation time savings (0-1) */
  renewalAutomationTimeSavings: number;
  /** E&O claim prevention rate (0-1) */
  eoClaimPreventionRate: number;
  /** Average E&O claim cost */
  avgEoClaimCost: number;
}

/**
 * Technology budget evaluation result
 * Source: agency_simulator_v3.py lines 261-290
 */
export interface TechBudgetEvaluation {
  annualCost: number;
  percentOfRevenue: number;
  targetMin: number;
  targetMax: number;
  status: 'under_invested' | 'optimal' | 'over_invested';
  message: string;
}

/**
 * E&O automation ROI calculation result
 * Source: agency_simulator_v3.py lines 292-311
 */
export interface EoAutomationRoi {
  annualCost: number;
  expectedAnnualSavings: number;
  roiPercent: number;
  paybackMonths: number;
  claimsPrevented: number;
  recommendation: string;
}

// ============================================================================
// TYPES - BUNDLING & RETENTION
// Source: agency_simulator_v3.py lines 313-417
// ============================================================================

/**
 * Bundling and retention dynamics
 * Critical threshold: 1.8 policies per customer = 95% retention
 * Source: agency_simulator_v3.py lines 318-417
 */
export interface BundlingDynamics {
  /** Number of auto policies */
  autoPolicies: number;
  /** Number of home policies */
  homePolicies: number;
  /** Number of umbrella policies (high margin) */
  umbrellaPolicies: number;
  /** Number of cyber policies (15-25% commission) */
  cyberPolicies: number;
  /** Number of commercial policies */
  commercialPolicies: number;
  /** Number of life policies */
  lifePolicies: number;
  /** Auto/home commission rate */
  autoHomeCommission: number;
  /** Umbrella commission rate */
  umbrellaCommission: number;
  /** Cyber commission rate */
  cyberCommission: number;
  /** Commercial commission rate */
  commercialCommission: number;
  /** Life commission rate (first year) */
  lifeCommission: number;
  /** Monoline retention rate */
  monolineRetention: number;
  /** Bundled base retention rate (1.5+ policies) */
  bundledBaseRetention: number;
  /** Optimal bundled retention rate (1.8+ policies) */
  optimalBundledRetention: number;
  /** Critical policies per customer threshold */
  criticalThreshold: number;
}

// ============================================================================
// TYPES - COMMISSION STRUCTURES
// Source: agency_simulator_v3.py lines 419-511
// ============================================================================

/**
 * Commission structure comparison - Independent vs Captive
 * Source: agency_simulator_v3.py lines 424-511
 */
export interface CommissionStructure {
  /** Agency structure type */
  structureType: AgencyType;
  /** Independent new business commission rate */
  independentNewBusiness: number;
  /** Independent renewal commission rate */
  independentRenewal: number;
  /** Independent commercial commission rate */
  independentCommercial: number;
  /** Captive new business commission rate */
  captiveNewBusiness: number;
  /** Captive renewal commission rate */
  captiveRenewal: number;
  /** Total producer/owner comp max (% of revenue) */
  totalProducerOwnerCompMax: number;
  /** Total payroll max (% of revenue) */
  totalPayrollMax: number;
}

/**
 * Compensation validation result
 * Source: agency_simulator_v3.py lines 486-511
 */
export interface CompensationValidation {
  compRatio: number;
  status: 'healthy' | 'warning' | 'critical' | 'error';
  message: string;
  targetMaxProducer: number;
  targetMaxTotal: number;
}

// ============================================================================
// TYPES - FINANCIAL METRICS
// Source: agency_simulator_v3.py lines 513-696
// ============================================================================

/**
 * Financial performance metrics and benchmarks
 * Source: agency_simulator_v3.py lines 518-696
 */
export interface FinancialMetrics {
  /** EBITDA target minimum (25% for $1-5M agencies) */
  ebitdaTargetMin: number;
  /** EBITDA target maximum (30% for top performers) */
  ebitdaTargetMax: number;
  /** LTV:CAC ratio good (3:1) */
  ltvCacGood: number;
  /** LTV:CAC ratio great (4:1) */
  ltvCacGreat: number;
  /** LTV:CAC ratio indicates under-investment (5:1+) */
  ltvCacUnderinvested: number;
  /** Industry average CAC for independent agents */
  independentAgentAvgCac: number;
}

/**
 * EBITDA margin evaluation result
 * Source: agency_simulator_v3.py lines 553-589
 */
export interface EbitdaEvaluation {
  margin: number;
  status: 'excellent' | 'target' | 'acceptable' | 'below_target' | 'good' | 'review';
  message: string;
  targetRange: string;
  targetMin: number;
  targetMax: number;
}

/**
 * LTV:CAC ratio evaluation result
 * Source: agency_simulator_v3.py lines 617-656
 */
export interface LtvCacEvaluation {
  ratio: number;
  status: 'underinvested' | 'great' | 'good' | 'acceptable' | 'poor';
  message: string;
  recommendation: string;
  color: 'green' | 'yellow' | 'red';
  benchmarkGood: number;
  benchmarkGreat: number;
}

/**
 * Rule of 20 calculation result
 * Source: agency_simulator_v3.py lines 658-696
 */
export interface RuleOf20Result {
  score: number;
  rating: string;
  color: 'green' | 'yellow' | 'red';
  message: string;
  target: number;
  calculation: string;
}

// ============================================================================
// TYPES - HIGH-ROI INVESTMENTS
// Source: agency_simulator_v3.py lines 698-818
// ============================================================================

/**
 * High-ROI investment opportunities model
 * Source: agency_simulator_v3.py lines 704-818
 */
export interface HighROIInvestments {
  /** E&O automation monthly cost */
  eoAutomationMonthlyCost: number;
  /** E&O claim prevention rate (0-1) */
  eoClaimPreventionRate: number;
  /** Average E&O claim cost */
  eoAvgClaimCost: number;
  /** Baseline E&O claims per year */
  eoBaselineClaimsPerYear: number;
  /** Renewal review hours per policy */
  renewalReviewHoursPerPolicy: number;
  /** Renewal staff hourly cost */
  renewalStaffHourlyCost: number;
  /** Renewal retention improvement (0-1) */
  renewalRetentionImprovement: number;
  /** Renewal improvement timeline in months */
  renewalImprovementTimelineMonths: number;
  /** Cross-sell program monthly cost */
  crosssellProgramMonthlyCost: number;
  /** Cross-sell umbrella attachment rate (0-1) */
  crosssellUmbrellaAttachmentRate: number;
  /** Cross-sell cyber attachment rate (0-1) */
  crosssellCyberAttachmentRate: number;
  /** Umbrella average annual premium */
  umbrellaAvgPremium: number;
  /** Cyber average annual premium */
  cyberAvgPremium: number;
}

/**
 * E&O automation ROI result
 * Source: agency_simulator_v3.py lines 726-745
 */
export interface EoAutomationRoiResult {
  investment: string;
  monthlyCost: number;
  annualCost: number;
  expectedAnnualSavings: number;
  netAnnualBenefit: number;
  roiPercent: number;
  claimsPreventedPerYear: number;
  paybackMonths: number;
  recommendation: string;
}

/**
 * Renewal program ROI result
 * Source: agency_simulator_v3.py lines 747-784
 */
export interface RenewalProgramRoiResult {
  investment: string;
  annualLaborHours: number;
  annualLaborCost: number;
  year1RetentionImprovement: string;
  policiesSavedYear1: number;
  year1RevenueImpact: number;
  fiveYearBenefit: number;
  fiveYearCost: number;
  fiveYearRoiPercent: number;
  timelineToResults: string;
  recommendation: string;
}

/**
 * Cross-sell program ROI result
 * Source: agency_simulator_v3.py lines 786-818
 */
export interface CrosssellProgramRoiResult {
  investment: string;
  annualCost: number;
  umbrellaPoliciesSold: number;
  umbrellaAnnualRevenue: number;
  cyberPoliciesSold: number;
  cyberAnnualRevenue: number;
  totalAnnualRevenue: number;
  netAnnualBenefit: number;
  roiPercent: number;
  paybackMonths: number;
  recommendation: string;
}

// ============================================================================
// TYPES - SIMULATION
// Source: agency_simulator_v3.py lines 820-1145
// ============================================================================

/**
 * Enhanced simulation parameters with all benchmarks
 * Source: agency_simulator_v3.py lines 826-886
 */
export interface EnhancedSimulationParameters {
  /** Current number of policies */
  currentPolicies: number;
  /** Current number of customers */
  currentCustomers: number;
  /** Baseline monthly lead spend */
  baselineLeadSpend: number;
  /** Marketing mix configuration */
  marketing: MarketingMix;
  /** Staffing model configuration */
  staffing: StaffingModel;
  /** Technology investment configuration */
  technology: TechnologyInvestment;
  /** Bundling dynamics configuration */
  bundling: BundlingDynamics;
  /** Commission structure configuration */
  commission: CommissionStructure;
  /** Financial metrics benchmarks */
  financials: FinancialMetrics;
  /** High-ROI investments configuration */
  investments: HighROIInvestments;
  /** Average annual premium per policy */
  avgPremiumAnnual: number;
  /** Fixed monthly overhead (rent, utilities, etc.) */
  fixedMonthlyOverhead: number;
  /** Growth stage */
  growthStage: GrowthStage;
}

/**
 * Monthly simulation result
 * Source: agency_simulator_v3.py lines 899-1031
 */
export interface MonthlySimulationResult {
  policiesStart: number;
  policiesEnd: number;
  customersStart: number;
  customersEnd: number;
  policiesPerCustomer: number;
  newPolicies: number;
  retainedPolicies: number;
  retentionRate: number;
  totalLeads: number;
  weightedConversion: number;
  effectiveConversion: number;
  productivityMultiplier: number;
  commissionRevenue: number;
  marketingCost: number;
  staffCost: number;
  technologyCost: number;
  overheadCost: number;
  totalCosts: number;
  operatingExpenses: number;
  ebitda: number;
  ebitdaMargin: number;
  netProfit: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  month?: number;
}

/**
 * Marketing budget benchmark result
 * Source: agency_simulator_v3.py lines 850-886
 */
export interface MarketingBudgetBenchmark {
  annualMarketingSpend: number;
  percentOfRevenue: number;
  targetRange: string;
  minTarget: number;
  maxTarget: number;
  status: 'under_invested' | 'optimal' | 'over_invested';
  message: string;
}

/**
 * Comprehensive benchmark report
 * Source: agency_simulator_v3.py lines 1055-1145
 */
export interface BenchmarkReport {
  financialPerformance: {
    annualRevenue: number;
    ebitdaMargin: number;
    ebitdaEvaluation: EbitdaEvaluation;
    ruleOf20: RuleOf20Result;
  };
  unitEconomics: {
    ltv: number;
    cac: number;
    ltvCacRatio: number;
    ltvCacEvaluation: LtvCacEvaluation;
  };
  growthMetrics: {
    policiesGrowthPercent: number;
    annualizedGrowthPercent: number;
    finalPolicies: number;
    policiesPerCustomer: number;
    retentionRate: number;
  };
  operationalBenchmarks: {
    marketingSpend: MarketingBudgetBenchmark;
    technologySpend: TechBudgetEvaluation;
    revenuePerEmployee: RpeEvaluation;
    compensationValidation: CompensationValidation;
  };
  highRoiInvestments: {
    eoAutomation: EoAutomationRoiResult;
    renewalProgram: RenewalProgramRoiResult;
    crosssellProgram: CrosssellProgramRoiResult;
  };
}

// ============================================================================
// DEFAULT VALUES
// Source: agency_simulator_v3.py various default_factory and default values
// ============================================================================

/**
 * Create default marketing channel
 * Source: agency_simulator_v3.py lines 44-58
 */
export function createDefaultMarketingChannel(name: string): MarketingChannel {
  return {
    name,
    monthlyAllocation: 0,
    costPerLead: 25,
    conversionRate: 0.15,
    qualityScore: 5.0,
  };
}

/**
 * Create default marketing mix with industry benchmarks
 * Source: agency_simulator_v3.py lines 62-93
 */
export function createDefaultMarketingMix(): MarketingMix {
  return {
    // Referral: 60% conversion (4x better than industry 15%)
    referral: {
      name: 'Referral Program',
      monthlyAllocation: 0,
      costPerLead: 50,
      conversionRate: 0.60,
      qualityScore: 9.0,
    },
    // Digital: 30% lower cost than traditional
    digital: {
      name: 'Digital (Google/Facebook)',
      monthlyAllocation: 0,
      costPerLead: 25,
      conversionRate: 0.18,
      qualityScore: 6.0,
    },
    // Traditional marketing
    traditional: {
      name: 'Traditional Marketing',
      monthlyAllocation: 0,
      costPerLead: 35,
      conversionRate: 0.15,
      qualityScore: 5.0,
    },
    // Strategic partnerships
    partnerships: {
      name: 'Strategic Partnerships',
      monthlyAllocation: 0,
      costPerLead: 40,
      conversionRate: 0.25,
      qualityScore: 7.5,
    },
  };
}

/**
 * Create default staffing model
 * Source: agency_simulator_v3.py lines 141-166
 */
export function createDefaultStaffingModel(): StaffingModel {
  return {
    producers: 1.0,
    serviceStaff: 2.8, // Benchmark: 2.8 service per producer
    adminStaff: 0.5,
    producerAvgComp: 80000,
    serviceStaffAvgComp: 45000,
    adminStaffAvgComp: 40000,
    benefitsMultiplier: 1.3, // 30% overhead for benefits
    supportedProducerAccountsPerWeek: 1.5,
    unsupportedProducerAccountsPerWeek: 0.375, // 4x worse without support
    rpeTargetMin: 150000,
    rpeTargetGood: 200000,
    rpeTargetExcellent: 300000,
  };
}

/**
 * Create default technology investment
 * Source: agency_simulator_v3.py lines 234-253
 */
export function createDefaultTechnologyInvestment(): TechnologyInvestment {
  return {
    amsCost: 500,
    crmCost: 200,
    ratingPlatformCost: 150,
    eoAutomationCost: 150,
    esignatureCost: 100,
    renewalAutomationCost: 200,
    marketingAutomationCost: 150,
    ratingPlatformTimeSavings: 0.85,
    esignatureTimeSavings: 0.85,
    renewalAutomationTimeSavings: 0.60,
    eoClaimPreventionRate: 0.40,
    avgEoClaimCost: 75000,
  };
}

/**
 * Create default bundling dynamics
 * Source: agency_simulator_v3.py lines 318-344
 */
export function createDefaultBundlingDynamics(): BundlingDynamics {
  return {
    autoPolicies: 0,
    homePolicies: 0,
    umbrellaPolicies: 0,
    cyberPolicies: 0,
    commercialPolicies: 0,
    lifePolicies: 0,
    autoHomeCommission: 0.12,
    umbrellaCommission: 0.15,
    cyberCommission: 0.20,
    commercialCommission: 0.15,
    lifeCommission: 0.50,
    monolineRetention: 0.67,
    bundledBaseRetention: 0.91,
    optimalBundledRetention: 0.95,
    criticalThreshold: 1.8,
  };
}

/**
 * Create default commission structure
 * Source: agency_simulator_v3.py lines 424-440
 */
export function createDefaultCommissionStructure(): CommissionStructure {
  return {
    structureType: 'independent',
    independentNewBusiness: 0.125,
    independentRenewal: 0.11,
    independentCommercial: 0.15,
    captiveNewBusiness: 0.30,
    captiveRenewal: 0.07,
    totalProducerOwnerCompMax: 0.35,
    totalPayrollMax: 0.65,
  };
}

/**
 * Create default financial metrics
 * Source: agency_simulator_v3.py lines 518-529
 */
export function createDefaultFinancialMetrics(): FinancialMetrics {
  return {
    ebitdaTargetMin: 0.25,
    ebitdaTargetMax: 0.30,
    ltvCacGood: 3.0,
    ltvCacGreat: 4.0,
    ltvCacUnderinvested: 5.0,
    independentAgentAvgCac: 900,
  };
}

/**
 * Create default high-ROI investments
 * Source: agency_simulator_v3.py lines 704-724
 */
export function createDefaultHighROIInvestments(): HighROIInvestments {
  return {
    eoAutomationMonthlyCost: 150,
    eoClaimPreventionRate: 0.40,
    eoAvgClaimCost: 75000,
    eoBaselineClaimsPerYear: 0.5,
    renewalReviewHoursPerPolicy: 0.25,
    renewalStaffHourlyCost: 25,
    renewalRetentionImprovement: 0.015,
    renewalImprovementTimelineMonths: 6,
    crosssellProgramMonthlyCost: 500,
    crosssellUmbrellaAttachmentRate: 0.15,
    crosssellCyberAttachmentRate: 0.10,
    umbrellaAvgPremium: 500,
    cyberAvgPremium: 1200,
  };
}

/**
 * Create default simulation parameters
 * Source: agency_simulator_v3.py lines 826-848
 */
export function createDefaultSimulationParameters(): EnhancedSimulationParameters {
  return {
    currentPolicies: 500,
    currentCustomers: 400,
    baselineLeadSpend: 2000,
    marketing: createDefaultMarketingMix(),
    staffing: createDefaultStaffingModel(),
    technology: createDefaultTechnologyInvestment(),
    bundling: createDefaultBundlingDynamics(),
    commission: createDefaultCommissionStructure(),
    financials: createDefaultFinancialMetrics(),
    investments: createDefaultHighROIInvestments(),
    avgPremiumAnnual: 1500,
    fixedMonthlyOverhead: 3000,
    growthStage: 'growth',
  };
}

// ============================================================================
// MARKETING MIX FUNCTIONS
// Source: agency_simulator_v3.py lines 94-134
// ============================================================================

/**
 * Calculate monthly leads from channel allocation
 * Source: agency_simulator_v3.py lines 52-54
 */
export function getChannelMonthlyLeads(channel: MarketingChannel): number {
  return channel.costPerLead > 0
    ? channel.monthlyAllocation / channel.costPerLead
    : 0;
}

/**
 * Calculate expected monthly policies from channel
 * Source: agency_simulator_v3.py lines 56-58
 */
export function getChannelMonthlyPolicies(channel: MarketingChannel): number {
  return getChannelMonthlyLeads(channel) * channel.conversionRate;
}

/**
 * Get total monthly marketing spend
 * Source: agency_simulator_v3.py lines 94-99
 */
export function getMarketingTotalAllocation(mix: MarketingMix): number {
  return (
    mix.referral.monthlyAllocation +
    mix.digital.monthlyAllocation +
    mix.traditional.monthlyAllocation +
    mix.partnerships.monthlyAllocation
  );
}

/**
 * Get total monthly leads across all channels
 * Source: agency_simulator_v3.py lines 101-106
 */
export function getMarketingTotalLeads(mix: MarketingMix): number {
  return (
    getChannelMonthlyLeads(mix.referral) +
    getChannelMonthlyLeads(mix.digital) +
    getChannelMonthlyLeads(mix.traditional) +
    getChannelMonthlyLeads(mix.partnerships)
  );
}

/**
 * Calculate weighted average conversion rate
 * Source: agency_simulator_v3.py lines 108-121
 */
export function getMarketingWeightedConversionRate(mix: MarketingMix): number {
  const totalLeads = getMarketingTotalLeads(mix);
  if (totalLeads === 0) {
    return 0;
  }

  const weightedConversions =
    getChannelMonthlyLeads(mix.referral) * mix.referral.conversionRate +
    getChannelMonthlyLeads(mix.digital) * mix.digital.conversionRate +
    getChannelMonthlyLeads(mix.traditional) * mix.traditional.conversionRate +
    getChannelMonthlyLeads(mix.partnerships) * mix.partnerships.conversionRate;

  return weightedConversions / totalLeads;
}

/**
 * Calculate blended customer acquisition cost
 * Source: agency_simulator_v3.py lines 123-133
 */
export function getMarketingBlendedCac(
  mix: MarketingMix,
  _commissionRate: number,
  _avgPremium: number
): number {
  const totalPolicies =
    getChannelMonthlyPolicies(mix.referral) +
    getChannelMonthlyPolicies(mix.digital) +
    getChannelMonthlyPolicies(mix.traditional) +
    getChannelMonthlyPolicies(mix.partnerships);

  if (totalPolicies === 0) {
    return 0;
  }

  return getMarketingTotalAllocation(mix) / totalPolicies;
}

// ============================================================================
// STAFFING FUNCTIONS
// Source: agency_simulator_v3.py lines 164-226
// ============================================================================

/**
 * Get total full-time equivalents
 * Source: agency_simulator_v3.py lines 164-166
 */
export function getStaffingTotalFte(staffing: StaffingModel): number {
  return staffing.producers + staffing.serviceStaff + staffing.adminStaff;
}

/**
 * Get service staff per producer ratio
 * Source: agency_simulator_v3.py lines 168-172
 */
export function getStaffingProducerToServiceRatio(staffing: StaffingModel): number {
  if (staffing.producers === 0) {
    return 0;
  }
  return staffing.serviceStaff / staffing.producers;
}

/**
 * Get total monthly staff cost including benefits
 * Source: agency_simulator_v3.py lines 174-182
 */
export function getStaffingTotalMonthlyCost(staffing: StaffingModel): number {
  const annualCost =
    (staffing.producers * staffing.producerAvgComp +
      staffing.serviceStaff * staffing.serviceStaffAvgComp +
      staffing.adminStaff * staffing.adminStaffAvgComp) *
    staffing.benefitsMultiplier;

  return annualCost / 12;
}

/**
 * Calculate productivity multiplier based on support ratio
 * Optimal ratio is 2.8:1, productivity drops below this
 * Source: agency_simulator_v3.py lines 184-196
 */
export function getStaffingProductivityMultiplier(staffing: StaffingModel): number {
  const ratio = getStaffingProducerToServiceRatio(staffing);
  const optimalRatio = 2.8;

  if (ratio >= optimalRatio) {
    return 1.0; // Full productivity
  } else {
    // Linear degradation down to 0.25 (4x worse) with no support
    return Math.max(0.25, ratio / optimalRatio);
  }
}

/**
 * Evaluate revenue per employee against benchmarks
 * Source: agency_simulator_v3.py lines 198-226
 */
export function evaluateStaffingRpe(
  staffing: StaffingModel,
  totalRevenue: number
): RpeEvaluation {
  const totalFte = getStaffingTotalFte(staffing);
  if (totalFte === 0) {
    return {
      rpe: 0,
      rating: 'N/A',
      status: 'error',
      targetMin: staffing.rpeTargetMin,
      targetGood: staffing.rpeTargetGood,
      targetExcellent: staffing.rpeTargetExcellent,
    };
  }

  const rpe = totalRevenue / totalFte;

  let rating: string;
  let status: 'excellent' | 'good' | 'acceptable' | 'warning';

  if (rpe >= staffing.rpeTargetExcellent) {
    rating = 'Excellent';
    status = 'excellent';
  } else if (rpe >= staffing.rpeTargetGood) {
    rating = 'Good';
    status = 'good';
  } else if (rpe >= staffing.rpeTargetMin) {
    rating = 'Acceptable';
    status = 'acceptable';
  } else {
    rating = 'Below Target';
    status = 'warning';
  }

  return {
    rpe,
    rating,
    status,
    targetMin: staffing.rpeTargetMin,
    targetGood: staffing.rpeTargetGood,
    targetExcellent: staffing.rpeTargetExcellent,
  };
}

// ============================================================================
// TECHNOLOGY FUNCTIONS
// Source: agency_simulator_v3.py lines 255-311
// ============================================================================

/**
 * Get total monthly technology spend
 * Source: agency_simulator_v3.py lines 255-259
 */
export function getTechnologyTotalMonthlyCost(tech: TechnologyInvestment): number {
  return (
    tech.amsCost +
    tech.crmCost +
    tech.ratingPlatformCost +
    tech.eoAutomationCost +
    tech.esignatureCost +
    tech.renewalAutomationCost +
    tech.marketingAutomationCost
  );
}

/**
 * Calculate target technology budget
 * Benchmark: 2.5-3.5% of annual revenue
 * Source: agency_simulator_v3.py lines 261-290
 */
export function getTechnologyTargetBudget(
  tech: TechnologyInvestment,
  annualRevenue: number
): TechBudgetEvaluation {
  const targetMin = annualRevenue * 0.025;
  const targetMax = annualRevenue * 0.035;

  const annualCost = getTechnologyTotalMonthlyCost(tech) * 12;
  const percentOfRevenue =
    annualRevenue > 0 ? (annualCost / annualRevenue) * 100 : 0;

  let status: 'under_invested' | 'optimal' | 'over_invested';
  let message: string;

  if (annualCost < targetMin) {
    status = 'under_invested';
    message = 'Below target range (2.5-3.5%). Consider adding technology.';
  } else if (annualCost > targetMax) {
    status = 'over_invested';
    message = 'Above target range. Review for optimization opportunities.';
  } else {
    status = 'optimal';
    message = 'Within optimal range (2.5-3.5% of revenue).';
  }

  return {
    annualCost,
    percentOfRevenue,
    targetMin,
    targetMax,
    status,
    message,
  };
}

/**
 * Calculate ROI for E&O automation
 * Benchmark: Prevents 40% of claims, avg claim cost $50k-$100k
 * Source: agency_simulator_v3.py lines 292-311
 */
export function calculateTechnologyEoAutomationRoi(
  tech: TechnologyInvestment,
  expectedClaimsPerYear: number = 0.5
): EoAutomationRoi {
  const annualCost = tech.eoAutomationCost * 12;
  const claimsPrevented = expectedClaimsPerYear * tech.eoClaimPreventionRate;
  const expectedSavings = claimsPrevented * tech.avgEoClaimCost;

  const roiPercent =
    annualCost > 0 ? ((expectedSavings - annualCost) / annualCost) * 100 : 0;
  const paybackMonths =
    expectedSavings > 0 ? annualCost / (expectedSavings / 12) : Infinity;

  return {
    annualCost,
    expectedAnnualSavings: expectedSavings,
    roiPercent,
    paybackMonths,
    claimsPrevented,
    recommendation: 'Highest-impact investment for risk management',
  };
}

// ============================================================================
// BUNDLING FUNCTIONS
// Source: agency_simulator_v3.py lines 346-416
// ============================================================================

/**
 * Get total policy count
 * Source: agency_simulator_v3.py lines 346-349
 */
export function getBundlingTotalPolicies(bundling: BundlingDynamics): number {
  return (
    bundling.autoPolicies +
    bundling.homePolicies +
    bundling.umbrellaPolicies +
    bundling.cyberPolicies +
    bundling.commercialPolicies +
    bundling.lifePolicies
  );
}

/**
 * Estimate unique customers
 * Assumption: auto and home typically go to same customer when bundled
 * Source: agency_simulator_v3.py lines 351-361
 */
export function getBundlingUniqueCustomers(bundling: BundlingDynamics): number {
  // Simple estimate: max of auto or home, plus other standalone
  const baseCustomers = Math.max(bundling.autoPolicies, bundling.homePolicies);
  const otherCustomers = bundling.commercialPolicies + bundling.lifePolicies;

  // Umbrella and cyber typically attach to existing customers
  return Math.max(1, baseCustomers + otherCustomers);
}

/**
 * Calculate average policies per customer
 * Source: agency_simulator_v3.py lines 363-366
 */
export function getBundlingPoliciesPerCustomer(bundling: BundlingDynamics): number {
  const customers = getBundlingUniqueCustomers(bundling);
  return customers > 0 ? getBundlingTotalPolicies(bundling) / customers : 0;
}

/**
 * Calculate retention based on policies per customer
 * Critical threshold: 1.8 policies = 95% retention
 * Source: agency_simulator_v3.py lines 368-388
 */
export function getBundlingRetentionRate(bundling: BundlingDynamics): number {
  const ppc = getBundlingPoliciesPerCustomer(bundling);

  if (ppc >= bundling.criticalThreshold) {
    return bundling.optimalBundledRetention; // 95%
  } else if (ppc >= 1.5) {
    // Interpolate between bundled base and optimal
    return (
      bundling.bundledBaseRetention +
      (bundling.optimalBundledRetention - bundling.bundledBaseRetention) *
        ((ppc - 1.5) / (bundling.criticalThreshold - 1.5))
    );
  } else if (ppc > 1.0) {
    // Interpolate between monoline and bundled
    return (
      bundling.monolineRetention +
      (bundling.bundledBaseRetention - bundling.monolineRetention) *
        ((ppc - 1.0) / 0.5)
    );
  } else {
    return bundling.monolineRetention; // 67%
  }
}

/**
 * Calculate profit multiplier from retention improvement
 * Benchmark: 5% retention improvement can double profits in 5 years
 * Source: agency_simulator_v3.py lines 390-402
 */
export function calculateBundlingRetentionProfitMultiplier(
  retentionImprovement: number,
  years: number = 5
): number {
  if (years === 5 && retentionImprovement >= 0.05) {
    return 2.0; // Double profits
  } else {
    // Linear approximation for other scenarios
    // 5% improvement = 2x, so each 1% improvement = 1.2x
    return 1.0 + retentionImprovement * 20;
  }
}

/**
 * Calculate LTV multiplier based on bundling
 * Bundled customers have significantly higher LTV
 * Source: agency_simulator_v3.py lines 404-416
 */
export function getBundlingLtvMultiplier(bundling: BundlingDynamics): number {
  const ppc = getBundlingPoliciesPerCustomer(bundling);

  if (ppc >= bundling.criticalThreshold) {
    return 3.5; // 3.5x LTV for highly bundled customers
  } else if (ppc >= 1.5) {
    return 2.5; // 2.5x LTV for bundled customers
  } else {
    return 1.0; // Baseline LTV
  }
}

// ============================================================================
// COMMISSION STRUCTURE FUNCTIONS
// Source: agency_simulator_v3.py lines 442-511
// ============================================================================

/**
 * Get commission rate based on structure type and business type
 * Source: agency_simulator_v3.py lines 442-463
 */
export function getCommissionRate(
  commission: CommissionStructure,
  isNewBusiness: boolean,
  isCommercial: boolean = false
): number {
  if (commission.structureType === 'independent') {
    if (isCommercial) {
      return commission.independentCommercial;
    } else if (isNewBusiness) {
      return commission.independentNewBusiness;
    } else {
      return commission.independentRenewal;
    }
  } else if (commission.structureType === 'captive') {
    if (isNewBusiness) {
      return commission.captiveNewBusiness;
    } else {
      return commission.captiveRenewal;
    }
  } else {
    // Hybrid - average of independent and captive
    if (isNewBusiness) {
      return (commission.independentNewBusiness + commission.captiveNewBusiness) / 2;
    } else {
      return (commission.independentRenewal + commission.captiveRenewal) / 2;
    }
  }
}

/**
 * Calculate total annual commission revenue
 * Source: agency_simulator_v3.py lines 465-484
 */
export function calculateCommissionAnnualRevenue(
  commission: CommissionStructure,
  newBusinessPremium: number,
  renewalPremium: number,
  commercialPremium: number = 0
): number {
  if (commission.structureType === 'independent') {
    return (
      newBusinessPremium * commission.independentNewBusiness +
      renewalPremium * commission.independentRenewal +
      commercialPremium * commission.independentCommercial
    );
  } else if (commission.structureType === 'captive') {
    return (
      newBusinessPremium * commission.captiveNewBusiness +
      renewalPremium * commission.captiveRenewal +
      commercialPremium * commission.independentCommercial
    );
  } else {
    // Hybrid approach
    return (
      (newBusinessPremium + renewalPremium) *
        ((commission.independentNewBusiness + commission.independentRenewal) / 2) +
      commercialPremium * commission.independentCommercial
    );
  }
}

/**
 * Validate compensation ratios against best practices
 * Source: agency_simulator_v3.py lines 486-511
 */
export function validateCommissionCompensation(
  commission: CommissionStructure,
  totalCompensation: number,
  totalRevenue: number
): CompensationValidation {
  if (totalRevenue === 0) {
    return {
      compRatio: 0,
      status: 'error',
      message: 'No revenue to evaluate',
      targetMaxProducer: commission.totalProducerOwnerCompMax,
      targetMaxTotal: commission.totalPayrollMax,
    };
  }

  const compRatio = totalCompensation / totalRevenue;

  let status: 'healthy' | 'warning' | 'critical';
  let message: string;

  if (compRatio > commission.totalPayrollMax) {
    status = 'critical';
    message = `Total payroll ${(compRatio * 100).toFixed(1)}% exceeds 65% best practice. Profitability at risk.`;
  } else if (compRatio > commission.totalProducerOwnerCompMax) {
    status = 'warning';
    message = `Compensation ${(compRatio * 100).toFixed(1)}% above 30-35% target. Review structure.`;
  } else {
    status = 'healthy';
    message = `Compensation ratio ${(compRatio * 100).toFixed(1)}% within healthy range.`;
  }

  return {
    compRatio,
    status,
    message,
    targetMaxProducer: commission.totalProducerOwnerCompMax,
    targetMaxTotal: commission.totalPayrollMax,
  };
}

// ============================================================================
// FINANCIAL METRICS FUNCTIONS
// Source: agency_simulator_v3.py lines 534-696
// ============================================================================

/**
 * Calculate EBITDA
 * EBITDA = Revenue - Operating Expenses
 * Source: agency_simulator_v3.py lines 534-541
 */
export function calculateEbitda(
  totalRevenue: number,
  operatingExpenses: number
): number {
  return totalRevenue - operatingExpenses;
}

/**
 * Calculate EBITDA margin %
 * Source: agency_simulator_v3.py lines 543-551
 */
export function calculateEbitdaMargin(
  totalRevenue: number,
  operatingExpenses: number
): number {
  if (totalRevenue === 0) {
    return 0;
  }

  const ebitda = calculateEbitda(totalRevenue, operatingExpenses);
  return ebitda / totalRevenue;
}

/**
 * Evaluate EBITDA margin against benchmarks
 * Target: 25-30% for agencies writing $1-5M premium
 * Source: agency_simulator_v3.py lines 553-589
 */
export function evaluateEbitdaMargin(
  financials: FinancialMetrics,
  margin: number,
  premiumVolume: number
): EbitdaEvaluation {
  let status: 'excellent' | 'target' | 'acceptable' | 'below_target' | 'good' | 'review';
  let message: string;

  if (premiumVolume >= 1_000_000 && premiumVolume <= 5_000_000) {
    if (margin >= financials.ebitdaTargetMax) {
      status = 'excellent';
      message = 'Excellent margins for agency size';
    } else if (margin >= financials.ebitdaTargetMin) {
      status = 'target';
      message = 'Within target range for well-run agencies';
    } else if (margin >= 0.2) {
      status = 'acceptable';
      message = 'Acceptable but room for improvement';
    } else {
      status = 'below_target';
      message = 'Below industry benchmarks. Review expenses.';
    }
  } else {
    // Outside benchmark range
    if (margin >= 0.25) {
      status = 'good';
      message = 'Strong margins';
    } else {
      status = 'review';
      message = 'Margins warrant review';
    }
  }

  return {
    margin,
    status,
    message,
    targetRange: '25-30%',
    targetMin: financials.ebitdaTargetMin,
    targetMax: financials.ebitdaTargetMax,
  };
}

/**
 * Calculate Customer Lifetime Value (industry standard formula)
 * LTV = (Average annual revenue x Retention rate) / (1 - Retention rate) - CAC
 * Source: agency_simulator_v3.py lines 591-609
 */
export function calculateLtv(
  avgAnnualRevenue: number,
  avgRetentionRate: number,
  avgCac: number,
  servicingCost: number = 0
): number {
  let ltvBase: number;

  if (avgRetentionRate >= 1.0) {
    // Perfect retention = infinite LTV, cap at reasonable value
    ltvBase = avgAnnualRevenue * 20; // 20 years
  } else {
    ltvBase =
      (avgAnnualRevenue * avgRetentionRate) / (1 - avgRetentionRate);
  }

  // Subtract acquisition cost and servicing
  const ltv = ltvBase - avgCac - servicingCost;

  return Math.max(0, ltv);
}

/**
 * Calculate LTV:CAC ratio
 * Source: agency_simulator_v3.py lines 611-615
 */
export function calculateLtvCacRatio(ltv: number, cac: number): number {
  if (cac === 0) {
    return 0;
  }
  return ltv / cac;
}

/**
 * Evaluate LTV:CAC ratio against benchmarks
 * 3:1 = good, 4:1 = great, 5:1+ = may indicate under-investment
 * Source: agency_simulator_v3.py lines 617-656
 */
export function evaluateLtvCacRatio(
  financials: FinancialMetrics,
  ratio: number
): LtvCacEvaluation {
  let status: 'underinvested' | 'great' | 'good' | 'acceptable' | 'poor';
  let message: string;
  let recommendation: string;
  let color: 'green' | 'yellow' | 'red';

  if (ratio >= financials.ltvCacUnderinvested) {
    status = 'underinvested';
    message = 'Strong economics but may indicate under-investment in growth';
    recommendation = 'Consider increasing marketing spend';
    color = 'yellow';
  } else if (ratio >= financials.ltvCacGreat) {
    status = 'great';
    message = 'Great business model';
    recommendation = 'Excellent unit economics, maintain course';
    color = 'green';
  } else if (ratio >= financials.ltvCacGood) {
    status = 'good';
    message = 'Good benchmark';
    recommendation = 'Healthy unit economics';
    color = 'green';
  } else if (ratio >= 2.0) {
    status = 'acceptable';
    message = 'Acceptable but room for improvement';
    recommendation = 'Optimize retention or reduce CAC';
    color = 'yellow';
  } else {
    status = 'poor';
    message = 'Below target';
    recommendation = 'Critical: Improve retention or significantly reduce CAC';
    color = 'red';
  }

  return {
    ratio,
    status,
    message,
    recommendation,
    color,
    benchmarkGood: financials.ltvCacGood,
    benchmarkGreat: financials.ltvCacGreat,
  };
}

/**
 * Calculate Rule of 20
 * Rule of 20 = Organic Growth % + (50% x EBITDA %)
 *
 * Scoring:
 * - 25+: Top performers
 * - 20-25: Healthy agencies
 * - <20: Needs improvement
 *
 * Source: agency_simulator_v3.py lines 658-696
 */
export function calculateRuleOf20(
  organicGrowthPercent: number,
  ebitdaPercent: number
): RuleOf20Result {
  const score = organicGrowthPercent + 0.5 * ebitdaPercent * 100;

  let rating: string;
  let color: 'green' | 'yellow' | 'red';
  let message: string;

  if (score >= 25) {
    rating = 'Top Performer';
    color = 'green';
    message = 'Elite agency performance';
  } else if (score >= 20) {
    rating = 'Healthy Agency';
    color = 'green';
    message = 'Strong balanced growth and profitability';
  } else if (score >= 15) {
    rating = 'Needs Improvement';
    color = 'yellow';
    message = 'Focus on growth or profitability improvement';
  } else {
    rating = 'Critical';
    color = 'red';
    message = 'Immediate attention required for growth and margins';
  }

  return {
    score,
    rating,
    color,
    message,
    target: 20,
    calculation: `${organicGrowthPercent.toFixed(1)}% + (50% x ${(ebitdaPercent * 100).toFixed(1)}%) = ${score.toFixed(1)}`,
  };
}

// ============================================================================
// HIGH-ROI INVESTMENT FUNCTIONS
// Source: agency_simulator_v3.py lines 726-818
// ============================================================================

/**
 * Calculate ROI for E&O Certificate of Insurance automation
 * Source: agency_simulator_v3.py lines 726-745
 */
export function calculateHighRoiEoAutomation(
  investments: HighROIInvestments
): EoAutomationRoiResult {
  const annualCost = investments.eoAutomationMonthlyCost * 12;
  const claimsPrevented =
    investments.eoBaselineClaimsPerYear * investments.eoClaimPreventionRate;
  const expectedSavings = claimsPrevented * investments.eoAvgClaimCost;

  const netBenefit = expectedSavings - annualCost;
  const roiPercent = annualCost > 0 ? (netBenefit / annualCost) * 100 : 0;

  return {
    investment: 'E&O Certificate Automation',
    monthlyCost: investments.eoAutomationMonthlyCost,
    annualCost,
    expectedAnnualSavings: expectedSavings,
    netAnnualBenefit: netBenefit,
    roiPercent,
    claimsPreventedPerYear: claimsPrevented,
    paybackMonths:
      expectedSavings > 0 ? annualCost / (expectedSavings / 12) : Infinity,
    recommendation: 'Highest-impact investment - prevents 40% of E&O claims',
  };
}

/**
 * Calculate ROI for proactive renewal review program
 * Source: agency_simulator_v3.py lines 747-784
 */
export function calculateHighRoiRenewalProgram(
  investments: HighROIInvestments,
  totalPolicies: number,
  avgCommissionPerPolicy: number
): RenewalProgramRoiResult {
  // Annual labor cost
  const totalHours = totalPolicies * investments.renewalReviewHoursPerPolicy;
  const annualLaborCost = totalHours * investments.renewalStaffHourlyCost;

  // Benefit: Improved retention
  const policiesSavedYear1 = totalPolicies * investments.renewalRetentionImprovement;
  const revenueSavedYear1 = policiesSavedYear1 * avgCommissionPerPolicy;

  // 5-year compounding benefit (saved policies continue generating revenue)
  const year1Benefit = revenueSavedYear1;
  const year2Benefit = revenueSavedYear1 * 1.015; // Compounds
  const year3Benefit = revenueSavedYear1 * 1.03;
  const year4Benefit = revenueSavedYear1 * 1.045;
  const year5Benefit = revenueSavedYear1 * 1.06;

  const fiveYearBenefit =
    year1Benefit + year2Benefit + year3Benefit + year4Benefit + year5Benefit;
  const fiveYearCost = annualLaborCost * 5;

  const roiPercent =
    fiveYearCost > 0 ? ((fiveYearBenefit - fiveYearCost) / fiveYearCost) * 100 : 0;

  return {
    investment: 'Proactive Renewal Review Program',
    annualLaborHours: totalHours,
    annualLaborCost,
    year1RetentionImprovement: `${(investments.renewalRetentionImprovement * 100).toFixed(1)}%`,
    policiesSavedYear1,
    year1RevenueImpact: year1Benefit,
    fiveYearBenefit,
    fiveYearCost,
    fiveYearRoiPercent: roiPercent,
    timelineToResults: `${investments.renewalImprovementTimelineMonths} months`,
    recommendation: 'Retention improves 1.5-2% within 6 months',
  };
}

/**
 * Calculate ROI for cross-selling program (Umbrella + Cyber)
 * Source: agency_simulator_v3.py lines 786-818
 */
export function calculateHighRoiCrosssellProgram(
  investments: HighROIInvestments,
  totalCustomers: number,
  commercialCustomers: number,
  umbrellaCommissionRate: number = 0.15,
  cyberCommissionRate: number = 0.2
): CrosssellProgramRoiResult {
  const annualCost = investments.crosssellProgramMonthlyCost * 12;

  // Umbrella policy opportunity
  const umbrellaPoliciesSold =
    totalCustomers * investments.crosssellUmbrellaAttachmentRate;
  const umbrellaAnnualRevenue =
    umbrellaPoliciesSold * investments.umbrellaAvgPremium * umbrellaCommissionRate;

  // Cyber policy opportunity
  const cyberPoliciesSold =
    commercialCustomers * investments.crosssellCyberAttachmentRate;
  const cyberAnnualRevenue =
    cyberPoliciesSold * investments.cyberAvgPremium * cyberCommissionRate;

  const totalAnnualRevenue = umbrellaAnnualRevenue + cyberAnnualRevenue;
  const netBenefit = totalAnnualRevenue - annualCost;
  const roiPercent = annualCost > 0 ? (netBenefit / annualCost) * 100 : 0;

  return {
    investment: 'Cross-Sell Program (Umbrella + Cyber)',
    annualCost,
    umbrellaPoliciesSold,
    umbrellaAnnualRevenue,
    cyberPoliciesSold,
    cyberAnnualRevenue,
    totalAnnualRevenue,
    netAnnualBenefit: netBenefit,
    roiPercent,
    paybackMonths:
      totalAnnualRevenue > 0 ? annualCost / (totalAnnualRevenue / 12) : Infinity,
    recommendation: 'High-margin products with excellent retention benefits',
  };
}

// ============================================================================
// SIMULATION PARAMETER FUNCTIONS
// Source: agency_simulator_v3.py lines 850-886
// ============================================================================

/**
 * Evaluate marketing spend against benchmarks
 * Mature: 3-7%, Growth: 10-25%
 * Source: agency_simulator_v3.py lines 850-886
 */
export function getMarketingBudgetBenchmark(
  params: EnhancedSimulationParameters,
  annualRevenue: number
): MarketingBudgetBenchmark {
  const annualMarketing = getMarketingTotalAllocation(params.marketing) * 12;

  let minTarget: number;
  let maxTarget: number;
  let rangeLabel: string;

  if (params.growthStage === 'mature') {
    minTarget = annualRevenue * 0.03;
    maxTarget = annualRevenue * 0.07;
    rangeLabel = '3-7%';
  } else {
    // growth
    minTarget = annualRevenue * 0.1;
    maxTarget = annualRevenue * 0.25;
    rangeLabel = '10-25%';
  }

  const percentOfRevenue =
    annualRevenue > 0 ? (annualMarketing / annualRevenue) * 100 : 0;

  let status: 'under_invested' | 'optimal' | 'over_invested';
  let message: string;

  if (annualMarketing < minTarget) {
    status = 'under_invested';
    message = `Below ${rangeLabel} target for ${params.growthStage} stage`;
  } else if (annualMarketing > maxTarget) {
    status = 'over_invested';
    message = `Above ${rangeLabel} range. Verify ROI justifies spend.`;
  } else {
    status = 'optimal';
    message = `Within ${rangeLabel} target range`;
  }

  return {
    annualMarketingSpend: annualMarketing,
    percentOfRevenue,
    targetRange: rangeLabel,
    minTarget,
    maxTarget,
    status,
    message,
  };
}

// ============================================================================
// ENHANCED AGENCY SIMULATOR
// Source: agency_simulator_v3.py lines 893-1145
// ============================================================================

/**
 * Simulate one month with enhanced calculations
 * Source: agency_simulator_v3.py lines 899-1031
 */
export function simulateMonth(
  params: EnhancedSimulationParameters,
  monthData: { policiesStart?: number; customersStart?: number }
): MonthlySimulationResult {
  const policiesStart = monthData.policiesStart ?? params.currentPolicies;
  const customersStart = monthData.customersStart ?? params.currentCustomers;

  // Marketing & Lead Generation
  const totalLeads = getMarketingTotalLeads(params.marketing);
  const weightedConversion = getMarketingWeightedConversionRate(params.marketing);

  // Adjust for producer productivity
  const productivityMultiplier = getStaffingProductivityMultiplier(params.staffing);
  const effectiveConversion = weightedConversion * productivityMultiplier;

  // New policies
  const newPolicies = totalLeads * effectiveConversion;

  // Retention with bundling dynamics
  const currentPpc =
    customersStart > 0 ? policiesStart / customersStart : 1.0;

  // Calculate retention based on current policies per customer
  // Use a simpler model for now - base retention with bundling factor
  const baseRetentionAnnual = 0.85; // 85% annual
  let retentionAnnual: number;

  if (currentPpc >= 1.8) {
    retentionAnnual = 0.95;
  } else if (currentPpc >= 1.5) {
    retentionAnnual = 0.91;
  } else {
    retentionAnnual = baseRetentionAnnual;
  }

  // Convert to monthly
  const retentionRate = Math.pow(retentionAnnual, 1 / 12);
  const retainedPolicies = policiesStart * retentionRate;

  // End state
  const policiesEnd = retainedPolicies + newPolicies;

  // Estimate customers (some new policies = new customers, some = cross-sells)
  const crosssellRate = 0.2; // Assume 20% of new policies are cross-sells to existing customers
  const newCustomers = newPolicies * (1 - crosssellRate);
  const customersLost = customersStart * (1 - retentionRate);
  const customersEnd = customersStart - customersLost + newCustomers;

  // Revenue calculations
  const monthlyPremiumPerPolicy = params.avgPremiumAnnual / 12;

  // Total monthly premium in force
  const _totalMonthlyPremium = policiesEnd * monthlyPremiumPerPolicy;

  // Split revenue: new vs renewal premiums (annual values for commission calc)
  const newBusinessAnnualPremium = newPolicies * params.avgPremiumAnnual;
  const renewalAnnualPremium = retainedPolicies * params.avgPremiumAnnual;

  // Commission revenue based on structure
  const newBizCommission = getCommissionRate(params.commission, true);
  const renewalCommission = getCommissionRate(params.commission, false);

  // Monthly commission revenue
  const commissionRevenue =
    (newBusinessAnnualPremium * newBizCommission) / 12 +
    (renewalAnnualPremium * renewalCommission) / 12;

  // Costs
  const marketingCost = getMarketingTotalAllocation(params.marketing);
  const staffCost = getStaffingTotalMonthlyCost(params.staffing);
  const technologyCost = getTechnologyTotalMonthlyCost(params.technology);
  const overheadCost = params.fixedMonthlyOverhead;

  const totalCosts = marketingCost + staffCost + technologyCost + overheadCost;

  // Operating expenses (excluding D&A for EBITDA)
  const operatingExpenses = totalCosts;

  // EBITDA
  const ebitda = commissionRevenue - operatingExpenses;
  const ebitdaMargin = commissionRevenue > 0 ? ebitda / commissionRevenue : 0;

  // Net Profit (same as EBITDA for agencies typically)
  const netProfit = ebitda;

  // Unit Economics
  const blendedCac = getMarketingBlendedCac(
    params.marketing,
    newBizCommission,
    params.avgPremiumAnnual
  );

  const avgAnnualRevenuePerCustomer =
    customersEnd > 0 ? (commissionRevenue * 12) / customersEnd : 0;

  const ltv = calculateLtv(
    avgAnnualRevenuePerCustomer,
    retentionRate,
    blendedCac
  );

  const ltvCacRatio = calculateLtvCacRatio(ltv, blendedCac);

  return {
    policiesStart,
    policiesEnd,
    customersStart,
    customersEnd,
    policiesPerCustomer: customersEnd > 0 ? policiesEnd / customersEnd : 0,
    newPolicies,
    retainedPolicies,
    retentionRate,
    totalLeads,
    weightedConversion,
    effectiveConversion,
    productivityMultiplier,
    commissionRevenue,
    marketingCost,
    staffCost,
    technologyCost,
    overheadCost,
    totalCosts,
    operatingExpenses,
    ebitda,
    ebitdaMargin,
    netProfit,
    ltv,
    cac: blendedCac,
    ltvCacRatio,
  };
}

/**
 * Run multi-month simulation
 * Source: agency_simulator_v3.py lines 1033-1053
 */
export function simulateScenario(
  params: EnhancedSimulationParameters,
  months: number
): MonthlySimulationResult[] {
  const results: MonthlySimulationResult[] = [];

  let policies = params.currentPolicies;
  let customers = params.currentCustomers;

  for (let month = 1; month <= months; month++) {
    const monthResult = simulateMonth(params, {
      policiesStart: policies,
      customersStart: customers,
    });

    monthResult.month = month;
    results.push(monthResult);

    // Update for next month
    policies = monthResult.policiesEnd;
    customers = monthResult.customersEnd;
  }

  return results;
}

/**
 * Generate comprehensive benchmark comparison report
 * Source: agency_simulator_v3.py lines 1055-1145
 */
export function generateBenchmarkReport(
  params: EnhancedSimulationParameters,
  simulationResults: MonthlySimulationResult[]
): BenchmarkReport {
  const finalMonth = simulationResults[simulationResults.length - 1];
  const firstMonth = simulationResults[0];

  // Calculate annual figures from final month
  const annualRevenue = finalMonth.commissionRevenue * 12;
  const _annualOperatingExpenses = finalMonth.operatingExpenses * 12;

  // EBITDA evaluation
  const ebitdaEval = evaluateEbitdaMargin(
    params.financials,
    finalMonth.ebitdaMargin,
    annualRevenue // Using revenue as proxy for premium volume
  );

  // LTV:CAC evaluation
  const ltvCacEval = evaluateLtvCacRatio(
    params.financials,
    finalMonth.ltvCacRatio
  );

  // Calculate organic growth
  const monthsElapsed = simulationResults.length;
  const policiesGrowth =
    (finalMonth.policiesEnd / firstMonth.policiesStart - 1) * 100;
  const annualizedGrowth = (policiesGrowth / monthsElapsed) * 12;

  // Rule of 20
  const ruleOf20 = calculateRuleOf20(annualizedGrowth, finalMonth.ebitdaMargin);

  // Marketing spend benchmark
  const marketingBenchmark = getMarketingBudgetBenchmark(params, annualRevenue);

  // Technology spend benchmark
  const techBenchmark = getTechnologyTargetBudget(params.technology, annualRevenue);

  // Staffing evaluation
  const rpeEval = evaluateStaffingRpe(params.staffing, annualRevenue);

  // Commission structure validation
  const totalStaffComp = getStaffingTotalMonthlyCost(params.staffing) * 12;
  const compValidation = validateCommissionCompensation(
    params.commission,
    totalStaffComp,
    annualRevenue
  );

  // High-ROI investment opportunities
  const eoRoi = calculateHighRoiEoAutomation(params.investments);
  const renewalRoi = calculateHighRoiRenewalProgram(
    params.investments,
    Math.floor(finalMonth.policiesEnd),
    finalMonth.policiesEnd > 0 ? annualRevenue / finalMonth.policiesEnd : 0
  );
  const crosssellRoi = calculateHighRoiCrosssellProgram(
    params.investments,
    Math.floor(finalMonth.customersEnd),
    Math.floor(finalMonth.customersEnd * 0.3) // Assume 30% commercial
  );

  return {
    financialPerformance: {
      annualRevenue,
      ebitdaMargin: finalMonth.ebitdaMargin,
      ebitdaEvaluation: ebitdaEval,
      ruleOf20,
    },
    unitEconomics: {
      ltv: finalMonth.ltv,
      cac: finalMonth.cac,
      ltvCacRatio: finalMonth.ltvCacRatio,
      ltvCacEvaluation: ltvCacEval,
    },
    growthMetrics: {
      policiesGrowthPercent: policiesGrowth,
      annualizedGrowthPercent: annualizedGrowth,
      finalPolicies: finalMonth.policiesEnd,
      policiesPerCustomer: finalMonth.policiesPerCustomer,
      retentionRate: finalMonth.retentionRate,
    },
    operationalBenchmarks: {
      marketingSpend: marketingBenchmark,
      technologySpend: techBenchmark,
      revenuePerEmployee: rpeEval,
      compensationValidation: compValidation,
    },
    highRoiInvestments: {
      eoAutomation: eoRoi,
      renewalProgram: renewalRoi,
      crosssellProgram: crosssellRoi,
    },
  };
}

// ============================================================================
// CONVENIENCE CLASS (Optional - mirrors Python class structure)
// Source: agency_simulator_v3.py lines 893-1145
// ============================================================================

/**
 * Enhanced Agency Simulator class for convenience
 * Wraps the functional API in a class-based interface
 * Source: agency_simulator_v3.py class EnhancedAgencySimulator
 */
export class EnhancedAgencySimulator {
  params: EnhancedSimulationParameters;

  constructor(params?: Partial<EnhancedSimulationParameters>) {
    this.params = {
      ...createDefaultSimulationParameters(),
      ...params,
    };
  }

  /**
   * Simulate one month
   */
  simulateMonth(monthData: {
    policiesStart?: number;
    customersStart?: number;
  }): MonthlySimulationResult {
    return simulateMonth(this.params, monthData);
  }

  /**
   * Run multi-month simulation
   */
  simulateScenario(months: number): MonthlySimulationResult[] {
    return simulateScenario(this.params, months);
  }

  /**
   * Generate comprehensive benchmark report
   */
  generateBenchmarkReport(
    simulationResults: MonthlySimulationResult[]
  ): BenchmarkReport {
    return generateBenchmarkReport(this.params, simulationResults);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Enums / Types are exported above

  // Default factory functions
  createDefaultMarketingChannel,
  createDefaultMarketingMix,
  createDefaultStaffingModel,
  createDefaultTechnologyInvestment,
  createDefaultBundlingDynamics,
  createDefaultCommissionStructure,
  createDefaultFinancialMetrics,
  createDefaultHighROIInvestments,
  createDefaultSimulationParameters,

  // Marketing functions
  getChannelMonthlyLeads,
  getChannelMonthlyPolicies,
  getMarketingTotalAllocation,
  getMarketingTotalLeads,
  getMarketingWeightedConversionRate,
  getMarketingBlendedCac,

  // Staffing functions
  getStaffingTotalFte,
  getStaffingProducerToServiceRatio,
  getStaffingTotalMonthlyCost,
  getStaffingProductivityMultiplier,
  evaluateStaffingRpe,

  // Technology functions
  getTechnologyTotalMonthlyCost,
  getTechnologyTargetBudget,
  calculateTechnologyEoAutomationRoi,

  // Bundling functions
  getBundlingTotalPolicies,
  getBundlingUniqueCustomers,
  getBundlingPoliciesPerCustomer,
  getBundlingRetentionRate,
  calculateBundlingRetentionProfitMultiplier,
  getBundlingLtvMultiplier,

  // Commission functions
  getCommissionRate,
  calculateCommissionAnnualRevenue,
  validateCommissionCompensation,

  // Financial metrics functions
  calculateEbitda,
  calculateEbitdaMargin,
  evaluateEbitdaMargin,
  calculateLtv,
  calculateLtvCacRatio,
  evaluateLtvCacRatio,
  calculateRuleOf20,

  // High-ROI investment functions
  calculateHighRoiEoAutomation,
  calculateHighRoiRenewalProgram,
  calculateHighRoiCrosssellProgram,

  // Simulation functions
  getMarketingBudgetBenchmark,
  simulateMonth,
  simulateScenario,
  generateBenchmarkReport,

  // Class
  EnhancedAgencySimulator,
};
