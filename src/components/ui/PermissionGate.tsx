'use client';

import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import type { AgencyPermissions, AgencyRole } from '@/types/agency';

interface PermissionGateProps {
  /** Permission required to render children */
  permission?: keyof AgencyPermissions;

  /** Minimum role required (alternative to permission) */
  minRole?: AgencyRole;

  /** Children to render if permission granted */
  children: ReactNode;

  /** Fallback to render if permission denied (optional) */
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on permissions.
 * Uses usePermission() internally, which respects both multi-tenant and
 * single-tenant permission models.
 *
 * You can gate by either:
 * - `permission`: A specific permission key from AgencyPermissions
 * - `minRole`: A minimum role level (staff < manager < owner)
 *
 * If both are provided, BOTH conditions must be met.
 *
 * @example
 * // Permission-based gating
 * <PermissionGate permission="can_edit_strategic_goals">
 *   <EditGoalButton />
 * </PermissionGate>
 *
 * @example
 * // Role-based gating with fallback
 * <PermissionGate minRole="manager" fallback={<ReadOnlyView />}>
 *   <EditableView />
 * </PermissionGate>
 *
 * @example
 * // Combined permission and role check
 * <PermissionGate permission="can_manage_team" minRole="manager">
 *   <TeamManagementPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  minRole,
  children,
  fallback = null,
}: PermissionGateProps) {
  // Always call hooks unconditionally to follow React's rules of hooks
  // We use a default permission that should always exist as a fallback
  const permissionToCheck = permission || 'can_create_tasks';
  const hasPermissionResult = usePermission(permissionToCheck);
  const { hasRoleLevel } = useRoleCheck();

  // Check permission if provided
  if (permission && !hasPermissionResult) {
    return <>{fallback}</>;
  }

  // Check role if provided
  if (minRole && !hasRoleLevel(minRole)) {
    return <>{fallback}</>;
  }

  // If neither permission nor minRole is provided, always render children
  // This allows the component to be used as a simple wrapper
  if (!permission && !minRole) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

export default PermissionGate;
