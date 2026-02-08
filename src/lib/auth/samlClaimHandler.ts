/**
 * SAML Claim Handler for Allstate PingFederate Integration
 *
 * Processes SAML claims from Allstate's PingFederate IdP:
 * - Extracts agency_code from Clerk user metadata
 * - Maps Allstate roles to internal roles
 * - Auto-provisions agencies and memberships
 *
 * Allstate sends:
 * - agency_code: e.g., "A1234" (unique identifier for Allstate agency)
 * - role: "Agent" | "Manager" | "Owner" (optional, maps to our role system)
 *
 * @module samlClaimHandler
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { DEFAULT_PERMISSIONS, type AgencyRole, type AgencyPermissions } from '@/types/agency';

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

// ============================================
// Types
// ============================================

/**
 * SAML claims structure from Allstate PingFederate
 * These are typically stored in Clerk's user metadata
 */
export interface AllstateSamlClaims {
  /** Allstate agency code (e.g., "A1234") */
  agency_code?: string;
  /** Allstate role name */
  role?: 'Agent' | 'Manager' | 'Owner' | string;
  /** Agency name from SAML (may differ from our stored name) */
  agency_name?: string;
  /** Agent license number (optional, for compliance) */
  license_number?: string;
  /** Allstate region code (optional) */
  region_code?: string;
}

/**
 * Clerk user metadata structure
 * SAML claims can be in publicMetadata, privateMetadata, or unsafeMetadata
 */
export interface ClerkUserMetadata {
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
  /** Clerk also supports externalAccounts for SSO data */
  externalAccounts?: Array<{
    provider?: string;
    providerUserId?: string;
    /** SAML attributes from the IdP */
    samlAttributes?: Record<string, string | string[]>;
  }>;
}

/**
 * Result of processing SAML claims
 */
export interface SamlClaimResult {
  success: boolean;
  agencyId?: string;
  agencyName?: string;
  role?: AgencyRole;
  isNewAgency?: boolean;
  isNewMembership?: boolean;
  error?: string;
}

// ============================================
// Role Mapping
// ============================================

/**
 * Map Allstate role names to our internal roles
 *
 * Allstate roles:
 * - "Owner" -> owner (agency principal/owner)
 * - "Manager" -> manager (team oversight)
 * - "Agent" -> staff (standard agent)
 * - unknown -> staff (safe default)
 */
export function mapAllstateRoleToInternal(allstateRole?: string): AgencyRole {
  if (!allstateRole) return 'staff';

  const normalizedRole = allstateRole.toLowerCase().trim();

  switch (normalizedRole) {
    case 'owner':
    case 'principal':
    case 'agency_owner':
      return 'owner';
    case 'manager':
    case 'supervisor':
    case 'team_lead':
      return 'manager';
    case 'agent':
    case 'staff':
    case 'member':
    default:
      return 'staff';
  }
}

/**
 * Get default permissions for a role
 */
export function getPermissionsForRole(role: AgencyRole): AgencyPermissions {
  return DEFAULT_PERMISSIONS[role];
}

// ============================================
// Claim Extraction
// ============================================

/**
 * Extract Allstate SAML claims from Clerk user metadata
 *
 * Clerk stores SAML claims in various locations depending on configuration:
 * 1. publicMetadata (most common for non-sensitive claims)
 * 2. privateMetadata (for sensitive claims - requires API access)
 * 3. externalAccounts[].samlAttributes (direct from SAML assertion)
 *
 * @param metadata Clerk user metadata object
 * @returns Extracted SAML claims or empty object
 */
