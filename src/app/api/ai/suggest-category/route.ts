import { NextRequest, NextResponse } from 'next/server';
import type { DashboardTaskCategory } from '@/types/todo';
import { withSessionAuth } from '@/lib/agencyAuth';

/**
 * Keyword patterns for each dashboard task category.
 * Categories are checked in priority order (most specific first).
 */
const CATEGORY_PATTERNS: Record<DashboardTaskCategory, string[]> = {
  quote: ['quote', 'new policy', 'lead', 'prospect', 'price', 'estimate', 'coverage options', 'proposal', 'new business'],
  renewal: ['renewal', 'renew', 'retention', 'expir', 'annual review', 'policy review', 'upcoming renewal'],
  claim: ['claim', 'accident', 'damage', 'loss', 'incident', 'adjuster', 'injury', 'collision', 'total loss'],
  service: ['change', 'update', 'add driver', 'remove', 'endorsement', 'question', 'call about', 'modify', 'policy change', 'address change'],
  'follow-up': ['follow up', 'follow-up', 'followup', 'callback', 'check in', 'touch base', 'reach out', 'contact', 'call back', 'return call'],
  prospecting: ['cold call', 'marketing', 'outreach', 'campaign', 'referral', 'network', 'new lead', 'door knock', 'canvass'],
  other: [], // Fallback category - no patterns needed
};

/**
 * Priority order for category matching.
 * More specific categories are checked first.
 */
const CATEGORY_PRIORITY: DashboardTaskCategory[] = [
  'quote',
  'renewal',
  'claim',
  'service',
  'follow-up',
  'prospecting',
  'other',
];

interface CategorySuggestion {
  category: DashboardTaskCategory;
  confidence: number;
  reasoning: string;
}

/**
 * Analyzes task text and suggests the most appropriate category.
 * Uses keyword matching with confidence scoring.
 */
function suggestCategory(text: string): CategorySuggestion {
  const lowerText = text.toLowerCase();

  let bestMatch: CategorySuggestion = {
    category: 'other',
    confidence: 0.3,
    reasoning: 'No specific category patterns matched. Defaulting to general task.',
  };

  let highestScore = 0;
  const matchedKeywords: string[] = [];

  // Check each category in priority order
  for (const category of CATEGORY_PRIORITY) {
    const patterns = CATEGORY_PATTERNS[category];
    if (patterns.length === 0) continue; // Skip 'other' category

    const matches: string[] = [];

    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        matches.push(pattern);
      }
    }

    if (matches.length > 0) {
      // Calculate confidence based on number of matching keywords
      // 1 match = 0.6, 2 matches = 0.75, 3+ matches = 0.9
      const score = matches.length;
      const confidence = Math.min(0.9, 0.45 + (score * 0.15));

      if (score > highestScore) {
        highestScore = score;
        matchedKeywords.length = 0;
        matchedKeywords.push(...matches);

        bestMatch = {
          category,
          confidence,
          reasoning: `Matched ${matches.length} keyword${matches.length > 1 ? 's' : ''}: "${matches.join('", "')}".`,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * POST /api/ai/suggest-category
 *
 * Suggests a dashboard task category based on task text analysis.
 * Uses keyword matching and pattern analysis (no external AI calls).
 *
 * Request body:
 * - text: string (required) - The task text to analyze
 *
 * Response:
 * - category: DashboardTaskCategory - The suggested category
 * - confidence: number - Confidence score (0-1)
 * - reasoning: string - Explanation for the suggestion
 */
async function handleSuggestCategory(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Missing required parameter: text' },
        { status: 400 }
      );
    }

    const text = body.text.trim();

    if (text.length === 0) {
      return NextResponse.json(
        { error: 'Text parameter cannot be empty' },
        { status: 400 }
      );
    }

    // Analyze text and suggest category
    const suggestion = suggestCategory(text);

    return NextResponse.json(suggestion);
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Handle other errors
    console.error('Category suggestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export wrapped handler with session auth
export const POST = withSessionAuth(async (request) => {
  return handleSuggestCategory(request);
});
