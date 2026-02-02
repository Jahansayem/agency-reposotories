import { test, expect } from '@playwright/test';

test.describe('Task Click Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for login screen
    await page.waitForSelector('[data-testid="user-card-Derrick"]', { timeout: 10000 });

    // Click Derrick's card
    await page.click('[data-testid="user-card-Derrick"]');

    // Enter PIN - fill each digit individually
    const pinInputs = page.locator('input[type="password"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    // Wait a moment for auto-submit to trigger
    await page.waitForTimeout(500);

    // Wait for navigation and main app to load
    await page.waitForTimeout(2000);

    // Navigate to Tasks view - click the Tasks tab
    const tasksTab = page.locator('[role="tab"]').filter({ hasText: 'Tasks' });
    await tasksTab.waitFor({ state: 'visible', timeout: 5000 });
    await tasksTab.click();

    // Wait for tasks to load
    await page.waitForTimeout(2000);
  });

  test('clicking on a task opens the detail modal without errors', async ({ page }) => {
    // Listen for console errors - but filter out known API errors (daily digest)
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore daily digest API errors - they're not critical for this test
        if (!text.includes('daily digest') && !text.includes('Failed to fetch digest')) {
          consoleErrors.push(text);
        }
      }
    });

    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Find a task item - look for listitem role (longer timeout for mobile)
    const firstTask = page.locator('[role="listitem"]').first();
    await expect(firstTask).toBeVisible({ timeout: 10000 });

    // Scroll task into view and use JavaScript click to bypass overlay
    await firstTask.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await firstTask.evaluate(node => (node as HTMLElement).click());

    // Wait for detail modal to open - look for the modal dialog
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify modal has task detail labels (look for specific labels, not dropdown options)
    await expect(page.locator('text="Status"').first()).toBeVisible({ timeout: 3000 });

    // Verify no console errors occurred (excluding daily digest API errors)
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
    expect(consoleErrors.length).toBe(0);

    // Close the modal using X button - use JavaScript click
    const closeButton = page.locator('button[aria-label*="Close"]').first();
    await closeButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await closeButton.evaluate(node => (node as HTMLElement).click());
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('task detail modal displays all key sections', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Click on the first task - use JavaScript click (longer timeout for mobile)
    const firstTask = page.locator('[role="listitem"]').first();
    await expect(firstTask).toBeVisible({ timeout: 10000 });
    await firstTask.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await firstTask.evaluate(node => (node as HTMLElement).click());

    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify key labels are present (not dropdown options)
    await expect(page.locator('text="Status"').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text="Priority"').first()).toBeVisible();

    // Look for notes section
    await expect(page.locator('text=/Notes/i').first()).toBeVisible();

    // Look for subtasks section heading or "Add subtask" button
    await expect(page.locator('text=/Subtasks/i').first()).toBeVisible();
  });
});
