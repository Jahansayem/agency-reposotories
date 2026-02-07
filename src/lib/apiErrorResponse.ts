/**
 * Standardized API Error Response Helper
 *
 * Provides consistent error responses across all API endpoints with:
 * - Unique error IDs for tracking
 * - Structured metadata for debugging
 * - Proper HTTP status codes
 * - Security-aware error messages (no sensitive data leakage)
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';
import { ErrorIds, type ErrorId, type ErrorMetadata, getErrorMessage, getStatusCode } from '@/constants/errorIds';

export interface ApiErrorResponse {
  success: false;
  error: {
    id: ErrorId;
    message: string;
    timestamp: string;
    requestId?: string;
  };
  metadata?: ErrorMetadata;
}

/**
 * Create a standardized API error response
 *
 * @param errorId - Unique error identifier from ErrorIds
 * @param customMessage - Optional custom message (defaults to standard message for errorId)
 * @param metadata - Additional context for debugging (not shown to user)
 * @param statusCode - Optional override for HTTP status code
 * @returns NextResponse with standardized error format
 *
 * @example
 * ```typescript
 * return createErrorResponse(
 *   ErrorIds.AUTH_INVALID_CREDENTIALS,
 *   undefined,
 *   { userId, ip }
 * );
 * ```
 */
export function createErrorResponse(
  errorId: ErrorId,
  customMessage?: string,
  metadata?: ErrorMetadata,
  statusCode?: number
): NextResponse<ApiErrorResponse> {
  const message = getErrorMessage(errorId, customMessage);
  const status = statusCode ?? getStatusCode(errorId);

  // Log error with full context
  logger.error(`API Error: ${errorId}`, null, {
    component: 'ApiErrorResponse',
    errorId,
    message,
    statusCode: status,
    ...metadata,
  });

  const response: ApiErrorResponse = {
    success: false,
    error: {
      id: errorId,
      message,
      timestamp: new Date().toISOString(),
    },
  };

  // Only include metadata in development for debugging
  if (process.env.NODE_ENV !== 'production' && metadata) {
    response.metadata = metadata;
  }

  return NextResponse.json(response, { status });
}

/**
 * Wrapper for authentication errors
 */
export function authError(
  errorId: ErrorId,
  metadata?: ErrorMetadata
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(errorId, undefined, metadata);
}

/**
 * Wrapper for validation errors
 */
export function validationError(
  field: string,
  reason: string,
  metadata?: ErrorMetadata
): NextResponse<ApiErrorResponse> {
  const updatedMetadata: ErrorMetadata = {
    ...metadata,
    details: { ...metadata?.details, field, reason }
  };
  return createErrorResponse(
    ErrorIds.VALIDATION_INVALID_FORMAT,
    `${field}: ${reason}`,
    updatedMetadata
  );
}

/**
 * Wrapper for database errors
 */
export function databaseError(
  errorId: ErrorId,
  originalError?: unknown,
  metadata?: ErrorMetadata
): NextResponse<ApiErrorResponse> {
  // Log the original error for debugging but don't expose to client
  if (originalError) {
    logger.error('Database error details', originalError, {
      component: 'ApiErrorResponse',
      errorId,
      ...metadata,
    });
  }

  return createErrorResponse(errorId, undefined, metadata);
}

/**
 * Wrapper for external service errors (AI, Storage, etc.)
 */
export function externalServiceError(
  errorId: ErrorId,
  serviceName: string,
  originalError?: unknown,
  metadata?: ErrorMetadata
): NextResponse<ApiErrorResponse> {
  if (originalError) {
    logger.error(`${serviceName} error details`, originalError, {
      component: 'ApiErrorResponse',
      errorId,
      service: serviceName,
      ...metadata,
    });
  }

  return createErrorResponse(errorId, undefined, {
    ...metadata,
    details: { ...metadata?.details, service: serviceName },
  });
}

/**
 * Wrapper for business logic errors
 */
export function businessError(
  errorId: ErrorId,
  operation: string,
  metadata?: ErrorMetadata
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(errorId, undefined, {
    ...metadata,
    operation,
  });
}

/**
 * Generic internal error (use sparingly, prefer specific error IDs)
 */
export function internalError(
  originalError?: unknown,
  metadata?: ErrorMetadata
): NextResponse<ApiErrorResponse> {
  if (originalError) {
    logger.error('Internal error details', originalError, {
      component: 'ApiErrorResponse',
      ...metadata,
    });
  }

  return createErrorResponse(
    ErrorIds.INTERNAL_ERROR,
    'An unexpected error occurred. Please try again.',
    metadata,
    500
  );
}

/**
 * Error for missing required configuration
 */
export function configError(
  configName: string,
  metadata?: ErrorMetadata
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorIds.INTERNAL_CONFIG_MISSING,
    `Server configuration error: ${configName} is not set`,
    { ...metadata, details: { ...metadata?.details, configName } },
    500
  );
}

/**
 * Error with retry-after header for rate limiting
 */
export function rateLimitError(
  retryAfterSeconds: number,
  metadata?: ErrorMetadata
): NextResponse<ApiErrorResponse> {
  const response = createErrorResponse(
    ErrorIds.RATE_LIMIT_EXCEEDED,
    `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
    metadata,
    429
  );

  response.headers.set('Retry-After', String(retryAfterSeconds));
  return response;
}

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false &&
    'error' in response
  );
}

/**
 * Extract error ID from error response
 */
export function getErrorId(response: unknown): ErrorId | null {
  if (isErrorResponse(response)) {
    return response.error.id;
  }
  return null;
}

/**
 * Legacy compatibility - maps old apiErrorResponse calls to new system
 * @deprecated Use createErrorResponse or specific error helpers instead
 */
export function apiErrorResponse(
  legacyCode: string,
  message: string,
  status?: number
): NextResponse<ApiErrorResponse> {
  // Map legacy codes to new error IDs
  const errorIdMap: Record<string, ErrorId> = {
    'VALIDATION_ERROR': ErrorIds.VALIDATION_INVALID_FORMAT,
    'AUTH_ERROR': ErrorIds.AUTH_INVALID_CREDENTIALS,
    'SESSION_FAILED': ErrorIds.AUTH_SESSION_INVALID,
    'NOT_FOUND': ErrorIds.DB_RECORD_NOT_FOUND,
    'INTERNAL_ERROR': ErrorIds.INTERNAL_ERROR,
    'DB_ERROR': ErrorIds.DB_QUERY_FAILED,
  };

  const errorId = errorIdMap[legacyCode] || ErrorIds.INTERNAL_ERROR;
  return createErrorResponse(errorId, message, undefined, status);
}
