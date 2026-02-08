/**
 * Analytics Models - Barrel Export
 *
 * This module provides a clean import path for all analytics models ported from
 * the bealer-lead-model Python repository. These models provide comprehensive
 * insurance agency analytics capabilities.
 *
 * Usage:
 *   import { scoreLead, simulateScenario, analyzePortfolio } from '@/lib/analytics';
 *
 * Models included:
 * - Lead Scoring: Quality scoring, vendor ROI, budget allocation
 * - Agency Simulator: Full agency simulation, marketing mix, staffing, financials
 * - Cash Flow Model: Cash flow projections, working capital, stress tests
 * - Seasonality Model: Monthly patterns, staffing needs, marketing timing
 * - Cross-Sell Timing: Optimal timing, product sequences, retention lift
 * - Referral Growth Model: Referral propensity, viral growth, incentive ROI
 * - Loss Ratio Predictor: Loss ratios, profitability, claims projections
 * - Rate Environment Model: Rate-driven churn, revenue decomposition
 * - Enhanced Agency Model: Comprehensive agency health reporting
 * - Customer Segmentation: LTV stratification, marketing allocation
 * - Allstate Parser: Cross-sell scoring, priority tiers
 * - Lead Analysis API: Full lead analysis with 20+ analysis functions
 */

// ============================================
// Lead Scoring Model
// Provides lead quality scoring, vendor ROI analysis, and budget allocation
// ============================================
export {
  // Types
  type LeadSource,
  type LeadQualityTier,
  type VendorRating,
  type LeadScore,
  type VendorPerformance,
  type BudgetAllocation,
  type LeadData,
  type LeadOutcome,
  type BlendedMetrics,

  // Constants
  SCORING_WEIGHTS,
  PRODUCT_INTENT_SCORES,
  HOMEOWNER_MULTIPLIER,
  AGE_SCORES,
  CREDIT_SCORES,
  ENGAGEMENT_SCORES,
  SEGMENT_LTV,
  SEGMENT_CAC,
  SEGMENT_CONVERSION_RATES,

  // Functions
  scoreLead,
  analyzeVendorPerformance,
  optimizeBudgetAllocation,
  calculateBlendedMetrics,
  formatCurrency as formatCurrencyLead,
  formatLtvCacRatio,
  getTopFactors,
  scoreLeadsBatch,
  groupLeadsBySegment,
  calculateExpectedValue,
  getHighValueLeads,
  calculatePortfolioSummary,
} from '../lead-scoring';

// ============================================
// Agency Simulator Model
// Full agency simulation including marketing, staffing, and financials
// ============================================
export {
  // Types
  type AgencyType,
  type GrowthStage,
  type MarketingChannel,
  type MarketingMix,
  type StaffingModel,
  type RpeEvaluation,
  type TechnologyInvestment,
  type TechBudgetEvaluation,
  type EoAutomationRoi,
  type BundlingDynamics,
  type CommissionStructure,
  type CompensationValidation,
  type FinancialMetrics,
  type EbitdaEvaluation,
  type LtvCacEvaluation,
  type RuleOf20Result,
  type HighROIInvestments,
  type EoAutomationRoiResult,
  type RenewalProgramRoiResult,
  type CrosssellProgramRoiResult,
  type EnhancedSimulationParameters,
  type MonthlySimulationResult,
  type MarketingBudgetBenchmark,
  type BenchmarkReport,

  // Factory functions
  createDefaultMarketingChannel,
  createDefaultMarketingMix,
  createDefaultStaffingModel,
  createDefaultTechnologyInvestment,
  createDefaultBundlingDynamics,
  createDefaultCommissionStructure,
  createDefaultFinancialMetrics,
  createDefaultHighROIInvestments,
  createDefaultSimulationParameters,

  // Marketing analysis
  getChannelMonthlyLeads,
  getChannelMonthlyPolicies,
  getMarketingTotalAllocation,
  getMarketingTotalLeads,
  getMarketingWeightedConversionRate,
  getMarketingBlendedCac,

  // Staffing analysis
  getStaffingTotalFte,
  getStaffingProducerToServiceRatio,
  getStaffingTotalMonthlyCost,
  getStaffingProductivityMultiplier,
  evaluateStaffingRpe,

  // Technology analysis
  getTechnologyTotalMonthlyCost,
  getTechnologyTargetBudget,
  calculateTechnologyEoAutomationRoi,

  // Bundling analysis
  getBundlingTotalPolicies,
  getBundlingUniqueCustomers,
  getBundlingPoliciesPerCustomer,
  getBundlingRetentionRate,
  calculateBundlingRetentionProfitMultiplier,
  getBundlingLtvMultiplier,

  // Commission analysis
  getCommissionRate,
  calculateCommissionAnnualRevenue,
  validateCommissionCompensation,

  // Financial analysis
  calculateEbitda,
  calculateEbitdaMargin,
  evaluateEbitdaMargin,
  calculateLtv,
  calculateLtvCacRatio,
  evaluateLtvCacRatio,
  calculateRuleOf20,

  // High ROI investments
  calculateHighRoiEoAutomation,
  calculateHighRoiRenewalProgram,
  calculateHighRoiCrosssellProgram,

  // Benchmarking
  getMarketingBudgetBenchmark,

  // Simulation
  simulateMonth,
  simulateScenario,
  generateBenchmarkReport,

  // Class
  EnhancedAgencySimulator,
} from '../agency-simulator';

