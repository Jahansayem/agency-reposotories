/**
 * Outreach Types and Consent Management
 * V6.5: AI-Powered Cross-Sell Outreach System with Validation
 */

// Consent preferences for a customer
export interface ContactConsent {
  email_ok: boolean;
  sms_ok: boolean;
  call_ok: boolean;
  mail_ok: boolean;
  do_not_contact: boolean;
  last_updated: string;
}

// Outreach channel types
export type OutreachChannel = 'call' | 'email' | 'sms' | 'mail';

// Outreach message template
export interface OutreachTemplate {
  id: string;
  channel: OutreachChannel;
  segment: string;
  tier: string;
  subject?: string; // For email
  greeting: string;
  body: string;
  callToAction: string;
  compliance: string[];
  personalization_fields: string[];
}

// Validation result for quality checks
export interface OutreachValidation {
  valid: boolean;
  issues: string[];
  personalizationCount: number;
}

// Generated outreach message
export interface GeneratedOutreach {
  channel: OutreachChannel;
  customerName: string;
  subject?: string;
  message: string;
  talkingPoints: string[];
  compliance_notices: string[];
  best_time?: string;
  urgency: 'high' | 'medium' | 'low';
  validation?: OutreachValidation;
}

// Outreach history record
export interface OutreachRecord {
  timestamp: string;
  channel: OutreachChannel;
  customerName: string;
  segment: string;
  outcome?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'converted' | 'no_response';
  notes?: string;
}

// Cross-sell segment types
export type CrossSellSegment =
  | 'Segment 1: Auto→Home (Homeowner)'
  | 'Segment 2: Home→Auto'
  | 'Segment 3: Auto→Renters'
  | 'Segment 4: Bundle→Umbrella';

// Priority tier types
export type PriorityTier = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';

// Enriched customer data from customers.json
export interface EnrichedCustomerData {
  totalPremium: number;
  policyCount: number;
  products: string[];
  claimCount: number;
  maritalStatus: 'Married' | 'Single' | 'Widowed' | 'Divorced' | string;
  gender?: string;
  tenure: number; // months
}

// Extended opportunity with consent
export interface CrossSellOpportunityWithConsent {
  priorityRank: number;
  priorityTier: PriorityTier;
  priorityScore: number;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  renewalDate: string;
  daysUntilRenewal: number;
  currentProducts: string;
  recommendedProduct: string;
  segment: CrossSellSegment;
  currentPremium: number;
  potentialPremiumAdd: number;
  expectedConversionPct: number;
  retentionLiftPct: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  balanceDue: number;
  renewalStatus: string;
  ezpayStatus: string;
  tenureYears: number;
  policyCount: number;
  // New consent fields
  consent?: ContactConsent;
}
