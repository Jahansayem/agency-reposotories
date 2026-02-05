'use client';

/**
 * Analytics API Hooks
 *
 * Provides React hooks for all analytics API endpoints.
 * Handles loading states, error handling, and data transformation.
 */

import { useState, useCallback } from 'react';

// ============================================
// Types for API Responses
// ============================================

export interface SimulationResult {
  month: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  policyCount: number;
  customerCount: number;
  commissionRevenue: number;
  operatingExpenses: number;
}

export interface SimulationResponse {
  success: boolean;
  results: SimulationResult[];
  monthCount: number;
  benchmarks: Record<string, unknown> | null;
  parameters: Record<string, unknown>;
}

export interface CashFlowSummary {
  totalPremium: number;
  monthlyCommissions: number;
  monthlyExpenses: number;
  estimatedNetIncome: number;
  workingCapitalNeeded: number;
  recommendedCashReserve: number;
  commissionLagDays: number;
}

export interface CashFlowResponse {
  success: boolean;
  summary: CashFlowSummary;
  projection: Array<{
    month: number;
    revenue: number;
    expenses: number;
    netCashFlow: number;
    cumulativeCash: number;
  }>;
  workingCapital: {
    totalWorkingCapitalNeed: number;
    monthsOfRunway: number;
    recommendation: string;
  };
  recommendations: string[];
}

export interface LeadScoreResult {
  leadId: string;
  score: number;
  predictedSegment: string;
  predictedLtv: number;
  conversionProbability: number;
  keyFactors: Record<string, number>;
}

export interface LeadQualityResponse {
  success: boolean;
  leadScore?: LeadScoreResult;
  batchResults?: {
    scores: LeadScoreResult[];
    summary: {
      total: number;
      bySegment: Record<string, number>;
      avgScore: number;
      avgLtv: number;
      highValueCount: number;
    };
  };
  vendorAnalysis?: {
    performances: Array<{
      vendorName: string;
      ltvCacRatio: number;
      rating: string;
    }>;
    recommendations: string[];
  };
}

export interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  avgLtv: number;
  characteristics: string[];
}

export interface SegmentationResponse {
  success: boolean;
  segments: CustomerSegment[];
  portfolioAnalysis: {
    totalCustomers: number;
    totalLtv: number;
    avgLtv: number;
    topSegment: string;
  };
  marketingAllocation: Record<string, number>;
}

export interface OptimalTimingResult {
  customerId: string;
  optimalWindow: {
    start: number;
    end: number;
  };
  timingMultiplier: number;
  isInWindow: boolean;
  recommendation: string;
}

export interface OptimalTimesResponse {
  success: boolean;
  results: OptimalTimingResult[];
  summary: {
    inWindow: number;
    outOfWindow: number;
    avgMultiplier: number;
  };
}

