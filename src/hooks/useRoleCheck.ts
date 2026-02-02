'use client';

import { useAgency } from '@/contexts/AgencyContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { AgencyRole } from '@/types/agency';

interface RoleCheckResult {
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
  currentRole: AgencyRole | null;
}

/**
 * Returns role-based booleans for the current user.
 *
 * When multi-tenancy is enabled, reads from AgencyContext's currentMembership role.
 * When disabled, reads from UserContext's currentUser.role.
 */
export function useRoleCheck(): RoleCheckResult {
  const { currentRole: agencyRole } = useAgency();
  const currentUser = useCurrentUser();

  const role: AgencyRole | null = isFeatureEnabled('multi_tenancy')
    ? agencyRole
    : (currentUser.role as AgencyRole) || null;

  return {
    isOwner: role === 'owner',
    isManager: role === 'manager',
    isStaff: role === 'staff',
    currentRole: role,
  };
}
