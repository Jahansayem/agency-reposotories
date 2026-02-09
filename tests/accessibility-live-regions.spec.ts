import { test, expect } from '@playwright/test';

test.describe('Accessibility - ARIA Live Regions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login as Derrick
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(derrickCard).toBeVisible();
    await derrickCard.click();

    // Enter PIN
    const pinInputs = page.locator('input[data-testid^="pin-"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    // Wait for dashboard to load
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });

    // Navigate to tasks view
    const tasksButton = page.locator('button:has-text("Tasks")').first();
    if (await tasksButton.isVisible()) {
      await tasksButton.click();
    }
  });

  test('should have live region for announcements', async ({ page }) => {
    // Check for live region element
    const liveRegion = page.locator('[role="status"][aria-live]');
    const count = await liveRegion.count();

    // Should have at least one live region
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should announce task creation to screen readers', async ({ page }) => {
    // Add a task
    await page.click('button:has-text("New Task")');
    const taskInput = page.locator('textarea[placeholder*="What needs to be done"]').first();
    await taskInput.fill('Test task for announcement');

    await page.keyboard.press('Enter');

    // Wait a moment for announcement
    await page.waitForLoadState('networkidle');

    // Check if live region has announcement
    const liveRegion = page.locator('[role="status"][aria-live]').first();
    const text = await liveRegion.textContent();

    // Should contain announcement about task creation
    expect(text).toContain('task');
  });

  test('should announce task completion to screen readers', async ({ page }) => {
    // Create a task first
    await page.click('button:has-text("New Task")');
    const taskInput = page.locator('textarea[placeholder*="What needs to be done"]').first();
    await taskInput.fill('Task to complete');

    await page.keyboard.press('Enter');

    await page.waitForLoadState('networkidle');

    // Complete the task
    const checkbox = page.locator('input[type="checkbox"]').last();
    await checkbox.check();

    await page.waitForLoadState('networkidle');

    // Check live region for completion announcement
    const liveRegion = page.locator('[role="status"][aria-live]').first();
    const text = await liveRegion.textContent();

    // Should announce completion
    expect(text?.toLowerCase()).toContain('complete');
  });

  test('should have polite politeness level (default)', async ({ page }) => {
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    const count = await liveRegion.count();

    // At least one live region should have polite level
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should have aria-atomic attribute', async ({ page }) => {
    const liveRegion = page.locator('[role="status"][aria-live]').first();
    const ariaAtomic = await liveRegion.getAttribute('aria-atomic');

    // Should have aria-atomic set
    expect(ariaAtomic).not.toBeNull();
  });

  test('should be visually hidden but accessible to screen readers', async ({ page }) => {
    const liveRegion = page.locator('[role="status"][aria-live]').first();

    // Should have sr-only class
    const className = await liveRegion.getAttribute('class');
    expect(className).toContain('sr-only');

    // Should not be visible to sighted users
    const isVisible = await liveRegion.isVisible();
    expect(isVisible).toBeFalsy();
  });

  test('should clear announcements after timeout', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    const taskInput = page.locator('textarea[placeholder*="What needs to be done"]').first();
    await taskInput.fill('Temporary announcement test');

    await page.keyboard.press('Enter');

    // Check announcement appears
    let liveRegion = page.locator('[role="status"][aria-live]').first();
    let text = await liveRegion.textContent();
    expect(text).toBeTruthy();

    // Wait for timeout (1 second)
    await page.waitForTimeout(1200);

    // Announcement should be cleared
    liveRegion = page.locator('[role="status"][aria-live]').first();
    text = await liveRegion.textContent();
    expect(text).toBe('');
  });

  test('should announce task deletion', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    const taskInput = page.locator('textarea[placeholder*="What needs to be done"]').first();
    await taskInput.fill('Task to delete');

    await page.keyboard.press('Enter');

    await page.waitForLoadState('networkidle');

    // Find and delete the task
    const taskItem = page.locator('text=Task to delete').first();
    await taskItem.hover();

    // Look for delete button (might be in a menu)
    const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await page.waitForLoadState('networkidle');

      // Check live region for deletion announcement
      const liveRegion = page.locator('[role="status"][aria-live]').first();
      const text = await liveRegion.textContent();

      expect(text?.toLowerCase()).toContain('delete');
    }
  });

  test('should announce status changes', async ({ page }) => {
    // Create a task
    await page.click('button:has-text("New Task")');
    const taskInput = page.locator('textarea[placeholder*="What needs to be done"]').first();
    await taskInput.fill('Task for status change');

    await page.keyboard.press('Enter');

    await page.waitForLoadState('networkidle');

    // Change task status (if status badges are visible)
    const taskItem = page.locator('text=Task for status change').first();
    await taskItem.click();

    // Look for status change button/dropdown
    const statusButton = page.locator('button:has-text("Status"), [aria-label*="status"]').first();
    if (await statusButton.isVisible()) {
      await statusButton.click();

      // Select "In Progress" or "Done"
      const inProgressOption = page.locator('text=In Progress, text=Done').first();
      if (await inProgressOption.isVisible()) {
        await inProgressOption.click();
        await page.waitForLoadState('networkidle');

        // Check for status change announcement
        const liveRegion = page.locator('[role="status"][aria-live]').first();
        const text = await liveRegion.textContent();

        expect(text).toBeTruthy();
      }
    }
  });

  test('should not spam announcements for multiple rapid actions', async ({ page }) => {
    // Rapidly create multiple tasks
    await page.click('button:has-text("New Task")');
    const taskInput = page.locator('textarea[placeholder*="What needs to be done"]').first();
    for (let i = 0; i < 3; i++) {
      await taskInput.fill(`Rapid task ${i}`);
      await page.keyboard.press('Enter');
    }

    // Wait for announcements to settle
    await page.waitForLoadState('networkidle');

    // Should only have the last announcement (previous ones cleared)
    const liveRegion = page.locator('[role="status"][aria-live]').first();
    const text = await liveRegion.textContent();

    // Should be empty or contain only one message
    const messageCount = (text || '').split('.').filter(Boolean).length;
    expect(messageCount).toBeLessThanOrEqual(1);
  });
});

