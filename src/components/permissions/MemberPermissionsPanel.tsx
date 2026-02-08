'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { PermissionCategory } from './PermissionCategory';
import {
  PERMISSION_CATEGORIES,
  DEFAULT_PERMISSIONS,
  ELEVATED_PERMISSIONS,
  PERMISSION_PRESETS,
  detectPermissionPreset,
  type AgencyPermissions,
  type AgencyRole,
  type PermissionPreset,
} from '@/types/agency';
import { fetchWithCsrf } from '@/lib/csrf';

interface MemberPermissionsPanelProps {
  memberId: string;
  memberName: string;
  memberRole: AgencyRole;
  permissions: AgencyPermissions;
  agencyId: string;
  onUpdate?: (updatedPermissions: AgencyPermissions) => void;
}

/**
 * MemberPermissionsPanel Component
 *
 * Full permission editor panel for a team member.
 * Includes all 4 permission categories and a reset to defaults button.
 */
export function MemberPermissionsPanel({
  memberId,
  memberName,
  memberRole,
  permissions,
  agencyId,
  onUpdate,
}: MemberPermissionsPanelProps) {
  const [localPermissions, setLocalPermissions] = useState<AgencyPermissions>(permissions);
  const [currentPreset, setCurrentPreset] = useState<PermissionPreset>(() => detectPermissionPreset(permissions));
  const [isResetting, setIsResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roleDefaults = DEFAULT_PERMISSIONS[memberRole];

  // Update current preset when permissions change
  useEffect(() => {
    setCurrentPreset(detectPermissionPreset(localPermissions));
  }, [localPermissions]);

  // Handle individual permission toggle
  const handlePermissionChange = useCallback(async (key: string, value: boolean) => {
    // Optimistic update
    const previousPermissions = localPermissions;
    const newPermissions = { ...localPermissions, [key]: value };
    setLocalPermissions(newPermissions);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetchWithCsrf(`/api/agencies/${agencyId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({
          memberId,
          permissions: { [key]: value },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update permission');
      }

      // Update with server response
      if (data.member?.permissions) {
        setLocalPermissions(data.member.permissions);
        onUpdate?.(data.member.permissions);
      }

      setSuccessMessage('Permission updated');
      setTimeout(() => setSuccessMessage(null), 2000);

    } catch (error) {
      // Rollback on error
      setLocalPermissions(previousPermissions);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update permission');
    }
  }, [localPermissions, agencyId, memberId, onUpdate]);

  // Handle preset selection
  const handlePresetChange = useCallback(async (preset: PermissionPreset) => {
    if (preset === 'custom') return; // Do nothing for custom

    const presetPermissions = PERMISSION_PRESETS[preset].permissions;

    // Optimistic update
    const previousPermissions = localPermissions;
    setLocalPermissions(presetPermissions);
    setCurrentPreset(preset);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetchWithCsrf(`/api/agencies/${agencyId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({
          memberId,
          permissions: presetPermissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to apply preset');
      }

      // Update with server response
      if (data.member?.permissions) {
        setLocalPermissions(data.member.permissions);
        onUpdate?.(data.member.permissions);
      }

      setSuccessMessage(`Applied ${PERMISSION_PRESETS[preset].label} preset`);
      setTimeout(() => setSuccessMessage(null), 2000);

    } catch (error) {
      // Rollback on error
      setLocalPermissions(previousPermissions);
      setCurrentPreset(detectPermissionPreset(previousPermissions));
      setErrorMessage(error instanceof Error ? error.message : 'Failed to apply preset');
    }
  }, [localPermissions, agencyId, memberId, onUpdate]);

  // Handle reset to role defaults
  const handleResetToDefaults = useCallback(async () => {
    if (!confirm(`Reset ${memberName}'s permissions to ${memberRole} defaults? This will remove any custom permissions.`)) {
      return;
    }

    setIsResetting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetchWithCsrf(`/api/agencies/${agencyId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({
          memberId,
          newRole: memberRole, // Setting the same role resets to defaults
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset permissions');
      }

      // Update with server response
      if (data.member?.permissions) {
        setLocalPermissions(data.member.permissions);
        onUpdate?.(data.member.permissions);
      }

      setSuccessMessage('Permissions reset to defaults');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reset permissions');
    } finally {
      setIsResetting(false);
    }
  }, [agencyId, memberId, memberName, memberRole, onUpdate]);

  // Check if any permissions differ from defaults
  const hasCustomPermissions = Object.keys(roleDefaults).some(
    key => localPermissions[key as keyof AgencyPermissions] !== roleDefaults[key as keyof AgencyPermissions]
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-2 pt-4 border-t border-[var(--border)]"
    >
      {/* Header */}
      <div className="mb-4 px-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              Permissions
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Customize {memberName}&apos;s access beyond {memberRole} defaults
            </p>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={isResetting || !hasCustomPermissions}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
              transition-colors
              ${hasCustomPermissions
                ? 'text-[var(--accent)] hover:bg-[var(--accent)]/10'
                : 'text-[var(--text-muted)] cursor-not-allowed'
              }
              disabled:opacity-50
            `}
          >
            {isResetting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            Reset to defaults
          </button>
        </div>

        {/* Permission Preset Selector */}
        <div>
          <label htmlFor="permission-preset" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Role Preset
          </label>
          <select
            id="permission-preset"
            value={currentPreset}
            onChange={(e) => handlePresetChange(e.target.value as PermissionPreset)}
            className="
              w-full px-3 py-2 rounded-lg text-sm
              bg-[var(--surface)]
              border border-[var(--border)]
              text-[var(--foreground)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]
              transition-all
            "
          >
            <option value="full_access">Full Access</option>
            <option value="manager">Manager</option>
            <option value="task_coordinator">Task Coordinator</option>
            <option value="view_only">View Only</option>
            <option value="custom">{currentPreset === 'custom' ? 'Custom (manually configured)' : 'Custom'}</option>
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {currentPreset === 'custom'
              ? 'Manually configured permissions - select a preset to apply common patterns'
              : PERMISSION_PRESETS[currentPreset].description}
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-800 dark:text-green-200">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-200">{errorMessage}</span>
        </div>
      )}

      {/* Permission Categories */}
      <div className="space-y-3">
        {Object.entries(PERMISSION_CATEGORIES).map(([key, category], index) => (
          <PermissionCategory
            key={key}
            categoryKey={key}
            label={category.label}
            icon={category.icon}
            permissions={category.permissions}
            currentPermissions={localPermissions}
            roleDefaults={roleDefaults}
            elevatedPermissions={ELEVATED_PERMISSIONS}
            defaultExpanded={index === 0}
            onPermissionChange={handlePermissionChange}
          />
        ))}
      </div>

      {/* Info text */}
      <p className="mt-4 text-xs text-[var(--text-muted)] text-center">
        Changes are saved automatically. Elevated permissions are marked with a warning badge.
      </p>
    </motion.div>
  );
}
