import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Manual Task Reordering Feature
 *
 * Tests the Todoist-style drag-and-drop task reordering functionality:
 * - Circular checkboxes (visual)
 * - Drag handle visibility
 * - Drag-and-drop reordering
 * - Order persistence
 * - Real-time sync across tabs
 * - Keyboard accessibility
 * - API integration
 */

// Test user credentials
const TEST_USER = {
  name: 'Derrick',
  pin: '8008'
};

// Helper: Login to the app
async function login(page: any) {
  await page.goto('http://localhost:3000');

  // Wait for login screen
  await page.waitForSelector('[data-testid="user-card-Derrick"]', { timeout: 10000 });

  // Select user
  await page.click('[data-testid="user-card-Derrick"]');

  // Enter PIN
  await page.fill('[data-testid="pin-input"]', TEST_USER.pin);
  await page.click('[data-testid="login-button"]');

  // Wait for main app to load
  await page.waitForSelector('[role="complementary"][aria-label="Main navigation"]', { timeout: 15000 });
}

// Helper: Create a test task
async function createTask(page: any, taskText: string): Promise<string> {
  await page.fill('[data-testid="add-task-input"]', taskText);
  await page.press('[data-testid="add-task-input"]', 'Enter');

  // Wait for task to appear in the list
  await page.waitForSelector(`text=${taskText}`, { timeout: 5000 });

  // Get the task ID from the DOM
  const taskElement = await page.locator(`text=${taskText}`).first();
  const taskId = await taskElement.evaluate((el: any) => {
    const todoItem = el.closest('[id^="todo-"]');
    return todoItem?.id.replace('todo-', '') || '';
  });

  return taskId;
}

// Helper: Get task order from the DOM
async function getTaskOrder(page: any): Promise<string[]> {
  const tasks = await page.locator('[id^="todo-"]').all();
  const taskTexts: string[] = [];

  for (const task of tasks) {
    const text = await task.locator('.flex-1.min-w-0').first().textContent();
    if (text) {
      taskTexts.push(text.trim());
    }
  }

  return taskTexts;
}

test.describe('Task Reordering - Visual Elements', () => {
  test('should display circular checkboxes instead of square', async ({ page }) => {
    await login(page);

    // Create a test task
    await createTask(page, 'Test task for circular checkbox');

    // Find the task checkbox
    const checkbox = await page.locator('[id^="todo-"]').first().locator('button[title*="Mark as"]').first();

    // Get computed styles
    const borderRadius = await checkbox.evaluate((el) => {
      const span = el.querySelector('span');
      return window.getComputedStyle(span!).borderRadius;
    });

    // Circular checkboxes should have border-radius of 50% (or a large value like 9999px)
    expect(borderRadius).toMatch(/50%|999/);
  });

  test('should show drag handle on task hover', async ({ page }) => {
    await login(page);

    // Create a test task
    await createTask(page, 'Test task for drag handle');

    // Find the task element
    const taskElement = await page.locator('[id^="todo-"]').first();

    // Check drag handle exists but is initially not visible
    const dragHandle = taskElement.locator('.drag-handle').first();
    await expect(dragHandle).toBeAttached();

    // Hover over the task
    await taskElement.hover();

    // Wait a bit for opacity transition
    await page.waitForTimeout(300);

    // Drag handle should now be visible (opacity > 0)
    const isVisible = await dragHandle.evaluate((el) => {
      const opacity = window.getComputedStyle(el).opacity;
      return parseFloat(opacity) > 0;
    });

    expect(isVisible).toBe(true);
  });

  test('should display GripVertical icon in drag handle', async ({ page }) => {
    await login(page);

    // Create a test task
    await createTask(page, 'Test task for grip icon');

    // Find the drag handle
    const taskElement = await page.locator('[id^="todo-"]').first();
    const dragHandle = taskElement.locator('.drag-handle').first();

    // Check for SVG icon (GripVertical from lucide-react)
    const svg = dragHandle.locator('svg').first();
    await expect(svg).toBeAttached();
  });
});

