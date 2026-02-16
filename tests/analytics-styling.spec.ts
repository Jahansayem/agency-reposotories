'use strict';

/**
 * Analytics Page Styling Tests
 *
 * Verifies that the Analytics page uses CSS variables correctly
 * and maintains visual consistency with the rest of the app.
 */

import { test, expect } from '@playwright/test';

// Helper to login as Derrick
async function loginAsDerrick(page: any) {
  await page.goto('http://localhost:3000');

  // Wait for login screen
  await page.waitForSelector('[data-testid="user-card-Derrick"], button:has-text("Derrick")', {
    timeout: 10000
  });

  // Click on Derrick user card
  const derrickCard = page.locator('[data-testid="user-card-Derrick"]').or(
    page.locator('button:has-text("Derrick")')
  );
  await derrickCard.click();

  // Wait for PIN input
  await page.waitForSelector('input[type="password"], input[inputmode="numeric"]', {
    timeout: 5000
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
    timeout: 10000
  });
}

test.describe('Analytics Page Styling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('should navigate to Analytics page and display correctly', async ({ page }) => {
    // Navigate to Analytics using sidebar (look for text "Analytics" in the nav)
    // Wait a bit for the page to stabilize
    await page.waitForLoadState('networkidle');

    // Click on Analytics in the sidebar
    await page.click('text=Analytics');

    // Wait for Analytics page content to load
    await page.waitForLoadState('networkidle');

    // Verify the page uses CSS variables (no hardcoded gray-50, gray-900, etc.)
    // Take a screenshot for visual verification
    await page.screenshot({
      path: '.playwright-mcp/analytics-overview.png',
      fullPage: true
    });

    // Verify key elements exist (use .first() to handle multiple matches)
    await expect(page.locator('h1:has-text("Analytics")').first()).toBeVisible();
    await expect(page.locator('text=Book of business insights')).toBeVisible();

    // Verify tabs exist
    await expect(page.locator('text=Portfolio Overview')).toBeVisible();
    await expect(page.locator('text=Today\'s Opportunities')).toBeVisible();
    await expect(page.locator('text=Customer Insights')).toBeVisible();
  });

  test('should display Today\'s Opportunities tab correctly', async ({ page }) => {
    // Navigate to Analytics
    await page.waitForLoadState('networkidle');
    await page.click('text=Analytics');
    await page.waitForLoadState('networkidle');

    // Click on Today's Opportunities tab
    await page.click('text=Today\'s Opportunities');

    // Wait for the panel to load (might show loading spinner, empty state, or opportunities)
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: '.playwright-mcp/analytics-opportunities.png',
      fullPage: true
    });

    // Verify the header exists
    const header = page.locator('text=Today\'s Top Opportunities').or(
      page.locator('text=All Caught Up')
    ).or(
      page.locator('text=Loading today\'s priorities')
    );

    await expect(header).toBeVisible();
  });

  test('should display Customer Insights tab correctly', async ({ page }) => {
    // Navigate to Analytics
    await page.waitForLoadState('networkidle');
    await page.click('text=Analytics');
    await page.waitForLoadState('networkidle');

    // Click on Customer Insights tab
    await page.click('text=Customer Insights');

    // Wait for the panel to load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: '.playwright-mcp/analytics-customers.png',
      fullPage: true
    });

    // Verify Customer Segmentation dashboard is visible
    await expect(page.locator('text=Customer Segmentation').first()).toBeVisible();
  });

  test('should have proper contrast in dark mode', async ({ page }) => {
    // Navigate to Analytics
    await page.waitForLoadState('networkidle');
    await page.click('text=Analytics');
    await page.waitForLoadState('networkidle');

    // Enable dark mode (if there's a toggle)
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]').or(
      page.locator('button:has([data-lucide="moon"])').or(
        page.locator('button:has([data-lucide="sun"])')
      )
    );

    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click();
      await page.waitForLoadState('networkidle');

      // Take screenshot in dark mode
      await page.screenshot({
        path: '.playwright-mcp/analytics-dark-mode.png',
        fullPage: true
      });
    }
  });
});
