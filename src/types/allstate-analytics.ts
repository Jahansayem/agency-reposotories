/**
 * Allstate Analytics Integration Types
 *
 * These types support the weekly data import workflow where managers:
 * 1. Download Book of Business data from Allstate website
 * 2. Upload CSV/Excel files to the todo app
 * 3. System auto-generates cross-sell opportunities and calendar events
 *
 * Data source: bealer-lead-model cross-sell analysis
 */

// ============================================
// Priority Tier System
// ============================================

/**
 * Priority tier classification for cross-sell opportunities
 * - HOT: Renewal within 7 days + high score (≥100) - URGENT action required
 * - HIGH: Renewal within 14 days + good score (≥75) - Schedule this week
 * - MEDIUM: Renewal within 30 days + moderate score (≥50) - Plan outreach
 * - LOW: Lower priority opportunities - Batch process
 */
export type CrossSellPriorityTier = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Configuration for priority tier display
 */
export const PRIORITY_TIER_CONFIG: Record<CrossSellPriorityTier, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}> = {
  HOT: {
    label: 'HOT',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: '🔥',
    description: 'Renewal imminent - contact today',
  },
  HIGH: {
    label: 'High Priority',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    icon: '⚡',
    description: 'Schedule contact this week',
  },
  MEDIUM: {
    label: 'Medium',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: '📋',
    description: 'Plan outreach this month',
  },
  LOW: {
    label: 'Low',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: '📊',
    description: 'Batch process when time allows',
  },
};

// ============================================
// Cross-Sell Segment Types
// ============================================

/**
 * Common cross-sell segments based on current product holdings
 */
export type CrossSellSegment =
  | 'auto_to_home'      // Auto customer → Add Homeowners
  | 'home_to_auto'      // Homeowners customer → Add Auto
  | 'mono_to_bundle'    // Single product → Full bundle
  | 'add_life'          // Property/Auto → Add Life insurance
  | 'add_umbrella'      // Multi-policy → Add Umbrella
  | 'commercial_add'    // Personal → Commercial crossover
  | 'other';

export const CROSS_SELL_SEGMENT_CONFIG: Record<CrossSellSegment, {
  label: string;
  description: string;
  typicalDiscount: string;
}> = {
  auto_to_home: {
    label: 'Auto → Home',
    description: 'Add Homeowners policy to Auto customer',
    typicalDiscount: '15-25% bundle discount',
  },
  home_to_auto: {
    label: 'Home → Auto',
    description: 'Add Auto policy to Homeowners customer',
    typicalDiscount: '15-25% bundle discount',
  },
  mono_to_bundle: {
    label: 'Single → Bundle',
    description: 'Convert single-product customer to full bundle',
    typicalDiscount: '20-30% total savings',
  },
  add_life: {
    label: 'Add Life',
    description: 'Cross-sell life insurance to P&C customer',
    typicalDiscount: 'Additional 5% multi-line discount',
  },
  add_umbrella: {
    label: 'Add Umbrella',
    description: 'Add umbrella coverage for enhanced liability protection',
    typicalDiscount: 'Bundled umbrella pricing',
  },
  commercial_add: {
    label: 'Add Commercial',
    description: 'Cross-sell commercial lines to personal lines customer',
    typicalDiscount: 'Multi-account discount',
  },
  other: {
    label: 'Other',
    description: 'Other cross-sell opportunity',
    typicalDiscount: 'Varies',
  },
};

// ============================================
// Renewal Status Types
// ============================================

/**
 * Renewal status from Allstate data
 */
export type AllstateRenewalStatus =
  | 'Not Taken'     // Renewal not processed yet
  | 'Renewed'       // Successfully renewed
  | 'Pending'       // Renewal in progress
  | 'At Risk'       // Customer may not renew
  | 'Cancelled';    // Policy cancelled

/**
 * EZPay enrollment status
 */
export type EZPayStatus = 'Yes' | 'No' | 'Pending';

// ============================================
// Main Cross-Sell Opportunity Interface
// ============================================

