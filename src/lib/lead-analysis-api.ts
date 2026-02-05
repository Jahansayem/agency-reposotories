/**
 * Lead Analysis API Service
 * TypeScript port of bealer-lead-model/src/lead_analysis_api.py
 *
 * Generates JSON output for frontend consumption with lead analysis calculations,
 * data processing functions, and utility functions for insurance agency lead management.
 *
 * Source: /Users/adrianstier/bealer-lead-model/src/lead_analysis_api.py
 *
 * @module lead-analysis-api
 */

// ============================================================================
// TYPE DEFINITIONS
// Source: lead_analysis_api.py lines 1-20 (implicit from data structures)
// ============================================================================

/**
 * Raw lead record from CSV data
 * Source: lead_analysis_api.py lines 21-39 (load_data function)
 */
export interface LeadRecord {
  Date: Date;
  Hour: number;
  DayOfWeek: string;
  Week: number;
  'Full name': string;
  User: string | null;
  'Call Duration In Seconds': number;
  'Current Status': string | null;
  'Call Type': string | null;
  'Vendor Name': string | null;
  From: string | null;
  // Calculated fields (added by calculateMetrics)
  Outcome?: string;
  Is_Sale?: boolean;
  Is_Hot?: boolean;
  Is_Quoted?: boolean;
  Is_Contacted?: boolean;
  Call_Category?: string;
}

/**
 * Vendor performance metrics
 * Source: lead_analysis_api.py lines 143-158
 */
export interface VendorMetrics {
  vendor: string;
  total_leads: number;
  sales: number;
  sale_rate: number;
  hot_prospects: number;
  hot_rate: number;
  quoted: number;
  quote_rate: number;
  contacted: number;
  contact_rate: number;
  avg_call_duration: number;
}

/**
 * Agent performance metrics
 * Source: lead_analysis_api.py lines 183-196
 */
export interface AgentMetrics {
  agent: string;
  total_calls: number;
  sales: number;
  sale_rate: number;
  hot_prospects: number;
  hot_rate: number;
  quoted: number;
  quote_rate: number;
  contacted: number;
  contact_rate: number;
  avg_call_duration: number;
  total_talk_hours: number;
}

/**
 * Hourly timing metrics
 * Source: lead_analysis_api.py lines 215-222
 */
export interface HourlyMetrics {
  hour: number;
  total_calls: number;
  sales: number;
  sale_rate: number;
  hot_rate: number;
  contact_rate: number;
}

/**
 * Daily timing metrics
 * Source: lead_analysis_api.py lines 239-246
 */
export interface DailyMetrics {
  day: string;
  total_calls: number;
  sales: number;
  sale_rate: number;
  hot_rate: number;
  contact_rate: number;
}

/**
 * Timing analysis result
 * Source: lead_analysis_api.py line 248
 */
export interface TimingAnalysis {
  hourly: HourlyMetrics[];
  daily: DailyMetrics[];
}

/**
 * Call type metrics
 * Source: lead_analysis_api.py lines 268-280
 */
export interface CallTypeMetrics {
  call_type: string;
  total_calls: number;
  sales: number;
  sale_rate: number;
  hot_prospects: number;
  hot_rate: number;
  quoted: number;
  quote_rate: number;
  contacted: number;
  contact_rate: number;
  avg_call_duration: number;
}

/**
 * Sales funnel analysis
 * Source: lead_analysis_api.py lines 292-305
 */
export interface FunnelAnalysis {
  total_leads: number;
  contacted: number;
  contacted_rate: number;
  quoted: number;
  quoted_rate: number;
  quoted_of_contacted: number;
  hot_prospects: number;
  hot_rate: number;
  hot_of_quoted: number;
  sold: number;
  sold_rate: number;
  sold_of_hot: number;
}

/**
 * Outcome distribution item
 * Source: lead_analysis_api.py lines 314-318
 */
export interface OutcomeItem {
  outcome: string;
  count: number;
  percentage: number;
}

/**
 * Vendor quality metrics
 * Source: lead_analysis_api.py lines 342-354
 */
export interface VendorQualityMetrics {
  vendor: string;
  total_leads: number;
  bad_phone_rate: number;
  no_contact_rate: number;
  never_requested_rate: number;
  bad_lead_rate: number;
  not_interested_rate: number;
  total_issue_rate: number;
}

/**
 * Lead quality analysis
 * Source: lead_analysis_api.py lines 357-367
 */
export interface LeadQualityAnalysis {
  overall: {
    total_leads: number;
    unreachable_rate: number;
    bad_phone_rate: number;
    never_requested_rate: number;
    not_interested_rate: number;
    bad_lead_rate: number;
  };
  by_vendor: VendorQualityMetrics[];
}

/**
 * ROI metrics by vendor
 * Source: lead_analysis_api.py lines 496-507
 */
export interface VendorROIMetrics {
  vendor: string;
  total_leads: number;
  total_spend: number;
  sales: number;
  cpl: number;
  cpq: number | null;
  cpb: number | null;
  leads_per_sale: number | null;
  estimated_revenue: number;
  roi_percent: number;
}

/**
 * ROI analysis result
 * Source: lead_analysis_api.py lines 515-521
 */
export interface ROIAnalysis {
  vendor_costs: Record<string, number>;
  avg_cpl: number;
  total_spend: number;
  assumed_avg_premium: number;
  by_vendor: VendorROIMetrics[];
}

/**
 * Loss reasons breakdown
 * Source: lead_analysis_api.py lines 540-568
 */
export interface LossReasons {
  before_contact: {
    total_lost: number;
    percentage: number;
    breakdown: {
      no_contact: number;
      bad_phone: number;
      left_message: number;
      dnc: number;
    };
  };
  after_contact: {
    total_lost: number;
    percentage: number;
    breakdown: {
      not_interested: number;
      not_eligible: number;
      never_requested: number;
      hung_up: number;
      already_purchased: number;
    };
  };
  after_quote: {
    total_lost: number;
    percentage: number;
    breakdown: {
      quoted_not_interested: number;
    };
  };
}

/**
 * Funnel bottleneck analysis
 * Source: lead_analysis_api.py lines 580-583
 */
export interface FunnelBottleneckAnalysis {
  loss_reasons: LossReasons;
  conversion_rates: {
    lead_to_contact: number;
    contact_to_quote: number;
    quote_to_hot: number;
    hot_to_sale: number;
    overall_conversion: number;
  };
}

/**
 * Attempt analysis item
 * Source: lead_analysis_api.py lines 614-619
 */
export interface AttemptAnalysis {
  attempts: number;
  lead_count: number;
  sale_rate: number;
  contact_rate: number;
}

/**
 * Call attempts analysis
 * Source: lead_analysis_api.py lines 630-637
 */
export interface CallAttemptsAnalysis {
  average_attempts: number;
  max_attempts: number;
  single_attempt_leads: number;
  multiple_attempt_leads: number;
  persistence_rate: number;
  by_attempt_count: AttemptAnalysis[];
}

/**
 * Agent-vendor combination metrics
 * Source: lead_analysis_api.py lines 658-666
 */
export interface AgentVendorCombination {
  agent: string;
  vendor: string;
  total_calls: number;
  sales: number;
  sale_rate: number;
  contact_rate: number;
  quote_rate: number;
}

/**
 * Agent-vendor match analysis
 * Source: lead_analysis_api.py lines 671-675
 */
export interface AgentVendorMatchAnalysis {
  top_combinations: AgentVendorCombination[];
  worst_combinations: AgentVendorCombination[];
  total_combinations: number;
}

/**
 * Recommendation item
 * Source: lead_analysis_api.py lines 686-691 (pattern)
 */
export interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  impact: string;
}

/**
 * Action plan
 * Source: lead_analysis_api.py lines 819-843
 */
export interface ActionPlan {
  current_state: {
    total_leads: number;
    total_sales: number;
    overall_sale_rate: number;
  };
  immediate_actions: string[];
  short_term_actions: string[];
  ongoing_actions: string[];
  improvement_potential: number | null;
  best_hours: number[];
  best_days: string[];
}

/**
 * Duration bracket result
 * Source: lead_analysis_api.py lines 874-881
 */
export interface DurationBracketResult {
  bracket: string;
  total_calls: number;
  sales: number;
  sale_rate: number;
  quote_rate: number;
  contact_rate: number;
}

/**
 * Call duration outcomes analysis
 * Source: lead_analysis_api.py lines 901-906
 */
export interface CallDurationOutcomesAnalysis {
  duration_brackets: DurationBracketResult[];
  optimal_duration: string | null;
  optimal_sale_rate: number | null;
  avg_duration_by_outcome: Record<string, number>;
}

/**
 * Weekly data item
 * Source: lead_analysis_api.py lines 927-944
 */
export interface WeeklyDataItem {
  week: number;
  total_leads: number;
  sales: number;
  sale_rate: number;
  contact_rate: number;
  quote_rate: number;
  avg_duration: number;
  sale_rate_change: number;
}

/**
 * Weekly trends analysis
 * Source: lead_analysis_api.py lines 958-963
 */
