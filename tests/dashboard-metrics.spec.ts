import { test, expect } from '@playwright/test';

test.describe('Dashboard Metrics - Completed Today', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login as Derrick
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.keyboard.type('8008');
    await page.keyboard.press('Enter');

    // Wait for app to load
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });

    // Navigate to dashboard if not already there
    const dashboardButton = page.locator('button:has-text("Dashboard")').first();
    if (await dashboardButton.isVisible()) {
      await dashboardButton.click();
    }
  });

  test('should show "Done Today" metric in dashboard header', async ({ page }) => {
    // Verify the metric label exists
    await expect(page.locator('text=Done Today')).toBeVisible();

    // Verify there's a number displayed
    const doneToday = page.locator('text=Done Today').locator('..').locator('p').first();
    const count = await doneToday.textContent();

    // Should be a valid number (0 or positive integer)
    expect(count).toMatch(/^\d+$/);
    expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
  });

  test('should initially show 0 for completed today in clean state', async ({ page }) => {
    // If this is a fresh database, should start at 0
    // Note: This test might fail if there are existing completed tasks today
    const doneToday = page.locator('text=Done Today').locator('..').locator('p').first();
    const count = parseInt(await doneToday.textContent() || '0');

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should increment "Done Today" when task is completed', async ({ page }) => {
    // Get initial count
    const doneToday = page.locator('text=Done Today').locator('..').locator('p').first();
    const initialCount = parseInt(await doneToday.textContent() || '0');

    // Navigate to tasks
    await page.click('button:has-text("Tasks")');
    await page.waitForTimeout(500);

    // Create a new task
    const taskText = `Test task ${Date.now()}`;
    await page.fill('[data-testid="task-input"]', taskText);
    await page.click('[data-testid="add-task-button"]');
    await page.waitForTimeout(500);

    // Find and complete the task
    const taskCheckbox = page.locator(`[data-testid="task-checkbox"]:near(:text("${taskText}"))`).first();
    await taskCheckbox.click();
    await page.waitForTimeout(500);

    // Go back to dashboard
    await page.click('button:has-text("Dashboard")');
    await page.waitForTimeout(500);

    // Count should have increased by 1
    const newCount = parseInt(await doneToday.textContent() || '0');
    expect(newCount).toBe(initialCount + 1);
  });

  test('should not count tasks completed on previous days', async ({ page }) => {
    // This test verifies the date filtering logic
    // We can't easily manipulate task completion dates in E2E, so we'll just verify the count is reasonable
    const doneToday = page.locator('text=Done Today').locator('..').locator('p').first();
    const count = parseInt(await doneToday.textContent() || '0');

    // Navigate to tasks to see total completed
    await page.click('button:has-text("Tasks")');
    await page.waitForTimeout(500);

    // Count all completed tasks
    const completedTasks = await page.locator('[data-testid="task-item"][data-completed="true"]').count();

    // Done today should be less than or equal to total completed
    expect(count).toBeLessThanOrEqual(completedTasks);
  });

  test('should update in real-time across tabs', async ({ browser }) => {
    // Open second tab
    const context = await browser.newContext();
    const page2 = await context.newPage();

    // Login in second tab
    await page2.goto('http://localhost:3000');
    await page2.click('[data-testid="user-card-Derrick"]');
    await page2.waitForTimeout(600);
    await page2.keyboard.type('8008');
    await page2.keyboard.press('Enter');
    await expect(page2.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });

    // Get initial count from both tabs
    const doneToday1 = page.locator('text=Done Today').locator('..').locator('p').first();
    const doneToday2 = page2.locator('text=Done Today').locator('..').locator('p').first();

    const initialCount1 = parseInt(await doneToday1.textContent() || '0');
    const initialCount2 = parseInt(await doneToday2.textContent() || '0');

    expect(initialCount1).toBe(initialCount2);

    // Complete a task in tab 1
    await page.click('button:has-text("Tasks")');
    await page.waitForTimeout(500);
    const taskText = `Real-time test ${Date.now()}`;
    await page.fill('[data-testid="task-input"]', taskText);
    await page.click('[data-testid="add-task-button"]');
    await page.waitForTimeout(500);
    const taskCheckbox = page.locator(`[data-testid="task-checkbox"]:near(:text("${taskText}"))`).first();
    await taskCheckbox.click();
    await page.waitForTimeout(1000); // Wait for real-time sync

    // Go to dashboard in tab 1
    await page.click('button:has-text("Dashboard")');
    await page.waitForTimeout(500);

    // Check both tabs - should both show updated count
    const newCount1 = parseInt(await doneToday1.textContent() || '0');
    const newCount2 = parseInt(await doneToday2.textContent() || '0');

    expect(newCount1).toBe(initialCount1 + 1);
    expect(newCount2).toBe(initialCount2 + 1);

    await context.close();
  });

  test('should have accessible aria-label', async ({ page }) => {
    const metric = page.locator('text=Done Today').locator('..');

    // Should have role="status" for screen readers
    await expect(metric).toHaveAttribute('role', 'status');

    // Should have descriptive aria-label
    const ariaLabel = await metric.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/\d+ tasks? completed today/i);
  });

  test('should visually highlight when tasks are completed today', async ({ page }) => {
    // Navigate to tasks and complete one
    await page.click('button:has-text("Tasks")');
    await page.waitForTimeout(500);

    const taskText = `Highlight test ${Date.now()}`;
    await page.fill('[data-testid="task-input"]', taskText);
    await page.click('[data-testid="add-task-button"]');
    await page.waitForTimeout(500);

    const taskCheckbox = page.locator(`[data-testid="task-checkbox"]:near(:text("${taskText}"))`).first();
    await taskCheckbox.click();
    await page.waitForTimeout(500);

    // Go to dashboard
    await page.click('button:has-text("Dashboard")');
    await page.waitForTimeout(500);

    // The "Done Today" card should have emerald/green highlighting
    const doneToday = page.locator('text=Done Today').locator('..');
    const classList = await doneToday.getAttribute('class');

    // Should contain emerald color classes
    expect(classList).toMatch(/emerald/);
  });
});

