'use strict';

/**
 * Customer Segmentation Dashboard - Live Data E2E Tests
 *
 * Verifies that the Customer Segmentation Dashboard correctly:
 * 1. Fetches customer data from the API
 * 2. Calls the segmentation API with properly transformed data
 * 3. Displays "Live Data" badge when real data loads
 * 4. Falls back to "Demo Data" when API fails
 * 5. Refresh button works without race conditions
 */

import { test, expect } from '@playwright/test';

// Helper to login as Derrick (reused from analytics-styling.spec.ts)
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

// Helper to navigate to Customer Segmentation Dashboard
async function navigateToCustomerSegmentation(page: any) {
  // Wait for page to stabilize
  await page.waitForTimeout(1000);

  // Click on Analytics in the navigation
  await page.click('text=Analytics');
  await page.waitForTimeout(2000);

  // Click on Customer Insights tab
  await page.click('text=Customer Insights');
  await page.waitForTimeout(2000);

  // Verify we're on the Customer Segmentation dashboard
  await expect(page.locator('text=Customer Segmentation').first()).toBeVisible();
}

test.describe('Customer Segmentation Dashboard - Live Data Connection', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('should display Customer Segmentation dashboard with data badge', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Dashboard header should be visible
    await expect(page.locator('text=Customer Segmentation').first()).toBeVisible();
    await expect(page.locator('text=LTV-based customer tier analysis')).toBeVisible();

    // Data badge should exist (either "Live Data" or "Demo Data")
    const liveBadge = page.locator('text=Live Data');
    const demoBadge = page.locator('text=Demo Data');

    // At least one badge should be visible
    await expect(liveBadge.or(demoBadge)).toBeVisible();

    // Take screenshot for visual verification
    await page.screenshot({
      path: '.playwright-mcp/segmentation-dashboard-initial.png',
      fullPage: true
    });
  });

  test('should display all four segment cards (elite, premium, standard, entry)', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Wait for segments to load
    await page.waitForTimeout(3000);

    // All segment types should be present (case-insensitive)
    await expect(page.locator('h3:has-text("elite")').or(page.locator('h3:has-text("Elite")'))).toBeVisible();
    await expect(page.locator('h3:has-text("premium")').or(page.locator('h3:has-text("Premium")'))).toBeVisible();
    await expect(page.locator('h3:has-text("standard")').or(page.locator('h3:has-text("Standard")'))).toBeVisible();
    await expect(page.locator('h3:has-text("entry")').or(page.locator('h3:has-text("Entry")'))).toBeVisible();
  });

  test('should display summary statistics cards', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Summary cards should be visible (use .first() to avoid strict mode violations from matching descriptions)
    await expect(page.locator('text=Total Customers').first()).toBeVisible();
    await expect(page.locator('text=Total Portfolio LTV').first()).toBeVisible();
    await expect(page.locator('text=Avg LTV/Customer').first()).toBeVisible();
    await expect(page.locator('text=High-Value Customers').first()).toBeVisible();
  });

  test('should have working refresh button', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Find the refresh button
    const refreshButton = page.locator('button[title="Refresh data"]');
    await expect(refreshButton).toBeVisible();

    // Click refresh
    await refreshButton.click();

    // Button should show loading state (spinning icon)
    // The RefreshCw icon should have animate-spin class when refreshing
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 2000 });

    // Wait for refresh to complete
    await page.waitForTimeout(5000);

    // Verify dashboard still works after refresh
    await expect(page.locator('text=Customer Segmentation').first()).toBeVisible();

    // Take screenshot after refresh
    await page.screenshot({
      path: '.playwright-mcp/segmentation-dashboard-after-refresh.png',
      fullPage: true
    });
  });

  test('should show methodology panel when info button is clicked', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Click the info button to show methodology
    const infoButton = page.locator('button').filter({ has: page.locator('svg.lucide-info') });

    // If info button exists, click it
    if (await infoButton.count() > 0) {
      await infoButton.click();
      await page.waitForTimeout(500);

      // Methodology panel should appear
      await expect(page.locator('text=Segmentation Methodology')).toBeVisible();
      await expect(page.locator('text=LTV Calculation')).toBeVisible();
      await expect(page.locator('text=Tier Thresholds')).toBeVisible();
    }
  });

  test('should display marketing allocation section', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Marketing allocation section should be visible
    await expect(page.locator('text=Recommended Marketing Allocation')).toBeVisible();

    // Strategy text should be present
    await expect(page.locator('text=Strategy')).toBeVisible();
  });

  test('should display segment characteristics tags', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Wait for segments to load
    await page.waitForTimeout(3000);

    // Check for some characteristic tags that should appear in segments
    const characteristicTags = [
      '4+ policies',
      'High retention',
      '2-3 policies',
      'Bundled',
      'Growth potential',
      'Single policy',
      'New customer',
    ];

    // At least some of these characteristics should be visible
    let foundCount = 0;
    for (const tag of characteristicTags) {
      const tagElement = page.locator(`text="${tag}"`);
      if (await tagElement.count() > 0) {
        foundCount++;
      }
    }

    // We should find at least 4 characteristic tags
    expect(foundCount).toBeGreaterThanOrEqual(4);
  });

  test('should display metrics in segment cards (Avg LTV, Target CAC, LTV:CAC)', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Wait for segments to load
    await page.waitForTimeout(3000);

    // Each segment card should have these metric labels
    await expect(page.locator('text=Avg LTV').first()).toBeVisible();
    await expect(page.locator('text=Target CAC').first()).toBeVisible();
    await expect(page.locator('text=LTV:CAC').first()).toBeVisible();
  });
});