// ============================================
// Generic API Hook
// ============================================

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useApiCall<TRequest, TResponse>() {
  const [state, setState] = useState<UseApiState<TResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    endpoint: string,
    request: TRequest,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<TResponse | null> => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await fetch(endpoint, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? JSON.stringify(request) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json() as TResponse;
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setState({ data: null, loading: false, error });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// ============================================
// Simulation Hook
// ============================================

export interface SimulationParams {
  parameters?: Record<string, unknown>;
  months?: number;
  includeBenchmarks?: boolean;
}

export function useSimulation() {
  const api = useApiCall<SimulationParams, SimulationResponse>();

  const simulate = useCallback(async (params: SimulationParams = {}) => {
    return api.execute('/api/analytics/simulate', params);
  }, [api]);

  const getDefaults = useCallback(async () => {
    const response = await fetch('/api/analytics/simulate');
    return response.json();
  }, []);

  return {
    ...api,
    simulate,
    getDefaults,
  };
}

// ============================================
// Cash Flow Hook
// ============================================

export interface CashFlowParams {
  parameters: {
    monthlyPolicies: number;
    avgPremiumPerPolicy: number;
    commissionRate?: number;
    newPoliciesPerMonth?: number;
    renewalRate?: number;
    expenseRatio?: number;
  };
  config?: Record<string, unknown>;
}

export function useCashFlow() {
  const api = useApiCall<CashFlowParams, CashFlowResponse>();

  const analyze = useCallback(async (params: CashFlowParams) => {
    return api.execute('/api/analytics/cash-flow', params);
  }, [api]);

  const getDefaults = useCallback(async () => {
    const response = await fetch('/api/analytics/cash-flow');
    return response.json();
  }, []);

  return {
    ...api,
    analyze,
    getDefaults,
  };
}

// ============================================
// Lead Quality Hook
// ============================================

export interface LeadData {
  leadId: string;
  productsShopping: string[];
  homeownerStatus: string;
  ageRange: string;
  estimatedPremium: number;
  creditTier: string;
  engagementLevel: string;
  leadSource: string;
}

export interface LeadQualityParams {
  lead?: LeadData;
  leads?: LeadData[];
  vendorAnalysis?: Array<{
    vendorName: string;
    totalSpend: number;
    leadOutcomes: Array<{
      leadId: string;
      converted: boolean;
      premium?: number;
    }>;
  }>;
  options?: {
    includeFactorBreakdown?: boolean;
    sortBy?: 'score' | 'ltv' | 'conversion';
    minScore?: number;
    limit?: number;
  };
}

export function useLeadQuality() {
  const api = useApiCall<LeadQualityParams, LeadQualityResponse>();

  const scoreLeads = useCallback(async (params: LeadQualityParams) => {
    return api.execute('/api/analytics/lead-quality', params);
  }, [api]);

  const getFactorInfo = useCallback(async () => {
    const response = await fetch('/api/analytics/lead-quality');
    return response.json();
  }, []);

  return {
    ...api,
    scoreLeads,
    getFactorInfo,
  };
}

// ============================================
// Customer Segmentation Hook
// ============================================

export interface CustomerInput {
  customerId: string;
  totalPremium: number;
  policyCount: number;
  tenureYears: number;
  products: string[];
}

export interface SegmentationParams {
  customer?: CustomerInput;
  customers?: CustomerInput[];
  includeMarketingAllocation?: boolean;
}

export function useSegmentation() {
  const api = useApiCall<SegmentationParams, SegmentationResponse>();

  const analyze = useCallback(async (params: SegmentationParams) => {
    return api.execute('/api/analytics/segmentation', params);
  }, [api]);

  return {
    ...api,
    analyze,
  };
}

// ============================================
// Optimal Timing Hook
// ============================================

export interface TimingParams {
  customers: Array<{
    customerId: string;
    purchaseDate: string;
    products: string[];
    tenure: number;
  }>;
}

export function useOptimalTiming() {
  const api = useApiCall<TimingParams, OptimalTimesResponse>();

  const analyze = useCallback(async (params: TimingParams) => {
    return api.execute('/api/analytics/optimal-times', params);
  }, [api]);

  return {
    ...api,
    analyze,
  };
}

// ============================================
// Upload Hook
// ============================================

export interface UploadOptions {
  file: File;
  dataSource?: string;
  uploadedBy: string;
  agencyId?: string;
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  dryRun?: boolean;
  useEnhancedScoring?: boolean;
  blendWeight?: number;
}

export interface UploadResponse {
  success: boolean;
  batch_id: string | null;
  dry_run: boolean;
  summary: Record<string, unknown>;
  stats: {
    total_records: number;
    valid_records: number;
    records_created: number;
    records_updated: number;
    records_skipped: number;
    records_failed: number;
    parsing_errors: number;
    parsing_warnings: number;
  };
  enhanced_scoring: {
    enabled: boolean;
    blend_weight?: number;
  };
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
}

export function useDataUpload() {
  const [state, setState] = useState<UseApiState<UploadResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const upload = useCallback(async (options: UploadOptions): Promise<UploadResponse | null> => {
    setState({ data: null, loading: true, error: null });

    try {
      const formData = new FormData();
      formData.append('file', options.file);
      formData.append('uploaded_by', options.uploadedBy);

      if (options.dataSource) formData.append('data_source', options.dataSource);
      if (options.agencyId) formData.append('agency_id', options.agencyId);
      if (options.skipDuplicates) formData.append('skip_duplicates', 'true');
      if (options.updateExisting) formData.append('update_existing', 'true');
      if (options.dryRun) formData.append('dry_run', 'true');
      if (options.useEnhancedScoring) formData.append('use_enhanced_scoring', 'true');
      if (options.blendWeight !== undefined) formData.append('blend_weight', String(options.blendWeight));

      const response = await fetch('/api/analytics/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json() as UploadResponse;
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setState({ data: null, loading: false, error });
      return null;
    }
  }, []);

  const getHistory = useCallback(async (agencyId?: string, limit: number = 20) => {
    const params = new URLSearchParams();
    if (agencyId) params.append('agency_id', agencyId);
    params.append('limit', String(limit));

    const response = await fetch(`/api/analytics/upload?${params}`);
    return response.json();
  }, []);

  return {
    ...state,
    upload,
    getHistory,
  };
}