export interface WeeklyTrendsAnalysis {
  weekly_data: WeeklyDataItem[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  trend_change_pct: number;
  total_weeks: number;
}

/**
 * Benchmark level definition
 * Source: lead_analysis_api.py lines 968-1023
 */
export interface BenchmarkLevel {
  poor?: number;
  average?: number;
  good?: number;
  excellent?: number;
  min?: number;
  optimal?: number;
  max?: number;
  description: string;
}

/**
 * Industry benchmarks
 * Source: lead_analysis_api.py lines 965-1023
 */
export interface IndustryBenchmarks {
  sale_rate: BenchmarkLevel;
  contact_rate: BenchmarkLevel;
  quote_rate: BenchmarkLevel;
  cost_per_bind: BenchmarkLevel;
  ltv_cac_ratio: BenchmarkLevel;
  avg_call_duration_sale: BenchmarkLevel;
  speed_to_lead: BenchmarkLevel;
  call_attempts: BenchmarkLevel;
}

/**
 * Column info for data overview
 * Source: lead_analysis_api.py lines 1029-1072
 */
export interface ColumnInfo {
  description: string;
  sample_values: string[];
  interpretation: string;
  data_type: string;
}

/**
 * Status classification info
 * Source: lead_analysis_api.py lines 1075-1106
 */
export interface StatusClassificationInfo {
  example_statuses: string[];
  meaning: string;
  funnel_stage: string;
}

/**
 * Calculated metric info
 * Source: lead_analysis_api.py lines 1109-1150
 */
export interface CalculatedMetricInfo {
  metric: string;
  formula: string;
  purpose: string;
}

/**
 * Data overview
 * Source: lead_analysis_api.py lines 1161-1173
 */
export interface DataOverview {
  columns: Record<string, ColumnInfo>;
  status_classification: Record<string, StatusClassificationInfo>;
  calculated_metrics: CalculatedMetricInfo[];
  data_notes: string[];
  methodology_summary: string;
}

/**
 * Summary statistics
 * Source: lead_analysis_api.py lines 1213-1223
 */
export interface SummaryStats {
  total_records: number;
  date_range: {
    start: string;
    end: string;
  };
  overall_sale_rate: number;
  overall_contact_rate: number;
  overall_quote_rate: number;
  generated_at: string;
}

/**
 * Diagnostic analyses collection
 * Source: lead_analysis_api.py lines 1234-1243
 */
export interface DiagnosticAnalyses {
  lead_quality: LeadQualityAnalysis;
  roi_metrics: ROIAnalysis;
  funnel_bottlenecks: FunnelBottleneckAnalysis;
  call_attempts: CallAttemptsAnalysis;
  agent_vendor_match: AgentVendorMatchAnalysis;
  call_duration_outcomes: CallDurationOutcomesAnalysis;
  weekly_trends: WeeklyTrendsAnalysis;
}

/**
 * Complete analysis result
 * Source: lead_analysis_api.py lines 1225-1247
 */
export interface LeadAnalysisResult {
  summary: SummaryStats;
  vendors: VendorMetrics[];
  agents: AgentMetrics[];
  timing: TimingAnalysis;
  call_types: CallTypeMetrics[];
  funnel: FunnelAnalysis;
  outcomes: OutcomeItem[];
  recommendations: Recommendation[];
  diagnostics: DiagnosticAnalyses;
  action_plan: ActionPlan;
  data_overview: DataOverview;
  industry_benchmarks: IndustryBenchmarks;
}

// ============================================================================
// CONSTANTS
// Source: lead_analysis_api.py lines 369-421
// ============================================================================

/**
 * Actual vendor lead costs (from Brittney Bealer's agency - Nov 2025)
 *
 * SOURCE: data/07_brittney_bealer/ (invoice PDFs converted to CSVs)
 *   - alm_leads_detailed.csv: 304 itemized ALM leads
 *   - quotewizard_channels.csv: QW Sept + Oct channel breakdown
 *   - quotewizard_financial_summary.csv: QW financial summary
 *   - invoice_details.md: Complete analysis documentation
 *
 * Team Roles:
 *   Telemarketers: Layne, Maicah (Maicah has longer calls before transfer)
 *   LSPs (Licensed): Karina, Amanda, Brandon, Samantha
 *
 * Revenue: 9% base commission + up to 11% bonus for auto volume (~$1k avg premium)
 * Note: No-contact disposition stays while lead is worked for up to 75 days
 * Discontinued vendors: Blue Wave, Lead Clinic Live Transfers
 *
 * ALM Invoice Analysis (Aug-Nov 2025):
 *   - Web leads: 291 @ $8-$27 each (avg ~$19.22) = $5,592
 *   - Live transfers: 16 @ $66-$104 each (avg ~$81.50) = $1,304
 *   - Total: $6,896 for 307 leads = $22.46 blended avg
 *
 * QuoteWizard Invoices:
 *   Sept 2025: 909 net leads @ $7 avg = $6,393
 *   Oct 2025:  1,748 net leads (917 @ $4 + 831 @ $7) = $9,485 ($5.43 blended)
 *   Total: $15,878 for 2,657 leads (~$5.98 avg)
 *   Credit rate: ~15% (bad leads credited back)
 *
 * Vendor costs mapped to EXACT names in the data
 * Data shows: QuoteWizard-Auto, Imported-for-list-uploads, EverQuote-LCS,
 *             Lead-Clinic-Internet, ALM-Internet, Blue-Wave-Live-Call-Transfer,
 *             Lead-Clinic-Live-Transfers, Manually-Added-Leads, Referrals
 *
 * Source: lead_analysis_api.py lines 398-421
 */
export const VENDOR_COSTS: Record<string, number> = {
  // Active vendors (from invoices)
  'QuoteWizard-Auto': 6, // 35,785 leads - Blended avg ~$6 (Sept $7, Oct $5.43)
  'EverQuote-LCS': 7, // 6,303 leads - $7/lead confirmed
  'ALM-Internet': 19, // 869 leads - Web leads avg ~$19 ($8-$27 range)

  // Discontinued vendors
  'Blue-Wave-Live-Call-Transfer': 55, // 171 leads - DISCONTINUED
  'Lead-Clinic-Live-Transfers': 60, // 35 leads - DISCONTINUED ($55 + $5 call center)
  'Lead-Clinic-Internet': 10, // 4,333 leads - Auto data leads

  // No-cost sources
  'Imported-for-list-uploads': 0, // 6,366 leads - Old re-engaged leads (already paid ~$7 orig)
  'Manually-Added-Leads': 0, // 18 leads - Walk-ins/referrals
  Referrals: 0, // 12 leads - Referrals

  // Legacy aliases for fuzzy matching
  QuoteWizard: 6,
  EverQuote: 7,
  ALM: 19,
  'Blue Wave': 55,
  'Lead Clinic': 10,
  Imported: 0,
};

/**
 * Day of week order for consistent sorting
 * Source: lead_analysis_api.py line 225
 */
export const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a value is null or undefined
 * Helper for TypeScript null checking (equivalent to pd.isna)
 */
function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Round a number to specified decimal places
 * Source: lead_analysis_api.py (used throughout with .round())
 */
function round(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Safe division that returns 0 when dividing by zero
 */
function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Get ISO week number from a date
 * Source: lead_analysis_api.py line 37 (data['Date'].dt.isocalendar().week)
 */
function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get day name from a date
 * Source: lead_analysis_api.py line 36 (data['Date'].dt.day_name())
 */
function getDayName(date: Date): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[date.getDay()];
}

// ============================================================================
// CLASSIFICATION FUNCTIONS
// Source: lead_analysis_api.py lines 41-116
// ============================================================================

/**
 * Classify lead status into outcome categories
 *
 * Source: lead_analysis_api.py lines 41-93
 *
 * @param status - The current status string from the lead record
 * @returns Classified outcome category
 */
export function classifyOutcome(status: string | null | undefined): string {
  // Source: lead_analysis_api.py lines 43-44
  if (isNullish(status)) {
    return 'Unknown';
  }

  const statusUpper = String(status).toUpperCase();

  // Source: lead_analysis_api.py lines 48-49
  if (statusUpper.includes('SOLD') || statusUpper.includes('CUSTOMER')) {
    return 'SOLD';
  }
  // Source: lead_analysis_api.py lines 50-51
  if (statusUpper.includes('HOT')) {
    return 'HOT_PROSPECT';
  }
  // Source: lead_analysis_api.py lines 52-53
  if (statusUpper.includes('XDATE')) {
    return 'XDATE_SET';
  }
  // Source: lead_analysis_api.py lines 54-55
  if (statusUpper.includes('ONBOARDING')) {
    return 'ONBOARDING';
  }
  // Source: lead_analysis_api.py lines 56-57
  if (
    statusUpper.includes('QUOTED') &&
    !statusUpper.includes('NOT INTERESTED')
  ) {
    return 'QUOTED';
  }
  // Source: lead_analysis_api.py lines 58-59
  if (statusUpper.includes('QUOTED - NOT INTERESTED')) {
    return 'QUOTED_NOT_INTERESTED';
  }
  // Source: lead_analysis_api.py lines 60-61
  if (statusUpper.includes('TRANSFERRED')) {
    return statusUpper.includes('FAILED') ? 'TRANSFER_FAILED' : 'TRANSFERRED';
  }
  // Source: lead_analysis_api.py lines 62-77
  if (statusUpper.includes('CONTACTED')) {
    if (statusUpper.includes('NOT INTERESTED')) {
      return 'NOT_INTERESTED';
    }
    if (statusUpper.includes('NOT ELIGIBLE')) {
      return 'NOT_ELIGIBLE';
    }
    if (statusUpper.includes('NEVER REQUESTED')) {
      return 'NEVER_REQUESTED';
    }
    if (statusUpper.includes('ALREADY PURCHASED')) {
      return 'ALREADY_PURCHASED';
    }
    if (
      statusUpper.includes('BAD LEAD') ||
      statusUpper.includes('ALLSTATE')
    ) {
      return 'BAD_LEAD';
    }
    if (statusUpper.includes('HUNG UP')) {
      return 'HUNG_UP';
    }
    if (statusUpper.includes('FOLLOW UP')) {
      return 'FOLLOW_UP';
    }
    return 'CONTACTED_OTHER';
  }
  // Source: lead_analysis_api.py lines 78-79
  if (statusUpper.includes('NO CONTACT')) {
    return 'NO_CONTACT';
  }
  // Source: lead_analysis_api.py lines 80-81
  if (statusUpper.includes('BAD PHONE')) {
    return 'BAD_PHONE';
  }
  // Source: lead_analysis_api.py lines 82-83
  if (statusUpper.includes('LEFT MESSAGE')) {
    return 'LEFT_MESSAGE';
  }
  // Source: lead_analysis_api.py lines 84-85
  if (statusUpper.includes('DO NOT CALL')) {
    return 'DNC';
  }
  // Source: lead_analysis_api.py lines 86-87
  if (statusUpper.includes('REQUOTE')) {
    return 'REQUOTE';
  }
  // Source: lead_analysis_api.py lines 88-89
  if (statusUpper.includes('RECYCLED')) {
    return 'RECYCLED';
  }
  // Source: lead_analysis_api.py lines 90-91
  if (statusUpper.includes('BUSINESS')) {
    return 'BUSINESS';
  }

  // Source: lead_analysis_api.py line 93
  return 'OTHER';
}

/**
 * Categorize call types into broader categories
 *
 * Source: lead_analysis_api.py lines 95-115
 *
 * @param callType - The call type string from the lead record
 * @returns Categorized call type
 */
export function categorizeCallType(callType: string | null | undefined): string {
  // Source: lead_analysis_api.py lines 97-98
  if (isNullish(callType)) {
    return 'Unknown';
  }

  const callTypeUpper = String(callType).toUpperCase();

  // Source: lead_analysis_api.py lines 102-103
  if (
    callTypeUpper.includes('LIVE') ||
    callTypeUpper.includes('LIVE-Q') ||
    callTypeUpper.includes('EVE-Q')
  ) {
    return 'Live Transfer';
  }
  // Source: lead_analysis_api.py lines 104-105
  if (callTypeUpper.includes('INBOUND')) {
    return 'Inbound';
  }
  // Source: lead_analysis_api.py lines 106-107
  if (callTypeUpper.includes('TELEMARKETING')) {
    return 'Telemarketing';
  }
  // Source: lead_analysis_api.py lines 108-109
  if (callTypeUpper.includes('SHARK TANK')) {
    return 'Shark Tank';
  }
  // Source: lead_analysis_api.py lines 110-111
  if (callTypeUpper.includes('ASSIGNED')) {
    return 'Assigned Follow-up';
  }
  // Source: lead_analysis_api.py lines 112-113
  if (callTypeUpper.includes('MANUAL')) {
    return 'Manual Dial';
  }

  // Source: lead_analysis_api.py line 115
  return 'Other';
}

/**
 * Get the cost per lead for a vendor, with fuzzy matching
 *
 * Source: lead_analysis_api.py lines 423-458
 *
 * @param vendorName - The vendor name to look up
 * @returns Cost per lead in dollars
 */
export function getVendorCost(vendorName: string | null | undefined): number {
  // Source: lead_analysis_api.py lines 425-426
  if (isNullish(vendorName)) {
    return 0;
  }

  const vendorUpper = String(vendorName).toUpperCase();

  // Source: lead_analysis_api.py lines 430-432 - Direct exact match first
  if (vendorName in VENDOR_COSTS) {
    return VENDOR_COSTS[vendorName];
  }

  // Source: lead_analysis_api.py lines 434-437 - Direct matches by substring
  for (const [knownVendor, cost] of Object.entries(VENDOR_COSTS)) {
    if (
      knownVendor.toUpperCase().includes(vendorUpper) ||
      vendorUpper.includes(knownVendor.toUpperCase())
    ) {
      return cost;
    }
  }

  // Source: lead_analysis_api.py lines 439-458 - Fuzzy matches for common variations
  if (vendorUpper.includes('BLUE') && vendorUpper.includes('WAVE')) {
    return 55;
  }
  if (vendorUpper.includes('CLINIC') && vendorUpper.includes('LIVE')) {
    return 60; // Lead Clinic Live Transfer
  }
  if (vendorUpper.includes('CLINIC')) {
    return 10; // Lead Clinic internet leads
  }
  if (vendorUpper.includes('WIZARD') || vendorUpper.includes('QUOTEWIZARD')) {
    return 6; // Blended avg from invoices
  }
  if (vendorUpper.includes('EVER') || vendorUpper.includes('EVERQUOTE')) {
    return 7;
  }
  if (vendorUpper.includes('ALM')) {
    return 19; // ALM web leads (default)
  }
  if (
    vendorUpper.includes('IMPORT') ||
    vendorUpper.includes('LIST') ||
    vendorUpper.includes('UPLOAD')
  ) {
    return 0; // Already paid for - no current cost
  }
  if (vendorUpper.includes('MANUAL') || vendorUpper.includes('REFERRAL')) {
    return 0; // Organic/no cost
  }

  // Source: lead_analysis_api.py line 458 - Default fallback for unknown vendors
  return 10; // Conservative estimate
}

// ============================================================================
// DATA PROCESSING FUNCTIONS
// Source: lead_analysis_api.py lines 117-126
// ============================================================================

/**
 * Calculate key performance metrics and add calculated fields to records
 *
 * Source: lead_analysis_api.py lines 117-126
 *
 * @param data - Array of lead records
 * @returns Records with calculated fields added
 */
export function calculateMetrics(data: LeadRecord[]): LeadRecord[] {
  return data.map((record) => {
    // Source: lead_analysis_api.py line 119
    const outcome = classifyOutcome(record['Current Status']);

    // Source: lead_analysis_api.py line 120
    const isSale = outcome === 'SOLD' || outcome === 'ONBOARDING';

    // Source: lead_analysis_api.py line 121
    const isHot = ['SOLD', 'ONBOARDING', 'HOT_PROSPECT', 'XDATE_SET'].includes(
      outcome
    );

    // Source: lead_analysis_api.py line 122
    const isQuoted = [
      'SOLD',
      'ONBOARDING',
      'HOT_PROSPECT',
      'XDATE_SET',
      'QUOTED',
    ].includes(outcome);

    // Source: lead_analysis_api.py line 123
    const isContacted = ![
      'NO_CONTACT',
      'BAD_PHONE',
      'LEFT_MESSAGE',
      'DNC',
      'RECYCLED',
      'OTHER',
    ].includes(outcome);

    // Source: lead_analysis_api.py line 124
    const callCategory = categorizeCallType(record['Call Type']);

    return {
      ...record,
      Outcome: outcome,
      Is_Sale: isSale,
      Is_Hot: isHot,
      Is_Quoted: isQuoted,
      Is_Contacted: isContacted,
      Call_Category: callCategory,
    };
  });
}

/**
 * Parse date and add derived time fields to a record
 *
 * Source: lead_analysis_api.py lines 33-38
 *
 * @param record - Record with Date field
 * @returns Record with Hour, DayOfWeek, and Week fields added
 */
export function parseRecordDate(
  record: Omit<LeadRecord, 'Hour' | 'DayOfWeek' | 'Week'> & { Date: Date | string }
): LeadRecord {
  const date =
    record.Date instanceof Date ? record.Date : new Date(record.Date);

  return {
    ...record,
    Date: date,
    Hour: date.getHours(),
    DayOfWeek: getDayName(date),
    Week: getISOWeek(date),
  } as LeadRecord;
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze performance by lead vendor/source
 *
 * Source: lead_analysis_api.py lines 128-160
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Array of vendor metrics sorted by sale rate descending
 */
export function analyzeVendors(data: LeadRecord[]): VendorMetrics[] {
  // Group by vendor
  const vendorGroups = new Map<string, LeadRecord[]>();

  for (const record of data) {
    const vendor = record['Vendor Name'] ?? 'Unknown';
    if (!vendorGroups.has(vendor)) {
      vendorGroups.set(vendor, []);
    }
    vendorGroups.get(vendor)!.push(record);
  }

  const result: VendorMetrics[] = [];

  // Source: lead_analysis_api.py lines 130-141 - Calculate aggregated metrics
  for (const [vendor, records] of vendorGroups) {
    const totalLeads = records.length;
    const sales = records.filter((r) => r.Is_Sale).length;
    const hotProspects = records.filter((r) => r.Is_Hot).length;
    const quoted = records.filter((r) => r.Is_Quoted).length;
    const contacted = records.filter((r) => r.Is_Contacted).length;
    const avgCallDuration =
      records.reduce((sum, r) => sum + (r['Call Duration In Seconds'] || 0), 0) /
      totalLeads;

    // Source: lead_analysis_api.py lines 146-158
    result.push({
      vendor,
      total_leads: totalLeads,
      sales,
      sale_rate: round((sales / totalLeads) * 100, 2),
      hot_prospects: hotProspects,
      hot_rate: round((hotProspects / totalLeads) * 100, 2),
      quoted,
      quote_rate: round((quoted / totalLeads) * 100, 2),
      contacted,
      contact_rate: round((contacted / totalLeads) * 100, 2),
      avg_call_duration: round(avgCallDuration, 1),
    });
  }

  // Source: lead_analysis_api.py line 141 - Sort by sale rate descending
  return result.sort((a, b) => b.sale_rate - a.sale_rate);
}

/**
 * Analyze performance by sales agent
 *
 * Source: lead_analysis_api.py lines 162-198
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Array of agent metrics sorted by sale rate descending
 */
export function analyzeAgents(data: LeadRecord[]): AgentMetrics[] {
  // Source: lead_analysis_api.py line 164 - Filter to records with User
  const agentData = data.filter(
    (r) => r.User !== null && r.User !== undefined && r.User !== ''
  );

  // Group by agent
  const agentGroups = new Map<string, LeadRecord[]>();

  for (const record of agentData) {
    const agent = record.User!;
    if (!agentGroups.has(agent)) {
      agentGroups.set(agent, []);
    }
    agentGroups.get(agent)!.push(record);
  }

  const result: AgentMetrics[] = [];

  // Source: lead_analysis_api.py lines 166-178 - Calculate aggregated metrics
  for (const [agent, records] of agentGroups) {
    const totalCalls = records.length;
    const sales = records.filter((r) => r.Is_Sale).length;
    const hotProspects = records.filter((r) => r.Is_Hot).length;
    const quoted = records.filter((r) => r.Is_Quoted).length;
    const contacted = records.filter((r) => r.Is_Contacted).length;
    const totalTalkTime = records.reduce(
      (sum, r) => sum + (r['Call Duration In Seconds'] || 0),
      0
    );
    const avgCallDuration = totalTalkTime / totalCalls;

    // Source: lead_analysis_api.py lines 183-196
    result.push({
      agent,
      total_calls: totalCalls,
      sales,
      sale_rate: round((sales / totalCalls) * 100, 2),
      hot_prospects: hotProspects,
      hot_rate: round((hotProspects / totalCalls) * 100, 2),
      quoted,
      quote_rate: round((quoted / totalCalls) * 100, 2),
      contacted,
      contact_rate: round((contacted / totalCalls) * 100, 2),
      avg_call_duration: round(avgCallDuration, 1),
      total_talk_hours: round(totalTalkTime / 3600, 1),
    });
  }

  // Source: lead_analysis_api.py line 178 - Sort by sale rate descending
  return result.sort((a, b) => b.sale_rate - a.sale_rate);
}

/**
 * Analyze performance by time of day and day of week
 *
 * Source: lead_analysis_api.py lines 200-248
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Timing analysis with hourly and daily breakdowns
 */
export function analyzeTiming(data: LeadRecord[]): TimingAnalysis {
  // Source: lead_analysis_api.py lines 202-222 - Hour of day analysis
  const hourGroups = new Map<number, LeadRecord[]>();
  for (const record of data) {
    const hour = record.Hour;
    if (!hourGroups.has(hour)) {
      hourGroups.set(hour, []);
    }
    hourGroups.get(hour)!.push(record);
  }

  const hourly: HourlyMetrics[] = [];
  for (const [hour, records] of Array.from(hourGroups).sort(
    (a, b) => a[0] - b[0]
  )) {
    const totalCalls = records.length;
    const sales = records.filter((r) => r.Is_Sale).length;

    // Source: lead_analysis_api.py lines 215-222
    hourly.push({
      hour,
      total_calls: totalCalls,
      sales,
      sale_rate: round((sales / totalCalls) * 100, 2),
      hot_rate: round(
        (records.filter((r) => r.Is_Hot).length / totalCalls) * 100,
        2
      ),
      contact_rate: round(
        (records.filter((r) => r.Is_Contacted).length / totalCalls) * 100,
        2
      ),
    });
  }

  // Source: lead_analysis_api.py lines 224-246 - Day of week analysis
  const dayGroups = new Map<string, LeadRecord[]>();
  for (const record of data) {
    const day = record.DayOfWeek;
    if (!dayGroups.has(day)) {
      dayGroups.set(day, []);
    }
    dayGroups.get(day)!.push(record);
  }

  const daily: DailyMetrics[] = [];
  // Source: lead_analysis_api.py lines 236-246 - Maintain day order
  for (const day of DAY_ORDER) {
    const records = dayGroups.get(day);
    if (records && records.length > 0) {
      const totalCalls = records.length;
      const sales = records.filter((r) => r.Is_Sale).length;

      daily.push({
        day,
        total_calls: totalCalls,
        sales,
        sale_rate: round((sales / totalCalls) * 100, 2),
        hot_rate: round(
          (records.filter((r) => r.Is_Hot).length / totalCalls) * 100,
          2
        ),
        contact_rate: round(
          (records.filter((r) => r.Is_Contacted).length / totalCalls) * 100,
          2
        ),
      });
    }
  }

  // Source: lead_analysis_api.py line 248
  return { hourly, daily };
}

/**
 * Analyze performance by call type category
 *
 * Source: lead_analysis_api.py lines 250-282
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Array of call type metrics sorted by sale rate descending
 */
export function analyzeCallTypes(data: LeadRecord[]): CallTypeMetrics[] {
  // Group by call category
  const catGroups = new Map<string, LeadRecord[]>();
  for (const record of data) {
    const category = record.Call_Category ?? 'Unknown';
    if (!catGroups.has(category)) {
      catGroups.set(category, []);
    }
    catGroups.get(category)!.push(record);
  }

  const result: CallTypeMetrics[] = [];

  // Source: lead_analysis_api.py lines 252-263 - Calculate aggregated metrics
  for (const [callType, records] of catGroups) {
    const totalCalls = records.length;
    const sales = records.filter((r) => r.Is_Sale).length;
    const hotProspects = records.filter((r) => r.Is_Hot).length;
    const quoted = records.filter((r) => r.Is_Quoted).length;
    const contacted = records.filter((r) => r.Is_Contacted).length;
    const avgCallDuration =
      records.reduce((sum, r) => sum + (r['Call Duration In Seconds'] || 0), 0) /
      totalCalls;

    // Source: lead_analysis_api.py lines 268-280
    result.push({
      call_type: callType,
      total_calls: totalCalls,
      sales,
      sale_rate: round((sales / totalCalls) * 100, 2),
      hot_prospects: hotProspects,
      hot_rate: round((hotProspects / totalCalls) * 100, 2),
      quoted,
      quote_rate: round((quoted / totalCalls) * 100, 2),
      contacted,
      contact_rate: round((contacted / totalCalls) * 100, 2),
      avg_call_duration: round(avgCallDuration, 1),
    });
  }

  // Source: lead_analysis_api.py line 263 - Sort by sale rate descending
  return result.sort((a, b) => b.sale_rate - a.sale_rate);
}

/**
 * Analyze the sales funnel
 *
 * Source: lead_analysis_api.py lines 284-305
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Funnel analysis with counts and conversion rates
 */
export function analyzeFunnel(data: LeadRecord[]): FunnelAnalysis {
  // Source: lead_analysis_api.py lines 286-290
  const total = data.length;
  const contacted = data.filter((r) => r.Is_Contacted).length;
  const quoted = data.filter((r) => r.Is_Quoted).length;
  const hot = data.filter((r) => r.Is_Hot).length;
  const sold = data.filter((r) => r.Is_Sale).length;

  // Source: lead_analysis_api.py lines 292-305
  return {
    total_leads: total,
    contacted,
    contacted_rate: round((contacted / total) * 100, 2),
    quoted,
    quoted_rate: round((quoted / total) * 100, 2),
    quoted_of_contacted: contacted > 0 ? round((quoted / contacted) * 100, 2) : 0,
    hot_prospects: hot,
    hot_rate: round((hot / total) * 100, 2),
    hot_of_quoted: quoted > 0 ? round((hot / quoted) * 100, 2) : 0,
    sold,
    sold_rate: round((sold / total) * 100, 2),
    sold_of_hot: hot > 0 ? round((sold / hot) * 100, 2) : 0,
  };
}

/**
 * Outcome distribution analysis
 *
 * Source: lead_analysis_api.py lines 307-320
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Array of outcome counts and percentages
 */
export function analyzeOutcomes(data: LeadRecord[]): OutcomeItem[] {
  // Source: lead_analysis_api.py line 309 - Count by outcome
  const outcomeCounts = new Map<string, number>();
  for (const record of data) {
    const outcome = record.Outcome ?? 'Unknown';
    outcomeCounts.set(outcome, (outcomeCounts.get(outcome) || 0) + 1);
  }

  const total = data.length;

  // Source: lead_analysis_api.py lines 312-318 - Convert to array and sort by count
  const result: OutcomeItem[] = [];
  for (const [outcome, count] of outcomeCounts) {
    result.push({
      outcome,
      count,
      percentage: round((count / total) * 100, 2),
    });
  }

  return result.sort((a, b) => b.count - a.count);
}

/**
 * Analyze lead source quality - answers diagnostic questions about lead validity
 *
 * Source: lead_analysis_api.py lines 322-367
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Lead quality analysis with overall and per-vendor metrics
 */
export function analyzeLeadQuality(data: LeadRecord[]): LeadQualityAnalysis {
  const total = data.length;

  // Source: lead_analysis_api.py lines 327-332 - Calculate key quality metrics
  const noContact = data.filter((r) => r.Outcome === 'NO_CONTACT').length;
  const badPhone = data.filter((r) => r.Outcome === 'BAD_PHONE').length;
  const leftMessage = data.filter((r) => r.Outcome === 'LEFT_MESSAGE').length;
  const notInterested = data.filter((r) => r.Outcome === 'NOT_INTERESTED').length;
  const neverRequested = data.filter(
    (r) => r.Outcome === 'NEVER_REQUESTED'
  ).length;
  const badLead = data.filter((r) => r.Outcome === 'BAD_LEAD').length;

  // Source: lead_analysis_api.py lines 334-355 - Quality issues by vendor
  const vendorQuality: VendorQualityMetrics[] = [];
  const vendorSet = new Set(data.map((r) => r['Vendor Name']));

  for (const vendor of vendorSet) {
    if (!vendor) continue;

    const vData = data.filter((r) => r['Vendor Name'] === vendor);
    const vTotal = vData.length;

    // Source: lead_analysis_api.py lines 339-340 - Skip small samples
    if (vTotal < 10) continue;

    const metrics: VendorQualityMetrics = {
      vendor,
      total_leads: vTotal,
      bad_phone_rate: round(
        (vData.filter((r) => r.Outcome === 'BAD_PHONE').length / vTotal) * 100,
        2
      ),
      no_contact_rate: round(
        (vData.filter((r) => r.Outcome === 'NO_CONTACT').length / vTotal) * 100,
        2
      ),
      never_requested_rate: round(
        (vData.filter((r) => r.Outcome === 'NEVER_REQUESTED').length / vTotal) *
          100,
        2
      ),
      bad_lead_rate: round(
        (vData.filter((r) => r.Outcome === 'BAD_LEAD').length / vTotal) * 100,
        2
      ),
      not_interested_rate: round(
        (vData.filter((r) => r.Outcome === 'NOT_INTERESTED').length / vTotal) *
          100,
        2
      ),
      total_issue_rate: 0, // Calculated below
    };

    // Source: lead_analysis_api.py lines 353-354
    metrics.total_issue_rate = round(
      metrics.bad_phone_rate +
        metrics.never_requested_rate +
        metrics.bad_lead_rate,
      2
    );

    vendorQuality.push(metrics);
  }

  // Source: lead_analysis_api.py line 355 - Sort by total bad rate
  vendorQuality.sort((a, b) => b.total_issue_rate - a.total_issue_rate);

  // Source: lead_analysis_api.py lines 357-367
  return {
    overall: {
      total_leads: total,
      unreachable_rate: round(
        ((noContact + badPhone + leftMessage) / total) * 100,
        2
      ),
      bad_phone_rate: round((badPhone / total) * 100, 2),
      never_requested_rate: round((neverRequested / total) * 100, 2),
      not_interested_rate: round((notInterested / total) * 100, 2),
      bad_lead_rate: round((badLead / total) * 100, 2),
    },
    by_vendor: vendorQuality,
  };
}

/**
 * Calculate ROI metrics - CPL, CPQ, CPB for each vendor using actual costs
 *
 * Brittney Bealer's agency:
 * - Avg premium: ~$1,000/policy
 * - Commission: 9% base (can unlock +11% with volume)
 *
 * Source: lead_analysis_api.py lines 460-521
 *
 * @param data - Array of lead records with calculated metrics
 * @param assumedAvgPremium - Average policy premium (default: $1000)
 * @param commissionRate - Commission rate (default: 0.09 = 9%)
 * @returns ROI analysis with per-vendor breakdown
 */
export function analyzeROIMetrics(
  data: LeadRecord[],
  assumedAvgPremium: number = 1000,
  commissionRate: number = 0.09
): ROIAnalysis {
  const roiData: VendorROIMetrics[] = [];
  let totalSpendAll = 0;
  let totalLeadsAll = 0;

  // Source: lead_analysis_api.py lines 471-507 - Calculate per-vendor ROI
  const vendorSet = new Set(data.map((r) => r['Vendor Name']));

  for (const vendor of vendorSet) {
    if (!vendor) continue;

    const vData = data.filter((r) => r['Vendor Name'] === vendor);
    const vTotal = vData.length;

    // Source: lead_analysis_api.py lines 474-475 - Skip small samples
    if (vTotal < 10) continue;

    const contacted = vData.filter((r) => r.Is_Contacted).length;
    const quoted = vData.filter((r) => r.Is_Quoted).length;
    const sold = vData.filter((r) => r.Is_Sale).length;

    // Source: lead_analysis_api.py line 482 - Get actual cost per lead
    const cpl = getVendorCost(vendor);

    // Source: lead_analysis_api.py lines 484-488 - Calculate costs
    const totalSpend = vTotal * cpl;
    totalSpendAll += totalSpend;
    totalLeadsAll += vTotal;

    const cpq = quoted > 0 ? totalSpend / quoted : 0;
    const cpb = sold > 0 ? totalSpend / sold : 0;

    // Source: lead_analysis_api.py lines 493-494 - Estimated revenue
    const estimatedRevenue = sold * assumedAvgPremium * commissionRate;
    const roi =
      totalSpend > 0
        ? ((estimatedRevenue - totalSpend) / totalSpend) * 100
        : 0;

    // Source: lead_analysis_api.py lines 496-507
    roiData.push({
      vendor,
      total_leads: vTotal,
      total_spend: round(totalSpend, 2),
      sales: sold,
      cpl,
      cpq: cpq > 0 ? round(cpq, 2) : null,
      cpb: cpb > 0 ? round(cpb, 2) : null,
      leads_per_sale: sold > 0 ? round(vTotal / sold, 1) : null,
      estimated_revenue: round(estimatedRevenue, 2),
      roi_percent: round(roi, 1),
    });
  }

  // Source: lead_analysis_api.py line 510 - Sort by ROI
  roiData.sort((a, b) => b.roi_percent - a.roi_percent);

  // Source: lead_analysis_api.py line 513 - Calculate weighted average CPL
  const avgCpl =
    totalLeadsAll > 0 ? round(totalSpendAll / totalLeadsAll, 2) : 0;

  // Source: lead_analysis_api.py lines 515-521
  return {
    vendor_costs: VENDOR_COSTS,
    avg_cpl: avgCpl,
    total_spend: round(totalSpendAll, 2),
    assumed_avg_premium: assumedAvgPremium,
    by_vendor: roiData,
  };
}

/**
 * Identify where leads are being lost in the funnel
 *
 * Source: lead_analysis_api.py lines 523-583
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Funnel bottleneck analysis with loss reasons and conversion rates
 */
export function analyzeFunnelBottlenecks(
  data: LeadRecord[]
): FunnelBottleneckAnalysis {
  // Source: lead_analysis_api.py lines 525-531 - Calculate drop-offs at each stage
  const total = data.length;
  const contacted = data.filter((r) => r.Is_Contacted).length;
  const quoted = data.filter((r) => r.Is_Quoted).length;
  const hot = data.filter((r) => r.Is_Hot).length;
  const sold = data.filter((r) => r.Is_Sale).length;

  // Source: lead_analysis_api.py lines 533-537 - Calculate losses at each stage
  const lostBeforeContact = total - contacted;
  const lostAfterContact = contacted - quoted;
  const lostAfterQuote = quoted - hot;

  // Source: lead_analysis_api.py lines 539-569 - Reasons for losses
  const lossReasons: LossReasons = {
    before_contact: {
      total_lost: lostBeforeContact,
      percentage: round((lostBeforeContact / total) * 100, 2),
      breakdown: {
        no_contact: data.filter((r) => r.Outcome === 'NO_CONTACT').length,
        bad_phone: data.filter((r) => r.Outcome === 'BAD_PHONE').length,
        left_message: data.filter((r) => r.Outcome === 'LEFT_MESSAGE').length,
        dnc: data.filter((r) => r.Outcome === 'DNC').length,
      },
    },
    after_contact: {
      total_lost: lostAfterContact,
      percentage: total > 0 ? round((lostAfterContact / total) * 100, 2) : 0,
      breakdown: {
        not_interested: data.filter((r) => r.Outcome === 'NOT_INTERESTED')
          .length,
        not_eligible: data.filter((r) => r.Outcome === 'NOT_ELIGIBLE').length,
        never_requested: data.filter((r) => r.Outcome === 'NEVER_REQUESTED')
          .length,
        hung_up: data.filter((r) => r.Outcome === 'HUNG_UP').length,
        already_purchased: data.filter((r) => r.Outcome === 'ALREADY_PURCHASED')
          .length,
      },
    },
    after_quote: {
      total_lost: lostAfterQuote,
      percentage: total > 0 ? round((lostAfterQuote / total) * 100, 2) : 0,
      breakdown: {
        quoted_not_interested: data.filter(
          (r) => r.Outcome === 'QUOTED_NOT_INTERESTED'
        ).length,
      },
    },
  };

  // Source: lead_analysis_api.py lines 571-578 - Conversion rates between stages
  const conversionRates = {
    lead_to_contact: total > 0 ? round((contacted / total) * 100, 2) : 0,
    contact_to_quote:
      contacted > 0 ? round((quoted / contacted) * 100, 2) : 0,
    quote_to_hot: quoted > 0 ? round((hot / quoted) * 100, 2) : 0,
    hot_to_sale: hot > 0 ? round((sold / hot) * 100, 2) : 0,
    overall_conversion: total > 0 ? round((sold / total) * 100, 2) : 0,
  };

  // Source: lead_analysis_api.py lines 580-583
  return {
    loss_reasons: lossReasons,
    conversion_rates: conversionRates,
  };
}

/**
 * Analyze call patterns and attempt frequency
 *
 * Source: lead_analysis_api.py lines 585-637
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Call attempts analysis
 */
export function analyzeCallAttempts(data: LeadRecord[]): CallAttemptsAnalysis {
  // Source: lead_analysis_api.py lines 587-588 - Filter out rows with missing phone numbers
  const dataFiltered = data.filter(
    (r) => r.From !== null && r.From !== undefined && r.From !== ''
  );

  // Source: lead_analysis_api.py lines 590-598 - Handle empty data
  if (dataFiltered.length === 0) {
    return {
      average_attempts: 0,
      max_attempts: 0,
      single_attempt_leads: 0,
      multiple_attempt_leads: 0,
      persistence_rate: 0,
      by_attempt_count: [],
    };
  }

  // Source: lead_analysis_api.py lines 600-601 - Group by phone number (From field)
  const callCounts = new Map<string, number>();
  for (const record of dataFiltered) {
    const phone = record.From!;
    callCounts.set(phone, (callCounts.get(phone) || 0) + 1);
  }

  // Source: lead_analysis_api.py lines 603-619 - Analyze success by attempt count
  const attemptGroups = new Map<number, LeadRecord[]>();
  for (const record of dataFiltered) {
    const attempts = callCounts.get(record.From!) || 0;
    if (attempts > 10) continue; // Cap at 10 for display

    if (!attemptGroups.has(attempts)) {
      attemptGroups.set(attempts, []);
    }
    attemptGroups.get(attempts)!.push(record);
  }

  const attemptAnalysis: AttemptAnalysis[] = [];
  for (const [attempts, records] of Array.from(attemptGroups).sort(
    (a, b) => a[0] - b[0]
  )) {
    // Get unique leads (first record for each phone)
    const uniqueLeads = new Map<string, LeadRecord>();
    for (const r of records) {
      if (!uniqueLeads.has(r.From!)) {
        uniqueLeads.set(r.From!, r);
      }
    }
    const uniqueRecords = Array.from(uniqueLeads.values());

    // Source: lead_analysis_api.py lines 614-619
    attemptAnalysis.push({
      attempts,
      lead_count: uniqueRecords.length,
      sale_rate: round(
        (uniqueRecords.filter((r) => r.Is_Sale).length / uniqueRecords.length) *
          100,
        2
      ),
      contact_rate: round(
        (uniqueRecords.filter((r) => r.Is_Contacted).length /
          uniqueRecords.length) *
          100,
        2
      ),
    });
  }

  // Source: lead_analysis_api.py lines 621-628 - Calculate summary metrics
  const attemptValues = Array.from(callCounts.values());
  const avgAttempts =
    attemptValues.reduce((sum, v) => sum + v, 0) / attemptValues.length;
  const maxAttempts = Math.max(...attemptValues);

  const singleAttempt = attemptValues.filter((v) => v === 1).length;
  const multipleAttempts = attemptValues.filter((v) => v > 1).length;
  const totalUnique = singleAttempt + multipleAttempts;

  // Source: lead_analysis_api.py lines 630-637
  return {
    average_attempts: isNaN(avgAttempts) ? 0 : round(avgAttempts, 2),
    max_attempts: maxAttempts,
    single_attempt_leads: singleAttempt,
    multiple_attempt_leads: multipleAttempts,
    persistence_rate:
      totalUnique > 0 ? round((multipleAttempts / totalUnique) * 100, 2) : 0,
    by_attempt_count: attemptAnalysis,
  };
}

/**
 * Find best agent-vendor combinations
 *
 * Source: lead_analysis_api.py lines 639-675
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Agent-vendor match analysis
 */
export function analyzeAgentVendorMatch(
  data: LeadRecord[]
): AgentVendorMatchAnalysis {
  // Source: lead_analysis_api.py line 641 - Filter to records with User
  const agentData = data.filter(
    (r) => r.User !== null && r.User !== undefined && r.User !== ''
  );

  // Source: lead_analysis_api.py lines 643-654 - Group by agent+vendor combination
  const comboGroups = new Map<string, LeadRecord[]>();
  for (const record of agentData) {
    const key = `${record.User}||${record['Vendor Name']}`;
    if (!comboGroups.has(key)) {
      comboGroups.set(key, []);
    }
    comboGroups.get(key)!.push(record);
  }

  const result: AgentVendorCombination[] = [];

  for (const [key, records] of comboGroups) {
    const [agent, vendor] = key.split('||');
    const totalCalls = records.length;

    // Source: lead_analysis_api.py line 654 - Filter to significant combinations
    if (totalCalls < 30) continue;

    const sales = records.filter((r) => r.Is_Sale).length;
    const contacted = records.filter((r) => r.Is_Contacted).length;
    const quoted = records.filter((r) => r.Is_Quoted).length;

    // Source: lead_analysis_api.py lines 658-666
    result.push({
      agent,
      vendor,
      total_calls: totalCalls,
      sales,
      sale_rate: round((sales / totalCalls) * 100, 2),
      contact_rate: round((contacted / totalCalls) * 100, 2),
      quote_rate: round((quoted / totalCalls) * 100, 2),
    });
  }

  // Source: lead_analysis_api.py line 669 - Sort by sale rate
  result.sort((a, b) => b.sale_rate - a.sale_rate);

  // Source: lead_analysis_api.py lines 671-675
  return {
    top_combinations: result.slice(0, 10),
    worst_combinations: result.length > 10 ? result.slice(-10) : [],
    total_combinations: result.length,
  };
}

/**
 * Generate optimization recommendations
 *
 * Source: lead_analysis_api.py lines 677-790
 *
 * @param data - Array of lead records with calculated metrics
 * @param vendorData - Vendor metrics from analyzeVendors
 * @param agentData - Agent metrics from analyzeAgents
 * @returns Array of recommendations
 */
export function generateRecommendations(
  data: LeadRecord[],
  vendorData: VendorMetrics[],
  agentData: AgentMetrics[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Source: lead_analysis_api.py lines 681-712 - Vendor recommendations
  if (vendorData.length > 0) {
    const bestVendor = vendorData.reduce((a, b) =>
      a.sale_rate > b.sale_rate ? a : b
    );
    const worstVendor = vendorData.reduce((a, b) =>
      a.sale_rate < b.sale_rate ? a : b
    );

    // Source: lead_analysis_api.py lines 686-691
    recommendations.push({
      category: 'Lead Sources',
      priority: 'high',
      action: `Increase budget for ${bestVendor.vendor}`,
      reason: `Highest sale rate at ${bestVendor.sale_rate}%`,
      impact: 'Improve conversion rate',
    });

    // Source: lead_analysis_api.py lines 693-700
    if (worstVendor.sale_rate < bestVendor.sale_rate * 0.5) {
      recommendations.push({
        category: 'Lead Sources',
        priority: 'high',
        action: `Reduce/eliminate budget for ${worstVendor.vendor}`,
        reason: `Lowest sale rate at ${worstVendor.sale_rate}%`,
        impact: 'Reduce wasted spend',
      });
    }

    // Source: lead_analysis_api.py lines 703-712 - Low contact rate vendors
    const lowContactVendors = vendorData.filter((v) => v.contact_rate < 30);
    for (const v of lowContactVendors) {
      recommendations.push({
        category: 'Lead Quality',
        priority: 'high',
        action: `Investigate data quality from ${v.vendor}`,
        reason: `Only ${v.contact_rate}% contact rate (< 30%)`,
        impact: 'Identify and fix lead quality issues',
      });
    }
  }

  // Source: lead_analysis_api.py lines 714-752 - Agent recommendations
  if (agentData.length > 0) {
    const significantAgents = agentData.filter((a) => a.total_calls >= 100);

    if (significantAgents.length >= 2) {
      const bestAgent = significantAgents.reduce((a, b) =>
        a.sale_rate > b.sale_rate ? a : b
      );
      const worstAgent = significantAgents.reduce((a, b) =>
        a.sale_rate < b.sale_rate ? a : b
      );
      const avgSaleRate =
        significantAgents.reduce((sum, a) => sum + a.sale_rate, 0) /
        significantAgents.length;
      const sortedCalls = significantAgents
        .map((a) => a.total_calls)
        .sort((a, b) => a - b);
      const medianCalls = sortedCalls[Math.floor(sortedCalls.length / 2)];

      // Source: lead_analysis_api.py lines 723-729
      recommendations.push({
        category: 'Agent Performance',
        priority: 'medium',
        action: `Have ${bestAgent.agent} train other agents`,
        reason: `Top performer with ${bestAgent.sale_rate}% sale rate`,
        impact: 'Improve team performance',
      });

      // Source: lead_analysis_api.py lines 731-738
      if (worstAgent.sale_rate < bestAgent.sale_rate * 0.5) {
        recommendations.push({
          category: 'Agent Performance',
          priority: 'medium',
          action: `Coaching focus on ${worstAgent.agent}`,
          reason: `Below average at ${worstAgent.sale_rate}% sale rate`,
          impact: 'Close performance gap',
        });
      }

      // Source: lead_analysis_api.py lines 740-752 - High volume but low performance agents
      const highVolLowPerf = significantAgents.filter(
        (a) => a.total_calls > medianCalls && a.sale_rate < avgSaleRate
      );
      for (const agent of highVolLowPerf.slice(0, 2)) {
        recommendations.push({
          category: 'Agent Performance',
          priority: 'high',
          action: `Priority training for ${agent.agent}`,
          reason: `High volume (${agent.total_calls} calls) but below avg rate (${agent.sale_rate}%)`,
          impact: 'Biggest improvement opportunity',
        });
      }
    }
  }

  // Source: lead_analysis_api.py lines 754-776 - Timing recommendations
  const timing = analyzeTiming(data);
  if (timing.hourly.length > 0) {
    const bestHours = [...timing.hourly]
      .sort((a, b) => b.sale_rate - a.sale_rate)
      .slice(0, 3);
    const hoursStr = bestHours.map((h) => `${h.hour}:00`).join(', ');
    recommendations.push({
      category: 'Timing',
      priority: 'medium',
      action: `Schedule more calls during ${hoursStr}`,
      reason: `Peak conversion hours (best: ${bestHours[0].sale_rate}%)`,
      impact: 'Optimize call timing',
    });
  }

  if (timing.daily.length > 0) {
    const bestDays = [...timing.daily]
      .sort((a, b) => b.sale_rate - a.sale_rate)
      .slice(0, 2);
    const daysStr = bestDays.map((d) => d.day).join(', ');
    recommendations.push({
      category: 'Timing',
      priority: 'medium',
      action: `Prioritize calling on ${daysStr}`,
      reason: `Best conversion days (top: ${bestDays[0].sale_rate}%)`,
      impact: 'Optimize weekly schedule',
    });
  }

  // Source: lead_analysis_api.py lines 778-788 - Call type recommendations
  const callTypes = analyzeCallTypes(data);
  if (callTypes.length > 0) {
    const bestCallType = callTypes.reduce((a, b) =>
      a.sale_rate > b.sale_rate ? a : b
    );
    recommendations.push({
      category: 'Call Strategy',
      priority: 'medium',
      action: `Prioritize '${bestCallType.call_type}' calls`,
      reason: `Highest conversion at ${bestCallType.sale_rate}%`,
      impact: 'Optimize call type mix',
    });
  }

  return recommendations;
}

/**
 * Generate strategic action plan with projected improvements
 *
 * Source: lead_analysis_api.py lines 792-843
 *
 * @param data - Array of lead records with calculated metrics
 * @param vendorData - Vendor metrics from analyzeVendors
 * @param agentData - Agent metrics from analyzeAgents
 * @returns Action plan
 */
export function generateActionPlan(
  data: LeadRecord[],
  vendorData: VendorMetrics[],
  agentData: AgentMetrics[]
): ActionPlan {
  // Source: lead_analysis_api.py lines 794-796
  const totalLeads = data.length;
  const totalSales = data.filter((r) => r.Is_Sale).length;
  const overallSaleRate = round((totalSales / totalLeads) * 100, 2);

  // Source: lead_analysis_api.py lines 798-805 - Calculate potential improvement
  const significantAgents = agentData.filter((a) => a.total_calls >= 100);
  let improvementPotential: number | null = null;

  if (significantAgents.length >= 2) {
    const bestRate = Math.max(...significantAgents.map((a) => a.sale_rate));
    const avgRate =
      significantAgents.reduce((sum, a) => sum + a.sale_rate, 0) /
      significantAgents.length;
    if (avgRate > 0) {
      improvementPotential = round(((bestRate - avgRate) / avgRate) * 100, 1);
    }
  }

  // Source: lead_analysis_api.py lines 807-817 - Get best timing
  const timing = analyzeTiming(data);
  const bestHours =
    timing.hourly.length > 0
      ? [...timing.hourly]
          .sort((a, b) => b.sale_rate - a.sale_rate)
          .slice(0, 3)
      : [];
  const bestDays =
    timing.daily.length > 0
      ? [...timing.daily].sort((a, b) => b.sale_rate - a.sale_rate).slice(0, 2)
      : [];

  // Source: lead_analysis_api.py lines 813-817 - Build timing action string
  let timingAction: string;
  if (bestHours.length > 0) {
    const hoursStr = bestHours.map((h) => `${h.hour}:00`).join(', ');
    timingAction = `Schedule calls during peak hours: ${hoursStr}`;
  } else {
    timingAction = 'Analyze timing patterns';
  }

  // Source: lead_analysis_api.py lines 819-843
  return {
    current_state: {
      total_leads: totalLeads,
      total_sales: totalSales,
      overall_sale_rate: overallSaleRate,
    },
    immediate_actions: [
      'Review agent performance and identify coaching needs',
      'Reallocate worst vendor budget to best vendor',
      timingAction,
    ],
    short_term_actions: [
      'Implement lead scoring based on vendor source',
      'Create agent-vendor matching optimization',
      'Set up quality feedback loop with vendors',
    ],
    ongoing_actions: [
      'Weekly performance reviews by agent and vendor',
      'A/B test new vendors with small budgets first',
      'Track and improve contact rates',
    ],
    improvement_potential: improvementPotential,
    best_hours: bestHours.map((h) => h.hour),
    best_days: bestDays.map((d) => d.day),
  };
}

/**
 * Analyze correlation between call duration and outcomes
 *
 * Source: lead_analysis_api.py lines 845-906
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Call duration outcomes analysis
 */
export function analyzeCallDurationOutcomes(
  data: LeadRecord[]
): CallDurationOutcomesAnalysis {
  // Source: lead_analysis_api.py line 848 - Filter out zero-duration calls
  const validCalls = data.filter((r) => r['Call Duration In Seconds'] > 0);

  // Source: lead_analysis_api.py lines 850-856 - Handle empty data
  if (validCalls.length === 0) {
    return {
      duration_brackets: [],
      optimal_duration: null,
      optimal_sale_rate: null,
      avg_duration_by_outcome: {},
    };
  }

  // Source: lead_analysis_api.py lines 857-865 - Create duration brackets
  const brackets: [number, number, string][] = [
    [0, 30, '0-30s'],
    [30, 60, '30-60s'],
    [60, 120, '1-2min'],
    [120, 300, '2-5min'],
    [300, 600, '5-10min'],
    [600, Infinity, '10min+'],
  ];

  // Source: lead_analysis_api.py lines 867-881 - Analyze each bracket
  const bracketResults: DurationBracketResult[] = [];
  for (const [minSec, maxSec, label] of brackets) {
    const bracketData = validCalls.filter(
      (r) =>
        r['Call Duration In Seconds'] >= minSec &&
        r['Call Duration In Seconds'] < maxSec
    );

    if (bracketData.length > 0) {
      const totalCalls = bracketData.length;
      bracketResults.push({
        bracket: label,
        total_calls: totalCalls,
        sales: bracketData.filter((r) => r.Is_Sale).length,
        sale_rate: round(
          (bracketData.filter((r) => r.Is_Sale).length / totalCalls) * 100,
          2
        ),
        quote_rate: round(
          (bracketData.filter((r) => r.Is_Quoted).length / totalCalls) * 100,
          2
        ),
        contact_rate: round(
          (bracketData.filter((r) => r.Is_Contacted).length / totalCalls) * 100,
          2
        ),
      });
    }
  }

  // Source: lead_analysis_api.py lines 883-891 - Find optimal duration bracket
  let optimal: DurationBracketResult | null = null;
  if (bracketResults.length > 0) {
    const significantBrackets = bracketResults.filter(
      (b) => b.total_calls >= 100
    );
    if (significantBrackets.length > 0) {
      optimal = significantBrackets.reduce((a, b) =>
        a.sale_rate > b.sale_rate ? a : b
      );
    } else {
      optimal = bracketResults.reduce((a, b) =>
        a.sale_rate > b.sale_rate ? a : b
      );
    }
  }

  // Source: lead_analysis_api.py lines 894-899 - Average duration by outcome
  const outcomeDurations: Record<string, number> = {};
  for (const outcome of ['SOLD', 'QUOTED', 'NOT_INTERESTED', 'NO_CONTACT']) {
    const outcomeData = validCalls.filter((r) => r.Outcome === outcome);
    if (outcomeData.length > 0) {
      outcomeDurations[outcome] = round(
        outcomeData.reduce((sum, r) => sum + r['Call Duration In Seconds'], 0) /
          outcomeData.length,
        1
      );
    }
  }

  // Source: lead_analysis_api.py lines 901-906
  return {
    duration_brackets: bracketResults,
    optimal_duration: optimal ? optimal.bracket : null,
    optimal_sale_rate: optimal ? optimal.sale_rate : null,
    avg_duration_by_outcome: outcomeDurations,
  };
}

/**
 * Analyze performance trends week over week
 *
 * Source: lead_analysis_api.py lines 908-963
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Weekly trends analysis
 */
export function analyzeWeeklyTrends(data: LeadRecord[]): WeeklyTrendsAnalysis {
  // Source: lead_analysis_api.py lines 910-917 - Group by week
  const weekGroups = new Map<number, LeadRecord[]>();
  for (const record of data) {
    const week = record.Week;
    if (!weekGroups.has(week)) {
      weekGroups.set(week, []);
    }
    weekGroups.get(week)!.push(record);
  }

  // Source: lead_analysis_api.py lines 922-944 - Calculate week-over-week changes
  const results: WeeklyDataItem[] = [];
  let prevSaleRate: number | null = null;

  for (const [week, records] of Array.from(weekGroups).sort(
    (a, b) => a[0] - b[0]
  )) {
    const totalLeads = records.length;
    const sales = records.filter((r) => r.Is_Sale).length;
    const saleRate = round((sales / totalLeads) * 100, 2);

    const weekData: WeeklyDataItem = {
      week,
      total_leads: totalLeads,
      sales,
      sale_rate: saleRate,
      contact_rate: round(
        (records.filter((r) => r.Is_Contacted).length / totalLeads) * 100,
        2
      ),
      quote_rate: round(
        (records.filter((r) => r.Is_Quoted).length / totalLeads) * 100,
        2
      ),
      avg_duration: round(
        records.reduce((sum, r) => sum + (r['Call Duration In Seconds'] || 0), 0) /
          totalLeads,
        1
      ),
      sale_rate_change:
        prevSaleRate !== null ? round(saleRate - prevSaleRate, 2) : 0,
    };

    prevSaleRate = saleRate;
    results.push(weekData);
  }

  // Source: lead_analysis_api.py lines 946-956 - Calculate overall trend
  let trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  let trendChange = 0;

  if (results.length >= 2) {
    const firstHalf = results.slice(0, Math.floor(results.length / 2));
    const secondHalf = results.slice(Math.floor(results.length / 2));
    const firstAvg =
      firstHalf.reduce((sum, w) => sum + w.sale_rate, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, w) => sum + w.sale_rate, 0) / secondHalf.length;

    if (secondAvg > firstAvg) {
      trend = 'improving';
    } else if (secondAvg < firstAvg) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }
    trendChange = round(secondAvg - firstAvg, 2);
  } else {
    trend = 'insufficient_data';
  }

  // Source: lead_analysis_api.py lines 958-963
  return {
    weekly_data: results,
    trend,
    trend_change_pct: trendChange,
    total_weeks: results.length,
  };
}

/**
 * Return industry benchmark data for comparison
 *
 * Source: lead_analysis_api.py lines 965-1023
 *
 * @returns Industry benchmarks
 */
export function getIndustryBenchmarks(): IndustryBenchmarks {
  return {
    // Source: lead_analysis_api.py lines 968-974
    sale_rate: {
      poor: 0.5,
      average: 1.0,
      good: 1.5,
      excellent: 2.0,
      description: 'Percentage of leads that become customers',
    },
    // Source: lead_analysis_api.py lines 975-981
    contact_rate: {
      poor: 30,
      average: 50,
      good: 65,
      excellent: 80,
      description: 'Percentage of leads successfully reached',
    },
    // Source: lead_analysis_api.py lines 982-988
    quote_rate: {
      poor: 10,
      average: 20,
      good: 30,
      excellent: 40,
      description: 'Percentage of leads that receive a quote',
    },
    // Source: lead_analysis_api.py lines 989-995
    cost_per_bind: {
      excellent: 300,
      good: 500,
      average: 800,
      poor: 1200,
      description: 'Total cost to acquire one customer',
    },
    // Source: lead_analysis_api.py lines 996-1002
    ltv_cac_ratio: {
      poor: 1.5,
      average: 3.0,
      good: 4.0,
      excellent: 5.0,
      description: 'Customer lifetime value vs acquisition cost',
    },
    // Source: lead_analysis_api.py lines 1003-1008
    avg_call_duration_sale: {
      min: 180,
      optimal: 420,
      max: 900,
      description: 'Typical call duration for successful sales (seconds)',
    },
    // Source: lead_analysis_api.py lines 1009-1015
    speed_to_lead: {
      excellent: 5,
      good: 15,
      average: 60,
      poor: 1440,
      description: 'Minutes from lead submission to first call',
    },
    // Source: lead_analysis_api.py lines 1016-1022
    call_attempts: {
      poor: 1,
      average: 3,
      good: 6,
      excellent: 8,
      description: 'Number of call attempts before giving up',
    },
  };
}

/**
 * Generate transparent overview of raw data structure and interpretation
 *
 * Source: lead_analysis_api.py lines 1025-1173
 *
 * @param data - Array of lead records with calculated metrics
 * @returns Data overview with methodology explanation
 */
export function generateDataOverview(data: LeadRecord[]): DataOverview {
  // Source: lead_analysis_api.py lines 1029-1072 - Column definitions
  const columnInfo: Record<string, ColumnInfo> = {
    Date: {
      description: 'Timestamp when the call was made',
      sample_values: data.slice(0, 3).map((r) => r.Date.toISOString()),
      interpretation:
        'Used to analyze timing patterns (hour, day of week) for optimal call scheduling',
      data_type: 'datetime',
    },
    'Full name': {
      description: 'Name of the lead (potential customer)',
      sample_values: ['[REDACTED]', '[REDACTED]', '[REDACTED]'], // Privacy
      interpretation: 'Used for record identification only, not in analysis',
      data_type: 'string',
    },
    User: {
      description: 'Sales agent who made the call',
      sample_values: data
        .slice(0, 3)
        .map((r) => r.User || '')
        .filter((u) => u !== ''),
      interpretation:
        'Grouped to calculate agent-level performance metrics (sale rate, contact rate)',
      data_type: 'string',
    },
    'Call Duration In Seconds': {
      description: 'Length of the call in seconds',
      sample_values: data.slice(0, 5).map((r) => String(r['Call Duration In Seconds'])),
      interpretation:
        'Aggregated per agent to calculate total talk time (hours on phone)',
      data_type: 'integer',
    },
    'Current Status': {
      description: 'Final outcome status of the lead',
      sample_values: [...new Set(data.map((r) => r['Current Status'] || ''))]
        .filter((s) => s !== '')
        .slice(0, 5),
      interpretation:
        'Classified into outcome categories (SOLD, QUOTED, CONTACTED, NO_CONTACT, etc.) to track funnel progression',
      data_type: 'string',
    },
    'Call Type': {
      description: 'Type/source of the call',
      sample_values: [...new Set(data.map((r) => r['Call Type'] || ''))]
        .filter((s) => s !== '')
        .slice(0, 5),
      interpretation:
        'Categorized into Live Transfer, Inbound, Telemarketing, etc. to compare lead source quality',
      data_type: 'string',
    },
    'Vendor Name': {
      description: 'Lead vendor/source that provided the lead',
      sample_values: [...new Set(data.map((r) => r['Vendor Name'] || ''))]
        .filter((s) => s !== '')
        .slice(0, 5),
      interpretation:
        'Used to calculate ROI, CPL, and conversion rates per vendor to optimize budget allocation',
      data_type: 'string',
    },
  };

  // Source: lead_analysis_api.py lines 1075-1106 - Status classification mapping
  const statusClassification: Record<string, StatusClassificationInfo> = {
    'SOLD / Customer': {
      example_statuses: [
        '4.2 SOLD - AF Customer',
        '4.0 SOLD',
        '4.1 SOLD - New Customer',
      ],
      meaning: 'Lead purchased a policy - counted as a sale',
      funnel_stage: 'Sale',
    },
    HOT_PROSPECT: {
      example_statuses: ['3.5 HOT - Following up', '3.5 HOT'],
      meaning: 'Highly interested, likely to buy soon',
      funnel_stage: 'Hot',
    },
    QUOTED: {
      example_statuses: ['3.0 QUOTED', '3.1 QUOTED - Thinking About It'],
      meaning: 'Received a quote but has not decided',
      funnel_stage: 'Quoted',
    },
    'CONTACTED - Not Interested': {
      example_statuses: ['2.1 CONTACTED - Not Interested'],
      meaning: 'Spoke with lead but they declined',
      funnel_stage: 'Contacted (Lost)',
    },
    NO_CONTACT: {
      example_statuses: ['1.0 NO CONTACT', '1.1 CALLED - No Answer'],
      meaning: 'Could not reach the lead',
      funnel_stage: 'Lost Before Contact',
    },
    BAD_PHONE: {
      example_statuses: ['1.2 CALLED - Bad Phone #'],
      meaning: 'Phone number invalid or disconnected',
      funnel_stage: 'Lost Before Contact',
    },
  };

  // Source: lead_analysis_api.py lines 1109-1150 - Calculated metrics explanation
  const calculatedMetrics: CalculatedMetricInfo[] = [
    {
      metric: 'Is_Contacted',
      formula:
        'Status contains "CONTACTED", "QUOTED", "HOT", "SOLD", or "TRANSFERRED"',
      purpose: 'Determines if we successfully reached the lead',
    },
    {
      metric: 'Is_Quoted',
      formula: 'Status contains "QUOTED", "HOT", or "SOLD"',
      purpose: 'Determines if lead received a price quote',
    },
    {
      metric: 'Is_Sale',
      formula: 'Status contains "SOLD" or "CUSTOMER"',
      purpose: 'Determines if lead purchased a policy',
    },
    {
      metric: 'Sale Rate',
      formula: '(Number of Sales / Total Leads) x 100',
      purpose: 'Primary performance metric - what % of leads become customers',
    },
    {
      metric: 'Contact Rate',
      formula: '(Number Contacted / Total Leads) x 100',
      purpose: 'Measures lead quality - can we reach them?',
    },
    {
      metric: 'CPL (Cost Per Lead)',
      formula: 'Actual cost paid to vendor per lead',
      purpose: 'Input cost for ROI calculation',
    },
    {
      metric: 'CPB (Cost Per Bind)',
      formula: 'Total Spend / Number of Sales',
      purpose: 'True customer acquisition cost',
    },
    {
      metric: 'ROI %',
      formula: '((Estimated Revenue - Total Spend) / Total Spend) x 100',
      purpose: 'Is this vendor profitable? Above 0% = making money',
    },
  ];

  // Source: lead_analysis_api.py lines 1152-1158 - Data quality notes
  const dates = data.map((r) => r.Date);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const uniqueAgents = new Set(
    data.filter((r) => r.User).map((r) => r.User)
  ).size;
  const uniqueVendors = new Set(
    data.filter((r) => r['Vendor Name']).map((r) => r['Vendor Name'])
  ).size;
  const validStatusCount = data.filter((r) => r['Current Status']).length;

  const dataNotes: string[] = [
    `Total records loaded: ${data.length.toLocaleString()}`,
    `Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`,
    `Unique agents: ${uniqueAgents}`,
    `Unique vendors: ${uniqueVendors}`,
    `Records with valid status: ${validStatusCount.toLocaleString()} (${round((validStatusCount / data.length) * 100, 1)}%)`,
  ];

  // Source: lead_analysis_api.py lines 1161-1173
  return {
    columns: columnInfo,
    status_classification: statusClassification,
    calculated_metrics: calculatedMetrics,
    data_notes: dataNotes,
    methodology_summary:
      'This analysis interprets call center lead data to measure sales performance. ' +
      "Each row represents one call to a potential customer. The 'Current Status' field " +
      'is classified into outcome categories (SOLD, QUOTED, NO_CONTACT, etc.) to build ' +
      'a sales funnel. Metrics are calculated by grouping data by agent, vendor, and time ' +
      'to identify what drives conversions. Vendor costs are applied to calculate true ROI.',
  };
}

/**
 * Generate complete analysis from lead data
 *
 * This is the main entry point that orchestrates all analysis functions
 * and returns a complete LeadAnalysisResult.
 *
 * Source: lead_analysis_api.py lines 1175-1249
 *
 * @param data - Array of lead records (with Date parsed and time fields added)
 * @returns Complete lead analysis result
 */
export function generateAnalysis(data: LeadRecord[]): LeadAnalysisResult {
  // Source: lead_analysis_api.py lines 1182-1183 - Calculate metrics
  const dataWithMetrics = calculateMetrics(data);

  // Source: lead_analysis_api.py lines 1185-1191 - Run core analyses
  const vendorData = analyzeVendors(dataWithMetrics);
  const agentData = analyzeAgents(dataWithMetrics);
  const timingData = analyzeTiming(dataWithMetrics);
  const callTypeData = analyzeCallTypes(dataWithMetrics);
  const funnelData = analyzeFunnel(dataWithMetrics);
  const outcomeData = analyzeOutcomes(dataWithMetrics);
  const recommendations = generateRecommendations(
    dataWithMetrics,
    vendorData,
    agentData
  );

  // Source: lead_analysis_api.py lines 1194-1200 - Run diagnostic analyses
  const leadQuality = analyzeLeadQuality(dataWithMetrics);
  const roiMetrics = analyzeROIMetrics(dataWithMetrics);
  const funnelBottlenecks = analyzeFunnelBottlenecks(dataWithMetrics);
  const callAttempts = analyzeCallAttempts(dataWithMetrics);
  const agentVendorMatch = analyzeAgentVendorMatch(dataWithMetrics);
  const actionPlan = generateActionPlan(dataWithMetrics, vendorData, agentData);

  // Source: lead_analysis_api.py lines 1202-1206 - Run enhanced analyses
  const callDurationOutcomes = analyzeCallDurationOutcomes(dataWithMetrics);
  const weeklyTrends = analyzeWeeklyTrends(dataWithMetrics);
  const industryBenchmarks = getIndustryBenchmarks();

  // Source: lead_analysis_api.py lines 1209-1210 - Generate data overview
  const dataOverview = generateDataOverview(dataWithMetrics);

  // Source: lead_analysis_api.py lines 1212-1222 - Summary stats
  const dates = dataWithMetrics.map((r) => r.Date);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const summary: SummaryStats = {
    total_records: dataWithMetrics.length,
    date_range: {
      start: minDate.toISOString().split('T')[0],
      end: maxDate.toISOString().split('T')[0],
    },
    overall_sale_rate: round(
      (dataWithMetrics.filter((r) => r.Is_Sale).length / dataWithMetrics.length) *
        100,
      2
    ),
    overall_contact_rate: round(
      (dataWithMetrics.filter((r) => r.Is_Contacted).length /
        dataWithMetrics.length) *
        100,
      2
    ),
    overall_quote_rate: round(
      (dataWithMetrics.filter((r) => r.Is_Quoted).length /
        dataWithMetrics.length) *
        100,
      2
    ),
    generated_at: new Date().toISOString(),
  };

  // Source: lead_analysis_api.py lines 1225-1247
  return {
    summary,
    vendors: vendorData,
    agents: agentData,
    timing: timingData,
    call_types: callTypeData,
    funnel: funnelData,
    outcomes: outcomeData,
    recommendations,
    diagnostics: {
      lead_quality: leadQuality,
      roi_metrics: roiMetrics,
      funnel_bottlenecks: funnelBottlenecks,
      call_attempts: callAttempts,
      agent_vendor_match: agentVendorMatch,
      call_duration_outcomes: callDurationOutcomes,
      weekly_trends: weeklyTrends,
    },
    action_plan: actionPlan,
    data_overview: dataOverview,
    industry_benchmarks: industryBenchmarks,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// All types and functions are already exported at their definition points above.
// This comment serves as documentation of the public API:
//
// Types: LeadRecord, VendorMetrics, AgentMetrics, HourlyMetrics, DailyMetrics,
//        TimingAnalysis, CallTypeMetrics, FunnelAnalysis, OutcomeItem,
//        VendorQualityMetrics, LeadQualityAnalysis, VendorROIMetrics, ROIAnalysis,
//        LossReasons, FunnelBottleneckAnalysis, AttemptAnalysis, CallAttemptsAnalysis,
//        AgentVendorCombination, AgentVendorMatchAnalysis, Recommendation, ActionPlan,
//        DurationBracketResult, CallDurationOutcomesAnalysis, WeeklyDataItem,
//        WeeklyTrendsAnalysis, BenchmarkLevel, IndustryBenchmarks, ColumnInfo,
//        StatusClassificationInfo, CalculatedMetricInfo, DataOverview, SummaryStats,
//        DiagnosticAnalyses, LeadAnalysisResult
//
// Functions: classifyOutcome, categorizeCallType, calculateMetrics, analyzeVendors,
//            analyzeAgents, analyzeTiming, analyzeCallTypes, analyzeFunnel,
//            analyzeOutcomes, analyzeLeadQuality, getVendorCost, analyzeROIMetrics,
//            analyzeFunnelBottlenecks, analyzeCallAttempts, analyzeAgentVendorMatch,
//            generateRecommendations, generateActionPlan, analyzeCallDurationOutcomes,
//            analyzeWeeklyTrends, getIndustryBenchmarks, generateDataOverview,
//            generateAnalysis
