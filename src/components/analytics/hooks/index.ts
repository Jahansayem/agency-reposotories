/**
 * Analytics Hooks Export
 *
 * Provides clean imports for all analytics-related hooks.
 */

// Today's Opportunities
export { useTodayOpportunities } from './useTodayOpportunities';
export type {
  TodayOpportunity,
  TodayOpportunitiesMeta,
  ContactRequest,
} from './useTodayOpportunities';

// Analytics API Hooks
export {
  useSimulation,
  useCashFlow,
  useLeadQuality,
  useSegmentation,
  useOptimalTiming,
  useDataUpload,
} from './useAnalyticsAPI';

export type {
  SimulationResult,
  SimulationResponse,
  SimulationParams,
  CashFlowSummary,
  CashFlowResponse,
  CashFlowParams,
  LeadScoreResult,
  LeadQualityResponse,
  LeadQualityParams,
  LeadData,
  CustomerSegment,
  SegmentationResponse,
  SegmentationParams,
  CustomerInput,
  OptimalTimingResult,
  OptimalTimesResponse,
  TimingParams,
  UploadOptions,
  UploadResponse,
} from './useAnalyticsAPI';

// Real-time Hooks
export {
  useAnalyticsRealtime,
  useUploadProgress,
  useLiveMetrics,
  useAnalyticsConnectionStatus,
} from './useAnalyticsRealtime';

export type {
  AnalyticsEvent,
  RealtimeState,
  UploadProgress,
  LiveMetrics,
} from './useAnalyticsRealtime';
