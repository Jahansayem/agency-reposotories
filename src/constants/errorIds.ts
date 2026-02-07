/**
 * Standardized Error IDs
 *
 * All API endpoints should use these error IDs for consistent error handling,
 * logging, and monitoring. Each error ID is unique and maps to specific scenarios.
 */

export const ErrorIds = {
  // Authentication & Authorization (1xxx)
  AUTH_MISSING_CREDENTIALS: 'AUTH_1001',
  AUTH_INVALID_CREDENTIALS: 'AUTH_1002',
  AUTH_ACCOUNT_LOCKED: 'AUTH_1003',
  AUTH_SESSION_EXPIRED: 'AUTH_1004',
  AUTH_SESSION_INVALID: 'AUTH_1005',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_1006',
  AUTH_USER_NOT_FOUND: 'AUTH_1007',
  AUTH_PIN_FORMAT_INVALID: 'AUTH_1008',
  AUTH_LOCKOUT_SYSTEM_UNAVAILABLE: 'AUTH_1009',

  // Validation (2xxx)
  VALIDATION_MISSING_FIELD: 'VAL_2001',
  VALIDATION_INVALID_FORMAT: 'VAL_2002',
  VALIDATION_OUT_OF_RANGE: 'VAL_2003',
  VALIDATION_DUPLICATE_ENTRY: 'VAL_2004',
  VALIDATION_RELATIONSHIP_VIOLATED: 'VAL_2005',
  VALIDATION_FILE_TOO_LARGE: 'VAL_2006',
  VALIDATION_FILE_TYPE_INVALID: 'VAL_2007',
  VALIDATION_MALFORMED_JSON: 'VAL_2008',

  // Database (3xxx)
  DB_CONNECTION_FAILED: 'DB_3001',
  DB_QUERY_FAILED: 'DB_3002',
  DB_TRANSACTION_FAILED: 'DB_3003',
  DB_CONSTRAINT_VIOLATED: 'DB_3004',
  DB_RECORD_NOT_FOUND: 'DB_3005',
  DB_RECORD_LOCKED: 'DB_3006',
  DB_TIMEOUT: 'DB_3007',
  DB_DECRYPTION_FAILED: 'DB_3008',
  DB_ENCRYPTION_FAILED: 'DB_3009',

  // External Services (4xxx)
  EXT_AI_TIMEOUT: 'EXT_4001',
  EXT_AI_RATE_LIMITED: 'EXT_4002',
  EXT_AI_INVALID_RESPONSE: 'EXT_4003',
  EXT_AI_SERVICE_UNAVAILABLE: 'EXT_4004',
  EXT_STORAGE_UPLOAD_FAILED: 'EXT_4005',
  EXT_STORAGE_DOWNLOAD_FAILED: 'EXT_4006',
  EXT_EMAIL_SEND_FAILED: 'EXT_4007',
  EXT_PUSH_NOTIFICATION_FAILED: 'EXT_4008',
  EXT_REDIS_UNAVAILABLE: 'EXT_4009',

  // Business Logic (5xxx)
  BIZ_ACTIVITY_LOG_FAILED: 'BIZ_5001',
  BIZ_REMINDER_CREATE_FAILED: 'BIZ_5002',
  BIZ_NOTIFICATION_SEND_FAILED: 'BIZ_5003',
  BIZ_TASK_MERGE_FAILED: 'BIZ_5004',
  BIZ_TEMPLATE_APPLY_FAILED: 'BIZ_5005',
  BIZ_OPPORTUNITY_DISMISS_FAILED: 'BIZ_5006',
  BIZ_CUSTOMER_LINK_FAILED: 'BIZ_5007',
  BIZ_DUPLICATE_DETECTED: 'BIZ_5008',

  // Agency & Multi-Tenancy (6xxx)
  AGENCY_NOT_FOUND: 'AGENCY_6001',
  AGENCY_CONTEXT_MISSING: 'AGENCY_6002',
  AGENCY_MEMBER_NOT_FOUND: 'AGENCY_6003',
  AGENCY_INVITATION_EXPIRED: 'AGENCY_6004',
  AGENCY_INVITATION_INVALID: 'AGENCY_6005',
  AGENCY_PERMISSION_DENIED: 'AGENCY_6006',
  AGENCY_ROLE_INVALID: 'AGENCY_6007',

  // File & Upload (7xxx)
  FILE_PARSING_FAILED: 'FILE_7001',
  FILE_EMPTY: 'FILE_7002',
  FILE_CORRUPTED: 'FILE_7003',
  FILE_UNSUPPORTED_FORMAT: 'FILE_7004',
  FILE_NO_DATA_FOUND: 'FILE_7005',
  FILE_RACE_CONDITION: 'FILE_7006',

  // Rate Limiting & Security (8xxx)
  RATE_LIMIT_EXCEEDED: 'RATE_8001',
  CSRF_TOKEN_INVALID: 'RATE_8002',
  CSRF_TOKEN_MISSING: 'RATE_8003',
  REQUEST_TOO_LARGE: 'RATE_8004',
  SUSPICIOUS_ACTIVITY: 'RATE_8005',

  // Internal/Server (9xxx)
  INTERNAL_ERROR: 'INT_9001',
  INTERNAL_CONFIG_MISSING: 'INT_9002',
  INTERNAL_DEPENDENCY_FAILED: 'INT_9003',
  INTERNAL_TIMEOUT: 'INT_9004',
  INTERNAL_RESOURCE_EXHAUSTED: 'INT_9005',
} as const;

