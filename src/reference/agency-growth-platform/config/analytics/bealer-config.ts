/**
 * Wavezly Growth Simulator Configuration
 *
 * TypeScript port of bealer-lead-model/src/config.py
 * Stores default parameters and allows easy customization for growth simulations.
 *
 * Data Source: All Purpose Audit (Nov 14, 2025) - Derrick Wavezly A0C6581
 * Last Updated: 2025-12-05
 *
 * Source: /Users/adrianstier/bealer-lead-model/src/config.py
 */

// =============================================================================
// SIMULATION PARAMETERS INTERFACE
// Source: config.py lines 14-66 (SimulationParameters dataclass)
// =============================================================================

/**
 * Simulation parameters for agency growth modeling.
 * Matches the Python SimulationParameters dataclass for backward compatibility.
 *
 * Source: config.py lines 14-16
 */
export interface SimulationParameters {
  /** Current active policies in the agency */
  currentPolicies: number;

  /** Current full-time equivalent staff count */
  currentStaffFte: number;

  /** Current monthly lead spend in dollars */
  baselineLeadSpend: number;

  /** Average cost per lead in dollars */
  leadCostPerLead: number;

  /** Percentage of leads that get contacted (0-1) */
  contactRate: number;

  /** Percentage of contacted leads that get quoted (0-1) */
  quoteRate: number;

  /** Percentage of quoted leads that bind (0-1) */
  bindRate: number;

  /** Average annual premium per policy in dollars */
  avgPremiumAnnual: number;

  /** Commission rate on premiums (0-1) */
  commissionRate: number;

  /** Annual retention rate (0-1) */
  annualRetentionBase: number;

  /** Monthly cost per staff member in dollars */
  staffMonthlyCostPerFte: number;

  /** Maximum leads per FTE per month before efficiency drops */
  maxLeadsPerFtePerMonth: number;

  /** Efficiency penalty per 10 leads over capacity (0-1) */
  efficiencyPenaltyRate: number;

  /** Retention improvement from concierge service (0-1) */
  conciergeRetentionBoost: number;

  /** Retention improvement from newsletter system (0-1) */
  newsletterRetentionBoost: number;

  /** Monthly cost of concierge system in dollars */
  conciergeMonthlyCost: number;

  /** Monthly cost of newsletter system in dollars */
  newsletterMonthlyCost: number;
}

// =============================================================================
// DEFAULT SIMULATION PARAMETERS
// Source: config.py lines 17-33 (SimulationParameters defaults)
// =============================================================================

/**
 * Default simulation parameters matching Python dataclass defaults.
 *
 * Source: config.py lines 17-33
 */
