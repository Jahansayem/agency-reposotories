'use client';

import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { AgencyPermissions } from '@/types/agency';

interface PermissionGateProps {
  /** The permission required to render children */
  permission: keyof AgencyPermissions;
  /** Content to render when permission is denied (default: null) */
  fallback?: ReactNode;
  /** Content to render when permission is granted */
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's permissions.
 * Uses usePermission() internally, which respects both multi-tenant and
 * single-tenant permission models.
 */
export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