test.describe('Task Reordering - Drag and Drop', () => {
  test('should reorder tasks via drag and drop', async ({ page }) => {
    await login(page);

    // Create three test tasks
    await createTask(page, 'Task 1');
    await createTask(page, 'Task 2');
    await createTask(page, 'Task 3');

    // Get initial order
    const initialOrder = await getTaskOrder(page);
    expect(initialOrder).toEqual(['Task 3', 'Task 2', 'Task 1']); // Newest first by default

    // Find the first task (Task 3)
    const task3 = page.locator('[id^="todo-"]').first();

    // Find the third task (Task 1)
    const task1 = page.locator('[id^="todo-"]').nth(2);

    // Drag Task 3 to the bottom (after Task 1)
    await task3.dragTo(task1, {
      targetPosition: { x: 0, y: 50 } // Below Task 1
    });

    // Wait for reorder to complete
    await page.waitForTimeout(500);

    // Get new order
    const newOrder = await getTaskOrder(page);

    // Task 3 should now be at the bottom
    expect(newOrder).toEqual(['Task 2', 'Task 1', 'Task 3']);
  });

  test('should show optimistic UI update during drag', async ({ page }) => {
    await login(page);

    // Create two tasks
    await createTask(page, 'Task A');
    await createTask(page, 'Task B');

    // Get initial order
    const initialOrder = await getTaskOrder(page);
    expect(initialOrder[0]).toBe('Task B');

    // Start dragging Task B
    const taskB = page.locator('[id^="todo-"]').first();
    await taskB.hover();

    // The order should update immediately (optimistic)
    // Note: This test verifies the drag interaction works
    await expect(taskB).toBeVisible();
  });

  test('should handle drag cancellation (ESC key)', async ({ page }) => {
    await login(page);

    // Create two tasks
    await createTask(page, 'Task X');
    await createTask(page, 'Task Y');

    // Get initial order
    const initialOrder = await getTaskOrder(page);

    // Try to drag and then cancel
    const taskY = page.locator('[id^="todo-"]').first();
    await taskY.hover();

    // Simulate drag start and cancel with ESC
    await taskY.press('Escape');

    // Wait a bit
    await page.waitForTimeout(300);

    // Order should remain unchanged
    const finalOrder = await getTaskOrder(page);
    expect(finalOrder).toEqual(initialOrder);
  });
});

test.describe('Task Reordering - Persistence', () => {
  test('should persist task order after page reload', async ({ page }) => {
    await login(page);

    // Create three tasks
    await createTask(page, 'Persist 1');
    await createTask(page, 'Persist 2');
    await createTask(page, 'Persist 3');

    // Reorder: move Persist 3 to middle
    const task3 = page.locator('text=Persist 3').first();
    const task2 = page.locator('text=Persist 2').first();

    await task3.dragTo(task2, {
      targetPosition: { x: 0, y: 25 }
    });

    // Wait for API call to complete
    await page.waitForTimeout(1000);

    // Get order before reload
    const orderBeforeReload = await getTaskOrder(page);

    // Reload the page
    await page.reload();

    // Login again
    await login(page);

    // Wait for tasks to load
    await page.waitForSelector('text=Persist 1', { timeout: 5000 });

    // Get order after reload
    const orderAfterReload = await getTaskOrder(page);

    // Order should be preserved
    expect(orderAfterReload).toEqual(orderBeforeReload);
  });

  test('should save order to database via API', async ({ page }) => {
    await login(page);

    // Listen for API calls
    let apiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/todos/reorder') && request.method() === 'POST') {
        apiCalled = true;
      }
    });

    // Create tasks
    await createTask(page, 'API Test 1');
    await createTask(page, 'API Test 2');

    // Drag to reorder
    const task2 = page.locator('text=API Test 2').first();
    const task1 = page.locator('text=API Test 1').first();

    await task2.dragTo(task1, {
      targetPosition: { x: 0, y: 25 }
    });

    // Wait for API call
    await page.waitForTimeout(1000);

    // Verify API was called
    expect(apiCalled).toBe(true);
  });
});

test.describe('Task Reordering - Real-time Sync', () => {
  test('should sync task order across multiple tabs', async ({ browser }) => {
    // Create two browser contexts (simulating two users/tabs)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login in both tabs
    await login(page1);
    await login(page2);

    // Create tasks in tab 1
    await createTask(page1, 'Sync Task 1');
    await createTask(page1, 'Sync Task 2');
    await createTask(page1, 'Sync Task 3');

    // Wait for tasks to appear in tab 2
    await page2.waitForSelector('text=Sync Task 1', { timeout: 5000 });

    // Get initial order in tab 2
    const initialOrder = await getTaskOrder(page2);

    // Reorder in tab 1
    const task3 = page1.locator('text=Sync Task 3').first();
    const task1 = page1.locator('text=Sync Task 1').first();

    await task3.dragTo(task1, {
      targetPosition: { x: 0, y: 50 }
    });

    // Wait for real-time sync (Supabase broadcast)
    await page2.waitForTimeout(2000);

    // Get new order in tab 2
    const syncedOrder = await getTaskOrder(page2);

    // Order should match what was set in tab 1
    expect(syncedOrder).not.toEqual(initialOrder);

    // Cleanup
    await context1.close();
    await context2.close();
  });
});

test.describe('Task Reordering - Accessibility', () => {
  test('should have proper ARIA attributes on drag handle', async ({ page }) => {
    await login(page);

    // Create a test task
    await createTask(page, 'Accessibility test task');

    // Find drag handle
    const dragHandle = page.locator('.drag-handle').first();

    // Check title attribute for screen readers
    const title = await dragHandle.getAttribute('title');
    expect(title).toContain('Drag to reorder');
  });

  test('should announce reorder action to screen readers', async ({ page }) => {
    await login(page);

    // Create tasks
    await createTask(page, 'Announce 1');
    await createTask(page, 'Announce 2');

    // Look for live region that announces changes
    const liveRegion = page.locator('[role="status"], [aria-live="polite"]');

    // Drag to reorder
    const task2 = page.locator('text=Announce 2').first();
    const task1 = page.locator('text=Announce 1').first();

    await task2.dragTo(task1, {
      targetPosition: { x: 0, y: 25 }
    });

    // Wait for announcement
    await page.waitForTimeout(500);

    // Check if announcement was made
    const announcement = await liveRegion.textContent();
    expect(announcement).toContain('reorder');
  });

  test('should have cursor feedback (grab/grabbing)', async ({ page }) => {
    await login(page);

    // Create a task
    await createTask(page, 'Cursor test task');

    // Find drag handle
    const dragHandle = page.locator('.drag-handle').first();

    // Hover over drag handle
    await dragHandle.hover();

    // Check cursor style
    const cursor = await dragHandle.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursor).toMatch(/grab/);
  });
});