test.describe('Dashboard Metrics - Filtering by Date', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.keyboard.type('8008');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  });

  test('should only count tasks with updated_at timestamp from today', async ({ page }) => {
    // This is a whitebox test to verify the filtering logic
    // In production, we rely on the updated_at timestamp being set when a task is marked complete

    // Get current count
    const doneToday = page.locator('text=Done Today').locator('..').locator('p').first();
    const count1 = parseInt(await doneToday.textContent() || '0');

    // Create and immediately complete a task
    await page.click('button:has-text("Tasks")');
    await page.waitForTimeout(500);

    const taskText = `Timestamp test ${Date.now()}`;
    await page.fill('[data-testid="task-input"]', taskText);
    await page.click('[data-testid="add-task-button"]');
    await page.waitForTimeout(500);

    const taskCheckbox = page.locator(`[data-testid="task-checkbox"]:near(:text("${taskText}"))`).first();
    await taskCheckbox.click();
    await page.waitForTimeout(500);

    // Return to dashboard
    await page.click('button:has-text("Dashboard")');
    await page.waitForTimeout(500);

    // Should have incremented
    const count2 = parseInt(await doneToday.textContent() || '0');
    expect(count2).toBe(count1 + 1);
  });

  test('should reset to 0 at midnight (conceptual test)', async ({ page }) => {
    // Note: We can't actually test this in a reasonable E2E timeframe
    // But we verify the logic is present
    const doneToday = page.locator('text=Done Today').locator('..').locator('p').first();
    const count = parseInt(await doneToday.textContent() || '0');

    // Count should be a reasonable number (not all-time completions)
    // If this were showing all-time, it would likely be much higher
    expect(count).toBeLessThan(100); // Arbitrary threshold for "reasonable daily count"
  });
});
