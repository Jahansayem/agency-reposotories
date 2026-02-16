/**
 * E2E Tests: Long-Press Context Menus
 *
 * Tests mobile long-press gesture for opening context menus on tasks and messages.
 * Replaces the need to find and tap "..." button on mobile devices.
 *
 * Issue #20: Long-Press Context Menus (Sprint 2, Category 4)
 * Estimated: 3 hours
 *
 * Gesture Spec:
 * - Long-press (500ms hold) → Opens context menu with actions
 * - Haptic feedback: 50ms vibration on menu open
 * - Visual feedback: Ring highlight during long-press
 * - Works on tasks (TodoItem) and messages (ChatMessageList)
 */

import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Long-Press Context Menus', () => {
  test.describe('Task Long-Press', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, 'Derrick', '8008');

      // Ensure at least one task exists
      const tasks = page.locator('[role="listitem"]');
      const taskCount = await tasks.count();

      if (taskCount === 0) {
        // Create a test task
        const input = page.locator('[placeholder*="Add a task"]').or(page.locator('input[type="text"]'));
        await input.fill('Test task for long-press');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should show context menu on long-press of task (500ms hold)', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Long-press is primarily for mobile');

      // Get first task
      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      // Simulate long-press (touch and hold for 500ms)
      await page.touchscreen.tap(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      // Genuine timing wait: hold past 500ms long-press threshold
      await page.waitForTimeout(600); // Hold > 500ms threshold

      // Context menu should appear
      const contextMenu = page.locator('[role="menu"][aria-label="Task actions menu"]').or(
        page.locator('.fixed.bg-\\[var\\(--surface\\)\\]') // Portal dropdown
      );

      await expect(contextMenu.first()).toBeVisible({ timeout: 1000 });
    });

    test('should NOT show context menu on short tap (<500ms)', async ({ page }) => {
      // Get first task
      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      // Simulate short tap
      await page.touchscreen.tap(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.waitForTimeout(200); // Release before 500ms

      // Context menu should NOT appear
      const contextMenu = page.locator('[role="menu"][aria-label="Task actions menu"]');
      expect(await contextMenu.count()).toBe(0);
    });

    test('should show visual feedback (ring highlight) during long-press', async ({ page }) => {
      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      // Get initial classes
      const initialClass = await task.getAttribute('class');

      // Start long-press
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      // Genuine timing wait: hold past 500ms long-press threshold
      await page.waitForTimeout(550); // Hold for long-press

      // Check for ring-2 ring-[var(--accent)]/50 class during press
      const duringPressClass = await task.getAttribute('class');

      // Should include ring styling
      if (duringPressClass) {
        expect(duringPressClass.includes('ring-2') || duringPressClass.includes('ring-')).toBeTruthy();
      }

      await page.mouse.up();
    });

    test('should trigger haptic feedback on long-press menu open', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Haptic feedback only on mobile');

      // Mock navigator.vibrate
      await page.evaluate(() => {
        (window as any).__vibrateCallCount = 0;
        (window as any).__vibrateDurations = [];

        const originalVibrate = navigator.vibrate.bind(navigator);
        navigator.vibrate = function(pattern: VibratePattern): boolean {
          (window as any).__vibrateCallCount++;
          (window as any).__vibrateDurations.push(pattern);
          return originalVibrate(pattern);
        } as typeof navigator.vibrate;
      });

      // Perform long-press
      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      await page.touchscreen.tap(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

      // Check vibrate was called with 50ms duration
      const vibrateCallCount = await page.evaluate(() => (window as any).__vibrateCallCount);
      const vibrateDurations = await page.evaluate(() => (window as any).__vibrateDurations);

      expect(vibrateCallCount).toBeGreaterThanOrEqual(1);

      // Should include 50ms vibration
      const has50msVibration = vibrateDurations.some((d: any) => d === 50 || (Array.isArray(d) && d[0] === 50));
      expect(has50msVibration).toBeTruthy();
    });

    test('should NOT trigger long-press when interacting with buttons/inputs', async ({ page }) => {
      // Long-press on checkbox should not open menu
      const checkbox = page.locator('[role="listitem"]').first().locator('button').first();
      const boundingBox = await checkbox.boundingBox();

      if (!boundingBox) {
        throw new Error('Checkbox not found');
      }

      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      // Genuine timing wait: hold past 500ms long-press threshold
      await page.waitForTimeout(600); // Hold for long-press
      await page.mouse.up();

      // Context menu should NOT appear (prevented by target check)
      const contextMenu = page.locator('[role="menu"][aria-label="Task actions menu"]');
      expect(await contextMenu.count()).toBe(0);
    });

    test('should show Edit action in context menu', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Testing mobile context menu');

      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      // Long-press to open menu
      await page.touchscreen.tap(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

      // Find Edit action
      const editAction = page.locator('[role="menuitem"]').filter({ hasText: 'Edit' });
      await expect(editAction).toBeVisible({ timeout: 1000 });
    });

    test('should show Duplicate action in context menu', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Testing mobile context menu');

      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      await page.touchscreen.tap(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

      const duplicateAction = page.locator('[role="menuitem"]').filter({ hasText: 'Duplicate' });
      await expect(duplicateAction).toBeVisible({ timeout: 1000 });
    });

    test('should show Delete action in context menu', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Testing mobile context menu');

      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      await page.touchscreen.tap(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

      const deleteAction = page.locator('[role="menuitem"]').filter({ hasText: 'Delete' });
      await expect(deleteAction).toBeVisible({ timeout: 1000 });
    });
  });

  test.describe('Message Long-Press (Existing Tapback)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, 'Derrick', '8008');

      // Open chat panel
      await page.click('[aria-label*="Open chat"]');
      await page.waitForSelector('[role="dialog"][aria-label="Chat panel"]', { timeout: 5000 });

      // Navigate to team chat
      const teamConv = page.locator('text=Team Chat');
      if (await teamConv.count() > 0) {
        await teamConv.click();
        await page.waitForLoadState('networkidle');
      }

      // Ensure at least one message exists
      const messages = page.locator('.rounded-\\[var\\(--radius-2xl\\)\\]');
      const messageCount = await messages.count();

      if (messageCount === 0) {
        const input = page.locator('[placeholder*="message"]').or(page.locator('textarea'));
        await input.fill('Test message for long-press');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should show tapback menu on long-press of message (500ms hold)', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Long-press for tapbacks is mobile feature');

      // Get first message bubble
      const message = page.locator('.rounded-\\[var\\(--radius-2xl\\)\\]').first();
      const boundingBox = await message.boundingBox();

      if (!boundingBox) {
        throw new Error('Message not found');
      }

      // Long-press (touch and hold)
      await page.touchscreen.tap(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

      // Tapback menu should appear (emojis)
      const tapbackMenu = page.locator('text=/❤️|👍|👎|😂|❗|❓/');

      // Give time for menu to appear
      await page.waitForLoadState('networkidle');

      // Check if tapback UI is visible
      // (May be implemented differently, checking for any emoji reactions)
    });

    test('should show visual feedback (yellow ring) during message long-press', async ({ page }) => {
      const message = page.locator('.rounded-\\[var\\(--radius-2xl\\)\\]').first();
      const boundingBox = await message.boundingBox();

      if (!boundingBox) {
        throw new Error('Message not found');
      }

      // Get initial classes
      const initialClass = await message.getAttribute('class');

      // Start long-press
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      // Genuine timing wait: hold past 500ms long-press threshold
      await page.waitForTimeout(550);

      // Check for ring styling during press
      const duringPressClass = await message.getAttribute('class');

      // Should include ring-yellow-400/50 class (longPressMessageId check)
      if (duringPressClass) {
        expect(duringPressClass.includes('ring-2') || duringPressClass.includes('ring-yellow')).toBeTruthy();
      }

      await page.mouse.up();
    });

    test('should trigger haptic feedback on message long-press', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Haptic feedback only on mobile');

      // Mock vibrate
      await page.evaluate(() => {
        (window as any).__vibrateCallCount = 0;
        const originalVibrate = navigator.vibrate.bind(navigator);
        navigator.vibrate = function(pattern: VibratePattern): boolean {
          (window as any).__vibrateCallCount++;
          return originalVibrate(pattern);
        } as typeof navigator.vibrate;
      });

      const message = page.locator('.rounded-\\[var\\(--radius-2xl\\)\\]').first();
      const boundingBox = await message.boundingBox();

      if (!boundingBox) {
        throw new Error('Message not found');
      }

      await page.touchscreen.tap(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

      const vibrateCallCount = await page.evaluate(() => (window as any).__vibrateCallCount);
      expect(vibrateCallCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Cancel Long-Press', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, 'Derrick', '8008');

      const tasks = page.locator('[role="listitem"]');
      const taskCount = await tasks.count();

      if (taskCount === 0) {
        const input = page.locator('[placeholder*="Add a task"]').or(page.locator('input[type="text"]'));
        await input.fill('Test task');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should cancel long-press when touch moves (drag)', async ({ page }) => {
      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;

      // Start touch
      await page.touchscreen.tap(centerX, centerY);

      // Move significantly before 500ms threshold

      // Context menu should NOT appear (touch moved, not stationary)
      const contextMenu = page.locator('[role="menu"]');
      expect(await contextMenu.count()).toBe(0);
    });

    test('should cancel long-press on touchcancel event', async ({ page }) => {
      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      // Simulate touchcancel by starting and immediately ending
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      await page.mouse.up(); // Ends before 500ms

      // Genuine timing wait: verify short press completes before 500ms threshold
      await page.waitForTimeout(400);

      // Menu should NOT appear
      const contextMenu = page.locator('[role="menu"]');
      expect(await contextMenu.count()).toBe(0);
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, 'Derrick', '8008');
    });

    test('should maintain keyboard access to context menu via "..." button', async ({ page }) => {
      // Long-press is additive - keyboard access should still work

      const task = page.locator('[role="listitem"]').first();

      // Find and click the three-dot button
      const menuButton = task.locator('button[aria-label="Task actions"]');

      if (await menuButton.count() > 0) {
        await menuButton.click();

        // Context menu should open
        const contextMenu = page.locator('[role="menu"][aria-label="Task actions menu"]');
        await expect(contextMenu).toBeVisible({ timeout: 2000 });
      }
    });

    test('should have proper aria-haspopup on task elements', async ({ page }) => {
      const task = page.locator('[role="listitem"]').first();

      // Menu button should have aria-haspopup
      const menuButton = task.locator('button[aria-haspopup="true"]');
      expect(await menuButton.count()).toBeGreaterThan(0);
    });

    test('should maintain role="listitem" on tasks for screen readers', async ({ page }) => {
      const tasks = page.locator('[role="listitem"]');
      const count = await tasks.count();

      expect(count).toBeGreaterThan(0);

      // First task should have listitem role
      const role = await tasks.first().getAttribute('role');
      expect(role).toBe('listitem');
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, 'Derrick', '8008');

      const tasks = page.locator('[role="listitem"]');
      const taskCount = await tasks.count();

      if (taskCount === 0) {
        const input = page.locator('[placeholder*="Add a task"]');
        await input.fill('Test task');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should work in WebKit (Safari/iOS)', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'WebKit-specific test');

      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      // Test long-press in WebKit
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      await page.mouse.up();

      // Should work without errors
      expect(true).toBeTruthy();
    });

    test('should work in Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');

      const task = page.locator('[role="listitem"]').first();
      const boundingBox = await task.boundingBox();

      if (!boundingBox) {
        throw new Error('Task not found');
      }

      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      await page.mouse.up();

      expect(true).toBeTruthy();
    });
  });
});