/**
 * Cross-sell opportunity record from Allstate Book of Business analysis
 *
 * This represents a single customer opportunity for cross-selling additional products.
 * Data is uploaded weekly from Allstate reports and scored for priority.
 */
export interface CrossSellOpportunity {
  // Database fields
  id: string;
  agency_id?: string;
  created_at: string;
  updated_at: string;
  upload_batch_id?: string;

  // Priority scoring (calculated from multiple factors)
  priority_rank: number;          // 1 = highest priority
  priority_tier: CrossSellPriorityTier;
  priority_score: number;         // 0-150 composite score

  // Customer information
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip_code: string;

  // Renewal information
  renewal_date: string;           // ISO date string
  days_until_renewal: number;
  renewal_status: AllstateRenewalStatus;

  // Product information
  current_products: string;       // Comma-separated list
  recommended_product: string;    // The product to cross-sell
  segment: string;                // Full segment description
  segment_type: CrossSellSegment; // Normalized segment type

  // Financial metrics
  current_premium: number;
  potential_premium_add: number;  // Expected premium from cross-sell
  expected_conversion_pct: number; // Historical conversion rate
  retention_lift_pct: number;     // How much retention improves with bundle

  // Talking points for sales calls
  talking_point_1: string;
  talking_point_2: string;
  talking_point_3: string;

  // Account status
  balance_due: number;
  ezpay_status: EZPayStatus;
  tenure_years: number;           // Years as customer
  policy_count: number;           // Current number of policies

  // Workflow tracking
  contacted_at?: string;          // When agent contacted customer
  contacted_by?: string;          // Which agent made contact
  contact_notes?: string;         // Notes from contact attempt
  contact_outcome?: 'quoted' | 'sold' | 'declined' | 'callback' | 'no_answer';
  converted_at?: string;          // When sale was made
  converted_premium?: number;     // Actual premium sold
  task_id?: string;               // Linked todo task ID
  dismissed?: boolean;            // Manually dismissed opportunity
  dismissed_reason?: string;      // Why it was dismissed
}

// ============================================
// Renewal Calendar Entry
// ============================================

/**
 * Calendar entry for upcoming renewals
 * Displayed on the dashboard calendar panel
 */
export interface RenewalCalendarEntry {
  id: string;
  agency_id?: string;

  // Customer info
  customer_name: string;
  phone?: string;
  email?: string;

  // Renewal details
  renewal_date: string;
  policy_type: string;
  current_premium: number;

  // Cross-sell opportunity link
  cross_sell_opportunity_id?: string;
  has_cross_sell_opportunity: boolean;
  cross_sell_priority?: CrossSellPriorityTier;
  recommended_product?: string;

  // Status tracking
  contacted: boolean;
  contact_date?: string;
  renewal_confirmed: boolean;

  created_at: string;
  updated_at: string;
}

// ============================================
// Customer Insights
// ============================================

/**
 * Aggregated customer insights for analytics dashboard
 */
export interface CustomerInsight {
  id: string;
  agency_id?: string;

  // Customer identification
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;

  // Portfolio summary
  total_policies: number;
  total_premium: number;
  products_held: string[];
  tenure_years: number;

  // Opportunity metrics
  cross_sell_potential: number;   // Total potential additional premium
  recommended_products: string[];
  priority_score: number;

  // Risk indicators
  retention_risk: 'low' | 'medium' | 'high';
  payment_status: 'current' | 'past_due' | 'at_risk';

  // Engagement history
  last_contact_date?: string;
  last_policy_change?: string;
  upcoming_renewal?: string;

  created_at: string;
  updated_at: string;
}

// ============================================
// Data Upload Tracking
// ============================================

/**
 * Data source types for uploads
 */
export type AllstateDataSource =
  | 'book_of_business'
  | 'cross_sell_report'
  | 'renewal_list'
  | 'retention_report'
  | 'production_report'
  | 'other';

/**
 * Upload status tracking
 */
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

/**
 * Tracks each data upload batch for auditing and rollback
 */
export interface DataUploadBatch {
  id: string;
  agency_id?: string;

