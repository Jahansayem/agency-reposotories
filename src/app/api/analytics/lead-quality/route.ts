/**
 * Lead Quality Scoring API
 *
 * POST /api/analytics/lead-quality
 * Score leads based on likelihood of becoming high-value customers
 *
 * Uses the lead-scoring model to:
 * - Score individual leads (0-100)
 * - Predict customer segment (elite, premium, standard, low_value)
 * - Calculate expected LTV and recommended CAC
 * - Analyze vendor performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import {
  scoreLead,
  scoreLeadsBatch,
  groupLeadsBySegment,
  calculateExpectedValue,
  getHighValueLeads,
  calculatePortfolioSummary,
  analyzeVendorPerformance,
  optimizeBudgetAllocation,
  calculateBlendedMetrics,
  type LeadData,
  type LeadScore,
  type LeadOutcome,
  type VendorPerformance,
  type BudgetAllocation,
  type BlendedMetrics,
} from '@/lib/analytics';

export interface LeadQualityRequest {
  /** Single lead to score */
  lead?: LeadData;

  /** Batch of leads to score */
  leads?: LeadData[];

  /** Vendor analysis data */
  vendorAnalysis?: {
    vendorName: string;
    totalSpend: number;
    leadOutcomes: LeadOutcome[];
  }[];

  /** Budget optimization request */
  budgetOptimization?: {
    currentBudget: number;
    vendorPerformances: VendorPerformance[];
  };

  /** Analysis options */
  options?: {
    includeFactorBreakdown?: boolean;
    sortBy?: 'score' | 'ltv' | 'conversion';
    minScore?: number;
    limit?: number;
  };
}

export interface LeadQualityResponse {
  success: boolean;

  /** Single lead result */
  leadScore?: LeadScore & { expectedValue?: number };

  /** Batch results */
  batchResults?: {
    scores: LeadScore[];
    summary: {
      total: number;
      bySegment: Record<string, number>;
      avgScore: number;
      avgLtv: number;
      highValueCount: number;
    };
  };

  /** Vendor analysis results */
  vendorAnalysis?: {
    performances: VendorPerformance[];
    blendedMetrics: BlendedMetrics;
    recommendations: string[];
  };

  /** Budget allocation recommendations */
  budgetRecommendations?: BudgetAllocation[];
}

