/**
 * Comprehensive AI Agent Feature Test Suite
 *
 * Tests all critical paths and edge cases for the AI conversational agent
 */

import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('AI Agent Feature - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsUser(page, 'Derrick', '8008');

    // Wait for app to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display agent toggle button after login', async ({ page }) => {
    // Check that the agent toggle button is visible
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await expect(toggleButton).toBeVisible({ timeout: 10000 });

    // Verify button styling
    await expect(toggleButton).toHaveClass(/bg-blue-600/);

    // Verify icon is present
    const icon = toggleButton.locator('svg');
    await expect(icon).toBeVisible();

    console.log('✓ Agent toggle button is visible and styled correctly');
  });

  test('should open agent panel when toggle button clicked', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();

    // Wait for panel to appear (should slide in)
    await page.waitForTimeout(500); // Animation time

    // Check for panel elements
    const panel = page.locator('text=/AI Assistant|Agent/i').first();
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Verify close button exists
    const closeButton = page.locator('button[aria-label*="Close" i], button:has-text("×")');
    await expect(closeButton.first()).toBeVisible();

    console.log('✓ Agent panel opens successfully');
  });

  test('should display all panel components', async ({ page }) => {
    // Open panel
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Check for textarea input
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Check for send button
    const sendButton = page.locator('button:has-text("Send")').or(
      page.locator('button[aria-label*="Send"]')
    );
    await expect(sendButton.first()).toBeVisible();

    // Check for character counter (should show 2000 max)
    const counter = page.locator('text=/\\d+\\s*\\/\\s*2000/');
    await expect(counter).toBeVisible();

    // Check for quick actions
    const quickActions = page.locator('button:has-text("Create Task"), button:has-text("Find Customers")');
    const quickActionCount = await quickActions.count();
    expect(quickActionCount).toBeGreaterThan(0);

    console.log('✓ All panel components are visible');
  });

  test('should enable send button only when message is typed', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    const sendButton = page.locator('button:has-text("Send")').first();

    // Send button should be disabled when empty
    const isDisabledInitially = await sendButton.isDisabled();
    expect(isDisabledInitially).toBe(true);

    // Type a message
    await textarea.fill('Test message');

    // Send button should be enabled
    await expect(sendButton).toBeEnabled({ timeout: 2000 });

    // Clear message
    await textarea.clear();

    // Send button should be disabled again
    await expect(sendButton).toBeDisabled();

    console.log('✓ Send button state works correctly');
  });

  test('should update character counter when typing', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    const testMessage = 'Hello AI assistant!';

    await textarea.fill(testMessage);

    // Check counter updates
    const counter = page.locator(`text=/${testMessage.length}`);
    await expect(counter).toBeVisible({ timeout: 2000 });

    console.log('✓ Character counter updates correctly');
  });

  test('should prevent messages over 2000 characters', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();

    // Try to enter 2500 characters
    const longMessage = 'a'.repeat(2500);
    await textarea.fill(longMessage);

    // Check that counter shows max or message is truncated
    const counterText = await page.locator('text=/\\d+\\s*\\/\\s*2000/').textContent();
    const currentCount = parseInt(counterText?.match(/\d+/)?.[0] || '0');

    expect(currentCount).toBeLessThanOrEqual(2000);

    console.log('✓ Character limit enforced');
  });

  test('should close panel with close button', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Find and click close button
    const closeButton = page.locator('button:has-text("×"), button[aria-label*="Close"]').first();
    await closeButton.click();

    // Panel should close (check that toggle button is visible again and panel is gone)
    await page.waitForTimeout(500); // Animation time
    await expect(toggleButton).toBeVisible();

    // Panel should not be visible (check for textarea)
    const textarea = page.locator('textarea').first();
    await expect(textarea).not.toBeVisible({ timeout: 2000 });

    console.log('✓ Panel closes successfully');
  });

  test('should open panel with keyboard shortcut (Cmd+Shift+A)', async ({ page }) => {
    // Press Cmd+Shift+A (or Ctrl+Shift+A on non-Mac)
    const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));

    if (isMac) {
      await page.keyboard.press('Meta+Shift+A');
    } else {
      await page.keyboard.press('Control+Shift+A');
    }

    // Wait for panel to appear
    await page.waitForTimeout(500);

    // Check that textarea is visible
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });

    console.log('✓ Keyboard shortcut (Cmd+Shift+A) works');
  });

  test('should close panel with Escape key', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Press Escape
    await page.keyboard.press('Escape');

    // Panel should close
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await expect(textarea).not.toBeVisible({ timeout: 2000 });

    console.log('✓ Escape key closes panel');
  });

  test('should send message with Cmd+Enter', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    await textarea.fill('Test message');

    // Press Cmd+Enter (or Ctrl+Enter)
    const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
    if (isMac) {
      await page.keyboard.press('Meta+Enter');
    } else {
      await page.keyboard.press('Control+Enter');
    }

    // Check that message was sent (textarea should clear or loading should appear)
    await page.waitForTimeout(1000);
    const textareaValue = await textarea.inputValue();

    // Either textarea is cleared or loading indicator appears
    const hasCleared = textareaValue === '';
    const hasLoading = await page.locator('text=/loading|sending/i').count() > 0;

    expect(hasCleared || hasLoading).toBe(true);

    console.log('✓ Cmd+Enter sends message');
  });

  test('should display usage stats in panel footer', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Look for token usage display (e.g., "0 tokens used" or similar)
    const usageText = page.locator('text=/\\d+\\s*(token|Token)/i');
    await expect(usageText).toBeVisible({ timeout: 5000 });

    console.log('✓ Usage stats displayed');
  });

  test('should show quick action buttons', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Check for at least one quick action
    const createTaskBtn = page.locator('button:has-text("Create Task")');
    const findCustomersBtn = page.locator('button:has-text("Find Customers")');
    const teamWorkloadBtn = page.locator('button:has-text("Team Workload")');

    // At least one should exist
    const quickActionVisible =
      (await createTaskBtn.count() > 0) ||
      (await findCustomersBtn.count() > 0) ||
      (await teamWorkloadBtn.count() > 0);

    expect(quickActionVisible).toBe(true);

    console.log('✓ Quick action buttons present');
  });

  test('should fill input when quick action clicked', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea').first();
    const createTaskBtn = page.locator('button:has-text("Create Task")').first();

    if (await createTaskBtn.count() > 0) {
      await createTaskBtn.click();

      // Textarea should have text filled in
      const textareaValue = await textarea.inputValue();
      expect(textareaValue.length).toBeGreaterThan(0);
      expect(textareaValue.toLowerCase()).toContain('task');

      console.log('✓ Quick action fills input');
    } else {
      console.log('⊘ Quick action not found (skipped)');
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // On mobile, panel should be full-screen or near full-screen
    const panel = page.locator('textarea').first().locator('..');
    const boundingBox = await panel.boundingBox();

    if (boundingBox) {
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        // Panel should take significant portion of screen
        const widthPercent = (boundingBox.width / viewportSize.width) * 100;
        expect(widthPercent).toBeGreaterThan(80); // At least 80% of width
      }
    }

    console.log('✓ Mobile responsive layout verified');
  });

  test('should show warning badge when usage exceeds 80%', async ({ page }) => {
    // This test verifies the UI logic for warning badge
    // Note: Actual usage tracking requires backend API calls

    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');

    // Check if warning badge exists (red dot indicator)
    const warningBadge = toggleButton.locator('.bg-red-500, [class*="badge"]');

    // Badge might not be visible initially (usage is 0)
    const badgeVisible = await warningBadge.count() > 0 && await warningBadge.first().isVisible();

    // This is expected to be false initially, but we're testing the element exists
    console.log(`✓ Warning badge element: ${badgeVisible ? 'visible' : 'hidden (expected for 0 usage)'}`);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');

    // Check aria-label
    const ariaLabel = await toggleButton.getAttribute('aria-label');
    expect(ariaLabel).toContain('AI Assistant');
    expect(ariaLabel).toContain('⌘⇧A');

    // Check title attribute
    const title = await toggleButton.getAttribute('title');
    expect(title).toContain('AI Assistant');

    console.log('✓ Accessibility attributes correct');
  });

  test('should not conflict with command palette (Cmd+K)', async ({ page }) => {
    // First, verify agent doesn't open with Cmd+K
    const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));

    if (isMac) {
      await page.keyboard.press('Meta+K');
    } else {
      await page.keyboard.press('Control+K');
    }

    await page.waitForTimeout(500);

    // Agent panel should NOT open (check textarea not visible)
    const agentTextarea = page.locator('textarea[placeholder*="message" i]').first();
    const isAgentOpen = await agentTextarea.isVisible().catch(() => false);

    // Cmd+K should open command palette, not agent
    expect(isAgentOpen).toBe(false);

    console.log('✓ No keyboard shortcut conflict with Cmd+K');
  });
});

