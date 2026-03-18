/**
 * Health Check Utility
 *
 * Verifies that required database tables exist before allowing the app to serve traffic.
 * This prevents fail-open auth vulnerabilities where missing migrations could bypass authentication.
 *
 * SECURITY: In production, missing tables should block all traffic until migrations are applied.
 * In development, this can be bypassed with SKIP_MIGRATION_CHECK=true for flexibility.
 */

import { createServiceRoleClient } from './supabaseClient';
import { logger } from './logger';

/**
 * Critical tables required for authentication and core functionality
 */
const REQUIRED_TABLES = [
  'user_sessions',  // Session management - auth depends on this
  'users',          // User accounts
  'agencies',       // Multi-tenancy
] as const;

interface HealthCheckResult {
  healthy: boolean;
  missingTables: string[];
  error?: string;
}

/**
 * Check if all required database tables exist
 *
 * Returns { healthy: true } if all tables exist
 * Returns { healthy: false, missingTables: [...] } if any are missing
 *
 * In production (NODE_ENV=production), this should block traffic until healthy.
 * In development, set SKIP_MIGRATION_CHECK=true to bypass for local dev.
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    const supabase = createServiceRoleClient();
    const missingTables: string[] = [];

    // Check each required table
    for (const table of REQUIRED_TABLES) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1)
        .maybeSingle();

      // Error code 42P01 = "relation does not exist" in PostgreSQL
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        missingTables.push(table);
        logger.error(`[HEALTH] Missing required table: ${table}`, { component: 'HealthCheck' });
      }
    }

    if (missingTables.length > 0) {
      return {
        healthy: false,
        missingTables,
        error: `Missing required tables: ${missingTables.join(', ')}. Run database migrations.`,
      };
    }

    return { healthy: true, missingTables: [] };
  } catch (error) {
    logger.error('[HEALTH] Database health check failed', error, { component: 'HealthCheck' });
    return {
      healthy: false,
      missingTables: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if health checks should be enforced based on environment
 *
 * In production: always enforce (return true)
 * In development: enforce unless SKIP_MIGRATION_CHECK=true
 */
export function shouldEnforceHealthCheck(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  // In dev, allow bypass if explicitly requested
  return process.env.SKIP_MIGRATION_CHECK !== 'true';
}
