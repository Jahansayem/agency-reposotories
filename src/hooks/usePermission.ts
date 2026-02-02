'use client';

import { useAgency } from '@/contexts/AgencyContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { DEFAULT_PERMISSIONS } from '@/types/agency';
import type { AgencyPermissions, AgencyRole } from '@/types/agency';
import { isFeatureEnabled } from '@/lib/featureFlags';

/**
 * Check if the current user has a specific permission.
 *
 * When multi-tenancy is enabled, delegates to AgencyContext's hasPermission().
 * When multi-tenancy is disabled, looks up DEFAULT_PERMISSIONS for the user's role.
 *
 * @param permission - The permission key to check
 * @returns Whether the user has the permission
 */
export function usePermission(permission: keyof AgencyPermissions): boolean {
  const { hasPermission } = useAgency();
  const currentUser = useCurrentUser();

  if (isFeatureEnabled('multi_tenancy')) {
    return hasPermission(permission);
  }

  // Single-tenant mode: look up defaults by user role
  if (!currentUser || !currentUser.role) return false;
  const role = currentUser.role as AgencyRole;
  const defaults = DEFAULT_PERMISSIONS[role];
  if (!defaults) return false;
  return defaults[permission] === true;
}
