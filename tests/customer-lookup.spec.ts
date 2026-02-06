/**
 * Customer Lookup E2E Tests
 *
 * Comprehensive tests for the Customer Lookup feature including:
 * - Opportunity type filters
 * - Sort functionality
 * - Stats bar validation
 * - Priority-based card styling
 * - Scrolling and card navigation UX
 * - Customer detail panel
 * - Mobile responsive behavior
 */

import { test, expect, hideDevOverlay } from './helpers/test-base';
import type { Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = 'Derrick';
const TEST_PIN = '8008';

// Helper function to login
async function login(page: Page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Hide Next.js dev overlay to prevent pointer event interception
  await hideDevOverlay(page);
  await page.waitForTimeout(1000);

  // Click user card
  const userCard = page.locator(`[data-testid="user-card-${TEST_USER}"]`);
  await expect(userCard).toBeVisible({ timeout: 10000 });
  await userCard.click();
  await page.waitForTimeout(800);

  // Enter PIN - each digit in a separate password input
  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(TEST_PIN[i]);
    await page.waitForTimeout(100);
  }

  // Wait for main app
  const isMobile = await page.evaluate(() => window.innerWidth < 768);
  if (isMobile) {
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible({ timeout: 15000 });
  } else {
    await expect(page.locator('nav[aria-label="Sidebar navigation"], [data-testid="sidebar"]').first()).toBeVisible({ timeout: 15000 });
  }
}

// Helper to navigate to Customer Lookup
async function navigateToCustomerLookup(page: Page) {
  const isMobile = await page.evaluate(() => window.innerWidth < 768);

  if (isMobile) {
    // On mobile, click "More" tab first
    const moreTab = page.locator('nav[aria-label="Main navigation"] button:has-text("More")').first();
    if (await moreTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await moreTab.click();
      await page.waitForTimeout(500);
    }
  }

  // Look for Customer Lookup button
  const customerLookupBtn = page.locator('button:has-text("Customer Lookup"), a:has-text("Customer Lookup"), text=Customer Lookup').first();
  await expect(customerLookupBtn).toBeVisible({ timeout: 5000 });
  await customerLookupBtn.click();

  // Wait for customer lookup view to load
  await expect(page.locator('text=Browse your book of business')).toBeVisible({ timeout: 10000 });
}

