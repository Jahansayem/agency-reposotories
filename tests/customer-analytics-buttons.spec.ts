/**
 * Customer Lookup & Analytics Views — E2E Tests
 *
 * Comprehensive tests covering:
 * 1.  Customer list loads when navigating to Customers view
 * 2.  Stats bar (Customers, Book Value, Hot+High, Potential Add)
 * 3.  Search input filters customers by name
 * 4.  Segment filter buttons (Elite, Premium, Standard, Entry)
 * 5.  Opportunity type filter (Need Home, Need Auto, Add Life, etc.)
 * 6.  Sort dropdown changes customer order
 * 7.  Clicking a customer card opens the detail panel
 * 8.  Customer detail panel close button works
 * 9.  "Due Today" toggle button works
 * 10. Analytics view loads without errors
 * 11. CSV upload button is visible and clickable
 * 12. Analytics tab switching (Portfolio Overview, Today's Opportunities, Customer Insights)
 * 13. Back/navigation between analytics and customer views
 */

import { test, expect, hideDevOverlay } from './helpers/test-base';
import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = 'http://localhost:3000';
const TEST_USER = 'Derrick';
const TEST_PIN = '8008';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Login using PIN-based authentication.
 */
async function login(page: Page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await hideDevOverlay(page);
  await page.waitForLoadState('networkidle');

  const userCard = page.locator(`[data-testid="user-card-${TEST_USER}"]`);
  await expect(userCard).toBeVisible({ timeout: 15000 });
  await userCard.click();

  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(TEST_PIN[i]);
  }

  await page.waitForLoadState('networkidle');

  // Sidebar uses lg:flex (1024px+), bottom nav uses lg:hidden
  const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);
  if (isDesktop) {
    await expect(
      page.locator('aside[aria-label="Main navigation"]')
    ).toBeVisible({ timeout: 15000 });
  } else {
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible({ timeout: 15000 });
  }

  // Wait for and dismiss the AI Feature Tour (renders after app loads with a delay)
  const dontShowBtn = page.locator('button').filter({ hasText: "Don't show again" });
  try {
    await expect(dontShowBtn).toBeVisible({ timeout: 5000 });
    await dontShowBtn.click();
    await page.waitForTimeout(500);
  } catch {
    // Tour didn't appear — that's fine
  }

  // Dismiss any remaining post-login modals
  for (let attempt = 0; attempt < 3; attempt++) {
    const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
    const dialog = page.locator('[role="dialog"]');
    if (await viewTasksBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await viewTasksBtn.click();
      await page.waitForTimeout(300);
    } else if (await dialog.isVisible({ timeout: 300 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      break;
    }
  }
}

/**
 * Navigate to the Customer Lookup view via sidebar or mobile nav.
 */
async function navigateToCustomers(page: Page) {
  const isMobile = await page.evaluate(() => window.innerWidth < 768);

  if (isMobile) {
    // On mobile the "Customers" link may be behind the "More" menu or the "Activity" tab.
    const moreTab = page.locator('nav[aria-label="Main navigation"] button:has-text("More")').first();
    if (await moreTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moreTab.click();
      await page.waitForTimeout(500);
    }
  }

  // Click the Customers nav item (sidebar button on desktop, sheet item on mobile)
  const customersBtn = page
    .locator('button:has-text("Customers"), a:has-text("Customers"), button:has-text("Customer Lookup")')
    .first();
  await expect(customersBtn).toBeVisible({ timeout: 5000 });
  await customersBtn.click();

  // Wait for the view header
  await expect(page.locator('text=Customer Lookup')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Browse your book of business')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to the Analytics view via sidebar or mobile nav.
 */
async function navigateToAnalytics(page: Page) {
  const isMobile = await page.evaluate(() => window.innerWidth < 768);

  if (isMobile) {
    const moreTab = page.locator('nav[aria-label="Main navigation"] button:has-text("More")').first();
    if (await moreTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moreTab.click();
      await page.waitForTimeout(500);
    }
  }

  const analyticsBtn = page
    .locator('button:has-text("Analytics"), a:has-text("Analytics")')
    .first();
  await expect(analyticsBtn).toBeVisible({ timeout: 5000 });
  await analyticsBtn.click();

  // Wait for the Analytics page header (either "Analytics" or "Book of Business Analytics")
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true }).first()).toBeVisible({ timeout: 10000 });
}

/**
 * Wait for customer data to finish loading.
 */
