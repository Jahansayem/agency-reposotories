# Console to Logger Migration Guide

**Date:** 2026-02-06
**Status:** In Progress
**Total Console Statements:** 173
**Priority:** Medium (Code Quality Improvement)

---

## Overview

This guide provides a systematic approach to replacing all `console` statements with the structured `logger` utility. The logger provides:
- Structured logging with context
- Log levels (debug, info, warn, error)
- Error tracking with stack traces
- Component/module tagging
- Production-safe output filtering

---

## Migration Strategy

### Phase 1: Critical API Routes (Priority: HIGH)
Replace console statements in API routes where errors could impact production operations.

**Files to migrate:**
```
src/app/api/analytics/ai-upload/route.ts          (21 instances) - CRITICAL
src/app/api/webhooks/clerk/route.ts               (8 instances)
src/app/api/analytics/cross-sell/route.ts         (8 instances)
src/app/api/analytics/upload/route.ts             (6 instances)
src/app/api/analytics/calendar/route.ts           (6 instances)
src/app/api/opportunities/[id]/contact/route.ts   (5 instances)
src/app/api/analytics/cross-sell/generate-tasks/route.ts (4 instances)
```

**Total:** ~58 instances in API routes

### Phase 2: Core Libraries (Priority: MEDIUM)
Replace console statements in shared libraries that are used across the application.

**Files to migrate:**
```
src/lib/db/offlineSync.ts            (13 instances)
src/lib/webPushService.ts            (5 instances)
src/lib/taskNotifications.ts         (5 instances)
src/lib/summaryGenerator.ts          (4 instances)
src/lib/secureLogger.ts              (3 instances)
src/lib/microInteractions.ts         (3 instances)
```

**Total:** ~33 instances in libraries

### Phase 3: Components & Hooks (Priority: LOW)
Replace console statements in UI components and hooks (primarily debug logging).

**Files to migrate:**
```
src/components/ServiceWorkerRegistration.tsx  (8 instances)
src/components/MainApp.tsx                    (3 instances)
src/hooks/usePerformanceMonitor.ts            (3 instances)
src/hooks/useOfflineSupport.ts                (3 instances)
src/reference/*                               (~25 instances)
```

**Total:** ~82 instances in components/hooks

---

## Replacement Patterns

### Pattern 1: console.log → logger.debug

**Before:**
```typescript
console.log('Processing customer data', { count: customers.length });
```

**After:**
```typescript
logger.debug('Processing customer data', {
  component: 'AnalyticsUpload',
  customerCount: customers.length
});
```

**When to use:**
- Development/debug information
- Non-critical informational logs
- Temporary debugging statements

---

### Pattern 2: console.info → logger.info

**Before:**
```typescript
console.info(`Uploaded ${successCount} customers successfully`);
```

**After:**
```typescript
logger.info('Customer upload completed', {
  component: 'AnalyticsUpload',
  successCount,
  failedCount,
  totalProcessed
});
```

**When to use:**
- Important operational events
- Successful completions
- Milestone achievements

---

### Pattern 3: console.warn → logger.warn

**Before:**
```typescript
console.warn('Duplicate customer found:', customerName);
```

**After:**
```typescript
logger.warn('Duplicate customer detected during upload', {
  component: 'AnalyticsUpload',
  customerName: customerName.substring(0, 20), // Truncate PII
  action: 'skipped'
});
```

**When to use:**
- Recoverable errors
- Data quality issues
- Deprecated API usage
- Performance concerns

---

### Pattern 4: console.error → logger.error

**Before:**
```typescript
console.error('Failed to parse Excel file:', error);
```

**After:**
```typescript
logger.error('Excel file parsing failed', error, {
  component: 'AnalyticsUpload',
  fileName: file.name,
  fileSize: file.size,
  mimeType: file.type
});
```

**When to use:**
- Critical errors
- Failed operations
- Exceptions
- Database errors

---

### Pattern 5: console.debug → logger.debug

**Before:**
```typescript
console.debug('Column mapping detected:', mapping);
```

**After:**
```typescript
logger.debug('AI column mapping detected', {
  component: 'AnalyticsUpload',
  mapping: JSON.stringify(mapping, null, 2),
  columnCount: Object.keys(mapping).length
});
```

