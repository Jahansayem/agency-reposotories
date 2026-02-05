/**
 * Allstate 2025 Compensation Structure Configuration
 *
 * This file contains the complete compensation structure for 2025.
 * To update for 2026, copy this file to compensation2026.ts and modify values.
 * The active year is set in compensationConfig.ts
 */

export interface CompTier {
  id: string;
  label: string;
  threshold: number | string;
  thresholdMax?: number | string;
  bonusPercent: number;
  description?: string;
}

export interface CompCategory {
  id: string;
  name: string;
  description: string;
  unit: string;
  tiers: CompTier[];
  currentValue?: number;
}

export interface NBVariableComp {
  line: string;
  newBusinessRate: number;
  renewalRate: number;
  renewalRateElite: number;
  notes?: string;
}

export interface BiggerBundleBonus {
  condition: string;
  amount: number;
  eligibleLines: string[];
  startDate: string;
}

export interface MonthlyTargets {
  line: string;
  target: number;
  role: string;
}

export interface CompensationConfig {
  year: number;
  version: string;
  lastUpdated: string;

  // Agency Bonus Structure
  agencyBonus: {
    policyBundleRate: CompCategory;
    portfolioGrowth: CompCategory;
  };

  // New Business Variable Compensation
  nbVariableComp: NBVariableComp[];

  // Bigger Bundle Bonus
  biggerBundleBonus: BiggerBundleBonus;

  // Monthly baseline requirements
  monthlyBaseline: {
    description: string;
    eligibleLines: string[];
    targetDate: number; // day of month to hit by
  };

  // Elite qualification criteria
  eliteQualification: {
    criteria: string[];
    benefits: string[];
  };

  // Recommended monthly targets
  monthlyTargets: MonthlyTargets[];

  // KPIs
  kpis: {
    daily: string[];
    weekly: string[];
  };
}

export const compensation2025: CompensationConfig = {
  year: 2025,
  version: "1.0",
  lastUpdated: "2025-11-21",

  agencyBonus: {
    policyBundleRate: {
      id: "pbr",
      name: "Policy Bundle Rate",
      description: "Percentage of policies that are bundled (Auto + HO/Condo)",
      unit: "%",
      tiers: [
        {
          id: "pbr-1",
          label: "No Bonus",
          threshold: 0,
          thresholdMax: 35.99,
          bonusPercent: 0.00,
          description: "Below minimum threshold"
        },
        {
          id: "pbr-2",
          label: "Tier 1",
          threshold: 36.00,
          thresholdMax: 37.99,
          bonusPercent: 0.50,
          description: "Entry level performance"
        },
        {
          id: "pbr-3",
          label: "Tier 2",
          threshold: 38.00,
          thresholdMax: 39.99,
          bonusPercent: 0.75,
          description: "Good performance"
        },
        {
          id: "pbr-4",
          label: "Tier 3",
          threshold: 40.00,
          thresholdMax: 100,
          bonusPercent: 1.00,
          description: "Top tier performance"
        }
      ]
    },
    portfolioGrowth: {
      id: "pg",
      name: "Portfolio Growth",
      description: "Net item growth (new items minus lost items)",
      unit: "items",
      tiers: [
        {
          id: "pg-1",
          label: "Tier 1",
          threshold: -877,
          bonusPercent: 0.0500,
          description: "Minimum threshold"
        },
        {
          id: "pg-2",
          label: "Tier 2",
          threshold: -501,
          bonusPercent: 0.5500,
          description: "Entry level growth"
        },
        {
          id: "pg-3",
          label: "Tier 3",
          threshold: -274,
          bonusPercent: 1.1000,
          description: "Good growth"
        },
        {
          id: "pg-4",
          label: "Tier 4",
          threshold: -148,
          bonusPercent: 2.0000,
          description: "Strong growth"
        },
        {
          id: "pg-5",
          label: "Tier 5",
          threshold: -22,
          bonusPercent: 2.9000,
          description: "Excellent growth"
        },
        {
          id: "pg-6",
          label: "Tier 6",
          threshold: 330,
          bonusPercent: 3.5000,
          description: "Outstanding growth"
        },
        {
          id: "pg-7",
          label: "Tier 7",
          threshold: 706,
          bonusPercent: 4.0000,
          description: "Exceptional growth"
        },
        {
          id: "pg-8",
          label: "Exceptional",
          threshold: 1656,
          bonusPercent: 5.0000, // Estimated for Earn Back Goal
          description: "Earn Back Goal - Maximum tier"
        }
      ]
    }
  },

  nbVariableComp: [
    {
      line: "Auto",
      newBusinessRate: 16,
      renewalRate: 2.5,
      renewalRateElite: 3.5,
      notes: "Baseline qualifier"
    },
    {
      line: "Homeowners",
      newBusinessRate: 20,
      renewalRate: 2.5,
      renewalRateElite: 3.5,
      notes: "Baseline qualifier, highest NB rate"
    },
    {
      line: "Condo",
      newBusinessRate: 20,
      renewalRate: 2.5,
      renewalRateElite: 3.5,
      notes: "Baseline qualifier"
    },
    {
      line: "Renters",
      newBusinessRate: 15,
      renewalRate: 2.0,
      renewalRateElite: 3.0,
      notes: "3rd line eligible"
    },
    {
      line: "Umbrella",
      newBusinessRate: 18,
      renewalRate: 2.5,
      renewalRateElite: 3.5,
      notes: "High retention, 3rd line eligible"
    },
    {
      line: "Motorcycle/Toys",
      newBusinessRate: 14,
      renewalRate: 2.0,
      renewalRateElite: 2.5,
      notes: "3rd line eligible"
    },
    {
      line: "Commercial",
      newBusinessRate: 12,
      renewalRate: 2.0,
      renewalRateElite: 2.5,
      notes: "Not baseline eligible"
    },
    {
      line: "Life/Financial",
      newBusinessRate: 25,
      renewalRate: 3.0,
      renewalRateElite: 4.0,
      notes: "Increases bundle rate"
    }
  ],

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
      "Motorcycle"
    ],
    startDate: "2025-03-01"
  },

  monthlyBaseline: {
    description: "Must hit monthly NB baseline to unlock all NB variable comp",
    eligibleLines: ["Auto", "Homeowners", "Condo"],
    targetDate: 20 // Hit by the 20th to avoid hold-card issues
  },

  eliteQualification: {
    criteria: [
      "Meet NB baseline 12/12 months",
      "Maintain ≥60% bundle rate",
      "High Drivewise penetration (~30%+)",
      "Keep nonstandard auto % low",
      "Strong HO retention efforts",
      "Protect renewal bundling"
    ],
    benefits: [
      "NB Variable Comp on 1st renewals of 6mo auto",
      "Highest renewal VC rates (3.5% vs 2.5%)",
      "Eligibility for quarterly bonus advances",
      "Significantly higher annual compensation"
    ]
  },

  monthlyTargets: [
    { line: "Auto", target: 20, role: "Drives baseline + bundles" },
    { line: "Homeowners", target: 10, role: "Converts auto leads into preferred bundles" },
    { line: "Condo", target: 5, role: "Backup HO line for bundling" },
    { line: "Renters", target: 10, role: "3rd line fuel" },
    { line: "Umbrella", target: 5, role: "High retention + bigger bundle bonus" },
    { line: "Motorcycle/Toys", target: 4, role: "Easy 3rd+ line bonuses" },
    { line: "Commercial", target: 3, role: "Extra revenue" },
    { line: "Life/Financial", target: 3, role: "Increases Bundle Rate for bonus" }
  ],

  kpis: {
    daily: [
      "Auto issued today",
      "HO/Condo issued today",
      "Baseline progress %",
      "Bundle % (new policies)",
      "Preferred bundles created",
      "Missed bundle opportunities",
      "3rd line quotes generated"
    ],
    weekly: [
      "NB Baseline pace (goal: 75% by week 3)",
      "Bundle rate (goal: ≥60%)",
      "Preferred bundle rate (goal: ≥40%)",
      "3+ line sales (goal: 4-5/week)",
      "HO renewals processed",
      "Renewal save attempts",
      "Lapsing Auto/HO policies",
      "Drivewise adoption rate",
      "Agency bonus on-pace status"
    ]
  }
};

