# Task Reordering E2E Tests

Comprehensive Playwright test suite for the manual task reordering feature (Todoist-style drag-and-drop).

## Test Files

### 1. `task-reordering-basic.spec.ts` (Quick Tests)
**Runtime:** ~2-3 minutes
**Purpose:** Basic functionality verification

**Test Coverage:**
- ✅ Circular checkboxes (visual)
- ✅ Drag handle visibility on hover
- ✅ Basic drag-and-drop reordering
- ✅ Order persistence after reload
- ✅ API endpoint integration
- ✅ Visual regression snapshots

**Run:**
```bash
npx playwright test task-reordering-basic
```

### 2. `task-reordering.spec.ts` (Comprehensive Tests)
**Runtime:** ~10-15 minutes
**Purpose:** Full feature validation

**Test Coverage:**

#### Visual Elements
- ✅ Circular checkboxes (border-radius: 50%)
- ✅ Drag handle opacity transitions
- ✅ GripVertical icon rendering

#### Drag and Drop
- ✅ Reorder multiple tasks
- ✅ Optimistic UI updates
- ✅ Drag cancellation (ESC key)

#### Persistence
- ✅ Order saved to database
- ✅ Order persists after reload
- ✅ API calls to `/api/todos/reorder`

#### Real-time Sync
- ✅ Multi-tab synchronization
- ✅ Supabase real-time broadcasts

#### Accessibility
- ✅ ARIA attributes
- ✅ Screen reader announcements
- ✅ Cursor feedback (grab/grabbing)

#### Error Handling
- ✅ Rollback on API failure
- ✅ Error messages displayed
- ✅ Network failure recovery

#### Activity Logging
- ✅ `task_reordered` action logged
- ✅ Activity feed integration

#### Edge Cases
- ✅ Single task handling
- ✅ Completed tasks
- ✅ Filtered tasks

**Run:**
```bash
npx playwright test task-reordering.spec
```

## Running Tests

### Prerequisites

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Ensure test database is seeded** with at least the test user:
   - User: `Derrick`
   - PIN: `8008`

### Run All Reordering Tests
```bash
# All task reordering tests
npx playwright test task-reordering

# With UI (visual mode)
npx playwright test task-reordering --ui

# In headed mode (see browser)
npx playwright test task-reordering --headed

# Specific browser
npx playwright test task-reordering --project=chromium
npx playwright test task-reordering --project=webkit
```

### Run Specific Test Suites
```bash
# Quick smoke tests only
npx playwright test task-reordering-basic

# Full comprehensive suite
npx playwright test task-reordering.spec

# Specific test by name
npx playwright test -g "should have circular checkboxes"
```

### Debug Tests
```bash
# Debug mode (pauses on each step)
npx playwright test task-reordering --debug

# Generate trace
npx playwright test task-reordering --trace on

# View trace
npx playwright show-trace trace.zip
```

## Test Results

### Expected Results (All Passing)

```
✓ Basic Task Reordering (6 tests)
  ✓ should have circular checkboxes
  ✓ should show drag handle on hover
  ✓ should reorder tasks by dragging
  ✓ should persist order after reload
  ✓ should call reorder API endpoint
  ✓ Visual Regression (2 tests)

✓ Task Reordering - Visual Elements (3 tests)
✓ Task Reordering - Drag and Drop (3 tests)
✓ Task Reordering - Persistence (2 tests)
✓ Task Reordering - Real-time Sync (1 test)
✓ Task Reordering - Accessibility (3 tests)
✓ Task Reordering - Error Handling (2 tests)
✓ Task Reordering - Activity Logging (1 test)
✓ Task Reordering - Edge Cases (3 tests)

Total: 24 tests
Passed: 24
Failed: 0
Skipped: 0
```

## Screenshots

Visual regression tests generate screenshots in `tests/screenshots/`:

- `circular-checkbox.png` - Circular checkbox appearance
- `drag-handle.png` - Drag handle on hover

**Review these manually** to verify visual correctness.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests - Task Reordering

on:
  pull_request:
    paths:
      - 'src/components/TodoItem.tsx'
      - 'src/components/TodoList.tsx'
      - 'src/app/api/todos/reorder/**'
      - 'tests/task-reordering*.spec.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run dev &
      - run: npx playwright test task-reordering
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Test Failures

#### "Cannot find element"
**Cause:** App not loaded or test data doesn't exist
**Fix:**
- Ensure dev server is running (`npm run dev`)
- Check test user exists in database
- Increase timeout values

#### "Drag and drop failed"
**Cause:** Browser doesn't support drag events or timing issue
**Fix:**
- Use `force: true` option in `dragTo()`
- Increase wait time before/after drag
- Test in Chromium first (best drag support)

#### "Order not persisted"
**Cause:** Database migration not run or API error
**Fix:**
- Run migration: `supabase/migrations/20260201_add_display_order.sql`
- Check API endpoint is accessible
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set

#### "Real-time sync test fails"
**Cause:** Supabase real-time not configured
**Fix:**
- Check Supabase real-time is enabled for `todos` table
- Verify `ALTER PUBLICATION supabase_realtime ADD TABLE todos;`
- Check network allows WebSocket connections

### Performance Issues

If tests are slow:
1. Run basic tests first: `npx playwright test task-reordering-basic`
2. Use headless mode (faster): Don't use `--headed` flag
3. Run in parallel: `npx playwright test task-reordering --workers=4`
4. Skip visual snapshots if not needed

## Test Data Cleanup

After running tests, you may want to clean up test tasks:

```sql
-- Delete tasks created by tests
DELETE FROM todos WHERE text LIKE '%test%' OR text LIKE '%Test%';

-- Or delete all tasks (if using test database)
TRUNCATE TABLE todos CASCADE;
```

## Coverage Report

To see what code is covered by these tests:

```bash
# Run with coverage (requires nyc or c8)
npx c8 playwright test task-reordering

# View coverage report
open coverage/index.html
```

**Expected Coverage:**
- `TodoItem.tsx`: 85%+ (drag handle, checkbox rendering)
- `TodoList.tsx`: 80%+ (handleDragEnd, API integration)
- `src/app/api/todos/reorder/route.ts`: 90%+ (all reorder modes)

## Related Documentation

- [Feature Implementation](../docs/PIPELINE_TASK_REORDERING.md)
- [API Documentation](../docs/API_DOCUMENTATION.md)
- [Handoff Document](../docs/HANDOFF_TASK_REORDERING_STAGE_1_2_COMPLETE.md)
- [Playwright Docs](https://playwright.dev)

## Contributing

When adding new tests:

1. **Add to basic suite** if it's a critical smoke test
2. **Add to comprehensive suite** for detailed edge cases
3. **Update this README** with new test descriptions
4. **Ensure tests are idempotent** (can run multiple times)
5. **Clean up test data** in afterEach hooks if needed

## Support

If tests fail unexpectedly:
1. Check GitHub Issues for known problems
2. Review Playwright trace: `npx playwright show-trace`
3. Run single test in debug mode: `npx playwright test -g "test name" --debug`
4. Contact: Derrick (Owner) or see `CLAUDE.md` for developer notes

---

**Last Updated:** 2026-02-01
**Test Suite Version:** 1.0
**Feature:** Manual Task Reordering (Todoist-style)