  // Upload metadata
  file_name: string;
  file_size: number;
  file_type: 'csv' | 'xlsx' | 'xls';
  data_source: AllstateDataSource;

  // Processing status
  status: UploadStatus;
  uploaded_by: string;
  uploaded_at: string;
  processed_at?: string;

  // Results
  total_records: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;

  // Error tracking
  error_message?: string;
  error_details?: string[];

  // Summary statistics generated from this upload
  summary?: DataUploadSummary;
}

/**
 * Summary statistics from a data upload
 */
export interface DataUploadSummary {
  // Opportunity breakdown by tier
  hot_opportunities: number;
  high_opportunities: number;
  medium_opportunities: number;
  low_opportunities: number;

  // Financial potential
  total_potential_premium: number;
  avg_conversion_rate: number;
  expected_revenue: number;

  // Renewal timeline
  renewals_this_week: number;
  renewals_this_month: number;
  renewals_next_30_days: number;

  // Segment breakdown
  segment_breakdown: Record<string, number>;
}

// ============================================
// Dashboard Analytics Types
// ============================================

/**
 * Cross-sell performance metrics for dashboard
 */
export interface CrossSellMetrics {
  period: 'week' | 'month' | 'quarter' | 'year';
  start_date: string;
  end_date: string;

  // Volume metrics
  total_opportunities: number;
  opportunities_contacted: number;
  opportunities_quoted: number;
  opportunities_converted: number;

  // Rates
  contact_rate: number;
  quote_rate: number;
  conversion_rate: number;

  // Financial
  total_potential_premium: number;
  quoted_premium: number;
  converted_premium: number;

  // By tier breakdown
  by_tier: Record<CrossSellPriorityTier, {
    count: number;
    contacted: number;
    converted: number;
    premium: number;
  }>;

  // By segment breakdown
  by_segment: Record<string, {
    count: number;
    converted: number;
    premium: number;
  }>;
}

/**
 * Leaderboard entry for cross-sell performance
 */
export interface CrossSellLeaderboardEntry {
  user_name: string;
  opportunities_worked: number;
  conversions: number;
  conversion_rate: number;
  premium_generated: number;
  rank: number;
}

// ============================================
// CSV/Excel Parsing Types
// ============================================

/**
 * Expected columns in Allstate Book of Business export
 */
export interface AllstateBookOfBusinessRow {
  // Customer columns
  'Customer Name'?: string;
  'Name'?: string;
  'Phone'?: string;
  'Phone Number'?: string;
  'Email'?: string;
  'Email Address'?: string;
  'Address'?: string;
  'City'?: string;
  'Zip'?: string;
  'ZIP Code'?: string;

  // Policy columns
  'Policy Type'?: string;
  'Product'?: string;
  'Products'?: string;
  'Current Products'?: string;
  'Premium'?: string | number;
  'Current Premium'?: string | number;
  'Total Premium'?: string | number;
  'Policy Count'?: string | number;

  // Renewal columns
  'Renewal Date'?: string;
  'Renewal'?: string;
  'Status'?: string;
  'Renewal Status'?: string;

  // Other columns
  'Tenure'?: string | number;
  'Years'?: string | number;
  'EZPay'?: string;
  'Balance'?: string | number;
  'Balance Due'?: string | number;

  // Allow additional columns
  [key: string]: string | number | undefined;
}

/**
 * Parsed cross-sell record (intermediate format before database insert)
 */
export interface ParsedCrossSellRecord {
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip_code: string;
  renewal_date: string | null;
  current_products: string;
  current_premium: number;
  tenure_years: number;
  policy_count: number;
  ezpay_status: EZPayStatus;
  balance_due: number;
  renewal_status: AllstateRenewalStatus;

  // These are calculated during processing
  recommended_product?: string;
  segment_type?: CrossSellSegment;
  priority_score?: number;
  priority_tier?: CrossSellPriorityTier;
}

/**
 * Validation result for a parsed record
 */
export interface ParsedRecordValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  record?: ParsedCrossSellRecord;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Request body for uploading Allstate data
 */
