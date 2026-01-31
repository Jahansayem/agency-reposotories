/**
 * Enhanced Supabase Client with RLS Support
 *
 * Creates Supabase clients with proper user context for Row-Level Security.
 *
 * Key design decisions:
 * - When env vars are missing (e.g. at build time), a dummy client is returned
 *   that throws descriptive errors on any method call instead of silently making
 *   HTTP requests to an invalid URL.
 * - RLS context setup is done via an async helper (`createSupabaseClientWithRLS`)
 *   to ensure the context is set before queries execute.
 * - The service role client validates both URL and key before creating.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from './featureFlags';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Creates a dummy Supabase client that throws on any method call.
 * Used when environment variables are missing (e.g. during build).
 *
 * The proxy intercepts property access and returns functions that throw,
 * preventing silent HTTP requests to invalid URLs.
 */
function createDummyClient(): SupabaseClient {
  const message =
    '[SUPABASE] Client is not configured (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
    'All operations will fail. Set environment variables to enable database access.';

  if (typeof window !== 'undefined') {
    console.warn(message);
  }

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Allow basic introspection / typeof checks to work without throwing
      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
        return undefined;
      }
      if (prop === 'then') {
        // Prevent the proxy from being treated as a thenable (avoids issues
        // when accidentally awaited or returned from async functions)
        return undefined;
      }

      // Return a nested proxy so chained calls like supabase.from('x').select()
      // all throw with a useful message rather than a cryptic TypeError
      return new Proxy(() => {}, {
        apply() {
          throw new Error(
            `[SUPABASE] Cannot call .${String(prop)}() - Supabase is not configured. ` +
            'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
          );
        },
        get(_t, innerProp) {
          if (innerProp === 'then') return undefined;
          return new Proxy(() => {}, this as ProxyHandler<() => void>);
        },
      });
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy({} as any, handler) as SupabaseClient;
}

/**
 * Create a Supabase client (synchronous, no RLS context).
 *
 * If you need RLS context, use `createSupabaseClientWithRLS()` instead.
 *
 * @param userId - Ignored in sync version. Use createSupabaseClientWithRLS for RLS.
 * @param enableRLS - Ignored in sync version. Use createSupabaseClientWithRLS for RLS.
 */
export function createSupabaseClient(
  userId?: string,
  enableRLS?: boolean
): SupabaseClient {
  if (!isSupabaseConfigured()) {
    return createDummyClient();
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);

  // If RLS params are provided, log a warning directing to the async version
  const shouldEnableRLS = enableRLS ?? (userId ? isFeatureEnabled('normalized_schema') : false);
  if (shouldEnableRLS && userId) {
    logger.warn(
      'createSupabaseClient() called with RLS params but RLS context cannot be set synchronously. ' +
      'Use createSupabaseClientWithRLS() instead to ensure RLS context is set before queries execute.',
      { userId }
    );
  }

  return client;
}

/**
 * Create a Supabase client with RLS context (async).
 *
 * Awaits the RPC calls that set user context, ensuring subsequent queries
 * execute with the correct RLS context.
 *
 * @param userId - User ID to set in RLS context
 * @param enableRLS - Whether to enable RLS (uses feature flag if not specified)
 */
export async function createSupabaseClientWithRLS(
  userId: string,
  enableRLS?: boolean
): Promise<SupabaseClient> {
  if (!isSupabaseConfigured()) {
    return createDummyClient();
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);

  const shouldEnableRLS = enableRLS ?? isFeatureEnabled('normalized_schema');

  if (shouldEnableRLS && userId) {
    // Await RLS context setup so subsequent queries have the correct context
    const { error: userCtxError } = await client.rpc('set_config', {
      name: 'app.user_id',
      value: userId,
    });

    if (userCtxError) {
      logger.warn('Failed to set user context for RLS', {
        userId,
        error: userCtxError.message,
      });
    }

    const { error: rlsFlagError } = await client.rpc('set_config', {
      name: 'app.enable_rls',
      value: 'true',
    });

    if (rlsFlagError) {
      logger.warn('Failed to enable RLS flag', {
        error: rlsFlagError.message,
      });
    }
  }

  return client;
}

/**
 * Default Supabase client (backward compatible).
 * This is a simple client without RLS context.
 */
export const supabase = createSupabaseClient();

/**
 * Create a server-side Supabase client with service role.
 * USE CAREFULLY - bypasses RLS!
 *
 * Validates that both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present
 * before creating the client.
 */
export function createServiceRoleClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not configured. Cannot create service role client.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Cannot create service role client.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
