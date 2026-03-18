# Logging Guide

## Overview

The application uses a unified logging system (`src/lib/logger.ts`) that provides structured logging with automatic PII redaction and Sentry integration.

## Features

- **Automatic PII Redaction**: Sensitive data is automatically redacted from logs
- **Sentry Integration**: Errors and warnings are sent to Sentry for monitoring
- **Structured Logging**: JSON format in production, human-readable in development
- **Log Level Filtering**: Control verbosity via `LOG_LEVEL` environment variable
- **Performance Tracking**: Built-in performance measurement utilities

## Basic Usage

```typescript
import { logger } from '@/lib/logger';

// Info logging
logger.info('User logged in', { userId: '123', action: 'login' });

// Warning logging
logger.warn('Rate limit approaching', { userId: '123', requestCount: 95 });

// Error logging
logger.error('Failed to save data', error, { userId: '123', operation: 'save' });

// Debug logging (development only by default)
logger.debug('Processing item', { itemId: '456' });
```

## Log Levels

The logger supports four log levels in order of priority:

1. **DEBUG** - Detailed information, typically only useful during development
2. **INFO** - General informational messages about application flow
3. **WARN** - Warning messages for potential issues
4. **ERROR** - Error messages for failures and exceptions

### Configuring Log Level

Set the `LOG_LEVEL` environment variable:

```bash
LOG_LEVEL=debug npm run dev    # Show all logs
LOG_LEVEL=info npm run dev     # Info and above (default production)
LOG_LEVEL=warn npm run dev     # Warnings and errors only
LOG_LEVEL=error npm run dev    # Errors only
```

Default behavior:
- **Development**: `LOG_LEVEL=debug` (all logs shown)
- **Production**: `LOG_LEVEL=info` (info, warn, error)

## Specialized Logging Methods

### Security Events

```typescript
logger.security('Failed login attempt', {
  ip: '1.2.3.4',
  endpoint: '/api/auth',
  userId: '123'
});
```

Security events are always logged (even in production) and sent to Sentry as breadcrumbs.

### API Requests

```typescript
logger.apiRequest('POST', '/api/todos', {
  userId: '123',
  statusCode: 200,
  duration: 150,
  ip: '1.2.3.4'
});
```

### AI API Calls

```typescript
logger.aiCall('claude', {
  userId: '123',
  model: 'claude-3-5-sonnet',
  inputTokens: 100,
  outputTokens: 50,
  duration: 2500
});
```

### Performance Tracking

```typescript
// Manual timing
const timer = logger.startTimer();
// ... do some work ...
const duration = timer();
logger.performance('Database query', duration, { query: 'SELECT ...' });

// Using the decorator
import { withErrorLogging } from '@/lib/logger';

const myFunction = withErrorLogging(
  async (userId: string) => {
    // Function implementation
  },
  { component: 'UserService', action: 'createUser' }
);
```

## Automatic PII Redaction

The logger automatically redacts sensitive data to prevent PII leakage:

### Field-Based Redaction

Any field with these names (case-insensitive) is redacted:

- `password`, `pin`, `pin_hash`
- `token`, `session_token` (except `csrf_token`)
- `api_key`, `apikey`, `secret`, `secret_key`, `private_key`
- `authorization`, `auth`, `credentials`
- `ssn`, `social_security`
- `credit_card`, `creditcard`, `cardnumber`
- `cookie`

**Example:**
```typescript
logger.info('User data', {
  email: 'user@example.com',  // Redacted from message
  password: 'secret123'        // Redacted with [REDACTED]
});
// Output: email is [EMAIL REDACTED], password field is [REDACTED]
```

### Pattern-Based Redaction

Content is scanned for sensitive patterns:

- **SSN**: `123-45-6789` → `[SSN REDACTED]`
- **Credit Cards**: `4111-1111-1111-1111` → `[CARD REDACTED]`
- **Email Addresses**: `john@example.com` → `[EMAIL REDACTED]`
- **Policy Numbers**: `AB1234567` → `[POLICY# REDACTED]`
- **Account Numbers**: `account: 123456` → `account=[ACCT REDACTED]`
- **Bearer Tokens**: `Bearer abc123` → `Bearer [TOKEN REDACTED]`

### Nested Object Redaction

```typescript
logger.info('Complex data', {
  user: {
    name: 'John',           // Not redacted
    password: 'secret',     // Redacted
    profile: {
      apiKey: 'sk-123'      // Redacted
    }
  }
});
```

### Additional Safety Features

- **Depth Limiting**: Prevents infinite recursion (max depth: 10)
- **String Truncation**: Very long strings (>1000 chars) are truncated
- **Array Limiting**: Large arrays are limited to 100 items
- **Error Sanitization**: Error messages are also sanitized

