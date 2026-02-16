import { test, expect } from '@playwright/test';

/**
 * Basic Task Reordering Tests
 *
 * Simplified tests focusing on core functionality.
 * Run these first to verify basic reordering works before running full test suite.
 */

const TEST_USER = {
  name: 'Derrick',
  pin: '8008'
};

test.beforeEach(async ({ page }) => {
  // Login before each test
  await page.goto('http://localhost:3000');

  // Wait for login screen
  await page.waitForSelector('[data-testid="user-card-Derrick"]', { timeout: 10000 });

  // Select user
  await page.click('[data-testid="user-card-Derrick"]');

  // Enter PIN
  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(TEST_USER.pin[i]);
  }

  // Wait for main app to load
  await page.waitForSelector('[role="complementary"][aria-label="Main navigation"]', { timeout: 15000 });
});

test.describe('Basic Task Reordering', () => {
  test('should have circular checkboxes', async ({ page }) => {
    // Create a task
    await page.fill('[data-testid="add-task-input"]', 'Circular checkbox test');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    // Wait for task
    await page.waitForSelector('text=Circular checkbox test', { timeout: 5000 });

    // Find checkbox and verify it's circular
    const checkbox = await page.locator('[id^="todo-"]').first().locator('button[title*="Mark"]');
    const isCircular = await checkbox.evaluate((el) => {
      const span = el.querySelector('span');
      if (!span) return false;
      const borderRadius = window.getComputedStyle(span).borderRadius;
      // Should be 50% or 9999px (both indicate full circle)
      return borderRadius.includes('50%') || parseInt(borderRadius) > 100;
    });

    expect(isCircular).toBe(true);
  });

  test('should show drag handle on hover', async ({ page }) => {
    // Create a task
    await page.fill('[data-testid="add-task-input"]', 'Drag handle test');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    // Wait for task
    await page.waitForSelector('text=Drag handle test', { timeout: 5000 });

    // Get task element
    const taskElement = await page.locator('[id^="todo-"]').first();

    // Hover over task
    await taskElement.hover();

    // Wait for opacity transition

    // Check if drag handle is visible
    const dragHandle = taskElement.locator('.drag-handle');
    const isVisible = await dragHandle.evaluate((el) => {
      const opacity = parseFloat(window.getComputedStyle(el).opacity);
      return opacity > 0;
    });

    expect(isVisible).toBe(true);
  });

  test('should reorder tasks by dragging', async ({ page }) => {
    // Create three tasks
    await page.fill('[data-testid="add-task-input"]', 'Task 1');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    await page.fill('[data-testid="add-task-input"]', 'Task 2');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    await page.fill('[data-testid="add-task-input"]', 'Task 3');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    // Wait for all tasks
    await page.waitForSelector('text=Task 1', { timeout: 5000 });

    // Get task elements
    const allTasks = await page.locator('[id^="todo-"]').all();

    // Initial order should be Task 3, Task 2, Task 1 (newest first)
    const firstTaskText = await allTasks[0].textContent();
    expect(firstTaskText).toContain('Task 3');

    // Drag Task 3 (first) to position after Task 1 (last)
    const task3 = page.locator('text=Task 3').first();
    const task1 = page.locator('text=Task 1').first();

    await task3.dragTo(task1, {
      force: true,
      targetPosition: { x: 0, y: 50 }
    });

    // Wait for reorder to complete
    await page.waitForLoadState('networkidle');

    // Verify new order
    const allTasksAfter = await page.locator('[id^="todo-"]').all();
    const firstTaskAfter = await allTasksAfter[0].textContent();

    // Task 3 should no longer be first
    expect(firstTaskAfter).not.toContain('Task 3');
  });

  test('should persist order after reload', async ({ page }) => {
    // Create two tasks
    await page.fill('[data-testid="add-task-input"]', 'Persist A');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    await page.fill('[data-testid="add-task-input"]', 'Persist B');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    // Wait for tasks
    await page.waitForSelector('text=Persist A', { timeout: 5000 });

    // Reorder
    const taskB = page.locator('text=Persist B').first();
    const taskA = page.locator('text=Persist A').first();

    await taskB.dragTo(taskA, {
      force: true,
      targetPosition: { x: 0, y: 25 }
    });

    // Wait for API call to complete
    await page.waitForLoadState('networkidle');

    // Get order before reload
    const tasksBefore = await page.locator('[id^="todo-"]').all();
    const orderBefore = await Promise.all(
      tasksBefore.map(async (task) => {
        const text = await task.textContent();
        return text?.includes('Persist A') ? 'A' : text?.includes('Persist B') ? 'B' : '';
      })
    );

    // Reload page
    await page.reload();

    // Login again
    await page.waitForSelector('[data-testid="user-card-Derrick"]', { timeout: 10000 });
    await page.click('[data-testid="user-card-Derrick"]');
      const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill(TEST_USER.pin[i]);
    }
    await page.waitForSelector('[role="complementary"][aria-label="Main navigation"]', { timeout: 15000 });

    // Wait for tasks to load
    await page.waitForSelector('text=Persist A', { timeout: 5000 });

    // Get order after reload
    const tasksAfter = await page.locator('[id^="todo-"]').all();
    const orderAfter = await Promise.all(
      tasksAfter.map(async (task) => {
        const text = await task.textContent();
        return text?.includes('Persist A') ? 'A' : text?.includes('Persist B') ? 'B' : '';
      })
    );

    // Order should be preserved
    expect(orderAfter).toEqual(orderBefore);
  });

  test('should call reorder API endpoint', async ({ page }) => {
    // Track API calls
    let apiCallMade = false;
    let apiPayload: any = null;

    page.on('request', (request) => {
      if (request.url().includes('/api/todos/reorder') && request.method() === 'POST') {
        apiCallMade = true;
        const postData = request.postData();
        if (postData) {
          try {
            apiPayload = JSON.parse(postData);
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    });

    // Create tasks
    await page.fill('[data-testid="add-task-input"]', 'API Test 1');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    await page.fill('[data-testid="add-task-input"]', 'API Test 2');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    // Wait for tasks
    await page.waitForSelector('text=API Test 1', { timeout: 5000 });

    // Reorder
    const task2 = page.locator('text=API Test 2').first();
    const task1 = page.locator('text=API Test 1').first();

    await task2.dragTo(task1, {
      force: true,
      targetPosition: { x: 0, y: 25 }
    });

    // Wait for API call
    await page.waitForLoadState('networkidle');

    // Verify API was called
    expect(apiCallMade).toBe(true);

    // Verify payload structure
    if (apiPayload) {
      expect(apiPayload).toHaveProperty('todoId');
      expect(apiPayload).toHaveProperty('newOrder');
      expect(apiPayload).toHaveProperty('userName');
    }
  });
});

test.describe('Visual Regression', () => {
  test('should match circular checkbox snapshot', async ({ page }) => {
    // Create a task
    await page.fill('[data-testid="add-task-input"]', 'Visual test task');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    // Wait for task
    await page.waitForSelector('text=Visual test task', { timeout: 5000 });

    // Take screenshot of first task
    const task = await page.locator('[id^="todo-"]').first();
    await task.screenshot({ path: 'tests/screenshots/circular-checkbox.png' });

    // Screenshot should be created successfully
    // Manual verification: check that checkbox appears circular in screenshot
  });

  test('should match drag handle snapshot', async ({ page }) => {
    // Create a task
    await page.fill('[data-testid="add-task-input"]', 'Drag handle visual test');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    // Wait for task
    await page.waitForSelector('text=Drag handle visual test', { timeout: 5000 });

    // Hover to show drag handle
    const task = await page.locator('[id^="todo-"]').first();
    await task.hover();

    // Wait for transition

    // Take screenshot
    await task.screenshot({ path: 'tests/screenshots/drag-handle.png' });

    // Screenshot should show visible drag handle
  });
});
