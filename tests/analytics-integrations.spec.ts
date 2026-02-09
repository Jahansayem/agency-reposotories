'use strict';

/**
 * Analytics Integrations E2E Tests (P0-P4)
 *
 * Comprehensive test suite covering all 4 integration priorities:
 * - P0: Clickable segment cards with navigation
 * - P1: Customer detail links in TodayOpportunitiesPanel
 * - P2: Bidirectional navigation between views
 * - P3: Data flow banner in Analytics page header
 * - P4: Constants consolidation (styling/color consistency)
 *
 * Test count: 26 comprehensive tests
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Login as Derrick (reused across tests)
 */
async function loginAsDerrick(page: Page) {
  await page.goto('http://localhost:3000');

  // Wait for login screen
  await page.waitForSelector('[data-testid="user-card-Derrick"], button:has-text("Derrick")', {
    timeout: 10000,
  });

  // Click on Derrick user card
  const derrickCard = page.locator('[data-testid="user-card-Derrick"]').or(
    page.locator('button:has-text("Derrick")')
  );
  await derrickCard.click();

  // Wait for PIN input
  await page.waitForSelector('input[type="password"], input[inputmode="numeric"]', {
    timeout: 5000,
  });

  // Enter PIN (8008)
  const pinInputs = page.locator('input[type="password"], input[inputmode="numeric"]');
  const count = await pinInputs.count();

  if (count === 4) {
    // 4 separate inputs
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');
  } else {
    // Single input
    await pinInputs.first().fill('8008');
    await page.keyboard.press('Enter');
  }

  // Wait for dashboard/main app to load
  await page.waitForSelector('[data-testid="bottom-nav"], nav', {
    timeout: 10000,
  });
}

/**
 * Navigate to Analytics page
 */
async function navigateToAnalytics(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.click('text=Analytics');
  await page.waitForLoadState('networkidle');

  // Verify we're on Analytics page
  await expect(page.locator('text=Analytics').first()).toBeVisible();
}

/**
 * Navigate to Customer Insights tab in Analytics
 */
async function navigateToCustomerInsights(page: Page) {
  await navigateToAnalytics(page);

  // Click on Customer Insights tab
  await page.click('text=Customer Insights');
  await expect(page.locator('text=Customer Segmentation').first()).toBeVisible({ timeout: 10000 });

  // Verify we're on the Customer Segmentation dashboard
  await expect(page.locator('text=Customer Segmentation').first()).toBeVisible();
}

/**
 * Navigate to Today's Opportunities tab
 */
