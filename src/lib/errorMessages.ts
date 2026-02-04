/**
 * Error Message Utility
 *
 * Provides specific, actionable error messages for better UX.
 * Instead of vague "Failed to load" messages, gives users clear next steps.
 *
 * Issue #23: Actionable Error Messages (Sprint 2, Category 5)
 */

/**
 * Error categories for structured error handling
 */
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'notFound'
  | 'serverError'
  | 'timeout'
  | 'unknown';

/**
 * Structured error message with category and suggested action
 */
export interface ErrorMessage {
  category: ErrorCategory;
  message: string;
  action: string;
  technicalDetails?: string;
}

/**
 * Convert unknown error to user-friendly message with actionable guidance
 */
export function getErrorMessage(error: unknown): ErrorMessage {
  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network connectivity errors
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror')
    ) {
      return {
        category: 'network',
        message: 'Unable to connect to the server',
        action: 'Check your internet connection and try again.',
        technicalDetails: error.message,
      };
    }

    // Authentication errors (401)
    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('session expired') ||
      message.includes('not authenticated')
    ) {
      return {
        category: 'authentication',
        message: 'Your session has expired',
        action: 'Please log in again to continue.',
        technicalDetails: error.message,
      };
    }

    // Authorization/Permission errors (403)
    if (
      message.includes('403') ||
      message.includes('forbidden') ||
      message.includes('permission denied') ||
      message.includes('not authorized')
    ) {
      return {
        category: 'authorization',
        message: 'Permission denied',
        action: "You don't have permission to perform this action. Contact an administrator if you believe this is a mistake.",
        technicalDetails: error.message,
      };
    }

    // Not Found errors (404)
    if (
      message.includes('404') ||
      message.includes('not found')
    ) {
      return {
        category: 'notFound',
        message: 'Resource not found',
        action: 'The requested item may have been deleted. Refresh the page and try again.',
        technicalDetails: error.message,
      };
    }

    // Server errors (500, 502, 503, 504)
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('internal server error') ||
      message.includes('bad gateway') ||
      message.includes('service unavailable') ||
      message.includes('gateway timeout')
    ) {
      return {
        category: 'serverError',
        message: 'Server error',
        action: 'Our servers are experiencing issues. Please try again in a few minutes.',
        technicalDetails: error.message,
      };
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('request took too long')
    ) {
      return {
        category: 'timeout',
        message: 'Request timed out',
        action: 'The operation took too long. Check your connection and try again.',
        technicalDetails: error.message,
      };
    }

    // Validation errors (already specific, pass through)
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('must be') ||
      message.includes('cannot be')
    ) {
      return {
        category: 'validation',
        message: error.message,
        action: 'Please correct the highlighted fields and try again.',
        technicalDetails: error.message,
      };
    }

    // Generic Error with message
    return {
      category: 'unknown',
      message: 'Something went wrong',
      action: `Error: ${error.message}. Please try again or contact support if the problem persists.`,
      technicalDetails: error.message,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      category: 'unknown',
      message: error,
      action: 'Please try again or refresh the page.',
      technicalDetails: error,
    };
  }

  // Handle unknown error types
  return {
    category: 'unknown',
    message: 'An unexpected error occurred',
    action: 'Please refresh the page and try again. If the problem persists, contact support.',
    technicalDetails: String(error),
  };
}

/**
 * Get a simple string error message (for backwards compatibility)
 */
export function getSimpleErrorMessage(error: unknown): string {
  const errorMsg = getErrorMessage(error);
  return `${errorMsg.message}. ${errorMsg.action}`;
}

/**
 * Context-specific error messages for common operations
 */
export const ContextualErrorMessages = {
  // Task operations
  taskLoad: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Failed to load tasks',
      action:
        base.category === 'network'
          ? 'Check your internet connection and click "Refresh" to try again.'
          : base.category === 'authentication'
          ? 'Your session expired. Please log in again.'
          : 'Click "Refresh" to try again. If the problem persists, contact support.',
    };
  },

  taskCreate: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Failed to create task',
      action:
        base.category === 'network'
          ? 'Check your connection and try again. Your input has been preserved.'
          : base.category === 'validation'
          ? base.action
          : 'Your input has been preserved. Try again in a moment.',
    };
  },

  taskUpdate: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Failed to update task',
      action:
        base.category === 'network'
          ? 'Changes were not saved. Check your connection and try again.'
          : base.category === 'notFound'
          ? 'This task may have been deleted. Refresh the page to see the latest tasks.'
          : 'Changes were not saved. Try again in a moment.',
    };
  },

  taskDelete: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Failed to delete task',
      action:
        base.category === 'network'
          ? 'The task was not deleted. Check your connection and try again.'
          : 'The task was not deleted. Try again in a moment.',
    };
  },

  // Attachment operations
  attachmentUpload: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Failed to upload file',
      action:
        base.category === 'network'
          ? 'Check your internet connection and try uploading again.'
          : base.technicalDetails?.includes('size')
          ? 'File is too large. Maximum size is 25MB.'
          : base.technicalDetails?.includes('type')
          ? 'File type not supported.'
          : 'Try uploading again. Ensure the file is less than 25MB.',
    };
  },

  // Message operations
  messageLoad: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Failed to load messages',
      action:
        base.category === 'network'
          ? 'Check your connection and click "Reload Messages".'
          : 'Click "Reload Messages" to try again.',
    };
  },

  messageSend: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Failed to send message',
      action:
        base.category === 'network'
          ? 'Message not sent. Check your connection and try again. Your message has been preserved.'
          : 'Message not sent. Try again in a moment. Your message has been preserved.',
    };
  },

  // Authentication operations
  login: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Login failed',
      action:
        base.category === 'validation'
          ? 'Please check your credentials and try again.'
          : base.category === 'network'
          ? 'Check your internet connection and try again.'
          : 'Unable to log in. Please try again or contact support.',
    };
  },

  // Goals operations
  goalsLoad: (error: unknown) => {
    const base = getErrorMessage(error);
    return {
      ...base,
      message: 'Failed to load goals',
      action:
        base.category === 'authorization'
          ? 'Only the owner can view strategic goals.'
          : base.category === 'network'
          ? 'Check your connection and try again.'
          : 'Try refreshing the page.',
    };
  },
};

/**
 * Format error for screen reader announcement
 */
export function getAriaErrorMessage(error: unknown): string {
  const errorMsg = getErrorMessage(error);
  return `Error: ${errorMsg.message}. ${errorMsg.action}`;
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  const errorMsg = getErrorMessage(error);
  return ['network', 'timeout', 'serverError'].includes(errorMsg.category);
}

/**
 * Check if error requires re-authentication
 */
export function requiresReauth(error: unknown): boolean {
  const errorMsg = getErrorMessage(error);
  return errorMsg.category === 'authentication';
}
