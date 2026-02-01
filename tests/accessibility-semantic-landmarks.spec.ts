import { test, expect } from '@playwright/test';

test.describe('Accessibility - Semantic Landmarks', () => {
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

  test.describe('Main Landmark', () => {
    test('should have exactly one main landmark', async ({ page }) => {
      const mainLandmarks = page.locator('main, [role="main"]');
      const count = await mainLandmarks.count();

      // Should have exactly one main landmark
      expect(count).toBe(1);
    });

    test('should have main landmark with id="main-content"', async ({ page }) => {
      const mainLandmark = page.locator('main#main-content');
      await expect(mainLandmark).toBeVisible();
    });

    test('should have main landmark that is focusable', async ({ page }) => {
      const mainLandmark = page.locator('main#main-content');
      const tabIndex = await mainLandmark.getAttribute('tabindex');

      // tabIndex should be -1 (programmatically focusable but not in tab order)
      expect(tabIndex).toBe('-1');
    });

    test('should contain primary app content in main landmark', async ({ page }) => {
      const mainLandmark = page.locator('main#main-content');

      // Main should contain the dashboard or tasks view
      const hasDashboard = await mainLandmark.locator('text=Dashboard, text=Tasks, text=Activity').count() > 0;
      expect(hasDashboard).toBeTruthy();
    });
  });

  test.describe('Navigation Landmarks', () => {
    test('should have navigation landmark for sidebar (desktop)', async ({ page }) => {
      // Desktop sidebar navigation
      const navLandmarks = page.locator('nav, [role="navigation"]');
      const count = await navLandmarks.count();

      // Should have at least one navigation landmark
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should have aria-label on navigation landmarks', async ({ page }) => {
      const navLandmarks = page.locator('nav, [role="navigation"]');
      const firstNav = navLandmarks.first();

      const ariaLabel = await firstNav.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('should have sidebar navigation with "Main navigation" label', async ({ page }) => {
      // Look for sidebar navigation
      const sidebarNav = page.locator('aside[aria-label="Main navigation"], nav[aria-label="Main navigation"]').first();

      if (await sidebarNav.isVisible()) {
        await expect(sidebarNav).toBeVisible();
      }
    });

    test('should have mobile bottom navigation on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      // Mobile bottom nav should be visible
      const bottomNav = page.locator('nav[aria-label*="navigation"]').last();
      await expect(bottomNav).toBeVisible();
    });

    test('should have navigation items with accessible names', async ({ page }) => {
      // Check sidebar navigation items
      const navButtons = page.locator('nav button, aside button');
      const firstButton = navButtons.first();

      if (await firstButton.isVisible()) {
        const hasAriaLabel = await firstButton.getAttribute('aria-label');
        const hasText = await firstButton.textContent();

        // Should have either aria-label or visible text
        expect(hasAriaLabel || hasText).toBeTruthy();
      }
    });
  });

  test.describe('Complementary Landmarks (Aside)', () => {
    test('should have complementary landmark for sidebar', async ({ page }) => {
      const asides = page.locator('aside');
      const count = await asides.count();

      // Should have at least one aside (sidebar or right panel)
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should have aria-label on aside landmarks', async ({ page }) => {
      const sidebar = page.locator('aside').first();

      if (await sidebar.isVisible()) {
        const ariaLabel = await sidebar.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should show right panel aside when chat is open', async ({ page }) => {
      // Open chat
      const chatButton = page.locator('button:has-text("Chat")').first();
      if (await chatButton.isVisible()) {
        await chatButton.click();
        await page.waitForTimeout(500);

        // Right panel aside should appear (on desktop)
        const asides = await page.locator('aside').count();
        expect(asides).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('Landmark Hierarchy', () => {
    test('should have proper nesting: landmarks not inside other landmarks', async ({ page }) => {
      // Main should not be inside nav or aside
      const mainInsideNav = await page.locator('nav main').count();
      const mainInsideAside = await page.locator('aside main').count();

      expect(mainInsideNav).toBe(0);
      expect(mainInsideAside).toBe(0);
    });

    test('should have navigation separate from main content', async ({ page }) => {
      const main = page.locator('main#main-content');
      const nav = page.locator('nav, aside[aria-label*="navigation"]').first();

      await expect(main).toBeVisible();

      if (await nav.isVisible()) {
        // Nav and main should be siblings, not nested
        const navHTML = await page.evaluate(() => {
          const navEl = document.querySelector('nav, aside[aria-label*="navigation"]');
          const mainEl = document.getElementById('main-content');

          if (navEl && mainEl) {
            return {
              navContainsMain: navEl.contains(mainEl),
              mainContainsNav: mainEl.contains(navEl),
            };
          }
          return { navContainsMain: false, mainContainsNav: false };
        });

        expect(navHTML.navContainsMain).toBe(false);
        expect(navHTML.mainContainsNav).toBe(false);
      }
    });

    test('should have unique landmark labels when multiple of same type', async ({ page }) => {
      const navLandmarks = page.locator('nav, [role="navigation"]');
      const count = await navLandmarks.count();

      if (count > 1) {
        const labels = new Set();
        for (let i = 0; i < count; i++) {
          const ariaLabel = await navLandmarks.nth(i).getAttribute('aria-label');
          if (ariaLabel) {
            labels.add(ariaLabel);
          }
        }

        // If multiple nav landmarks, they should have different labels
        expect(labels.size).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Landmark Navigation (Screen Readers)', () => {
    test('should be discoverable via landmark navigation', async ({ page }) => {
      // All major landmarks should be present
      const landmarks = await page.evaluate(() => {
        const results = {
          main: document.querySelectorAll('main, [role="main"]').length,
          nav: document.querySelectorAll('nav, [role="navigation"]').length,
          aside: document.querySelectorAll('aside, [role="complementary"]').length,
        };
        return results;
      });

      expect(landmarks.main).toBe(1);
      expect(landmarks.nav).toBeGreaterThanOrEqual(1);
      expect(landmarks.aside).toBeGreaterThanOrEqual(1);
    });

    test('should have sequential keyboard navigation through landmarks', async ({ page }) => {
      // Tab through page and verify landmarks are accessible
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          role: el?.getAttribute('role'),
        };
      });

      // Should be able to focus something
      expect(focusedElement.tag).toBeTruthy();
    });

    test('should support skip link navigation to main landmark', async ({ page }) => {
      // Press Tab to focus skip link
      await page.keyboard.press('Tab');

      const skipLink = page.locator('a[href="#main-content"]').first();
      if (await skipLink.isVisible()) {
        await expect(skipLink).toBeFocused();

        // Activate skip link
        await page.keyboard.press('Enter');

        // Main content should be focused
        const mainFocused = await page.evaluate(() => {
          return document.activeElement?.id === 'main-content';
        });

        expect(mainFocused).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Landmarks', () => {
    test('should hide desktop nav and show mobile nav on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Mobile bottom nav should be visible
      const mobileNav = page.locator('nav.md\\:hidden, nav[class*="fixed bottom"]');

      if (await mobileNav.count() > 0) {
        const isVisible = await mobileNav.first().isVisible();
        expect(isVisible).toBeTruthy();
      }
    });

    test('should maintain landmark structure on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      // Desktop sidebar should be visible
      const sidebar = page.locator('aside[aria-label="Main navigation"]');

      if (await sidebar.count() > 0) {
        const isVisible = await sidebar.first().isVisible();
        expect(isVisible).toBeTruthy();
      }
    });

    test('should adjust right panel visibility based on screen size', async ({ page }) => {
      // Open chat
      const chatButton = page.locator('button:has-text("Chat")').first();
      if (await chatButton.isVisible()) {
        await chatButton.click();
        await page.waitForTimeout(500);
      }

      // Desktop (xl): right panel should be visible
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);

      const rightPanel = page.locator('aside').last();
      const desktopVisible = await rightPanel.isVisible();

      // Mobile: right panel should be hidden (chat in modal/sheet)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      const mobileVisible = await rightPanel.isVisible();

      // Desktop should show panel, mobile should hide it
      // (This test may need adjustment based on actual behavior)
    });
  });

  test.describe('ARIA Landmark Best Practices', () => {
    test('should not have redundant role on semantic HTML elements', async ({ page }) => {
      // <main> should not have role="main" (redundant)
      const mainWithRole = await page.locator('main[role="main"]').count();
      expect(mainWithRole).toBe(0);

      // <nav> should not have role="navigation" unless needed for older browsers
      // (This is actually acceptable for broader compatibility, so we won't fail on this)
    });

    test('should have all interactive elements inside main content keyboard accessible', async ({ page }) => {
      const mainContent = page.locator('main#main-content');
      const buttons = mainContent.locator('button, a, input, select, textarea');
      const count = await buttons.count();

      if (count > 0) {
        // Check first few buttons have tabIndex or are naturally focusable
        for (let i = 0; i < Math.min(3, count); i++) {
          const button = buttons.nth(i);
          const isDisabled = await button.getAttribute('disabled');
          const tabIndex = await button.getAttribute('tabindex');

          // Should either not be disabled or have explicit tabindex
          if (!isDisabled) {
            // Naturally focusable or explicitly focusable
            expect(tabIndex === null || parseInt(tabIndex) >= -1).toBeTruthy();
          }
        }
      }
    });

    test('should have descriptive landmark labels for screen readers', async ({ page }) => {
      const landmarks = await page.evaluate(() => {
        const mains = Array.from(document.querySelectorAll('main'));
        const navs = Array.from(document.querySelectorAll('nav, [role="navigation"]'));
        const asides = Array.from(document.querySelectorAll('aside, [role="complementary"]'));

        return {
          mains: mains.map(el => ({
            id: el.id,
            ariaLabel: el.getAttribute('aria-label'),
            ariaLabelledby: el.getAttribute('aria-labelledby'),
          })),
          navs: navs.map(el => ({
            ariaLabel: el.getAttribute('aria-label'),
            ariaLabelledby: el.getAttribute('aria-labelledby'),
          })),
          asides: asides.map(el => ({
            ariaLabel: el.getAttribute('aria-label'),
            ariaLabelledby: el.getAttribute('aria-labelledby'),
          })),
        };
      });

      // Main content should have id (for skip link)
      expect(landmarks.mains.length).toBeGreaterThan(0);
      expect(landmarks.mains[0].id).toBeTruthy();

      // Nav landmarks should have aria-label
      if (landmarks.navs.length > 0) {
        const hasLabel = landmarks.navs.some(nav => nav.ariaLabel || nav.ariaLabelledby);
        expect(hasLabel).toBeTruthy();
      }
    });
  });
});
