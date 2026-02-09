import { test, expect } from '@playwright/test';

test.describe('Chat - Delete Message Confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login as Derrick
    await page.click('[data-testid="user-card-Derrick"]');
        const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });

    // Open chat panel
    await page.click('button[aria-label="Toggle chat panel"]');
    await page.waitForLoadState('networkidle');
  });

  test('should show confirmation dialog when delete button is clicked', async ({ page }) => {
    // Send a test message
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Wait for message to appear
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // Open message menu (click three dots)
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');

    // Click delete button
    await page.click('button:has-text("Delete")');

    // Confirmation dialog should appear
    await expect(page.locator('text=Delete Message?')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete this message')).toBeVisible();
  });

  test('should have proper dialog labels and buttons', async ({ page }) => {
    // Send a test message
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Check dialog buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();

    // Delete button should have red/danger styling
    const deleteButton = page.locator('button:has-text("Delete")').last();
    await expect(deleteButton).toHaveClass(/bg-red/);
  });

  test('should cancel deletion when Cancel button is clicked', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Click Cancel
    await page.locator('button:has-text("Cancel")').first().click();

    // Dialog should close
    await expect(page.locator('text=Delete Message?')).not.toBeVisible();

    // Message should still be visible
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
  });

  test('should delete message when Delete button is confirmed', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Confirm deletion
    const deleteButton = page.locator('button:has-text("Delete")').last();
    await deleteButton.click();
    await page.waitForLoadState('networkidle');

    // Dialog should close
    await expect(page.locator('text=Delete Message?')).not.toBeVisible();

    // Message should be deleted (not visible)
    await expect(page.locator(`text=${testMessage}`)).not.toBeVisible();
  });

  test('should close dialog when X button is clicked', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Click X button
    await page.click('button[aria-label="Close dialog"]');

    // Dialog should close
    await expect(page.locator('text=Delete Message?')).not.toBeVisible();

    // Message should still be visible
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
  });

  test('should close dialog when clicking outside (backdrop)', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Click on backdrop (outside dialog)
    await page.click('[role="dialog"]', { position: { x: 10, y: 10 } });

    // Dialog should close
    await expect(page.locator('text=Delete Message?')).not.toBeVisible();

    // Message should still be visible
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
  });

  test('should support Escape key to close dialog', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should close
    await expect(page.locator('text=Delete Message?')).not.toBeVisible();

    // Message should still be visible
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
  });

  test('should auto-focus Cancel button when dialog opens', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Wait for dialog animation

    // Cancel button should be focused (safer default for destructive action)
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await expect(cancelButton).toBeFocused();
  });

  test('should support keyboard navigation (Tab)', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Cancel should be focused
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await expect(cancelButton).toBeFocused();

    // Press Tab to move to Delete button
    await page.keyboard.press('Tab');
    const deleteButton = page.locator('button:has-text("Delete")').last();
    await expect(deleteButton).toBeFocused();

    // Press Tab to move to X button
    await page.keyboard.press('Tab');
    const closeButton = page.locator('button[aria-label="Close dialog"]');
    await expect(closeButton).toBeFocused();
  });

  test('should trap focus within dialog', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Open menu and click delete
    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Tab through all elements
    await page.keyboard.press('Tab'); // Delete button
    await page.keyboard.press('Tab'); // X button
    await page.keyboard.press('Tab'); // Should wrap to Cancel button

    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await expect(cancelButton).toBeFocused();
  });

  test('should work in direct messages', async ({ page }) => {
    // Switch to DM conversation
    // (This assumes there are other users available)
    const hasOtherUsers = await page.locator('text=Direct Messages').isVisible().catch(() => false);

    if (hasOtherUsers) {
      await page.click('text=Direct Messages');

      // Send DM
      const testMessage = `DM test ${Date.now()}`;
      const chatInput = page.locator('textarea[placeholder*="Message"]');
      await chatInput.fill(testMessage);
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');

      // Open menu and click delete
      const messageRow = page.locator(`text=${testMessage}`).locator('..');
      await messageRow.hover();
      await page.click('button[aria-label*="Message options"]');
      await page.click('button:has-text("Delete")');

      // Confirmation dialog should appear
      await expect(page.locator('text=Delete Message?')).toBeVisible();

      // Confirm deletion
      const deleteButton = page.locator('button:has-text("Delete")').last();
      await deleteButton.click();
      await page.waitForLoadState('networkidle');

      // Message should be deleted
      await expect(page.locator(`text=${testMessage}`)).not.toBeVisible();
    }
  });

  test('should handle multiple delete attempts gracefully', async ({ page }) => {
    // Send first message
    const testMessage1 = `Test message 1 ${Date.now()}`;
    let chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage1);
    await page.keyboard.press('Enter');

    // Send second message
    const testMessage2 = `Test message 2 ${Date.now()}`;
    chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage2);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Delete first message
    let messageRow = page.locator(`text=${testMessage1}`).locator('..');
    await messageRow.hover();
    await page.locator('button[aria-label*="Message options"]').first().click();
    await page.locator('button:has-text("Delete")').first().click();

    // Confirm
    await page.locator('button:has-text("Delete")').last().click();
    await page.waitForLoadState('networkidle');

    // Delete second message
    messageRow = page.locator(`text=${testMessage2}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Confirm
    await page.locator('button:has-text("Delete")').last().click();
    await page.waitForLoadState('networkidle');

    // Both messages should be deleted
    await expect(page.locator(`text=${testMessage1}`)).not.toBeVisible();
    await expect(page.locator(`text=${testMessage2}`)).not.toBeVisible();
  });
});

test.describe('Chat Delete - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
        const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
    await page.click('button[aria-label="Toggle chat panel"]');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Dialog should have proper ARIA attributes
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby');
    await expect(dialog).toHaveAttribute('aria-describedby');
  });

  test('should have minimum touch target sizes (44x44px)', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Check button sizes
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    const deleteButton = page.locator('button:has-text("Delete")').last();
    const closeButton = page.locator('button[aria-label="Close dialog"]');

    const cancelSize = await cancelButton.boundingBox();
    const deleteSize = await deleteButton.boundingBox();
    const closeSize = await closeButton.boundingBox();

    expect(cancelSize?.height).toBeGreaterThanOrEqual(44);
    expect(deleteSize?.height).toBeGreaterThanOrEqual(44);
    expect(closeSize?.height).toBeGreaterThanOrEqual(44);
  });

  test('should prevent body scroll when dialog is open', async ({ page }) => {
    const testMessage = `Test message ${Date.now()}`;
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    const messageRow = page.locator(`text=${testMessage}`).locator('..');
    await messageRow.hover();
    await page.click('button[aria-label*="Message options"]');
    await page.click('button:has-text("Delete")');

    // Body should have overflow:hidden
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Close dialog
    await page.keyboard.press('Escape');

    // Overflow should be restored
    const bodyOverflowAfter = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflowAfter).toBe('');
  });
});