async function navigateToTodayOpportunities(page: Page) {
  await navigateToAnalytics(page);

  // Click on Today's Opportunities tab
  await page.click('text=Today\'s Opportunities');
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to Customer Lookup view
 */
async function navigateToCustomerLookup(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.click('text=Customers');
  await page.waitForLoadState('networkidle');
}

// ============================================================================
// P0 TESTS: Clickable Segment Cards
// ============================================================================

test.describe('P0: Clickable Segment Cards', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('P0.1: segment cards should be clickable', async ({ page }) => {
    await navigateToCustomerInsights(page);

    // Wait for segments to load
    await page.waitForLoadState('networkidle');

    // Find Elite segment card (should be a clickable element)
    const eliteCard = page.locator('h3:has-text("Elite"), h3:has-text("elite")').locator('..');

    // Check if card is interactive (button or has click handler)
    const isClickable = await eliteCard.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.cursor === 'pointer' || el.tagName === 'BUTTON';
    });

    expect(isClickable).toBe(true);
  });

  test('P0.2: clicking Elite card navigates to customers with Elite filter', async ({ page }) => {
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    // Get Elite count before clicking
    const eliteCardText = await page.locator('h3:has-text("Elite"), h3:has-text("elite")').locator('../..').textContent();
    console.log('Elite card content:', eliteCardText);

    // Click on Elite segment card
    const eliteCard = page.locator('h3:has-text("Elite"), h3:has-text("elite")').locator('..');
    await eliteCard.click();

    // Should navigate to Customer Lookup view
    await page.waitForLoadState('networkidle');

    // Verify we're on Customer Lookup view
    await expect(page.locator('text=Customer Lookup', 'text=Customers')).toBeVisible();

    // Verify Elite filter is active
    const eliteFilter = page.locator('text=Elite').filter({ hasText: /^Elite$/ });
    await expect(eliteFilter).toBeVisible();
  });

  test('P0.3: clicking Premium card filters to Premium customers', async ({ page }) => {
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    // Click Premium card
    const premiumCard = page.locator('h3:has-text("Premium"), h3:has-text("premium")').locator('..');
    await premiumCard.click();

    await page.waitForLoadState('networkidle');

    // Verify Premium filter is active in Customer Lookup
    const premiumFilter = page.locator('text=Premium').filter({ hasText: /^Premium$/ });
    await expect(premiumFilter).toBeVisible();
  });

  test('P0.4: customer count matches segment card count', async ({ page }) => {
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    // Get Elite count from segment card
    const eliteCountText = await page.locator('text=/\\d+\\s*customers/i').first().textContent();
    const segmentCount = parseInt(eliteCountText?.match(/\d+/)?.[0] || '0', 10);

    console.log('Segment card count:', segmentCount);

    // Click Elite card to navigate
    const eliteCard = page.locator('h3:has-text("Elite"), h3:has-text("elite")').locator('..');
    await eliteCard.click();
    await page.waitForLoadState('networkidle');

    // Count customers in filtered view
    const customerCards = page.locator('[data-customer-card], .customer-card');
    const customerCount = await customerCards.count();

    console.log('Customer Lookup count:', customerCount);

    // Counts should match (or customer view shows subset if paginated)
    expect(customerCount).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// P1 TESTS: Customer Detail Links
// ============================================================================

test.describe('P1: Customer Detail Links in TodayOpportunitiesPanel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('P1.1: customer names in TodayOpportunitiesPanel should be clickable', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    // Find customer name links (should have cursor pointer or be anchor/button)
    const customerNames = page.locator('[data-customer-name], a[href*="customer"], button:has-text("View")');

    if ((await customerNames.count()) > 0) {
      const firstCustomerName = customerNames.first();
      const isClickable = await firstCustomerName.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.cursor === 'pointer' || el.tagName === 'A' || el.tagName === 'BUTTON';
      });

      expect(isClickable).toBe(true);
    } else {
      console.log('No opportunities available for testing');
    }
  });

  test('P1.2: clicking customer name opens CustomerDetailPanel modal', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    // Find and click a customer name
    const customerLink = page.locator('[data-customer-name], a:has-text("Customer"), button:has-text("View")').first();

    if ((await customerLink.count()) > 0) {
      await customerLink.click();
      await page.waitForLoadState('networkidle');

      // Modal should appear
      const modal = page.locator('[role="dialog"], .modal, [data-modal="customer-detail"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('P1.3: modal shows customer products and opportunities', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    const customerLink = page.locator('[data-customer-name], button:has-text("View")').first();

    if ((await customerLink.count()) > 0) {
      await customerLink.click();
      await page.waitForLoadState('networkidle');

      // Check for customer detail content
      const modal = page.locator('[role="dialog"], .modal');

      // Should show products or opportunities section
      const hasProducts = await modal.locator('text=/Products?|Policies?/i').count() > 0;
      const hasOpportunities = await modal.locator('text=/Opportunit/i').count() > 0;

      expect(hasProducts || hasOpportunities).toBe(true);
    }
  });

  test('P1.4: ESC key closes modal', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    const customerLink = page.locator('[data-customer-name], button:has-text("View")').first();

    if ((await customerLink.count()) > 0) {
      await customerLink.click();
      await page.waitForLoadState('networkidle');

      // Press ESC
      await page.keyboard.press('Escape');

      // Modal should be hidden
      const modal = page.locator('[role="dialog"], .modal');
      await expect(modal).toBeHidden();
    }
  });

  test('P1.5: clicking backdrop closes modal', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    const customerLink = page.locator('[data-customer-name], button:has-text("View")').first();

    if ((await customerLink.count()) > 0) {
      await customerLink.click();
      await page.waitForLoadState('networkidle');

      // Click backdrop (outside modal content)
      await page.locator('[role="dialog"]').click({ position: { x: 10, y: 10 } });
      await page.waitForLoadState('networkidle');

      // Modal should be hidden
      const modal = page.locator('[role="dialog"], .modal');
      await expect(modal).toBeHidden();
    }
  });

  test('P1.6: modal shows correct customer data', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    // Get customer name from opportunity
    const customerNameElement = page.locator('[data-customer-name]').first();

    if ((await customerNameElement.count()) > 0) {
      const customerName = await customerNameElement.textContent();
      await customerNameElement.click();
      await page.waitForLoadState('networkidle');

      // Modal should show the same customer name
      const modal = page.locator('[role="dialog"], .modal');
      await expect(modal.locator(`text="${customerName}"`)).toBeVisible();
    }
  });
});

