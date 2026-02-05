/**
 * Customer Types
 *
 * Types for customer data from book of business integration.
 */

export type CustomerSegment = 'elite' | 'premium' | 'standard' | 'entry';

export interface SegmentConfig {
  label: string;
  color: string;
  avgLtv: number;
  description?: string;
}

export const SEGMENT_CONFIG: Record<CustomerSegment, SegmentConfig> = {
  elite: {
    label: 'Elite',
    color: '#C9A227',
    avgLtv: 18000,
    description: 'High-value multi-product customer',
  },
  premium: {
    label: 'Premium',
    color: '#9333EA',
    avgLtv: 9000,
    description: 'Bundled product customer',
  },
  standard: {
    label: 'Standard',
    color: '#3B82F6',
    avgLtv: 4500,
    description: 'Growth potential customer',
  },
  entry: {
    label: 'Entry',
    color: '#0EA5E9',
    avgLtv: 1800,
    description: 'New or single-product customer',
  },
};

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  totalPremium: number;
  policyCount: number;
  products: string[];
  tenureYears: number;
  segment: CustomerSegment;
  segmentConfig: SegmentConfig;
  retentionRisk: 'low' | 'medium' | 'high';
  hasOpportunity: boolean;
  opportunityId: string | null;
  priorityTier: 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  recommendedProduct: string | null;
  upcomingRenewal: string | null;
}

export interface CustomerDetail extends Customer {
  paymentStatus: 'current' | 'past_due' | 'at_risk';
  crossSellPotential: number;
  recommendedProducts: string[];
  lastContactDate: string | null;
  lastPolicyChange: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOpportunity {
  id: string;
  priorityRank: number;
  priorityTier: 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  recommendedProduct: string;
  segmentType: string;
  currentProducts: string;
  potentialPremiumAdd: number;
  expectedConversionPct: number;
  renewalDate: string | null;
  daysUntilRenewal: number;
  renewalStatus: string;
  talkingPoints: string[];
  taskId: string | null;
  contactedAt: string | null;
  contactOutcome: string | null;
  dismissed: boolean;
}

export interface CustomerTask {
  id: string;
  text: string;
  completed: boolean;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: string | null;
  createdAt: string;
}

export interface CustomerSearchResult {
  success: boolean;
  customers: Customer[];
  count: number;
  query: string | null;
}

export interface CustomerDetailResult {
  success: boolean;
  customer: CustomerDetail;
  opportunities: CustomerOpportunity[];
  tasks: CustomerTask[];
  stats: {
    totalOpportunities: number;
    activeOpportunities: number;
    linkedTasks: number;
    completedTasks: number;
  };
}

// For linking customers to todos
export interface LinkedCustomer {
  id: string;
  name: string;
  segment: CustomerSegment;
  phone?: string;
  email?: string;
}
