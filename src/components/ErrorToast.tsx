'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, RefreshCw, LogIn, Edit, Mail } from 'lucide-react';
import { ErrorMessage, ErrorCategory } from '@/lib/errorMessages';

interface ErrorToastProps {
  error: ErrorMessage | null;
  onRetry?: () => void;
  onDismiss: () => void;
  onEdit?: () => void;
  onLogin?: () => void;
  autoHideDuration?: number; // milliseconds, 0 = no auto-hide
}

/**
 * Enhanced Error Toast with Recovery Actions
 *
 * Issue #24: Error Recovery Actions (Sprint 2, Category 5)
 *
 * Shows contextual action buttons based on error category:
 * - Network/Timeout/ServerError → "Retry" button
 * - Validation → "Edit" button (if provided)
 * - Authentication → "Log In" button
 * - Authorization → "Contact Admin" link
 * - Unknown → "Dismiss" only
 *
 * Features:
 * - Auto-hide after duration (default: 8 seconds)
 * - Keyboard accessible (Tab, Enter, Escape)
 * - Screen reader support (role="alert", aria-live="assertive")
 * - WCAG 2.1 compliant contrast and focus indicators
 */
export default function ErrorToast({
  error,
  onRetry,
  onDismiss,
  onEdit,
  onLogin,
  autoHideDuration = 8000,
}: ErrorToastProps) {
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide after duration - properly managed with useEffect to prevent
  // multiple timeouts and setState after unmount
  useEffect(() => {
    // Clear any existing timeout when error changes or component re-renders
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }

    // Set up new timeout only if error exists and autoHide is enabled
    if (error && autoHideDuration > 0) {
      autoHideTimeoutRef.current = setTimeout(() => {
        onDismiss();
        autoHideTimeoutRef.current = null;
      }, autoHideDuration);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
        autoHideTimeoutRef.current = null;
      }
    };
  }, [error, autoHideDuration, onDismiss]);

  // Determine which action buttons to show based on error category
  const getActionButtons = () => {
    if (!error) return null;

    const buttons: React.ReactElement[] = [];

    // Retry button for recoverable errors
    if (
      onRetry &&
      (error.category === 'network' ||
        error.category === 'timeout' ||
        error.category === 'serverError')
    ) {
      buttons.push(
        <button
          key="retry"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-[var(--radius-lg)] bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-red-600"
          aria-label="Retry the failed action"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      );
    }

    // Edit button for validation errors
    if (onEdit && error.category === 'validation') {
      buttons.push(
        <button
          key="edit"
          onClick={onEdit}
          className="px-3 py-1.5 rounded-[var(--radius-lg)] bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-red-600"
          aria-label="Edit the input to fix validation errors"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </button>
      );
    }

    // Log In button for authentication errors
    if (onLogin && error.category === 'authentication') {
      buttons.push(
        <button
          key="login"
          onClick={onLogin}
          className="px-3 py-1.5 rounded-[var(--radius-lg)] bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-red-600"
          aria-label="Log in to continue"
        >
          <LogIn className="w-3.5 h-3.5" />
          Log In
        </button>
      );
    }

    // Contact Admin link for authorization errors
    if (error.category === 'authorization') {
      buttons.push(
        <a
          key="contact"
          href="mailto:admin@bealeragency.com?subject=Permission Request"
          className="px-3 py-1.5 rounded-[var(--radius-lg)] bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-red-600"
          aria-label="Contact administrator for help"
        >
          <Mail className="w-3.5 h-3.5" />
          Contact Admin
        </a>
      );
    }

    // Always show Dismiss button
    buttons.push(
      <button
        key="dismiss"
        onClick={onDismiss}
        className="px-3 py-1.5 rounded-[var(--radius-lg)] bg-transparent hover:bg-white/10 text-white/80 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-red-600"
        aria-label="Dismiss error message"
      >
        Dismiss
      </button>
    );

    return buttons;
  };

  // Keyboard handler for Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDismiss();
    }
  };

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          onKeyDown={handleKeyDown}
        >
          <div className="bg-red-600 text-white rounded-[var(--radius-xl)] shadow-2xl p-4 flex items-start gap-3 border border-red-500">
            {/* Error Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            </div>

            {/* Error Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-1">{error.message}</p>
              <p className="text-sm text-white/90 leading-relaxed">
                {error.action}
              </p>

              {/* Technical details (hidden from screen readers, for debugging) */}
              {error.technicalDetails && process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="text-xs text-white/70 cursor-pointer hover:text-white/90">
                    Technical details
                  </summary>
                  <p className="text-xs text-white/60 mt-1 font-mono">
                    {error.technicalDetails}
                  </p>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3">
                {getActionButtons()}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 hover:bg-white/10 rounded-[var(--radius-md)] transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close error notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
