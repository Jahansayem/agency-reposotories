import { NextRequest, NextResponse } from 'next/server';
import { generateSmartDefaults } from '@/lib/smartDefaults';
import { getCache, setCache, isRedisAvailable } from '@/lib/redis';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/suggest-defaults
 *
 * Generate smart default suggestions for task creation based on user patterns.
 * Uses Redis caching with 5-minute TTL to reduce database queries.
 *
 * Request body:
 * {
 *   "userName": "Derrick"
 * }
 *
 * Response:
 * {
 *   "assignedTo": "Sefra",
 *   "priority": "medium",
 *   "dueDate": "2026-02-05",
 *   "confidence": 0.75,
 *   "metadata": {
 *     "basedOnTasks": 45,
 *     "lookbackDays": 30,
 *     "patterns": {
 *       "assigneeFrequency": { "Sefra": 30, "Derrick": 15 },
 *       "priorityDistribution": { "medium": 25, "high": 15, "low": 5 },
 *       "avgDueDateDays": 3
 *     }
 *   },
 *   "cached": false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName } = body;

    if (!userName || typeof userName !== 'string') {
      return NextResponse.json(
        { error: 'userName is required and must be a string' },
        { status: 400 }
      );
    }

    logger.info('Generating smart defaults', {
      component: 'suggest-defaults-api',
      userName,
    });

    // Check Redis cache first
    const cacheKey = `smart-defaults:${userName}`;
    const cached = await getCache<any>(cacheKey);

    if (cached) {
      logger.info('Returning cached smart defaults', {
        component: 'suggest-defaults-api',
        userName,
        cached: true,
      });
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // Generate new suggestions
    const suggestions = await generateSmartDefaults(userName);

    logger.info('Generated smart defaults', {
      component: 'suggest-defaults-api',
      userName,
      confidence: suggestions.confidence,
      basedOnTasks: suggestions.metadata.basedOnTasks,
    });

    // Cache for 5 minutes (300 seconds)
    if (isRedisAvailable()) {
      await setCache(cacheKey, suggestions, 300);
    }

    return NextResponse.json({
      ...suggestions,
      cached: false,
    });
  } catch (error) {
    logger.error('Failed to generate smart defaults', error, {
      component: 'suggest-defaults-api',
    });

    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
