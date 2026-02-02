import { test, expect } from '@playwright/test';

test.describe('Add Task Modal UI Fixes', () => {
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
    await page.waitForTimeout(2000);

    // Dismiss any welcome modals
    const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
    if (await viewTasksBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await viewTasksBtn.click();
    }

    // Wait for main app - look for new task button
    await expect(page.locator('button[aria-label="Create new task"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('AI Features button dropdown is visible and not off-screen', async ({ page }) => {
    // Open the Add Task modal by clicking the Add button
    await page.click('button[aria-label="Create new task"]', { force: true });

    // Wait for modal to appear
    await page.waitForSelector('h2:has-text("Add New Task")');

    // Find the AI Features button (Sparkles icon)
    const aiButton = page.locator('button[aria-label="AI Features Menu"]');
    await expect(aiButton).toBeVisible();

    // Click the AI button to open dropdown
    await aiButton.click();

    // Wait for dropdown to appear
    const dropdown = page.locator('[role="menu"]');
    await expect(dropdown).toBeVisible();

    // Get dropdown position
    const dropdownBox = await dropdown.boundingBox();
    expect(dropdownBox).not.toBeNull();

    // Verify dropdown is not off left edge of screen
    expect(dropdownBox!.x).toBeGreaterThanOrEqual(0);

    // Verify dropdown is fully visible (not cut off on left)
    const viewportWidth = page.viewportSize()?.width || 0;
    expect(dropdownBox!.x + dropdownBox!.width).toBeLessThanOrEqual(viewportWidth);

    // Verify menu items are visible
    await expect(page.locator('button[role="menuitem"]:has-text("AI Parse Task")')).toBeVisible();
    await expect(page.locator('button[role="menuitem"]:has-text("Voice Input")')).toBeVisible();
    await expect(page.locator('button[role="menuitem"]:has-text("Import File")')).toBeVisible();
  });

  test('Reminder button matches size of other buttons', async ({ page }) => {
    // Open the Add Task modal
    await page.click('button[aria-label="Create new task"]', { force: true });
    await page.waitForSelector('h2:has-text("Add New Task")');

    // Find reminder button and AI button
    const reminderButton = page.locator('button:has-text("Reminder")');
    const aiButton = page.locator('button[aria-label="AI Features Menu"]');

    // Both should be visible
    await expect(reminderButton).toBeVisible();
    await expect(aiButton).toBeVisible();

    // Get heights
    const reminderBox = await reminderButton.boundingBox();
    const aiBox = await aiButton.boundingBox();

    expect(reminderBox).not.toBeNull();
    expect(aiBox).not.toBeNull();

    // Heights should be similar (within 2px tolerance)
    const heightDiff = Math.abs(reminderBox!.height - aiBox!.height);
    expect(heightDiff).toBeLessThanOrEqual(2);

    // Both should meet minimum touch target size (44px)
    expect(reminderBox!.height).toBeGreaterThanOrEqual(44);
    expect(aiBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('Template picker dropdown is visible and not off-screen', async ({ page }) => {
    // Open the Add Task modal
    await page.click('button[aria-label="Create new task"]', { force: true });
    await page.waitForSelector('h2:has-text("Add New Task")');

    // Find the template picker button (looks for FileText icon button)
    const templateButton = page.locator('button').filter({ has: page.locator('svg').first() }).nth(1);

    // Click to open dropdown
    await templateButton.click();

    // Wait for dropdown
    const dropdown = page.locator('[data-testid="template-picker-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Get dropdown position
    const dropdownBox = await dropdown.boundingBox();
    expect(dropdownBox).not.toBeNull();

    // Verify dropdown is not off left edge of screen
    expect(dropdownBox!.x).toBeGreaterThanOrEqual(0);

    // Verify dropdown is fully visible
    const viewportWidth = page.viewportSize()?.width || 0;
    expect(dropdownBox!.x + dropdownBox!.width).toBeLessThanOrEqual(viewportWidth);
  });

  test('Add Task modal is wider (increased from 2xl to 4xl)', async ({ page }) => {
    // Open the Add Task modal
    await page.click('button[aria-label="Create new task"]', { force: true });
    await page.waitForSelector('h2:has-text("Add New Task")');

    // Get modal dialog
    const modal = page.locator('[role="dialog"][aria-label="Add new task"]');
    await expect(modal).toBeVisible();

    // Get modal width
    const modalBox = await modal.boundingBox();
    expect(modalBox).not.toBeNull();

    // max-w-4xl is 896px, max-w-2xl was 672px
    // Modal should be wider than 700px (allowing some margin)
    expect(modalBox!.width).toBeGreaterThan(700);

    // Should not exceed 4xl max width (896px) plus some padding
    expect(modalBox!.width).toBeLessThanOrEqual(920);
  });

  test('All action buttons are clickable and properly positioned', async ({ page }) => {
    // Open the Add Task modal
    await page.click('button[aria-label="Create new task"]', { force: true });
    await page.waitForSelector('h2:has-text("Add New Task")');

    // Type some text to enable buttons
    await page.fill('textarea[aria-label="New task description"]', 'Test task for button positioning');

    // Verify all buttons are visible and clickable
    const aiButton = page.locator('button[aria-label="AI Features Menu"]');
    const reminderButton = page.locator('button:has-text("Reminder")');
    const addButton = page.locator('button[aria-label="Add task"]');

    await expect(aiButton).toBeVisible();
    await expect(aiButton).toBeEnabled();

    await expect(reminderButton).toBeVisible();
    await expect(reminderButton).toBeEnabled();

    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();

    // Click AI button to verify it opens
    await aiButton.click();
    await expect(page.locator('[role="menu"]')).toBeVisible();

    // Close dropdown
    await page.keyboard.press('Escape');

    // Click reminder button to verify it opens
    await reminderButton.click();
    await expect(page.locator('#reminder-dropdown')).toBeVisible();
  });
});
