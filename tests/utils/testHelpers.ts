/**
 * Test Utilities - Improved test infrastructure
 *
 * Provides reliable helper functions for E2E tests with:
 * - Better waiting strategies
 * - Reusable selectors
 * - Retry logic for flaky tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Login helper with improved reliability
 */
export async function loginAsUser(
  page: Page,
  userName: string = 'Derrick',
  pin: string = '8008'
) {
  await page.goto('/');

  // Wait for initial page load
  await page.waitForLoadState('networkidle');

  // Check if already logged in by looking for main app navigation
  const isLoggedIn = await page
    .getByRole('complementary', { name: 'Main navigation' })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (isLoggedIn) {
    return;
  }

  // Find and click user card
  const userCard = page.locator('button').filter({ hasText: userName });
  await userCard.first().waitFor({ state: 'visible', timeout: 10000 });
  await userCard.first().click();

  // Enter PIN
  const pinInputs = page.locator('input[type="password"]');
  await pinInputs.first().waitFor({ state: 'visible', timeout: 5000 });

  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(pin[i]);
  }

  // Wait for auto-submit and app load
  await page.waitForLoadState('networkidle');

  // Close welcome modal if present
  const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
  if (await viewTasksBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await viewTasksBtn.click();
  }

  // Close AI onboarding if present
  const skipOnboarding = page.locator('button').filter({ hasText: /Skip|Close/ });
  if (await skipOnboarding.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipOnboarding.first().click();
  }

  // Wait for main navigation to be ready
  await expect(
    page.getByRole('complementary', { name: 'Main navigation' })
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Wait for app to be fully ready
 */
export async function waitForAppReady(page: Page) {
  // Wait for navigation
  await page
    .getByRole('complementary', { name: 'Main navigation' })
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});

  // Wait for any loading states to clear
  await page.waitForLoadState('domcontentloaded');

  // Wait for network to be idle
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Get task count from UI (flexible selector)
 */
export async function getTaskCount(page: Page): Promise<number> {
  // Try multiple possible selectors for task count
  const selectors = [
    'text=/\\d+\\s+active/i',
    'text=/\\d+\\s+tasks/i',
    'text=/\\d+\\s+total/i',
    '[data-testid="task-count"]',
  ];

  for (const selector of selectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
      const text = await element.textContent();
      const match = text?.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  return 0;
}

/**
 * Check if element exists with retry
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({
      state: 'visible',
      timeout
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for specific view to load
 */
export async function waitForView(
  page: Page,
  view: 'list' | 'board' | 'table' = 'list'
) {
  // Wait for view-specific elements
  const viewSelectors = {
    list: '[data-view="list"], .task-list',
    board: '[data-view="board"], .kanban-column',
    table: '[data-view="table"], table',
  };

  await page
    .locator(viewSelectors[view])
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});

  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Retry an action with exponential backoff
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Check if mobile viewport
 */
export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < 768 : false;
}

/**
 * Set viewport with common presets
 */
export async function setViewport(
  page: Page,
  preset: 'mobile' | 'tablet' | 'desktop' | 'large'
) {
  const presets = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 800 },
    large: { width: 1920, height: 1080 },
  };

  await page.setViewportSize(presets[preset]);
  // Wait for layout to settle after viewport change
}
