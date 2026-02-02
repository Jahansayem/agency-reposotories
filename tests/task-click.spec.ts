import { test, expect } from '@playwright/test';

test.describe('Task Click Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto('http://localhost:3000');

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
    await page.waitForTimeout(3000);

    // Dismiss any welcome modals by clicking View Tasks button with force
    const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
    if (await viewTasksBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewTasksBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Wait for tasks view to be ready - wait for either tasks to appear or network to settle
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

    // Find a task item - look for listitem role
    const firstTask = page.locator('[role="listitem"]').first();
    await expect(firstTask).toBeVisible({ timeout: 5000 });

    // Click on the task - use force to bypass any overlays
    await firstTask.click({ position: { x: 200, y: 20 }, force: true });

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

    // Close the modal using X button
    const closeButton = page.locator('button[aria-label*="Close"]').first();
    await closeButton.click({ force: true });
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('task detail modal displays all key sections', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Click on the first task
    const firstTask = page.locator('[role="listitem"]').first();
    await expect(firstTask).toBeVisible({ timeout: 5000 });
    await firstTask.click({ position: { x: 200, y: 20 }, force: true });

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
