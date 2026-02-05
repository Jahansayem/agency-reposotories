'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckSquare, Users, MessageSquare, Sparkles } from 'lucide-react';
import { PermissionToggle } from './PermissionToggle';
import type { AgencyPermissions, PermissionMeta } from '@/types/agency';

// Map icon names to components
const ICON_MAP: Record<string, React.ElementType> = {
  CheckSquare,
  Users,
  MessageSquare,
  Sparkles,
};

interface PermissionCategoryProps {
  categoryKey: string;
  label: string;
  icon: string;
  permissions: PermissionMeta[];
  currentPermissions: AgencyPermissions;
  roleDefaults: AgencyPermissions;
  elevatedPermissions: (keyof AgencyPermissions)[];
  disabled?: boolean;
  defaultExpanded?: boolean;
  onPermissionChange: (key: string, value: boolean) => Promise<void>;
}

/**
 * PermissionCategory Component
 *
 * An accordion section for a category of permissions.
 * Shows category header with expand/collapse and contains PermissionToggle items.
 */
export function PermissionCategory({
  categoryKey,
  label,
  icon,
  permissions,
  currentPermissions,
  roleDefaults,
  elevatedPermissions,
  disabled = false,
  defaultExpanded = false,
  onPermissionChange,
}: PermissionCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const IconComponent = ICON_MAP[icon] || CheckSquare;

  // Count enabled permissions in this category
  const enabledCount = permissions.filter(p => currentPermissions[p.key]).length;
  const totalCount = permissions.length;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between px-4 py-3
          bg-gray-50 dark:bg-gray-800/50
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <IconComponent className="w-4 h-4" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {enabledCount}/{totalCount}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-2 bg-white dark:bg-gray-900 space-y-1">
              {permissions.map((perm) => {
                const isEnabled = currentPermissions[perm.key];
                const isDefault = roleDefaults[perm.key];
                const isElevated = elevatedPermissions.includes(perm.key) && !isDefault;

                return (
                  <PermissionToggle
                    key={perm.key}
                    permissionKey={perm.key}
                    label={perm.label}
                    description={perm.description}
                    enabled={isEnabled}
                    isElevated={isElevated}
                    disabled={disabled}
                    onChange={onPermissionChange}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