export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext): Promise<NextResponse<LeadQualityResponse | { error: string }>> => {
  try {
    const body: LeadQualityRequest = await request.json();
    const {
      lead,
      leads,
      vendorAnalysis,
      budgetOptimization,
      options = {},
    } = body;

    const {
      includeFactorBreakdown = true,
      sortBy = 'score',
      minScore = 0,
      limit = 1000,
    } = options;

    const response: LeadQualityResponse = { success: true };

    // Score single lead
    if (lead) {
      const score = scoreLead(lead);
      const expectedValue = calculateExpectedValue(score);

      response.leadScore = {
        ...score,
        expectedValue,
      };
    }

    // Score batch of leads
    if (leads && leads.length > 0) {
      let scores = scoreLeadsBatch(leads);

      // Filter by minimum score
      if (minScore > 0) {
        scores = scores.filter(s => s.score >= minScore);
      }

      // Sort results
      scores = sortScores(scores, sortBy);

      // Apply limit
      if (limit > 0 && scores.length > limit) {
        scores = scores.slice(0, limit);
      }

      // Calculate summary
      const bySegment = groupLeadsBySegment(scores);
      const portfolioSummary = calculatePortfolioSummary(scores);

      // Calculate average LTV from total
      const avgLtv = scores.length > 0
        ? portfolioSummary.totalPredictedLtv / scores.length
        : 0;

      // Get elite and premium counts from segment distribution
      const eliteCount = portfolioSummary.segmentDistribution.elite?.count || 0;
      const premiumCount = portfolioSummary.segmentDistribution.premium?.count || 0;

      response.batchResults = {
        scores: includeFactorBreakdown ? scores : scores.map(s => ({
          ...s,
          keyFactors: {}, // Remove detailed factors if not requested
        })),
        summary: {
          total: scores.length,
          bySegment: Object.fromEntries(
            Object.entries(bySegment).map(([k, v]) => [k, v.length])
          ),
          avgScore: portfolioSummary.avgScore,
          avgLtv,
          highValueCount: eliteCount + premiumCount,
        },
      };
    }

    // Analyze vendor performance
    if (vendorAnalysis && vendorAnalysis.length > 0) {
      const performances = vendorAnalysis.map(v =>
        analyzeVendorPerformance(v.vendorName, v.totalSpend, v.leadOutcomes)
      );

      // Calculate blended metrics
      const allOutcomes = vendorAnalysis.flatMap(v => v.leadOutcomes);
      const totalSpend = vendorAnalysis.reduce((sum, v) => sum + v.totalSpend, 0);

      const blendedMetrics = calculateBlendedMetrics(performances);

      // Generate recommendations
      const recommendations = generateVendorRecommendations(performances);

      response.vendorAnalysis = {
        performances,
        blendedMetrics,
        recommendations,
      };
    }

    // Optimize budget allocation
    if (budgetOptimization) {
      const allocations = optimizeBudgetAllocation(
        budgetOptimization.currentBudget,
        budgetOptimization.vendorPerformances
      );

      response.budgetRecommendations = allocations;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Lead quality scoring error:', error);
    return NextResponse.json(
      { error: 'Failed to score leads' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/analytics/lead-quality
 * Get scoring factors and benchmarks
 */
export const GET = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext): Promise<NextResponse> => {
  return NextResponse.json({
    scoringFactors: {
      product_intent: {
        weight: 0.25,
        description: 'Products the lead is shopping for',
        highScoreExample: 'auto,home,umbrella (95 pts)',
        lowScoreExample: 'renters only (35 pts)',
      },
      bundle_potential: {
        weight: 0.20,
        description: 'Likelihood of purchasing multiple products',
        highScoreExample: '3+ products (90 pts)',
        lowScoreExample: '1 product (40 pts)',
      },
      premium_range: {
        weight: 0.15,
        description: 'Expected premium tier',
        highScoreExample: '$3,000+ annual (95 pts)',
        lowScoreExample: '<$500 annual (30 pts)',
      },
      demographics: {
        weight: 0.15,
        description: 'Age, homeowner status, location',
        highScoreExample: '35-54 homeowner (90 pts)',
        lowScoreExample: '18-24 renter (45 pts)',
      },
      engagement: {
        weight: 0.10,
        description: 'Lead engagement level',
        highScoreExample: 'High engagement (90 pts)',
        lowScoreExample: 'Low engagement (50 pts)',
      },
      credit_tier: {
        weight: 0.10,
        description: 'Credit quality indicator',
        highScoreExample: 'Excellent credit (95 pts)',
        lowScoreExample: 'Poor credit (40 pts)',
      },
      source_quality: {
        weight: 0.05,
        description: 'Historical conversion rate of lead source',
        highScoreExample: 'Referral (95 pts)',
        lowScoreExample: 'TikTok (35 pts)',
      },
    },
    segments: {
      elite: { scoreRange: '90-100', avgLtv: '$18,000', cac: '$1,200' },
      premium: { scoreRange: '70-89', avgLtv: '$9,000', cac: '$700' },
      standard: { scoreRange: '50-69', avgLtv: '$4,500', cac: '$400' },
      low_value: { scoreRange: '<50', avgLtv: '$1,800', cac: '$200' },
    },
    vendorBenchmarks: {
      excellent: 'LTV:CAC ratio ≥10x',
      good: 'LTV:CAC ratio 6-10x',
      fair: 'LTV:CAC ratio 3-6x',
      poor: 'LTV:CAC ratio 2-3x',
      underperforming: 'LTV:CAC ratio <2x',
    },
  });
});

// Helper functions

function sortScores(scores: LeadScore[], sortBy: string): LeadScore[] {
  return scores.sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score;
      case 'ltv':
        return b.predictedLtv - a.predictedLtv;
      case 'conversion':
        return b.conversionProbability - a.conversionProbability;
      default:
        return 0;
    }
  });
}

function generateVendorRecommendations(performances: VendorPerformance[]): string[] {
  const recommendations: string[] = [];

  // Sort by rating
  const excellent = performances.filter(p => p.rating === 'EXCELLENT');
  const underperforming = performances.filter(p => p.rating === 'UNDERPERFORMING');

  if (excellent.length > 0) {
    recommendations.push(
      `Increase budget for top performers: ${excellent.map(p => p.vendorName).join(', ')}`
    );
  }

  if (underperforming.length > 0) {
    recommendations.push(
      `Consider eliminating: ${underperforming.map(p => p.vendorName).join(', ')}`
    );
  }

  // Check for overall portfolio health
  if (performances.length === 0) {
    return recommendations;
  }
  const avgLtvCac = performances.reduce((sum, p) => sum + p.ltvCacRatio, 0) / performances.length;
  if (avgLtvCac < 5) {
    recommendations.push('Overall lead quality below target - review acquisition strategy');
  } else if (avgLtvCac > 10) {
    recommendations.push('Strong lead quality - consider increasing marketing spend');
  }

  return recommendations;
}
