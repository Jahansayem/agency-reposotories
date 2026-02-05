/**
 * Allstate 2026 Compensation Structure Configuration
 *
 * Based on: 2026 Agency Compensation Program FAQ (December 17, 2025)
 *
 * Key Changes from 2025:
 * - Agency Bonus split into two components: Auto/Home/AFS (up to 3%) and Other Personal Lines (up to 1%)
 * - Standard Auto Only Loss Ratio used as qualifier (≤68% CW, ≤73% CA/NJ/NY)
 * - Quarterly advance payouts available for Elite/Pro agents (15%/15%/20%/remaining)
 * - New Contingency Plan for missing monthly baseline
 * - State-specific variable compensation rates
 * - Updated tier size definitions with smaller/larger splits
 */

import type { CompensationConfig, CompCategory, CompTier, NBVariableComp } from './compensation2025';

// ============================================================================
// Extended Types for 2026
// ============================================================================

export type AAPLevel = 'Elite' | 'Pro' | 'Emerging';
export type BundlingStatus = 'PreferredBundle' | 'Bundled' | 'Monoline';
export type StateGroup = 'Countrywide' | 'TexasLouisiana' | 'RestrictedStates';

// Restricted states: CA, CT, FL, NJ, NY - bundling status doesn't apply
export const RESTRICTED_STATES = ['CA', 'CT', 'FL', 'NJ', 'NY'];
export const TEXAS_LOUISIANA = ['TX', 'LA'];

export interface VariableCompRate {
  preferredBundle: number;
  bundled: number;
  monoline: number;
}

export interface StateVariableComp {
  stateGroup: StateGroup;
  states: string[];
  newBusiness: {
    standardAuto: VariableCompRate;
    homeownersCondo: VariableCompRate;
    otherPersonalLines: VariableCompRate;
  };
  // For restricted states (CA, CT, FL, NJ, NY), bundling doesn't apply - flat rates
  flatRate?: number;
}

export interface RenewalVariableCompByAAP {
  stateGroup: StateGroup;
  states: string[];
  elite: {
    standardAuto: VariableCompRate | number;
    homeownersCondo: VariableCompRate | number;
    otherPersonalLines: VariableCompRate | number;
  };
  pro: {
    standardAuto: VariableCompRate | number;
    homeownersCondo: VariableCompRate | number;
    otherPersonalLines: VariableCompRate | number;
  };
  emerging: {
    standardAuto: VariableCompRate | number;
    homeownersCondo: VariableCompRate | number;
    otherPersonalLines: VariableCompRate | number;
  };
}

export interface AgencyTier {
  tier: string;
  pifMin: number;
  pifMax: number;
  subTier?: 'Smaller' | 'Larger';
}

export interface PortfolioGrowthPoints {
  productLine: string;
  points: number;
  category: 'AutoHomeAFS' | 'OtherPersonalLines';
  eligibleForBonus: boolean;
}

export interface QuarterlyAdvance {
  quarter: 1 | 2 | 3 | 4;
  percentOfEstimatedBonus: number;
  qualifierLossRatio: {
    countrywide: number;
    caOnly: number;
    njNyOnly: number;
  };
  qualifierBPS: {
    countrywide: number;
    caOnly: number;
    njNyOnly: number;
  };
}

export interface AgencyBonus2026 {
  // Two-component structure
  components: {
    autoHomeAFS: {
      name: string;
      maxPercent: number;
      eligibleProducts: string[];
    };
    otherPersonalLines: {
      name: string;
      maxPercent: number;
      eligibleProducts: string[];
    };
  };
  // CA only has one component
  californiaOnly: {
    maxPercent: number;
    eligibleProducts: string[];
  };
  // Loss ratio qualifier
  lossRatioQualifier: {
    countrywide: number;
    caNjNy: number;
    metric: string;
  };
  // Quarterly advances
  quarterlyAdvances: QuarterlyAdvance[];
  // Portfolio growth scoring
  portfolioGrowth: CompCategory;
}

export interface ContingencyPlan {
  description: string;
  requirements: string[];
  effectiveDate: string;
  njNyEffectiveDate: string;
}

export interface Compensation2026Config extends CompensationConfig {
  // State-specific new business variable compensation
  newBusinessVariableComp: StateVariableComp[];