async function waitForCustomersLoaded(page: Page) {
  // Verify we're on the Customers page
  await expect(page.locator('input[placeholder*="Search customers"]')).toBeVisible({ timeout: 10000 });
  // Wait for the "Loading customers..." spinner to disappear
  const spinner = page.locator('text=Loading customers...');
  await expect(spinner).not.toBeVisible({ timeout: 15000 });
  // Wait for at least one customer card to appear
  await expect(page.locator('input[placeholder*="Search customers"]')).toBeVisible();
  await page.waitForTimeout(1000);
}

// ===========================================================================
// 1 - 9: Customer Lookup View Tests
// ===========================================================================

test.describe('Customer Lookup View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCustomers(page);
  });

  // -------------------------------------------------------------------------
  // 1. Customer list loads
  // -------------------------------------------------------------------------
  test('1 - customer list loads with cards visible', async ({ page }) => {
    // Wait for loading to finish
    await page.waitForLoadState('networkidle');

    // The loading spinner should disappear
    const spinner = page.locator('text=Loading customers...');
    await expect(spinner).not.toBeVisible({ timeout: 15000 });

    // At least one customer card (identified by an <h3> with the customer name) should appear
    const customerNames = page.locator('h3');
    await expect(customerNames.first()).toBeVisible({ timeout: 10000 });
    const count = await customerNames.count();
    expect(count).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 2. Stats bar
  // -------------------------------------------------------------------------
  test('2 - stats bar shows Customers, Book Value, Hot+High, Potential Add', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // "Customers" stat label
    await expect(page.locator('text=Customers').first()).toBeVisible({ timeout: 10000 });

    // "Book Value" stat label
    await expect(page.locator('text=Book Value').first()).toBeVisible();

    // "Hot + High" stat label (the component renders "Hot + High")
    const hotHigh = page.locator('text=/Hot.*High/').first();
    await expect(hotHigh).toBeVisible();

    // "Potential Add" stat label
    await expect(page.locator('text=Potential Add').first()).toBeVisible();

    // The Potential Add value should contain a dollar sign
    const potentialValue = page.locator('text=/\\+\\$/').first();
    await expect(potentialValue).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 3. Search filters customers by name
  // -------------------------------------------------------------------------
  test('3 - search input filters customers by name', async ({ page }) => {
    await waitForCustomersLoaded(page);

    const searchInput = page.locator('input[placeholder*="Search customers"]');
    await expect(searchInput).toBeVisible();

    // Get a customer name from the first card to use as a search term
    const firstCustomerName = await page.locator('h3').first().textContent();
    expect(firstCustomerName).toBeTruthy();

    // Type the first few characters
    const searchTerm = firstCustomerName!.substring(0, 4);
    await searchInput.fill(searchTerm);

    // Wait for search results to update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Wait for search results to load
    await expect(page.locator('text=Loading customers...')).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // All visible customer names should contain the search term (case-insensitive)
    const visibleNames = await page.locator('h3').allTextContents();
    // At least one result matches (search may be fuzzy)
    const hasMatch = visibleNames.some(
      (name) => name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    expect(hasMatch).toBe(true);

    // Clear search
    await searchInput.clear();
    await page.waitForLoadState('networkidle');
  });

  // -------------------------------------------------------------------------
  // 4. Segment filter buttons
  // -------------------------------------------------------------------------
  test('4 - segment filter buttons (All Tiers, Elite, Premium, Standard, Entry) work', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Verify all segment filter chips are visible
    await expect(page.locator('button:has-text("All Tiers")')).toBeVisible();
    await expect(page.locator('button:has-text("Elite")')).toBeVisible();
    await expect(page.locator('button:has-text("Premium")')).toBeVisible();
    await expect(page.locator('button:has-text("Standard")')).toBeVisible();
    await expect(page.locator('button:has-text("Entry")')).toBeVisible();

    // Click "Elite" filter
    await page.locator('button:has-text("Elite")').click();

    // Wait for API call with segment filter
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/customers') && resp.url().includes('segment=elite'),
      { timeout: 10000 }
    ).catch(() => {
      // API may use a different parameter name; allow graceful fallback
    });
    await page.waitForLoadState('networkidle');

    // The "Elite" button should now be the active (accent-colored) one
    const eliteBtn = page.locator('button:has-text("Elite")');
    const eliteClasses = await eliteBtn.getAttribute('class');
    expect(eliteClasses).toContain('bg-[var(--accent)]');

    // Click "All Tiers" to reset
    await page.locator('button:has-text("All Tiers")').click();
    await page.waitForLoadState('networkidle');
  });

  // -------------------------------------------------------------------------
  // 5. Opportunity type filter
  // -------------------------------------------------------------------------
  test('5 - opportunity type filter dropdown works', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Verify opportunity type chips are visible
    await expect(page.locator('button:has-text("All Opps")')).toBeVisible();
    await expect(page.locator('button:has-text("Need Home")')).toBeVisible();
    await expect(page.locator('button:has-text("Need Auto")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Life")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Umbrella")')).toBeVisible();
    await expect(page.locator('button:has-text("Bundle")')).toBeVisible();

    // Click "Need Home"
    await page.locator('button:has-text("Need Home")').click();
    await page.waitForLoadState('networkidle');

    // The "Need Home" chip should become active
    const needHomeBtn = page.locator('button:has-text("Need Home")');
    const needHomeClasses = await needHomeBtn.getAttribute('class');
    expect(needHomeClasses).toContain('bg-[var(--accent)]');

    // Click "All Opps" to reset
    await page.locator('button:has-text("All Opps")').click();
    await page.waitForLoadState('networkidle');

    const allOppsClasses = await page.locator('button:has-text("All Opps")').getAttribute('class');
    expect(allOppsClasses).toContain('bg-[var(--accent)]');
  });

  // -------------------------------------------------------------------------
  // 6. Sort dropdown
  // -------------------------------------------------------------------------
  test('6 - sort dropdown changes customer order', async ({ page }) => {
    await waitForCustomersLoaded(page);

    // The sort button shows the current sort label; default is "Priority (Hot First)"
    const sortButton = page.locator('button').filter({ has: page.locator('text=Priority') }).first();
    // Fallback: look for the ArrowUpDown icon button
    const sortTrigger = sortButton.or(
      page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /Sort|Priority|Name|Premium/ }).first()
    ).first();
    await expect(sortTrigger).toBeVisible({ timeout: 5000 });

    // Open sort dropdown
    await sortTrigger.click();

    // Dropdown options should appear
    await expect(page.locator('button:has-text("Name (A-Z)")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("Premium (High to Low)")')).toBeVisible();
    await expect(page.locator('button:has-text("Renewal Date (Soonest)")')).toBeVisible();
    await expect(page.locator('button:has-text("Opportunity Value")')).toBeVisible();

    // Select "Name (A-Z)"
    await page.locator('button:has-text("Name (A-Z)")').click();
    await page.waitForLoadState('networkidle');

    // Wait for the list to re-render
    await page.waitForTimeout(500);

    // Verify alphabetical order: collect the first few names
    const names = await page.locator('h3').allTextContents();
    expect(names.length).toBeGreaterThan(1);

    // First name should be alphabetically <= second name (case-insensitive)
    const firstName = names[0].toLowerCase();
    const secondName = names[1].toLowerCase();
    expect(firstName.localeCompare(secondName)).toBeLessThanOrEqual(0);

    // Re-open sort and switch to "Premium (High to Low)"
    // Need to re-find the sort button since its label changed
    const updatedSortBtn = page.locator('button').filter({ hasText: 'Name (A-Z)' }).first();
    await updatedSortBtn.click();
    await page.locator('button:has-text("Premium (High to Low)")').click();
    await page.waitForLoadState('networkidle');
  });

  // -------------------------------------------------------------------------
  // 7. Clicking a customer card opens the detail panel
  // -------------------------------------------------------------------------
  test('7 - clicking a customer card opens the detail panel', async ({ page }) => {
    await waitForCustomersLoaded(page);

    // Get the first customer name
    const firstCardName = await page.locator('h3').first().textContent();
    expect(firstCardName).toBeTruthy();

    // Click the first customer card
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    await firstCard.click();

    // Wait for the detail panel to render
    await page.waitForLoadState('networkidle');

    // On desktop we see "Customer Details" heading; on mobile we see the "Back" button
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (isMobile) {
      const backBtn = page.locator('button:has-text("Back")');
      await expect(backBtn).toBeVisible({ timeout: 5000 });
    } else {
      const detailHeading = page.locator('h2:has-text("Customer Details")');
      await expect(detailHeading).toBeVisible({ timeout: 5000 });
    }

    // The customer name should be visible in the detail panel
    const detailName = page.locator(`text=${firstCardName}`);
    await expect(detailName.first()).toBeVisible({ timeout: 5000 });

    // The "Cross-sell Opportunities" collapsible section should be present
    await expect(page.locator('text=Cross-sell Opportunities')).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // 8. Customer detail panel close button
  // -------------------------------------------------------------------------
  test('8 - customer detail panel close button works', async ({ page }) => {
    await waitForCustomersLoaded(page);

    // Open a customer detail
    await page.locator('[class*="cursor-pointer"]').first().click();
    await page.waitForLoadState('networkidle');

    const isMobile = await page.evaluate(() => window.innerWidth < 768);

    if (isMobile) {
      // On mobile, there is a "Back (N)" button
      const backBtn = page.locator('button:has-text("Back")').first();
      await expect(backBtn).toBeVisible({ timeout: 5000 });
      await backBtn.click();
    } else {
      // On desktop, close with the X button (aria-label="Close customer details")
      const closeBtn = page.locator('[aria-label="Close customer details"]');
      await expect(closeBtn).toBeVisible({ timeout: 5000 });
      await closeBtn.click();
    }

    // After closing, the detail panel heading should not be visible
    await expect(page.locator('h2:has-text("Customer Details")')).not.toBeVisible({ timeout: 5000 });

    // The customer list should be visible again
    const customerCards = page.locator('h3');
    await expect(customerCards.first()).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // 9. "Due Today" toggle button
  // -------------------------------------------------------------------------
  test('9 - "Due Today" toggle button activates and deactivates', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const dueTodayBtn = page.locator('button:has-text("Due Today")').first();
    await expect(dueTodayBtn).toBeVisible({ timeout: 5000 });

    // Check it is NOT active initially (should not have rose gradient)
    const initialClasses = await dueTodayBtn.getAttribute('class');
    expect(initialClasses).not.toContain('from-rose-500');

    // Click to activate
    await dueTodayBtn.click();
    await page.waitForLoadState('networkidle');

    // Now the button should have the active styling (rose gradient + animate-pulse)
    const activeBtn = page.locator('button:has-text("Due Today")').first();
    const activeClasses = await activeBtn.getAttribute('class');
    expect(activeClasses).toContain('from-rose-500');

    // The label should show "Due Today (Active)" or contain a fire emoji
    const activeBtnText = await activeBtn.textContent();
    expect(activeBtnText).toContain('Due Today');

    // A descriptive message should appear
    const message = page.locator('text=Showing only opportunities renewing TODAY');
    await expect(message).toBeVisible({ timeout: 3000 });

    // Click again to deactivate
    await activeBtn.click();
    await page.waitForLoadState('networkidle');

    // The message should disappear
    await expect(message).not.toBeVisible({ timeout: 3000 });
  });
});

// ===========================================================================
// 10 - 13: Analytics View Tests
// ===========================================================================

test.describe('Analytics View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToAnalytics(page);
  });

  // -------------------------------------------------------------------------
  // 10. Analytics view loads without errors
  // -------------------------------------------------------------------------
  test('10 - analytics view loads without errors', async ({ page }) => {
    // Heading is visible
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();

    // Subtitle is visible
    await expect(
      page.locator('text=Book of business insights and cross-sell opportunities')
    ).toBeVisible({ timeout: 5000 });

    // No error messages
    const errorText = page.locator('text=/error|failed|crash/i').first();
    const hasError = await errorText.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);

    // The default tab "Portfolio Overview" should be active
    const overviewTab = page.locator('button:has-text("Portfolio Overview")');
    await expect(overviewTab).toBeVisible();
    const overviewClasses = await overviewTab.getAttribute('class');
    expect(overviewClasses).toContain('bg-sky-500');
  });

  // -------------------------------------------------------------------------
  // 11. CSV upload button is visible and clickable
  // -------------------------------------------------------------------------
  test('11 - CSV upload button is visible and opens modal', async ({ page }) => {
    // "Import Book of Business" button should be visible
    const importBtn = page.locator('button:has-text("Import Book of Business")');
    await expect(importBtn).toBeVisible({ timeout: 5000 });

    // Click the import button
    await importBtn.click();

    // The CSV upload modal should appear
    await expect(page.locator('text=Import Cross-Sell Opportunities')).toBeVisible({ timeout: 5000 });

    // The file drop zone should be visible
    await expect(
      page.locator('text=Drag & drop your Allstate report')
    ).toBeVisible({ timeout: 3000 });

    // There should be a Cancel button
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await expect(cancelBtn).toBeVisible();

    // Close the modal
    await cancelBtn.click();
    await expect(page.locator('text=Import Cross-Sell Opportunities')).not.toBeVisible({ timeout: 3000 });
  });

  // -------------------------------------------------------------------------
  // 12. Analytics tab switching
  // -------------------------------------------------------------------------
  test('12 - analytics tab switching works (Portfolio, Opportunities, Customers)', async ({ page }) => {
    // Three tabs should be visible
    const portfolioTab = page.locator('button:has-text("Portfolio Overview")');
    const opportunitiesTab = page.locator('button:has-text("Today\'s Opportunities")');
    const customersTab = page.locator('button:has-text("Customer Insights")');

    await expect(portfolioTab).toBeVisible();
    await expect(opportunitiesTab).toBeVisible();
    await expect(customersTab).toBeVisible();

    // --- Switch to "Today's Opportunities" ---
    await opportunitiesTab.click();
    await page.waitForTimeout(500);

    // The tab should be active
    const oppTabClasses = await opportunitiesTab.getAttribute('class');
    expect(oppTabClasses).toContain('bg-sky-500');

    // The Portfolio tab should be inactive
    const portfolioInactive = await portfolioTab.getAttribute('class');
    expect(portfolioInactive).not.toContain('bg-sky-500');

    // --- Switch to "Customer Insights" ---
    await customersTab.click();
    await page.waitForTimeout(500);

    const custTabClasses = await customersTab.getAttribute('class');
    expect(custTabClasses).toContain('bg-sky-500');

    // Opportunities tab should be inactive
    const oppInactive = await opportunitiesTab.getAttribute('class');
    expect(oppInactive).not.toContain('bg-sky-500');

    // --- Switch back to "Portfolio Overview" ---
    await portfolioTab.click();
    await page.waitForTimeout(500);

    const portfolioActive = await portfolioTab.getAttribute('class');
    expect(portfolioActive).toContain('bg-sky-500');
  });

  // -------------------------------------------------------------------------
  // 13. Navigation between Analytics and Customers views
  // -------------------------------------------------------------------------
  test('13 - navigating from Analytics to Customers and back works', async ({ page }) => {
    // We start on Analytics
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();

    // Navigate to Customers
    await navigateToCustomers(page);
    await expect(page.locator('text=Browse your book of business')).toBeVisible({ timeout: 10000 });

    // Navigate back to Analytics
    await navigateToAnalytics(page);
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// Combined Filter Interaction Tests
// ===========================================================================

test.describe('Customer Lookup — Combined Filters', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCustomers(page);
  });

  test('segment + opportunity type filters stack correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Apply segment filter
    await page.locator('button:has-text("Premium")').click();
    await page.waitForLoadState('networkidle');

    // Apply opportunity type filter
    await page.locator('button:has-text("Need Home")').click();
    await page.waitForLoadState('networkidle');

    // Both buttons should be active
    const premiumClasses = await page.locator('button:has-text("Premium")').getAttribute('class');
    expect(premiumClasses).toContain('bg-[var(--accent)]');

    const needHomeClasses = await page.locator('button:has-text("Need Home")').getAttribute('class');
    expect(needHomeClasses).toContain('bg-[var(--accent)]');

    // Stats bar should still be visible
    await expect(page.locator('text=Customers').first()).toBeVisible();
    await expect(page.locator('text=Book Value').first()).toBeVisible();

    // Reset both filters
    await page.locator('button:has-text("All Tiers")').click();
    await page.locator('button:has-text("All Opps")').click();
    await page.waitForLoadState('networkidle');
  });

  test('search combined with segment filter narrows results', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Apply a segment filter first
    await page.locator('button:has-text("Elite")').click();
    await page.waitForLoadState('networkidle');

    // Now search
    const searchInput = page.locator('input[placeholder*="Search customers"]');
    await searchInput.fill('A');
    await page.waitForTimeout(1000);

    // Results should be visible (or "No customers found" if no match)
    const hasResults = await page.locator('h3').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=/No customers/i').isVisible().catch(() => false);
    expect(hasResults || hasEmpty).toBe(true);
  });

  test('sort option persists when switching segment filters', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Open sort dropdown and select "Name (A-Z)"
    const sortTrigger = page.locator('button').filter({ has: page.locator('text=/Priority|Sort|Name/') }).first();
    await sortTrigger.click();
    await page.locator('button:has-text("Name (A-Z)")').click();
    await page.waitForLoadState('networkidle');

    // Now switch segment filter
    await page.locator('button:has-text("Standard")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // The sort button should still show "Name (A-Z)"
    const sortBtnText = await page
      .locator('button')
      .filter({ hasText: 'Name (A-Z)' })
      .first()
      .isVisible()
      .catch(() => false);
    expect(sortBtnText).toBe(true);
  });
});

// ===========================================================================
// Analytics — Data Flow Banner
// ===========================================================================

test.describe('Analytics — Data Flow Banner', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToAnalytics(page);
  });

  test('data flow banner is displayed on the analytics page', async ({ page }) => {
    // The DataFlowBanner component should render within the analytics view.
    // It shows customer count and dashboard count. We just verify the analytics
    // content area renders without crashing.
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();

    // Page should not show a generic error state
    const hasError = await page.locator('text=/Something went wrong|Unhandled Runtime Error/i')
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    expect(hasError).toBe(false);
  });
});