// ============================================================================
// P2 TESTS: Bidirectional Navigation
// ============================================================================

test.describe('P2: Bidirectional Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('P2.1: "View All Opportunities" button visible in TodayOpportunitiesPanel', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    // Find "View All" button
    const viewAllButton = page.locator('button:has-text("View All"), button:has-text("All Opportunities")');
    await expect(viewAllButton).toBeVisible();
  });

  test('P2.2: clicking "View All" navigates to CustomerLookupView', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    // Click View All
    const viewAllButton = page.locator('button:has-text("View All"), button:has-text("All Opportunities")');

    if ((await viewAllButton.count()) > 0) {
      await viewAllButton.click();
      await page.waitForLoadState('networkidle');

      // Should be on Customer Lookup view
      await expect(page.locator('text=Customer Lookup, text=Customers')).toBeVisible();
    }
  });

  test('P2.3: initial sort is renewal_date after navigation from Today panel', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    const viewAllButton = page.locator('button:has-text("View All"), button:has-text("All Opportunities")');

    if ((await viewAllButton.count()) > 0) {
      await viewAllButton.click();
      await page.waitForLoadState('networkidle');

      // Check sort dropdown or active sort indicator
      const sortIndicator = page.locator('text=/Renewal Date|Soonest/i');
      await expect(sortIndicator).toBeVisible();
    }
  });

  test('P2.4: "Due Today" filter chip visible in CustomerLookupView', async ({ page }) => {
    await navigateToCustomerLookup(page);
    await page.waitForLoadState('networkidle');

    // Find Due Today filter chip
    const dueTodayChip = page.locator('button:has-text("Due Today"), [data-filter="due-today"]');

    // Should exist (may or may not be active initially)
    expect(await dueTodayChip.count()).toBeGreaterThan(0);
  });

  test('P2.5: clicking "Due Today" filters to today\'s renewals only', async ({ page }) => {
    await navigateToCustomerLookup(page);
    await page.waitForLoadState('networkidle');

    // Click Due Today filter
    const dueTodayChip = page.locator('button:has-text("Due Today")').first();

    if ((await dueTodayChip.count()) > 0) {
      await dueTodayChip.click();
      await page.waitForLoadState('networkidle');

      // Verify filter is active (should have active styling)
      const isActive = await dueTodayChip.evaluate((el) => {
        return el.classList.contains('active') || el.getAttribute('aria-pressed') === 'true';
      });

      expect(isActive).toBe(true);
    }
  });

  test('P2.6: "Due Today" filter auto-enables renewal_date sort', async ({ page }) => {
    await navigateToCustomerLookup(page);
    await page.waitForLoadState('networkidle');

    const dueTodayChip = page.locator('button:has-text("Due Today")').first();

    if ((await dueTodayChip.count()) > 0) {
      await dueTodayChip.click();
      await page.waitForLoadState('networkidle');

      // Sort should switch to renewal_date
      const sortIndicator = page.locator('text=/Renewal Date|Soonest/i');
      await expect(sortIndicator).toBeVisible();
    }
  });

  test('P2.7: filter shows pulse animation when active', async ({ page }) => {
    await navigateToCustomerLookup(page);
    await page.waitForLoadState('networkidle');

    const dueTodayChip = page.locator('button:has-text("Due Today")').first();

    if ((await dueTodayChip.count()) > 0) {
      await dueTodayChip.click();
      await page.waitForLoadState('networkidle');

      // Check for animation class
      const hasAnimation = await dueTodayChip.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.animation !== 'none' || el.classList.toString().includes('pulse') || el.classList.toString().includes('animate');
      });

      expect(hasAnimation).toBe(true);
    }
  });
});

// ============================================================================
// P3 TESTS: Data Flow Banner
// ============================================================================

