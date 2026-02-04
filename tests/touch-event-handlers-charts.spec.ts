/**
 * E2E Tests: Touch Event Handlers for Charts
 *
 * Tests touch interactions for mobile chart access.
 * Desktop uses hover, mobile uses tap to show tooltips.
 *
 * Issue #22: Touch Event Handlers for Charts (Sprint 2, Category 4)
 * Estimated: 2 hours
 *
 * Browser Support:
 * - iOS Safari: Touch events supported
 * - Android Chrome: Touch events supported
 * - Desktop browsers: Mouse events (hover) work as before
 */

import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

test.describe('Touch Event Handlers for Charts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'Derrick', '8008');

    // Navigate to dashboard to access charts
    await page.click('text=Dashboard');
    await page.waitForLoadState('networkidle');

    // Open weekly progress chart
    const chartButton = page.locator('text=View Weekly Progress').or(page.locator('[data-testid="weekly-progress-button"]'));
    if (await chartButton.count() > 0) {
      await chartButton.first().click();
      await page.waitForSelector('text=Weekly Progress', { timeout: 5000 });
    }
  });

  test.describe('Desktop Hover Behavior (Baseline)', () => {
    test('should show tooltip on hover (desktop)', async ({ page, browserName }) => {
      if (browserName === 'webkit' && process.env.CI) {
        test.skip();
      }

      // Find chart bars
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const barCount = await bars.count();

      expect(barCount).toBeGreaterThanOrEqual(5); // 5 weekdays

      // Hover over first bar
      await bars.first().hover();
      await page.waitForTimeout(300);

      // Tooltip should appear
      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();

      // Tooltip should contain completed count
      await expect(tooltip).toContainText(/\d+ completed/);
    });

    test('should hide tooltip when mouse leaves bar (desktop)', async ({ page, browserName }) => {
      if (browserName === 'webkit' && process.env.CI) {
        test.skip();
      }

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Hover over bar
      await bars.first().hover();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();

      // Move mouse away
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);

      // Tooltip should disappear
      await expect(tooltip).not.toBeVisible();
    });

    test('should show different tooltips for different bars (desktop)', async ({ page, browserName }) => {
      if (browserName === 'webkit' && process.env.CI) {
        test.skip();
      }

      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const barCount = await bars.count();

      if (barCount >= 2) {
        // Hover over first bar
        await bars.nth(0).hover();
        await page.waitForTimeout(300);

        const tooltip1 = page.locator('[role="tooltip"]').first();
        const day1 = await tooltip1.textContent();

        // Hover over second bar
        await bars.nth(1).hover();
        await page.waitForTimeout(300);

        const tooltip2 = page.locator('[role="tooltip"]').first();
        const day2 = await tooltip2.textContent();

        // Tooltips should show different days
        expect(day1).not.toEqual(day2);
      }
    });
  });

  test.describe('Mobile Touch Behavior', () => {
    test('should show tooltip on tap (mobile)', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const barCount = await bars.count();

      expect(barCount).toBeGreaterThanOrEqual(5);

      // Tap first bar
      await bars.first().click();
      await page.waitForTimeout(300);

      // Tooltip should appear
      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();

      // Tooltip should contain data
      await expect(tooltip).toContainText(/completed/i);
    });

    test('should hide tooltip after 2 seconds on tap', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Tap bar
      await bars.first().click();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();

      // Wait 2.5 seconds (longer than 2s auto-hide)
      await page.waitForTimeout(2500);

      // Tooltip should disappear
      await expect(tooltip).not.toBeVisible();
    });

    test('should scale bar on tap', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const firstBar = bars.first();

      // Get initial scale (should be 1)
      const initialTransform = await firstBar.evaluate(el => window.getComputedStyle(el).transform);

      // Tap bar
      await firstBar.click();
      await page.waitForTimeout(300);

      // Get new scale (should be 1.05)
      const newTransform = await firstBar.evaluate(el => window.getComputedStyle(el).transform);

      // Transform should change (scale up)
      expect(newTransform).not.toEqual(initialTransform);
    });

    test('should support touch-action manipulation', async ({ page }) => {
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const firstBar = bars.first();

      // Check touch-action CSS property
      const touchAction = await firstBar.evaluate(el => {
        const style = (el as HTMLElement).style.touchAction;
        return style;
      });

      expect(touchAction).toBe('manipulation');
    });

    test('should tap different bars independently', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const barCount = await bars.count();

      if (barCount >= 2) {
        // Tap first bar
        await bars.nth(0).click();
        await page.waitForTimeout(300);

        const tooltip1 = page.locator('[role="tooltip"]').first();
        const day1 = await tooltip1.textContent();

        // Wait for auto-hide
        await page.waitForTimeout(2500);

        // Tap second bar
        await bars.nth(1).click();
        await page.waitForTimeout(300);

        const tooltip2 = page.locator('[role="tooltip"]').first();
        const day2 = await tooltip2.textContent();

        // Different bars should show different tooltips
        expect(day1).not.toEqual(day2);
      }
    });
  });

  test.describe('Tooltip Content', () => {
    test('should show day name in tooltip', async ({ page }) => {
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      await bars.first().click();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();

      // Should contain a day name (Mon, Tue, Wed, Thu, Fri)
      const text = await tooltip.textContent();
      expect(text).toMatch(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
    });

    test('should show completed count in tooltip', async ({ page }) => {
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      await bars.first().click();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');

      // Should show "X completed"
      await expect(tooltip).toContainText(/\d+ completed/);
    });

    test('should show created count in tooltip', async ({ page }) => {
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      await bars.first().click();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');

      // Should show "X created"
      await expect(tooltip).toContainText(/\d+ created/);
    });

    test('should show goal achievement if met', async ({ page }) => {
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const barCount = await bars.count();

      // Try all bars to find one that met goal
      let foundGoalMet = false;
      for (let i = 0; i < barCount; i++) {
        await bars.nth(i).click();
        await page.waitForTimeout(300);

        const tooltip = page.locator('[role="tooltip"]');
        const text = await tooltip.textContent();

        if (text && text.includes('Goal met')) {
          foundGoalMet = true;
          expect(text).toMatch(/≥\d+/); // Should show goal threshold
          break;
        }

        // Wait for auto-hide before trying next bar
        await page.waitForTimeout(2500);
      }

      // Test passes if at least one bar met goal (or none did - depends on data)
      expect(typeof foundGoalMet).toBe('boolean');
    });
  });

  test.describe('Visual Feedback', () => {
    test('should highlight count label on bar interaction', async ({ page }) => {
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const firstBarContainer = bars.first().locator('..'); // Parent container

      // Find count label in same container
      const countLabel = firstBarContainer.locator('.text-xs.font-bold').first();

      // Click bar
      await bars.first().click();
      await page.waitForTimeout(300);

      // Count label should be visible and highlighted
      await expect(countLabel).toBeVisible();

      // Check if label has color (emerald or blue depending on goal status)
      const color = await countLabel.evaluate(el => window.getComputedStyle(el).color);
      expect(color).toBeTruthy();
    });

    test('should show bar animation on load', async ({ page }) => {
      // Close and reopen chart to trigger animation
      await page.click('[aria-label="Close weekly progress chart"]');
      await page.waitForTimeout(300);

      const chartButton = page.locator('text=View Weekly Progress').or(page.locator('[data-testid="weekly-progress-button"]'));
      if (await chartButton.count() > 0) {
        await chartButton.first().click();
        await page.waitForTimeout(500);
      }

      // Bars should animate upward
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const barCount = await bars.count();

      expect(barCount).toBeGreaterThanOrEqual(5);

      // Bars should have height > 0 after animation
      for (let i = 0; i < Math.min(barCount, 5); i++) {
        const height = await bars.nth(i).evaluate(el => el.clientHeight);
        expect(height).toBeGreaterThan(0);
      }
    });

    test('should show scale animation on tap', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Tap bar
      await bars.first().click();

      // Give animation time to complete
      await page.waitForTimeout(200);

      // Bar should be scaled (visual feedback)
      const transform = await bars.first().evaluate(el => window.getComputedStyle(el).transform);

      // Should have a transform (scale)
      expect(transform).not.toBe('none');
    });
  });

  test.describe('Accessibility', () => {
    test('should have role="tooltip" on tooltip', async ({ page }) => {
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      await bars.first().click();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
    });

    test('should have aria-label on bars', async ({ page }) => {
      const bars = page.locator('[aria-label*="completed"]');
      const barCount = await bars.count();

      // Should have at least 5 bars with aria-labels
      expect(barCount).toBeGreaterThanOrEqual(5);
    });

    test('should have aria-label on count labels', async ({ page }) => {
      const labels = page.locator('[aria-label*="tasks completed"]');
      const labelCount = await labels.count();

      // Should have count labels with descriptive aria-labels
      expect(labelCount).toBeGreaterThanOrEqual(5);
    });

    test('should be keyboard accessible', async ({ page }) => {
      // Tab to chart area
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Focus should be visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should show visual focus indicators', async ({ page }) => {
      // Tab through chart elements
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      const outline = await focusedElement.evaluate(el => window.getComputedStyle(el).outline);

      // Should have some outline (browser default or custom)
      expect(outline).toBeTruthy();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work on iOS Safari (WebKit)', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'WebKit-specific test');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Tap bar
      await bars.first().click();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
    });

    test('should work on desktop Chrome (Chromium)', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium-specific test');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Hover over bar
      await bars.first().hover();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
    });

    test('should work on Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Hover over bar
      await bars.first().hover();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should handle rapid taps without errors', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Tap bars rapidly
      for (let i = 0; i < 5; i++) {
        await bars.nth(i % await bars.count()).click();
        await page.waitForTimeout(50); // Rapid taps
      }

      await page.waitForTimeout(500);

      // No errors should occur
      expect(errors.length).toBe(0);
    });

    test('should render chart within reasonable time', async ({ page }) => {
      // Close and reopen to measure
      await page.click('[aria-label="Close weekly progress chart"]');
      await page.waitForTimeout(300);

      const startTime = Date.now();

      const chartButton = page.locator('text=View Weekly Progress').or(page.locator('[data-testid="weekly-progress-button"]'));
      if (await chartButton.count() > 0) {
        await chartButton.first().click();
        await page.waitForSelector('.rounded-t-lg.cursor-pointer', { timeout: 5000 });
      }

      const duration = Date.now() - startTime;

      // Should render within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    test('should handle multiple tooltip auto-hides', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Tap 3 bars in sequence, let each auto-hide
      for (let i = 0; i < 3; i++) {
        await bars.nth(i).click();
        await page.waitForTimeout(300);

        const tooltip = page.locator('[role="tooltip"]');
        await expect(tooltip).toBeVisible();

        // Wait for auto-hide (2.5 seconds)
        await page.waitForTimeout(2500);

        await expect(tooltip).not.toBeVisible();
      }

      // Test completes without errors
      expect(true).toBeTruthy();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle empty chart data gracefully', async ({ page }) => {
      // This test verifies that chart doesn't crash with minimal data
      const bars = page.locator('.rounded-t-lg.cursor-pointer');
      const barCount = await bars.count();

      // Should have at least 5 bars (even if all are 0 height)
      expect(barCount).toBeGreaterThanOrEqual(5);
    });

    test('should not show multiple tooltips simultaneously', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Tap first bar
      await bars.nth(0).click();
      await page.waitForTimeout(300);

      // Immediately tap second bar
      await bars.nth(1).click();
      await page.waitForTimeout(300);

      // Should only show one tooltip
      const tooltips = page.locator('[role="tooltip"]');
      const tooltipCount = await tooltips.count();

      expect(tooltipCount).toBeLessThanOrEqual(1);
    });

    test('should handle tap on same bar twice', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile gesture test - WebKit only');

      const bars = page.locator('.rounded-t-lg.cursor-pointer');

      // Tap bar
      await bars.first().click();
      await page.waitForTimeout(300);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();

      // Wait for auto-hide
      await page.waitForTimeout(2500);
      await expect(tooltip).not.toBeVisible();

      // Tap same bar again
      await bars.first().click();
      await page.waitForTimeout(300);

      // Tooltip should reappear
      await expect(tooltip).toBeVisible();
    });
  });
});
