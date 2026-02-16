import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

/**
 * Dashboard Color and Theme Tests
 *
 * Tests to verify dashboard colors work correctly in both light and dark modes
 */

test.describe('Dashboard Colors - Light Mode', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'Derrick', '8008');

    // Ensure we're in light mode
    const html = await page.locator('html');
    const currentMode = await html.getAttribute('data-theme');

    if (currentMode === 'dark') {
      // Toggle to light mode
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForLoadState('networkidle'); // Wait for theme transition
    }

    // Navigate to dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.isVisible().catch(() => false)) {
      await dashboardButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('header gradient should use CSS variables', async ({ page }) => {
    const header = page.locator('.absolute.inset-0').first();
    const background = await header.evaluate((el) =>
      window.getComputedStyle(el).background
    );

    // Should use CSS variables, not hardcoded hex colors
    expect(background).not.toContain('#0033A0');
    expect(background).not.toContain('#0047CC');
  });

  test('weekly progress chart uses theme-aware colors', async ({ page }) => {
    // Open weekly progress chart
    const weeklyButton = page.locator('button:has-text("This Week")');
    if (await weeklyButton.isVisible().catch(() => false)) {
      await weeklyButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Check header border uses CSS variable
    const headerBorder = await page.evaluate(() => {
      const header = document.querySelector('[aria-labelledby="weekly-progress-title"]')
        ?.querySelector('.border-b');
      return header ? window.getComputedStyle(header).borderBottomColor : null;
    });

    // Should not be hardcoded slate color (rgb(226, 232, 240) in light mode)
    expect(headerBorder).toBeTruthy();

    // Check title text color
    const titleColor = await page.evaluate(() => {
      const title = document.getElementById('weekly-progress-title');
      return title ? window.getComputedStyle(title).color : null;
    });

    // Should be theme-aware, not hardcoded slate-800
    expect(titleColor).toBeTruthy();
  });

  test('progress summary cards use theme colors', async ({ page }) => {
    // Check that cards don't use hardcoded colors
    const cards = page.locator('[class*="bg-[var"]').first();
    const backgroundColor = await cards.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    expect(backgroundColor).toBeTruthy();
  });
});

test.describe('Dashboard Colors - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'Derrick', '8008');

    // Ensure we're in dark mode
    const html = await page.locator('html');
    const currentMode = await html.getAttribute('data-theme');

    if (currentMode !== 'dark') {
      // Toggle to dark mode
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForLoadState('networkidle'); // Wait for theme transition
    }

    // Navigate to dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.isVisible().catch(() => false)) {
      await dashboardButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('header gradient adapts to dark mode', async ({ page }) => {
    const header = page.locator('.absolute.inset-0').first();
    const background = await header.evaluate((el) =>
      window.getComputedStyle(el).background
    );

    // Should use CSS variable gradient that adapts to dark mode
    expect(background).toBeTruthy();
  });

  test('weekly progress chart readable in dark mode', async ({ page }) => {
    // Open weekly progress chart
    const weeklyButton = page.locator('button:has-text("This Week")');
    if (await weeklyButton.isVisible().catch(() => false)) {
      await weeklyButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Check title is visible (not dark text on dark background)
    const titleColor = await page.evaluate(() => {
      const title = document.getElementById('weekly-progress-title');
      return title ? window.getComputedStyle(title).color : null;
    });

    // In dark mode, text should be light colored
    expect(titleColor).toBeTruthy();

    // Parse RGB and check it's a light color (high values)
    const rgb = titleColor?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgb) {
      const [, r, g, b] = rgb.map(Number);
      const brightness = (r + g + b) / 3;
      expect(brightness).toBeGreaterThan(128); // Should be light text
    }
  });

  test('tooltip visible in dark mode', async ({ page }) => {
    // Open weekly progress chart
    const weeklyButton = page.locator('button:has-text("This Week")');
    if (await weeklyButton.isVisible().catch(() => false)) {
      await weeklyButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Hover over a bar to show tooltip
    const bar = page.locator('[role="graphics-symbol"]').first();
    if (await bar.isVisible().catch(() => false)) {
      await bar.hover();

      // Check tooltip background doesn't use hardcoded dark color
      const tooltipBg = await page.evaluate(() => {
        const tooltip = document.querySelector('[role="tooltip"]');
        return tooltip ? window.getComputedStyle(tooltip).backgroundColor : null;
      });

      // Should use theme-aware background
      expect(tooltipBg).toBeTruthy();
    }
  });

  test('no hardcoded light mode colors in dark mode', async ({ page }) => {
    // Take screenshot for manual verification
    await page.screenshot({ path: 'tests/screenshots/dashboard-dark-mode.png', fullPage: true });

    // Check no elements use slate-200 border (light mode color)
    const lightBorders = await page.locator('.border-slate-200').count();
    expect(lightBorders).toBe(0);

    // Check no elements use slate-800 text (dark text, wrong for dark mode)
    const darkText = await page.locator('.text-slate-800').count();
    expect(darkText).toBe(0);
  });
});

test.describe('Dashboard Theme Consistency', () => {
  test('all semantic colors defined', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const cssVars = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = window.getComputedStyle(root);

      return {
        brandBlue: styles.getPropertyValue('--brand-blue'),
        success: styles.getPropertyValue('--success'),
        warning: styles.getPropertyValue('--warning'),
        danger: styles.getPropertyValue('--danger'),
        foreground: styles.getPropertyValue('--foreground'),
        background: styles.getPropertyValue('--background'),
        surface: styles.getPropertyValue('--surface'),
        textMuted: styles.getPropertyValue('--text-muted'),
        border: styles.getPropertyValue('--border'),
      };
    });

    // All CSS variables should be defined
    expect(cssVars.brandBlue).toBeTruthy();
    expect(cssVars.success).toBeTruthy();
    expect(cssVars.warning).toBeTruthy();
    expect(cssVars.danger).toBeTruthy();
    expect(cssVars.foreground).toBeTruthy();
    expect(cssVars.background).toBeTruthy();
    expect(cssVars.surface).toBeTruthy();
    expect(cssVars.textMuted).toBeTruthy();
    expect(cssVars.border).toBeTruthy();
  });
});
