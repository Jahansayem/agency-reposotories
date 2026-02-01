import { useState, useCallback } from 'react';
import { ErrorMessage, getErrorMessage } from '@/lib/errorMessages';

/**
 * Hook for managing error toast state and actions
 *
 * Issue #24: Error Recovery Actions
 *
 * Usage:
 * ```tsx
 * const { error, showError, dismissError, retryAction } = useErrorToast();
 *
 * const handleSaveTask = async () => {
 *   try {
 *     await saveTask();
 *   } catch (err) {
 *     showError(err, handleSaveTask); // Pass retry callback
 *   }
 * };
 *
 * return (
 *   <>
 *     {/* Your component * /}
 *     <ErrorToast
 *       error={error}
 *       onRetry={retryAction}
 *       onDismiss={dismissError}
 *     />
 *   </>
 * );
 * ```
 */
export function useErrorToast() {
  const [error, setError] = useState<ErrorMessage | null>(null);
  const [retryCallback, setRetryCallback] = useState<(() => void) | null>(null);

  /**
   * Show error toast with optional retry callback
   */
  const showError = useCallback((err: unknown, onRetry?: () => void) => {
    const errorMsg = getErrorMessage(err);
    setError(errorMsg);
    setRetryCallback(() => onRetry || null);
  }, []);

  /**
   * Dismiss error toast
   */
  const dismissError = useCallback(() => {
    setError(null);
    setRetryCallback(null);
  }, []);

  /**
   * Retry the failed action
   */
  const retryAction = useCallback(() => {
    if (retryCallback) {
      dismissError();
      retryCallback();
    }
  }, [retryCallback, dismissError]);

  return {
    error,
    showError,
    dismissError,
    retryAction,
  };
}
