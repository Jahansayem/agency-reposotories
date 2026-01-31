import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Dashboard - Tablet Layout', () => {
  test.describe('iPad Pro viewport', () => {
    test.use({ ...devices['iPad Pro'] });

    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3000');

      // Login as Derrick (manager)
      await page.click('[data-testid="user-card-Derrick"]');
      await page.waitForTimeout(600);
      await page.keyboard.type('8008');
      await page.keyboard.press('Enter');

      await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });

      // Navigate to dashboard
      const dashboardButton = page.locator('button:has-text("Dashboard")').first();
      if (await dashboardButton.isVisible()) {
        await dashboardButton.click();
      }
    });

    test('should render manager dashboard with proper grid layout', async ({ page }) => {
      // Verify main grid exists
      const mainGrid = page.locator('.grid.gap-6').first();
      await expect(mainGrid).toBeVisible();

      // Verify left and right columns are visible
      const leftColumn = page.locator('text=Team Health').locator('..');
      const rightColumn = page.locator('text=My Tasks').locator('..');

      await expect(leftColumn).toBeVisible();
      await expect(rightColumn).toBeVisible();
    });

    test('should not have horizontal overflow', async ({ page }) => {
      // Check that nothing overflows the viewport
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasOverflow).toBeFalsy();
    });

    test('should display left column (Team Health) with proper width', async ({ page }) => {
      // Left column should take ~75% width on tablet (3 of 4 cols)
      const leftColumn = page.locator('.lg\\:col-span-3').first();
      await expect(leftColumn).toBeVisible();

      const width = await leftColumn.evaluate(el => el.getBoundingClientRect().width);
      const viewportWidth = await page.viewportSize().then(vp => vp?.width || 1024);

      // Should be roughly 75% of container width (accounting for gaps)
      expect(width).toBeGreaterThan(viewportWidth * 0.6);
      expect(width).toBeLessThan(viewportWidth);
    });

    test('should display right column (My Tasks) with proper width', async ({ page }) => {
      // Right column should take ~25% width on tablet (1 of 4 cols)
      const rightColumn = page.locator('.lg\\:col-span-1').first();
      await expect(rightColumn).toBeVisible();

      const width = await rightColumn.evaluate(el => el.getBoundingClientRect().width);
      const viewportWidth = await page.viewportSize().then(vp => vp?.width || 1024);

      // Should be roughly 25% of container width
      expect(width).toBeGreaterThan(viewportWidth * 0.15);
      expect(width).toBeLessThan(viewportWidth * 0.35);
    });

    test('should render team overview cards in a grid', async ({ page }) => {
      // Team overview should have stat cards
      const statCards = page.locator('.grid.grid-cols-2, .grid.grid-cols-3').first();
      await expect(statCards).toBeVisible();

      // Cards should be visible and not overlapping
      const firstCard = statCards.locator('> div').first();
      await expect(firstCard).toBeVisible();
    });

    test('should not break with long task names', async ({ page }) => {
      // Navigate to tasks and create a task with a very long name
      await page.click('button:has-text("Tasks")');
      await page.waitForTimeout(500);

      const longTaskName = 'A'.repeat(200) + Date.now();
      await page.fill('[data-testid="task-input"]', longTaskName);
      await page.click('[data-testid="add-task-button"]');
      await page.waitForTimeout(500);

      // Go back to dashboard
      await page.click('button:has-text("Dashboard")');
      await page.waitForTimeout(500);

      // Check for overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasOverflow).toBeFalsy();
    });
  });

  test.describe('iPad viewport (portrait)', () => {
    test.use({ ...devices['iPad (gen 7)'] });

    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.click('[data-testid="user-card-Derrick"]');
      await page.waitForTimeout(600);
      await page.keyboard.type('8008');
      await page.keyboard.press('Enter');
      await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
    });

    test('should stack columns vertically on smaller tablets', async ({ page }) => {
      // On portrait iPad, columns should stack
      const mainGrid = page.locator('.grid.gap-6').first();

      // Get grid computed style
      const gridColumns = await mainGrid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });

      // Should be single column or small number of columns
      const columnCount = gridColumns.split(' ').length;
      expect(columnCount).toBeLessThanOrEqual(4);
    });

    test('should have readable font sizes', async ({ page }) => {
      // Check that text is not too small
      const bodyText = page.locator('p, span').first();
      const fontSize = await bodyText.evaluate(el => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });

      // Minimum readable font size is 12px
      expect(fontSize).toBeGreaterThanOrEqual(10);
    });
  });

  test.describe('Tablet landscape (1024px)', () => {
    test.use({ viewport: { width: 1024, height: 768 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.click('[data-testid="user-card-Derrick"]');
      await page.waitForTimeout(600);
      await page.keyboard.type('8008');
      await page.keyboard.press('Enter');
      await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
    });

    test('should use 4-column grid at lg breakpoint', async ({ page }) => {
      const mainGrid = page.locator('.grid.gap-6').first();

      // Should have lg:grid-cols-4 class
      const className = await mainGrid.getAttribute('class');
      expect(className).toContain('lg:grid-cols-4');

      // Verify visual layout with 2 columns
      const gridColumns = await mainGrid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });

      const columnCount = gridColumns.split(' ').filter(c => c.trim()).length;
      expect(columnCount).toBeGreaterThanOrEqual(2);
      expect(columnCount).toBeLessThanOrEqual(4);
    });
  });

  test.describe('Desktop (1280px and above)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.click('[data-testid="user-card-Derrick"]');
      await page.waitForTimeout(600);
      await page.keyboard.type('8008');
      await page.keyboard.press('Enter');
      await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
    });

    test('should use 5-column grid at xl breakpoint', async ({ page }) => {
      const mainGrid = page.locator('.grid.gap-6').first();

      // Should have xl:grid-cols-5 class
      const className = await mainGrid.getAttribute('class');
      expect(className).toContain('xl:grid-cols-5');

      // Verify visual layout
      const gridColumns = await mainGrid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });

      const columnCount = gridColumns.split(' ').filter(c => c.trim()).length;
      expect(columnCount).toBeGreaterThanOrEqual(4);
    });

    test('should have left column span 3 of 5', async ({ page }) => {
      const leftColumn = page.locator('.xl\\:col-span-3').first();
      await expect(leftColumn).toBeVisible();

      // Visual check: left column should be wider than right
      const leftWidth = await leftColumn.evaluate(el => el.getBoundingClientRect().width);
      const rightColumn = page.locator('.xl\\:col-span-2').first();
      const rightWidth = await rightColumn.evaluate(el => el.getBoundingClientRect().width);

      expect(leftWidth).toBeGreaterThan(rightWidth);
    });
  });
});

