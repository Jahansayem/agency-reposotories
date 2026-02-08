/**
 * Strategy Types
 *
 * Type definitions for the agency growth strategy calculator.
 */

// V3.0 Enhanced Interfaces
export interface MarketingChannels {
  referral: number;
  digital: number;
  traditional: number;
  partnerships: number;
}

export interface StaffingComposition {
  producers: number;
  serviceStaff: number;
  adminStaff: number;
}

export interface ProductMix {
  auto: number;
  home: number;
  umbrella: number;
  cyber: number;
  commercial: number;
}

export interface StrategyInputs {
  currentPolicies: number;
  currentCustomers: number; // V3.0: Track customers separately
  currentStaff: number;
  monthlyLeadSpend: number; // Keep for backward compatibility
  costPerLead: number;
  additionalLeadSpend: number;
  additionalStaff: number;
  projectionMonths: number;
  conciergeService: boolean;
  newsletterSystem: boolean;
  salesCompensationModel: 'fte' | 'commission';
  commissionRate: number; // percentage per policy sold
  fteSalary: number; // monthly salary for FTE
  // New economic inputs
  monthlyChurnRate: number; // percentage of policies lost per month
  averagePremium: number; // average premium per policy per year
  commissionPayout: number; // percentage of premium paid as commission
  fixedMonthlyCosts: number; // rent, utilities, software, etc.
  fteBenefitsMultiplier: number; // overhead on FTE salary (typically 1.3 = 30%)
  salesRampMonths: number; // months for new sales hire to reach full productivity

  // V3.0: Channel-specific marketing
  marketing: MarketingChannels;

  // V3.0: Staffing composition
  staffing: StaffingComposition;

  // V3.0: Product mix
  products: ProductMix;

  // V3.0: Technology investments
  eoAutomation: boolean;
  renewalProgram: boolean;
  crossSellProgram: boolean;

  // V3.0: Growth stage
  growthStage: 'mature' | 'growth';
  commissionStructure: 'independent' | 'captive' | 'hybrid';

  // V5.1: Interactive slider controls
  targetRetentionRate: number; // Target annual retention rate (0-100)
  targetConversionRate: number; // Target bound conversion rate (0-100)

  // V5.4: Walk-in/organic sales
  organicSalesPerMonth: number; // Policies sold from walk-ins (not paid leads)
}

export interface ScenarioData {
  month: number;
  baseline: number;
  conservative: number;
  moderate: number;
  aggressive: number;
  cashFlow?: number; // monthly cash flow for the scenario
  cumulativeCash?: number; // cumulative cash position
  policiesPerCustomer?: number; // V3.0: Track policies per customer
  retention?: number; // V3.0: Retention rate
  ebitda?: number; // V3.0: EBITDA
  ebitdaMargin?: number; // V3.0: EBITDA margin
}

export interface ScenarioResults {
  name: string;
  finalPolicies: number;
  roi: number;
  paybackMonths: number;
  totalCost: number;
  totalRevenue: number;
  breakEvenMonth?: number; // month when cumulative cash turns positive
  ltv?: number; // lifetime value per customer
  cac?: number; // customer acquisition cost
  ltvCacRatio?: number; // LTV:CAC ratio
  finalCustomers?: number; // V3.0: Final customer count
  policiesPerCustomer?: number; // V3.0: Policies per customer
  ebitdaMargin?: number; // V3.0: EBITDA margin
}

// V3.0: Benchmark metrics interface
export interface BenchmarkMetrics {
  ruleOf20Score: number;
  ruleOf20Rating: string;
  ebitdaMargin: number;
  ebitdaStatus: string;
  ltvCacRatio: number;
  ltvCacStatus: string;
  revenuePerEmployee: number;
  rpeRating: string;
  policiesPerCustomer: number;
  ppcStatus: string;
  retentionRate: number;
  marketingSpendPercent: number;
  techSpendPercent: number;
  staffingRatio: number;
}

// Default strategy inputs for reset functionality
export const DEFAULT_STRATEGY_INPUTS: StrategyInputs = {
  currentPolicies: 1424,
  currentCustomers: 876,
  currentStaff: 2.0,
  monthlyLeadSpend: 0,
  costPerLead: 55,
  additionalLeadSpend: 0,
  additionalStaff: 1.0,
  projectionMonths: 24,
  conciergeService: false,
  newsletterSystem: false,
  salesCompensationModel: 'commission',
  commissionRate: 10,
  fteSalary: 3500,
  monthlyChurnRate: 0.21,
  averagePremium: 2963,
  commissionPayout: 10,
  fixedMonthlyCosts: 12000,
  fteBenefitsMultiplier: 1.3,
  salesRampMonths: 3,
  marketing: { referral: 0, digital: 0, traditional: 0, partnerships: 0 },
  staffing: { producers: 1.0, serviceStaff: 0.0, adminStaff: 1.0 },
  products: { auto: 620, home: 721, umbrella: 74, cyber: 0, commercial: 9 },
  eoAutomation: true,
  renewalProgram: true,
  crossSellProgram: false,
  growthStage: 'mature',
  commissionStructure: 'captive',
  targetRetentionRate: 97.5,
  targetConversionRate: 10.0,
  organicSalesPerMonth: 13.5
};
