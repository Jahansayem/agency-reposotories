/**
 * Analytics Types - Barrel Export
 *
 * This module provides a clean import path for all analytics-related types.
 * Combines types from both the existing Allstate analytics and the ported
 * bealer-lead-model types.
 *
 * Usage:
 *   import type { LeadScore, CrossSellOpportunity, CustomerSegmentName } from '@/types/analytics';
 */

// ============================================
// Re-export all Allstate Analytics Types
// ============================================
export type {
  // Priority tier system
  CrossSellPriorityTier,

  // Cross-sell segment types
  CrossSellSegment,

  // Renewal status types
  AllstateRenewalStatus,
  EZPayStatus,

  // Main interfaces
  CrossSellOpportunity,
  RenewalCalendarEntry,
  CustomerInsight,

  // Upload tracking
  AllstateDataSource,
  UploadStatus,
  DataUploadBatch,
  DataUploadSummary,

  // Dashboard analytics
  CrossSellMetrics,
  CrossSellLeaderboardEntry,

  // CSV/Excel parsing
  AllstateBookOfBusinessRow,
  ParsedCrossSellRecord,
  ParsedRecordValidation,

  // API types
  UploadAllstateDataRequest,
  UploadAllstateDataResponse,
  CrossSellQueryParams,
  CrossSellListResponse,

  // Task integration
  CrossSellTaskData,
  CrossSellTaskGenerationOptions,

  // Contact history
  ContactMethod,
  ContactOutcome,
  ContactHistoryRecord,
  LogContactRequest,
  ContactHistoryListResponse,
  LogContactResponse,
} from '../allstate-analytics';

// Re-export constants
export {
  PRIORITY_TIER_CONFIG,
  CROSS_SELL_SEGMENT_CONFIG,
  DEFAULT_CROSS_SELL_PRIORITY_MAPPING,
  DEFAULT_CROSS_SELL_SUBTASKS,
  CONTACT_METHOD_CONFIG,
  CONTACT_OUTCOME_CONFIG,
} from '../allstate-analytics';

// ============================================
// Lead Scoring Model Types
// ============================================
export type {
  LeadSource,
  LeadQualityTier,
  VendorRating,
  LeadScore,
  VendorPerformance,
  BudgetAllocation,
  LeadData,
  LeadOutcome,
  BlendedMetrics,
} from '../../lib/lead-scoring';

// ============================================
// Agency Simulator Types
// ============================================
export type {
  AgencyType,
  GrowthStage,
  MarketingChannel,
  MarketingMix,
  StaffingModel,
  RpeEvaluation,
  TechnologyInvestment,
  TechBudgetEvaluation,
  EoAutomationRoi,
  BundlingDynamics,
  CommissionStructure,
  CompensationValidation,
  FinancialMetrics,
  EbitdaEvaluation,
  LtvCacEvaluation,
  RuleOf20Result,
  HighROIInvestments,
  EoAutomationRoiResult,
  RenewalProgramRoiResult,
  CrosssellProgramRoiResult,
  EnhancedSimulationParameters,
  MonthlySimulationResult,
  MarketingBudgetBenchmark,
  BenchmarkReport,
} from '../../lib/agency-simulator';

// ============================================
// Cash Flow Model Types
// ============================================
export type {
  CashFlowModelConfig,
  CashFlowBreakdown,
  AccrualAccounting,
  CashAccrualComparison,
  MonthlyCashFlowResult,
  WorkingCapitalResult,
  StressTestScenarioResult,
  StressTestResults,
} from '../../lib/cash-flow-model';

// Renamed to avoid conflict
export type { MonthlyProjection as CashFlowMonthlyProjection } from '../../lib/cash-flow-model';

// ============================================
// Seasonality Model Types
// ============================================
export type {
  Season,
  BusinessType,
  MonthlyPattern,
  SeasonalRecommendation,
  MonthConcentrationData,
  RenewalConcentrationAnalysis,
  StaffingRecommendation,
  CashFlowProjection,
  MonthName,
} from '../../lib/seasonality-model';

// Renamed to avoid conflicts
export type {
  ConfidenceLevel as SeasonalConfidenceLevel,
  HistoricalDataRecord as SeasonalHistoricalDataRecord,
  MonthlyProjection as SeasonalMonthlyProjection,
} from '../../lib/seasonality-model';

// ============================================
// Cross-Sell Timing Model Types
// ============================================
export type {
  CustomerSegment,
  ProductSequence,
  CustomerCharacteristics,
  CustomerPortfolioEntry,
  SegmentAnalysisResult,
  PortfolioAnalysisResult,
  RetentionLiftValue,
} from '../../lib/cross-sell-timing';