  // AAP level-based renewal variable compensation
  renewalVariableComp: RenewalVariableCompByAAP[];

  // Agency tier definitions
  agencyTiers: AgencyTier[];

  // Portfolio growth point values by product
  portfolioGrowthPoints: PortfolioGrowthPoints[];

  // Agency bonus structure (2026 specific)
  agencyBonus2026: AgencyBonus2026;

  // Contingency plan for missing baseline
  contingencyPlan: ContingencyPlan;

  // Products recognized for bundling
  bundlingRecognizedProducts: {
    product: string;
    recognized: boolean;
    notes?: string;
  }[];

  // AFS products eligible for variable compensation baseline
  afsBaselineEligible: {
    product: string;
    eligible: boolean;
    portfolioGrowthEligible: boolean;
  }[];
}

// ============================================================================
// 2026 Compensation Configuration
// ============================================================================

export const compensation2026: Compensation2026Config = {
  year: 2026,
  version: "1.0",
  lastUpdated: "2025-12-26",

  // ============================================================================
  // Agency Tiers (by PIF)
  // ============================================================================
  agencyTiers: [
    { tier: "1", pifMin: 0, pifMax: 749, subTier: "Smaller" },
    { tier: "1", pifMin: 750, pifMax: 1499, subTier: "Larger" },
    { tier: "2", pifMin: 1500, pifMax: 2249, subTier: "Smaller" },
    { tier: "2", pifMin: 2250, pifMax: 2999, subTier: "Larger" },
    { tier: "3", pifMin: 3000, pifMax: 4499, subTier: "Smaller" },
    { tier: "3", pifMin: 4500, pifMax: 5999, subTier: "Larger" },
    { tier: "4", pifMin: 6000, pifMax: 7499, subTier: "Smaller" },
    { tier: "4", pifMin: 7500, pifMax: 8999, subTier: "Larger" },
    { tier: "4B", pifMin: 9000, pifMax: Infinity },
  ],

  // ============================================================================
  // New Business Variable Compensation (effective Feb 1, 2026)
  // ============================================================================
  newBusinessVariableComp: [
    {
      stateGroup: "Countrywide",
      states: [], // All states except TX, LA, CA, CT, FL, NJ, NY
      newBusiness: {
        standardAuto: { preferredBundle: 16, bundled: 11, monoline: 6 },
        homeownersCondo: { preferredBundle: 20, bundled: 16, monoline: 7 },
        otherPersonalLines: { preferredBundle: 17, bundled: 12, monoline: 6 },
      },
    },
    {
      stateGroup: "TexasLouisiana",
      states: ["TX", "LA"],
      newBusiness: {
        standardAuto: { preferredBundle: 16, bundled: 11, monoline: 6 },
        homeownersCondo: { preferredBundle: 17, bundled: 13, monoline: 4 },
        otherPersonalLines: { preferredBundle: 17, bundled: 12, monoline: 6 },
      },
    },
    {
      stateGroup: "RestrictedStates",
      states: ["CA", "CT", "FL", "NJ", "NY"],
      flatRate: 11, // Flat 11% for all products, bundling doesn't apply
      newBusiness: {
        standardAuto: { preferredBundle: 11, bundled: 11, monoline: 11 },
        homeownersCondo: { preferredBundle: 11, bundled: 11, monoline: 11 },
        otherPersonalLines: { preferredBundle: 11, bundled: 11, monoline: 11 },
      },
    },
  ],

  // ============================================================================
  // Renewal Variable Compensation (effective Jan 1, 2026)
  // AAP level determines rates; bundling status applies except in restricted states
  // ============================================================================
  renewalVariableComp: [
    {
      stateGroup: "Countrywide",
      states: [], // All except CA, CT, FL, NJ, NY
      elite: {
        standardAuto: { preferredBundle: 3.5, bundled: 2.5, monoline: 0 },
        homeownersCondo: { preferredBundle: 3.5, bundled: 2.5, monoline: 0 },
        otherPersonalLines: { preferredBundle: 3.0, bundled: 2.0, monoline: 0 },
      },
      pro: {
        standardAuto: { preferredBundle: 3.0, bundled: 2.0, monoline: 0 },
        homeownersCondo: { preferredBundle: 3.0, bundled: 2.0, monoline: 0 },
        otherPersonalLines: { preferredBundle: 3.0, bundled: 2.0, monoline: 0 },
      },
      emerging: {
        standardAuto: { preferredBundle: 3.0, bundled: 2.0, monoline: 0 },
        homeownersCondo: { preferredBundle: 2.0, bundled: 1.0, monoline: 0 },
        otherPersonalLines: { preferredBundle: 2.0, bundled: 1.0, monoline: 0 },
      },
    },
    {
      stateGroup: "RestrictedStates",
      states: ["CA", "CT", "FL"],
      // Bundling doesn't apply - flat rates
      elite: {
        standardAuto: 5,
        homeownersCondo: 2,
        otherPersonalLines: 2,
      },
      pro: {
        standardAuto: 4,
        homeownersCondo: 1,
        otherPersonalLines: 1,
      },
      emerging: {
        standardAuto: 2,
        homeownersCondo: 0,
        otherPersonalLines: 0,
      },
    },
    {
      stateGroup: "RestrictedStates",
      states: ["NJ", "NY"],
      // Bundling doesn't apply - flat rates (different from CA/CT/FL)
      elite: {
        standardAuto: 5,
        homeownersCondo: 2,
        otherPersonalLines: 2,
      },
      pro: {
        standardAuto: 4.5,
        homeownersCondo: 1.5,
        otherPersonalLines: 1.5,
      },
      emerging: {
        standardAuto: 3,
        homeownersCondo: 0,
        otherPersonalLines: 0,
      },
    },
  ],

  // ============================================================================
  // Agency Bonus 2026 Structure
  // ============================================================================
  agencyBonus2026: {
    components: {
      autoHomeAFS: {
        name: "Standard Auto, Home, and AFS",
        maxPercent: 3.0,
        eligibleProducts: [
          "Standard Auto",
          "Homeowners",
          "North Light Homeowners",
          "Universal Life",
          "Variable Life",
          "Non-Juvenile Whole Life",
          "Juvenile Whole Life",
          "U/W Term",
          "Instant/Simplified/Non-medical Issue Term",
          "Annuities (Strategic Carrier Program)",
          "Everlake Term and Perm Life",
        ],
      },
      otherPersonalLines: {
        name: "Other Personal Lines",
        maxPercent: 1.0,
        eligibleProducts: [
          "Condo",
          "North Light Condo",
          "Landlords",
          "North Light Landlords",
          "Renters",
          "Specialty Auto (Motorcycle, Motorhome, Off-road, Trailers)",
          "Personal Umbrella Policy (PUP)",
          "Boatowners",
          "Manufactured Home",
        ],
      },
    },
    californiaOnly: {
      maxPercent: 4.0,
      eligibleProducts: [
        "Standard Auto",
        "Universal Life",
        "Variable Life",
        "Non-Juvenile Whole Life",
        "Juvenile Whole Life",
        "U/W Term",
        "Instant/Simplified/Non-medical Issue Term",
        "Annuities (Strategic Carrier Program)",
        "Everlake Term and Perm Life",
      ],
    },
    lossRatioQualifier: {
      countrywide: 68.0, // ≤68.00%
      caNjNy: 73.0, // ≤73.00%
      metric: "Standard Auto Only Capped Paid Loss Ratio (better of 12MM and 24MM)",
    },
    quarterlyAdvances: [
      {
        quarter: 1,
        percentOfEstimatedBonus: 15,
        qualifierLossRatio: { countrywide: 66.0, caOnly: 71.0, njNyOnly: 71.0 },
        qualifierBPS: { countrywide: 200, caOnly: 250, njNyOnly: 200 },
      },
      {
        quarter: 2,
        percentOfEstimatedBonus: 15,
        qualifierLossRatio: { countrywide: 66.0, caOnly: 71.0, njNyOnly: 71.0 },
        qualifierBPS: { countrywide: 200, caOnly: 250, njNyOnly: 200 },
      },
      {
        quarter: 3,
        percentOfEstimatedBonus: 20,
        qualifierLossRatio: { countrywide: 66.0, caOnly: 71.0, njNyOnly: 71.0 },
        qualifierBPS: { countrywide: 200, caOnly: 250, njNyOnly: 200 },
      },
      {
        quarter: 4,
        percentOfEstimatedBonus: 50, // Remaining balance (100 - 15 - 15 - 20)
        qualifierLossRatio: { countrywide: 68.0, caOnly: 73.0, njNyOnly: 73.0 },
        qualifierBPS: { countrywide: 0, caOnly: 0, njNyOnly: 0 }, // No BPS requirement for year-end
      },
    ],
    portfolioGrowth: {
      id: "pg",
      name: "Portfolio Growth",
      description: "Year-over-year net growth based on portfolio score",
      unit: "BPS",
      tiers: [
        // Tiers use interpolation - these are reference points
        // Actual goals are set based on agency tier and market
        {
          id: "pg-min",
          label: "Minimum",
          threshold: 0,
          bonusPercent: 0,
          description: "Below minimum threshold",
        },
        {
          id: "pg-1",
          label: "Entry",
          threshold: 50,
          bonusPercent: 0.5,
          description: "Entry level growth",
        },
        {
          id: "pg-2",
          label: "Good",
          threshold: 100,
          bonusPercent: 1.0,
          description: "Good growth",
        },
        {
          id: "pg-3",
          label: "Strong",
          threshold: 200,
          bonusPercent: 2.0,
          description: "Strong growth",
        },
        {
          id: "pg-4",
          label: "Excellent",
          threshold: 300,
          bonusPercent: 3.0,
          description: "Excellent growth (max for Auto/Home/AFS component)",
        },
        {
          id: "pg-5",
          label: "Outstanding",
          threshold: 400,
          bonusPercent: 4.0,
          description: "Outstanding growth (includes Other PL component)",
        },
      ],
    },
  },

  // ============================================================================
  // Portfolio Growth Point Values by Product (Allstate 2026 FAQ - Page 23)
  // NOTE: eligibleInCA = false for products excluded from CA annual bonus
  // ============================================================================
  portfolioGrowthPoints: [
    // Auto
    { productLine: "Standard Auto", points: 10, category: "Auto", eligibleForBonus: true, eligibleInCA: true },
    { productLine: "Specialty Auto", points: 5, category: "Auto", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "Non-Standard Auto", points: 0, category: "Auto", eligibleForBonus: false, eligibleInCA: false },
    // Home (NOT eligible in CA)
    { productLine: "Homeowners", points: 20, category: "Home", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "North Light Homeowners", points: 20, category: "Home", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "Condo", points: 20, category: "Home", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "North Light Condo", points: 20, category: "Home", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "Landlords", points: 20, category: "Home", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "North Light Landlords", points: 20, category: "Home", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "Renters", points: 5, category: "Home", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "Manufactured Home", points: 5, category: "Home", eligibleForBonus: true, eligibleInCA: false },
    // Other Personal Lines (NOT eligible in CA)
    { productLine: "Personal Umbrella Policy", points: 5, category: "OtherPersonalLines", eligibleForBonus: true, eligibleInCA: false },
    { productLine: "Boatowners", points: 5, category: "OtherPersonalLines", eligibleForBonus: true, eligibleInCA: false },
    // Life Products (eligible in CA)
    { productLine: "U/W Term Life", points: 10, category: "Life", eligibleForBonus: true, eligibleInCA: true },
    { productLine: "Everlake Term/Perm Life", points: 10, category: "Life", eligibleForBonus: true, eligibleInCA: true },
    { productLine: "Non-Juvenile Whole Life", points: 15, category: "Life", eligibleForBonus: true, eligibleInCA: true },
    { productLine: "Universal Life", points: 15, category: "Life", eligibleForBonus: true, eligibleInCA: true },
    { productLine: "Variable Life", points: 15, category: "Life", eligibleForBonus: true, eligibleInCA: true },
    { productLine: "Instant/Simplified Term", points: 5, category: "Life", eligibleForBonus: true, eligibleInCA: true },
    { productLine: "Juvenile Whole Life", points: 5, category: "Life", eligibleForBonus: true, eligibleInCA: true },
    // AFS - Annuities (eligible in CA)
    { productLine: "Annuities (Strategic Carrier)", points: 20, category: "AFS", eligibleForBonus: true, eligibleInCA: true },
  ],

  // ============================================================================
  // Contingency Plan
  // ============================================================================
  contingencyPlan: {
    description: "Additional opportunity to earn NB variable compensation if monthly baseline is missed",
    requirements: [
      "Must meet or exceed monthly range for that month",
      "Actual YTD variable compensation eligible items must be above YTD baseline",
    ],
    effectiveDate: "2026-02-01", // CW excluding NJ/NY
    njNyEffectiveDate: "2026-03-01", // NJ/NY starts one month later
  },

  // ============================================================================
  // Products Recognized for Bundling
  // ============================================================================
  bundlingRecognizedProducts: [
    { product: "Standard Auto", recognized: true },
    { product: "Non-Standard Auto", recognized: true },
    { product: "Specialty Auto (Motorcycle, Motorhome, Off-road, Trailers)", recognized: true },
    { product: "Homeowners", recognized: true },
    { product: "Condo", recognized: true },
    { product: "Renters", recognized: true },
    { product: "Landlords", recognized: true },
    { product: "Personal Umbrella Policy", recognized: true },
    { product: "Boatowners", recognized: true },
    { product: "Manufactured Home", recognized: true },
    { product: "Ivantage (most products)", recognized: true, notes: "See Ivantage Policy Data Timing for details" },
    { product: "North Light Homeowners", recognized: true },
    { product: "Flood", recognized: true },
    { product: "Universal Life", recognized: true },
    { product: "Variable Life", recognized: true },
    { product: "Non-Juvenile Whole Life", recognized: true },
    { product: "Juvenile Whole Life", recognized: true },
    { product: "U/W Term", recognized: true },
    { product: "Instant/Simplified/Non-medical Issue Term", recognized: true },
    { product: "Annuities (Strategic Carrier)", recognized: true },
    { product: "Everlake Term and Perm Life", recognized: true },
    { product: "UITs", recognized: true },
    { product: "Mutual Funds", recognized: true },
    { product: "Managed Assets", recognized: true },
    // Not recognized for bundling
    { product: "CA Earthquake", recognized: false },
    { product: "Workers Compensation", recognized: false },
    { product: "Scheduled Personal Property", recognized: false },
    { product: "Valuable Item Protection", recognized: false },
    { product: "Motor Club", recognized: false },
    { product: "Crump Life", recognized: false },
    { product: "COVR Financial Technologies", recognized: false },
    { product: "Everlake Annuities", recognized: false },
    { product: "Wilton Re Annuities and Life", recognized: false },
    { product: "Disability Income", recognized: false },
    { product: "Long Term Care", recognized: false },
    { product: "Allstate Benefits worksite", recognized: false },
  ],

  // ============================================================================
  // AFS Products - Baseline and Portfolio Growth Eligibility
  // ============================================================================
  afsBaselineEligible: [
    { product: "Universal Life", eligible: true, portfolioGrowthEligible: true },
    { product: "Variable Life", eligible: true, portfolioGrowthEligible: true },
    { product: "Non-Juvenile Whole Life", eligible: true, portfolioGrowthEligible: true },
    { product: "Juvenile Whole Life", eligible: false, portfolioGrowthEligible: true },
    { product: "U/W Term", eligible: true, portfolioGrowthEligible: true },
    { product: "Instant/Simplified/Non-medical Issue Term", eligible: false, portfolioGrowthEligible: true },
    { product: "Annuities (Strategic Carrier)", eligible: true, portfolioGrowthEligible: true },
    { product: "Everlake Perm and Term Life", eligible: true, portfolioGrowthEligible: true },
    { product: "Crump Life", eligible: false, portfolioGrowthEligible: false },
    { product: "COVR Financial Technologies", eligible: false, portfolioGrowthEligible: false },
    { product: "Everlake Annuities", eligible: false, portfolioGrowthEligible: false },
    { product: "Wilton Re Annuities and Life", eligible: false, portfolioGrowthEligible: false },
    { product: "UITs", eligible: false, portfolioGrowthEligible: false },
    { product: "Mutual Funds", eligible: false, portfolioGrowthEligible: false },
    { product: "Managed Assets", eligible: false, portfolioGrowthEligible: false },
    { product: "Disability Income", eligible: false, portfolioGrowthEligible: false },
    { product: "Long Term Care", eligible: false, portfolioGrowthEligible: false },
    { product: "Allstate Benefits worksite", eligible: false, portfolioGrowthEligible: false },
  ],

  // ============================================================================
  // Legacy Structure (for compatibility with existing components)
  // ============================================================================
  agencyBonus: {
    policyBundleRate: {
      id: "pbr",
      name: "Policy Bundle Rate",
      description: "Note: 2026 uses Portfolio Growth as primary metric, not PBR",
      unit: "%",
      tiers: [
        {
          id: "pbr-info",
          label: "See Portfolio Growth",
          threshold: 0,
          bonusPercent: 0,
          description: "2026 Agency Bonus is based on Portfolio Growth, not PBR",
        },
      ],
    },
    portfolioGrowth: {
      id: "pg",
      name: "Portfolio Growth",
      description: "Year-over-year net growth based on portfolio score with interpolation",
      unit: "BPS",
      tiers: [
        {
          id: "pg-min",
          label: "Minimum",
          threshold: 0,
          bonusPercent: 0,
          description: "Below minimum threshold",
        },
        {
          id: "pg-1",
          label: "Entry",
          threshold: 50,
          bonusPercent: 0.5,
          description: "Entry level growth",
        },
        {
          id: "pg-2",
          label: "Good",
          threshold: 100,
          bonusPercent: 1.0,
          description: "Good growth",
        },
        {
          id: "pg-3",
          label: "Strong",
          threshold: 200,
          bonusPercent: 2.0,
          description: "Strong growth",
        },
        {
          id: "pg-4",
          label: "Excellent",
          threshold: 300,
          bonusPercent: 3.0,
          description: "Excellent growth",
        },
        {
          id: "pg-5",
          label: "Maximum",
          threshold: 400,
          bonusPercent: 4.0,
          description: "Maximum bonus (Auto/Home/AFS 3% + Other PL 1%)",
        },
      ],
    },
  },

  // ============================================================================
  // NB Variable Comp (legacy format for compatibility)
  // Note: Use newBusinessVariableComp for state-specific rates
  // ============================================================================
  nbVariableComp: [
    {
      line: "Auto",
      newBusinessRate: 16, // Preferred Bundle rate (Countrywide)
      renewalRate: 2.5, // Bundled rate
      renewalRateElite: 3.5, // Elite Preferred Bundle rate
      notes: "Preferred Bundle; varies by state and bundling status",
    },
    {
      line: "Homeowners",
      newBusinessRate: 20, // Preferred Bundle rate (Countrywide)
      renewalRate: 2.5,
      renewalRateElite: 3.5,
      notes: "Preferred Bundle; varies by state and bundling status",
    },
    {
      line: "Condo",
      newBusinessRate: 20, // Preferred Bundle rate
      renewalRate: 2.5,
      renewalRateElite: 3.5,
      notes: "Treated same as Homeowners for bundling",
    },
    {
      line: "Renters",
      newBusinessRate: 17, // Preferred Bundle "Other Personal Lines"
      renewalRate: 2.0,
      renewalRateElite: 3.0,
      notes: "Other Personal Lines category",
    },
    {
      line: "Umbrella",
      newBusinessRate: 17, // Preferred Bundle "Other Personal Lines"
      renewalRate: 2.0,
      renewalRateElite: 3.0,
      notes: "Other Personal Lines category; high retention",
    },
    {
      line: "Motorcycle/Toys",
      newBusinessRate: 17, // Specialty auto = Other Personal Lines
      renewalRate: 2.0,
      renewalRateElite: 3.0,
      notes: "Specialty Auto = Other Personal Lines",
    },
    {
      line: "Boat",
      newBusinessRate: 17,
      renewalRate: 2.0,
      renewalRateElite: 3.0,
      notes: "Other Personal Lines category",
    },
    {
      line: "Life/Financial",
      newBusinessRate: 0, // AFS has separate compensation structure
      renewalRate: 0,
      renewalRateElite: 0,
      notes: "AFS products have separate compensation; counts for bundling and baseline",
    },
  ],

  // ============================================================================
  // Bigger Bundle Bonus (if applicable in 2026)
  // ============================================================================
  biggerBundleBonus: {
    condition: "3rd+ line added to household",
    amount: 50, // $50 if household has Auto or HO
    eligibleLines: [
      "Renters",
      "Umbrella",
      "Landlords",
      "Specialty Auto",
      "Boat",
      "RV",
      "ATV",
      "Motorcycle",
    ],
    startDate: "2026-01-01",
  },

  // ============================================================================
  // Monthly Baseline Requirements
  // ============================================================================
  monthlyBaseline: {
    description: "Must hit monthly NB baseline to unlock all NB variable comp. Contingency Plan available if missed.",
    eligibleLines: [
      "Standard Auto",
      "Homeowners",
      "Condo",
      "Renters",
      "Landlords",
      "Specialty Auto (Motorcycle, Motorhome, Off-road, Trailers)",
      "Personal Umbrella Policy",
      "Boatowners",
      "Manufactured Home",
      "Eligible AFS products",
    ],
    targetDate: 20,
  },

  // ============================================================================
  // Elite Qualification
  // ============================================================================
  eliteQualification: {
    criteria: [
      "AAP level earned during prior year (Jan 1 - Dec 31 measurement)",
      "Elite agents get NB VC on 1st renewals of 6-month auto policies",
      "Eligible for quarterly bonus advance payouts",
      "Highest renewal variable compensation rates",
    ],
    benefits: [
      "NB Variable Comp on 1st renewals of 6mo standard auto and specialty auto",
      "Highest renewal VC rates (3.5% vs 3.0% Pro vs 2.0%-3.0% Emerging)",
      "Eligibility for quarterly bonus advance payouts (15%/15%/20%/remaining)",
      "Standard Auto renewal: 5% in CA/CT/FL/NJ/NY vs 3.5% Countrywide (Preferred Bundle)",
    ],
  },

  // ============================================================================
  // Monthly Targets (recommended)
  // ============================================================================
  monthlyTargets: [
    { line: "Auto", target: 20, role: "Drives baseline + preferred bundles" },
    { line: "Homeowners", target: 10, role: "Creates preferred bundles with auto" },
    { line: "Condo", target: 5, role: "Alternative to HO for preferred bundling" },
    { line: "Renters", target: 10, role: "3rd line / Other PL component" },
    { line: "Umbrella", target: 5, role: "High retention + Other PL component" },
    { line: "Specialty Auto", target: 4, role: "Other PL component" },
    { line: "Life/AFS", target: 3, role: "Counts for bundling and Auto/Home/AFS bonus component" },
  ],

  // ============================================================================
  // KPIs
  // ============================================================================
  kpis: {
    daily: [
      "Auto issued today",
      "HO/Condo issued today (preferred bundles)",
      "Baseline progress %",
      "Preferred bundles created (Auto + HO/Condo)",
      "Bundled households created",
      "YTD items vs YTD baseline (Contingency Plan)",
      "Other PL items issued",
    ],
    weekly: [
      "NB Baseline pace (goal: 75% by week 3)",
      "Preferred bundle rate (goal: ≥40%)",
      "Bundle rate overall (goal: ≥60%)",
      "Portfolio Growth on-pace BPS",
      "Standard Auto Loss Ratio (goal: ≤66% for quarterly advances)",
      "HO renewals taken",
      "6-month auto 1st renewals processed (Elite only)",
      "AFS policies issued",
      "Agency Bonus on-pace status (both components)",
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the agency tier based on PIF count
 */
export function getAgencyTier(pif: number): AgencyTier | null {
  return compensation2026.agencyTiers.find(
    (tier) => pif >= tier.pifMin && pif <= tier.pifMax
  ) || null;
}

/**
 * Get new business variable compensation rate based on state and bundling status
 */
export function getNBVariableCompRate(
  state: string,
  productLine: 'standardAuto' | 'homeownersCondo' | 'otherPersonalLines',
  bundlingStatus: BundlingStatus
): number {
  const stateUpper = state.toUpperCase();

  // Find applicable rate group
  let rateGroup = compensation2026.newBusinessVariableComp.find(
    (group) => group.states.includes(stateUpper)
  );

  // If not found in specific states, use Countrywide
  if (!rateGroup) {
    rateGroup = compensation2026.newBusinessVariableComp.find(
      (group) => group.stateGroup === "Countrywide"
    );
  }

  if (!rateGroup) return 0;

  // For restricted states, return flat rate
  if (rateGroup.flatRate !== undefined) {
    return rateGroup.flatRate;
  }

  // Get rate based on bundling status
  const rates = rateGroup.newBusiness[productLine];
  switch (bundlingStatus) {
    case 'PreferredBundle':
      return rates.preferredBundle;
    case 'Bundled':
      return rates.bundled;
    case 'Monoline':
      return rates.monoline;
    default:
      return rates.monoline;
  }
}

/**
 * Get renewal variable compensation rate based on state, AAP level, and bundling status
 */
export function getRenewalVariableCompRate(
  state: string,
  aapLevel: AAPLevel,
  productLine: 'standardAuto' | 'homeownersCondo' | 'otherPersonalLines',
  bundlingStatus: BundlingStatus
): number {
  const stateUpper = state.toUpperCase();

  // Find applicable rate group
  let rateGroup = compensation2026.renewalVariableComp.find(
    (group) => group.states.includes(stateUpper)
  );

  // If not found in specific states, use Countrywide
  if (!rateGroup) {
    rateGroup = compensation2026.renewalVariableComp.find(
      (group) => group.stateGroup === "Countrywide"
    );
  }

  if (!rateGroup) return 0;

  // Get rates for AAP level
  const levelKey = aapLevel.toLowerCase() as 'elite' | 'pro' | 'emerging';
  const levelRates = rateGroup[levelKey];

  const productRates = levelRates[productLine];

  // For restricted states, rates are flat numbers
  if (typeof productRates === 'number') {
    return productRates;
  }

  // Get rate based on bundling status
  switch (bundlingStatus) {
    case 'PreferredBundle':
      return productRates.preferredBundle;
    case 'Bundled':
      return productRates.bundled;
    case 'Monoline':
      return productRates.monoline;
    default:
      return productRates.monoline;
  }
}

/**
 * Calculate portfolio growth points for a set of items
 */
export function calculatePortfolioGrowthPoints(
  items: { productLine: string; count: number }[]
): { total: number; autoHomeAFS: number; otherPL: number } {
  let autoHomeAFS = 0;
  let otherPL = 0;

  for (const item of items) {
    const pointConfig = compensation2026.portfolioGrowthPoints.find(
      (p) => p.productLine === item.productLine
    );
    if (pointConfig && pointConfig.eligibleForBonus) {
      const points = item.count * pointConfig.points;
      if (pointConfig.category === 'AutoHomeAFS') {
        autoHomeAFS += points;
      } else {
        otherPL += points;
      }
    }
  }

  return {
    total: autoHomeAFS + otherPL,
    autoHomeAFS,
    otherPL,
  };
}

/**
 * Check if agent qualifies for quarterly advance payout
 */
export function qualifiesForQuarterlyAdvance(
  quarter: 1 | 2 | 3,
  state: string,
  lossRatio: number,
  onPaceBPS: number
): boolean {
  const advance = compensation2026.agencyBonus2026.quarterlyAdvances.find(
    (q) => q.quarter === quarter
  );
  if (!advance) return false;

  const stateUpper = state.toUpperCase();
  let requiredLR: number;
  let requiredBPS: number;

  if (stateUpper === 'CA') {
    requiredLR = advance.qualifierLossRatio.caOnly;
    requiredBPS = advance.qualifierBPS.caOnly;
  } else if (['NJ', 'NY'].includes(stateUpper)) {
    requiredLR = advance.qualifierLossRatio.njNyOnly;
    requiredBPS = advance.qualifierBPS.njNyOnly;
  } else {
    requiredLR = advance.qualifierLossRatio.countrywide;
    requiredBPS = advance.qualifierBPS.countrywide;
  }

  return lossRatio <= requiredLR && onPaceBPS >= requiredBPS;
}

/**
 * Calculate estimated quarterly advance payout
 */
export function calculateQuarterlyAdvance(
  quarter: 1 | 2 | 3,
  estimatedYearEndBonus: number
): number {
  const advance = compensation2026.agencyBonus2026.quarterlyAdvances.find(
    (q) => q.quarter === quarter
  );
  if (!advance) return 0;

  return estimatedYearEndBonus * (advance.percentOfEstimatedBonus / 100);
}

export default compensation2026;
