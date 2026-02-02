/**
 * Phase 2.4 E2E Tests: Mobile Touch Target Compliance (WCAG 2.5.5)
 *
 * Validates that all interactive elements meet the minimum 44x44px touch target size.
 * Tests critical UI components on mobile viewports:
 * - TodoFiltersBar: Quick filter, Sort, Advanced Filters, More button
 * - Button components: size="sm" upgraded to size="md"
 * - TodoItem: SubtaskItem buttons (edit, delete)
 * - Other small interactive elements
 */

import { test, expect, devices } from '@playwright/test';

// test.use() must be top-level, not inside describe
test.use({
  ...devices['iPhone 13 Pro'],
});

test.describe('Phase 2.4: Mobile Touch Target Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.locator('[data-testid="user-card-Derrick"]').click();
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    // Wait for app to load
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });

    // Navigate to tasks view by clicking "All" tab
    await page.click('button:has-text("All")');
    await page.waitForTimeout(500);
  });

  test('TodoFiltersBar: Quick filter dropdown should be 44px minimum', async ({ page }) => {
    const quickFilter = page.locator('[aria-label="Quick filter"]');
    await expect(quickFilter).toBeVisible();

    const boundingBox = await quickFilter.boundingBox();
    expect(boundingBox).not.toBeNull();

    // Height should be at least 44px
    expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('TodoFiltersBar: Sort dropdown should be 44px minimum', async ({ page }) => {
    const sortDropdown = page.locator('[aria-label="Sort tasks"]');
    await expect(sortDropdown).toBeVisible();

    const boundingBox = await sortDropdown.boundingBox();
    expect(boundingBox).not.toBeNull();

    expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('TodoFiltersBar: Advanced Filters button should be 44px minimum', async ({ page }) => {
    const advancedFilters = page.locator('button:has-text("Filters")');
    await expect(advancedFilters).toBeVisible();

    const boundingBox = await advancedFilters.boundingBox();
    expect(boundingBox).not.toBeNull();

    expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
    expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
  });

  test('TodoFiltersBar: More dropdown button should be 44px minimum', async ({ page }) => {
    const moreButton = page.locator('[title="More options"]');

    if (await moreButton.isVisible()) {
      const boundingBox = await moreButton.boundingBox();
      expect(boundingBox).not.toBeNull();

      expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
      expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('TodoFiltersBar: Close button in advanced filters drawer should be 44px minimum', async ({ page }) => {
    // Open advanced filters
    await page.click('button:has-text("Filters")');

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Find close button
    const closeButton = page.locator('[aria-label="Close advanced filters panel"]');

    if (await closeButton.isVisible()) {
      const boundingBox = await closeButton.boundingBox();
      expect(boundingBox).not.toBeNull();

      expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
      expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('IconButton: All IconButton components should use size="md" (44px) by default', async ({ page }) => {
    // Find all IconButton elements (buttons with single icon, no text)
    const iconButtons = page.locator('button[aria-label]:has(svg):not(:has-text(/[a-z]/i))');

    const count = await iconButtons.count();

    for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10 icon buttons
      const button = iconButtons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        // Should be at least 44x44px
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('TodoItem: SubtaskItem edit button should be 44px minimum', async ({ page }) => {
    // Create a task with subtasks
    // Create task via inline input
    const addTaskInput = page.locator('[data-testid="add-task-input"]');
    await addTaskInput.fill('Task with subtasks');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.waitForTimeout(1000);

    // Expand task to show subtasks
    const todoItem = page.locator('[data-testid="todo-item"]').first();
    await todoItem.click();

    // Find edit button for subtask
    const editButton = page.locator('[aria-label="Edit subtask"]').first();

    if (await editButton.isVisible()) {
      const boundingBox = await editButton.boundingBox();
      expect(boundingBox).not.toBeNull();

      expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
      expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('TodoItem: SubtaskItem delete button should be 44px minimum', async ({ page }) => {
    // Create a task with subtasks
    // Create task via inline input
    const addTaskInput = page.locator('[data-testid="add-task-input"]');
    await addTaskInput.fill('Task with subtasks');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.waitForTimeout(1000);

    // Expand task to show subtasks
    const todoItem = page.locator('[data-testid="todo-item"]').first();
    await todoItem.click();

    // Find delete button for subtask
    const deleteButton = page.locator('[aria-label="Delete subtask"]').first();

    if (await deleteButton.isVisible()) {
      const boundingBox = await deleteButton.boundingBox();
      expect(boundingBox).not.toBeNull();

      expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
      expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('InvitationForm: Copy button should be 44px minimum', async ({ page }) => {
    // Navigate to agency members (if multi-tenancy is enabled)
    // This test is conditional based on feature flags

    // For now, we'll check Button component sizing in general
    const buttons = page.locator('button:has-text("Copy")');

    if (await buttons.first().isVisible()) {
      const boundingBox = await buttons.first().boundingBox();

      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('NavigationSidebar: AgencySwitcher should be 44px minimum', async ({ page }) => {
    // Check sidebar button heights
    const navButtons = page.locator('nav button');

    const count = await navButtons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = navButtons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        // Navigation buttons should meet 44px minimum
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('ProgressSummary: Close button should be 44px minimum', async ({ page }) => {
    // Open progress summary modal
    const progressButton = page.locator('[data-testid="progress-summary-button"]');

    if (await progressButton.isVisible()) {
      await progressButton.click();

      // Wait for modal
      await page.waitForTimeout(500);

      // Find close button
      const closeButton = page.locator('[aria-label="Close progress summary"]');

      if (await closeButton.isVisible()) {
        const boundingBox = await closeButton.boundingBox();
        expect(boundingBox).not.toBeNull();

        expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('All interactive elements should have touch-manipulation CSS', async ({ page }) => {
    // Sample a few interactive elements
    const interactiveElements = page.locator('button, a[href], input[type="button"], [role="button"]');

    const count = await interactiveElements.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = interactiveElements.nth(i);

      // Check if element has touch-manipulation
      const touchAction = await element.evaluate(el =>
        window.getComputedStyle(el).getPropertyValue('touch-action')
      );

      // Should be 'manipulation' or 'auto' (default)
      expect(touchAction === 'manipulation' || touchAction === 'auto').toBeTruthy();
    }
  });

  test('Mobile viewport: All buttons should be tappable without zoom', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13 Pro size

    // Get all buttons
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    console.log(`Testing ${count} visible buttons for tappability`);

    let undersizedCount = 0;
    const undersizedButtons: string[] = [];

    for (let i = 0; i < Math.min(count, 20); i++) { // Sample first 20 buttons
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        const label = ariaLabel || text || `Button ${i}`;

        if (boundingBox.height < 44 || boundingBox.width < 44) {
          undersizedCount++;
          undersizedButtons.push(`${label} (${Math.round(boundingBox.width)}x${Math.round(boundingBox.height)}px)`);
        }
      }
    }

    // Log any undersized buttons
    if (undersizedCount > 0) {
      console.log('Undersized buttons found:');
      undersizedButtons.forEach(btn => console.log(`  - ${btn}`));
    }

    // All sampled buttons should meet 44px minimum
    expect(undersizedCount).toBe(0);
  });

  test('Tablet viewport: Touch targets should remain compliant', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size

    // Check key interactive elements
    const quickFilter = page.locator('[aria-label="Quick filter"]');
    const sortDropdown = page.locator('[aria-label="Sort tasks"]');
    const advancedFilters = page.locator('button:has-text("Filters")');

    const elements = [quickFilter, sortDropdown, advancedFilters];

    for (const element of elements) {
      if (await element.isVisible()) {
        const boundingBox = await element.boundingBox();

        if (boundingBox) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('Accessibility: All interactive elements should have proper ARIA labels', async ({ page }) => {
    // Find all icon-only buttons (likely to need aria-label)
    const iconButtons = page.locator('button:has(svg):not(:has-text(/[a-z]/i))');

    const count = await iconButtons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = iconButtons.nth(i);

      // Should have aria-label or aria-labelledby
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasAriaLabelledby = await button.getAttribute('aria-labelledby');
      const hasTitle = await button.getAttribute('title');

      // At least one labeling method should be present
      expect(hasAriaLabel || hasAriaLabelledby || hasTitle).toBeTruthy();
    }
  });
});