// Renamed to avoid conflicts
export type {
  ProductType as CrossSellProductType,
  ConfidenceLevel as CrossSellConfidenceLevel,
  CrossSellOpportunity as CrossSellTimingOpportunity,
  TimingAnalysis as CrossSellTimingAnalysis,
  HistoricalDataRecord as CrossSellHistoricalDataRecord,
} from '../../lib/cross-sell-timing';

// ============================================
// Referral Growth Model Types
// ============================================
export type {
  ReferralTier,
  IncentiveType,
  ReferralPropensityScore,
  IncentiveScenario,
  ViralGrowthProjection,
  ReferralRoiAnalysis,
  EngagementLevel,
} from '../../lib/referral-growth-model';

// Renamed to avoid conflict
export type { MonthProjection as ReferralMonthProjection } from '../../lib/referral-growth-model';

// ============================================
// Loss Ratio Predictor Types
// ============================================
export type {
  BonusMultiplierResult,
  ProductProfitabilityResult,
  PortfolioMetricsResult,
  ClaimsProjectionResult,
  ProductMixInput,
  LossRatioModelConfig,
  RiskLevel,
  RiskAssessmentResult,
  LossRatioTrendResult,
} from '../../lib/loss-ratio-predictor';

// Renamed to avoid conflicts
export type {
  ProductType as LossRatioProductType,
  BonusStatus as LossRatioBonusStatus,
  ProfitabilityStatus as LossRatioProfitabilityStatus,
} from '../../lib/loss-ratio-predictor';

// ============================================
// Rate Environment Model Types
// ============================================
export type {
  RateSeverity,
  RateEnvironmentConfig,
  YearData,
  GrowthRates,
  GrowthContribution,
  RetentionScenario,
  YearlyLtvBreakdown,
  LtvWithInflationResult,
} from '../../lib/rate-environment-model';

// Renamed to avoid conflicts
export type {
  MarketCompetitiveness as RateMarketCompetitiveness,
  ProductType as RateProductType,
  RateDrivenChurnResult as RateEnvChurnResult,
  RevenueDecomposition as RateRevenueDecomposition,
  RetentionProjection as RateRetentionProjection,
} from '../../lib/rate-environment-model';

// ============================================
// Enhanced Agency Model Types
// ============================================
export type {
  BonusStatus,
  ProfitabilityStatus,
  MarketCompetitiveness,
  RateImpactSeverity,
  BonusEligibility,
  ProductProfitability,
  PortfolioMetrics,
  ClaimsProjection,
  RateDrivenChurnResult,
  RevenueGrowthDecomposition,
  RetentionProjection,
  LtvWithInflation,
  WorkingCapitalRequirement,
  StressTestResult,
  ProductMix,
  CustomerInput,
  AgencyHealthReport,
} from '../../lib/enhanced-agency-model';

// Renamed to avoid conflicts
export type {
  MonthlyCashFlowResult as EnhancedMonthlyCashFlowResult,
  MonthlyProjection as EnhancedMonthlyProjection,
  MonthlySimulationResult as EnhancedMonthlySimulationResult,
} from '../../lib/enhanced-agency-model';

// ============================================
// Customer Segmentation Types
// ============================================
export type {
  CustomerSegmentName,
  ServiceTier,
  CustomerSegmentDefinition,
  CustomerClassification,
  PortfolioAnalysis,
  SegmentAnalysis,
  MarketingAllocation,
  AllocationDetails,
} from '../../lib/customer-segmentation';

// ============================================
// Lead Analysis API Types
// ============================================
export type {
  LeadRecord,
  VendorMetrics,
  AgentMetrics,
  HourlyMetrics,
  DailyMetrics,
  TimingAnalysis,
  CallTypeMetrics,
  FunnelAnalysis,
  OutcomeItem,
  VendorQualityMetrics,
  LeadQualityAnalysis,
  VendorROIMetrics,
  ROIAnalysis,
  LossReasons,
  FunnelBottleneckAnalysis,
  AttemptAnalysis,
  CallAttemptsAnalysis,
  AgentVendorCombination,
  AgentVendorMatchAnalysis,
  Recommendation,
  ActionPlan,
  DurationBracketResult,
  CallDurationOutcomesAnalysis,
  WeeklyDataItem,
  WeeklyTrendsAnalysis,
  BenchmarkLevel,
  IndustryBenchmarks,
  ColumnInfo,
  StatusClassificationInfo,
  CalculatedMetricInfo,
  DataOverview,
  SummaryStats,
  DiagnosticAnalyses,
  LeadAnalysisResult,
} from '../../lib/lead-analysis-api';

// ============================================
// Parse Agency Data & Extract Real Metrics Types
// DISABLED: These modules require xlsx dependency and data files
// that are not included in the production build.
// ============================================