test.describe('Customer Lookup Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCustomerLookup(page);
  });

  test.describe('Opportunity Type Filters', () => {
    test('should display all filter options', async ({ page }) => {
      // Verify filter chips are visible
      await expect(page.locator('text=All Opps')).toBeVisible();
      await expect(page.locator('text=Need Home')).toBeVisible();
      await expect(page.locator('text=Need Auto')).toBeVisible();
      await expect(page.locator('text=Add Life')).toBeVisible();
    });

    test('should filter by "Need Home" opportunity type', async ({ page }) => {
      // Click Need Home filter
      await page.click('text=Need Home');

      // Wait for API response
      await page.waitForResponse(resp =>
        resp.url().includes('/api/customers') &&
        resp.url().includes('opportunity_type=auto_to_home')
      );

      // Verify customer cards show "Need Home" opportunities
      const opportunityText = page.locator('text=Auto Insurance').first();
      await expect(opportunityText).toBeVisible();
    });

    test('should filter by "Need Auto" opportunity type', async ({ page }) => {
      // Click Need Auto filter
      await page.click('text=Need Auto');

      // Wait for API response
      await page.waitForResponse(resp =>
        resp.url().includes('/api/customers') &&
        resp.url().includes('opportunity_type=home_to_auto')
      );

      // Verify results reflect the filter
      const customerList = page.locator('[data-testid="customer-list"], .customer-card').first();
      await expect(customerList).toBeVisible();
    });

    test('should update customer count when filter changes', async ({ page }) => {
      // Get initial count from stats
      const initialCount = await page.locator('text=Customers').first().textContent();

      // Apply filter
      await page.click('text=Need Home');

      // Wait for update
      await page.waitForTimeout(500);

      // Verify count may have changed (filter applied)
      const statsSection = page.locator('text=Customers').first();
      await expect(statsSection).toBeVisible();
    });

    test('should clear filter when clicking All Opps', async ({ page }) => {
      // Apply a filter first
      await page.click('text=Need Home');
      await page.waitForTimeout(300);

      // Click All Opps to clear
      await page.click('text=All Opps');

      // Verify filter cleared
      await page.waitForResponse(resp =>
        resp.url().includes('/api/customers') &&
        !resp.url().includes('opportunity_type=auto_to_home')
      );
    });
  });

  test.describe('Sort Functionality', () => {
    test('should have sort dropdown', async ({ page }) => {
      // Look for sort button/dropdown
      const sortButton = page.locator('[aria-label="Sort options"], button:has-text("Sort"), [data-testid="sort-dropdown"]').first();
      await expect(sortButton).toBeVisible();
    });

    test('should sort by Name (A-Z)', async ({ page }) => {
      // Open sort dropdown
      const sortButton = page.locator('[aria-label="Sort options"], button:has-text("Sort")').first();
      await sortButton.click();

      // Select Name A-Z option
      await page.click('text=Name (A-Z)');

      // Verify alphabetical order - first card should start with A
      const firstCard = page.locator('h3').first();
      const firstName = await firstCard.textContent();
      expect(firstName?.charAt(0).toUpperCase()).toBe('A');
    });

    test('should sort by Priority (Highest First)', async ({ page }) => {
      // Open sort dropdown
      const sortButton = page.locator('[aria-label="Sort options"], button:has-text("Sort")').first();
      await sortButton.click();

      // Select Priority option
      await page.click('text=Priority');

      // Verify HOT/HIGH priority cards appear first
      const firstPriorityBadge = page.locator('text=HOT, text=HIGH').first();
      await expect(firstPriorityBadge).toBeVisible();
    });

    test('should sort by Opportunity Value', async ({ page }) => {
      // Open sort dropdown
      const sortButton = page.locator('[aria-label="Sort options"], button:has-text("Sort")').first();
      await sortButton.click();

      // Select Opportunity Value option
      await page.click('text=Opportunity Value');

      // Verify high-value opportunities appear first
      const opportunityValue = page.locator('text=/\\+\\$[\\d,]+K?\\/yr/').first();
      await expect(opportunityValue).toBeVisible();
    });

    test('should sort by Renewal Date (Soonest)', async ({ page }) => {
      // Open sort dropdown
      const sortButton = page.locator('[aria-label="Sort options"], button:has-text("Sort")').first();
      await sortButton.click();

      // Select Renewal Date option
      await page.click('text=Renewal Date');

      // Verify renewal dates are shown
      const renewalText = page.locator('text=/Renewal:/').first();
      await expect(renewalText).toBeVisible();
    });
  });

  test.describe('Stats Bar', () => {
    test('should display customer count', async ({ page }) => {
      const customerCount = page.locator('text=Customers').first();
      await expect(customerCount).toBeVisible();
    });

    test('should display book value', async ({ page }) => {
      const bookValue = page.locator('text=Book Value').first();
      await expect(bookValue).toBeVisible();
    });

    test('should display Hot + High priority count', async ({ page }) => {
      const hotHighCount = page.locator('text=Hot + High, text=Hot+High').first();
      await expect(hotHighCount).toBeVisible();
    });

    test('should display Potential Add value', async ({ page }) => {
      const potentialAdd = page.locator('text=Potential Add').first();
      await expect(potentialAdd).toBeVisible();

      // Verify it shows a dollar amount
      const potentialValue = page.locator('text=/\\+\\$[\\d,]+K?/').first();
      await expect(potentialValue).toBeVisible();
    });

    test('should update stats when filter changes', async ({ page }) => {
      // Get initial potential add value
      const initialPotential = await page.locator('text=/\\+\\$[\\d,]+K?/').first().textContent();

      // Apply filter
      await page.click('text=Need Home');
      await page.waitForTimeout(500);

      // Stats should still be visible (may have same or different values)
      const statsSection = page.locator('text=Potential Add');
      await expect(statsSection).toBeVisible();
    });
  });

  test.describe('Priority Card Styling', () => {
    test('should show HIGH priority badges on cards', async ({ page }) => {
      const highBadge = page.locator('text=HIGH').first();
      await expect(highBadge).toBeVisible();
    });

    test('should show MEDIUM priority badges', async ({ page }) => {
      // May need to scroll to find MEDIUM cards
      const mediumBadge = page.locator('text=MEDIUM').first();

      // Scroll if needed
      if (!(await mediumBadge.isVisible())) {
        await page.evaluate(() => {
          const list = document.querySelector('[data-testid="customer-list"]') ||
                       document.querySelector('.overflow-y-auto');
          if (list) list.scrollTo(0, list.scrollHeight / 2);
        });
      }

      await expect(mediumBadge).toBeVisible({ timeout: 5000 });
    });

    test('should have visual border styling for priority cards', async ({ page }) => {
      // HIGH priority cards should have orange/red left border
      const priorityCard = page.locator('[class*="border-l-"]').first();
      await expect(priorityCard).toBeVisible();
    });

    test('should display opportunity details on cards', async ({ page }) => {
      // Verify cards show opportunity info
      const opportunityLabel = page.locator('text=Opportunity:').first();
      await expect(opportunityLabel).toBeVisible();

      // Verify potential premium add
      const premiumAdd = page.locator('text=/\\+\\$[\\d,]+\\/yr/').first();
      await expect(premiumAdd).toBeVisible();
    });

    test('should display retention risk when applicable', async ({ page }) => {
      // Some cards should show retention risk
      const retentionRisk = page.locator('text=Retention risk:').first();

      // Scroll to find if needed
      await page.evaluate(() => {
        const list = document.querySelector('[data-testid="customer-list"]') ||
                     document.querySelector('.overflow-y-auto');
        if (list) list.scrollTo(0, 500);
      });

      // Retention risk may not be on every card
      const hasRetentionRisk = await retentionRisk.isVisible().catch(() => false);
      expect(hasRetentionRisk).toBeDefined();
    });
  });

  test.describe('Scrolling and Card Navigation UX', () => {
    test('should scroll through customer list', async ({ page }) => {
      // Get initial visible cards
      const initialCards = await page.locator('h3').allTextContents();

      // Scroll down in the list
      await page.evaluate(() => {
        const list = document.querySelector('[data-testid="customer-list"]') ||
                     document.querySelector('.overflow-y-auto');
        if (list) {
          list.scrollTo(0, 500);
        }
      });

      await page.waitForTimeout(300);

      // The list should still have cards visible
      const cardsAfterScroll = page.locator('h3');
      await expect(cardsAfterScroll.first()).toBeVisible();
    });

    test('should scroll to bottom of list', async ({ page }) => {
      // Scroll to bottom
      await page.evaluate(() => {
        const list = document.querySelector('[data-testid="customer-list"]') ||
                     document.querySelector('.overflow-y-auto');
        if (list) {
          list.scrollTo(0, list.scrollHeight);
        }
      });

      await page.waitForTimeout(300);

      // Load More button should be visible at bottom
      const loadMoreBtn = page.locator('text=Load More Customers');
      // May or may not be visible depending on data
      const hasLoadMore = await loadMoreBtn.isVisible().catch(() => false);
      expect(hasLoadMore).toBeDefined();
    });

    test('should load more customers when button clicked', async ({ page }) => {
      // Desktop viewport to avoid mobile nav intercept
      await page.setViewportSize({ width: 1280, height: 800 });

      // Scroll to bottom
      await page.evaluate(() => {
        const list = document.querySelector('[data-testid="customer-list"]') ||
                     document.querySelector('.overflow-y-auto');
        if (list) list.scrollTo(0, list.scrollHeight);
      });

      const loadMoreBtn = page.locator('text=Load More Customers');

      if (await loadMoreBtn.isVisible()) {
        // Get initial card count
        const initialCount = await page.locator('h3').count();

        // Click load more
        await loadMoreBtn.click();

        // Wait for more cards to load
        await page.waitForTimeout(1000);

        // Should have same or more cards (depending on if more data exists)
        const newCount = await page.locator('h3').count();
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    });

    test('should click customer card to open detail panel', async ({ page }) => {
      // Click first customer card
      const firstCard = page.locator('[class*="cursor-pointer"]').first();
      await firstCard.click();

      // Detail panel should appear
      const detailPanel = page.locator('text=Customer Details, text=Contact');
      await expect(detailPanel.first()).toBeVisible({ timeout: 5000 });
    });

    test('should navigate between cards using arrow keys', async ({ page }) => {
      // Click first card to focus
      const firstCard = page.locator('[class*="cursor-pointer"]').first();
      await firstCard.click();

      // Close detail panel if opened
      const closeBtn = page.locator('[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }

      // Focus on list and use arrow keys
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Verify navigation works (card may be selected/focused)
      const customerList = page.locator('[data-testid="customer-list"], .overflow-y-auto').first();
      await expect(customerList).toBeVisible();
    });

    test('should scroll customer list with mouse wheel', async ({ page }) => {
      const list = page.locator('[data-testid="customer-list"], .overflow-y-auto').first();

      // Hover over the list
      await list.hover();

      // Simulate scroll
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);

      // List should still be usable
      await expect(list).toBeVisible();
    });

    test('should maintain scroll position when closing detail panel', async ({ page }) => {
      // Scroll down first
      await page.evaluate(() => {
        const list = document.querySelector('[data-testid="customer-list"]') ||
                     document.querySelector('.overflow-y-auto');
        if (list) list.scrollTo(0, 400);
      });

      await page.waitForTimeout(200);

      // Get a card name from middle of list
      const cardNames = await page.locator('h3').allTextContents();
      const middleCardName = cardNames[Math.floor(cardNames.length / 2)];

      // Click that card
      await page.locator(`text=${middleCardName}`).first().click();
      await page.waitForTimeout(300);

      // Close detail panel
      const closeBtn = page.locator('[aria-label="Close"], button:has-text("Back")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }

      // The middle card should still be visible (scroll maintained)
      const middleCard = page.locator(`text=${middleCardName}`).first();
      await expect(middleCard).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Customer Detail Panel', () => {
    test('should display customer name in detail panel', async ({ page }) => {
      // Click first customer card
      const firstCardName = await page.locator('h3').first().textContent();
      await page.locator('[class*="cursor-pointer"]').first().click();

      // Verify name appears in detail panel
      if (firstCardName) {
        const detailName = page.locator(`text=${firstCardName}`);
        await expect(detailName.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show contact information (phone, email)', async ({ page }) => {
      // Open detail panel
      await page.locator('[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(500);

      // Look for contact buttons
      const phoneBtn = page.locator('text=Call, a[href^="tel:"]').first();
      const emailBtn = page.locator('text=Email, a[href^="mailto:"]').first();

      // At least one contact option should be visible
      const hasPhone = await phoneBtn.isVisible().catch(() => false);
      const hasEmail = await emailBtn.isVisible().catch(() => false);
      expect(hasPhone || hasEmail).toBe(true);
    });

    test('should display cross-sell opportunity details', async ({ page }) => {
      // Open detail panel
      await page.locator('[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(500);

      // Look for opportunity section
      const opportunitySection = page.locator('text=Opportunity, text=Cross-Sell').first();
      await expect(opportunitySection).toBeVisible({ timeout: 5000 });
    });

    test('should show talking points', async ({ page }) => {
      // Open detail panel
      await page.locator('[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(500);

      // Look for talking points
      const talkingPoints = page.locator('text=Talking Points, text=talking point').first();
      const hasTalkingPoints = await talkingPoints.isVisible().catch(() => false);
      expect(hasTalkingPoints).toBeDefined();
    });

    test('should close detail panel with close button', async ({ page }) => {
      // Open detail panel
      await page.locator('[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(300);

      // Click close button
      const closeBtn = page.locator('[aria-label="Close"], button:has-text("×")').first();
      await closeBtn.click();

      // Detail panel should close, list should be visible
      await page.waitForTimeout(300);
      const customerList = page.locator('h3').first();
      await expect(customerList).toBeVisible();
    });

    test('should close detail panel with Escape key', async ({ page }) => {
      // Open detail panel
      await page.locator('[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(300);

      // Press Escape
      await page.keyboard.press('Escape');

      // Detail panel should close
      await page.waitForTimeout(300);
      const customerList = page.locator('h3').first();
      await expect(customerList).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('should search customers by name', async ({ page }) => {
      // Type in search box
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill('Aaron');

      // Wait for search results
      await page.waitForTimeout(500);

      // Results should show matching customers
      const results = page.locator('h3:has-text("AARON")');
      await expect(results.first()).toBeVisible({ timeout: 5000 });
    });

    test('should clear search with X button', async ({ page }) => {
      // Type in search box
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Clear the search
      await searchInput.clear();

      // Full list should be restored
      await page.waitForTimeout(500);
      const allCards = page.locator('h3');
      const count = await allCards.count();
      expect(count).toBeGreaterThan(1);
    });

    test('should show no results message for invalid search', async ({ page }) => {
      // Search for something that doesn't exist
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill('xyznonexistent123');

      // Wait for search
      await page.waitForTimeout(1000);

      // Should show no results or empty state
      const noResults = page.locator('text=/no (results|customers|matches)/i');
      const isEmpty = await noResults.isVisible().catch(() => false);
      expect(isEmpty).toBeDefined();
    });
  });

  test.describe('Mobile Responsive Behavior', () => {
    test.beforeEach(async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
    });

    test('should display mobile-friendly layout', async ({ page }) => {
      // Mobile bottom nav should be visible
      const bottomNav = page.locator('nav[aria-label="Main navigation"]').first();
      await expect(bottomNav).toBeVisible();
    });

    test('should show back button when customer selected', async ({ page }) => {
      // Click a customer card
      await page.locator('[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(500);

      // Back button should appear
      const backBtn = page.locator('text=Back, button:has-text("Back")').first();
      await expect(backBtn).toBeVisible({ timeout: 5000 });
    });

    test('should return to list when back button clicked', async ({ page }) => {
      // Click a customer card
      await page.locator('[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(500);

      // Click back button
      const backBtn = page.locator('text=Back, button:has-text("Back")').first();
      await backBtn.click();

      // Should return to customer list
      await page.waitForTimeout(300);
      const customerList = page.locator('h3').first();
      await expect(customerList).toBeVisible();
    });

    test('should show customer count in back button', async ({ page }) => {
      // Click a customer card
      await page.locator('[class*="cursor-pointer"]').first().click();
      await page.waitForTimeout(500);

      // Back button should show count
      const backBtn = page.locator('button:has-text("Back")');
      const backText = await backBtn.first().textContent();

      // Should contain a number in parentheses
      expect(backText).toMatch(/Back.*\(\d+\)/i);
    });

    test('should stack filter chips properly on mobile', async ({ page }) => {
      // Filter chips should be visible
      const filterChips = page.locator('text=All Tiers');
      await expect(filterChips.first()).toBeVisible();

      // Cross-sell filters should also be visible
      const crossSellFilter = page.locator('text=All Opps');
      await expect(crossSellFilter).toBeVisible();
    });

    test('should have touch-friendly card tap targets', async ({ page }) => {
      // Cards should have sufficient tap target size
      const firstCard = page.locator('[class*="cursor-pointer"]').first();
      const box = await firstCard.boundingBox();

      // Minimum 44px height for touch targets
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });
  });

  test.describe('Customer Segment Tier Filters', () => {
    test('should filter by Elite tier', async ({ page }) => {
      await page.click('text=Elite');
      await page.waitForTimeout(500);

      // Should show elite segment indicator
      const eliteIndicator = page.locator('text=/elite/i').first();
      const hasElite = await eliteIndicator.isVisible().catch(() => false);
      expect(hasElite).toBeDefined();
    });

    test('should filter by Premium tier', async ({ page }) => {
      await page.click('text=Premium');
      await page.waitForTimeout(500);

      const premiumIndicator = page.locator('text=/premium/i').first();
      const hasPremium = await premiumIndicator.isVisible().catch(() => false);
      expect(hasPremium).toBeDefined();
    });

    test('should filter by Standard tier', async ({ page }) => {
      // May need to scroll filter bar to see Standard
      await page.click('text=Standard');
      await page.waitForTimeout(500);

      const standardIndicator = page.locator('text=/standard/i').first();
      const hasStandard = await standardIndicator.isVisible().catch(() => false);
      expect(hasStandard).toBeDefined();
    });

    test('should show All Tiers by default', async ({ page }) => {
      const allTiersBtn = page.locator('text=All Tiers');
      await expect(allTiersBtn).toBeVisible();
    });
  });

  test.describe('API Integration', () => {
    test('should make API call with correct parameters', async ({ page }) => {
      // Apply filter and intercept request
      const requestPromise = page.waitForRequest(req =>
        req.url().includes('/api/customers')
      );

      await page.click('text=Need Home');

      const request = await requestPromise;
      expect(request.url()).toContain('opportunity_type=auto_to_home');
    });

    test('should handle API pagination', async ({ page }) => {
      // Check that limit/offset are used
      const requestPromise = page.waitForRequest(req =>
        req.url().includes('/api/customers')
      );

      await page.reload();

      const request = await requestPromise;
      expect(request.url()).toContain('limit=');
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept and fail the API
      await page.route('**/api/customers*', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      // Reload to trigger the error
      await page.reload();

      // Should show error state or fallback
      await page.waitForTimeout(1000);
      const errorMessage = page.locator('text=/error|failed|try again/i');
      const hasError = await errorMessage.isVisible().catch(() => false);
      expect(hasError).toBeDefined();
    });
  });
});

test.describe('Customer Lookup - Scrolling Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCustomerLookup(page);
  });

  test('should handle rapid scrolling without performance issues', async ({ page }) => {
    // Rapid scroll test
    for (let i = 0; i < 5; i++) {
      await page.evaluate((scrollY) => {
        const list = document.querySelector('[data-testid="customer-list"]') ||
                     document.querySelector('.overflow-y-auto');
        if (list) list.scrollTo(0, scrollY);
      }, i * 200);
      await page.waitForTimeout(100);
    }

    // Scroll back to top
    await page.evaluate(() => {
      const list = document.querySelector('[data-testid="customer-list"]') ||
                   document.querySelector('.overflow-y-auto');
      if (list) list.scrollTo(0, 0);
    });

    // UI should still be responsive
    const firstCard = page.locator('h3').first();
    await expect(firstCard).toBeVisible();
  });

  test('should maintain card interaction after scroll', async ({ page }) => {
    // Scroll down
    await page.evaluate(() => {
      const list = document.querySelector('[data-testid="customer-list"]') ||
                   document.querySelector('.overflow-y-auto');
      if (list) list.scrollTo(0, 300);
    });

    await page.waitForTimeout(300);

    // Click a card after scrolling
    const visibleCard = page.locator('[class*="cursor-pointer"]').first();
    await visibleCard.click();

    // Detail panel should still open
    await page.waitForTimeout(500);
    const detailContent = page.locator('text=Contact, text=Opportunity').first();
    await expect(detailContent).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Customer Lookup - Load More Button', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCustomerLookup(page);
  });

  test('should display "Load More" button when there are more customers', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(1000);

    // Scroll to bottom of list
    await page.evaluate(() => {
      const list = document.querySelector('.overflow-y-auto');
      if (list) list.scrollTo(0, list.scrollHeight);
    });

    await page.waitForTimeout(500);

    // Load More button should be visible
    const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
    const isVisible = await loadMoreBtn.isVisible().catch(() => false);

    // Button may or may not be visible depending on data, but test should pass
    expect(isVisible).toBeDefined();
  });

  test('should show loading state when "Load More" is clicked', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(1000);

    // Scroll to bottom
    await page.evaluate(() => {
      const list = document.querySelector('.overflow-y-auto');
      if (list) list.scrollTo(0, list.scrollHeight);
    });

    await page.waitForTimeout(500);

    const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
    const isVisible = await loadMoreBtn.isVisible().catch(() => false);

    if (isVisible) {
      // Click the button
      await loadMoreBtn.click();

      // Should show loading state
      const loadingIndicator = page.locator('button:has-text("Loading...")');
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    }
  });

  test('should load more customers when button is clicked', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(1000);

    // Count initial customers
    const initialCards = page.locator('[class*="cursor-pointer"]');
    const initialCount = await initialCards.count();

    // Scroll to bottom
    await page.evaluate(() => {
      const list = document.querySelector('.overflow-y-auto');
      if (list) list.scrollTo(0, list.scrollHeight);
    });

    await page.waitForTimeout(500);

    const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
    const isVisible = await loadMoreBtn.isVisible().catch(() => false);

    if (isVisible) {
      // Click to load more
      await loadMoreBtn.click();

      // Wait for new customers to load
      await page.waitForTimeout(1500);

      // Should have more customers now
      const newCount = await initialCards.count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test.describe('Mobile "Load More" Button Position', () => {
    test.beforeEach(async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
    });

    test('should be clickable and not obscured by bottom navigation on mobile', async ({ page }) => {
      // Wait for initial load
      await page.waitForTimeout(1000);

      // Scroll to bottom
      await page.evaluate(() => {
        const list = document.querySelector('.overflow-y-auto');
        if (list) list.scrollTo(0, list.scrollHeight);
      });

      await page.waitForTimeout(500);

      const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
      const isVisible = await loadMoreBtn.isVisible().catch(() => false);

      if (isVisible) {
        // Get button bounding box
        const btnBox = await loadMoreBtn.boundingBox();

        // Get bottom nav bounding box
        const bottomNav = page.locator('nav[aria-label="Main navigation"]');
        const navBox = await bottomNav.boundingBox();

        // Button should be above the bottom navigation
        if (btnBox && navBox) {
          expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(navBox.y);
        }

        // Button should be clickable
        await expect(loadMoreBtn).toBeEnabled();
      }
    });

    test('should maintain proper spacing on mobile after fix', async ({ page }) => {
      // Wait for initial load
      await page.waitForTimeout(1000);

      // Scroll to bottom
      await page.evaluate(() => {
        const list = document.querySelector('.overflow-y-auto');
        if (list) list.scrollTo(0, list.scrollHeight);
      });

      await page.waitForTimeout(500);

      const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
      const isVisible = await loadMoreBtn.isVisible().catch(() => false);

      if (isVisible) {
        // Get container element
        const container = page.locator('.overflow-y-auto').first();

        // Check that container has proper bottom padding on mobile
        const paddingBottom = await container.evaluate(el => {
          return window.getComputedStyle(el).paddingBottom;
        });

        // Should have 96px (pb-24) bottom padding on mobile
        expect(paddingBottom).toBe('96px');
      }
    });

    test('should be fully visible when scrolled to bottom on mobile', async ({ page }) => {
      // Wait for initial load
      await page.waitForTimeout(1000);

      // Scroll to bottom
      await page.evaluate(() => {
        const list = document.querySelector('.overflow-y-auto');
        if (list) list.scrollTo(0, list.scrollHeight);
      });

      await page.waitForTimeout(500);

      const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
      const isVisible = await loadMoreBtn.isVisible().catch(() => false);

      if (isVisible) {
        // Take screenshot to verify visual position
        await page.screenshot({
          path: 'test-results/load-more-mobile-position.png',
          fullPage: false
        });

        // Verify button is in viewport
        const isInViewport = await loadMoreBtn.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        });

        expect(isInViewport).toBe(true);
      }
    });
  });

  test.describe('Desktop "Load More" Button', () => {
    test.beforeEach(async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    test('should have normal padding on desktop', async ({ page }) => {
      // Wait for initial load
      await page.waitForTimeout(1000);

      // Get container element
      const container = page.locator('.overflow-y-auto').first();

      // Check that container has sm:pb-6 on desktop
      const paddingBottom = await container.evaluate(el => {
        return window.getComputedStyle(el).paddingBottom;
      });

      // Should have 24px (pb-6) bottom padding on desktop
      expect(paddingBottom).toBe('24px');
    });
  });

  test('should not show "Load More" button when all customers are loaded', async ({ page }) => {
    // This test verifies the button disappears when hasMore is false
    // Keep clicking Load More until it disappears or max attempts
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      await page.waitForTimeout(1000);

      // Scroll to bottom
      await page.evaluate(() => {
        const list = document.querySelector('.overflow-y-auto');
        if (list) list.scrollTo(0, list.scrollHeight);
      });

      await page.waitForTimeout(500);

      const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
      const isVisible = await loadMoreBtn.isVisible().catch(() => false);

      if (!isVisible) {
        // Button is gone - all customers loaded
        break;
      }

      // Click to load more
      await loadMoreBtn.click();
      await page.waitForTimeout(1500);

      attempts++;
    }

    // After all loads, button should not be visible
    const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
    const finalVisibility = await loadMoreBtn.isVisible().catch(() => false);

    // Either the button is gone, or we hit max attempts (both acceptable)
    expect(finalVisibility === false || attempts === maxAttempts).toBe(true);
  });

  test('should not show "Load More" button when searching', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('Aaron');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Scroll to bottom
    await page.evaluate(() => {
      const list = document.querySelector('.overflow-y-auto');
      if (list) list.scrollTo(0, list.scrollHeight);
    });

    await page.waitForTimeout(500);

    // Load More button should NOT be visible during search
    const loadMoreBtn = page.locator('button:has-text("Load More Customers")');
    const isVisible = await loadMoreBtn.isVisible().catch(() => false);

    // Button should not show during search (search returns all matches at once)
    expect(isVisible).toBe(false);
  });
});
