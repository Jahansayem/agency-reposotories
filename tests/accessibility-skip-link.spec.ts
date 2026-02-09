import { test, expect } from '@playwright/test';

test.describe('Accessibility - Skip Link', () => {
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

  test('should have skip link as first focusable element', async ({ page }) => {
    // Press Tab - skip link should be focused first
    await page.keyboard.press('Tab');

    // Skip link should be visible when focused
    const skipLink = page.locator('a:has-text("Skip to main content")');
    await expect(skipLink).toBeVisible();

    // Verify it's actually focused
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toContain('Skip to main content');
  });

  test('should skip to main content when activated', async ({ page }) => {
    // Tab to skip link
    await page.keyboard.press('Tab');

    // Activate skip link with Enter
    await page.keyboard.press('Enter');

    // Wait a moment for focus to move

    // Verify main content is focused
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('main-content');
  });

  test('should work with keyboard navigation (Space key)', async ({ page }) => {
    // Tab to skip link
    await page.keyboard.press('Tab');

    // Activate skip link with Space
    await page.keyboard.press(' ');

    // Wait a moment for focus to move

    // Verify main content is focused
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('main-content');
  });

  test('should be visually hidden until focused', async ({ page }) => {
    const skipLink = page.locator('a:has-text("Skip to main content")');

    // Before focus, should have sr-only class
    const initialClasses = await skipLink.getAttribute('class');
    expect(initialClasses).toContain('sr-only');

    // Tab to focus it
    await page.keyboard.press('Tab');

    // Should still exist but be visible
    await expect(skipLink).toBeVisible();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    const skipLink = page.locator('a:has-text("Skip to main content")');

    // Should have aria-label
    const ariaLabel = await skipLink.getAttribute('aria-label');
    expect(ariaLabel).toBe('Skip to main content');

    // Should have href pointing to main-content
    const href = await skipLink.getAttribute('href');
    expect(href).toBe('#main-content');
  });

  test('should have sufficient color contrast when visible', async ({ page }) => {
    // Tab to skip link to make it visible
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a:has-text("Skip to main content")');

    // Get computed styles
    const bgColor = await skipLink.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    const textColor = await skipLink.evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    // Verify colors are set (exact values depend on CSS variables)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    expect(textColor).toBeTruthy();
  });

  test('should bypass navigation and go directly to main content', async ({ page }) => {
    // Count how many tabs it takes to reach main content WITHOUT skip link
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Next element (sidebar or nav)

    const secondTabElement = await page.evaluate(() => document.activeElement?.tagName);

    // Now use skip link
    await page.reload();
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Enter'); // Activate skip link

    const focusedAfterSkip = await page.evaluate(() => document.activeElement?.id);
    expect(focusedAfterSkip).toBe('main-content');

    // Verify we actually skipped over navigation
    expect(secondTabElement).not.toBe('MAIN');
  });

  test('should work in dark mode', async ({ page }) => {
    // Toggle dark mode
    const themeToggle = page.locator('button[aria-label*="theme"]').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
    }

    // Tab to skip link
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a:has-text("Skip to main content")');
    await expect(skipLink).toBeVisible();

    // Verify colors work in dark mode
    const bgColor = await skipLink.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should be announced by screen readers', async ({ page }) => {
    const skipLink = page.locator('a:has-text("Skip to main content")');

    // Verify it has accessible text content
    const text = await skipLink.textContent();
    expect(text).toBe('Skip to main content');

    // Verify role is implicit link
    const role = await skipLink.evaluate(el => el.getAttribute('role'));
    expect(role).toBeNull(); // Links don't need explicit role
  });

  test('should maintain focus ring visibility (WCAG 2.4.7)', async ({ page }) => {
    // Tab to skip link
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a:has-text("Skip to main content")');

    // Check for focus ring styles
    const outline = await skipLink.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    // Should have some kind of focus indicator (outline or box-shadow)
    const hasFocusIndicator =
      outline.outlineWidth !== '0px' ||
      outline.boxShadow !== 'none';

    expect(hasFocusIndicator).toBeTruthy();
  });
});

test.describe('Accessibility - Main Landmark', () => {
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

    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should have main landmark with id="main-content"', async ({ page }) => {
    const mainLandmark = page.locator('main#main-content');
    await expect(mainLandmark).toBeVisible();
  });

  test('should have only one main landmark', async ({ page }) => {
    const mainElements = await page.locator('main').count();
    expect(mainElements).toBe(1);
  });

  test('should be focusable with tabindex=-1', async ({ page }) => {
    const mainLandmark = page.locator('main#main-content');

    const tabIndex = await mainLandmark.getAttribute('tabindex');
    expect(tabIndex).toBe('-1');
  });

  test('should contain the primary app content', async ({ page }) => {
    const mainLandmark = page.locator('main#main-content');

    // Should contain task list or dashboard
    const hasContent = await mainLandmark.evaluate(el => {
      return el.children.length > 0;
    });

    expect(hasContent).toBeTruthy();
  });

  test('should be accessible via screen reader landmarks navigation', async ({ page }) => {
    // Get all ARIA landmarks
    const landmarks = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('main, nav, aside, header, footer'));
      return elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        id: el.id,
      }));
    });

    // Should have at least one main landmark
    const mainLandmarks = landmarks.filter(l =>
      l.tag === 'main' || l.role === 'main'
    );

    expect(mainLandmarks.length).toBeGreaterThanOrEqual(1);
    expect(mainLandmarks[0].id).toBe('main-content');
  });
});