export const DEFAULT_SIMULATION_PARAMETERS: SimulationParameters = {
  currentPolicies: 500,              // Line 17
  currentStaffFte: 2.0,              // Line 18
  baselineLeadSpend: 1000,           // Line 19
  leadCostPerLead: 25,               // Line 20
  contactRate: 0.70,                 // Line 21
  quoteRate: 0.60,                   // Line 22
  bindRate: 0.50,                    // Line 23
  avgPremiumAnnual: 1500,            // Line 24
  commissionRate: 0.12,              // Line 25
  annualRetentionBase: 0.85,         // Line 26
  staffMonthlyCostPerFte: 5000,      // Line 27
  maxLeadsPerFtePerMonth: 150,       // Line 28
  efficiencyPenaltyRate: 0.05,       // Line 29
  conciergeRetentionBoost: 0.03,     // Line 30
  newsletterRetentionBoost: 0.02,    // Line 31
  conciergeMonthlyCost: 500,         // Line 32
  newsletterMonthlyCost: 200,        // Line 33
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// Source: config.py lines 35-38 (monthly_retention_base property)
// =============================================================================

/**
 * Calculate monthly retention from annual retention.
 * Formula: annual_retention ^ (1/12)
 *
 * Source: config.py lines 35-38
 *
 * @param annualRetention - Annual retention rate (0-1)
 * @returns Monthly retention rate (0-1)
 */
export function calculateMonthlyRetention(annualRetention: number): number {
  return Math.pow(annualRetention, 1 / 12);
}

/**
 * Convert SimulationParameters to a plain object (matches Python to_dict).
 *
 * Source: config.py lines 39-59
 *
 * @param params - Simulation parameters
 * @returns Plain object with all parameters including calculated monthlyRetentionBase
 */
export function simulationParamsToDict(params: SimulationParameters): Record<string, number> {
  return {
    currentPolicies: params.currentPolicies,
    currentStaffFte: params.currentStaffFte,
    baselineLeadSpend: params.baselineLeadSpend,
    leadCostPerLead: params.leadCostPerLead,
    contactRate: params.contactRate,
    quoteRate: params.quoteRate,
    bindRate: params.bindRate,
    avgPremiumAnnual: params.avgPremiumAnnual,
    commissionRate: params.commissionRate,
    annualRetentionBase: params.annualRetentionBase,
    monthlyRetentionBase: calculateMonthlyRetention(params.annualRetentionBase),
    staffMonthlyCostPerFte: params.staffMonthlyCostPerFte,
    maxLeadsPerFtePerMonth: params.maxLeadsPerFtePerMonth,
    efficiencyPenaltyRate: params.efficiencyPenaltyRate,
    conciergeRetentionBoost: params.conciergeRetentionBoost,
    newsletterRetentionBoost: params.newsletterRetentionBoost,
    conciergeMonthlyCost: params.conciergeMonthlyCost,
    newsletterMonthlyCost: params.newsletterMonthlyCost,
  };
}

/**
 * Create SimulationParameters from a plain object (matches Python from_dict).
 * Removes calculated field (monthlyRetentionBase) if present.
 *
 * Source: config.py lines 61-65
 *
 * @param data - Plain object with parameter values
 * @returns SimulationParameters object
 */
export function simulationParamsFromDict(data: Record<string, number>): SimulationParameters {
  // Remove calculated field if present (matches Python behavior)
  const { monthlyRetentionBase: _ignored, ...params } = data;

  return {
    currentPolicies: params.currentPolicies ?? DEFAULT_SIMULATION_PARAMETERS.currentPolicies,
    currentStaffFte: params.currentStaffFte ?? DEFAULT_SIMULATION_PARAMETERS.currentStaffFte,
    baselineLeadSpend: params.baselineLeadSpend ?? DEFAULT_SIMULATION_PARAMETERS.baselineLeadSpend,
    leadCostPerLead: params.leadCostPerLead ?? DEFAULT_SIMULATION_PARAMETERS.leadCostPerLead,
    contactRate: params.contactRate ?? DEFAULT_SIMULATION_PARAMETERS.contactRate,
    quoteRate: params.quoteRate ?? DEFAULT_SIMULATION_PARAMETERS.quoteRate,
    bindRate: params.bindRate ?? DEFAULT_SIMULATION_PARAMETERS.bindRate,
    avgPremiumAnnual: params.avgPremiumAnnual ?? DEFAULT_SIMULATION_PARAMETERS.avgPremiumAnnual,
    commissionRate: params.commissionRate ?? DEFAULT_SIMULATION_PARAMETERS.commissionRate,
    annualRetentionBase: params.annualRetentionBase ?? DEFAULT_SIMULATION_PARAMETERS.annualRetentionBase,
    staffMonthlyCostPerFte: params.staffMonthlyCostPerFte ?? DEFAULT_SIMULATION_PARAMETERS.staffMonthlyCostPerFte,
    maxLeadsPerFtePerMonth: params.maxLeadsPerFtePerMonth ?? DEFAULT_SIMULATION_PARAMETERS.maxLeadsPerFtePerMonth,
    efficiencyPenaltyRate: params.efficiencyPenaltyRate ?? DEFAULT_SIMULATION_PARAMETERS.efficiencyPenaltyRate,
    conciergeRetentionBoost: params.conciergeRetentionBoost ?? DEFAULT_SIMULATION_PARAMETERS.conciergeRetentionBoost,
    newsletterRetentionBoost: params.newsletterRetentionBoost ?? DEFAULT_SIMULATION_PARAMETERS.newsletterRetentionBoost,
    conciergeMonthlyCost: params.conciergeMonthlyCost ?? DEFAULT_SIMULATION_PARAMETERS.conciergeMonthlyCost,
    newsletterMonthlyCost: params.newsletterMonthlyCost ?? DEFAULT_SIMULATION_PARAMETERS.newsletterMonthlyCost,
  };
}

// =============================================================================
// PRESET CONFIGURATIONS
// Source: config.py lines 75-151 (_load_presets method)
// =============================================================================

/**
 * Preset type identifier.
 *
 * Source: config.py lines 77-151
 */
export type PresetName = 'conservative' | 'moderate' | 'aggressive' | 'derrick_actual';

/**
 * Conservative preset - 25th percentile assumptions.
 *
 * Source: config.py lines 78-95
 */
export const PRESET_CONSERVATIVE: SimulationParameters = {
  currentPolicies: 500,              // Line 79
  currentStaffFte: 2.0,              // Line 80
  baselineLeadSpend: 1000,           // Line 81
  leadCostPerLead: 30,               // Line 82
  contactRate: 0.65,                 // Line 83
  quoteRate: 0.55,                   // Line 84
  bindRate: 0.45,                    // Line 85
  avgPremiumAnnual: 1400,            // Line 86
  commissionRate: 0.10,              // Line 87
  annualRetentionBase: 0.82,         // Line 88
  staffMonthlyCostPerFte: 4500,      // Line 89
  maxLeadsPerFtePerMonth: 120,       // Line 90
  efficiencyPenaltyRate: 0.05,       // (inherited from default)
  conciergeRetentionBoost: 0.02,     // Line 91
  newsletterRetentionBoost: 0.01,    // Line 92
  conciergeMonthlyCost: 600,         // Line 93
  newsletterMonthlyCost: 250,        // Line 94
} as const;

/**
 * Moderate preset - 50th percentile (median) assumptions.
 *
 * Source: config.py lines 96-113
 */
export const PRESET_MODERATE: SimulationParameters = {
  currentPolicies: 500,              // Line 97
  currentStaffFte: 2.0,              // Line 98
  baselineLeadSpend: 1000,           // Line 99
  leadCostPerLead: 25,               // Line 100
  contactRate: 0.70,                 // Line 101
  quoteRate: 0.60,                   // Line 102
  bindRate: 0.50,                    // Line 103
  avgPremiumAnnual: 1500,            // Line 104
  commissionRate: 0.12,              // Line 105
  annualRetentionBase: 0.85,         // Line 106
  staffMonthlyCostPerFte: 5000,      // Line 107
  maxLeadsPerFtePerMonth: 150,       // Line 108
  efficiencyPenaltyRate: 0.05,       // (inherited from default)
  conciergeRetentionBoost: 0.03,     // Line 109
  newsletterRetentionBoost: 0.02,    // Line 110
  conciergeMonthlyCost: 500,         // Line 111
  newsletterMonthlyCost: 200,        // Line 112
} as const;

/**
 * Aggressive preset - 75th percentile assumptions.
 *
 * Source: config.py lines 114-131
 */
export const PRESET_AGGRESSIVE: SimulationParameters = {
  currentPolicies: 500,              // Line 115
  currentStaffFte: 2.0,              // Line 116
  baselineLeadSpend: 1000,           // Line 117
  leadCostPerLead: 20,               // Line 118
  contactRate: 0.75,                 // Line 119
  quoteRate: 0.65,                   // Line 120
  bindRate: 0.55,                    // Line 121
  avgPremiumAnnual: 1600,            // Line 122
  commissionRate: 0.14,              // Line 123
  annualRetentionBase: 0.88,         // Line 124
  staffMonthlyCostPerFte: 5500,      // Line 125
  maxLeadsPerFtePerMonth: 180,       // Line 126
  efficiencyPenaltyRate: 0.05,       // (inherited from default)
  conciergeRetentionBoost: 0.04,     // Line 127
  newsletterRetentionBoost: 0.03,    // Line 128
  conciergeMonthlyCost: 400,         // Line 129
  newsletterMonthlyCost: 150,        // Line 130
} as const;

/**
 * Derrick's actual numbers from All Purpose Audit (Nov 14, 2025).
 * V6.1: Updated with verified audit data.
 *
 * Source: config.py lines 132-150
 */
export const PRESET_DERRICK_ACTUAL: SimulationParameters = {
  // V6.1: Updated with Derrick's actual numbers from All Purpose Audit (Nov 14, 2025)
  currentPolicies: 1424,             // Line 134: Total policies in force
  currentStaffFte: 2.0,              // Line 135: Derrick + 1 staff
  baselineLeadSpend: 0,              // Line 136: Currently all organic
  leadCostPerLead: 55,               // Line 137: Live transfer cost
  contactRate: 0.75,                 // Line 138: Live transfers = pre-screened
  quoteRate: 0.65,                   // Line 139: Higher intent leads
  bindRate: 0.50,                    // Line 140: Standard bind rate
  avgPremiumAnnual: 2963,            // Line 141: From audit: $4,218,886 / 1,424 policies
  commissionRate: 0.10,              // Line 142: 10% blended effective rate
  annualRetentionBase: 0.8964,       // Line 143: ACTUAL from audit (89.64%)
  staffMonthlyCostPerFte: 5000,      // Line 144: Estimated
  maxLeadsPerFtePerMonth: 150,       // Line 145: Benchmark
  efficiencyPenaltyRate: 0.05,       // (inherited from default)
  conciergeRetentionBoost: 0.02,     // Line 146
  newsletterRetentionBoost: 0.015,   // Line 147
  conciergeMonthlyCost: 500,         // Line 148
  newsletterMonthlyCost: 200,        // Line 149
} as const;

/**
 * All available presets indexed by name.
 *
 * Source: config.py lines 75-151
 */
export const PRESETS: Record<PresetName, SimulationParameters> = {
  conservative: PRESET_CONSERVATIVE,
  moderate: PRESET_MODERATE,
  aggressive: PRESET_AGGRESSIVE,
  derrick_actual: PRESET_DERRICK_ACTUAL,
} as const;

/**
 * List of available preset names.
 *
 * Source: config.py lines 183-185 (list_presets method)
 */
export const PRESET_NAMES: PresetName[] = ['conservative', 'moderate', 'aggressive', 'derrick_actual'];

/**
 * Get a preset by name with fallback to moderate.
 *
 * Source: config.py lines 179-181 (get_preset method)
 *
 * @param name - Preset name
 * @returns SimulationParameters for the preset
 */
export function getPreset(name: string): SimulationParameters {
  return PRESETS[name as PresetName] ?? PRESET_MODERATE;
}

// =============================================================================
// TEST SCENARIOS
// Source: config.py lines 260-300 (generate_test_scenarios function)
// =============================================================================

/**
 * Test scenario configuration for simulation validation.
 *
 * Source: config.py lines 263-268
 */
export interface TestScenario {
  /** Human-readable description of the scenario */
  description: string;

  /** Additional monthly lead spend in dollars */
  additionalLeadSpend: number;

  /** Additional staff FTE to hire */
  additionalStaff: number;

  /** Whether to enable concierge service */
  hasConcierge: boolean;

  /** Whether to enable newsletter system */
  hasNewsletter: boolean;
}

/**
 * Standard test scenarios for simulation comparison.
 *
 * Source: config.py lines 260-300
 */
export const TEST_SCENARIOS: Record<string, TestScenario> = {
  /**
   * Baseline scenario - current state, no changes.
   * Source: config.py lines 264-270
   */
  baseline: {
    description: 'Current state - no changes',              // Line 265
    additionalLeadSpend: 0,                                  // Line 266
    additionalStaff: 0,                                      // Line 267
    hasConcierge: false,                                     // Line 268
    hasNewsletter: false,                                    // Line 269
  },

  /**
   * More leads only - double lead spend without extra staff.
   * Source: config.py lines 271-277
   */
  more_leads_only: {
    description: 'Double lead spend, no extra staff',        // Line 272
    additionalLeadSpend: 1000,                               // Line 273
    additionalStaff: 0,                                      // Line 274
    hasConcierge: false,                                     // Line 275
    hasNewsletter: false,                                    // Line 276
  },

  /**
   * Balanced growth - moderate lead increase with staff.
   * Source: config.py lines 278-284
   */
  balanced_growth: {
    description: 'Moderate lead increase with staff',        // Line 279
    additionalLeadSpend: 2000,                               // Line 280
    additionalStaff: 1.0,                                    // Line 281
    hasConcierge: false,                                     // Line 282
    hasNewsletter: false,                                    // Line 283
  },

  /**
   * Systems focus - add client retention systems with minimal lead increase.
   * Source: config.py lines 285-291
   */
  systems_focus: {
    description: 'Add client systems, minimal lead increase', // Line 286
    additionalLeadSpend: 500,                                 // Line 287
    additionalStaff: 0.5,                                     // Line 288
    hasConcierge: true,                                       // Line 289
    hasNewsletter: true,                                      // Line 290
  },

  /**
   * Aggressive growth - maximum growth with all systems enabled.
   * Source: config.py lines 292-298
   */
  aggressive_growth: {
    description: 'Maximum growth with all systems',          // Line 293
    additionalLeadSpend: 5000,                               // Line 294
    additionalStaff: 2.0,                                    // Line 295
    hasConcierge: true,                                      // Line 296
    hasNewsletter: true,                                     // Line 297
  },
} as const;

/**
 * Get all test scenario names.
 *
 * @returns Array of test scenario names
 */
export function getTestScenarioNames(): string[] {
  return Object.keys(TEST_SCENARIOS);
}

/**
 * Get a test scenario by name.
 *
 * @param name - Scenario name
 * @returns TestScenario or undefined if not found
 */
export function getTestScenario(name: string): TestScenario | undefined {
  return TEST_SCENARIOS[name];
}

// =============================================================================
// PARAMETER DESCRIPTIONS
// Source: config.py lines 197-216 (export_to_excel descriptions)
// =============================================================================

/**
 * Human-readable descriptions for each parameter.
 * Useful for UI labels, tooltips, and documentation generation.
 *
 * Source: config.py lines 197-216
 */
export const PARAMETER_DESCRIPTIONS: Record<string, string> = {
  currentPolicies: 'Current active policies',                           // Line 198
  currentStaffFte: 'Current full-time equivalent staff',                // Line 199
  baselineLeadSpend: 'Current monthly lead spend ($)',                  // Line 200
  leadCostPerLead: 'Average cost per lead ($)',                         // Line 201
  contactRate: 'Percentage of leads contacted',                         // Line 202
  quoteRate: 'Percentage of contacted that get quoted',                 // Line 203
  bindRate: 'Percentage of quoted that bind',                           // Line 204
  avgPremiumAnnual: 'Average annual premium per policy ($)',            // Line 205
  commissionRate: 'Commission rate on premiums',                        // Line 206
  annualRetentionBase: 'Annual retention rate',                         // Line 207
  monthlyRetentionBase: 'Monthly retention rate (calculated)',          // Line 208
  staffMonthlyCostPerFte: 'Monthly cost per staff member ($)',          // Line 209
  maxLeadsPerFtePerMonth: 'Maximum leads per FTE before efficiency drops', // Line 210
  efficiencyPenaltyRate: 'Efficiency penalty per 10 leads over capacity', // Line 211
  conciergeRetentionBoost: 'Retention improvement from concierge',      // Line 212
  newsletterRetentionBoost: 'Retention improvement from newsletter',    // Line 213
  conciergeMonthlyCost: 'Monthly cost of concierge system ($)',         // Line 214
  newsletterMonthlyCost: 'Monthly cost of newsletter system ($)',       // Line 215
} as const;

// =============================================================================
// CONFIG MANAGER CLASS
// Source: config.py lines 68-258 (ConfigManager class)
// =============================================================================

/**
 * Configuration manager for simulation parameters and presets.
 * Manages localStorage persistence in the browser environment.
 *
 * Source: config.py lines 68-258
 */
export class ConfigManager {
  private configKey: string;

  /**
   * Create a new ConfigManager.
   *
   * Source: config.py lines 71-73
   *
   * @param configKey - localStorage key for persisting configurations
   */
  constructor(configKey: string = 'bealer_simulation_params') {
    this.configKey = configKey;
  }

  /**
   * Save parameters to localStorage.
   *
   * Source: config.py lines 153-164 (save_params method)
   *
   * @param params - Parameters to save
   * @param name - Configuration name (default: 'custom')
   */
  saveParams(params: SimulationParameters, name: string = 'custom'): void {
    if (typeof window === 'undefined') return; // SSR guard

    try {
      const stored = localStorage.getItem(this.configKey);
      const configs: Record<string, Record<string, number>> = stored ? JSON.parse(stored) : {};
      configs[name] = simulationParamsToDict(params);
      localStorage.setItem(this.configKey, JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save simulation parameters:', error);
    }
  }

  /**
   * Load parameters from localStorage.
   *
   * Source: config.py lines 166-177 (load_params method)
   *
   * @param name - Configuration name to load (default: 'custom')
   * @returns SimulationParameters (falls back to moderate preset if not found)
   */
  loadParams(name: string = 'custom'): SimulationParameters {
    if (typeof window === 'undefined') return PRESET_MODERATE; // SSR guard

    try {
      const stored = localStorage.getItem(this.configKey);
      if (!stored) return PRESET_MODERATE;

      const configs: Record<string, Record<string, number>> = JSON.parse(stored);
      if (name in configs) {
        return simulationParamsFromDict(configs[name]);
      }

      // Try to get preset by name
      return getPreset(name);
    } catch (error) {
      console.error('Failed to load simulation parameters:', error);
      return PRESET_MODERATE;
    }
  }

  /**
   * Get a preset configuration by name.
   *
   * Source: config.py lines 179-181 (get_preset method)
   *
   * @param name - Preset name
   * @returns SimulationParameters for the preset
   */
  getPreset(name: string): SimulationParameters {
    return getPreset(name);
  }

  /**
   * List available presets.
   *
   * Source: config.py lines 183-185 (list_presets method)
   *
   * @returns Array of preset names
   */
  listPresets(): PresetName[] {
    return [...PRESET_NAMES];
  }

  /**
   * List saved custom configurations.
   *
   * @returns Array of saved configuration names
   */
  listSavedConfigs(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(this.configKey);
      if (!stored) return [];
      const configs: Record<string, unknown> = JSON.parse(stored);
      return Object.keys(configs);
    } catch (error) {
      console.error('Failed to list saved configurations:', error);
      return [];
    }
  }

  /**
   * Delete a saved configuration.
   *
   * @param name - Configuration name to delete
   * @returns true if deleted, false otherwise
   */
  deleteConfig(name: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem(this.configKey);
      if (!stored) return false;

      const configs: Record<string, unknown> = JSON.parse(stored);
      if (!(name in configs)) return false;

      delete configs[name];
      localStorage.setItem(this.configKey, JSON.stringify(configs));
      return true;
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      return false;
    }
  }

  /**
   * Clear all saved configurations.
   */
  clearAll(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.configKey);
    } catch (error) {
      console.error('Failed to clear configurations:', error);
    }
  }
}

// =============================================================================
// EXPORT AGGREGATES
// =============================================================================

/**
 * All Bealer simulation configuration exports bundled together.
 */
export const BEALER_CONFIG = {
  // Interfaces and types are exported at module level

  // Default parameters
  DEFAULT_SIMULATION_PARAMETERS,

  // Presets
  PRESETS,
  PRESET_NAMES,
  PRESET_CONSERVATIVE,
  PRESET_MODERATE,
  PRESET_AGGRESSIVE,
  PRESET_DERRICK_ACTUAL,

  // Test scenarios
  TEST_SCENARIOS,

  // Parameter metadata
  PARAMETER_DESCRIPTIONS,

  // Utility functions
  calculateMonthlyRetention,
  simulationParamsToDict,
  simulationParamsFromDict,
  getPreset,
  getTestScenarioNames,
  getTestScenario,

  // ConfigManager class
  ConfigManager,
} as const;

export default BEALER_CONFIG;