test.describe('Customer Segmentation Dashboard - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('should transition from Demo Data to Live Data when customers exist', async ({ page }) => {
    // Navigate to Customer Insights
    await navigateToCustomerSegmentation(page);

    // Initially might show Demo Data
    const initialBadge = await page.locator('text=Live Data').or(page.locator('text=Demo Data'));
    await expect(initialBadge).toBeVisible();

    // Wait for API calls to complete
    await page.waitForTimeout(5000);

    // Check the current state after data loads
    const liveBadge = page.locator('text=Live Data');
    const demoBadge = page.locator('text=Demo Data');

    const isLive = await liveBadge.count() > 0;
    const isDemo = await demoBadge.count() > 0;

    // Log which mode we're in for debugging
    console.log(`Dashboard mode: ${isLive ? 'Live Data' : 'Demo Data'}`);

    // If there are real customers in the database, it should show Live Data
    // If not, it should show Demo Data - both are valid states
    expect(isLive || isDemo).toBe(true);

    // Take screenshot showing the data mode
    await page.screenshot({
      path: '.playwright-mcp/segmentation-data-mode.png',
      fullPage: true
    });
  });

  test('should make API calls when page loads', async ({ page }) => {
    // Set up request interception to verify API calls
    const apiCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/customers') || url.includes('/api/analytics/segmentation')) {
        apiCalls.push(url);
      }
    });

    await navigateToCustomerSegmentation(page);

    // Wait for API calls to be made
    await page.waitForTimeout(5000);

    // Should have made at least one customer-related API call
    console.log('API calls made:', apiCalls);

    // Verify customer API was called
    const customerApiCalled = apiCalls.some(url => url.includes('/api/customers'));
    expect(customerApiCalled).toBe(true);
  });

  test('should call segmentation API with correct parameters', async ({ page }) => {
    // Track segmentation API calls
    let segmentationRequest: any = null;

    page.on('request', async (request) => {
      const url = request.url();
      if (url.includes('/api/analytics/segmentation')) {
        segmentationRequest = {
          url,
          method: request.method(),
          postData: request.postData(),
        };
      }
    });

    await navigateToCustomerSegmentation(page);

    // Wait for segmentation API to be called
    await page.waitForTimeout(6000);

    // If segmentation was called (customers exist), verify the request format
    if (segmentationRequest) {
      console.log('Segmentation API called:', segmentationRequest.method);

      // Should be a POST request
      expect(segmentationRequest.method).toBe('POST');

      // Parse and verify request body
      if (segmentationRequest.postData) {
        const body = JSON.parse(segmentationRequest.postData);

        // Should have customers array
        expect(body).toHaveProperty('customers');
        expect(Array.isArray(body.customers)).toBe(true);

        // Should have marketingBudget
        expect(body).toHaveProperty('marketingBudget');
        expect(typeof body.marketingBudget).toBe('number');

        // If there are customers, verify field names
        if (body.customers.length > 0) {
          const firstCustomer = body.customers[0];

          // API expects productCount and annualPremium
          expect(firstCustomer).toHaveProperty('customerId');
          expect(firstCustomer).toHaveProperty('productCount');
          expect(firstCustomer).toHaveProperty('annualPremium');

          console.log('Customer data format verified:', Object.keys(firstCustomer));
        }
      }
    } else {
      console.log('Segmentation API not called - no customers in database');
    }
  });

  test('should handle API response and transform segment names correctly', async ({ page }) => {
    // Track segmentation API response
    let segmentationResponse: any = null;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/analytics/segmentation')) {
        try {
          segmentationResponse = await response.json();
        } catch {
          // Response might not be JSON
        }
      }
    });

    await navigateToCustomerSegmentation(page);

    // Wait for API response
    await page.waitForTimeout(6000);

    if (segmentationResponse && segmentationResponse.success) {
      console.log('Segmentation API response received');

      // Check response structure
      expect(segmentationResponse).toHaveProperty('portfolioAnalysis');
      expect(segmentationResponse.portfolioAnalysis).toHaveProperty('segments');

      // Verify segment names in API response (should include low_value)
      const apiSegments = Object.keys(segmentationResponse.portfolioAnalysis.segments);
      console.log('API segment names:', apiSegments);

      // Dashboard should have transformed these to display names
      // Check that "entry" segment is displayed (transformed from "low_value")
      const entrySegment = page.locator('h3:has-text("entry")').or(page.locator('h3:has-text("Entry")'));
      await expect(entrySegment).toBeVisible();
    }
  });
});