export function extractSamlClaims(metadata: ClerkUserMetadata): AllstateSamlClaims {
  const claims: AllstateSamlClaims = {};

  // Priority 1: Check externalAccounts for SAML-specific attributes
  // This is where Clerk stores raw SAML assertion data
  const samlAccount = metadata.externalAccounts?.find(
    (acc) => acc.provider === 'saml' || acc.provider === 'pingfederate'
  );

  if (samlAccount?.samlAttributes) {
    const attrs = samlAccount.samlAttributes;

    // SAML attribute names are often prefixed or namespaced
    // Common patterns: agency_code, agencyCode, urn:allstate:agency_code
    claims.agency_code = extractAttribute(attrs, [
      'agency_code',
      'agencyCode',
      'urn:allstate:agency_code',
      'http://schemas.allstate.com/claims/agency_code',
      'AgencyCode',
    ]);

    claims.role = extractAttribute(attrs, [
      'role',
      'Role',
      'urn:allstate:role',
      'http://schemas.allstate.com/claims/role',
      'AgentRole',
    ]) as AllstateSamlClaims['role'];

    claims.agency_name = extractAttribute(attrs, [
      'agency_name',
      'agencyName',
      'AgencyName',
      'urn:allstate:agency_name',
    ]);

    claims.license_number = extractAttribute(attrs, [
      'license_number',
      'licenseNumber',
      'LicenseNumber',
      'urn:allstate:license_number',
    ]);

    claims.region_code = extractAttribute(attrs, [
      'region_code',
      'regionCode',
      'RegionCode',
      'urn:allstate:region_code',
    ]);
  }

  // Priority 2: Check publicMetadata (common for Clerk SAML setup)
  if (metadata.publicMetadata) {
    const pub = metadata.publicMetadata as Record<string, unknown>;
    claims.agency_code = claims.agency_code || (pub.agency_code as string) || (pub.agencyCode as string);
    claims.role = claims.role || (pub.role as AllstateSamlClaims['role']) || (pub.allstate_role as AllstateSamlClaims['role']);
    claims.agency_name = claims.agency_name || (pub.agency_name as string) || (pub.agencyName as string);
  }

  // Priority 3: Check privateMetadata (requires backend access)
  if (metadata.privateMetadata) {
    const priv = metadata.privateMetadata as Record<string, unknown>;
    claims.agency_code = claims.agency_code || (priv.agency_code as string) || (priv.agencyCode as string);
    claims.role = claims.role || (priv.role as AllstateSamlClaims['role']);
    claims.license_number = claims.license_number || (priv.license_number as string);
  }

  return claims;
}

/**
 * Helper to extract an attribute value from SAML attributes
 * Handles both string and string[] values
 */
