/**
 * Standardized API Error Response Types and Helpers
 *
 * This module provides consistent error handling across all API routes.
 * Use these helpers to ensure uniform error responses throughout the application.
 *
 * @module apiErrors
 */

// ============================================
// Error Response Types
// ============================================

/**
 * Standard API error response structure.
 * All API errors should return this format for consistency.
 */
export interface ApiErrorResponse {
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code (from API_ERROR_CODES) */
  code: string;
  /** Optional additional details about the error */
  details?: Record<string, unknown>;
}

/**
 * Standard API success response with data.
 * Use for successful responses that return data.
 */
export interface ApiSuccessResponse<T = unknown> {
  /** Response data */
  data: T;
  /** Optional success message */
  message?: string;
}

// ============================================
// Error Codes
// ============================================

/**
 * Standardized error codes for API responses.
 * Use these codes for machine-readable error identification.
 */
export const API_ERROR_CODES = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ROLE_REQUIRED: 'ROLE_REQUIRED',

  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  AGENCY_NOT_FOUND: 'AGENCY_NOT_FOUND',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Multi-tenancy errors (400/403)
  AGENCY_REQUIRED: 'AGENCY_REQUIRED',
  AGENCY_MISMATCH: 'AGENCY_MISMATCH',
  NOT_AGENCY_MEMBER: 'NOT_AGENCY_MEMBER',

  // Rate limiting errors (429)
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/** Type for API error codes */
export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// ============================================
// Helper Functions
// ============================================

/**
 * Create a standardized API error response object.
 *
 * @param error - Human-readable error message
 * @param code - Machine-readable error code from API_ERROR_CODES
 * @param details - Optional additional error details
 * @returns Formatted error response object
 *
 * @example
 * ```ts
 * return NextResponse.json(
 *   apiErrorResponse('User not found', API_ERROR_CODES.USER_NOT_FOUND),
 *   { status: 404 }
 * );
 * ```
 */
export function apiErrorResponse(
  error: string,
  code: ApiErrorCode | string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return { error, code, ...(details && { details }) };
}

/**
 * Create a standardized API success response object.
 *
 * @param data - Response data
 * @param message - Optional success message
 * @returns Formatted success response object
 *
 * @example
 * ```ts
 * return NextResponse.json(
 *   apiSuccessResponse({ task: createdTask }, 'Task created successfully'),
 *   { status: 201 }
 * );
 * ```
 */
export function apiSuccessResponse<T>(
  data: T,
  message?: string
): ApiSuccessResponse<T> {
  return { data, ...(message && { message }) };
}

// ============================================
// Common Error Responses
// ============================================

/**
 * Pre-built error responses for common scenarios.
 * Use these for consistency across API routes.
 */
export const CommonErrors = {
  /** 401 - User is not authenticated */
  unauthorized: (message = 'Authentication required') =>
    apiErrorResponse(message, API_ERROR_CODES.UNAUTHORIZED),

  /** 403 - User lacks required permissions */
  forbidden: (message = 'Access denied') =>
    apiErrorResponse(message, API_ERROR_CODES.FORBIDDEN),

  /** 403 - User lacks specific permission */
  permissionDenied: (permission: string) =>
    apiErrorResponse(
      `Permission denied: ${permission} required`,
      API_ERROR_CODES.PERMISSION_DENIED,
      { requiredPermission: permission }
    ),

  /** 404 - Resource not found */
  notFound: (resource = 'Resource') =>
    apiErrorResponse(`${resource} not found`, API_ERROR_CODES.NOT_FOUND),

  /** 400 - Validation error */
  validationError: (message: string, fields?: Record<string, string>) =>
    apiErrorResponse(message, API_ERROR_CODES.VALIDATION_ERROR, fields ? { fields } : undefined),

  /** 400 - Missing required field */
  missingField: (fieldName: string) =>
    apiErrorResponse(
      `Missing required field: ${fieldName}`,
      API_ERROR_CODES.MISSING_REQUIRED_FIELD,
      { field: fieldName }
    ),

  /** 400 - Agency ID required for multi-tenant operation */
  agencyRequired: () =>
    apiErrorResponse(
      'Agency ID is required for this operation',
      API_ERROR_CODES.AGENCY_REQUIRED
    ),

  /** 403 - User is not a member of the specified agency */
  notAgencyMember: () =>
    apiErrorResponse(
      'You are not a member of this agency',
      API_ERROR_CODES.NOT_AGENCY_MEMBER
    ),

  /** 429 - Rate limit exceeded */
  rateLimited: (retryAfterSeconds?: number) =>
    apiErrorResponse(
      'Too many requests, please try again later',
      API_ERROR_CODES.RATE_LIMITED,
      retryAfterSeconds ? { retryAfter: retryAfterSeconds } : undefined
    ),

  /** 500 - Internal server error */
  internalError: (message = 'An unexpected error occurred') =>
    apiErrorResponse(message, API_ERROR_CODES.INTERNAL_ERROR),

  /** 500 - Database operation failed */
  databaseError: (operation: string) =>
    apiErrorResponse(
      `Database operation failed: ${operation}`,
      API_ERROR_CODES.DATABASE_ERROR,
      { operation }
    ),
} as const;

// ============================================
// HTTP Status Code Helpers
// ============================================

/**
 * Map error codes to appropriate HTTP status codes.
 *
 * @param code - API error code
 * @returns Appropriate HTTP status code
 */
export function getHttpStatusForErrorCode(code: ApiErrorCode | string): number {
  switch (code) {
    // 401 Unauthorized
    case API_ERROR_CODES.UNAUTHORIZED:
    case API_ERROR_CODES.INVALID_CREDENTIALS:
    case API_ERROR_CODES.SESSION_EXPIRED:
    case API_ERROR_CODES.ACCOUNT_LOCKED:
      return 401;

    // 403 Forbidden
    case API_ERROR_CODES.FORBIDDEN:
    case API_ERROR_CODES.PERMISSION_DENIED:
    case API_ERROR_CODES.ROLE_REQUIRED:
    case API_ERROR_CODES.NOT_AGENCY_MEMBER:
      return 403;

    // 404 Not Found
    case API_ERROR_CODES.NOT_FOUND:
    case API_ERROR_CODES.USER_NOT_FOUND:
    case API_ERROR_CODES.TASK_NOT_FOUND:
    case API_ERROR_CODES.AGENCY_NOT_FOUND:
      return 404;

    // 429 Too Many Requests
    case API_ERROR_CODES.RATE_LIMITED:
    case API_ERROR_CODES.TOO_MANY_REQUESTS:
      return 429;

    // 500 Internal Server Error
    case API_ERROR_CODES.INTERNAL_ERROR:
    case API_ERROR_CODES.DATABASE_ERROR:
    case API_ERROR_CODES.EXTERNAL_SERVICE_ERROR:
      return 500;

    // 400 Bad Request (default for validation/client errors)
    case API_ERROR_CODES.VALIDATION_ERROR:
    case API_ERROR_CODES.INVALID_INPUT:
    case API_ERROR_CODES.MISSING_REQUIRED_FIELD:
    case API_ERROR_CODES.INVALID_FORMAT:
    case API_ERROR_CODES.AGENCY_REQUIRED:
    case API_ERROR_CODES.AGENCY_MISMATCH:
    default:
      return 400;
  }
}