export interface UploadAllstateDataRequest {
  file: File;
  data_source: AllstateDataSource;
  options?: {
    skip_duplicates?: boolean;
    update_existing?: boolean;
    dry_run?: boolean;
  };
}

/**
 * Response from data upload
 */
export interface UploadAllstateDataResponse {
  success: boolean;
  batch_id: string;
  summary: DataUploadSummary;
  errors?: string[];
}

/**
 * Query parameters for fetching cross-sell opportunities
 */
export interface CrossSellQueryParams {
  tier?: CrossSellPriorityTier | CrossSellPriorityTier[];
  segment?: CrossSellSegment | CrossSellSegment[];
  days_until_renewal_max?: number;
  min_priority_score?: number;
  contacted?: boolean;
  converted?: boolean;
  dismissed?: boolean;
  assigned_to?: string;
  search?: string;
  sort_by?: 'priority_rank' | 'renewal_date' | 'potential_premium' | 'customer_name';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Paginated response for cross-sell opportunities
 */
export interface CrossSellListResponse {
  opportunities: CrossSellOpportunity[];
  total: number;
  page: number;
  page_size: number;
  summary: {
    hot_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    total_potential_premium: number;
  };
}

// ============================================
// Task Integration Types
// ============================================

/**
 * Represents a cross-sell opportunity converted to a todo task
 */
export interface CrossSellTaskData {
  opportunity_id: string;
  customer_name: string;
  recommended_product: string;
  priority_tier: CrossSellPriorityTier;
  renewal_date: string;
  talking_points: string[];
  potential_premium: number;
  phone: string;
  email: string;
}

/**
 * Options for auto-generating tasks from cross-sell opportunities
 */
export interface CrossSellTaskGenerationOptions {
  tiers_to_include: CrossSellPriorityTier[];
  auto_assign_to?: string;
  include_talking_points_in_notes?: boolean;
  set_due_date_to_renewal?: boolean;
  due_date_days_before_renewal?: number;
  create_subtasks?: boolean;
  default_priority_mapping?: Record<CrossSellPriorityTier, 'low' | 'medium' | 'high' | 'urgent'>;
}

/**
 * Default priority mapping from cross-sell tiers to todo priorities
 */
export const DEFAULT_CROSS_SELL_PRIORITY_MAPPING: Record<CrossSellPriorityTier, 'low' | 'medium' | 'high' | 'urgent'> = {
  HOT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Default subtasks for cross-sell follow-up tasks
 */
export const DEFAULT_CROSS_SELL_SUBTASKS = [
  'Review customer account and current coverage',
  'Make contact attempt (call/email)',
  'Present cross-sell opportunity and value proposition',
  'Generate quote if interested',
  'Follow up on quote and close sale',
];

// ============================================
// Contact History Types
// ============================================

/**
 * Valid contact methods for logging contact attempts
 */
export type ContactMethod = 'phone' | 'email' | 'in_person' | 'mail';

/**
 * Valid contact outcomes - Enhanced for model training feedback loop
 *
 * These outcomes provide granular tracking for:
 * 1. Contact success vs failure
 * 2. Customer interest level when reached
 * 3. Reason for non-conversion
 * 4. Data quality issues
 *
 * This enables better model training by distinguishing between:
 * - Customer-driven outcomes (interest, timing, permanent decline)
 * - Operational outcomes (no answer, voicemail, invalid data)
 */
export type ContactOutcome =
  | 'contacted_interested'       // Reached customer, they expressed interest
  | 'contacted_not_interested'   // Reached customer, not interested at this time
  | 'contacted_callback_scheduled' // Reached customer, scheduled specific callback
  | 'contacted_wrong_timing'     // Reached customer, bad timing (busy, just renewed elsewhere, etc.)
  | 'left_voicemail'             // Did not reach, left voicemail message
  | 'no_answer'                  // Did not reach, no voicemail left
  | 'invalid_contact'            // Contact info is incorrect (wrong number, bounced email)
  | 'declined_permanently';      // Customer explicitly declined, do not contact again

/**
 * Contact history record for tracking contact attempts on opportunities
 */
export interface ContactHistoryRecord {
  id: string;
  opportunity_id: string;
  user_id: string;
  contact_method: ContactMethod;
  contact_outcome: ContactOutcome;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  contacted_at: string;
  created_at: string;
  // Joined fields from users table
  user_name?: string;
  user_color?: string;
}

/**
 * Request body for logging a new contact attempt
 */
export interface LogContactRequest {
  user_id: string;
  contact_method: ContactMethod;
  contact_outcome: ContactOutcome;
  notes?: string;
  next_action?: string;
  next_action_date?: string;
  contacted_at?: string;
}

/**
 * Response for contact history list
 */
export interface ContactHistoryListResponse {
  success: boolean;
  contact_history: ContactHistoryRecord[];
  total: number;
  opportunity_id: string;
}

/**
 * Response for logging a contact
 */
export interface LogContactResponse {
  success: boolean;
  contact: ContactHistoryRecord;
  message: string;
}

/**
 * Configuration for contact methods display
 */
export const CONTACT_METHOD_CONFIG: Record<ContactMethod, {
  label: string;
  icon: string;
  description: string;
}> = {
  phone: {
    label: 'Phone Call',
    icon: 'phone',
    description: 'Outbound or inbound phone call',
  },
  email: {
    label: 'Email',
    icon: 'mail',
    description: 'Email correspondence',
  },
  in_person: {
    label: 'In Person',
    icon: 'user',
    description: 'Face-to-face meeting',
  },
  mail: {
    label: 'Mail',
    icon: 'send',
    description: 'Physical mail correspondence',
  },
};

/**
 * Configuration for contact outcomes display
 *
 * Organized by outcome type for better model training feedback:
 * - Positive outcomes (interest shown, callback scheduled)
 * - Neutral outcomes (wrong timing, voicemail)
 * - Negative outcomes (not interested, declined permanently)
 * - Operational outcomes (no answer, invalid contact)
 */
export const CONTACT_OUTCOME_CONFIG: Record<ContactOutcome, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  isPositive: boolean;
  /** For model training: indicates customer was successfully reached */
  customerReached: boolean;
  /** For model training: indicates customer expressed interest level (-1 to 1) */
  interestSignal: number;
}> = {
  contacted_interested: {
    label: 'Interested',
    icon: 'thumbs-up',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    description: 'Customer expressed interest in the product',
    isPositive: true,
    customerReached: true,
    interestSignal: 1,
  },
  contacted_not_interested: {
    label: 'Not Interested',
    icon: 'thumbs-down',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.15)',
    description: 'Customer not interested at this time',
    isPositive: false,
    customerReached: true,
    interestSignal: -0.5,
  },
  contacted_callback_scheduled: {
    label: 'Callback Scheduled',
    icon: 'calendar',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    description: 'Customer requested callback at specific time',
    isPositive: true,
    customerReached: true,
    interestSignal: 0.7,
  },
  contacted_wrong_timing: {
    label: 'Wrong Timing',
    icon: 'clock',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    description: 'Customer reached but timing was not right (busy, just renewed, etc.)',
    isPositive: false,
    customerReached: true,
    interestSignal: 0,
  },
  left_voicemail: {
    label: 'Left Voicemail',
    icon: 'voicemail',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    description: 'Left voicemail message for customer',
    isPositive: false,
    customerReached: false,
    interestSignal: 0,
  },
  no_answer: {
    label: 'No Answer',
    icon: 'phone-missed',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    description: 'No answer, no voicemail left',
    isPositive: false,
    customerReached: false,
    interestSignal: 0,
  },
  invalid_contact: {
    label: 'Invalid Contact',
    icon: 'alert-circle',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    description: 'Contact information is incorrect (wrong number, bounced email)',
    isPositive: false,
    customerReached: false,
    interestSignal: 0,
  },
  declined_permanently: {
    label: 'Declined Permanently',
    icon: 'x-circle',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
    description: 'Customer explicitly declined, do not contact again',
    isPositive: false,
    customerReached: true,
    interestSignal: -1,
  },
};
