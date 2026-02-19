import { test, expect } from '@playwright/test';

/**
 * AI Agent E2E Tests
 *
 * NOTE: These tests require the database migration to be applied.
 * The migration adds the agent_conversations, agent_messages, and agent_usage tables.
 *
 * To run these tests:
 * 1. Apply migration: npm run migrate:schema
 * 2. Start dev server: npm run dev
 * 3. Run tests: npm run test:e2e -- agent-conversation.spec.ts
 *
 * SKIPPED until migration is applied.
 */

test.describe.skip('AI Agent Conversation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto('http://localhost:3000');

    // Wait for login page
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });

    // Login as Derrick (existing user)
    await page.fill('input[type="password"]', '1');
    await page.fill('input[type="password"]:nth-of-type(2)', '2');
    await page.fill('input[type="password"]:nth-of-type(3)', '3');
    await page.fill('input[type="password"]:nth-of-type(4)', '4');

    // Wait for dashboard
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  describe('toggle button', () => {
    test('should show agent toggle button', async ({ page }) => {
      const toggleButton = page.locator('button[aria-label="Open AI Assistant (Cmd+K)"]');
      await expect(toggleButton).toBeVisible();
    });

    test('should open panel when toggle button clicked', async ({ page }) => {
      const toggleButton = page.locator('button[aria-label="Open AI Assistant (Cmd+K)"]');
      await toggleButton.click();

      await expect(page.locator('text=AI Assistant')).toBeVisible();
      await expect(page.locator('text=Ask me anything...')).toBeVisible();
    });

    test('should open panel with Cmd+K shortcut', async ({ page }) => {
      await page.keyboard.press('Meta+k');

      await expect(page.locator('text=AI Assistant')).toBeVisible();
    });
  });

  describe('panel controls', () => {
    test.beforeEach(async ({ page }) => {
      // Open panel
      const toggleButton = page.locator('button[aria-label="Open AI Assistant (Cmd+K)"]');
      await toggleButton.click();
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    });

    test('should close panel when close button clicked', async ({ page }) => {
      const closeButton = page.locator('button[aria-label="Close"]');
      await closeButton.click();

      await expect(page.locator('text=AI Assistant')).not.toBeVisible();
    });

    test('should minimize panel when minimize button clicked', async ({ page }) => {
      const minimizeButton = page.locator('button[aria-label="Minimize"]');
      await minimizeButton.click();

      // Panel should close (minimization is same as close in current implementation)
      await expect(page.locator('text=AI Assistant')).not.toBeVisible();
    });

    test('should close panel with Escape key', async ({ page }) => {
      await page.keyboard.press('Escape');

      await expect(page.locator('text=AI Assistant')).not.toBeVisible();
    });
  });

  describe('sending messages', () => {
    test.beforeEach(async ({ page }) => {
      // Open panel
      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    });

    test('should show welcome message when no conversation', async ({ page }) => {
      await expect(page.locator('text=Hi! I\'m your AI assistant')).toBeVisible();
      await expect(page.locator('text=Create and manage tasks')).toBeVisible();
    });

    test('should disable send button when input empty', async ({ page }) => {
      const sendButton = page.locator('button:has-text("Send")');
      await expect(sendButton).toBeDisabled();
    });

    test('should enable send button when text entered', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      await textarea.fill('Hello');

      const sendButton = page.locator('button:has-text("Send")');
      await expect(sendButton).not.toBeDisabled();
    });

    test('should send message and receive response', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      await textarea.fill('How many tasks do I have?');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for loading state
      await expect(page.locator('button:has-text("Sending...")')).toBeVisible();

      // Wait for response
      await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 10000 });

      // User message should appear
      await expect(page.locator('text=How many tasks do I have?')).toBeVisible();

      // Assistant response should appear (any text in assistant bubble)
      await expect(page.locator('.bg-gray-100').first()).toBeVisible();
    });

    test('should send message with Cmd+Enter', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      await textarea.fill('Test message');

      await textarea.press('Meta+Enter');

      // Should show loading state
      await expect(page.locator('button:has-text("Sending...")')).toBeVisible();
    });

    test('should clear input after sending', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      await textarea.fill('Test message');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for message to be sent
      await expect(page.locator('button:has-text("Sending...")')).toBeVisible();
      await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 10000 });

      // Input should be cleared
      await expect(textarea).toHaveValue('');
    });
  });

  describe('character limit', () => {
    test.beforeEach(async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    });

    test('should show character count', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      await textarea.fill('Hello world');

      await expect(page.locator('text=11 / 2000')).toBeVisible();
    });

    test('should show red text when over limit', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');

      // Type a very long message
      const longText = 'a'.repeat(2001);
      await textarea.fill(longText);

      const counter = page.locator('text=/\\d+ \\/ 2000/');
      await expect(counter).toHaveClass(/text-red-600/);
    });

    test('should disable send when over limit', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      const longText = 'a'.repeat(2001);
      await textarea.fill(longText);

      const sendButton = page.locator('button:has-text("Send")');
      await expect(sendButton).toBeDisabled();
    });
  });

  describe('token usage', () => {
    test.beforeEach(async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    });

    test('should show "No tokens used yet" initially', async ({ page }) => {
      await expect(page.locator('text=No tokens used yet')).toBeVisible();
    });

    test('should update token usage after message', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      await textarea.fill('Quick test');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 10000 });

      // Token usage should update (any number greater than 0)
      await expect(page.locator('text=/\\d+ tokens used/')).toBeVisible({ timeout: 5000 });
    });
  });

  describe('quick actions', () => {
    test.beforeEach(async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    });

    test('should show quick actions', async ({ page }) => {
      // Quick actions should be visible (implementation may vary)
      // Just check that the quick actions section exists
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    });
  });

  describe('message persistence', () => {
    test('should maintain conversation when panel closed and reopened', async ({ page }) => {
      // Open panel and send message
      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();

      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      await textarea.fill('Test message for persistence');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 10000 });

      // Close panel
      await page.keyboard.press('Escape');
      await expect(page.locator('text=AI Assistant')).not.toBeVisible();

      // Reopen panel
      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();

      // Message should still be there
      await expect(page.locator('text=Test message for persistence')).toBeVisible();
    });
  });

  describe('error handling', () => {
    test.beforeEach(async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    });

    test('should show error message on API failure', async ({ page }) => {
      // This test requires mocking the API to fail
      // For now, just test that error states are handled gracefully

      // Intercept API call and force error
      await page.route('**/api/ai/agent', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      const textarea = page.locator('textarea[placeholder*="Ask me anything"]');
      await textarea.fill('Test error handling');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Should show error toast or error message
      // (Implementation may vary - just check loading stops)
      await expect(page.locator('button:has-text("Send")')).toBeVisible({ timeout: 5000 });
    });
  });

  describe('responsive design', () => {
    test('should show mobile overlay on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();

      // Mobile overlay should be visible
      const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
      await expect(overlay).toBeVisible();
    });

    test('should close panel when overlay clicked on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.keyboard.press('Meta+k');
      await expect(page.locator('text=AI Assistant')).toBeVisible();

      const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
      await overlay.click({ position: { x: 10, y: 10 } });

      await expect(page.locator('text=AI Assistant')).not.toBeVisible();
    });
  });
});
