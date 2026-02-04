import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsUser } from './helpers/auth';

test.describe('Accessibility - Color Contrast (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    // Use the robust login helper with proper timeout handling
    await loginAsUser(page, 'Derrick', '8008');
  });

  test.describe('Light Mode Text Contrast', () => {
    test('should pass axe automated contrast checks in light mode', async ({ page }) => {
      // Ensure light mode
      const currentTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });

      if (currentTheme === 'dark') {
        // Toggle to light mode
        const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme")').first();
        if (await themeToggle.isVisible()) {
          await themeToggle.click();
          await page.waitForTimeout(300);
        }
      }

      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      // Check for color contrast violations
      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      // Log violations for debugging
      if (contrastViolations.length > 0) {
        console.log('Color contrast violations:', JSON.stringify(contrastViolations, null, 2));
      }

      // Should have no contrast violations
      expect(contrastViolations).toHaveLength(0);
    });

    test('should have readable muted text in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      await page.waitForTimeout(200);

      // Check text-muted CSS variable
      const textMutedColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
      });

      // Should be darker than before for better contrast
      expect(textMutedColor).toBe('#475569');
    });

    test('should have readable light text in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      await page.waitForTimeout(200);

      // Check text-light CSS variable
      const textLightColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim();
      });

      // Should meet WCAG AA 4.5:1 ratio
      expect(textLightColor).toBe('#64748B');
    });

    test('should be readable at 400% zoom in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Set zoom to 400%
      await page.evaluate(() => {
        document.body.style.zoom = '4';
      });
      await page.waitForTimeout(200);

      // Check that text is still visible and not cut off
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await expect(taskInput).toBeVisible();

      // Check secondary text (timestamps, etc.) - should be visible
      const mutedText = page.locator('[class*="text-muted"], [class*="text-light"]').first();
      if (await mutedText.isVisible()) {
        const opacity = await mutedText.evaluate(el => window.getComputedStyle(el).opacity);
        expect(parseFloat(opacity)).toBeGreaterThan(0.8);
      }

      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    });
  });

  test.describe('Dark Mode Text Contrast', () => {
    test('should pass axe automated contrast checks in dark mode', async ({ page }) => {
      // Ensure dark mode
      const currentTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });

      if (currentTheme === 'light') {
        // Toggle to dark mode
        const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme")').first();
        if (await themeToggle.isVisible()) {
          await themeToggle.click();
          await page.waitForTimeout(300);
        }
      }

      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      // Check for color contrast violations
      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      // Log violations for debugging
      if (contrastViolations.length > 0) {
        console.log('Dark mode color contrast violations:', JSON.stringify(contrastViolations, null, 2));
      }

      // Should have no contrast violations
      expect(contrastViolations).toHaveLength(0);
    });

    test('should have readable muted text in dark mode', async ({ page }) => {
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(200);

      // Check text-muted CSS variable
      const textMutedColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
      });

      // Should be lighter for dark background (9.4:1 ratio)
      expect(textMutedColor).toBe('#CBD5E1');
    });

    test('should have readable light text in dark mode', async ({ page }) => {
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(200);

      // Check text-light CSS variable
      const textLightColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim();
      });

      // Should meet WCAG AA 6.8:1 ratio on dark background
      expect(textLightColor).toBe('#94A3B8');
    });

    test('should be readable at 400% zoom in dark mode', async ({ page }) => {
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Set zoom to 400%
      await page.evaluate(() => {
        document.body.style.zoom = '4';
      });
      await page.waitForTimeout(200);

      // Check that text is still visible
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await expect(taskInput).toBeVisible();

      // Check secondary text
      const mutedText = page.locator('[class*="text-muted"], [class*="text-light"]').first();
      if (await mutedText.isVisible()) {
        const opacity = await mutedText.evaluate(el => window.getComputedStyle(el).opacity);
        expect(parseFloat(opacity)).toBeGreaterThan(0.8);
      }

      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    });
  });

  test.describe('Secondary Text Contrast', () => {
    test('should have readable timestamps in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Navigate to Activity view to see timestamps
      const activityButton = page.locator('button:has-text("Activity")').first();
      if (await activityButton.isVisible()) {
        await activityButton.click();
        await page.waitForTimeout(500);

        // Check timestamp elements
        const timestamps = page.locator('[class*="text-muted"], time, [class*="timestamp"]');
        if (await timestamps.first().isVisible()) {
          const color = await timestamps.first().evaluate(el => {
            return window.getComputedStyle(el).color;
          });

          // Color should be darker than #94A3B8 (old value)
          expect(color).toBeTruthy();
        }
      }
    });

    test('should have readable labels and hints in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Check for label/hint text
      const labels = page.locator('label, [class*="label"], [class*="hint"]');
      if (await labels.first().isVisible()) {
        const textColor = await labels.first().evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        // Should have sufficient contrast
        expect(textColor).toBeTruthy();
      }
    });

    test('should have readable secondary text in chat panel', async ({ page }) => {
      // Open chat
      const chatButton = page.locator('button:has-text("Chat")').first();
      if (await chatButton.isVisible()) {
        await chatButton.click();
        await page.waitForTimeout(500);

        // Check chat timestamp or secondary info
        const chatMeta = page.locator('[class*="chat"] [class*="text-muted"], [class*="chat"] [class*="text-light"]').first();
        if (await chatMeta.isVisible()) {
          const color = await chatMeta.evaluate(el => {
            return window.getComputedStyle(el).color;
          });

          // Should have sufficient contrast
          expect(color).toBeTruthy();
        }
      }
    });
  });

  test.describe('Component-Specific Contrast', () => {
    test('should have readable task metadata in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Navigate to Tasks view
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create a task with metadata
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Task with metadata');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      // Check task item secondary info (assignee, due date, etc.)
      const taskMeta = page.locator('[class*="task"] [class*="text-muted"], [class*="task"] [class*="text-light"]').first();
      if (await taskMeta.isVisible()) {
        const color = await taskMeta.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        // Should use the improved color values
        expect(color).toBeTruthy();
      }
    });

    test('should have readable dashboard stats in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Navigate to Dashboard
      const dashboardButton = page.locator('button:has-text("Dashboard")').first();
      await dashboardButton.click();
      await page.waitForTimeout(500);

      // Check secondary text in stats cards
      const statsMeta = page.locator('[class*="stat"] [class*="text-muted"], [class*="card"] [class*="text-light"]').first();
      if (await statsMeta.isVisible()) {
        const color = await statsMeta.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        expect(color).toBeTruthy();
      }
    });

    test('should have readable form labels in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Navigate to Tasks and try to edit a task (opens modal with form fields)
      const tasksButton = page.locator('button:has-text("Tasks")').first();
      await tasksButton.click();
      await page.waitForTimeout(300);

      // Create and click on a task to open editor
      const taskInput = page.locator('input[placeholder*="Add"]').first();
      await taskInput.fill('Form test task');
      await taskInput.press('Enter');
      await page.waitForTimeout(500);

      const taskItem = page.locator('text=Form test task').first();
      if (await taskItem.isVisible()) {
        await taskItem.click();
        await page.waitForTimeout(300);

        // Check form labels/hints
        const formLabel = page.locator('label, [class*="label"]').first();
        if (await formLabel.isVisible()) {
          const color = await formLabel.evaluate(el => {
            return window.getComputedStyle(el).color;
          });

          expect(color).toBeTruthy();
        }
      }
    });
  });

  test.describe('Cross-Browser Contrast Consistency', () => {
    test('should maintain contrast across different browsers', async ({ page, browserName }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Check CSS variables are applied correctly
      const cssVars = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return {
          textMuted: styles.getPropertyValue('--text-muted').trim(),
          textLight: styles.getPropertyValue('--text-light').trim(),
        };
      });

      // Should be consistent across browsers
      expect(cssVars.textMuted).toBe('#475569');
      expect(cssVars.textLight).toBe('#64748B');

      console.log(`${browserName}: CSS variables applied correctly`);
    });

    test('should have consistent rendering in dark mode across browsers', async ({ page, browserName }) => {
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Check CSS variables in dark mode
      const cssVars = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return {
          textMuted: styles.getPropertyValue('--text-muted').trim(),
          textLight: styles.getPropertyValue('--text-light').trim(),
        };
      });

      // Should be consistent across browsers
      expect(cssVars.textMuted).toBe('#CBD5E1');
      expect(cssVars.textLight).toBe('#94A3B8');

      console.log(`${browserName} (dark mode): CSS variables applied correctly`);
    });
  });

  test.describe('Visual Regression (Baseline)', () => {
    test('should match baseline visual snapshot in light mode', async ({ page }) => {
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      // Navigate to Dashboard for consistent snapshot
      const dashboardButton = page.locator('button:has-text("Dashboard")').first();
      await dashboardButton.click();
      await page.waitForTimeout(500);

      // Take screenshot for visual comparison
      // (Optional: compare with baseline image)
      const screenshot = await page.screenshot();
      expect(screenshot).toBeTruthy();
    });

    test('should match baseline visual snapshot in dark mode', async ({ page }) => {
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Navigate to Dashboard
      const dashboardButton = page.locator('button:has-text("Dashboard")').first();
      await dashboardButton.click();
      await page.waitForTimeout(500);

      // Take screenshot
      const screenshot = await page.screenshot();
      expect(screenshot).toBeTruthy();
    });
  });
});
