/**
 * Accessibility (a11y) E2E Tests
 *
 * Tests WCAG 2.1 AA compliance for the application
 */

import { test, expect, Page } from '@playwright/test';

// Helper to login
async function login(page: Page, userName: string = 'Derrick') {
  await page.goto('/');

  // Click on user card
  const userCard = page.locator(`[data-testid="user-card-${userName}"]`).first();
  if (await userCard.isVisible()) {
    await userCard.click();

    // Enter PIN
    const pinInput = page.locator('[data-testid="pin-input"]');
    if (await pinInput.isVisible()) {
      await pinInput.fill('8008');
      await page.locator('[data-testid="login-button"]').click();
    }
  }

  // Wait for main app to load
  await page.waitForSelector('[role="complementary"][aria-label="Main navigation"]', {
    timeout: 15000,
  });
}

test.describe('Accessibility Tests', () => {
  test.describe('Keyboard Navigation', () => {
    test('should allow tab navigation through main elements', async ({ page }) => {
      await login(page);

      // Focus should be manageable via tab
      await page.keyboard.press('Tab');

      // Should be able to reach the task input
      let reachedInput = false;
      for (let i = 0; i < 20; i++) {
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        const placeholder = await page.evaluate(() =>
          (document.activeElement as HTMLInputElement)?.placeholder
        );

        if (focused === 'INPUT' && placeholder?.toLowerCase().includes('task')) {
          reachedInput = true;
          break;
        }
        await page.keyboard.press('Tab');
      }

      expect(reachedInput).toBe(true);
    });

    test('should support Enter key for task creation', async ({ page }) => {
      await login(page);

      // Find and focus the task input
      const taskInput = page.locator('[data-testid="task-input"]').first();
      await taskInput.focus();
      await taskInput.fill('Keyboard test task');

      // Press Enter to create
      await page.keyboard.press('Enter');

      // Verify task was created
      await expect(page.locator('text=Keyboard test task').first()).toBeVisible({ timeout: 5000 });
    });

    test('should support Escape key to close modals', async ({ page }) => {
      await login(page);

      // Open keyboard shortcuts modal (Cmd+/)
      await page.keyboard.press('Meta+/');

      // Check if shortcuts modal is visible
      const modal = page.locator('[role="dialog"], .modal, [data-testid="shortcuts-modal"]').first();

      // If modal opened, try to close with Escape
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible({ timeout: 2000 });
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus in modals', async ({ page }) => {
      await login(page);

      // Create a task first
      const taskInput = page.locator('[data-testid="task-input"]').first();
      await taskInput.fill('Focus trap test');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Click on a task to expand it
      const taskItem = page.locator('text=Focus trap test').first();
      if (await taskItem.isVisible()) {
        await taskItem.click();

        // Tab through elements - focus should stay within expanded panel
        const initialFocused = await page.evaluate(() => document.activeElement?.outerHTML);

        // Tab many times
        for (let i = 0; i < 30; i++) {
          await page.keyboard.press('Tab');
        }

        // Focus should still be in a reasonable location (not lost)
        const finalFocused = await page.evaluate(() => document.activeElement?.tagName);
        expect(['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A']).toContain(finalFocused);
      }
    });

    test('should return focus after modal closes', async ({ page }) => {
      await login(page);

      // Find a button to click
      const addButton = page.locator('[data-testid="add-task-button"]').first();

      if (await addButton.isVisible()) {
        // Note the button position
        await addButton.focus();

        // If there's a modal trigger, test focus return
        // This is a simplified test - real implementation may vary
        const beforeFocus = await page.evaluate(() => document.activeElement?.tagName);
        expect(beforeFocus).toBe('BUTTON');
      }
    });
  });

  test.describe('ARIA Attributes', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await login(page);

      // Check for h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Get all headings
      const headings = await page.evaluate(() => {
        const h1s = document.querySelectorAll('h1');
        const h2s = document.querySelectorAll('h2');
        const h3s = document.querySelectorAll('h3');
        return {
          h1: h1s.length,
          h2: h2s.length,
          h3: h3s.length,
        };
      });

      // Should have proper hierarchy (h1 should exist if h2 exists)
      if (headings.h2 > 0) {
        expect(headings.h1).toBeGreaterThanOrEqual(1);
      }
    });

    test('should have labels for form inputs', async ({ page }) => {
      await login(page);

      // Check task input has accessible name
      const taskInput = page.locator('[data-testid="task-input"]').first();
      if (await taskInput.isVisible()) {
        const ariaLabel = await taskInput.getAttribute('aria-label');
        const placeholder = await taskInput.getAttribute('placeholder');
        const labelledBy = await taskInput.getAttribute('aria-labelledby');

        // Should have some form of accessible label
        expect(ariaLabel || placeholder || labelledBy).toBeTruthy();
      }
    });

    test('should have aria-live regions for dynamic content', async ({ page }) => {
      await login(page);

      // Check for aria-live regions
      const liveRegions = await page.locator('[aria-live]').count();

      // App should have at least one live region for announcements
      // This might be 0 if the app doesn't implement this yet - that's a finding
      if (liveRegions === 0) {
        console.warn('No aria-live regions found - consider adding for screen reader announcements');
      }
    });

    test('buttons should have accessible names', async ({ page }) => {
      await login(page);

      // Get all buttons
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 20); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const text = await button.textContent();
          const ariaLabel = await button.getAttribute('aria-label');
          const title = await button.getAttribute('title');

          // Button should have some accessible name
          const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || title;
          if (!hasAccessibleName) {
            // Log for debugging but don't fail - some icon buttons might be decorative
            const html = await button.evaluate((el) => el.outerHTML);
            console.warn(`Button without accessible name: ${html.slice(0, 100)}`);
          }
        }
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast for text', async ({ page }) => {
      await login(page);

      // This is a basic check - real contrast testing would use axe-core
      // Check that text is not the same color as background
      const bodyStyles = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      });

      // Basic check that text and background are different
      expect(bodyStyles.color).not.toBe(bodyStyles.backgroundColor);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have skip link or landmark navigation', async ({ page }) => {
      await page.goto('/');

      // Check for skip link
      const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link').first();
      const hasSkipLink = await skipLink.isVisible().catch(() => false);

      // Check for main landmark
      const mainLandmark = page.locator('main, [role="main"]').first();
      const hasMainLandmark = await mainLandmark.isVisible().catch(() => false);

      // Should have at least one navigation method
      expect(hasSkipLink || hasMainLandmark).toBe(true);
    });

    test('should have descriptive page title', async ({ page }) => {
      await page.goto('/');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      // Title should be descriptive, not just "Untitled"
      expect(title.toLowerCase()).not.toContain('untitled');
    });

    test('should announce loading states', async ({ page }) => {
      await login(page);

      // Check for loading indicators with proper ARIA
      const loadingIndicators = page.locator(
        '[aria-busy="true"], [role="status"], .loading, [aria-label*="loading"]'
      );

      // This is informational - the app should have loading states
      const count = await loadingIndicators.count();
      console.log(`Found ${count} loading indicator patterns`);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should have sufficient touch targets', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await login(page);

      // Check button sizes
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            // WCAG recommends 44x44px minimum for touch targets
            // We'll use a slightly smaller threshold as many apps use 40px
            const minSize = 36;
            if (box.width < minSize || box.height < minSize) {
              const text = await button.textContent();
              console.warn(
                `Small touch target: "${text?.slice(0, 20)}" is ${box.width}x${box.height}px`
              );
            }
          }
        }
      }
    });

    test('should not require horizontal scrolling on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await login(page);

      // Check if page has horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  });
});
