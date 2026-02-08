/**
 * Cash Flow Analysis API
 *
 * POST /api/analytics/cash-flow
 * Project cash flow using the cash-flow-model
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  CashFlowModel,
  DEFAULT_CASH_FLOW_CONFIG,
  type CashFlowModelConfig,
} from '@/lib/analytics';

export interface CashFlowRequest {
  /** Agency financial parameters */
  parameters: {
    monthlyPolicies: number;
    avgPremiumPerPolicy: number;
    commissionRate?: number;
    newPoliciesPerMonth?: number;
    renewalRate?: number;
    expenseRatio?: number;
  };

  /** Custom configuration (optional) */
  config?: Partial<CashFlowModelConfig>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CashFlowRequest = await request.json();
    const { parameters, config: customConfig } = body;

    // Validate required parameters
    if (!parameters?.monthlyPolicies || !parameters?.avgPremiumPerPolicy) {
      return NextResponse.json(
        { error: 'monthlyPolicies and avgPremiumPerPolicy are required' },
        { status: 400 }
      );
    }

    // Build configuration
    const config: CashFlowModelConfig = {
      ...DEFAULT_CASH_FLOW_CONFIG,
      ...customConfig,
    };

    // Create cash flow model instance
    const model = new CashFlowModel(config);

    // Calculate key metrics
    const {
      monthlyPolicies,
      avgPremiumPerPolicy,
      commissionRate = 0.07,
      newPoliciesPerMonth = 10,
      renewalRate = 0.85,
      expenseRatio = 0.25,
    } = parameters;

    const totalPremium = monthlyPolicies * avgPremiumPerPolicy;
    const monthlyCommissions = totalPremium * commissionRate;
    const monthlyExpenses = monthlyCommissions * expenseRatio;

    // Run 12-month projection
    const projection = model.projectCashFlow12Months(
      monthlyCommissions,
      newPoliciesPerMonth,
      renewalRate
    );

    // Calculate working capital needs
    // Note: calculateWorkingCapitalNeed takes monthly expenses and growth rate
    const workingCapital = model.calculateWorkingCapitalNeed(
      monthlyExpenses,
      0.05  // Default 5% monthly growth rate
    );

    // Calculate summary statistics
    const summary = {
      totalPremium,
      monthlyCommissions,
      monthlyExpenses,
      estimatedNetIncome: monthlyCommissions - monthlyExpenses,
      workingCapitalNeeded: workingCapital.totalWorkingCapitalNeed,
      recommendedCashReserve: workingCapital.totalWorkingCapitalNeed * 1.2, // 20% buffer
      commissionLagDays: config.commissionPaymentLagDays,
    };

    // Generate recommendations
    const recommendations: string[] = [];

    if (summary.estimatedNetIncome < 0) {
      recommendations.push('Revenue does not cover expenses - review cost structure');
    } else if (summary.estimatedNetIncome < 5000) {
      recommendations.push('Tight margins - focus on increasing premium or reducing costs');
    }

    if (workingCapital.totalWorkingCapitalNeed > monthlyCommissions * 2) {
      recommendations.push('Consider building cash reserves for commission lag');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cash flow metrics appear healthy');
    }

    return NextResponse.json({
      success: true,
      summary,
      projection,
      workingCapital,
      recommendations,
      config,
    });
  } catch (error) {
    console.error('Cash flow analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze cash flow' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/cash-flow
 * Get default configuration and analysis options
 */
export async function GET() {
  return NextResponse.json({
    defaultConfig: DEFAULT_CASH_FLOW_CONFIG,
    description: 'Cash flow projection and working capital analysis',
    requiredParameters: [
      'monthlyPolicies: Number of active policies',
      'avgPremiumPerPolicy: Average annual premium per policy',
    ],
    optionalParameters: [
      'commissionRate: Commission percentage (default: 0.07)',
      'newPoliciesPerMonth: New business volume (default: 10)',
      'renewalRate: Policy renewal rate (default: 0.85)',
      'expenseRatio: Operating expenses as % of commission (default: 0.25)',
    ],
    benchmarks: {
      healthyNetCashFlow: 'Positive each month',
      workingCapitalRatio: '1.5-2x monthly expenses',
      commissionLagTarget: '45-60 days',
      chargebackReserve: '3-5% of new business',
    },
  });
}