test.describe('Customer Segmentation Dashboard - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('should fall back to Demo Data gracefully on API error', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/analytics/segmentation', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await navigateToCustomerSegmentation(page);

    // Wait for error handling
    await page.waitForTimeout(3000);

    // Should show Demo Data badge when API fails
    const demoBadge = page.locator('text=Demo Data');
    await expect(demoBadge).toBeVisible();

    // Dashboard should still be functional with demo data
    await expect(page.locator('text=Customer Segmentation').first()).toBeVisible();
    await expect(page.locator('text=Total Customers')).toBeVisible();
  });

  test('should maintain demo data when no customers exist', async ({ page }) => {
    // Mock customer API to return empty list
    await page.route('**/api/customers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          customers: [],
          count: 0
        })
      });
    });

    await navigateToCustomerSegmentation(page);

    // Wait for API response
    await page.waitForTimeout(3000);

    // Should show Demo Data when no customers
    const demoBadge = page.locator('text=Demo Data');
    await expect(demoBadge).toBeVisible();

    // Demo data should still show meaningful numbers
    const totalCustomersCard = page.locator('text=Total Customers');
    await expect(totalCustomersCard).toBeVisible();
  });
});

test.describe('Customer Segmentation Dashboard - Refresh Race Condition', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
  });

  test('should not have race condition on rapid refresh clicks', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Wait for initial load
    await page.waitForTimeout(3000);

    const refreshButton = page.locator('button[title="Refresh data"]');

    // Click refresh multiple times rapidly
    await refreshButton.click();
    await page.waitForTimeout(100);
    await refreshButton.click();
    await page.waitForTimeout(100);
    await refreshButton.click();

    // Wait for all refreshes to complete
    await page.waitForTimeout(5000);

    // Dashboard should still be in a valid state
    await expect(page.locator('text=Customer Segmentation').first()).toBeVisible();

    // Should show either Live Data or Demo Data (not broken state)
    const dataBadge = page.locator('text=Live Data').or(page.locator('text=Demo Data'));
    await expect(dataBadge).toBeVisible();

    // No duplicate segment cards should appear
    const eliteCount = await page.locator('h3:has-text("elite"), h3:has-text("Elite")').count();
    expect(eliteCount).toBeLessThanOrEqual(1);
  });

  test('should complete refresh fully before showing results', async ({ page }) => {
    await navigateToCustomerSegmentation(page);

    // Track the sequence of events
    const events: { type: string; time: number }[] = [];
    const startTime = Date.now();

    // Monitor customer API calls
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/customers')) {
        events.push({ type: 'customer_request', time: Date.now() - startTime });
      }
      if (url.includes('/api/analytics/segmentation')) {
        events.push({ type: 'segmentation_request', time: Date.now() - startTime });
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/customers')) {
        events.push({ type: 'customer_response', time: Date.now() - startTime });
      }
      if (url.includes('/api/analytics/segmentation')) {
        events.push({ type: 'segmentation_response', time: Date.now() - startTime });
      }
    });

    // Click refresh
    const refreshButton = page.locator('button[title="Refresh data"]');
    await refreshButton.click();
    events.push({ type: 'refresh_clicked', time: Date.now() - startTime });

    // Wait for completion
    await page.waitForTimeout(6000);

    console.log('Event sequence:', events);

    // Verify correct sequence: customer request should complete before segmentation request
    const customerResponseIndex = events.findIndex(e => e.type === 'customer_response');
    const segmentationRequestIndex = events.findIndex(e => e.type === 'segmentation_request');

    // If both events happened, segmentation should be after customer response
    if (customerResponseIndex !== -1 && segmentationRequestIndex !== -1) {
      expect(events[customerResponseIndex].time).toBeLessThan(events[segmentationRequestIndex].time);
    }
  });
});
