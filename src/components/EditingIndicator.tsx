'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, AlertTriangle } from 'lucide-react';

/**
 * EditingIndicator Component
 * Sprint 3 Issue #40: Collaborative Editing Indicators
 *
 * Displays which users are currently editing a task/field
 * Shows conflict warnings when multiple users edit simultaneously
 *
 * Usage:
 * ```tsx
 * <EditingIndicator editingUsers={editingUsers} />
 * ```
 */

interface EditingState {
  user: string;
  userId: string;
  color: string;
  task_id: string;
  field?: string;
  started_at: string;
}

interface EditingIndicatorProps {
  /**
   * Users currently editing (excluding current user)
   */
  editingUsers: EditingState[];

  /**
   * Component size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show conflict warning when multiple editors
   */
  showConflictWarning?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Simple editing indicator (icon + avatars)
 */
export function EditingIndicator({
  editingUsers,
  size = 'md',
  showConflictWarning = true,
  className = '',
}: EditingIndicatorProps) {
  if (editingUsers.length === 0) return null;

  const hasConflict = editingUsers.length > 1;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const avatarSizeClasses = {
    sm: 'w-4 h-4 text-badge',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
        className={`
          inline-flex items-center gap-2
          rounded-full
          ${hasConflict && showConflictWarning
            ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
            : 'bg-[var(--accent)]/10 text-[var(--accent)]'
          }
          ${sizeClasses[size]}
          ${className}
        `}
        role="status"
        aria-live="polite"
        aria-label={`${editingUsers.map(u => u.user).join(', ')} ${editingUsers.length === 1 ? 'is' : 'are'} editing`}
      >
        {/* Icon */}
        {hasConflict && showConflictWarning ? (
          <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />
        ) : (
          <Edit3 className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />
        )}

        {/* User avatars */}
        <div className="flex items-center -space-x-1">
          {editingUsers.slice(0, 3).map((user, index) => (
            <motion.div
              key={user.userId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className={`
                ${avatarSizeClasses[size]}
                rounded-full
                border border-[var(--surface)]
                flex items-center justify-center
                font-medium text-white
              `}
              style={{
                backgroundColor: user.color,
                zIndex: editingUsers.length - index,
              }}
              title={`${user.user} is editing`}
            >
              {user.user.charAt(0).toUpperCase()}
            </motion.div>
          ))}
          {editingUsers.length > 3 && (
            <div
              className={`
                ${avatarSizeClasses[size]}
                rounded-full
                border border-[var(--surface)]
                bg-[var(--text-muted)]
                flex items-center justify-center
                font-medium text-white
              `}
              title={`+${editingUsers.length - 3} more editing`}
            >
              +{editingUsers.length - 3}
            </div>
          )}
        </div>

        {/* Text */}
        <span className="font-medium">
          {hasConflict && showConflictWarning
            ? 'Editing conflict'
            : `${editingUsers[0].user} editing`}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Field-specific editing indicator
 * Shows who is editing a specific field (e.g., "title", "description")
 */
export function FieldEditingIndicator({
  editingUsers,
  fieldName,
  className = '',
}: {
  editingUsers: EditingState[];
  fieldName: string;
  className?: string;
}) {
  if (editingUsers.length === 0) return null;

  const user = editingUsers[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
        className={`
          inline-flex items-center gap-1.5
          px-2 py-1
          rounded
          bg-[var(--accent)]/10
          text-[var(--accent)]
          text-xs
          ${className}
        `}
        role="status"
        aria-live="polite"
      >
        <div
          className="w-3 h-3 rounded-full flex items-center justify-center"
          style={{ backgroundColor: user.color }}
        >
          <span className="text-badge text-white">
            {user.user.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="font-medium">{user.user}</span>
        <span className="text-[var(--accent)]">editing {fieldName}</span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Conflict warning modal/banner
 * Shown when multiple users are editing the same task
 */
export function EditingConflictWarning({
  editingUsers,
  onCancel,
  onForceSave,
  className = '',
}: {
  editingUsers: EditingState[];
  onCancel?: () => void;
  onForceSave?: () => void;
  className?: string;
}) {
  if (editingUsers.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          flex items-start gap-3
          p-4
          rounded-lg
          border-2 border-[var(--warning)]/50
          bg-[var(--warning)]/10
          ${className}
        `}
        role="alert"
      >
        <AlertTriangle className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />

        <div className="flex-1 space-y-2">
          <div>
            <h4 className="font-semibold text-[var(--foreground)]">
              Editing Conflict Detected
            </h4>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {editingUsers.length === 1
                ? `${editingUsers[0].user} is`
                : `${editingUsers.length} users are`}{' '}
              currently editing this task. Your changes may conflict.
            </p>
          </div>

          {/* Show editing users */}
          <div className="flex items-center gap-2">
            {editingUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--warning)]/20"
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: user.color }}
                >
                  <span className="text-badge text-white">
                    {user.user.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs font-medium text-[var(--foreground)]">
                  {user.user}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {(onCancel || onForceSave) && (
            <div className="flex items-center gap-2 mt-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-3 py-1.5 text-sm font-medium rounded bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--warning)]/20 transition-colors"
                >
                  Cancel My Changes
                </button>
              )}
              {onForceSave && (
                <button
                  onClick={onForceSave}
                  className="px-3 py-1.5 text-sm font-medium rounded bg-[var(--warning)] text-white hover:opacity-90 transition-colors"
                >
                  Save Anyway (Overwrite)
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
