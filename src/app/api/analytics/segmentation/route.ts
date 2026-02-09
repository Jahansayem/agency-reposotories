/**
 * Customer Segmentation API
 *
 * POST /api/analytics/segmentation
 * Segment customers by lifetime value and recommend service tiers
 *
 * Uses the customer-segmentation model to:
 * - Classify customers into Elite/Premium/Standard/Low-Value segments
 * - Calculate individual customer LTV
 * - Analyze portfolio composition
 * - Recommend marketing budget allocation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import {
  classifyCustomer,
  calculateCustomerLtv,
  getCustomerClassification,
  analyzePortfolio,
  recommendMarketingAllocation,
  CUSTOMER_SEGMENTS,
  type CustomerSegmentName,
  type CustomerClassification,
  type PortfolioAnalysis,
  type MarketingAllocation,
} from '@/lib/analytics';

export interface CustomerData {
  customerId?: string;
  productCount: number;
  annualPremium: number;
  claimsHistory?: number[];
}

export interface SegmentationRequest {
  /** Single customer to classify */
  customer?: CustomerData;

  /** Batch of customers to analyze */
  customers?: CustomerData[];

  /** Marketing budget for allocation (optional) */
  marketingBudget?: number;

  /** Analysis options */
  options?: {
    includeRecommendations?: boolean;
    groupBySegment?: boolean;
  };
}

export interface SegmentationResponse {
  success: boolean;

  /** Single customer classification */
  customerClassification?: CustomerClassification & {
    customerId?: string;
    segmentDetails: typeof CUSTOMER_SEGMENTS[CustomerSegmentName];
  };

  /** Portfolio analysis */
  portfolioAnalysis?: PortfolioAnalysis;

  /** Marketing allocation */
  marketingAllocation?: MarketingAllocation;

  /** Grouped customers by segment */
  customersBySegment?: Record<CustomerSegmentName, Array<{
    customerId?: string;
    productCount: number;
    annualPremium: number;
    ltv: number;
    segment: CustomerSegmentName;
  }>>;
}

export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext): Promise<NextResponse<SegmentationResponse | { error: string }>> => {
  try {
    const body: SegmentationRequest = await request.json();
    const {
      customer,
      customers,
      marketingBudget,
      options = {},
    } = body;

    const {
      includeRecommendations = true,
      groupBySegment = false,
    } = options;

    const response: SegmentationResponse = { success: true };

    // Classify single customer
    if (customer) {
      const classification = getCustomerClassification(
        customer.productCount,
        customer.annualPremium,
        customer.claimsHistory
      );

      response.customerClassification = {
        ...classification,
        customerId: customer.customerId,
        segmentDetails: CUSTOMER_SEGMENTS[classification.segment],
      };
    }

    // Analyze customer portfolio
    if (customers && customers.length > 0) {
      response.portfolioAnalysis = analyzePortfolio(customers);

      // Group by segment if requested
      if (groupBySegment) {
        const grouped: SegmentationResponse['customersBySegment'] = {
          elite: [],
          premium: [],
          standard: [],
          low_value: [],
        };

        for (const cust of customers) {
          const segment = classifyCustomer(cust.productCount, cust.annualPremium);
          const ltv = calculateCustomerLtv(
            segment,
            cust.annualPremium,
            cust.productCount,
            cust.claimsHistory
          );

          grouped[segment].push({
            customerId: cust.customerId,
            productCount: cust.productCount,
            annualPremium: cust.annualPremium,
            ltv,
            segment,
          });
        }

        response.customersBySegment = grouped;
      }
    }

    // Calculate marketing allocation
    if (marketingBudget && marketingBudget > 0) {
      response.marketingAllocation = recommendMarketingAllocation(marketingBudget);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Segmentation error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze customer segments' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/analytics/segmentation
 * Get segment definitions and benchmarks
 */
export const GET = withAgencyAuth(async (_request: NextRequest, _ctx: AgencyAuthContext): Promise<NextResponse> => {
  return NextResponse.json({
    segments: CUSTOMER_SEGMENTS,
    segmentSummary: {
      elite: {
        name: 'Elite',
        requirements: '3+ products AND $3,000+ premium',
        characteristics: [
          'Average LTV: $18,000',
          'Retention rate: 97%',
          'Average products: 3.8',
          'Claims frequency: 12%',
          'Service tier: White Glove',
        ],
        strategy: 'Protect and nurture - proactive service, personalized communication',
      },
      premium: {
        name: 'Premium',
        requirements: '2+ products AND $2,000+ premium',
        characteristics: [
          'Average LTV: $9,000',
          'Retention rate: 91%',
          'Average products: 2.2',
          'Claims frequency: 18%',
          'Service tier: Standard',
        ],
        strategy: 'Grow through bundling - focus on adding third product',
      },
      standard: {
        name: 'Standard',
        requirements: '1+ product AND $800+ premium',
        characteristics: [
          'Average LTV: $4,500',
          'Retention rate: 72%',
          'Average products: 1.1',
          'Claims frequency: 22%',
          'Service tier: Standard',
        ],
        strategy: 'Upgrade opportunity - cross-sell to increase retention',
      },
      low_value: {
        name: 'Low-Value',
        requirements: 'Everything else',
        characteristics: [
          'Average LTV: $1,800',
          'Retention rate: 65%',
          'Average products: 1.0',
          'Claims frequency: 28%',
          'Service tier: Automated',
        ],
        strategy: 'Efficiency focus - automated service, minimal touch',
      },
    },
    keyInsight: 'Top 40% of customers (Elite + Premium) = 83% of profit',
    marketingBudgetGuidelines: {
      elite: '15% of budget targeting elite prospects',
      premium: '35% of budget for premium segment',
      standard: '40% of budget for standard (volume)',
      low_value: '10% maximum on low-value prospects',
    },
    cacBenchmarks: {
      elite: '$1,200 recommended CAC (15:1 LTV:CAC)',
      premium: '$700 recommended CAC (13:1 LTV:CAC)',
      standard: '$400 recommended CAC (11:1 LTV:CAC)',
      low_value: '$200 maximum CAC (9:1 LTV:CAC)',
    },
  });
});
