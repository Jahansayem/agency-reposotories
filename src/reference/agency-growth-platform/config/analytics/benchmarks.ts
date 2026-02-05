/**
 * Benchmark Constants
 *
 * Industry benchmarks for agency performance metrics.
 * Uses centralized values from modelConstants where available.
 */

import {
  RETENTION_BENCHMARKS,
  PPC_THRESHOLDS,
  CAPACITY_BENCHMARKS,
  LTV_PARAMS,
} from './modelConstants';

// V6.1: Benchmark constants - now using centralized modelConstants
export const BENCHMARKS = {
  RULE_OF_20: {
    TOP_PERFORMER: 25,
    HEALTHY: 20,
    NEEDS_IMPROVEMENT: 15
  },
  EBITDA: {
    EXCELLENT: 0.30,
    TARGET: 0.25,
    ACCEPTABLE: 0.20
  },
  LTV_CAC: {
    GREAT: LTV_PARAMS.benchmarks.good,       // 4.0
    GOOD: LTV_PARAMS.benchmarks.acceptable,   // 3.0
    UNDERINVESTED: LTV_PARAMS.benchmarks.underinvested // 5.0
  },
  RPE: {
    EXCELLENT: 300000,
    GOOD: 200000,
    ACCEPTABLE: 150000
  },
  POLICIES_PER_CUSTOMER: {
    OPTIMAL: PPC_THRESHOLDS.optimal,   // 1.8
    BUNDLED: PPC_THRESHOLDS.bundled,   // 1.5
    MONOLINE: PPC_THRESHOLDS.monoline  // 1.0
  },
  RETENTION: {
    // V6.1 FIX: Using actual audit data from modelConstants
    // Derrick's actual: 89.64% overall, 95.19% umbrella, 99.09% life
    // Bundled customers retain at 91-95%, monoline at 67%
    OPTIMAL: RETENTION_BENCHMARKS.byBundling.optimalBundled, // 0.95
    BUNDLED: RETENTION_BENCHMARKS.byBundling.bundled,        // 0.91
    MONOLINE: RETENTION_BENCHMARKS.byBundling.monoline       // 0.67
  },
  STAFFING_RATIO: {
    OPTIMAL: CAPACITY_BENCHMARKS.staffingRatio.optimal, // 2.8
    MIN: CAPACITY_BENCHMARKS.staffingRatio.minimum,     // 2.0
    MAX: CAPACITY_BENCHMARKS.staffingRatio.maximum      // 3.5
  }
};

export default BENCHMARKS;