**When to use:**
- Detailed diagnostic information
- Algorithm steps
- State dumps

---

## Special Cases

### Case 1: Error Objects

**Before:**
```typescript
console.error('Error:', error.message);
```

**After:**
```typescript
// Logger handles Error objects specially - pass as 2nd parameter
logger.error('Operation failed', error, {
  component: 'MyComponent',
  context: 'additional info'
});
```

### Case 2: Multiple Arguments

**Before:**
```typescript
console.log('User:', user.name, 'Role:', user.role);
```

**After:**
```typescript
logger.info('User information logged', {
  component: 'UserManager',
  userName: user.name,
  userRole: user.role
});
```

### Case 3: Sensitive Data

**Before:**
```typescript
console.log('Customer email:', customer.email);
```

**After:**
```typescript
// Sanitize PII before logging
logger.info('Customer record processed', {
  component: 'CustomerManager',
  customerEmail: customer.email ? '[REDACTED]' : 'none',
  hasEmail: !!customer.email
});
```

### Case 4: Performance Timing

**Before:**
```typescript
console.time('upload');
// ... operation
console.timeEnd('upload');
```

**After:**
```typescript
const startTime = Date.now();
// ... operation
const duration = Date.now() - startTime;

logger.info('Upload completed', {
  component: 'AnalyticsUpload',
  durationMs: duration,
  recordsProcessed: count
});
```

---

## Component Tags

Always include a `component` tag to identify the source of the log:

| File Type | Component Tag Example |
|-----------|----------------------|
| API Routes | `'AnalyticsUploadAPI'`, `'TodosAPI'` |
| React Components | `'MainApp'`, `'TodoList'`, `'Dashboard'` |
| Hooks | `'useTodoData'`, `'usePerformanceMonitor'` |
| Libraries | `'OfflineSync'`, `'WebPushService'` |
| Services | `'AIService'`, `'NotificationService'` |

---

## Automated Migration Script

For bulk replacements, use this sed script:

```bash
# WARNING: Review all changes before committing!
# This script does basic replacements but may need manual adjustment

# Replace console.log with logger.debug
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  's/console\.log(/logger.debug(/g'

# Replace console.info with logger.info
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  's/console\.info(/logger.info(/g'

# Replace console.warn with logger.warn
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  's/console\.warn(/logger.warn(/g'

# Replace console.error with logger.error
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  's/console\.error(/logger.error(/g'

# Replace console.debug with logger.debug
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  's/console\.debug(/logger.debug(/g'
```

**Post-script steps:**
1. Add logger import to each modified file
2. Convert argument format to logger style (message + context object)
3. Add component tags
4. Sanitize any PII in logged data
5. Run TypeScript compiler to catch errors
6. Test each modified file

---

## Import Statement

Add this import to each file that uses logger:

```typescript
import { logger } from '@/lib/logger';
```

**For files that already import logger:**
No change needed - just replace console calls.

**For files that don't import logger:**
Add the import at the top with other imports.

---

## Verification Checklist

After migrating a file, verify:

- [ ] Logger is imported
- [ ] All console statements replaced
- [ ] Each log has a descriptive message (not just variable dumps)
- [ ] Context objects include `component` tag
- [ ] No PII (emails, names, etc.) in logs (sanitize or redact)
- [ ] Error objects passed as 2nd parameter (not stringified)
- [ ] TypeScript compiles without errors
- [ ] Log output makes sense in production context

---

## Example Migrations

### Example 1: API Route Error Handling

**Before:**
```typescript
// src/app/api/analytics/ai-upload/route.ts
try {
  const result = await processFile(file);
  console.log('Upload successful:', result.count);
} catch (error) {
  console.error('Upload failed:', error);
  return NextResponse.json({ success: false }, { status: 500 });
}
```

**After:**
```typescript
import { logger } from '@/lib/logger';

try {
  const result = await processFile(file);
  logger.info('AI upload completed successfully', {
    component: 'AIUploadAPI',
    recordCount: result.count,
    fileName: file.name,
    duration: Date.now() - startTime
  });
} catch (error) {
  logger.error('AI upload failed', error, {
    component: 'AIUploadAPI',
    fileName: file.name,
    fileSize: file.size,
    step: 'processing'
  });
  return NextResponse.json({ success: false }, { status: 500 });
}
```

