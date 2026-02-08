import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import {
  processSamlClaims,
  getAgencyForSession,
  type ClerkUserMetadata,
  type SamlClaimResult,
} from './samlClaimHandler';

// Lazy-initialized Supabase client to avoid build-time errors
// (environment variables aren't available during Next.js build)
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // During Next.js build, env vars may not be available
    // Return a placeholder that will fail gracefully at runtime if actually called
    if (!supabaseUrl || !supabaseServiceKey) {
      // Check if we're in build phase by looking for known build-time indicators
      const isBuildTime = !supabaseServiceKey && typeof window === 'undefined';
      if (isBuildTime) {
        // Create a dummy client that will throw meaningful errors at runtime
        // This allows the build to complete without env vars
        _supabase = {
          from: () => {
            throw new Error('Supabase not configured - SUPABASE_SERVICE_ROLE_KEY is required');
          },
          rpc: () => {
            throw new Error('Supabase not configured - SUPABASE_SERVICE_ROLE_KEY is required');
          },
        } as unknown as SupabaseClient;
        return _supabase;
      }
      throw new Error(
        'Supabase configuration missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
      );
    }

    _supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabase;
}

// Allstate brand colors for user assignment
const USER_COLORS = [
  '#0033A0', // Brand Blue
  '#72B5E8', // Sky Blue
  '#C9A227', // Gold
  '#003D7A', // Navy
  '#6E8AA7', // Muted Blue
  '#5BA8A0', // Teal
  '#E87722', // Orange
  '#98579B', // Purple
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

interface ClerkUserData {
  clerkUserId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Clerk user metadata containing SAML claims from Allstate PingFederate */
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
  /** External accounts (for SAML providers) */
  externalAccounts?: Array<{
    provider?: string;
    providerUserId?: string;
    samlAttributes?: Record<string, string | string[]>;
  }>;
}

interface LinkedUser {
  id: string;
  name: string;
  email?: string;
  clerk_id: string;
  color: string;
}

/**
 * Extended result including SAML claim processing
 */
interface LinkClerkUserResult {
  user: LinkedUser;
  /** Result of SAML claim processing (agency assignment) */
  samlResult?: SamlClaimResult;
  /** Agency ID to use for the session */
  sessionAgencyId?: string | null;
}

/**
 * Link a Clerk user to an existing database user or create a new one
 *
 * This function also processes SAML claims from Allstate PingFederate:
 * - Extracts agency_code from Clerk user metadata
 * - Auto-creates agency if it doesn't exist
 * - Assigns user to agency with appropriate role
 *
 * @param clerkData - User data from Clerk (including SAML metadata)
 * @returns The linked or created user with SAML processing result
 */
export async function linkClerkUser(clerkData: ClerkUserData): Promise<LinkedUser> {
  const result = await linkClerkUserWithSaml(clerkData);
  return result.user;
}

/**
 * Link a Clerk user with full SAML claim processing
 *
 * @param clerkData - User data from Clerk (including SAML metadata)
 * @returns The linked user, SAML result, and session agency ID
 */
export async function linkClerkUserWithSaml(clerkData: ClerkUserData): Promise<LinkClerkUserResult> {
  const {
    clerkUserId,
    email,
    firstName,
    lastName,
    publicMetadata,
    privateMetadata,
    unsafeMetadata,
    externalAccounts,
  } = clerkData;

  let user: LinkedUser;
  let isNewUser = false;

  const supabase = getSupabaseClient();

  // First, check if this Clerk user is already linked
  const { data: existingClerkUser } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUserId)
    .single();

  if (existingClerkUser) {
    // User already linked, use them
    user = existingClerkUser as LinkedUser;
  } else if (email) {
    // Check if there's an existing user with this email
    const { data: existingEmailUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingEmailUser) {
      // Link the existing user to Clerk
      const { data: linkedUser, error } = await supabase
        .from('users')
        .update({ clerk_id: clerkUserId })
        .eq('id', existingEmailUser.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to link existing user to Clerk', error, {
          component: 'LinkClerkUser',
          clerkUserId,
          email,
        });
        throw new Error('Failed to link user account');
      }

      user = linkedUser as LinkedUser;
    } else {
      // Create a new user
      user = await createNewClerkUser(clerkUserId, email, firstName, lastName);
      isNewUser = true;
    }
  } else {
    // No email, create new user
    user = await createNewClerkUser(clerkUserId, email, firstName, lastName);
    isNewUser = true;
  }

  // Build Clerk metadata for SAML processing
  const clerkMetadata: ClerkUserMetadata = {
    publicMetadata,
    privateMetadata,
    unsafeMetadata,
    externalAccounts,
  };

  // Process SAML claims (non-blocking - errors don't prevent login)
  let samlResult: SamlClaimResult | undefined;
  let sessionAgencyId: string | null = null;

  try {
    // Only process SAML claims if there's metadata to process
    if (publicMetadata || privateMetadata || externalAccounts?.length) {
      samlResult = await processSamlClaims(user.id, clerkMetadata);

      if (samlResult.success) {
        logger.info('SAML claims processed successfully', {
          component: 'LinkClerkUser',
          userId: user.id,
          agencyId: samlResult.agencyId,
          isNewAgency: samlResult.isNewAgency,
          isNewMembership: samlResult.isNewMembership,
          isNewUser,
        });
      } else {
        logger.warn('SAML claim processing failed (login continues)', {
          component: 'LinkClerkUser',
          userId: user.id,
          error: samlResult.error,
        });
      }
    }

    // Get the agency ID to use for this session
    sessionAgencyId = await getAgencyForSession(user.id, clerkMetadata);
  } catch (error) {
    // SAML processing errors should not block login
    logger.error('Error during SAML claim processing (login continues)', error as Error, {
      component: 'LinkClerkUser',
      userId: user.id,
    });
  }

  return {
    user,
    samlResult,
    sessionAgencyId,
  };
}

