import { test, expect } from '@playwright/test';

test.describe('Dashboard Theme Verification', () => {
  test('dashboard should not flash white and should respect dark mode', async ({ page }) => {
    console.log('\n=== NAVIGATE TO APP ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('\n=== LOGIN AS DERRICK ===');
    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(500);

    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await page.waitForTimeout(4000);

    // Close any dialogs
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('\n=== CHECK INITIAL THEME ===');
    const htmlClasses = await page.locator('html').getAttribute('class');
    console.log('HTML classes:', htmlClasses);

    const isDarkMode = htmlClasses?.includes('dark');
    console.log('Is dark mode?', isDarkMode);

    // Navigate to dashboard (click on Dashboard in sidebar)
    console.log('\n=== NAVIGATE TO DASHBOARD ===');
    const dashboardButton = page.locator('button:has-text("Dashboard"), a:has-text("Dashboard")').first();
    await dashboardButton.click();
    await page.waitForTimeout(1000);

    console.log('\n=== CHECK DASHBOARD BACKGROUND COLOR ===');

    // Get the background color of the dashboard container
    const dashboardBg = await page.evaluate(() => {
      const dashboard = document.querySelector('[class*="min-h-screen"]');
      if (!dashboard) return null;

      const styles = window.getComputedStyle(dashboard as Element);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      };
    });

    console.log('Dashboard background:', dashboardBg?.backgroundColor);
    console.log('Dashboard text color:', dashboardBg?.color);

    // In dark mode, background should be dark (rgb values all < 50)
    // In light mode, background should be light (rgb values all > 200)
    if (isDarkMode) {
      console.log('\n✅ Expected: Dark background (RGB < 50)');
      // Parse rgb(r, g, b) string
      const bgMatch = dashboardBg?.backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (bgMatch) {
        const [, r, g, b] = bgMatch.map(Number);
        console.log(`Actual RGB: (${r}, ${g}, ${b})`);

        // All RGB values should be low for dark mode
        const isDarkBg = r < 50 && g < 50 && b < 50;
        console.log(isDarkBg ? '✅ Background is dark' : '❌ Background is NOT dark (white flash!)');
      }
    } else {
      console.log('\n✅ Expected: Light background (RGB > 200)');
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/dashboard-theme-check.png', fullPage: true });
    console.log('\nScreenshot saved: /tmp/dashboard-theme-check.png');

    await page.waitForTimeout(2000);
  });
});