### Example 2: Component Debugging

**Before:**
```typescript
// src/components/MainApp.tsx
useEffect(() => {
  console.log('Current user:', currentUser);
  console.log('Agency:', currentAgency);
}, [currentUser, currentAgency]);
```

**After:**
```typescript
import { logger } from '@/lib/logger';

useEffect(() => {
  logger.debug('User and agency context loaded', {
    component: 'MainApp',
    userId: currentUser?.id,
    userName: currentUser?.name, // OK - not sensitive
    agencyId: currentAgency?.id,
    agencyName: currentAgency?.name
  });
}, [currentUser, currentAgency]);
```

### Example 3: Library Function

**Before:**
```typescript
// src/lib/webPushService.ts
export async function sendPushNotification(userId: string, message: string) {
  console.log(`Sending notification to ${userId}`);
  try {
    await pushClient.send(userId, message);
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
```

**After:**
```typescript
import { logger } from '@/lib/logger';

export async function sendPushNotification(userId: string, message: string) {
  logger.debug('Preparing to send push notification', {
    component: 'WebPushService',
    userId,
    messageLength: message.length
  });

  try {
    await pushClient.send(userId, message);
    logger.info('Push notification sent', {
      component: 'WebPushService',
      userId,
      success: true
    });
  } catch (error) {
    logger.error('Push notification failed', error, {
      component: 'WebPushService',
      userId,
      messageLength: message.length
    });
    throw error; // Re-throw for caller to handle
  }
}
```

---

## Progress Tracking

Use this table to track migration progress:

| File | Console Count | Status | Migrated By | Date |
|------|---------------|--------|-------------|------|
| `src/app/api/analytics/ai-upload/route.ts` | 21 | 🔲 Pending | - | - |
| `src/lib/db/offlineSync.ts` | 13 | 🔲 Pending | - | - |
| `src/components/ServiceWorkerRegistration.tsx` | 8 | 🔲 Pending | - | - |
| `src/app/api/webhooks/clerk/route.ts` | 8 | 🔲 Pending | - | - |
| `src/app/api/analytics/cross-sell/route.ts` | 8 | 🔲 Pending | - | - |
| `src/app/api/analytics/upload/route.ts` | 6 | 🔲 Pending | - | - |
| `src/app/api/analytics/calendar/route.ts` | 6 | 🔲 Pending | - | - |
| `src/lib/webPushService.ts` | 5 | 🔲 Pending | - | - |
| `src/lib/taskNotifications.ts` | 5 | 🔲 Pending | - | - |
| `src/app/api/opportunities/[id]/contact/route.ts` | 5 | 🔲 Pending | - | - |
| ... (remaining files) | ~100 | 🔲 Pending | - | - |

**Legend:**
- 🔲 Pending
- 🔄 In Progress
- ✅ Complete
- ⚠️ Needs Review

---

## Testing After Migration

After migrating a file, test:

1. **Functionality:** Feature still works as expected
2. **Log Output:** Check browser console (dev) / server logs (production)
3. **Error Handling:** Errors still caught and logged properly
4. **TypeScript:** No compilation errors
5. **Performance:** No performance regression from logging overhead

**Test command:**
```bash
# Run TypeScript compiler
npm run build

# Run tests
npm run test

# Check for remaining console statements
grep -r "console\." --include="*.ts" --include="*.tsx" src/
```

---

## Benefits of Migration

After completing this migration:

✅ **Structured Logging:** Consistent log format across codebase
✅ **Searchable:** Easy to grep/filter logs by component or context
✅ **Production-Safe:** Automatic filtering of debug logs in production
✅ **Error Tracking:** Better error context for debugging
✅ **Performance:** Can disable verbose logging in production
✅ **Monitoring:** Integrate with logging services (Sentry, Datadog, etc.)

---

## Next Steps

1. Start with Phase 1 (Critical API Routes) - highest impact
2. Complete one file at a time to maintain quality
3. Review each migration for PII and sensitive data
4. Run tests after each file migration
5. Track progress in the table above

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Estimated Completion Time:** 4-6 hours for all 173 instances
**Recommended Approach:** Incremental migration over 2-3 sessions
