import { test } from '@playwright/test';

test.describe('Dashboard Screenshot Capture', () => {
  test('capture all dashboard views', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login as Derrick
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForSelector('input[inputmode="numeric"]', { timeout: 5000 });

    const pinInputs = await page.locator('input[inputmode="numeric"]').all();
    if (pinInputs.length >= 4) {
      await pinInputs[0].fill('8');
      await pinInputs[1].fill('0');
      await pinInputs[2].fill('0');
      await pinInputs[3].fill('8');
    }

    // Wait for dashboard
    await page.waitForSelector('text=Good', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Capture full dashboard - desktop view
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: 'tests/dashboard-review/01-dashboard-full-desktop.png',
      fullPage: false
    });

    // Capture dashboard with full scroll
    await page.screenshot({
      path: 'tests/dashboard-review/02-dashboard-full-scroll.png',
      fullPage: true
    });

    // Hover over different elements to see interactive states
    // Score ring
    const scoreRing = page.locator('text=Score').first();
    if (await scoreRing.isVisible()) {
      await scoreRing.hover();
      await page.screenshot({ path: 'tests/dashboard-review/03-score-ring-hover.png' });
    }

    // Quick action buttons
    const addTaskBtn = page.locator('text=Add Task').first();
    if (await addTaskBtn.isVisible()) {
      await addTaskBtn.hover();
      await page.screenshot({ path: 'tests/dashboard-review/04-add-task-hover.png' });
    }

    // Overdue section
    const overdueSection = page.locator('text=overdue').first();
    if (await overdueSection.isVisible()) {
      await overdueSection.hover();
      await page.screenshot({ path: 'tests/dashboard-review/05-overdue-hover.png' });
    }

    // Mobile view
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'tests/dashboard-review/06-dashboard-mobile.png',
      fullPage: false
    });

    // Mobile full scroll
    await page.screenshot({
      path: 'tests/dashboard-review/07-dashboard-mobile-scroll.png',
      fullPage: true
    });

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'tests/dashboard-review/08-dashboard-tablet.png',
      fullPage: false
    });

    // Back to desktop - expand Daily Digest if available
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForLoadState('networkidle');

    const digestExpand = page.locator('text=Daily Digest').first();
    if (await digestExpand.isVisible()) {
      await digestExpand.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/dashboard-review/09-daily-digest-expanded.png' });
    }

    // Click on different tabs if available (Overview, AI, Team)
    // Use button role with exact text to avoid matching skip links or other elements
    const aiTab = page.locator('button:has-text("AI")').first();
    if (await aiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aiTab.click({ timeout: 5000 });
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/dashboard-review/10-ai-tab.png' });
    }

    const teamTab = page.locator('button:has-text("Team")').first();
    if (await teamTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await teamTab.click({ timeout: 5000 });
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/dashboard-review/11-team-tab.png' });
    }

    // Go back to Overview
    const overviewTab = page.locator('button:has-text("Overview")').first();
    if (await overviewTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await overviewTab.click({ timeout: 5000 });
      await page.waitForLoadState('networkidle');
    }

    // Capture the sidebar navigation area
    await page.screenshot({
      path: 'tests/dashboard-review/12-sidebar-focus.png',
      clip: { x: 0, y: 0, width: 280, height: 900 }
    });

    // Capture the main content area only
    await page.screenshot({
      path: 'tests/dashboard-review/13-main-content-focus.png',
      clip: { x: 280, y: 0, width: 1160, height: 900 }
    });

    console.log('Dashboard screenshots captured successfully!');
  });
});
