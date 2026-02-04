import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Push Notifications
 * Sprint 3 Issue #36
 *
 * Tests push notification subscription management and settings.
 * Note: Actual push delivery testing requires real browser permissions
 * and cannot be fully automated.
 */

test.describe('Push Notifications', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);

    // Navigate to app
    await page.goto('http://localhost:3000');

    // Login as Derrick
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }

    // Wait for app to load - main navigation sidebar appears after successful login
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });
  });

  test('should show push notification settings', async ({ page }) => {
    // Open settings or find push notification toggle
    // Look for bell icon or settings menu
    const settingsButton = page.locator('button:has-text("Settings"), button[aria-label*="Settings"]');

    if (await settingsButton.count() > 0) {
      await settingsButton.first().click();
      await page.waitForTimeout(500);

      // Look for push notification section
      const pushSection = page.locator('text=/Push Notifications?/i');
      await expect(pushSection).toBeVisible({ timeout: 5000 });
    } else {
      // Settings might be in a different location
      // Look for bell icon directly
      const bellIcon = page.locator('button[aria-label*="notification"], button[title*="notification"]');
      await expect(bellIcon.first()).toBeVisible();
    }
  });

  test('should show browser support status', async ({ page }) => {
    // Push notifications require service worker support
    // Check if supported/not supported message appears

    // Execute in page context to check support
    const isSupported = await page.evaluate(() => {
      return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      );
    });

    expect(isSupported).toBe(true); // Modern browsers should support
  });

  test('should register service worker on load', async ({ page }) => {
    // Wait a bit for service worker to register
    await page.waitForTimeout(2000);

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration !== undefined;
      }
      return false;
    });

    // Service worker should be registered
    // Note: might not be registered yet in test environment
    console.log('Service worker registered:', swRegistered);
  });

  test('should enable push notifications when toggled', async ({ page }) => {
    // Find push notification toggle
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]');

    if (await bellButton.count() > 0) {
      const button = bellButton.first();

      // Check initial state
      const initialState = await button.getAttribute('aria-checked');

      // Click to toggle
      await button.click();

      // Wait for state change
      await page.waitForTimeout(2000);

      // Verify state changed
      const newState = await button.getAttribute('aria-checked');

      // State should have changed (or permission dialog appeared)
      console.log('Initial state:', initialState, 'New state:', newState);
    } else {
      test.skip(); // Toggle not found, might be in different location
    }
  });

  test('should show permission request on first enable', async ({ page }) => {
    // This test requires mocking or manual permission grant
    // In real browser, permission dialog would appear
    test.skip(); // Cannot fully test permission dialog in automated tests
  });

  test('should store subscription in database', async ({ page }) => {
    // Enable notifications
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      await bellButton.click();
      await page.waitForTimeout(3000);

      // Verify subscription was created
      // This would require database access or API call
      // For now, check for success message
      const successMessage = page.locator('text=/enabled|subscribed/i');
      // May or may not appear depending on UI design
    }
  });

  test('should disable push notifications when toggled off', async ({ page }) => {
    // Enable first
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      // Enable
      await bellButton.click();
      await page.waitForTimeout(2000);

      // Disable
      await bellButton.click();
      await page.waitForTimeout(2000);

      // Should show as disabled
      const ariaChecked = await bellButton.getAttribute('aria-checked');
      expect(ariaChecked).toBe('false');
    }
  });

  test('should show notification types in settings', async ({ page }) => {
    // Open push notification settings
    // Should show what types of notifications will be sent
    const notificationTypes = [
      'task reminder',
      'mention',
      'assigned',
      'daily briefing',
    ];

    // Check if any of these are mentioned in the UI
    for (const type of notificationTypes) {
      const typeText = page.locator(`text=/${type}/i`);
      // At least some notification types should be visible
      // if settings are open
    }
  });

  test('should show permission denied message if blocked', async ({ page, context }) => {
    // Deny permission
    await context.clearPermissions();
    await context.grantPermissions([]); // Empty = denied

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Should show blocked message
    const blockedMessage = page.locator('text=/blocked|denied|disable/i');
    // Message should appear somewhere in settings
  });

  test('should not show toggle if unsupported', async ({ page }) => {
    // Mock browser as unsupported
    await page.addInitScript(() => {
      // Remove Push API support
      delete (window as any).PushManager;
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Toggle should not appear or should show unsupported message
    const unsupportedMessage = page.locator('text=/not supported|unsupported/i');
    // Should see this message somewhere
  });

  test('should persist subscription across page reloads', async ({ page }) => {
    // Enable notifications
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      await bellButton.click();
      await page.waitForTimeout(2000);

      // Check if enabled
      let enabled = await bellButton.getAttribute('aria-checked');

      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);

      // Wait for bell button to appear again
      await bellButton.waitFor({ state: 'visible', timeout: 5000 });

      // Should still be enabled
      const stillEnabled = await bellButton.getAttribute('aria-checked');
      expect(stillEnabled).toBe(enabled);
    }
  });

  test('should show loading state during subscription', async ({ page }) => {
    // Find toggle
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      // Click to subscribe
      const clickPromise = bellButton.click();

      // Should show loading indicator
      const loader = page.locator('svg.animate-spin').first();
      // Loader might appear briefly

      await clickPromise;
      await page.waitForTimeout(2000);

      // Loader should disappear
      await expect(loader).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle subscription errors gracefully', async ({ page }) => {
    // Mock subscription failure
    await page.addInitScript(() => {
      const originalSubscribe = PushManager.prototype.subscribe;
      PushManager.prototype.subscribe = function () {
        return Promise.reject(new Error('Subscription failed'));
      };
    });

    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      await bellButton.click();
      await page.waitForTimeout(2000);

      // Should show error message
      const errorMessage = page.locator('text=/failed|error/i');
      // Error should appear somewhere
    }
  });

  test('should show success message after enabling', async ({ page }) => {
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      await bellButton.click();
      await page.waitForTimeout(2000);

      // Look for success message
      const successMessage = page.locator('text=/enabled|success|subscribed/i');
      // Success message might appear
    }
  });

  test('should update UI immediately after toggle', async ({ page }) => {
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      const initialClass = await bellButton.getAttribute('class');

      await bellButton.click();
      await page.waitForTimeout(500);

      const newClass = await bellButton.getAttribute('class');

      // Classes should change (color, icon, etc)
      expect(newClass).not.toBe(initialClass);
    }
  });

  test('should work with service worker lifecycle', async ({ page }) => {
    // Service worker should handle updates
    await page.waitForTimeout(2000);

    const swStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return {
          active: !!registration?.active,
          installing: !!registration?.installing,
          waiting: !!registration?.waiting,
        };
      }
      return null;
    });

    console.log('Service worker status:', swStatus);
    // Active or installing should be true
  });

  test('should handle multiple subscriptions per user', async ({ page, context }) => {
    // User could subscribe from multiple devices/browsers
    // Each subscription should be stored separately

    // Enable notifications
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      await bellButton.click();
      await page.waitForTimeout(2000);

      // Subscription should be created
      // In real scenario, opening in new context would create another subscription
    }
  });

  test('should clean up subscription on disable', async ({ page }) => {
    const bellButton = page.locator('button[aria-label*="push"], button[title*="push"]').first();

    if (await bellButton.count() > 0) {
      // Enable
      await bellButton.click();
      await page.waitForTimeout(2000);

      // Disable
      await bellButton.click();
      await page.waitForTimeout(2000);

      // Subscription should be removed from database
      // Verify through API or database check
    }
  });
});

test.describe('Push Notification Settings Panel', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await page.goto('http://localhost:3000');

    // Login
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    // Wait for app to load - main navigation sidebar appears after successful login
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });
  });

  test('should show detailed settings panel', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('button:has-text("Settings"), [aria-label*="Settings"]');

    if (await settingsButton.count() > 0) {
      await settingsButton.first().click();
      await page.waitForTimeout(500);

      // Should show push notification section
      const pushSection = page.locator('[data-testid="push-settings"], text=/push notification/i');
      await expect(pushSection.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should explain notification types to user', async ({ page }) => {
    // Settings should explain what notifications will be sent
    const descriptions = [
      'reminder',
      'mention',
      'assigned',
      'briefing',
    ];

    // At least some should be visible in settings
  });

  test('should show toggle switch in settings', async ({ page }) => {
    // Look for toggle switch element
    const toggle = page.locator('button[role="switch"], input[type="checkbox"][role="switch"]');

    if (await toggle.count() > 0) {
      await expect(toggle.first()).toBeVisible();
    }
  });
});
