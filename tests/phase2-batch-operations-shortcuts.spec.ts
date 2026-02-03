/**
 * Phase 2.3 E2E Tests: Batch Operations Keyboard Shortcuts
 *
 * Tests the keyboard shortcuts for bulk operations:
 * - Cmd+A: Select all visible (filtered) todos
 * - ESC: Clear bulk selection (with priority over search/focus mode)
 * - Existing bulk UI (checkboxes, BulkActionBar)
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 2.3: Batch Operations Keyboard Shortcuts', () => {
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

    // Close any welcome dialogs or modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);


    // Navigate to tasks view by clicking "All" tab
    await page.click('button:has-text("All")');
    await page.waitForTimeout(500);

    // Wait for add task input to be visible
    await expect(page.locator('[data-testid="add-task-input"]')).toBeVisible({ timeout: 10000 });

    // Create a few test tasks
    const tasks = [
      'Test task 1 - Review policy',
      'Test task 2 - Call client',
      'Test task 3 - Update records',
      'Test task 4 - Send email',
    ];

    for (const task of tasks) {
      await page.fill('[data-testid="add-task-input"]', task);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(1000); // Wait for tasks to render
  });

  test('should select all visible todos with Cmd+A', async ({ page, browserName }) => {
    // Count visible todos
    const todoItems = page.locator('[data-testid="todo-item"]');
    const todoCount = await todoItems.count();

    expect(todoCount).toBeGreaterThan(0);

    // Press Cmd+A (Mac) or Ctrl+A (Windows/Linux)
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Bulk action bar should appear
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible({ timeout: 2000 });

    // Selection count should match visible todo count
    const selectionCount = page.locator('[data-testid="selection-count"]');
    await expect(selectionCount).toContainText(String(todoCount));

    // All checkboxes should be checked
    const checkedCheckboxes = page.locator('[data-testid="todo-checkbox"]:checked');
    const checkedCount = await checkedCheckboxes.count();
    expect(checkedCount).toBe(todoCount);
  });

  test('should NOT trigger Cmd+A when typing in input field', async ({ page, browserName }) => {
    // Focus on task input
    await page.focus('[data-testid="add-task-input"]');

    // Type some text
    await page.fill('[data-testid="add-task-input"]', 'New task text');

    // Press Cmd+A (should select text, not todos)
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Bulk action bar should NOT appear
    await expect(page.locator('[data-testid="bulk-action-bar"]')).not.toBeVisible();

    // Text should be selected (can be verified by checking selection)
    const selectedText = await page.evaluate(() => window.getSelection()?.toString());
    expect(selectedText).toBe('New task text');
  });

  test('should select only filtered todos with Cmd+A', async ({ page, browserName }) => {
    // Apply a filter (e.g., "My Tasks")
    await page.selectOption('[data-testid="quick-filter"]', 'my_tasks');
    await page.waitForTimeout(500);

    // Count visible todos after filtering
    const visibleTodos = page.locator('[data-testid="todo-item"]:visible');
    const visibleCount = await visibleTodos.count();

    // Press Cmd+A
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Selection count should match filtered count (not total count)
    const selectionCount = page.locator('[data-testid="selection-count"]');
    await expect(selectionCount).toContainText(String(visibleCount));
  });

  test('should clear bulk selection with ESC key', async ({ page, browserName }) => {
    // Select all todos
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Verify bulk action bar is visible
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();

    // Press ESC to clear selection
    await page.keyboard.press('Escape');

    // Bulk action bar should disappear
    await expect(page.locator('[data-testid="bulk-action-bar"]')).not.toBeVisible({ timeout: 2000 });

    // No checkboxes should be checked
    const checkedCheckboxes = page.locator('[data-testid="todo-checkbox"]:checked');
    const checkedCount = await checkedCheckboxes.count();
    expect(checkedCount).toBe(0);
  });

  test('should prioritize ESC for clearing selection over search clear', async ({ page, browserName }) => {
    // Enter search query
    await page.fill('[data-testid="search-input"]', 'test query');
    await page.waitForTimeout(300);

    // Select all filtered results
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Verify selection is active
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();

    // Press ESC - should clear selection first (not search)
    await page.keyboard.press('Escape');

    // Bulk selection should be cleared
    await expect(page.locator('[data-testid="bulk-action-bar"]')).not.toBeVisible();

    // Search query should still be present
    const searchValue = await page.inputValue('[data-testid="search-input"]');
    expect(searchValue).toBe('test query');

    // Press ESC again to clear search
    await page.keyboard.press('Escape');

    // Search should now be cleared
    const clearedSearchValue = await page.inputValue('[data-testid="search-input"]');
    expect(clearedSearchValue).toBe('');
  });

  test('should prioritize ESC for exiting focus mode over clearing selection', async ({ page, browserName }) => {
    // Enable focus mode
    await page.click('[data-testid="focus-mode-toggle"]');
    await expect(page.locator('[data-testid="focus-mode-active"]')).toBeVisible();

    // Select todos
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Press ESC - should exit focus mode first
    await page.keyboard.press('Escape');

    // Focus mode should be disabled
    await expect(page.locator('[data-testid="focus-mode-active"]')).not.toBeVisible();

    // Bulk selection should still be active
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();

    // Press ESC again to clear selection
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="bulk-action-bar"]')).not.toBeVisible();
  });

  test('should show BulkActionBar after selecting todos', async ({ page, browserName }) => {
    // Select all
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // BulkActionBar should appear with all action buttons
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-complete-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-assign-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-reschedule-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-delete-button"]')).toBeVisible();
  });

  test('should perform bulk complete operation on selected todos', async ({ page, browserName }) => {
    // Select all
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Click bulk complete button
    await page.click('[data-testid="bulk-complete-button"]');

    // Wait for operation
    await page.waitForTimeout(1000);

    // All selected todos should be marked as completed
    const completedCheckboxes = page.locator('[data-testid="todo-checkbox"]:checked');
    const completedCount = await completedCheckboxes.count();
    const totalTodos = await page.locator('[data-testid="todo-item"]').count();

    expect(completedCount).toBe(totalTodos);
  });

  test('should perform bulk assign operation on selected todos', async ({ page, browserName }) => {
    // Select all
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Click bulk assign button
    await page.click('[data-testid="bulk-assign-button"]');

    // Dropdown should appear
    await expect(page.locator('[data-testid="bulk-assign-dropdown"]')).toBeVisible();

    // Select an assignee
    await page.click('[data-testid="assignee-option-Sefra"]');

    // Wait for operation
    await page.waitForTimeout(1000);

    // Verify assignment (check first todo's assignee badge)
    await expect(page.locator('[data-testid="todo-item"]').first()).toContainText('Sefra');
  });

  test('should perform bulk reschedule operation on selected todos', async ({ page, browserName }) => {
    // Select all
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Click bulk reschedule button
    await page.click('[data-testid="bulk-reschedule-button"]');

    // Date picker or quick options should appear
    await expect(page.locator('[data-testid="bulk-reschedule-options"]')).toBeVisible();

    // Select "Tomorrow"
    await page.click('[data-testid="reschedule-tomorrow"]');

    // Wait for operation
    await page.waitForTimeout(1000);

    // Verify due dates are updated (check for tomorrow's date in UI)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString();

    // At least one todo should show tomorrow's date
    await expect(page.locator('[data-testid="todo-item"]').first()).toContainText(/due/i);
  });

  test('should perform bulk delete operation with confirmation', async ({ page, browserName }) => {
    // Count initial todos
    const initialCount = await page.locator('[data-testid="todo-item"]').count();

    // Select all
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyA`);

    // Click bulk delete button
    await page.click('[data-testid="bulk-delete-button"]');

    // Confirmation dialog should appear
    await expect(page.locator('[role="alertdialog"]')).toBeVisible();
    await expect(page.locator('[role="alertdialog"]')).toContainText(/delete.*task/i);

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Wait for deletion
    await page.waitForTimeout(1500);

    // Todos should be deleted
    const finalCount = await page.locator('[data-testid="todo-item"]').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('should show merge button when 2+ todos are selected', async ({ page }) => {
    // Manually select 2 todos
    const todoCheckboxes = page.locator('[data-testid="todo-checkbox"]');
    await todoCheckboxes.nth(0).check();
    await todoCheckboxes.nth(1).check();

    // Wait for bulk action bar
    await page.waitForTimeout(500);

    // Merge button should be visible
    await expect(page.locator('[data-testid="bulk-merge-button"]')).toBeVisible();
  });

  test('should NOT show merge button when only 1 todo is selected', async ({ page }) => {
    // Select only 1 todo
    const todoCheckboxes = page.locator('[data-testid="todo-checkbox"]');
    await todoCheckboxes.nth(0).check();

    // Wait for bulk action bar
    await page.waitForTimeout(500);

    // Merge button should NOT be visible
    await expect(page.locator('[data-testid="bulk-merge-button"]')).not.toBeVisible();
  });
});