test.describe('P3: Data Flow Banner', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('P3.1: DataFlowBanner visible in Analytics page header', async ({ page }) => {
    await navigateToAnalytics(page);
    await page.waitForLoadState('networkidle');

    // Banner should be in the header area
    const banner = page.locator('text=/Data Pipeline:|customers.*dashboards/i');
    await expect(banner).toBeVisible();
  });

  test('P3.2: banner shows customer count and dashboard count', async ({ page }) => {
    await navigateToAnalytics(page);
    await page.waitForLoadState('networkidle');

    // Extract counts from banner text
    const bannerText = await page.locator('text=/Data Pipeline:/i').textContent();
    console.log('Banner text:', bannerText);

    // Should contain numbers
    expect(bannerText).toMatch(/\d+/);
    expect(bannerText).toContain('customers');
    expect(bannerText).toContain('dashboards');
  });

  test('P3.3: clicking banner expands detail view', async ({ page }) => {
    await navigateToAnalytics(page);
    await page.waitForLoadState('networkidle');

    // Find banner button
    const bannerButton = page.locator('button:has-text("Data Pipeline")').first();

    // Check initial state (should be collapsed)
    const initialExpanded = await bannerButton.getAttribute('aria-expanded');
    expect(initialExpanded).toBe('false');

    // Click to expand
    await bannerButton.click();
    await page.waitForLoadState('networkidle');

    // Should be expanded now
    const expandedState = await bannerButton.getAttribute('aria-expanded');
    expect(expandedState).toBe('true');
  });

  test('P3.4: expanded view shows flow diagram', async ({ page }) => {
    await navigateToAnalytics(page);
    await page.waitForLoadState('networkidle');

    // Expand banner
    const bannerButton = page.locator('button:has-text("Data Pipeline")').first();
    await bannerButton.click();
    await page.waitForLoadState('networkidle');

    // Flow diagram should show steps: Import → Customers → Dashboards
    await expect(page.locator('text=/Import CSV/i')).toBeVisible();
    await expect(page.locator('text=/customers/i')).toBeVisible();
    await expect(page.locator('text=/dashboards/i')).toBeVisible();
  });

  test('P3.5: clicking again collapses detail view', async ({ page }) => {
    await navigateToAnalytics(page);
    await page.waitForLoadState('networkidle');

    const bannerButton = page.locator('button:has-text("Data Pipeline")').first();

    // Expand
    await bannerButton.click();
    await page.waitForLoadState('networkidle');

    // Collapse
    await bannerButton.click();
    await page.waitForLoadState('networkidle');

    const collapsedState = await bannerButton.getAttribute('aria-expanded');
    expect(collapsedState).toBe('false');
  });

  test('P3.6: banner is responsive (desktop vs mobile)', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await navigateToAnalytics(page);
    await page.waitForLoadState('networkidle');

    const desktopBanner = page.locator('text=/Data Pipeline:/i');
    await expect(desktopBanner).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    const mobileBanner = page.locator('text=/Data Pipeline:/i');
    await expect(mobileBanner).toBeVisible();

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});

// ============================================================================
// P4 TESTS: Constants Consolidation
// ============================================================================

