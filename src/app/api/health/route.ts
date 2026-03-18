/**
 * Health Check Endpoint
 *
 * Returns application health status, including database connectivity and required table existence.
 *
 * Used by:
 * - Load balancers / orchestrators to determine if the instance is ready to serve traffic
 * - Monitoring systems to detect deployment issues
 * - Operations teams to verify migrations were applied
 *
 * Returns:
 * - 200 OK if all health checks pass
 * - 503 Service Unavailable if critical checks fail (e.g., missing migrations)
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth, shouldEnforceHealthCheck } from '@/lib/healthCheck';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const healthResult = await checkDatabaseHealth();

    // If health check fails and we're enforcing checks (production or dev without skip flag)
    if (!healthResult.healthy && shouldEnforceHealthCheck()) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          message: healthResult.error,
          missingTables: healthResult.missingTables,
          timestamp: new Date().toISOString(),
        },
        { status: 503 } // Service Unavailable
      );
    }

    // If health check fails but we're skipping enforcement (dev with SKIP_MIGRATION_CHECK=true)
    if (!healthResult.healthy && !shouldEnforceHealthCheck()) {
      return NextResponse.json(
        {
          status: 'degraded',
          message: 'Health check failed but enforcement is disabled (SKIP_MIGRATION_CHECK=true)',
          missingTables: healthResult.missingTables,
          warning: healthResult.error,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // All checks passed
    return NextResponse.json(
      {
        status: 'healthy',
        message: 'All health checks passed',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed with exception',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
