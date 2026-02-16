/**
 * Agency Simulation API
 *
 * POST /api/analytics/simulate
 * Project agency growth scenarios using the agency-simulator model
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import {
  simulateScenario,
  generateBenchmarkReport,
  createDefaultSimulationParameters,
  EnhancedAgencySimulator,
  type EnhancedSimulationParameters,
} from '@/lib/analytics';

export interface SimulateRequest {
  /** Simulation parameters - uses defaults if not provided */
  parameters?: Partial<EnhancedSimulationParameters>;

  /** Number of months to simulate (default: 12) */
  months?: number;

  /** Include benchmark comparison (default: true) */
  includeBenchmarks?: boolean;
}

export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body: SimulateRequest = await request.json();
    const {
      parameters: customParams,
      months = 12,
      includeBenchmarks = true,
    } = body;

    // Build simulation parameters
    const defaultParams = createDefaultSimulationParameters();
    const parameters: EnhancedSimulationParameters = customParams
      ? { ...defaultParams, ...customParams }
      : defaultParams;

    // Create simulator instance and run simulation
    const simulator = new EnhancedAgencySimulator(parameters);
    const results = simulator.simulateScenario(months);

    // Generate benchmark report if requested
    let benchmarks = null;
    if (includeBenchmarks && results.length > 0) {
      benchmarks = generateBenchmarkReport(parameters, results);
    }

    return NextResponse.json({
      success: true,
      results,
      monthCount: results.length,
      benchmarks,
      parameters,
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Failed to run simulation' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/analytics/simulate
 * Get default simulation parameters for reference
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  const defaultParams = createDefaultSimulationParameters();

  return NextResponse.json({
    defaultParameters: defaultParams,
    description: 'Agency growth simulation model',
    capabilities: [
      'Monthly financial projections',
      'Marketing mix optimization',
      'Staffing analysis',
      'Benchmark comparisons',
    ],
  });
});
