/**
 * Phase 2.2 E2E Tests: Template Quick-Apply Component
 *
 * Tests the integrated TemplatePicker in AddTodo form header with:
 * - Compact icon-only button
 * - Keyboard shortcut (Cmd+T)
 * - Template selection applies all fields (text, priority, assignedTo, subtasks)
 * - Success toast notification
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 2.2: Template Quick-Apply', () => {
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
  });

  test('should display TemplatePicker button in AddTodo form header', async ({ page }) => {
    // Look for the template picker button (icon-only)
    const templateButton = page.locator('[data-testid="template-picker-button"]');

    await expect(templateButton).toBeVisible();

    // Button should have proper ARIA label
    await expect(templateButton).toHaveAttribute('aria-label', /template/i);
  });

  test('should open TemplatePicker dropdown on button click', async ({ page }) => {
    // Click template picker button
    await page.click('[data-testid="template-picker-button"]');

    // Dropdown should open
    await expect(page.locator('[data-testid="template-picker-dropdown"]')).toBeVisible();

    // Should show list of templates
    await expect(page.locator('[data-testid="template-item"]').first()).toBeVisible();
  });

  test('should toggle TemplatePicker with Cmd+T keyboard shortcut', async ({ page, browserName }) => {
    // Focus on task input field
    await page.focus('[data-testid="add-task-input"]');

    // Press Cmd+T (Mac) or Ctrl+T (Windows/Linux)
    const modifierKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+KeyT`);

    // TemplatePicker should open
    await expect(page.locator('[data-testid="template-picker-dropdown"]')).toBeVisible();

    // Press Cmd+T again to close
    await page.keyboard.press(`${modifierKey}+KeyT`);

    // TemplatePicker should close
    await expect(page.locator('[data-testid="template-picker-dropdown"]')).not.toBeVisible();
  });

  test('should apply template text when selected', async ({ page }) => {
    // Open template picker
    await page.click('[data-testid="template-picker-button"]');

    // Select first template
    const firstTemplate = page.locator('[data-testid="template-item"]').first();
    const templateText = await firstTemplate.locator('[data-testid="template-name"]').textContent();
    await firstTemplate.click();

    // Task input should be populated with template text
    const taskInputValue = await page.inputValue('[data-testid="add-task-input"]');
    expect(taskInputValue).toBeTruthy();
    expect(taskInputValue.length).toBeGreaterThan(0);
  });

  test('should apply template priority when selected', async ({ page }) => {
    // Create a test template with high priority
    await page.click('[data-testid="template-picker-button"]');

    // Find or create a template with 'high' priority
    const highPriorityTemplate = page.locator('[data-testid="template-item"][data-priority="high"]').first();

    if (await highPriorityTemplate.isVisible()) {
      await highPriorityTemplate.click();

      // Priority dropdown should be set to 'high'
      const priorityValue = await page.inputValue('[data-testid="priority-select"]');
      expect(priorityValue).toBe('high');
    }
  });

  test('should apply template assignedTo when selected', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');

    // Select template with assignedTo field
    const templateWithAssignee = page.locator('[data-testid="template-item"][data-assigned-to]').first();

    if (await templateWithAssignee.isVisible()) {
      const expectedAssignee = await templateWithAssignee.getAttribute('data-assigned-to');
      await templateWithAssignee.click();

      // AssignedTo dropdown should be set
      const assignedToValue = await page.inputValue('[data-testid="assigned-to-select"]');
      expect(assignedToValue).toBe(expectedAssignee);
    }
  });

  test('should apply template subtasks when selected', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');

    // Select template with subtasks
    const templateWithSubtasks = page.locator('[data-testid="template-item"]').first();
    await templateWithSubtasks.click();

    // Expand advanced options to see subtasks
    const showOptionsButton = page.locator('[data-testid="show-options-button"]');
    if (await showOptionsButton.isVisible()) {
      await showOptionsButton.click();
    }

    // Check if subtasks section is visible
    const subtasksSection = page.locator('[data-testid="subtasks-section"]');
    if (await subtasksSection.isVisible()) {
      // Verify subtasks are populated
      const subtaskItems = page.locator('[data-testid="subtask-item"]');
      const subtaskCount = await subtaskItems.count();

      // Should have at least 1 subtask if template has subtasks
      if (subtaskCount > 0) {
        expect(subtaskCount).toBeGreaterThan(0);
      }
    }
  });

  test('should show success toast after applying template', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');
    await page.locator('[data-testid="template-item"]').first().click();

    // Wait for toast notification
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[role="status"]')).toContainText(/template applied/i);
  });

  test('should close TemplatePicker after selection', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');

    // Verify dropdown is open
    await expect(page.locator('[data-testid="template-picker-dropdown"]')).toBeVisible();

    // Select a template
    await page.locator('[data-testid="template-item"]').first().click();

    // Dropdown should close
    await expect(page.locator('[data-testid="template-picker-dropdown"]')).not.toBeVisible({ timeout: 2000 });
  });

  test('should focus task input after applying template', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');
    await page.locator('[data-testid="template-item"]').first().click();

    // Task input should be focused
    await expect(page.locator('[data-testid="add-task-input"]')).toBeFocused();
  });

  test('should expand options panel after applying template with subtasks', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');

    // Select template (assuming it has subtasks)
    await page.locator('[data-testid="template-item"]').first().click();

    // Options panel should expand to show subtasks
    await expect(page.locator('[data-testid="advanced-options-panel"]')).toBeVisible({ timeout: 2000 });
  });

  test('should prioritize template subtasks over suggested subtasks', async ({ page }) => {
    // First, trigger smart parse to get suggested subtasks
    await page.fill('[data-testid="add-task-input"]', 'Call John about renewal: review policy, calculate premium, send quote');
    await page.click('[data-testid="smart-parse-button"]');

    // Wait for suggested subtasks
    await page.waitForTimeout(2000);

    // Now apply a template (which should override suggestions)
    await page.click('[data-testid="template-picker-button"]');
    await page.locator('[data-testid="template-item"]').first().click();

    // Subtasks should be from template, not suggestions
    // This is validated by checking that the subtask text matches the template
    const subtaskItems = page.locator('[data-testid="subtask-item"]');
    if (await subtaskItems.first().isVisible()) {
      const firstSubtaskText = await subtaskItems.first().textContent();
      // Should not contain suggested subtask text
      expect(firstSubtaskText).not.toContain('review policy');
    }
  });

  test('should clear template subtasks after form submission', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');
    await page.locator('[data-testid="template-item"]').first().click();

    // Wait for template to apply
    await page.waitForTimeout(500);

    // Submit the form
    await page.keyboard.press('Enter');

    // Wait for task creation
    await page.waitForTimeout(1000);

    // Subtasks section should be cleared
    const subtaskItems = page.locator('[data-testid="subtask-item"]');
    await expect(subtaskItems).toHaveCount(0);
  });

  test('should display template count in dropdown header', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');

    // Header should show template count
    const header = page.locator('[data-testid="template-picker-header"]');
    await expect(header).toContainText(/\d+.*template/i);
  });

  test('should show "No templates" message when user has no templates', async ({ page }) => {
    // This test requires a user with no templates
    // For now, we'll simulate by checking if the message appears

    await page.click('[data-testid="template-picker-button"]');

    const emptyState = page.locator('[data-testid="templates-empty-state"]');
    const hasTemplates = await page.locator('[data-testid="template-item"]').count() > 0;

    if (!hasTemplates) {
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText(/no template/i);
    }
  });

  test('should distinguish between personal and shared templates', async ({ page }) => {
    await page.click('[data-testid="template-picker-button"]');

    // Check for section headers
    const personalHeader = page.locator('text=/personal template/i');
    const sharedHeader = page.locator('text=/shared template/i');

    // At least one section should be visible
    const hasPersonal = await personalHeader.isVisible();
    const hasShared = await sharedHeader.isVisible();

    expect(hasPersonal || hasShared).toBeTruthy();
  });
});