/**
 * Create a new user from Clerk data
 */
async function createNewClerkUser(
  clerkUserId: string,
  email: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined
): Promise<LinkedUser> {
  const supabase = getSupabaseClient();
  const displayName = firstName
    ? `${firstName}${lastName ? ` ${lastName.charAt(0)}.` : ''}`
    : email?.split('@')[0] || 'User';

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      name: displayName,
      email: email || null,
      clerk_id: clerkUserId,
      color: getRandomColor(),
      // PIN hash is null for Clerk-only users
      pin_hash: null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create user for Clerk', error, {
      component: 'LinkClerkUser',
      clerkUserId,
    });
    throw new Error('Failed to create user account');
  }

  logger.info('Created new user from Clerk', {
    component: 'LinkClerkUser',
    userId: newUser.id,
    clerkUserId,
  });

  return newUser as LinkedUser;
}

/**
 * Get a user by their Clerk ID
 */
export async function getUserByClerkId(clerkUserId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUserId)
    .single();

  if (error) {
    logger.debug('Failed to get user by Clerk ID', {
      component: 'LinkClerkUser',
      clerkUserId,
      error: error.message,
    });
    return null;
  }

  return data;
}

/**
 * Update a user's Clerk data (e.g., when they update their profile in Clerk)
 *
 * Also re-processes SAML claims to handle role/agency changes
 */
export async function updateUserFromClerk(clerkUserId: string, updates: Partial<ClerkUserData>) {
  const { email, firstName, lastName, publicMetadata, privateMetadata, externalAccounts } = updates;

  const updateData: Record<string, unknown> = {};

  if (email !== undefined) {
    updateData.email = email;
  }

  if (firstName !== undefined || lastName !== undefined) {
    const displayName = firstName
      ? `${firstName}${lastName ? ` ${lastName.charAt(0)}.` : ''}`
      : undefined;
    if (displayName) {
      updateData.name = displayName;
    }
  }

  // Update user record if there are changes
  if (Object.keys(updateData).length > 0) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('clerk_id', clerkUserId);

    if (error) {
      logger.error('Failed to update user from Clerk', error, {
        component: 'LinkClerkUser',
        clerkUserId,
      });
      throw new Error('Failed to update user');
    }
  }

  // Re-process SAML claims if metadata is provided
  // This handles role changes from the IdP
  if (publicMetadata || privateMetadata || externalAccounts?.length) {
    const user = await getUserByClerkId(clerkUserId);
    if (user) {
      try {
        const clerkMetadata: ClerkUserMetadata = {
          publicMetadata,
          privateMetadata,
          externalAccounts,
        };
        await processSamlClaims(user.id, clerkMetadata);
      } catch (error) {
        // Log but don't fail the update
        logger.warn('Failed to re-process SAML claims on user update', {
          component: 'LinkClerkUser',
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

// Re-export types for consumers
export type { ClerkUserMetadata, SamlClaimResult } from './samlClaimHandler';
export { extractSamlClaims, mapAllstateRoleToInternal } from './samlClaimHandler';
