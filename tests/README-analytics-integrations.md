# Analytics Integrations E2E Tests

Comprehensive test suite for P0-P4 analytics integrations.

## Test Coverage

### P0: Clickable Segment Cards (4 tests)
- ✅ Segment cards are clickable
- ✅ Elite card navigates to filtered customers
- ✅ Premium card navigation
- ✅ Customer count consistency

### P1: Customer Detail Links (6 tests)
- ✅ Customer names clickable in TodayOpportunitiesPanel
- ✅ Opens CustomerDetailPanel modal
- ✅ Shows products and opportunities
- ✅ ESC key closes modal
- ✅ Backdrop click closes modal
- ✅ Correct customer data displayed

### P2: Bidirectional Navigation (7 tests)
- ✅ "View All Opportunities" button visible
- ✅ Navigation to CustomerLookupView
- ✅ Initial sort is renewal_date
- ✅ "Due Today" filter chip present
- ✅ Filter functionality
- ✅ Auto-enables renewal_date sort
- ✅ Pulse animation on active filter

### P3: Data Flow Banner (6 tests)
- ✅ Banner visible in Analytics header
- ✅ Shows customer and dashboard counts
- ✅ Expand/collapse functionality
- ✅ Flow diagram display
- ✅ Responsive design (desktop/mobile)

### P4: Constants Consolidation (3 tests)
- ✅ Consistent styling across views
- ✅ Color matching in segmentation and lookup
- ✅ All operations work after refactoring

### Visual Regression (4 tests)
- ✅ Customer Segmentation Dashboard screenshot
- ✅ Today Opportunities Panel screenshot
- ✅ Customer Lookup View screenshot
- ✅ Data Flow Banner (collapsed/expanded) screenshots

### Accessibility (3 tests)
- ✅ ARIA labels on segment cards
- ✅ Keyboard navigation
- ✅ Modal keyboard accessibility

## Total Tests: 33

## Running Tests

### Run all analytics integration tests:
```bash
npx playwright test analytics-integrations.spec.ts
```

### Run specific test group:
```bash
# P0 tests only
npx playwright test analytics-integrations.spec.ts -g "P0:"

# P1 tests only
npx playwright test analytics-integrations.spec.ts -g "P1:"

# Visual regression only
npx playwright test analytics-integrations.spec.ts -g "Visual"

# Accessibility only
npx playwright test analytics-integrations.spec.ts -g "A11y"
```

### Run with UI mode (for debugging):
```bash
npx playwright test analytics-integrations.spec.ts --ui
```

### Run in headed mode (see browser):
```bash
npx playwright test analytics-integrations.spec.ts --headed
```

### Run specific browser:
```bash
npx playwright test analytics-integrations.spec.ts --project=chromium
npx playwright test analytics-integrations.spec.ts --project=firefox
npx playwright test analytics-integrations.spec.ts --project=webkit
```

## Test Data Requirements

These tests require:
1. **Derrick user account** with PIN `8008`
2. **Customer data** imported in the system (for real data tests)
3. **Running dev server**: `npm run dev`

If no customer data exists, tests will verify fallback to demo data behavior.

## Screenshots

Visual regression screenshots are saved to:
- `.playwright-mcp/analytics-segmentation-dashboard.png`
- `.playwright-mcp/analytics-opportunities-panel.png`
- `.playwright-mcp/analytics-customer-lookup.png`
- `.playwright-mcp/data-flow-banner-collapsed.png`
- `.playwright-mcp/data-flow-banner-expanded.png`

## Known Issues

### Test Timeouts
Some tests may timeout if:
- Navigation elements use different selectors than expected
- Data is still loading when test checks for elements
- Server is slow to respond

**Solution**: Increase timeout or add more wait time in helper functions.

### Missing Elements
Tests may fail if:
- Features are not yet implemented
- Elements don't have expected text or data attributes
- Styling changes affect element selection

**Solution**: Update selectors or add `data-testid` attributes to components.

## Adding Data TestIDs

To improve test reliability, add these `data-testid` attributes to components:

### CustomerSegmentationDashboard.tsx
```tsx
// Segment cards
<button data-testid={`segment-card-${segment}`}>

// Refresh button
<button data-testid="refresh-segmentation">
```

### TodayOpportunitiesPanel.tsx
```tsx
// Customer name links
<button data-testid={`customer-link-${opportunity.customerId}`}>

// View all button
<button data-testid="view-all-opportunities">
```

### CustomerLookupView.tsx
```tsx
// Segment filters
<button data-testid={`segment-filter-${segment}`}>

// Due Today filter
<button data-testid="filter-due-today">

// Sort dropdown
<select data-testid="customer-sort">
```

### DataFlowBanner.tsx
```tsx
// Main banner button
<button data-testid="data-flow-banner-toggle">
```

### CustomerDetailPanel.tsx
```tsx
// Modal container
<div data-testid="customer-detail-modal">

// Close button
<button data-testid="close-customer-detail">
```

## Test Maintenance

When updating features:
1. Update corresponding tests
2. Add new tests for new features
3. Update screenshots if UI changes significantly
4. Re-run full test suite before committing

## CI/CD Integration

These tests run automatically in GitHub Actions on:
- Pull requests
- Pushes to main branch
- Manual workflow dispatch

See `.github/workflows/playwright.yml` for configuration.

## Debugging Failed Tests

### 1. Check test output
```bash
npx playwright test analytics-integrations.spec.ts --reporter=list
```

### 2. View HTML report
```bash
npx playwright show-report
```

### 3. Run in debug mode
```bash
npx playwright test analytics-integrations.spec.ts --debug
```

### 4. Take screenshots on failure
Tests automatically take screenshots on failure. Find them in:
- `test-results/*/test-failed-*.png`

## Performance

Test suite runs in ~5-10 minutes on average hardware:
- **Chromium**: ~3-4 minutes
- **Firefox**: ~3-4 minutes
- **WebKit**: ~3-4 minutes

Parallel execution reduces total time.

## Contributing

When adding new integration tests:
1. Follow existing naming conventions (`P{priority}.{number}: description`)
2. Use helper functions for common actions (login, navigate)
3. Add descriptive console.log statements for debugging
4. Test both success and failure cases
5. Include accessibility checks where applicable
6. Add visual regression tests for new UI

## Related Documentation

- [ORCHESTRATOR.md](../ORCHESTRATOR.md) - Multi-agent orchestration guide
- [CLAUDE.md](../CLAUDE.md) - Developer guide
- [docs/AGENT_WORKFLOWS.md](../docs/AGENT_WORKFLOWS.md) - Agent-specific workflows