// Helper function to find current tier
export function findCurrentTier(category: CompCategory, value: number): CompTier | null {
  const sortedTiers = [...category.tiers].sort((a, b) => {
    const aThresh = typeof a.threshold === 'number' ? a.threshold : parseFloat(a.threshold);
    const bThresh = typeof b.threshold === 'number' ? b.threshold : parseFloat(b.threshold);
    return bThresh - aThresh; // Sort descending
  });

  for (const tier of sortedTiers) {
    const threshold = typeof tier.threshold === 'number' ? tier.threshold : parseFloat(tier.threshold);
    if (value >= threshold) {
      return tier;
    }
  }

  return sortedTiers[sortedTiers.length - 1]; // Return lowest tier if below all
}

// Helper function to find next tier
export function findNextTier(category: CompCategory, value: number): CompTier | null {
  const sortedTiers = [...category.tiers].sort((a, b) => {
    const aThresh = typeof a.threshold === 'number' ? a.threshold : parseFloat(a.threshold);
    const bThresh = typeof b.threshold === 'number' ? b.threshold : parseFloat(b.threshold);
    return aThresh - bThresh; // Sort ascending
  });

  for (const tier of sortedTiers) {
    const threshold = typeof tier.threshold === 'number' ? tier.threshold : parseFloat(tier.threshold);
    if (value < threshold) {
      return tier;
    }
  }

  return null; // Already at max tier
}

// Calculate bonus amount based on written premium
export function calculateBonus(
  writtenPremium: number,
  pbrValue: number,
  pgValue: number,
  config: CompensationConfig
): { pbrBonus: number; pgBonus: number; totalBonus: number } {
  const pbrTier = findCurrentTier(config.agencyBonus.policyBundleRate, pbrValue);
  const pgTier = findCurrentTier(config.agencyBonus.portfolioGrowth, pgValue);

  const pbrBonus = pbrTier ? (writtenPremium * pbrTier.bonusPercent / 100) : 0;
  const pgBonus = pgTier ? (writtenPremium * pgTier.bonusPercent / 100) : 0;

  return {
    pbrBonus,
    pgBonus,
    totalBonus: pbrBonus + pgBonus
  };
}

export default compensation2025;