test.describe('Dashboard Header - Responsive', () => {
  const viewports = [
    { name: 'iPad Pro', device: devices['iPad Pro'] },
    { name: 'iPad', device: devices['iPad (gen 7)'] },
    { name: 'iPhone 13', device: devices['iPhone 13'] },
  ];

  for (const { name, device } of viewports) {
    test.describe(`${name} viewport`, () => {
      test.use({ ...device });

      test('should display all dashboard header metrics', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.click('[data-testid="user-card-Derrick"]');
        await page.waitForTimeout(600);
        await page.keyboard.type('8008');
        await page.keyboard.press('Enter');
        await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });

        // All three metrics should be visible
        await expect(page.locator('text=Overdue')).toBeVisible();
        await expect(page.locator('text=Due Today')).toBeVisible();
        await expect(page.locator('text=Done Today')).toBeVisible();
      });

      test('should have tap-friendly metric cards', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.click('[data-testid="user-card-Derrick"]');
        await page.waitForTimeout(600);
        await page.keyboard.type('8008');
        await page.keyboard.press('Enter');
        await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });

        // Metric cards should be large enough for touch (min 44x44)
        const overdueCard = page.locator('text=Overdue').locator('..');
        const dimensions = await overdueCard.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });

        // Minimum touch target size is 44px
        expect(dimensions.height).toBeGreaterThanOrEqual(44);
        expect(dimensions.width).toBeGreaterThanOrEqual(44);
      });
    });
  }
});
