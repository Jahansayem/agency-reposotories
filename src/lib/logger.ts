/**
 * Unified Centralized Logging System
 *
 * Provides structured logging with different severity levels,
 * automatic PII redaction, and error tracking integration with Sentry.
 *
 * Features:
 * - Automatic sensitive data sanitization
 * - Sentry integration for errors and breadcrumbs
 * - Structured JSON logging in production
 * - Log level filtering via LOG_LEVEL environment variable
 * - Performance tracking utilities
 */

import * as Sentry from '@sentry/nextjs';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Log level hierarchy for filtering
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Get current log level from environment
 * Defaults to 'info' in production, 'debug' in development
 */
function getCurrentLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
}

/**
 * Check if a log level should be emitted based on current threshold
 */
function shouldLog(level: LogLevel): boolean {
  const current = getCurrentLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[current];
}

export interface LogContext {
  userId?: string;
  action?: string;
  component?: string;
  duration?: number;
  ip?: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
  // Allow any additional fields for flexibility
  [key: string]: unknown;
}

/**
 * Sensitive data patterns to filter from logs
 */
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // SSN patterns
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
  { pattern: /\b\d{9}\b/g, replacement: '[POSSIBLE SSN REDACTED]' },
  // Credit card patterns
  { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD REDACTED]' },
  // PIN patterns (4-6 digits that look like PINs)
  { pattern: /\bpin[_\s]*[:=]\s*['"]?\d{4,6}['"]?/gi, replacement: 'pin=[PIN REDACTED]' },
  { pattern: /pin_hash['"]*\s*[:=]\s*['"][^'"]+['"]/gi, replacement: 'pin_hash=[HASH REDACTED]' },
  // Session tokens
  { pattern: /session[_\s]*token['"]*\s*[:=]\s*['"][^'"]+['"]/gi, replacement: 'session_token=[TOKEN REDACTED]' },
  { pattern: /bearer\s+[a-zA-Z0-9_\-\.]+/gi, replacement: 'Bearer [TOKEN REDACTED]' },
  // API keys
  { pattern: /api[_\s]*key['"]*\s*[:=]\s*['"][^'"]+['"]/gi, replacement: 'api_key=[KEY REDACTED]' },
  { pattern: /x-api-key['"]*\s*[:=]\s*['"][^'"]+['"]/gi, replacement: 'x-api-key=[KEY REDACTED]' },
  // Passwords
  { pattern: /password['"]*\s*[:=]\s*['"][^'"]+['"]/gi, replacement: 'password=[REDACTED]' },
  // Email addresses (partial redaction)
  { pattern: /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, replacement: '[EMAIL REDACTED]' },
  // Policy numbers (common insurance format)
  { pattern: /\b[A-Z]{2,3}\d{6,10}\b/g, replacement: '[POLICY# REDACTED]' },
  // Account numbers
  { pattern: /account[_\s]*(?:number|num|#)?['"]*\s*[:=]\s*['"]?\d{6,}['"]?/gi, replacement: 'account=[ACCT REDACTED]' },
];

/**
 * Sanitize sensitive data from log messages and context
 * Includes depth limiting to prevent infinite recursion
 */
function sanitizeSensitiveData(input: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized = input;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    // Truncate very long strings
    if (sanitized.length > 1000) {
      return sanitized.substring(0, 1000) + '...[TRUNCATED]';
    }
    return sanitized;
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (input instanceof Error) {
    return {
      name: input.name,
      message: sanitizeSensitiveData(input.message, depth + 1),
      // Only include stack in development
      ...(process.env.NODE_ENV !== 'production' && { stack: input.stack }),
    };
  }

  if (Array.isArray(input)) {
    // Limit array size to prevent huge logs
    return input.slice(0, 100).map(item => sanitizeSensitiveData(item, depth + 1));
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      // Redact known sensitive field names entirely
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('pin') || // Catches pin, pin_hash, etc.
        lowerKey.includes('secret') ||
        (lowerKey.includes('token') && !lowerKey.includes('csrf')) ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('apikey') ||
        lowerKey === 'ssn' ||
        lowerKey === 'creditcard' ||
        lowerKey === 'cardnumber' ||
        lowerKey === 'authorization' ||
        lowerKey === 'auth' ||
        lowerKey === 'credentials' ||
        lowerKey === 'credit_card' ||
        lowerKey === 'social_security' ||
        lowerKey === 'cookie' ||
        lowerKey === 'private_key' ||
        lowerKey === 'secret_key'
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeSensitiveData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return input;
}

/**
 * Format log entry for output
 * JSON in production for log aggregation, human-readable in development
 */
function formatLogOutput(level: LogLevel, message: string, context?: LogContext): string {
  const sanitizedMessage = sanitizeSensitiveData(message) as string;
  const sanitizedContext = sanitizeSensitiveData(context) as LogContext | undefined;

  if (process.env.NODE_ENV === 'production') {
    // JSON format for production (better for log aggregation)
    const logEntry = {
      level,
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      ...sanitizedContext,
    };
    return JSON.stringify(logEntry);
  } else {
    // Human-readable format for development
    const prefix = `[${level.toUpperCase()}]`;
    const extras = sanitizedContext && Object.keys(sanitizedContext).length > 0
      ? '\n' + JSON.stringify(sanitizedContext, null, 2)
      : '';
    return `${prefix} ${sanitizedMessage}${extras}`;
  }
}

class Logger {
  /**
   * Debug level logging - only in development
   * Automatically sanitizes sensitive data
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.DEBUG)) {
      return;
    }

    const formatted = formatLogOutput(LogLevel.DEBUG, message, context);
    console.debug(formatted);
  }

  /**
   * Info level logging - general information
   * Automatically sanitizes sensitive data
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.INFO)) {
      return;
    }

    const formatted = formatLogOutput(LogLevel.INFO, message, context);
    console.info(formatted);
  }

  /**
   * Warning level logging - potential issues
   * Automatically sanitizes sensitive data
   * Sends breadcrumb to Sentry
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.WARN)) {
      return;
    }

    const sanitizedMessage = sanitizeSensitiveData(message) as string;
    const sanitizedContext = sanitizeSensitiveData(context) as LogContext | undefined;

    const formatted = formatLogOutput(LogLevel.WARN, message, context);
    console.warn(formatted);

    // Send to Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'warning',
      message: sanitizedMessage,
      level: 'warning',
      data: sanitizedContext,
    });
  }

  /**
   * Error level logging - critical issues
   * Accepts Error object or any unknown error value
   * Automatically sanitizes sensitive data
   * Sends exception to Sentry
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!shouldLog(LogLevel.ERROR)) {
      return;
    }

    const sanitizedMessage = sanitizeSensitiveData(message) as string;
    const sanitizedContext = sanitizeSensitiveData(context) as LogContext | undefined;

    // Sanitize error message but preserve stack trace structure
    const errorObj = error instanceof Error ? error : new Error(String(error ?? message));
    const sanitizedErrorMessage = sanitizeSensitiveData(errorObj.message) as string;
    const sanitizedError = new Error(sanitizedErrorMessage);
    sanitizedError.stack = errorObj.stack;

    const formatted = formatLogOutput(LogLevel.ERROR, message, {
      ...context,
      error: sanitizedError.message
    });
    console.error(formatted);

    // Send to Sentry
    Sentry.captureException(sanitizedError, {
      extra: { message: sanitizedMessage, ...sanitizedContext },
      tags: {
        component: sanitizedContext?.component,
        action: sanitizedContext?.action,
      },
    });
  }

  /**
   * Security event logging - for auth failures and security incidents
   * Always logs regardless of environment
   */
  security(event: string, context?: LogContext & { ip?: string; endpoint?: string }): void {
    const sanitizedContext = sanitizeSensitiveData(context) as LogContext | undefined;
    const timestamp = new Date().toISOString();
    console.warn(`[SECURITY] ${timestamp} ${event}`, sanitizedContext);

    // Always send security events to Sentry
    Sentry.addBreadcrumb({
      category: 'security',
      message: event,
      level: 'warning',
      data: sanitizedContext,
    });
  }

  /**
   * Performance logging - track slow operations
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const logMessage = `[PERF] ${operation} took ${duration}ms`;

    if (duration > 1000) {
      // Log slow operations as warnings
      this.warn(logMessage, { ...context, duration });
    } else if (process.env.NODE_ENV === 'development') {
      this.debug(logMessage, { ...context, duration });
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(): () => number {
    const start = performance.now();
    return () => performance.now() - start;
  }

  /**
   * Log an API request (sanitized)
   * Useful for tracking API usage patterns
   */
  apiRequest(
    method: string,
    path: string,
    data?: {
      userId?: string;
      ip?: string;
      userAgent?: string;
      statusCode?: number;
      duration?: number;
    }
  ): void {
    this.info(`${method} ${path}`, {
      type: 'api_request',
      ...data,
    });
  }

  /**
   * Log an AI API call
   * Useful for tracking AI service usage and costs
   */
  aiCall(
    endpoint: string,
    data?: {
      userId?: string;
      model?: string;
      inputTokens?: number;
      outputTokens?: number;
      duration?: number;
    }
  ): void {
    this.info(`AI Call: ${endpoint}`, {
      type: 'ai_call',
      ...data,
    });
  }
}

export const logger = new Logger();

/**
 * Decorator for async functions to automatically log errors
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: { component: string; action: string }
): T {
  return (async (...args: Parameters<T>) => {
    const timer = logger.startTimer();

    try {
      const result = await fn(...args);
      const duration = timer();

      logger.performance(
        `${context.component}.${context.action}`,
        duration,
        context
      );

      return result;
    } catch (error) {
      logger.error(
        `Error in ${context.component}.${context.action}`,
        error as Error,
        context
      );
      throw error;
    }
  }) as T;
}

// Note: Error boundary HOC is implemented in src/components/ErrorBoundary.tsx
// Use that component directly for React error boundary functionality