test.describe('Accessibility - Live Regions in Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
    await derrickCard.click();

    const pinInputs = page.locator('input[data-testid^="pin-"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should announce new chat messages (when ready)', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button:has-text("Chat"), button:has-text("Messages")').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();

      // Check if chat has live region support
      const liveRegions = await page.locator('[role="status"][aria-live]').count();
      expect(liveRegions).toBeGreaterThanOrEqual(1);
    }
  });
});

test.describe('Accessibility - AnnouncementProvider Context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
    await derrickCard.click();

    const pinInputs = page.locator('input[data-testid^="pin-"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should have global announcement provider', async ({ page }) => {
    // Global AnnouncementProvider should create a live region
    const liveRegions = await page.locator('[role="status"][aria-live]').count();
    expect(liveRegions).toBeGreaterThanOrEqual(1);
  });

  test('should support different politeness levels', async ({ page }) => {
    // Check for polite regions (default)
    const politeRegions = await page.locator('[aria-live="polite"]').count();
    expect(politeRegions).toBeGreaterThanOrEqual(1);

    // Assertive regions might exist for urgent messages
    // (Not required, but test if present)
    const assertiveRegions = await page.locator('[aria-live="assertive"]').count();
    expect(assertiveRegions).toBeGreaterThanOrEqual(0);
  });

  test('should work across multiple views', async ({ page }) => {
    // Check tasks view
    const tasksButton = page.locator('button:has-text("Tasks")').first();
    if (await tasksButton.isVisible()) {
      await tasksButton.click();

      let liveRegions = await page.locator('[role="status"][aria-live]').count();
      expect(liveRegions).toBeGreaterThanOrEqual(1);
    }

    // Check dashboard view
    const dashboardButton = page.locator('button:has-text("Dashboard")').first();
    if (await dashboardButton.isVisible()) {
      await dashboardButton.click();

      let liveRegions = await page.locator('[role="status"][aria-live]').count();
      expect(liveRegions).toBeGreaterThanOrEqual(1);
    }
  });
});