// ============================================
// Cash Flow Model
// Cash flow projections, working capital, and stress tests
// ============================================
export {
  // Types
  type CashFlowModelConfig,
  type CashFlowBreakdown,
  type AccrualAccounting,
  type CashAccrualComparison,
  type MonthlyCashFlowResult,
  type WorkingCapitalResult,
  type MonthlyProjection as CashFlowMonthlyProjection,
  type StressTestScenarioResult,
  type StressTestResults,

  // Constants
  DEFAULT_CASH_FLOW_CONFIG,

  // Class
  CashFlowModel,

  // Functions
  calculateMonthlyCashFlow,
  calculateWorkingCapitalNeed,
  projectCashFlow12Months,
  analyzeCashFlowStressTest,
  formatCurrency as formatCurrencyCashFlow,
  formatPercentage as formatPercentageCashFlow,
  summarizeCashFlowProjection,
} from '../cash-flow-model';

// ============================================
// Seasonality Model
// Monthly patterns, staffing needs, and marketing timing
// ============================================
export {
  // Types
  type Season,
  type ConfidenceLevel as SeasonalConfidenceLevel,
  type BusinessType,
  type MonthlyPattern,
  type SeasonalRecommendation,
  type HistoricalDataRecord as SeasonalHistoricalDataRecord,
  type MonthlyProjection as SeasonalMonthlyProjection,
  type MonthConcentrationData,
  type RenewalConcentrationAnalysis,
  type StaffingRecommendation,
  type CashFlowProjection,
  type MonthName,

  // Constants
  SEASON_THRESHOLDS,
  MONTH_ORDER,
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
} from '../seasonality-model';

// ============================================
// Cross-Sell Timing Model
// Optimal timing, product sequences, and retention lift
// ============================================
export {
  // Types
  type ProductType as CrossSellProductType,
  type CustomerSegment,
  type ConfidenceLevel as CrossSellConfidenceLevel,
  type CrossSellOpportunity,
  type ProductSequence,
  type TimingAnalysis as CrossSellTimingAnalysis,
  type CustomerCharacteristics,
  type HistoricalDataRecord as CrossSellHistoricalDataRecord,
  type CustomerPortfolioEntry,
  type SegmentAnalysisResult,
  type PortfolioAnalysisResult,
  type RetentionLiftValue,

  // Constants
  TIMING_CONVERSION_RATES,
  PRODUCT_CONVERSION_RATES,
  RETENTION_BY_PRODUCT_COUNT,
  PRODUCT_RETENTION_RATES,
  PRODUCT_AVG_PREMIUMS,
  COMMISSION_RATES,

  // Functions
  calculateOptimalTiming,
  identifyNextProduct,
  getTimingMultiplier,
  calculateCrossSellOpportunity,
  analyzePortfolioOpportunities,
  calculateRetentionLiftValue,
  getOptimalTimingDay,
  isInOptimalTimingWindow,
  getProductConversionRate,
  calculateUpgradePathLtv,
} from '../cross-sell-timing';

// ============================================
// Referral Growth Model
// Referral propensity, viral growth, and incentive ROI
// ============================================
export {
  // Types
  type ReferralTier,
  type IncentiveType,
  type ReferralPropensityScore,
  type IncentiveScenario,
  type ViralGrowthProjection,
  type MonthProjection as ReferralMonthProjection,
  type ReferralRoiAnalysis,
  type EngagementLevel,

  // Constants
  REFERRAL_TIER_DESCRIPTIONS,
  REFERRAL_CONVERSION_RATE,
  PAID_LEAD_CONVERSION_RATE,
  AVG_REFERRALS_PER_REFERRER,
  REFERRAL_QUALITY_MULTIPLIER,
  PROPENSITY_WEIGHTS,
  INCENTIVE_EFFECTIVENESS,
  REFERRED_CUSTOMER_AVG_LTV,
  PAID_CAC_BENCHMARK,
  PAID_LTV_BENCHMARK,

  // Functions
  calculateReferralPropensity,
  analyzeIncentiveScenarios,
  getOptimalIncentiveScenario,
  calculateViralCoefficient,
  interpretViralCoefficient,
  projectViralGrowth,
  calculateReferralRoi,
  countByTier,
  getHighPropensityCustomers,
  calculateTotalEstimatedReferrals,
  formatCurrency as formatCurrencyReferral,
  formatPercentage as formatPercentageReferral,
} from '../referral-growth-model';

