'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PermissionToggleProps {
  permissionKey: string;
  label: string;
  description: string;
  enabled: boolean;
  isElevated?: boolean;
  disabled?: boolean;
  onChange: (key: string, value: boolean) => Promise<void>;
}

/**
 * PermissionToggle Component
 *
 * A toggle switch for individual permissions with:
 * - Label and description
 * - On/off state with smooth animation
 * - Loading indicator while saving
 * - Elevated permission warning badge
 */
export function PermissionToggle({
  permissionKey,
  label,
  description,
  enabled,
  isElevated = false,
  disabled = false,
  onChange,
}: PermissionToggleProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = useCallback(async () => {
    if (disabled || isSaving) return;

    setIsSaving(true);
    try {
      await onChange(permissionKey, !enabled);
    } finally {
      setIsSaving(false);
    }
  }, [permissionKey, enabled, disabled, isSaving, onChange]);

  return (
    <div
      className={`
        flex items-center justify-between py-2.5 px-3 rounded-lg
        hover:bg-gray-50 dark:hover:bg-gray-700/50
        transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onClick={handleToggle}
    >
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </span>
          {isElevated && enabled && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              <AlertTriangle className="w-3 h-3" />
              Elevated
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      </div>

      {/* Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${label}: ${enabled ? 'enabled' : 'disabled'}`}
        disabled={disabled || isSaving}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
        `}
      >
        {isSaving ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </span>
        ) : (
          <motion.span
            initial={false}
            animate={{ x: enabled ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`
              inline-block h-5 w-5 rounded-full bg-white shadow-sm
              transform transition-transform
            `}
          />
        )}
      </button>
    </div>
  );
}
