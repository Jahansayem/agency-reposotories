import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Dashboard Verification', () => {
  test('Dashboard loads without errors', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors (uncaught exceptions)
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Login
    await loginAsUser(page, 'Derrick', '8008');

    // Ensure theme is set (this seems to help prevent race conditions)
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    });
    await page.waitForLoadState('networkidle');

    // Navigate to Dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Take screenshot for verification
    await page.screenshot({
      path: 'test-results/dashboard-verification.png',
      fullPage: true
    });

    // Check for error boundary
    const errorBoundary = page.locator('text="Something went wrong"');
    const hasErrorBoundary = await errorBoundary.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasErrorBoundary) {
      // Get the error message if visible
      const errorMessage = await page.locator('pre').textContent().catch(() => 'No error message');
      console.error('ErrorBoundary triggered:', errorMessage);
    }

    // Assertions
    expect(hasErrorBoundary, 'Dashboard should not show error boundary').toBe(false);

    // Check for critical page errors
    const criticalErrors = pageErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('ResizeObserver') &&
      !e.includes('Network')
    );
    expect(criticalErrors, 'Should have no critical page errors').toHaveLength(0);

    // Verify dashboard elements are visible
    const dashboardContent = page.locator('[class*="Dashboard"], [data-testid="dashboard"]').first();
    const greeting = page.locator('text=/Good (morning|afternoon|evening)/i');
    const userName = page.locator('text="Derrick"');

    // At least one dashboard indicator should be visible
    const hasGreeting = await greeting.isVisible({ timeout: 3000 }).catch(() => false);
    const hasUserName = await userName.first().isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasGreeting || hasUserName, 'Dashboard content should be visible').toBe(true);

    console.log('✅ Dashboard loaded successfully');
    console.log('Console errors:', consoleErrors.length > 0 ? consoleErrors : 'None');
    console.log('Page errors:', pageErrors.length > 0 ? pageErrors : 'None');
  });

  test('Dashboard productivity score renders correctly', async ({ page }) => {
    await loginAsUser(page, 'Derrick', '8008');

    // Navigate to Dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard"), nav a:has-text("Dashboard")').first();
    if (await dashboardButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Check for productivity score ring
    const progressRing = page.locator('svg circle[stroke-dasharray]');
    const hasProgressRing = await progressRing.first().isVisible({ timeout: 3000 }).catch(() => false);

    // Score should be a number between 0-100
    const scoreText = page.locator('text=/^\\d{1,3}$/').first();
    const hasScore = await scoreText.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasProgressRing || hasScore, 'Productivity score should be visible').toBe(true);
    console.log('✅ Productivity score renders correctly');
  });

  test('Dashboard tabs switch without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await loginAsUser(page, 'Derrick', '8008');

    // Navigate to Dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard"), nav a:has-text("Dashboard")').first();
    if (await dashboardButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Test tab switching
    const tabs = ['Overview', 'AI', 'Team'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tab.click();
        await page.waitForLoadState('networkidle');

        // Check no errors occurred
        expect(pageErrors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
        console.log(`✅ ${tabName} tab works`);
      }
    }
  });
});
