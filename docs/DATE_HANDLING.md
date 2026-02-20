# Date Handling Standards

## Overview

This document defines the standard approach for storing, parsing, and comparing dates across the shared-todo-list application.

## Decision: ISO 8601 Timestamps in UTC (Option B)

We store **full ISO 8601 timestamps in UTC** for all date/time fields in the database.

**Rationale:**
- Industry standard approach
- No timezone ambiguity
- Supports both date-only and timestamp use cases
- Future-proof for time-specific features

## Storage Format

### Database Fields

All date/time columns use one of these PostgreSQL types:
- `TIMESTAMP WITH TIME ZONE` - for full timestamps (created_at, updated_at, etc.)
- `DATE` - for date-only fields (upcoming_renewal, renewal_date, etc.)

### API Format

All dates are transmitted as ISO 8601 strings:

**Full timestamps:**
```
2024-02-20T15:30:00Z
2024-02-20T15:30:00.123Z
```

**Date-only (for due_date, renewal_date, etc.):**
```
2024-02-20
```

## Parsing & Comparison

### Problem: Timezone Ambiguity

When parsing date-only strings like "2024-02-20" with `new Date()`:
```javascript
// ❌ WRONG: Interprets as UTC midnight, not local
new Date("2024-02-20") // -> 2024-02-20T00:00:00Z (UTC midnight)
```

In a user's local timezone (e.g., PST = UTC-8):
- UTC midnight becomes 4:00 PM *the previous day*
- This breaks "due today" comparisons

### Solution: Timezone-Aware Parsing

We use a helper function that handles both formats:

```typescript
/**
 * Parse date string to local Date object, handling both ISO timestamps and date-only strings.
 *
 * Date-only strings (YYYY-MM-DD) are parsed manually to use local timezone.
 * Full ISO timestamps are parsed normally.
 */
function parseDateToLocalTimezone(dueDate: string): Date | null {
  // Check if it's a date-only string (YYYY-MM-DD)
  const dateOnlyMatch = dueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    // Parse manually to avoid UTC interpretation
    const year = parseInt(dateOnlyMatch[1], 10);
    const month = parseInt(dateOnlyMatch[2], 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateOnlyMatch[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  // It's a full ISO timestamp - parse normally
  const parsed = new Date(dueDate);
  return isNaN(parsed.getTime()) ? null : parsed;
}
```

### Implementation Locations

This logic is implemented in:
- `/src/store/todoStore.ts` - `parseDateToLocalTimezone`, `isDueToday`, `isOverdue`
- `/src/components/calendar/constants.ts` - `parseDateToLocalTimezone`, `isTaskOverdue`

## Usage Patterns

### ✅ Correct: Comparison Logic

When comparing dates for "due today" or "overdue":

```typescript
// Good: Uses timezone-aware parsing
const isDueToday = (dueDate?: string) => {
  if (!dueDate) return false;
  const parsedDate = parseDateToLocalTimezone(dueDate);
  if (!parsedDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDay = new Date(parsedDate);
  dueDay.setHours(0, 0, 0, 0);

  return dueDay.getTime() === today.getTime();
};
```

### ✅ Correct: Formatting for Display/Storage

When extracting date-only strings for display or database storage:

```typescript
// Good: Extracting YYYY-MM-DD for date input or storage
const dateOnlyStr = new Date().toISOString().split('T')[0];
```

### ❌ Wrong: String Comparison

```typescript
// Bad: String comparison can fail across timezones
const dateOnly = dueDate.split('T')[0];
const todayStr = new Date().toISOString().split('T')[0];
return dateOnly < todayStr; // WRONG
```

## Testing Considerations

When writing unit tests:

```typescript
// Use date-only strings for clarity
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const todos = [
  createMockTodo({ text: 'Due today', due_date: todayStr }),
];
```

Our parsing logic handles this correctly.

## Migration Guide

If you find code using the old pattern:

### Before (Problematic):
```typescript
const dateOnly = dueDate.split('T')[0];
const todayStr = new Date().toISOString().split('T')[0];
if (dateOnly === todayStr) {
  // Due today
}
```

### After (Fixed):
```typescript
const parsedDate = parseDateToLocalTimezone(dueDate);
if (!parsedDate) return false;

const today = new Date();
today.setHours(0, 0, 0, 0);

const dueDay = new Date(parsedDate);
dueDay.setHours(0, 0, 0, 0);

if (dueDay.getTime() === today.getTime()) {
  // Due today
}
```

## Summary

1. **Store:** ISO 8601 timestamps in UTC (or date-only strings for DATE columns)
2. **Parse:** Use `parseDateToLocalTimezone()` for comparisons
3. **Compare:** Always compare timestamps in local timezone
4. **Display:** Extract date-only strings with `.split('T')[0]` for formatting only

## Related Files

- `/src/store/todoStore.ts` - Core date logic
- `/src/components/calendar/constants.ts` - Calendar date logic
- `/tests/unit/hooks/useFilters.test.ts` - Date filtering tests
- `/docs/DATE_HANDLING.md` - This document