// ============================================
// Loss Ratio Predictor Model
// Loss ratios, profitability, and claims projections
// ============================================
export {
  // Types
  type ProductType as LossRatioProductType,
  type BonusStatus as LossRatioBonusStatus,
  type ProfitabilityStatus as LossRatioProfitabilityStatus,
  type BonusMultiplierResult,
  type ProductProfitabilityResult,
  type PortfolioMetricsResult,
  type ClaimsProjectionResult,
  type ProductMixInput,
  type LossRatioModelConfig,
  type RiskLevel,
  type RiskAssessmentResult,
  type LossRatioTrendResult,

  // Constants
  LOSS_RATIO_BENCHMARKS as LOSS_RATIO_BENCHMARKS_PREDICTOR,
  DEFAULT_EXPENSE_RATIO as DEFAULT_EXPENSE_RATIO_PREDICTOR,
  BONUS_THRESHOLDS as BONUS_THRESHOLDS_PREDICTOR,
  WILDFIRE_CAT_LOAD as WILDFIRE_CAT_LOAD_PREDICTOR,
  DEFAULT_COMMISSION_RATE,
  SERVICING_COST_PER_POLICY,
  DEFAULT_MODEL_CONFIG,

  // Functions
  calculateCombinedRatio as calculateCombinedRatioPredictor,
  getBonusMultiplier as getBonusMultiplierPredictor,
  calculateProductProfitability as calculateProductProfitabilityPredictor,
  calculatePortfolioMetrics as calculatePortfolioMetricsPredictor,
  projectClaimsCost as projectClaimsCostPredictor,
  assessPortfolioRisk,
  analyzeLossRatioTrend,
  formatLossRatio,
  formatCurrency as formatCurrencyLossRatio,
  getLossRatioBenchmark,
  isLossRatioAcceptable,
} from '../loss-ratio-predictor';

// ============================================
// Rate Environment Model
// Rate-driven churn, revenue decomposition
// ============================================
export {
  // Types
  type MarketCompetitiveness as RateMarketCompetitiveness,
  type ProductType as RateProductType,
  type RateSeverity,
  type RateEnvironmentConfig,
  type RateDrivenChurnResult as RateEnvChurnResult,
  type YearData,
  type GrowthRates,
  type GrowthContribution,
  type RevenueDecomposition as RateRevenueDecomposition,
  type RetentionScenario,
  type RetentionProjection as RateRetentionProjection,
  type YearlyLtvBreakdown,
  type LtvWithInflationResult,

  // Constants
  DEFAULT_CONFIG as RATE_DEFAULT_CONFIG,
  PRODUCT_RATE_INCREASES,
  COMPETITIVENESS_MULTIPLIERS as RATE_COMPETITIVENESS_MULTIPLIERS,
  COMMISSION_RATE as RATE_COMMISSION_RATE,
  MINIMUM_RETENTION_FLOOR,

  // Functions
  calculateRateDrivenChurn as calculateRateDrivenChurnEnv,
  decomposeRevenueGrowth as decomposeRevenueGrowthEnv,
  projectRetentionWithRateChange as projectRetentionWithRateChangeEnv,
  calculateLtvWithInflation as calculateLtvWithInflationEnv,

  // Class
  RateEnvironmentModel,
} from '../rate-environment-model';