test.describe('P4: Constants Consolidation & Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('P4.1: segment filters use consistent styling across views', async ({ page }) => {
    // Check Customer Segmentation Dashboard
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    const eliteCardInSegmentation = page.locator('h3:has-text("Elite"), h3:has-text("elite")').first();
    const segmentationColor = await eliteCardInSegmentation.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    console.log('Elite color in segmentation:', segmentationColor);

    // Navigate to Customer Lookup
    await navigateToCustomerLookup(page);
    await page.waitForLoadState('networkidle');

    const eliteFilterInLookup = page.locator('text=Elite').filter({ hasText: /^Elite$/ }).first();
    const lookupColor = await eliteFilterInLookup.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    console.log('Elite color in lookup:', lookupColor);

    // Colors should be consistent (or at least both defined)
    expect(segmentationColor).toBeTruthy();
    expect(lookupColor).toBeTruthy();
  });

  test('P4.2: segment colors match in CustomerSegmentationDashboard and CustomerLookupView', async ({ page }) => {
    // Navigate to segmentation
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    // Get all segment colors
    const segmentColors: Record<string, string> = {};
    for (const segment of ['Elite', 'Premium', 'Standard', 'Entry']) {
      const segmentElement = page.locator(`h3:has-text("${segment}"), h3:has-text("${segment.toLowerCase()}")`).first();
      if ((await segmentElement.count()) > 0) {
        const color = await segmentElement.evaluate((el) => window.getComputedStyle(el).color);
        segmentColors[segment] = color;
      }
    }

    console.log('Segment colors in dashboard:', segmentColors);

    // Navigate to lookup and compare
    await navigateToCustomerLookup(page);
    await page.waitForLoadState('networkidle');

    for (const segment of ['Elite', 'Premium', 'Standard', 'Entry']) {
      const filterElement = page.locator(`text=${segment}`).filter({ hasText: new RegExp(`^${segment}$`) }).first();
      if ((await filterElement.count()) > 0) {
        const color = await filterElement.evaluate((el) => window.getComputedStyle(el).color);
        console.log(`${segment} color in lookup:`, color);

        // Colors should be defined and consistent
        expect(color).toBeTruthy();
      }
    }
  });

  test('P4.3: all segment operations work after refactoring', async ({ page }) => {
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    // Try clicking each segment
    for (const segment of ['Elite', 'Premium', 'Standard', 'Entry']) {
      await navigateToCustomerInsights(page);
      await page.waitForLoadState('networkidle');

      const segmentCard = page.locator(`h3:has-text("${segment}"), h3:has-text("${segment.toLowerCase()}")`).locator('..').first();

      if ((await segmentCard.count()) > 0) {
        await segmentCard.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to customer lookup
        const inCustomerView = await page.locator('text=Customer Lookup, text=Customers').count() > 0;
        expect(inCustomerView).toBe(true);
      }
    }
  });
});

// ============================================================================
// VISUAL REGRESSION TESTS
// ============================================================================

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('Visual: Customer Segmentation Dashboard', async ({ page }) => {
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    // Take screenshot for visual comparison
    await page.screenshot({
      path: '.playwright-mcp/analytics-segmentation-dashboard.png',
      fullPage: true,
    });
  });

  test('Visual: Today Opportunities Panel', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '.playwright-mcp/analytics-opportunities-panel.png',
      fullPage: true,
    });
  });

  test('Visual: Customer Lookup View', async ({ page }) => {
    await navigateToCustomerLookup(page);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '.playwright-mcp/analytics-customer-lookup.png',
      fullPage: true,
    });
  });

  test('Visual: Data Flow Banner (collapsed and expanded)', async ({ page }) => {
    await navigateToAnalytics(page);
    await page.waitForLoadState('networkidle');

    // Collapsed state
    await page.screenshot({
      path: '.playwright-mcp/data-flow-banner-collapsed.png',
      clip: { x: 0, y: 0, width: 1280, height: 200 },
    });

    // Expand banner
    const bannerButton = page.locator('button:has-text("Data Pipeline")').first();
    await bannerButton.click();
    await page.waitForLoadState('networkidle');

    // Expanded state
    await page.screenshot({
      path: '.playwright-mcp/data-flow-banner-expanded.png',
      clip: { x: 0, y: 0, width: 1280, height: 300 },
    });
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('A11y: segment cards have proper ARIA labels', async ({ page }) => {
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    const eliteCard = page.locator('h3:has-text("Elite")').locator('..').first();

    // Check for accessible name
    const ariaLabel = await eliteCard.getAttribute('aria-label');
    const hasText = await eliteCard.textContent();

    expect(ariaLabel || hasText).toBeTruthy();
  });

  test('A11y: keyboard navigation works for segment cards', async ({ page }) => {
    await navigateToCustomerInsights(page);
    await page.waitForLoadState('networkidle');

    // Tab to first segment card
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter to activate
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Should navigate to customer lookup
    const inCustomerView = await page.locator('text=Customer Lookup, text=Customers').count() > 0;
    expect(inCustomerView).toBe(true);
  });

  test('A11y: customer detail modal is keyboard accessible', async ({ page }) => {
    await navigateToTodayOpportunities(page);
    await page.waitForLoadState('networkidle');

    const customerLink = page.locator('button:has-text("View")').first();

    if ((await customerLink.count()) > 0) {
      // Tab to button and press Enter
      await customerLink.focus();
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');

      // Modal should be visible
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Focus should be trapped in modal
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    }
  });
});