function extractAttribute(
  attrs: Record<string, string | string[]>,
  possibleNames: string[]
): string | undefined {
  for (const name of possibleNames) {
    const value = attrs[name];
    if (value) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

// ============================================
// Agency Management
// ============================================

/**
 * Find or create an agency by Allstate agency code
 *
 * @param agencyCode Allstate agency code (e.g., "A1234")
 * @param agencyName Optional agency name from SAML claims
 * @returns Agency ID and whether it was newly created
 */
export async function findOrCreateAgencyByCode(
  agencyCode: string,
  agencyName?: string
): Promise<{ agencyId: string; isNew: boolean; name: string }> {
  const supabase = getSupabaseClient();
  // Normalize agency code (uppercase, trimmed)
  const normalizedCode = agencyCode.toUpperCase().trim();

  // First, try to find existing agency by allstate_agency_code
  const { data: existingAgency, error: findError } = await supabase
    .from('agencies')
    .select('id, name, allstate_agency_code')
    .eq('allstate_agency_code', normalizedCode)
    .single();

  if (existingAgency && !findError) {
    logger.debug('Found existing agency by Allstate code', {
      component: 'SamlClaimHandler',
      agencyCode: normalizedCode,
      agencyId: existingAgency.id,
    });

    return {
      agencyId: existingAgency.id,
      isNew: false,
      name: existingAgency.name,
    };
  }

  // Agency doesn't exist - create it
  const defaultName = agencyName || `Allstate Agency ${normalizedCode}`;
  const slug = generateAgencySlug(defaultName, normalizedCode);

  const { data: newAgency, error: createError } = await supabase
    .from('agencies')
    .insert({
      name: defaultName,
      slug,
      allstate_agency_code: normalizedCode,
      is_active: true,
      primary_color: '#0033A0', // Allstate brand blue
      secondary_color: '#72B5E8',
      subscription_tier: 'starter',
      max_users: 10,
      max_storage_mb: 1024,
    })
    .select('id, name')
    .single();

  if (createError || !newAgency) {
    // Handle unique constraint violation (race condition)
    if (createError?.code === '23505') {
      // Retry the find
      const { data: retryAgency } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('allstate_agency_code', normalizedCode)
        .single();

      if (retryAgency) {
        return { agencyId: retryAgency.id, isNew: false, name: retryAgency.name };
      }
    }

    logger.error('Failed to create agency for Allstate code', createError, {
      component: 'SamlClaimHandler',
      agencyCode: normalizedCode,
    });
    throw new Error(`Failed to create agency: ${createError?.message}`);
  }

  logger.info('Created new agency from SAML claim', {
    component: 'SamlClaimHandler',
    agencyCode: normalizedCode,
    agencyId: newAgency.id,
    agencyName: newAgency.name,
  });

  return {
    agencyId: newAgency.id,
    isNew: true,
    name: newAgency.name,
  };
}

/**
 * Generate a URL-friendly slug for an agency
 */
function generateAgencySlug(name: string, agencyCode: string): string {
  // Start with the name, fall back to agency code
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);

  // Append agency code for uniqueness
  const codeSuffix = agencyCode.toLowerCase().replace(/[^a-z0-9]/g, '');

  return `${base}-${codeSuffix}`.substring(0, 50);
}

// ============================================
// Membership Management
// ============================================

/**
 * Add or update user's membership in an agency
 *
 * @param userId User's database ID
 * @param agencyId Agency ID
 * @param role Role to assign (defaults to staff)
 * @returns Whether membership was newly created
 */
export async function ensureAgencyMembership(
  userId: string,
  agencyId: string,
  role: AgencyRole = 'staff'
): Promise<{ isNew: boolean; role: AgencyRole }> {
  const supabase = getSupabaseClient();
  // Check if membership already exists
  const { data: existingMembership } = await supabase
    .from('agency_members')
    .select('id, role, status')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .single();

  if (existingMembership) {
    // Membership exists - only update if it's suspended or role needs upgrade
    const currentRole = existingMembership.role as AgencyRole;
    const shouldUpgrade = shouldUpgradeRole(currentRole, role);

    if (existingMembership.status === 'suspended' || shouldUpgrade) {
      const newRole = shouldUpgrade ? role : currentRole;

      const { error: updateError } = await supabase
        .from('agency_members')
        .update({
          status: 'active',
          role: newRole,
          permissions: getPermissionsForRole(newRole),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMembership.id);

      if (updateError) {
        logger.warn('Failed to update agency membership', {
          component: 'SamlClaimHandler',
          userId,
          agencyId,
          error: updateError.message,
        });
      } else {
        logger.info('Updated agency membership from SAML login', {
          component: 'SamlClaimHandler',
          userId,
          agencyId,
          previousStatus: existingMembership.status,
          previousRole: currentRole,
          newRole,
        });
      }

      return { isNew: false, role: newRole };
    }

    return { isNew: false, role: currentRole };
  }

  // Check if user has any other agency memberships (for is_default_agency)
  const { count: membershipCount } = await supabase
    .from('agency_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  const isFirstAgency = (membershipCount ?? 0) === 0;

  // Create new membership
  const { error: insertError } = await supabase
    .from('agency_members')
    .insert({
      user_id: userId,
      agency_id: agencyId,
      role,
      status: 'active',
      permissions: getPermissionsForRole(role),
      is_default_agency: isFirstAgency,
      joined_at: new Date().toISOString(),
    });

  if (insertError) {
    // Handle race condition
    if (insertError.code === '23505') {
      return { isNew: false, role };
    }

    logger.error('Failed to create agency membership', insertError, {
      component: 'SamlClaimHandler',
      userId,
      agencyId,
      role,
    });
    throw new Error(`Failed to create membership: ${insertError.message}`);
  }

  logger.info('Created agency membership from SAML claim', {
    component: 'SamlClaimHandler',
    userId,
    agencyId,
    role,
    isDefaultAgency: isFirstAgency,
  });

  return { isNew: true, role };
}

/**
 * Determine if a role should be upgraded
 * Never downgrade: owner > manager > staff
 */
function shouldUpgradeRole(currentRole: AgencyRole, newRole: AgencyRole): boolean {
  const roleHierarchy: Record<AgencyRole, number> = {
    staff: 1,
    manager: 2,
    owner: 3,
  };

  return roleHierarchy[newRole] > roleHierarchy[currentRole];
}

// ============================================
// Main Processing Function
// ============================================

/**
 * Process SAML claims for a user after Clerk authentication
 *
 * This is the main entry point for SAML claim processing. It:
 * 1. Extracts claims from Clerk user metadata
 * 2. Finds or creates the agency
 * 3. Creates or updates the user's membership
 *
 * This function is designed to be non-blocking for login:
 * - Errors are logged but don't prevent authentication
 * - Returns success=false with error message on failure
 *
 * @param userId User's database ID (from linkClerkUser)
 * @param clerkMetadata Clerk user metadata containing SAML claims
 * @returns Result of claim processing
 */
export async function processSamlClaims(
  userId: string,
  clerkMetadata: ClerkUserMetadata
): Promise<SamlClaimResult> {
  try {
    // Extract SAML claims
    const claims = extractSamlClaims(clerkMetadata);

    // If no agency_code, nothing to do
    if (!claims.agency_code) {
      logger.debug('No agency_code in SAML claims, skipping agency assignment', {
        component: 'SamlClaimHandler',
        userId,
      });
      return {
        success: true,
        // No agency assignment needed
      };
    }

    logger.info('Processing SAML claims for user', {
      component: 'SamlClaimHandler',
      userId,
      agencyCode: claims.agency_code,
      allstateRole: claims.role,
    });

    // Find or create agency
    const { agencyId, isNew: isNewAgency, name: agencyName } = await findOrCreateAgencyByCode(
      claims.agency_code,
      claims.agency_name
    );

    // Map Allstate role to internal role
    const internalRole = mapAllstateRoleToInternal(claims.role);

    // Ensure user has membership
    const { isNew: isNewMembership, role } = await ensureAgencyMembership(
      userId,
      agencyId,
      internalRole
    );

    // Optionally store license number if provided
    if (claims.license_number) {
      const supabase = getSupabaseClient();
      await supabase
        .from('users')
        .update({
          // Store in user metadata if you have such a column
          // For now, just log it
        })
        .eq('id', userId);

      logger.debug('License number from SAML', {
        component: 'SamlClaimHandler',
        userId,
        hasLicenseNumber: true,
      });
    }

    return {
      success: true,
      agencyId,
      agencyName,
      role,
      isNewAgency,
      isNewMembership,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Failed to process SAML claims', error as Error, {
      component: 'SamlClaimHandler',
      userId,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get user's current agency based on SAML claims or default
 *
 * Called during authentication to determine which agency context to use.
 * Priority:
 * 1. Agency from SAML claims (if present and user is member)
 * 2. User's default agency
 * 3. First agency user belongs to
 *
 * @param userId User's database ID
 * @param clerkMetadata Optional Clerk metadata for SAML claims
 * @returns Agency ID to use for session, or null if none
 */
export async function getAgencyForSession(
  userId: string,
  clerkMetadata?: ClerkUserMetadata
): Promise<string | null> {
  const supabase = getSupabaseClient();
  // If we have SAML claims with agency_code, try to use that agency
  if (clerkMetadata) {
    const claims = extractSamlClaims(clerkMetadata);

    if (claims.agency_code) {
      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .eq('allstate_agency_code', claims.agency_code.toUpperCase().trim())
        .single();

      if (agency) {
        // Verify user is member
        const { data: membership } = await supabase
          .from('agency_members')
          .select('id')
          .eq('user_id', userId)
          .eq('agency_id', agency.id)
          .eq('status', 'active')
          .single();

        if (membership) {
          return agency.id;
        }
      }
    }
  }

  // Fall back to default agency
  const { data: defaultMembership } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', userId)
    .eq('is_default_agency', true)
    .eq('status', 'active')
    .single();

  if (defaultMembership) {
    return defaultMembership.agency_id;
  }

  // Fall back to any active membership
  const { data: anyMembership } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  return anyMembership?.agency_id || null;
}