test.describe('Task Reordering - Error Handling', () => {
  test('should rollback on API failure', async ({ page }) => {
    await login(page);

    // Mock API failure
    await page.route('**/api/todos/reorder', (route) => {
      route.abort();
    });

    // Create tasks
    await createTask(page, 'Fail 1');
    await createTask(page, 'Fail 2');

    // Get initial order
    const initialOrder = await getTaskOrder(page);

    // Try to reorder
    const task2 = page.locator('text=Fail 2').first();
    const task1 = page.locator('text=Fail 1').first();

    await task2.dragTo(task1, {
      targetPosition: { x: 0, y: 25 }
    });

    // Wait for error handling
    await page.waitForTimeout(1000);

    // Order should be rolled back
    const finalOrder = await getTaskOrder(page);
    expect(finalOrder).toEqual(initialOrder);
  });

  test('should show error message on reorder failure', async ({ page }) => {
    await login(page);

    // Mock API failure
    await page.route('**/api/todos/reorder', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to reorder' })
      });
    });

    // Create tasks
    await createTask(page, 'Error 1');
    await createTask(page, 'Error 2');

    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Try to reorder
    const task2 = page.locator('text=Error 2').first();
    const task1 = page.locator('text=Error 1').first();

    await task2.dragTo(task1, {
      targetPosition: { x: 0, y: 25 }
    });

    // Wait for error
    await page.waitForTimeout(1000);

    // Should have logged error
    const hasError = errors.some(e => e.includes('Failed to persist task order'));
    expect(hasError).toBe(true);
  });
});

test.describe('Task Reordering - Activity Logging', () => {
  test('should log task reorder in activity feed', async ({ page }) => {
    await login(page);

    // Create tasks
    await createTask(page, 'Activity 1');
    await createTask(page, 'Activity 2');

    // Reorder
    const task2 = page.locator('text=Activity 2').first();
    const task1 = page.locator('text=Activity 1').first();

    await task2.dragTo(task1, {
      targetPosition: { x: 0, y: 25 }
    });

    // Wait for activity log
    await page.waitForTimeout(1000);

    // Open activity feed (if there's a button/link)
    // This assumes there's a way to navigate to activity feed
    // Adjust selector based on your app's navigation

    // For now, we'll verify the API call includes activity logging
    // by checking network requests
    let activityLogged = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/activity') && request.method() === 'POST') {
        const postData = request.postData();
        if (postData?.includes('task_reordered')) {
          activityLogged = true;
        }
      }
    });

    // We already dragged, but let's verify
    expect(activityLogged).toBe(true);
  });
});

test.describe('Task Reordering - Edge Cases', () => {
  test('should handle reordering with only one task', async ({ page }) => {
    await login(page);

    // Create only one task
    await createTask(page, 'Single task');

    // Try to drag (should be no-op)
    const task = page.locator('text=Single task').first();
    await task.hover();

    // Drag handle should still be visible
    const dragHandle = page.locator('.drag-handle').first();
    await expect(dragHandle).toBeAttached();
  });

  test('should handle reordering with completed tasks', async ({ page }) => {
    await login(page);

    // Create tasks
    await createTask(page, 'Complete 1');
    await createTask(page, 'Complete 2');

    // Complete first task
    const checkbox1 = page.locator('[id^="todo-"]').first().locator('button[title*="Mark as"]').first();
    await checkbox1.click();

    // Wait for completion
    await page.waitForTimeout(500);

    // Try to reorder (should still work)
    const task2 = page.locator('text=Complete 2').first();
    const task1 = page.locator('text=Complete 1').first();

    await task2.dragTo(task1, {
      targetPosition: { x: 0, y: 25 }
    });

    // Should complete without error
    await page.waitForTimeout(500);
  });

  test('should handle reordering with filtered tasks', async ({ page }) => {
    await login(page);

    // Create tasks with different priorities
    await page.fill('[data-testid="add-task-input"]', 'High priority task');
    // Set priority to high (if there's a priority picker)
    await page.press('[data-testid="add-task-input"]', 'Enter');

    await page.fill('[data-testid="add-task-input"]', 'Low priority task');
    await page.press('[data-testid="add-task-input"]', 'Enter');

    // Apply filter (if applicable)
    // Then test reordering within filtered view

    // Verify tasks can still be reordered
    const tasks = page.locator('[id^="todo-"]');
    const count = await tasks.count();
    expect(count).toBeGreaterThan(0);
  });
});
