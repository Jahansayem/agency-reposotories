'use client';

import { useAgency } from '@/contexts/AgencyContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { AgencyRole } from '@/types/agency';

/**
 * Role hierarchy for permission level checks.
 * Higher number = higher privilege level.
 */
const ROLE_HIERARCHY: Record<AgencyRole, number> = {
  owner: 3,
  manager: 2,
  staff: 1,
};

interface RoleCheckResult {
  /** Current user's role in the agency */
  role: AgencyRole | null;
  /** @deprecated Use `role` instead */
  currentRole: AgencyRole | null;
  /** True if user is the agency owner */
  isOwner: boolean;
  /** True if user is owner or manager */
  isAdmin: boolean;
  /** True if user is a manager (not owner) */
  isManager: boolean;
  /** True if user is staff */
  isStaff: boolean;
  /**
   * Check if user has at least the given role level.
   * Role hierarchy: owner (3) > manager (2) > staff (1)
   *
   * @param minRole - The minimum role required
   * @returns True if user's role is equal to or higher than minRole
   *
   * @example
   * const { hasRoleLevel } = useRoleCheck();
   * if (hasRoleLevel('manager')) {
   *   // User is manager or owner
   * }
   */
  hasRoleLevel: (minRole: AgencyRole) => boolean;
}

/**
 * Hook to check user's role in the current agency.
 * Returns role checking utilities.
 *
 * When multi-tenancy is enabled, reads from AgencyContext's currentMembership role.
 * When disabled, reads from UserContext's currentUser.role.
 *
 * @example
 * const { isOwner, isAdmin, hasRoleLevel } = useRoleCheck();
 *
 * // Simple checks
 * if (isOwner) { ... }
 * if (isAdmin) { ... } // owner OR manager
 *
 * // Level-based check
 * if (hasRoleLevel('manager')) {
 *   // User is at least a manager
 * }
 */
export function useRoleCheck(): RoleCheckResult {
  const { currentRole: agencyRole, isAgencyOwner, isAgencyAdmin } = useAgency();
  const currentUser = useCurrentUser();

  const role: AgencyRole | null = isFeatureEnabled('multi_tenancy')
    ? agencyRole
    : (currentUser?.role as AgencyRole) || null;

  /**
   * Check if user has at least the given role level.
   */
  const hasRoleLevel = (minRole: AgencyRole): boolean => {
    if (!role) return false;
    const userLevel = ROLE_HIERARCHY[role];
    const requiredLevel = ROLE_HIERARCHY[minRole];
    return userLevel >= requiredLevel;
  };

  // In multi-tenancy mode, use context values; otherwise compute from role
  const isOwner = isFeatureEnabled('multi_tenancy') ? isAgencyOwner : role === 'owner';
  const isAdmin = isFeatureEnabled('multi_tenancy') ? isAgencyAdmin : (role === 'owner' || role === 'manager');

  return {
    role,
    currentRole: role, // Deprecated alias for backwards compatibility
    isOwner,
    isAdmin,
    isManager: role === 'manager',
    isStaff: role === 'staff',
    hasRoleLevel,
  };
}