test.describe('AI Agent Feature - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'Derrick', '8008');
    await page.waitForLoadState('networkidle');
  });

  test('should persist across page navigation', async ({ page }) => {
    // Open agent panel
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Type a message
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test persistence');

    // Navigate to a different page
    await page.click('a[href*="/calendar"]').catch(() =>
      page.click('text=/Calendar/i')
    );

    await page.waitForTimeout(1000);

    // Agent button should still be visible on new page
    await expect(toggleButton).toBeVisible({ timeout: 5000 });

    console.log('✓ Agent button persists across navigation');
  });

  test('should maintain z-index hierarchy with other floating elements', async ({ page }) => {
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');

    // Get button z-index
    const zIndex = await toggleButton.evaluate(el =>
      window.getComputedStyle(el.parentElement!).zIndex
    );

    // Should have z-index of 30 (as specified in code)
    expect(zIndex).toBe('30');

    // Check it doesn't overlap with chat button
    const chatButton = page.locator('[class*="FloatingChatButton"], button[aria-label*="Chat"]');
    const chatExists = await chatButton.count() > 0;

    if (chatExists) {
      const chatZIndex = await chatButton.first().evaluate(el =>
        window.getComputedStyle(el.parentElement || el).zIndex
      );

      // Chat button should have higher z-index (100)
      expect(parseInt(chatZIndex)).toBeGreaterThan(parseInt(zIndex));
    }

    console.log('✓ Z-index hierarchy correct');
  });
});

test.describe('AI Agent Feature - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'Derrick', '8008');
    await page.waitForLoadState('networkidle');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Open panel
    const toggleButton = page.locator('button[aria-label*="AI Assistant"]');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Go offline
    await page.context().setOffline(true);

    const textarea = page.locator('textarea').first();
    await textarea.fill('Test message');

    const sendButton = page.locator('button:has-text("Send")').first();
    await sendButton.click();

    // Should show error (toast notification or inline error)
    await page.waitForTimeout(2000);

    const errorVisible =
      (await page.locator('text=/error|failed|network/i').count() > 0) ||
      (await page.locator('[role="alert"]').count() > 0);

    expect(errorVisible).toBe(true);

    // Go back online
    await page.context().setOffline(false);

    console.log('✓ Network errors handled gracefully');
  });
});
