/**
 * Analytics Components Export
 *
 * Provides clean imports for all analytics-related components.
 *
 * Usage:
 *   import { BookOfBusinessDashboard, TodayOpportunitiesPanel } from '@/components/analytics';
 *   import { useSegmentation, useCashFlow } from '@/components/analytics';
 */

// Dashboards
export { BookOfBusinessDashboard, bookOfBusinessData } from './dashboards/BookOfBusinessDashboard';
export { ConnectedBookOfBusinessDashboard } from './dashboards/ConnectedBookOfBusinessDashboard';
export { CustomerSegmentationDashboard } from './dashboards/CustomerSegmentationDashboard';
// Note: CrossSellDashboard requires additional adaptation - use reference implementation for now

// Panels
export { TodayOpportunitiesPanel } from './panels/TodayOpportunitiesPanel';

// Modals
export { CsvUploadModal } from './CsvUploadModal';

// Hooks - Today's Opportunities
export { useTodayOpportunities } from './hooks/useTodayOpportunities';
export type {
  TodayOpportunity,
  TodayOpportunitiesMeta,
  ContactRequest,
} from './hooks/useTodayOpportunities';

// Hooks - Analytics API (all endpoints)
export {
  useSimulation,
  useCashFlow,
  useLeadQuality,
  useSegmentation,
  useOptimalTiming,
  useDataUpload,
} from './hooks';

// Hooks - Real-time subscriptions
export {
  useAnalyticsRealtime,
  useUploadProgress,
  useLiveMetrics,
  useAnalyticsConnectionStatus,
} from './hooks';

// Types from Analytics API
export type {
  SimulationParams,
  SimulationResult,
  SimulationResponse,
  CashFlowParams,
  CashFlowSummary,
  CashFlowResponse,
  LeadQualityParams,
  LeadScoreResult,
  LeadQualityResponse,
  LeadData,
  SegmentationParams,
  CustomerSegment,
  SegmentationResponse,
  CustomerInput,
  TimingParams,
  OptimalTimingResult,
  OptimalTimesResponse,
  UploadOptions,
  UploadResponse,
} from './hooks';

// Types from Real-time
export type {
  AnalyticsEvent,
  RealtimeState,
  UploadProgress,
  LiveMetrics,
} from './hooks';
