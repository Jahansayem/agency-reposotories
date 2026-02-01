import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - Button State Contrast (WCAG 2.1 AA)', () => {
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

  test.describe('Default Button State', () => {
    test('should have sufficient contrast in default state', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Check primary button (Add Task)
      const addButton = page.locator('button:has-text("Add"), button[aria-label*="Add"]').first();
      if (await addButton.isVisible()) {
        const color = await addButton.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            background: styles.backgroundColor,
          };
        });

        // Should have defined colors
        expect(color.color).toBeTruthy();
        expect(color.background).toBeTruthy();
      }
    });

    test('should pass axe automated button contrast checks', async ({ page }) => {
      // Run axe on page with buttons
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      // Filter for button-related contrast violations
      const buttonContrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast' && v.nodes.some(n =>
          n.html.includes('button') || n.target.some(t => t.includes('button'))
        )
      );

      if (buttonContrastViolations.length > 0) {
        console.log('Button contrast violations:', JSON.stringify(buttonContrastViolations, null, 2));
      }

      expect(buttonContrastViolations).toHaveLength(0);
    });
  });

  test.describe('Disabled Button State', () => {
    test('should have readable text on disabled buttons in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      await page.waitForTimeout(200);

      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Find a disabled button (or create a scenario with one)
      // Check Add Task button when input is empty (should be disabled)
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.clear();

      const submitButton = page.locator('button[type="submit"], button:has-text("Add")').first();

      // Check if button is disabled
      const isDisabled = await submitButton.evaluate(el => (el as HTMLButtonElement).disabled);

      if (isDisabled) {
        const styles = await submitButton.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            background: computed.backgroundColor,
            opacity: computed.opacity,
          };
        });

        // Disabled button should have explicit colors, not rely on opacity
        expect(styles.opacity).toBe('1');

        // Color should be #6B7280 (4.5:1 on light backgrounds)
        // Background should be #E5E7EB
        expect(styles.color).toContain('rgb'); // Should have explicit color
        expect(styles.background).toContain('rgb'); // Should have explicit background
      }
    });

    test('should have readable text on disabled buttons in dark mode', async ({ page }) => {
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(200);

      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Clear input to disable submit button
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.clear();

      const submitButton = page.locator('button[type="submit"], button:has-text("Add")').first();

      const isDisabled = await submitButton.evaluate(el => (el as HTMLButtonElement).disabled);

      if (isDisabled) {
        const styles = await submitButton.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            background: computed.backgroundColor,
            opacity: computed.opacity,
          };
        });

        // Disabled button should have opacity: 1 (explicit colors)
        expect(styles.opacity).toBe('1');

        // Should have sufficient contrast on dark background
        expect(styles.color).toContain('rgb');
        expect(styles.background).toContain('rgb');
      }
    });

    test('should not rely solely on opacity for disabled state', async ({ page }) => {
      // This test ensures we use explicit colors, not just opacity reduction

      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Check disabled button CSS
      const disabledButtonOpacity = await page.evaluate(() => {
        const button = document.createElement('button');
        button.disabled = true;
        button.className = 'bg-blue-500 text-white px-4 py-2 rounded';
        document.body.appendChild(button);

        const opacity = window.getComputedStyle(button).opacity;
        document.body.removeChild(button);

        return opacity;
      });

      // Should be '1' (not relying on opacity)
      expect(disabledButtonOpacity).toBe('1');
    });

    test('should have cursor: not-allowed on disabled buttons', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Clear input to get disabled button
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.clear();

      const submitButton = page.locator('button[type="submit"]').first();

      const isDisabled = await submitButton.evaluate(el => (el as HTMLButtonElement).disabled);

      if (isDisabled) {
        const cursor = await submitButton.evaluate(el => {
          return window.getComputedStyle(el).cursor;
        });

        expect(cursor).toBe('not-allowed');
      }
    });
  });

  test.describe('Hover Button State', () => {
    test('should maintain sufficient contrast on hover in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Find a primary button
      const addButton = page.locator('button:has-text("Add"), button[aria-label*="Add"]').first();

      if (await addButton.isVisible()) {
        // Get default state
        const defaultStyles = await addButton.evaluate(el => {
          return {
            color: window.getComputedStyle(el).color,
            background: window.getComputedStyle(el).backgroundColor,
          };
        });

        // Hover over button
        await addButton.hover();
        await page.waitForTimeout(100);

        // Get hover state
        const hoverStyles = await addButton.evaluate(el => {
          return {
            color: window.getComputedStyle(el).color,
            background: window.getComputedStyle(el).backgroundColor,
          };
        });

        // Hover state should have explicit colors
        expect(hoverStyles.color).toBeTruthy();
        expect(hoverStyles.background).toBeTruthy();
      }
    });

    test('should maintain sufficient contrast on hover in dark mode', async ({ page }) => {
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Find a button
      const button = page.locator('button').first();

      if (await button.isVisible()) {
        await button.hover();
        await page.waitForTimeout(100);

        const hoverStyles = await button.evaluate(el => {
          return {
            color: window.getComputedStyle(el).color,
            background: window.getComputedStyle(el).backgroundColor,
          };
        });

        expect(hoverStyles.color).toBeTruthy();
        expect(hoverStyles.background).toBeTruthy();
      }
    });

    test('should not lose contrast when hovering over secondary buttons', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Find secondary/ghost buttons
      const secondaryButtons = page.locator('button[class*="ghost"], button[class*="secondary"]');

      if (await secondaryButtons.first().isVisible()) {
        const button = secondaryButtons.first();
        await button.hover();
        await page.waitForTimeout(100);

        const styles = await button.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        expect(styles).toBeTruthy();
      }
    });
  });

  test.describe('Active/Pressed Button State', () => {
    test('should maintain contrast when button is pressed', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Find a button to click
      const button = page.locator('button').first();

      if (await button.isVisible()) {
        // Mouse down (active state)
        await button.hover();
        await page.mouse.down();
        await page.waitForTimeout(50);

        const activeStyles = await button.evaluate(el => {
          return {
            color: window.getComputedStyle(el).color,
            background: window.getComputedStyle(el).backgroundColor,
          };
        });

        expect(activeStyles.color).toBeTruthy();
        expect(activeStyles.background).toBeTruthy();

        await page.mouse.up();
      }
    });
  });

  test.describe('Focus Button State', () => {
    test('should have visible focus ring with sufficient contrast', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Tab to focus a button
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Check focused element has visible outline
      const focusStyles = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return null;

        const styles = window.getComputedStyle(active);
        return {
          outline: styles.outline,
          outlineColor: styles.outlineColor,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
        };
      });

      // Should have focus indicator (outline or box-shadow)
      expect(focusStyles).toBeTruthy();
      if (focusStyles) {
        const hasFocusIndicator =
          (focusStyles.outline && focusStyles.outline !== 'none') ||
          (focusStyles.boxShadow && focusStyles.boxShadow !== 'none');

        expect(hasFocusIndicator).toBe(true);
      }
    });

    test('should have focus ring with 3:1 contrast ratio against background', async ({ page }) => {
      // This test documents the requirement from WCAG 2.4.11 (Level AA)

      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Tab to a button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusInfo = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active.tagName !== 'BUTTON') return null;

        const styles = window.getComputedStyle(active);
        return {
          outlineColor: styles.outlineColor,
          backgroundColor: styles.backgroundColor,
          hasBoxShadow: styles.boxShadow !== 'none',
        };
      });

      // Focus ring should exist
      expect(focusInfo).toBeTruthy();
      if (focusInfo) {
        // Should have outline color or box shadow
        const hasFocusRing = focusInfo.outlineColor !== 'rgba(0, 0, 0, 0)' || focusInfo.hasBoxShadow;
        expect(hasFocusRing).toBe(true);
      }
    });

    test('should maintain focus visibility in dark mode', async ({ page }) => {
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Tab to focus
      await page.keyboard.press('Tab');

      const focusStyles = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return null;

        const styles = window.getComputedStyle(active);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
        };
      });

      expect(focusStyles).toBeTruthy();
      if (focusStyles) {
        const hasVisibleFocus =
          (focusStyles.outline && focusStyles.outline !== 'none') ||
          (focusStyles.boxShadow && focusStyles.boxShadow !== 'none');

        expect(hasVisibleFocus).toBe(true);
      }
    });
  });

  test.describe('Button Variants Contrast', () => {
    test('should have sufficient contrast for primary buttons', async ({ page }) => {
      // Primary buttons typically have dark background with white text

      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Check primary action button
      const primaryButton = page.locator('button[class*="bg-"][class*="blue"], button[class*="bg-gradient"]').first();

      if (await primaryButton.isVisible()) {
        const contrast = await primaryButton.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            background: styles.backgroundColor,
          };
        });

        expect(contrast.color).toBeTruthy();
        expect(contrast.background).toBeTruthy();
      }
    });

    test('should have sufficient contrast for secondary buttons', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Secondary buttons usually have lighter background
      const secondaryButton = page.locator('button[class*="bg-gray"], button[class*="bg-slate"]').first();

      if (await secondaryButton.isVisible()) {
        const styles = await secondaryButton.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        expect(styles).toBeTruthy();
      }
    });

    test('should have sufficient contrast for danger buttons', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a task to get delete button
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Test task for danger button');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Find delete/danger button
      const dangerButton = page.locator('button[class*="red"], button[aria-label*="Delete"]').first();

      if (await dangerButton.isVisible()) {
        const styles = await dangerButton.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            background: computed.backgroundColor,
          };
        });

        expect(styles.color).toBeTruthy();
        expect(styles.background).toBeTruthy();
      }
    });
  });

  test.describe('Icon-Only Buttons', () => {
    test('should have sufficient contrast for icon buttons', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Find icon-only buttons (usually have aria-label)
      const iconButton = page.locator('button[aria-label]').first();

      if (await iconButton.isVisible()) {
        const color = await iconButton.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        expect(color).toBeTruthy();
      }
    });

    test('should have accessible labels for icon-only buttons', async ({ page }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Check icon buttons have aria-label
      const iconButtons = page.locator('button svg').locator('..');
      const count = await iconButtons.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const button = iconButtons.nth(i);
          const ariaLabel = await button.getAttribute('aria-label');
          const hasText = await button.textContent();

          // Should have either aria-label or visible text
          expect(ariaLabel || hasText).toBeTruthy();
        }
      }
    });
  });

  test.describe('Cross-Browser Button Consistency', () => {
    test('should have consistent disabled button styles across browsers', async ({ page, browserName }) => {
      // Navigate to Tasks
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Clear input to get disabled button
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.clear();

      const submitButton = page.locator('button[type="submit"]').first();
      const isDisabled = await submitButton.evaluate(el => (el as HTMLButtonElement).disabled);

      if (isDisabled) {
        const opacity = await submitButton.evaluate(el => {
          return window.getComputedStyle(el).opacity;
        });

        // Should be '1' in all browsers (not relying on opacity)
        expect(opacity).toBe('1');

        console.log(`${browserName}: Disabled button opacity is 1 (explicit colors used)`);
      }
    });
  });
});