## Structured Logging Format

### Production (JSON)

```json
{
  "level": "info",
  "message": "User logged in",
  "timestamp": "2026-02-20T14:30:00.000Z",
  "userId": "123",
  "action": "login"
}
```

Benefits:
- Easy to parse with log aggregation tools (Datadog, Splunk, etc.)
- Structured querying
- Consistent format

### Development (Human-Readable)

```
[INFO] User logged in
{
  "userId": "123",
  "action": "login"
}
```

## Sentry Integration

The logger automatically integrates with Sentry:

### Warnings
Sent as breadcrumbs to provide context for errors:
```typescript
logger.warn('API slow response', { endpoint: '/api/todos', duration: 5000 });
// Creates Sentry breadcrumb
```

### Errors
Sent as exceptions with full context:
```typescript
logger.error('Database connection failed', error, {
  component: 'DatabaseService',
  action: 'connect'
});
// Captured in Sentry with tags: component=DatabaseService, action=connect
```

### Security Events
Sent as security-category breadcrumbs:
```typescript
logger.security('Unauthorized access attempt', { endpoint: '/api/admin' });
// Sentry breadcrumb with category: 'security'
```

## Best Practices

### 1. Include Context

Always include relevant context:
```typescript
// Good
logger.error('Failed to update todo', error, {
  todoId: '123',
  userId: '456',
  component: 'TodoService'
});

// Bad
logger.error('Update failed', error);
```

### 2. Use Appropriate Log Levels

- **DEBUG**: Implementation details, variable values
- **INFO**: Business logic flow, successful operations
- **WARN**: Recoverable errors, deprecated usage, approaching limits
- **ERROR**: Failures, exceptions, data loss

### 3. Don't Log Sensitive Data Directly

Let the automatic redaction handle it, but be aware:
```typescript
// Automatic redaction handles this
logger.info('Auth attempt', { pin: '1234' });  // PIN is redacted

// But still avoid logging raw customer data when possible
logger.info('Processing customer', { customerId: '123' }); // Good
logger.info('Customer data', customerObject); // Risk - large objects may contain PII
```

### 4. Use Specialized Methods

```typescript
// Instead of
logger.info('POST /api/todos returned 200 in 150ms');

// Use
logger.apiRequest('POST', '/api/todos', {
  statusCode: 200,
  duration: 150
});
```

### 5. Performance Logging

```typescript
// For slow operations
if (duration > 1000) {
  logger.warn('Slow query detected', { query: 'SELECT ...', duration });
}

// Or use built-in
logger.performance('Query execution', duration, { query: 'SELECT ...' });
```

## Testing

When writing tests that use the logger:

```typescript
import { vi } from 'vitest';
import { logger } from '@/lib/logger';

// Mock console methods to avoid test output
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Your test
logger.info('Test message');
expect(console.info).toHaveBeenCalled();
```

## Migration from Old Loggers

Previously, the codebase had two separate loggers (`logger.ts` and `secureLogger.ts`). These have been unified.

### No Changes Needed

If you were using `logger` from `@/lib/logger`:
- ✅ No changes needed
- ✅ All existing functionality preserved
- ✅ New features available (structured logging, log level filtering)

### If You Were Using `secureLogger`

Replace imports:
```typescript
// Old
import { logger } from '@/lib/secureLogger';

// New
import { logger } from '@/lib/logger';
```

API compatibility:
```typescript
// These all still work
logger.info('Message', { data });
logger.warn('Warning', { data });
logger.error('Error', error, { data });
logger.security('Security event', { data });
logger.apiRequest('POST', '/path', { data });
logger.aiCall('endpoint', { data });
```

## Troubleshooting

### Logs Not Appearing

Check your `LOG_LEVEL`:
```typescript
// Temporarily override for debugging
process.env.LOG_LEVEL = 'debug';
logger.debug('Now you should see this');
```

### PII Not Being Redacted

Verify field names match redaction patterns. Add custom patterns if needed by modifying `SENSITIVE_PATTERNS` in `src/lib/logger.ts`.

### Sentry Not Receiving Events

Ensure Sentry is properly initialized in your app. The logger uses:
- `Sentry.addBreadcrumb()` for warnings
- `Sentry.captureException()` for errors

## Related Files

- **Logger Implementation**: `src/lib/logger.ts`
- **Unit Tests**: `src/lib/logger.test.ts`
- **AI Content Redaction**: `src/lib/logRedaction.ts` (for AI-specific PII handling)
- **Security Test**: `tests/security-utils.test.ts`
