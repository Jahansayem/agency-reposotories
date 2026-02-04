import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Visual Dashboard Color Check', () => {
  test('Dashboard in light mode', async ({ page }) => {
    await loginAsUser(page, 'Derrick', '8008');

    // Ensure we're in light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    });
    await page.waitForTimeout(500);

    // Navigate to Dashboard if not already there
    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.isVisible().catch(() => false)) {
      await dashboardButton.click();
      await page.waitForTimeout(1000);
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/dashboard-light-mode.png',
      fullPage: true
    });

    console.log('✓ Light mode screenshot saved');
  });

  test('Dashboard in dark mode', async ({ page }) => {
    await loginAsUser(page, 'Derrick', '8008');

    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    });
    await page.waitForTimeout(500);

    // Navigate to Dashboard if not already there
    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.isVisible().catch(() => false)) {
      await dashboardButton.click();
      await page.waitForTimeout(1000);
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/dashboard-dark-mode.png',
      fullPage: true
    });

    console.log('✓ Dark mode screenshot saved');
  });
});
