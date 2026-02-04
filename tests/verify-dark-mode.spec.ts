import { test, expect } from '@playwright/test';

test.describe('Dashboard Dark Mode Verification', () => {
  test('dashboard background should use CSS variable in dark mode', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3004');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Login as Derrick
    const derrickCard = page.locator('[data-testid="user-card-Derrick"]').or(page.locator('text=Derrick').first());
    if (await derrickCard.isVisible()) {
      await derrickCard.click();
      await page.fill('input[type="text"]', '8008');
      await page.click('button:has-text("Login")');
    }

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Navigate to dashboard view if not already there
    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.isVisible()) {
      await dashboardButton.click();
      await page.waitForTimeout(1000);
    }

    // Get the main dashboard container
    const dashboardContainer = page.locator('div.min-h-full').first();

    // Check computed background color in dark mode
    const backgroundColor = await dashboardContainer.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log('Dashboard background color in dark mode:', backgroundColor);

    // In dark mode, --background should be #0A1628 which is rgb(10, 22, 40)
    // The background should NOT be slate-50 which is rgb(248, 250, 252)
    expect(backgroundColor).not.toBe('rgb(248, 250, 252)');

    // Toggle to light mode
    const themeToggle = page.locator('button[aria-label*="theme"]').or(page.locator('button:has-text("☀")'));
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Check background in light mode
      const lightBackground = await dashboardContainer.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('Dashboard background color in light mode:', lightBackground);

      // In light mode, --background should be #F8FAFC which is rgb(248, 250, 252)
      expect(lightBackground).toBe('rgb(248, 250, 252)');

      // Toggle back to dark mode
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Verify it goes back to dark
      const darkBackground = await dashboardContainer.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('Dashboard background after toggling back to dark:', darkBackground);
      expect(darkBackground).not.toBe('rgb(248, 250, 252)');
    }
  });

  test('daily digest panel should have dark background in dark mode', async ({ page }) => {
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');

    // Login
    const derrickCard = page.locator('[data-testid="user-card-Derrick"]').or(page.locator('text=Derrick').first());
    if (await derrickCard.isVisible()) {
      await derrickCard.click();
      await page.fill('input[type="text"]', '8008');
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(2000);
    }

    // Navigate to dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.isVisible()) {
      await dashboardButton.click();
      await page.waitForTimeout(1000);
    }

    // Find the Daily Digest panel
    const digestPanel = page.locator('text=Daily Digest').locator('..').locator('..');

    if (await digestPanel.isVisible()) {
      // Take a screenshot for visual verification
      await page.screenshot({
        path: 'tests/screenshots/dark-mode-dashboard.png',
        fullPage: true
      });

      console.log('Screenshot saved to tests/screenshots/dark-mode-dashboard.png');

      // Check that there are no white backgrounds (slate-50)
      const whiteBackgrounds = await page.locator('[class*="bg-slate-50"]').count();

      if (whiteBackgrounds > 0) {
        console.warn(`Found ${whiteBackgrounds} elements with hardcoded bg-slate-50`);
      }

      expect(whiteBackgrounds).toBe(0);
    }
  });
});