// ============================================
// Enhanced Agency Model
// Comprehensive agency health reporting
// ============================================
export {
  // Types
  type BonusStatus,
  type ProfitabilityStatus,
  type MarketCompetitiveness,
  type RateImpactSeverity,
  type BonusEligibility,
  type ProductProfitability,
  type PortfolioMetrics,
  type ClaimsProjection,
  type RateDrivenChurnResult,
  type RevenueGrowthDecomposition,
  type RetentionProjection,
  type LtvWithInflation,
  type MonthlyCashFlowResult as EnhancedMonthlyCashFlowResult,
  type WorkingCapitalRequirement,
  type MonthlyProjection as EnhancedMonthlyProjection,
  type StressTestResult,
  type ProductMix,
  type CustomerInput,
  type MonthlySimulationResult as EnhancedMonthlySimulationResult,
  type AgencyHealthReport,

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

  // Functions
  calculateCombinedRatio,
  getBonusMultiplier,
  calculateProductProfitability,
  calculatePortfolioMetrics,
  projectClaimsCost,
  calculateRateDrivenChurn,
  decomposeRevenueGrowth,
  projectRetentionWithRateChange,
  calculateLtvWithInflation,
  calculateMonthlyCashFlow as calculateMonthlyCashFlowEnhanced,
  calculateWorkingCapitalNeed as calculateWorkingCapitalNeedEnhanced,
  projectCashFlow12Months as projectCashFlow12MonthsEnhanced,
  analyzeCashFlowStressTest as analyzeCashFlowStressTestEnhanced,

  // Class
  EnhancedAgencyModel,
} from '../enhanced-agency-model';

// ============================================
// Customer Segmentation Model
// LTV stratification and marketing allocation
// ============================================
export {
  // Types
  type CustomerSegmentName,
  type ServiceTier,
  type CustomerSegmentDefinition,
  type CustomerClassification,
  type PortfolioAnalysis,
  type SegmentAnalysis,
  type MarketingAllocation,
  type AllocationDetails,

  // Constants
  CUSTOMER_SEGMENTS,

  // Functions
  classifyCustomer,
  calculateCustomerLtv,
  getCustomerClassification,
  analyzePortfolio,
  recommendMarketingAllocation,
} from '../customer-segmentation';

// ============================================
// Allstate Parser
// Cross-sell scoring and priority tiers
// ============================================
export {
  // Functions
  determineSegment,
  generateRecommendedProduct,
  parseAllstateRow,
  parseCSV,
  createColumnMap,
  parseAllstateData,
  calculatePriorityScore,
  calculatePriorityTier,
  calculateRetentionLift,
  getExpectedConversion,
  calculatePotentialPremium,
  generateTalkingPoints,
  generateUploadSummary,

  // Constants
  CONVERSION_RATES as ALLSTATE_CONVERSION_RATES,
  RETENTION_BY_PRODUCTS as ALLSTATE_RETENTION_BY_PRODUCTS,
} from '../allstate-parser';

// ============================================
// Lead Analysis API
// Full lead analysis with 20+ analysis functions
// ============================================
export {
  // Types
  type LeadRecord,
  type VendorMetrics,
  type AgentMetrics,
  type HourlyMetrics,
  type DailyMetrics,
  type TimingAnalysis,
  type CallTypeMetrics,
  type FunnelAnalysis,
  type OutcomeItem,
  type VendorQualityMetrics,
  type LeadQualityAnalysis,
  type VendorROIMetrics,
  type ROIAnalysis,
  type LossReasons,
  type FunnelBottleneckAnalysis,
  type AttemptAnalysis,
  type CallAttemptsAnalysis,
  type AgentVendorCombination,
  type AgentVendorMatchAnalysis,
  type Recommendation,
  type ActionPlan,
  type DurationBracketResult,
  type CallDurationOutcomesAnalysis,
  type WeeklyDataItem,
  type WeeklyTrendsAnalysis,
  type BenchmarkLevel,
  type IndustryBenchmarks,
  type ColumnInfo,
  type StatusClassificationInfo,
  type CalculatedMetricInfo,
  type DataOverview,
  type SummaryStats,
  type DiagnosticAnalyses,
  type LeadAnalysisResult,

  // Constants
  VENDOR_COSTS,
  DAY_ORDER,

  // Functions
  classifyOutcome,
  categorizeCallType,
  getVendorCost,
  calculateMetrics,
  parseRecordDate,
  analyzeVendors,
  analyzeAgents,
  analyzeTiming,
  analyzeCallTypes,
  analyzeFunnel,
  analyzeOutcomes,
  analyzeLeadQuality,
  analyzeROIMetrics,
  analyzeFunnelBottlenecks,
  analyzeCallAttempts,
  analyzeAgentVendorMatch,
  generateRecommendations,
  generateActionPlan,
  analyzeCallDurationOutcomes,
  analyzeWeeklyTrends,
  getIndustryBenchmarks,
  generateDataOverview,
  generateAnalysis,
} from '../lead-analysis-api';

// ============================================
// Parse Agency Data & Extract Real Metrics
// DISABLED: These modules require xlsx dependency and data files
// that are not included in the production build.
// Uncomment when xlsx is installed and data files are available.
// ============================================
