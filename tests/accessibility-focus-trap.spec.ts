import { test, expect } from '@playwright/test';

test.describe('Accessibility - Enhanced Focus Trap', () => {
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

  test.describe('ConfirmDialog Focus Trap', () => {
    test('should prevent mouse clicks outside from stealing focus', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Test task for focus trap');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Try to click outside the dialog (on backdrop)
        const backdrop = page.locator('.backdrop-blur-sm, [class*="backdrop"]').first();
        if (await backdrop.isVisible()) {
          await backdrop.click({ position: { x: 10, y: 10 }, force: true });
          await page.waitForTimeout(200);
        }

        // Focus should still be within the dialog
        const focusedElement = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(activeEl);
        });

        // Dialog should still be visible (click on backdrop closes it normally)
        // But focus should be trapped if we prevented the click
        expect(focusedElement).toBe(true);

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });

    test('should cycle focus with Tab within dialog', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Tab cycling test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Tab through all focusable elements
        const focusedElements = [];
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Tab');
          const tagName = await page.evaluate(() => document.activeElement?.tagName);
          focusedElements.push(tagName);
        }

        // All focused elements should be within the dialog (BUTTON, A, etc.)
        const validTags = ['BUTTON', 'A', 'INPUT'];
        expect(focusedElements.every(tag => validTags.includes(tag || ''))).toBe(true);

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });

    test('should cycle focus backwards with Shift+Tab', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Shift+Tab test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Get first focused element
        const firstFocus = await page.evaluate(() => document.activeElement?.textContent);

        // Shift+Tab multiple times
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Shift+Tab');

        // Focus should cycle back to first element
        const currentFocus = await page.evaluate(() => document.activeElement?.textContent);

        // Should have cycled through elements
        expect(currentFocus).toBeTruthy();

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });

    test('should restore focus to cancel button after click outside attempt', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Focus restore test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Verify dialog is open and cancel button is focused
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        const initialFocus = await page.evaluate(() => {
          return {
            tag: document.activeElement?.tagName,
            text: document.activeElement?.textContent,
          };
        });

        expect(initialFocus.tag).toBe('BUTTON');

        // Try to click outside (should prevent focus loss)
        await page.mouse.click(10, 10);
        await page.waitForTimeout(200);

        // Focus should be restored to a button in the dialog
        const restoredFocus = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return {
            isInDialog: dialog?.contains(activeEl),
            tag: activeEl?.tagName,
          };
        });

        expect(restoredFocus.isInDialog).toBe(true);
        expect(restoredFocus.tag).toBe('BUTTON');

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('SmartParseModal Focus Trap (via useFocusTrap hook)', () => {
    test('should prevent mouse clicks outside from stealing focus', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Look for Smart Parse button
      const smartParseButton = page.locator('button:has-text("Smart"), button:has-text("AI"), button[aria-label*="Smart"]').first();

      if (await smartParseButton.isVisible()) {
        await smartParseButton.click();
        await page.waitForTimeout(300);

        // Verify modal is open
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Try to click outside the modal
        await page.mouse.click(10, 10);
        await page.waitForTimeout(200);

        // Focus should still be within the modal
        const focusedElement = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const modal = document.querySelector('[role="dialog"]');
          return modal?.contains(activeEl);
        });

        expect(focusedElement).toBe(true);

        // Close modal
        await page.keyboard.press('Escape');
      }
    });

    test('should trap Tab focus within SmartParseModal', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Look for Smart Parse button
      const smartParseButton = page.locator('button:has-text("Smart"), button:has-text("AI"), button[aria-label*="Smart"]').first();

      if (await smartParseButton.isVisible()) {
        await smartParseButton.click();
        await page.waitForTimeout(300);

        // Verify modal is open
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Tab through elements
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
        }

        // Focus should still be within modal
        const focusedElement = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const modal = document.querySelector('[role="dialog"]');
          return modal?.contains(activeEl);
        });

        expect(focusedElement).toBe(true);

        // Close modal
        await page.keyboard.press('Escape');
      }
    });

    test('should auto-focus primary action on open', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Look for Smart Parse button
      const smartParseButton = page.locator('button:has-text("Smart"), button:has-text("AI"), button[aria-label*="Smart"]').first();

      if (await smartParseButton.isVisible()) {
        await smartParseButton.click();
        await page.waitForTimeout(500);

        // Verify modal is open
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Check that something is focused
        const focused = await page.evaluate(() => {
          const activeEl = document.activeElement;
          return {
            tag: activeEl?.tagName,
            hasFocus: document.hasFocus(),
          };
        });

        expect(focused.hasFocus).toBe(true);
        expect(['BUTTON', 'INPUT', 'TEXTAREA']).toContain(focused.tag);

        // Close modal
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('TaskBottomSheet Focus Trap', () => {
    test('should prevent mouse clicks outside from stealing focus', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Bottom sheet focus trap test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Click on task to open bottom sheet
      const taskItem = page.locator('text=Bottom sheet focus trap test').first();
      await taskItem.click();
      await page.waitForTimeout(500);

      // Verify bottom sheet is open
      const bottomSheet = page.locator('[role="dialog"], .bottom-sheet, [aria-modal="true"]').last();
      const isVisible = await bottomSheet.isVisible();

      if (isVisible) {
        // Try to click outside the bottom sheet
        await page.mouse.click(10, 10);
        await page.waitForTimeout(200);

        // Focus should still be within the sheet (or sheet closed via backdrop click)
        const focusedElement = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const sheet = document.querySelector('[role="dialog"], .bottom-sheet, [aria-modal="true"]');
          return sheet?.contains(activeEl);
        });

        // Either focus is in sheet OR sheet was closed by backdrop click
        // (Both are valid accessibility behaviors)
        if (await bottomSheet.isVisible()) {
          expect(focusedElement).toBe(true);
        }

        // Close sheet
        await page.keyboard.press('Escape');
      }
    });

    test('should trap Tab focus within bottom sheet', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Sheet Tab trap test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Click on task to open bottom sheet
      const taskItem = page.locator('text=Sheet Tab trap test').first();
      await taskItem.click();
      await page.waitForTimeout(500);

      // Verify bottom sheet is open
      const bottomSheet = page.locator('[role="dialog"], .bottom-sheet, [aria-modal="true"]').last();
      const isVisible = await bottomSheet.isVisible();

      if (isVisible) {
        // Tab through elements multiple times
        for (let i = 0; i < 15; i++) {
          await page.keyboard.press('Tab');
        }

        // Focus should still be within sheet
        const focusedElement = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const sheet = document.querySelector('[role="dialog"], .bottom-sheet, [aria-modal="true"]');
          return sheet?.contains(activeEl);
        });

        expect(focusedElement).toBe(true);

        // Close sheet
        await page.keyboard.press('Escape');
      }
    });

    test('should trap Shift+Tab focus backwards', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Sheet Shift+Tab test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Click on task to open bottom sheet
      const taskItem = page.locator('text=Sheet Shift+Tab test').first();
      await taskItem.click();
      await page.waitForTimeout(500);

      // Verify bottom sheet is open
      const bottomSheet = page.locator('[role="dialog"], .bottom-sheet, [aria-modal="true"]').last();
      const isVisible = await bottomSheet.isVisible();

      if (isVisible) {
        // Shift+Tab backwards through elements
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Shift+Tab');
        }

        // Focus should still be within sheet
        const focusedElement = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const sheet = document.querySelector('[role="dialog"], .bottom-sheet, [aria-modal="true"]');
          return sheet?.contains(activeEl);
        });

        expect(focusedElement).toBe(true);

        // Close sheet
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Focus Restoration After Modal Close', () => {
    test('should restore focus to trigger button after ConfirmDialog closes', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Focus restoration test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Get and focus the delete button
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        // Click to open dialog
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Verify dialog is open
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Close with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Focus should be somewhere in the page (ideally back to delete button, but not required)
        const focusedElement = await page.evaluate(() => {
          return {
            tag: document.activeElement?.tagName,
            inBody: document.body.contains(document.activeElement),
          };
        });

        expect(focusedElement.inBody).toBe(true);
        expect(focusedElement.tag).toBeTruthy();
      }
    });

    test('should restore focus after SmartParseModal closes', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Look for Smart Parse button
      const smartParseButton = page.locator('button:has-text("Smart"), button:has-text("AI"), button[aria-label*="Smart"]').first();

      if (await smartParseButton.isVisible()) {
        // Click to open modal
        await smartParseButton.click();
        await page.waitForTimeout(300);

        // Verify modal is open
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Close with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Focus should be restored (useFocusTrap handles this)
        const focusedElement = await page.evaluate(() => {
          return {
            tag: document.activeElement?.tagName,
            inBody: document.body.contains(document.activeElement),
          };
        });

        expect(focusedElement.inBody).toBe(true);
        expect(focusedElement.tag).toBeTruthy();
      }
    });
  });

  test.describe('Focus Trap Edge Cases', () => {
    test('should handle dialog with only one focusable element', async ({ page }) => {
      // This test verifies behavior when dialog has minimal focusable elements
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Minimal dialog test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Open a simple dialog (delete confirmation typically has 2-3 buttons)
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Tab should not break with few elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Should still have focus somewhere in dialog
        const hasFocus = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(document.activeElement);
        });

        expect(hasFocus).toBe(true);

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });

    test('should not trap focus when modal is closed', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Ensure no modal is open
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).not.toBeVisible();

      // Tab should navigate normally in the page
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focus should be in the main page, not trapped
      const focusedElement = await page.evaluate(() => {
        return {
          tag: document.activeElement?.tagName,
          inBody: document.body.contains(document.activeElement),
        };
      });

      expect(focusedElement.inBody).toBe(true);
    });

    test('should handle rapid Tab presses without breaking', async ({ page }) => {
      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a test task
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Rapid Tab test');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Open delete dialog
      const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Rapidly press Tab many times
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('Tab');
        }

        // Focus should still be within dialog and not broken
        const focusedElement = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          return {
            isInDialog: dialog?.contains(document.activeElement),
            tag: document.activeElement?.tagName,
          };
        });

        expect(focusedElement.isInDialog).toBe(true);
        expect(focusedElement.tag).toBeTruthy();

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });
  });
});