export type ErrorId = typeof ErrorIds[keyof typeof ErrorIds];

/**
 * Error metadata for additional context
 */
export interface ErrorMetadata {
  userId?: string;
  userName?: string;
  agencyId?: string;
  resourceId?: string;
  resourceType?: string;
  operation?: string;
  details?: Record<string, unknown>;
}

/**
 * Get human-readable error message for an error ID
 */
export function getErrorMessage(errorId: ErrorId, customMessage?: string): string {
  if (customMessage) return customMessage;

  const messages: Record<ErrorId, string> = {
    // Auth
    [ErrorIds.AUTH_MISSING_CREDENTIALS]: 'Missing authentication credentials',
    [ErrorIds.AUTH_INVALID_CREDENTIALS]: 'Invalid username or password',
    [ErrorIds.AUTH_ACCOUNT_LOCKED]: 'Account temporarily locked due to multiple failed attempts',
    [ErrorIds.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
    [ErrorIds.AUTH_SESSION_INVALID]: 'Invalid session. Please log in again.',
    [ErrorIds.AUTH_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
    [ErrorIds.AUTH_USER_NOT_FOUND]: 'User not found',
    [ErrorIds.AUTH_PIN_FORMAT_INVALID]: 'PIN must be 4 digits',
    [ErrorIds.AUTH_LOCKOUT_SYSTEM_UNAVAILABLE]: 'Authentication system temporarily unavailable',

    // Validation
    [ErrorIds.VALIDATION_MISSING_FIELD]: 'Required field is missing',
    [ErrorIds.VALIDATION_INVALID_FORMAT]: 'Invalid data format',
    [ErrorIds.VALIDATION_OUT_OF_RANGE]: 'Value is out of acceptable range',
    [ErrorIds.VALIDATION_DUPLICATE_ENTRY]: 'This entry already exists',
    [ErrorIds.VALIDATION_RELATIONSHIP_VIOLATED]: 'Related record constraint violated',
    [ErrorIds.VALIDATION_FILE_TOO_LARGE]: 'File size exceeds maximum allowed',
    [ErrorIds.VALIDATION_FILE_TYPE_INVALID]: 'File type not supported',
    [ErrorIds.VALIDATION_MALFORMED_JSON]: 'Invalid JSON format',

    // Database
    [ErrorIds.DB_CONNECTION_FAILED]: 'Database connection failed',
    [ErrorIds.DB_QUERY_FAILED]: 'Database query failed',
    [ErrorIds.DB_TRANSACTION_FAILED]: 'Database transaction failed',
    [ErrorIds.DB_CONSTRAINT_VIOLATED]: 'Database constraint violated',
    [ErrorIds.DB_RECORD_NOT_FOUND]: 'Record not found',
    [ErrorIds.DB_RECORD_LOCKED]: 'Record is currently locked by another operation',
    [ErrorIds.DB_TIMEOUT]: 'Database operation timed out',
    [ErrorIds.DB_DECRYPTION_FAILED]: 'Failed to decrypt sensitive data',
    [ErrorIds.DB_ENCRYPTION_FAILED]: 'Failed to encrypt sensitive data',

    // External Services
    [ErrorIds.EXT_AI_TIMEOUT]: 'AI service timed out',
    [ErrorIds.EXT_AI_RATE_LIMITED]: 'AI service rate limit exceeded',
    [ErrorIds.EXT_AI_INVALID_RESPONSE]: 'AI service returned invalid response',
    [ErrorIds.EXT_AI_SERVICE_UNAVAILABLE]: 'AI service is currently unavailable',
    [ErrorIds.EXT_STORAGE_UPLOAD_FAILED]: 'File upload failed',
    [ErrorIds.EXT_STORAGE_DOWNLOAD_FAILED]: 'File download failed',
    [ErrorIds.EXT_EMAIL_SEND_FAILED]: 'Failed to send email',
    [ErrorIds.EXT_PUSH_NOTIFICATION_FAILED]: 'Failed to send push notification',
    [ErrorIds.EXT_REDIS_UNAVAILABLE]: 'Cache service unavailable',

    // Business Logic
    [ErrorIds.BIZ_ACTIVITY_LOG_FAILED]: 'Failed to log activity',
    [ErrorIds.BIZ_REMINDER_CREATE_FAILED]: 'Failed to create reminder',
    [ErrorIds.BIZ_NOTIFICATION_SEND_FAILED]: 'Failed to send notification',
    [ErrorIds.BIZ_TASK_MERGE_FAILED]: 'Failed to merge tasks',
    [ErrorIds.BIZ_TEMPLATE_APPLY_FAILED]: 'Failed to apply template',
    [ErrorIds.BIZ_OPPORTUNITY_DISMISS_FAILED]: 'Failed to dismiss opportunity',
    [ErrorIds.BIZ_CUSTOMER_LINK_FAILED]: 'Failed to link customer',
    [ErrorIds.BIZ_DUPLICATE_DETECTED]: 'Duplicate entry detected',

    // Agency
    [ErrorIds.AGENCY_NOT_FOUND]: 'Agency not found',
    [ErrorIds.AGENCY_CONTEXT_MISSING]: 'Agency context missing',
    [ErrorIds.AGENCY_MEMBER_NOT_FOUND]: 'Agency member not found',
    [ErrorIds.AGENCY_INVITATION_EXPIRED]: 'Invitation has expired',
    [ErrorIds.AGENCY_INVITATION_INVALID]: 'Invalid invitation',
    [ErrorIds.AGENCY_PERMISSION_DENIED]: 'Permission denied for this agency',
    [ErrorIds.AGENCY_ROLE_INVALID]: 'Invalid agency role',

    // File
    [ErrorIds.FILE_PARSING_FAILED]: 'Failed to parse file',
    [ErrorIds.FILE_EMPTY]: 'File is empty',
    [ErrorIds.FILE_CORRUPTED]: 'File is corrupted',
    [ErrorIds.FILE_UNSUPPORTED_FORMAT]: 'Unsupported file format',
    [ErrorIds.FILE_NO_DATA_FOUND]: 'No data found in file',
    [ErrorIds.FILE_RACE_CONDITION]: 'File operation conflict detected',

    // Rate Limiting
    [ErrorIds.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
    [ErrorIds.CSRF_TOKEN_INVALID]: 'Invalid security token',
    [ErrorIds.CSRF_TOKEN_MISSING]: 'Security token missing',
    [ErrorIds.REQUEST_TOO_LARGE]: 'Request size too large',
    [ErrorIds.SUSPICIOUS_ACTIVITY]: 'Suspicious activity detected',

    // Internal
    [ErrorIds.INTERNAL_ERROR]: 'An internal error occurred',
    [ErrorIds.INTERNAL_CONFIG_MISSING]: 'Server configuration missing',
    [ErrorIds.INTERNAL_DEPENDENCY_FAILED]: 'Required service unavailable',
    [ErrorIds.INTERNAL_TIMEOUT]: 'Operation timed out',
    [ErrorIds.INTERNAL_RESOURCE_EXHAUSTED]: 'Server resources exhausted',
  };

  return messages[errorId] || 'An unexpected error occurred';
}

/**
 * Check if an error ID is a client error (4xx)
 */
export function isClientError(errorId: ErrorId): boolean {
  return errorId.startsWith('AUTH_') ||
    errorId.startsWith('VAL_') ||
    errorId.startsWith('AGENCY_') ||
    errorId.startsWith('RATE_');
}

/**
 * Check if an error ID is a server error (5xx)
 */
export function isServerError(errorId: ErrorId): boolean {
  return errorId.startsWith('DB_') ||
    errorId.startsWith('EXT_') ||
    errorId.startsWith('BIZ_') ||
    errorId.startsWith('INT_') ||
    errorId.startsWith('FILE_');
}

/**
 * Get HTTP status code for an error ID
 */
export function getStatusCode(errorId: ErrorId): number {
  // Authentication errors
  if (errorId === ErrorIds.AUTH_ACCOUNT_LOCKED) return 429;
  if (errorId === ErrorIds.AUTH_INSUFFICIENT_PERMISSIONS) return 403;
  if (errorId.startsWith('AUTH_')) return 401;

  // Validation errors
  if (errorId.startsWith('VAL_')) return 400;

  // Not found
  if (errorId === ErrorIds.DB_RECORD_NOT_FOUND ||
      errorId === ErrorIds.AGENCY_NOT_FOUND ||
      errorId === ErrorIds.AGENCY_MEMBER_NOT_FOUND ||
      errorId === ErrorIds.AUTH_USER_NOT_FOUND) return 404;

  // Rate limiting
  if (errorId === ErrorIds.RATE_LIMIT_EXCEEDED) return 429;

  // Conflict/Race conditions
  if (errorId === ErrorIds.DB_RECORD_LOCKED ||
      errorId === ErrorIds.FILE_RACE_CONDITION ||
      errorId === ErrorIds.BIZ_DUPLICATE_DETECTED) return 409;

  // File size
  if (errorId === ErrorIds.VALIDATION_FILE_TOO_LARGE ||
      errorId === ErrorIds.REQUEST_TOO_LARGE) return 413;

  // Service unavailable
  if (errorId === ErrorIds.EXT_AI_SERVICE_UNAVAILABLE ||
      errorId === ErrorIds.EXT_REDIS_UNAVAILABLE ||
      errorId === ErrorIds.INTERNAL_DEPENDENCY_FAILED ||
      errorId === ErrorIds.AUTH_LOCKOUT_SYSTEM_UNAVAILABLE) return 503;

  // Timeout
  if (errorId === ErrorIds.DB_TIMEOUT ||
      errorId === ErrorIds.EXT_AI_TIMEOUT ||
      errorId === ErrorIds.INTERNAL_TIMEOUT) return 504;

  // Default to 500 for server errors
  if (isServerError(errorId)) return 500;

  // Default to 400 for client errors
  return 400;
}
