/**
 * Optimal Contact Timing API
 *
 * POST /api/analytics/optimal-times
 * Calculate best times to contact customers for cross-sell opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import {
  getTimingMultiplier,
  isInOptimalTimingWindow,
  TIMING_CONVERSION_RATES,
  PRODUCT_CONVERSION_RATES,
  RETENTION_BY_PRODUCT_COUNT,
} from '@/lib/analytics';

export interface OptimalTimingRequest {
  /** Single customer analysis */
  customer?: {
    customerId: string;
    currentProducts: string[];
    daysSinceLastPurchase: number;
    annualPremium: number;
    tenureYears: number;
  };

  /** Batch analysis */
  customers?: Array<{
    customerId: string;
    currentProducts: string[];
    daysSinceLastPurchase: number;
    annualPremium: number;
    tenureYears: number;
  }>;
}

interface CustomerAnalysisResult {
  customerId: string;
  timing: {
    daysSinceLastPurchase: number;
    isInOptimalWindow: boolean;
    timingMultiplier: number;
    recommendation: string;
  };
  nextProduct: {
    product: string;
    reasoning: string;
    estimatedPremiumAdd: number;
  };
  retentionInfo: {
    currentProductCount: number;
    currentRetentionRate: number;
    potentialRetentionRate: number;
    retentionLift: number;
  };
}

export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body: OptimalTimingRequest = await request.json();
    const { customer, customers } = body;

    // Single customer analysis
    if (customer && !customers) {
      const result = analyzeCustomer(customer);
      return NextResponse.json({
        success: true,
        analysis: result,
      });
    }

    // Batch analysis
    if (customers && customers.length > 0) {
      const results = customers.map(c => analyzeCustomer(c));

      // Sort by timing multiplier (best opportunities first)
      results.sort((a, b) => b.timing.timingMultiplier - a.timing.timingMultiplier);

      const summary = {
        totalCustomers: results.length,
        inOptimalWindow: results.filter(r => r.timing.isInOptimalWindow).length,
        avgTimingMultiplier: results.reduce((sum, r) => sum + r.timing.timingMultiplier, 0) / results.length,
        totalPotentialPremium: results.reduce((sum, r) => sum + r.nextProduct.estimatedPremiumAdd, 0),
      };

      return NextResponse.json({
        success: true,
        analysis: results,
        summary,
      });
    }

    return NextResponse.json(
      { error: 'Either customer or customers array is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Optimal timing error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze optimal timing' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/analytics/optimal-times
 * Get timing windows and conversion rates for reference
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  return NextResponse.json({
    timingConversionRates: TIMING_CONVERSION_RATES,
    productConversionRates: PRODUCT_CONVERSION_RATES,
    retentionByProductCount: RETENTION_BY_PRODUCT_COUNT,
    optimalWindow: {
      description: '30-90 days after last purchase',
      peakConversion: '45-60 days',
      multiplierAt30Days: getTimingMultiplier(30),
      multiplierAt60Days: getTimingMultiplier(60),
      multiplierAt90Days: getTimingMultiplier(90),
      multiplierAt180Days: getTimingMultiplier(180),
    },
    bestPractices: [
      'Contact within 60 days of policy purchase for highest conversion',
      'Bundle offers (auto+home) have 30% higher conversion than single product',
      'Each additional product increases retention by 15-25%',
      'Renewal time is second-best window for cross-sell',
    ],
  });
});

// Helper function to analyze a single customer
function analyzeCustomer(customer: {
  customerId: string;
  currentProducts: string[];
  daysSinceLastPurchase: number;
  annualPremium: number;
  tenureYears: number;
}): CustomerAnalysisResult {
  const { customerId, currentProducts, daysSinceLastPurchase, annualPremium } = customer;

  // Timing analysis
  const timingMultiplier = getTimingMultiplier(daysSinceLastPurchase);
  const isInWindow = isInOptimalTimingWindow(daysSinceLastPurchase);

  let recommendation = 'Contact now';
  if (daysSinceLastPurchase < 30) {
    recommendation = `Wait ${30 - daysSinceLastPurchase} days for optimal timing`;
  } else if (daysSinceLastPurchase > 90) {
    recommendation = 'Past optimal window - contact immediately or wait for renewal';
  } else {
    recommendation = 'In optimal window - contact now';
  }

  // Next product analysis
  const productCount = currentProducts.length;
  const hasAuto = currentProducts.some(p => p.toLowerCase().includes('auto'));
  const hasHome = currentProducts.some(p => p.toLowerCase().includes('home'));

  let nextProduct = 'umbrella';
  let reasoning = 'Standard recommendation for existing customers';
  let premiumMultiplier = 0.15;

  if (!hasAuto && hasHome) {
    nextProduct = 'auto';
    reasoning = 'Home customer without auto - high conversion potential (25%)';
    premiumMultiplier = 0.8;
  } else if (hasAuto && !hasHome) {
    nextProduct = 'home';
    reasoning = 'Auto customer without home - bundle opportunity (22%)';
    premiumMultiplier = 1.2;
  } else if (hasAuto && hasHome) {
    if (productCount < 3) {
      nextProduct = 'umbrella';
      reasoning = 'Bundle customer - umbrella is natural add-on (35%)';
      premiumMultiplier = 0.15;
    } else {
      nextProduct = 'life';
      reasoning = 'Multi-product customer - life insurance opportunity (20%)';
      premiumMultiplier = 0.4;
    }
  }

  // Retention analysis
  const currentRetention = RETENTION_BY_PRODUCT_COUNT[productCount] || 0.72;
  const potentialRetention = RETENTION_BY_PRODUCT_COUNT[productCount + 1] || currentRetention;
  const retentionLift = potentialRetention - currentRetention;

  return {
    customerId,
    timing: {
      daysSinceLastPurchase,
      isInOptimalWindow: isInWindow,
      timingMultiplier,
      recommendation,
    },
    nextProduct: {
      product: nextProduct,
      reasoning,
      estimatedPremiumAdd: annualPremium * premiumMultiplier,
    },
    retentionInfo: {
      currentProductCount: productCount,
      currentRetentionRate: currentRetention,
      potentialRetentionRate: potentialRetention,
      retentionLift,
    },
  };
}
