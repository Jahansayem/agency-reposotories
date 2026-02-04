'use client';

import { useAgency } from '@/contexts/AgencyContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { DEFAULT_PERMISSIONS } from '@/types/agency';
import type { AgencyPermissions, AgencyRole } from '@/types/agency';
import { isFeatureEnabled } from '@/lib/featureFlags';

/**
 * Hook to check if the current user has a specific permission.
 * Returns true if permission is granted, false otherwise.
 *
 * In single-tenant mode (multi_tenancy disabled), uses DEFAULT_PERMISSIONS
 * based on the user's role.
 *
 * @param permission - The permission key to check
 * @returns Whether the user has the permission
 *
 * @example
 * const canEdit = usePermission('can_edit_all_tasks');
 * if (canEdit) {
 *   // Show edit button
 * }
 */
export function usePermission(permission: keyof AgencyPermissions): boolean {
  const { hasPermission } = useAgency();
  const currentUser = useCurrentUser();

  if (isFeatureEnabled('multi_tenancy')) {
    // hasPermission already handles the single-tenant fallback
    return hasPermission(permission);
  }

  // Single-tenant mode: look up defaults by user role
  if (!currentUser || !currentUser.role) return false;
  const role = currentUser.role as AgencyRole;
  const defaults = DEFAULT_PERMISSIONS[role];
  if (!defaults) return false;
  return defaults[permission] === true;
}

/**
 * Hook to check multiple permissions at once.
 * Returns an object mapping each permission to its boolean value.
 *
 * This is more efficient than calling usePermission multiple times
 * when you need to check several permissions in a single component.
 *
 * @param permissions - Array of permission keys to check
 * @returns Object mapping each permission to its boolean value
 *
 * @example
 * const perms = usePermissions(['can_create_tasks', 'can_delete_all_tasks']);
 * if (perms.can_create_tasks) {
 *   // Show create button
 * }
 */
export function usePermissions<K extends keyof AgencyPermissions>(
  permissions: K[]
): Record<K, boolean> {
  const { hasPermission } = useAgency();
  const currentUser = useCurrentUser();

  return permissions.reduce((acc, perm) => {
    if (isFeatureEnabled('multi_tenancy')) {
      acc[perm] = hasPermission(perm);
    } else {
      // Single-tenant mode: look up defaults by user role
      if (!currentUser || !currentUser.role) {
        acc[perm] = false;
      } else {
        const role = currentUser.role as AgencyRole;
        const defaults = DEFAULT_PERMISSIONS[role];
        acc[perm] = defaults ? defaults[perm] === true : false;
      }
    }
    return acc;
  }, {} as Record<K, boolean>);
}
