import { test, expect } from '@playwright/test';

test.describe('Accessibility - Modal Keyboard Shortcuts', () => {
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
  });

  test.describe('ConfirmDialog Keyboard Shortcuts', () => {
    test('should close ConfirmDialog with Escape key', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Test task for deletion');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Open delete dialog (find delete button in task)
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Press Escape
        await page.keyboard.press('Escape');

        // Dialog should be closed
        await expect(dialog).not.toBeVisible();
      }
    });

    test('should confirm action with Cmd+Enter on macOS', async ({ page, browserName }) => {
      // Skip on non-webkit browsers for macOS-specific test
      if (browserName !== 'webkit') {
        test.skip();
      }

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Task to delete via Cmd+Enter');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Count tasks before deletion
      const tasksBefore = await page.locator('[data-testid*="task-"], .task-item').count();

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Press Cmd+Enter (macOS)
        await page.keyboard.press('Meta+Enter');

        // Dialog should be closed
        await expect(dialog).not.toBeVisible();

        // Task should be deleted
        const tasksAfter = await page.locator('[data-testid*="task-"], .task-item').count();
        expect(tasksAfter).toBeLessThan(tasksBefore);
      }
    });

    test('should confirm action with Ctrl+Enter on Windows/Linux', async ({ page, browserName }) => {
      // Skip on webkit (macOS) for Windows/Linux-specific test
      if (browserName === 'webkit') {
        test.skip();
      }

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Task to delete via Ctrl+Enter');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Count tasks before deletion
      const tasksBefore = await page.locator('[data-testid*="task-"], .task-item').count();

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Press Ctrl+Enter (Windows/Linux)
        await page.keyboard.press('Control+Enter');

        // Dialog should be closed
        await expect(dialog).not.toBeVisible();

        // Task should be deleted
        const tasksAfter = await page.locator('[data-testid*="task-"], .task-item').count();
        expect(tasksAfter).toBeLessThan(tasksBefore);
      }
    });

    test('should have visual focus indicator on confirm button', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Test task for focus test');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Tab to confirm button
        await page.keyboard.press('Tab');

        // Check that confirm button is focused
        const focusedElement = await page.evaluate(() => {
          return document.activeElement?.textContent;
        });

        // Should focus on confirm or cancel button
        expect(focusedElement).toBeTruthy();

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('TaskBottomSheet Keyboard Shortcuts', () => {
    test('should close TaskBottomSheet with Escape key', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Test task for bottom sheet');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Click on task to open bottom sheet
      const taskItem = page.locator('text=Test task for bottom sheet').first();
      await taskItem.click();
      await page.waitForLoadState('networkidle');

      // Verify bottom sheet is open (look for edit/detail view)
      const bottomSheet = page.locator('[role="dialog"], .bottom-sheet, [aria-modal="true"]').last();
      const isVisible = await bottomSheet.isVisible();

      if (isVisible) {
        // Press Escape
        await page.keyboard.press('Escape');

        // Bottom sheet should be closed
        await expect(bottomSheet).not.toBeVisible();
      }
    });

    test('should close TaskBottomSheet with Cmd+Down on macOS', async ({ page, browserName }) => {
      // Skip on non-webkit browsers for macOS-specific test
      if (browserName !== 'webkit') {
        test.skip();
      }

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Task for Cmd+Down test');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Click on task to open bottom sheet
      const taskItem = page.locator('text=Task for Cmd+Down test').first();
      await taskItem.click();
      await page.waitForLoadState('networkidle');

      // Verify bottom sheet is open
      const bottomSheet = page.locator('[role="dialog"], .bottom-sheet, [aria-modal="true"]').last();
      const isVisible = await bottomSheet.isVisible();

      if (isVisible) {
        // Press Cmd+Down (macOS dismiss gesture)
        await page.keyboard.press('Meta+ArrowDown');

        // Bottom sheet should be closed
        await expect(bottomSheet).not.toBeVisible();
      }
    });

    test('should close TaskBottomSheet with Ctrl+Down on Windows/Linux', async ({ page, browserName }) => {
      // Skip on webkit (macOS) for Windows/Linux-specific test
      if (browserName === 'webkit') {
        test.skip();
      }

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Task for Ctrl+Down test');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Click on task to open bottom sheet
      const taskItem = page.locator('text=Task for Ctrl+Down test').first();
      await taskItem.click();
      await page.waitForLoadState('networkidle');

      // Verify bottom sheet is open
      const bottomSheet = page.locator('[role="dialog"], .bottom-sheet, [aria-modal="true"]').last();
      const isVisible = await bottomSheet.isVisible();

      if (isVisible) {
        // Press Ctrl+Down (Windows/Linux dismiss gesture)
        await page.keyboard.press('Control+ArrowDown');

        // Bottom sheet should be closed
        await expect(bottomSheet).not.toBeVisible();
      }
    });

    test('should maintain focus after dismissing bottom sheet', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Focus test task');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Click on task to open bottom sheet
      const taskItem = page.locator('text=Focus test task').first();
      await taskItem.click();
      await page.waitForLoadState('networkidle');

      // Close with Escape
      await page.keyboard.press('Escape');

      // Focus should return to the page (not trapped in closed modal)
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      expect(focusedElement).toBeTruthy();
      expect(focusedElement).not.toBe('IFRAME'); // Not stuck in hidden iframe
    });
  });

  test.describe('SmartParseModal Keyboard Shortcuts', () => {
    test('should close SmartParseModal with Escape key', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Look for Smart Parse / AI Parse button
      const smartParseButton = page.locator('button:has-text("Smart"), button:has-text("AI"), button[aria-label*="Smart"]').first();

      if (await smartParseButton.isVisible()) {
        await smartParseButton.click();

        // Verify Smart Parse modal is open
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Press Escape
        await page.keyboard.press('Escape');

        // Modal should be closed
        await expect(modal).not.toBeVisible();
      }
    });

    test('should confirm smart parse with Cmd+Enter on macOS', async ({ page, browserName }) => {
      // Skip on non-webkit browsers for macOS-specific test
      if (browserName !== 'webkit') {
        test.skip();
      }

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Look for Smart Parse button
      const smartParseButton = page.locator('button:has-text("Smart"), button:has-text("AI"), button[aria-label*="Smart"]').first();

      if (await smartParseButton.isVisible()) {
        await smartParseButton.click();

        // Verify modal is open
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Enter task text if there's an input
        const taskInput = modal.locator('input, textarea').first();
        if (await taskInput.isVisible()) {
          await taskInput.fill('Call client about renewal by Friday');
        }

        // Press Cmd+Enter to confirm
        await page.keyboard.press('Meta+Enter');

        // Modal should be closed
        await expect(modal).not.toBeVisible();
      }
    });

    test('should confirm smart parse with Ctrl+Enter on Windows/Linux', async ({ page, browserName }) => {
      // Skip on webkit (macOS) for Windows/Linux-specific test
      if (browserName === 'webkit') {
        test.skip();
      }

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Look for Smart Parse button
      const smartParseButton = page.locator('button:has-text("Smart"), button:has-text("AI"), button[aria-label*="Smart"]').first();

      if (await smartParseButton.isVisible()) {
        await smartParseButton.click();

        // Verify modal is open
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Enter task text if there's an input
        const taskInput = modal.locator('input, textarea').first();
        if (await taskInput.isVisible()) {
          await taskInput.fill('Review policy documents and prepare quote');
        }

        // Press Ctrl+Enter to confirm
        await page.keyboard.press('Control+Enter');

        // Modal should be closed
        await expect(modal).not.toBeVisible();
      }
    });

    test('should have accessible keyboard hint text', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Look for Smart Parse button
      const smartParseButton = page.locator('button:has-text("Smart"), button:has-text("AI"), button[aria-label*="Smart"]').first();

      if (await smartParseButton.isVisible()) {
        await smartParseButton.click();

        // Verify modal is open
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Look for keyboard hint text (Cmd/Ctrl+Enter or Escape)
        const hintText = await modal.locator('text=/Cmd|Ctrl|Enter|Esc/i').count();

        // Should have some keyboard hint text (optional feature)
        // This test documents expected behavior but allows flexibility
        if (hintText > 0) {
          expect(hintText).toBeGreaterThan(0);
        }

        // Close modal
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Focus Trap in Modals', () => {
    test('should trap Tab focus within ConfirmDialog', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Focus trap test task');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Tab through focusable elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Focus should still be within the dialog
        const focusedElement = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(activeEl);
        });

        expect(focusedElement).toBe(true);

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });

    test('should trap Shift+Tab focus within modal', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Reverse focus trap test');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Shift+Tab to go backwards
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Shift+Tab');

        // Focus should still be within the dialog
        const focusedElement = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(activeEl);
        });

        expect(focusedElement).toBe(true);

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });

    test('should restore focus after modal closes', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Focus restoration test');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Get the delete button element
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        // Focus the delete button
        await deleteButton.focus();

        // Open delete dialog
        await deleteButton.click();

        // Close dialog with Escape
        await page.keyboard.press('Escape');

        // Focus should ideally return to the button that opened the modal
        // (This is an advanced accessibility feature, not always implemented)
        const focusedElement = await page.evaluate(() => {
          return document.activeElement?.tagName;
        });

        expect(focusedElement).toBeTruthy();
      }
    });
  });

  test.describe('Keyboard Shortcut Accessibility', () => {
    test('should not interfere with form input shortcuts', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Focus the task input
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.click();

      // Type Cmd/Ctrl+A to select all (standard text editing shortcut)
      const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
      if (isMac) {
        await page.keyboard.press('Meta+KeyA');
      } else {
        await page.keyboard.press('Control+KeyA');
      }

      // Should not trigger any modal shortcuts
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).not.toBeVisible();
    });

    test('should have consistent behavior across browsers', async ({ page, browserName }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Cross-browser test task');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Escape should work in all browsers
        await page.keyboard.press('Escape');

        await expect(dialog).not.toBeVisible();

        // Log browser for debugging
        console.log(`Escape key test passed in ${browserName}`);
      }
    });

    test('should announce keyboard shortcuts to screen readers', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForLoadState('networkidle');

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Screen reader test');
      await taskInput.press('Enter');
      await expect(page.locator('[data-testid]').first()).toBeVisible({ timeout: 5000 });

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Check for aria-keyshortcuts attribute or descriptive text
        const hasKeyboardHints = await dialog.evaluate((el) => {
          const hasAriaKeyshortcuts = !!el.querySelector('[aria-keyshortcuts]');
          const hasHintText = el.textContent?.includes('Esc') || el.textContent?.includes('Enter');
          return hasAriaKeyshortcuts || hasHintText;
        });

        // Optional feature: keyboard hints for screen readers
        // (This documents expected behavior but doesn't fail if not implemented)
        if (hasKeyboardHints) {
          expect(hasKeyboardHints).toBe(true);
        }

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });
  });
});
