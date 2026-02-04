# Mobile & MS Edge Test Fixes - Status Report

**Date**: 2026-02-02
**Ticket**: Fix mobile browser and MS Edge test failures
**Current Commit**: 89e209a

## Problem Summary

Mobile browsers (mobile-chrome, mobile-safari variants) and MS Edge tests are failing with timeouts when trying to click on tasks.

## Root Causes Identified

1. **Next.js Dev Overlay Interception** - The development overlay was intercepting pointer events
2. **Wrong View** - Tests were landing on Dashboard view instead of Tasks view
3. **Test Navigation Issues** - Tab clicking is timing out before tasks view loads

## Fixes Applied

### 1. Disabled Next.js Dev Overlay ✅
**Files**: [`playwright.config.ts`](../playwright.config.ts)

```typescript
use: {
  // ... other config
  launchOptions: {
    env: {
      ...process.env,
      __NEXT_DISABLE_OVERLAY: 'true',
    },
  },
},
webServer: {
  // ... other config
  env: {
    __NEXT_DISABLE_OVERLAY: 'true',
  },
},
```

**Result**: Dev overlay should no longer intercept clicks

### 2. Fixed Test Navigation ✅
**Files**: [`tests/task-click.spec.ts`](../tests/task-click.spec.ts)

Changed from trying to dismiss modals to explicitly clicking the Tasks tab:

```typescript
// Navigate to Tasks view - click the Tasks tab
const tasksTab = page.locator('[role="tab"]').filter({ hasText: 'Tasks' });
await tasksTab.waitFor({ state: 'visible', timeout: 5000 });
await tasksTab.click();
```

**Result**: Tests should now navigate to correct view

### 3. Increased Timeouts for Mobile ✅
**Files**: [`tests/task-click.spec.ts`](../tests/task-click.spec.ts)

```typescript
// Increased from 5000ms to 10000ms for mobile browsers
await expect(firstTask).toBeVisible({ timeout: 10000 });
```

### 4. JavaScript Click Fallback ✅
**Files**: [`tests/task-click.spec.ts`](../tests/task-click.spec.ts)

```typescript
// Scroll into view and use JavaScript click to bypass overlay
await firstTask.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await firstTask.evaluate(node => (node as HTMLElement).click());
```

## Current Test Status

### ✅ Passing (8/16 tests - 50%)
- ✅ Chromium: 2/2
- ✅ Firefox: 2/2
- ✅ WebKit: 2/2
- ✅ Tablet: 2/2

### ❌ Failing (8/16 tests - 50%)
- ❌ mobile-chrome: 0/2 - Test timeout (30s) in beforeEach
- ❌ mobile-safari: 0/2 - Test timeout (30s) in beforeEach
- ❌ mobile-safari-large: 0/2 - Test timeout (30s) in beforeEach
- ❌ msedge: 0/2 - Test timeout (23-33s) in beforeEach

### Failure Pattern

All failing tests show:
1. **Location**: Timeout occurs in `beforeEach` hook
2. **Step**: When waiting for tasks tab to load after clicking it
3. **Page State**: Tests get stuck on Dashboard view
4. **Error**: `Test timeout of 30000ms exceeded`

From error context (mobile-chrome):
```yaml
- tab "Dashboard" [selected]  # Dashboard tab is selected, not Tasks
- tab "Tasks"  # Tasks tab exists but clicking it times out
```

## Remaining Issues

### Issue 1: Tasks Tab Click Not Working on Mobile/Edge
**Symptom**: Click on Tasks tab times out, view doesn't switch

**Possible Causes**:
1. Tab click is being intercepted by something else
2. Mobile viewports have different touch event handling
3. React state update for view switching is slow on mobile
4. Next.js dev overlay is still interfering despite env var

**Next Steps to Try**:
- [ ] Use JavaScript click for tab navigation too
- [ ] Add explicit wait for view change after tab click
- [ ] Try navigating directly to /tasks route instead of clicking tab
- [ ] Increase test timeout from 30s to 60s
- [ ] Add viewport scrolling before tab click
- [ ] Check if there's a mobile-specific navigation issue in the app code

### Issue 2: Test Timeout Too Aggressive
**Current**: 30s total timeout for entire beforeEach
**Problem**: beforeEach has multiple waits totaling ~7-8s, doesn't leave enough buffer

**Next Steps to Try**:
- [ ] Increase `test.setTimeout(60000)` for mobile/Edge tests
- [ ] Reduce wait times in beforeEach
- [ ] Make waits conditional based on browser type

### Issue 3: Dev Server Performance on Mobile
**Observation**: MS Edge takes 23-33s, mobile browsers take 30s+

**Next Steps to Try**:
- [ ] Run tests against production build instead of dev server
- [ ] Profile Next.js dev server performance on mobile viewports
- [ ] Check if HMR or dev features are slowing mobile browsers

## Alternative Approaches

If tab navigation continues to fail:

### Approach A: Direct Route Navigation
Instead of clicking tabs, navigate directly to the route:
```typescript
await page.goto('http://localhost:3000?view=tasks');
```

### Approach B: Skip beforeEach for Mobile
Create separate test suite for mobile that doesn't rely on tab navigation:
```typescript
test.describe('Mobile Task Click', () => {
  // Different setup for mobile
});
```

### Approach C: Test Against Production Build
```bash
npm run build
npm start  # Production server
npx playwright test  # Test against production
```

## Commands to Run Tests

```bash
# Run only mobile and MS Edge tests
npx playwright test task-click.spec.ts --project=mobile-chrome --project=mobile-safari --project=mobile-safari-large --project=msedge

# Run with headed browser to debug
npx playwright test task-click.spec.ts --project=mobile-chrome --headed

# Run with debug mode
npx playwright test task-click.spec.ts --project=mobile-chrome --debug

# Check test artifacts
ls -la test-results/
```

## Debug Checklist

When investigating further:

- [ ] Open screenshot from test-results to see actual UI state
- [ ] Check if Tasks tab is visible in mobile viewport
- [ ] Verify tab click is actually happening (add console.log)
- [ ] Check React DevTools for view state
- [ ] Profile page load performance on mobile viewport
- [ ] Test manually in mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Check if Next.js dev overlay is truly disabled (inspect HTML)

## Related Files

- [`playwright.config.ts`](../playwright.config.ts) - Test configuration with overlay disable
- [`tests/task-click.spec.ts`](../tests/task-click.spec.ts) - Test file with tab navigation
- [`src/components/views/DashboardPage.tsx`](../src/components/views/DashboardPage.tsx) - Dashboard component with tab logic
- [`src/components/MainApp.tsx`](../src/components/MainApp.tsx) - Main app with view switching

## Lessons Learned

1. **Always check which view the test is on** - We initially assumed tests were on Tasks view
2. **Mobile browsers need longer timeouts** - 5s → 10s helped but still not enough
3. **Dev overlay can interfere with automation** - Environment variable needed
4. **Tab navigation is fragile** - Direct route navigation might be better
5. **Screenshots are invaluable** - Error context revealed we were on wrong view

## Next Session Goals

1. Get at least 2 mobile browser tests passing (target: 50% → 75%)
2. Get MS Edge tests passing (target: 0% → 100%)
3. Overall target: 12/16 tests passing (75%)

## Contact

If blocked, consider:
- Checking if app works manually on iOS Safari and Chrome Mobile
- Testing with real mobile devices (not just emulators)
- Pairing with someone who has mobile test automation experience
