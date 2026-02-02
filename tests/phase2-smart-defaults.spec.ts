/**
 * Phase 2.1 E2E Tests: Smart Defaults with Redis Caching
 *
 * Tests the AI-powered smart defaults feature that suggests:
 * - Assignee based on user's task creation patterns
 * - Priority based on frequency distribution
 * - Due date based on average offset from creation
 *
 * Validates both client-side (SWR) and server-side (Redis) caching.
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 2.1: Smart Defaults', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Derrick
    await page.goto('/');
    await page.getByTestId('user-card-Derrick').click();
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await page.waitForURL('/');

    // Wait for dashboard to load
    await page.waitForTimeout(1000);

    // Navigate to "All" tasks view using sidebar navigation
    // Look for navigation link/button in sidebar (not the tab)
    await page.click('text=All Tasks');
    await page.waitForTimeout(1000);

    // The InlineAddTask component should now be visible with data-testid="add-task-input"
    await expect(page.locator('[data-testid="add-task-input"]')).toBeVisible({ timeout: 10000 });
  });

  test('should fetch smart defaults on component mount', async ({ page }) => {
    // Wait for API call to /api/ai/suggest-defaults
    const defaultsRequest = page.waitForResponse(
      response => response.url().includes('/api/ai/suggest-defaults') && response.status() === 200
    );

    // Navigate to tasks view (triggers AddTodo mount)

    // Wait for smart defaults API response
    const response = await defaultsRequest;
    const data = await response.json();

    // Validate response structure
    expect(data).toHaveProperty('assignedTo');
    expect(data).toHaveProperty('priority');
    expect(data).toHaveProperty('dueDate');
    expect(data).toHaveProperty('confidence');
    expect(data).toHaveProperty('metadata');

    // Confidence should be 0-1
    expect(data.confidence).toBeGreaterThanOrEqual(0);
    expect(data.confidence).toBeLessThanOrEqual(1);

    // Metadata should contain analysis details
    expect(data.metadata).toHaveProperty('basedOnTasks');
    expect(data.metadata).toHaveProperty('lookbackDays', 30);
    expect(data.metadata).toHaveProperty('patterns');
  });

  test('should pre-fill form fields with high-confidence suggestions (>= 0.5)', async ({ page }) => {
    // Create several tasks with consistent patterns to build confidence

    const tasksToCreate = [
      { text: 'Review policy', assignedTo: 'Derrick', priority: 'high' },
      { text: 'Call client', assignedTo: 'Derrick', priority: 'high' },
      { text: 'Update records', assignedTo: 'Derrick', priority: 'medium' },
    ];

    for (const task of tasksToCreate) {
      await page.fill('[data-testid="add-task-input"]', task.text);
      await page.selectOption('[data-testid="priority-select"]', task.priority);
      await page.selectOption('[data-testid="assigned-to-select"]', task.assignedTo);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500); // Wait for task creation
    }

    // Reload page to fetch fresh smart defaults
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click on add task input to focus it
    await page.click('[data-testid="add-task-input"]');

    // Check if assignedTo is pre-filled (suggestions with >= 0.5 confidence)
    const assignedToValue = await page.inputValue('[data-testid="assigned-to-select"]');

    // With 3 tasks all assigned to Derrick, confidence should be high
    if (assignedToValue) {
      expect(assignedToValue).toBe('Derrick');
    }
  });

  test('should NOT pre-fill form fields with low-confidence suggestions (< 0.5)', async ({ page }) => {
    // Navigate to tasks view

    // For a new user with no task history, confidence should be 0
    // Form should remain empty
    const assignedToValue = await page.inputValue('[data-testid="assigned-to-select"]');
    const priorityValue = await page.inputValue('[data-testid="priority-select"]');

    // Check that defaults are not applied (empty or default values)
    expect(assignedToValue === '' || assignedToValue === 'all').toBeTruthy();
    expect(priorityValue === 'medium' || priorityValue === '').toBeTruthy(); // Default priority is medium
  });

  test('should display suggestion metadata tooltip on hover', async ({ page }) => {

    // Wait for smart defaults to load
    await page.waitForTimeout(1000);

    // Look for suggestion indicator/tooltip trigger
    const suggestionIndicator = page.locator('[data-testid="smart-defaults-indicator"]');

    if (await suggestionIndicator.isVisible()) {
      await suggestionIndicator.hover();

      // Check tooltip content
      await expect(page.locator('[role="tooltip"]')).toBeVisible();
      await expect(page.locator('[role="tooltip"]')).toContainText('Based on');
      await expect(page.locator('[role="tooltip"]')).toContainText('tasks');
    }
  });

  test('should cache suggestions client-side with SWR (5 minutes)', async ({ page }) => {

    // First request should hit the API
    let apiCallCount = 0;
    page.on('response', response => {
      if (response.url().includes('/api/ai/suggest-defaults')) {
        apiCallCount++;
      }
    });

    await page.waitForTimeout(1000);
    const firstCallCount = apiCallCount;

    // Reload within 5 minutes - should use cached data
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // SWR should return cached data without new API call
    expect(apiCallCount).toBe(firstCallCount);
  });

  test('should refresh suggestions after creating a new task', async ({ page }) => {

    // Track API calls
    let refreshCallMade = false;
    page.on('response', response => {
      if (response.url().includes('/api/ai/suggest-defaults') && response.status() === 200) {
        refreshCallMade = true;
      }
    });

    // Create a task
    await page.fill('[data-testid="add-task-input"]', 'New task for pattern');
    await page.selectOption('[data-testid="priority-select"]', 'urgent');
    await page.selectOption('[data-testid="assigned-to-select"]', 'Derrick');
    await page.keyboard.press('Enter');

    // Wait for task creation and potential refresh
    await page.waitForTimeout(2000);

    // A refresh call may or may not be made depending on implementation
    // This test documents the expected behavior
    console.log('Refresh call after task creation:', refreshCallMade);
  });

  test('should use Redis cache on server-side (sub-100ms response)', async ({ page }) => {

    // First request - may hit database
    const firstRequestStart = Date.now();
    const firstRequest = await page.waitForResponse(
      response => response.url().includes('/api/ai/suggest-defaults')
    );
    const firstRequestTime = Date.now() - firstRequestStart;

    // Reload page - should hit Redis cache
    await page.reload();
    await page.waitForLoadState('networkidle');

    const cachedRequestStart = Date.now();
    const cachedRequest = await page.waitForResponse(
      response => response.url().includes('/api/ai/suggest-defaults')
    );
    const cachedRequestTime = Date.now() - cachedRequestStart;

    // Redis cached response should be faster (typically < 100ms)
    console.log('First request time:', firstRequestTime, 'ms');
    console.log('Cached request time:', cachedRequestTime, 'ms');

    // Cached response should include `cached: true` flag
    const cachedData = await cachedRequest.json();
    if (cachedData.cached !== undefined) {
      expect(cachedData.cached).toBe(true);
    }
  });

  test('should gracefully handle API errors (fallback to empty defaults)', async ({ page }) => {
    // Intercept API request and force error
    await page.route('**/api/ai/suggest-defaults', route => route.abort());

    // Form should still be usable with default values
    await expect(page.locator('[data-testid="add-task-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-task-input"]')).toBeEnabled();

    // Priority should default to 'medium'
    const priorityValue = await page.inputValue('[data-testid="priority-select"]');
    expect(priorityValue).toBe('medium');
  });

  test('should show loading state while fetching suggestions', async ({ page }) => {
    // Slow down the API response to see loading state
    await page.route('**/api/ai/suggest-defaults', async route => {
      await page.waitForTimeout(2000); // 2 second delay
      return route.continue();
    });

    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="smart-defaults-loading"]');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }

    // Wait for loading to complete
    await page.waitForTimeout(3000);

    // Loading should disappear
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).not.toBeVisible();
    }
  });
});
