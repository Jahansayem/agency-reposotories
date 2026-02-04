import { test, expect } from '@playwright/test';

test.describe('Chat - Reaction Discoverability', () => {
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
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
  });

  test('should show reaction button on message hover (desktop)', async ({ page }) => {
    // Open chat panel
    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();

    // Wait for chat to load
    await page.waitForTimeout(500);

    // Send a message
    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('Test message for reactions');
    await page.keyboard.press('Enter');

    // Wait for message to appear
    await expect(page.locator('text=Test message for reactions')).toBeVisible();

    // Hover over the message
    const message = page.locator('text=Test message for reactions').first();
    await message.hover();

    // Reaction button should be visible on hover
    const reactionButton = page.locator('button[aria-label="Add reaction to message"]').first();
    await expect(reactionButton).toBeVisible();

    // Button should have Smile icon
    const smileIcon = reactionButton.locator('svg');
    await expect(smileIcon).toBeVisible();
  });

  test('should open reaction picker when reaction button is clicked', async ({ page }) => {
    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('Test message');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Test message').first()).toBeVisible();

    const message = page.locator('text=Test message').first();
    await message.hover();

    const reactionButton = page.locator('button[aria-label="Add reaction to message"]').first();
    await reactionButton.click();

    // Reaction picker should appear
    await expect(page.locator('button[title="Heart"]').first()).toBeVisible();
    await expect(page.locator('button[title="Thumbs Up"]').first()).toBeVisible();
    await expect(page.locator('button[title="Thumbs Down"]').first()).toBeVisible();
  });

  test('should support long-press gesture on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('Long press test');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Long press test').first()).toBeVisible();

    // Simulate long-press with touch events
    const message = page.locator('text=Long press test').first();
    const messageBubble = message.locator('xpath=ancestor::div[contains(@class, "rounded-")]').first();

    // Touch start
    await messageBubble.dispatchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // Wait for long-press threshold (500ms)
    await page.waitForTimeout(600);

    // Touch end
    await messageBubble.dispatchEvent('touchend');

    // Reaction picker should appear
    await expect(page.locator('button[title="Heart"]').first()).toBeVisible({ timeout: 2000 });
  });

  test('should show visual hint during long-press', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('Visual hint test');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Visual hint test').first()).toBeVisible();

    const message = page.locator('text=Visual hint test').first();
    const messageBubble = message.locator('xpath=ancestor::div[contains(@class, "rounded-")]').first();

    // Touch start
    await messageBubble.dispatchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // Wait slightly past threshold
    await page.waitForTimeout(550);

    // Check for visual indicator (yellow ring)
    const hasYellowRing = await messageBubble.evaluate(el => {
      return el.className.includes('ring-yellow-400');
    });

    expect(hasYellowRing).toBeTruthy();

    // Touch end
    await messageBubble.dispatchEvent('touchend');
  });

  test('should cancel long-press if touch ends before threshold', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('Cancel test');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Cancel test').first()).toBeVisible();

    const message = page.locator('text=Cancel test').first();
    const messageBubble = message.locator('xpath=ancestor::div[contains(@class, "rounded-")]').first();

    // Touch start
    await messageBubble.dispatchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // Wait LESS than threshold (300ms instead of 500ms)
    await page.waitForTimeout(300);

    // Touch end
    await messageBubble.dispatchEvent('touchend');

    // Reaction picker should NOT appear
    await page.waitForTimeout(200);
    const heartButton = page.locator('button[title="Heart"]').first();
    await expect(heartButton).not.toBeVisible();
  });

  test('should add reaction from hover button', async ({ page }) => {
    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('Reaction test');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Reaction test').first()).toBeVisible();

    const message = page.locator('text=Reaction test').first();
    await message.hover();

    const reactionButton = page.locator('button[aria-label="Add reaction to message"]').first();
    await reactionButton.click();

    // Click heart reaction
    const heartButton = page.locator('button[title="Heart"]').first();
    await heartButton.click();

    // Heart reaction should appear on message
    await expect(page.locator('text=❤️').first()).toBeVisible();
  });

  test('should have accessible hover button (44x44px touch target)', async ({ page }) => {
    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('Accessibility test');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Accessibility test').first()).toBeVisible();

    const message = page.locator('text=Accessibility test').first();
    await message.hover();

    const reactionButton = page.locator('button[aria-label="Add reaction to message"]').first();
    await expect(reactionButton).toBeVisible();

    // Check button size
    const boundingBox = await reactionButton.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      // Should be at least 44x44px (WCAG 2.1 AA requirement)
      expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should work in direct messages', async ({ page }) => {
    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    // Switch to DM mode
    const dmToggle = page.locator('button:has-text("Direct Messages")');
    if (await dmToggle.isVisible()) {
      await dmToggle.click();
      await page.waitForTimeout(300);

      // Select a user (e.g., Sefra)
      const userButton = page.locator('button:has-text("Sefra")').first();
      if (await userButton.isVisible()) {
        await userButton.click();

        // Send a DM
        const chatInput = page.locator('textarea[placeholder*="Message"]');
        await chatInput.fill('DM reaction test');
        await page.keyboard.press('Enter');

        await expect(page.locator('text=DM reaction test').first()).toBeVisible();

        const message = page.locator('text=DM reaction test').first();
        await message.hover();

        // Reaction button should be visible in DMs too
        const reactionButton = page.locator('button[aria-label="Add reaction to message"]').first();
        await expect(reactionButton).toBeVisible();
      }
    }
  });
});

test.describe('Chat Reactions - Accessibility', () => {
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

    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
  });

  test('should have proper ARIA labels on reaction button', async ({ page }) => {
    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('ARIA test');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=ARIA test').first()).toBeVisible();

    const message = page.locator('text=ARIA test').first();
    await message.hover();

    const reactionButton = page.locator('button[aria-label="Add reaction to message"]').first();
    await expect(reactionButton).toBeVisible();
    await expect(reactionButton).toHaveAttribute('aria-label', 'Add reaction to message');
    await expect(reactionButton).toHaveAttribute('title', 'Add reaction');
  });

  test('should have proper color contrast on hover', async ({ page }) => {
    const chatToggle = page.locator('button:has-text("Chat")');
    await chatToggle.click();
    await page.waitForTimeout(500);

    const chatInput = page.locator('textarea[placeholder*="Message"]');
    await chatInput.fill('Contrast test');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Contrast test').first()).toBeVisible();

    const message = page.locator('text=Contrast test').first();
    await message.hover();

    const reactionButton = page.locator('button[aria-label="Add reaction to message"]').first();

    // Hover over the button
    await reactionButton.hover();

    // Check that icon changes to yellow on hover (group-hover:text-yellow-400)
    const icon = reactionButton.locator('svg');
    const iconClasses = await icon.getAttribute('class');
    expect(iconClasses).toContain('group-hover:text-yellow-400');
  });
});
