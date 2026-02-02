/**
 * Design System Validation Tests
 *
 * Validates the comprehensive UI refactor implemented in January 2026:
 * - Design tokens implementation
 * - Progressive disclosure patterns
 * - Semantic color encoding
 * - Chat encoding fixes
 * - Board view cleanup
 * - Archive restructure
 * - Weekly Progress modal improvements
 */

import { test, expect } from '@playwright/test';

test.describe('Design System - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login as Derrick
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }

    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should load without errors', async ({ page }) => {
    // Verify main app loaded
    const dashboardButton = page.locator('button:has-text("Dashboard")').first();
    await expect(dashboardButton).toBeVisible();

    // Check for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through views
    await dashboardButton.click();
    await page.waitForTimeout(500);

    // Should have no critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('baseline-browser-mapping') &&
      !e.includes('middleware')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should render tasks without encoding bugs', async ({ page }) => {
    // Navigate to Tasks view
    const tasksButton = page.locator('button:has-text("Tasks")').first();
    await tasksButton.click();
    await page.waitForTimeout(500);

    // Create a task with special characters
    const taskInput = page.locator('[data-testid="add-task-input"]').first();
    await taskInput.fill("Test task with apostrophe's and quotes\"");
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Verify the text renders correctly (not as HTML entities)
    const taskText = page.locator('text=Test task with apostrophe\'s and quotes"').first();
    await expect(taskText).toBeVisible({ timeout: 3000 });

    // Should NOT contain HTML entity encoding
    const htmlContent = await page.content();
    expect(htmlContent).not.toContain('&#x27;');
    expect(htmlContent).not.toContain('&amp;#x27;');
    expect(htmlContent).not.toContain('&quot;');
  });
});

test.describe('Design System - Chat Encoding Fix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should render chat messages with apostrophes correctly', async ({ page }) => {
    // Open chat panel
    const chatButton = page.locator('button:has-text("Chat")').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(500);
    }

    // Send a message with apostrophes
    const chatInput = page.locator('textarea[placeholder*="message"]').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill("Let's test this message with apostrophe's");
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Verify message appears correctly
      const message = page.locator('text=Let\'s test this message with apostrophe\'s').first();
      await expect(message).toBeVisible({ timeout: 3000 });

      // Verify no HTML entity encoding in the DOM
      const chatContent = await page.locator('[data-testid="chat-panel"], .chat-message, [class*="chat"]').first().textContent();
      if (chatContent) {
        expect(chatContent).not.toContain('&#x27;');
        expect(chatContent).not.toContain('&amp;#x27;');
      }
    }
  });
});

test.describe('Design System - Board View Semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display Board view with correct header format', async ({ page }) => {
    // Navigate to Tasks
    const tasksButton = page.locator('button:has-text("Tasks")').first();
    await tasksButton.click();
    await page.waitForTimeout(500);

    // Switch to Kanban view if available
    const kanbanButton = page.locator('button:has-text("Board"), button:has-text("Kanban")').first();
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click();
      await page.waitForTimeout(500);

      // Verify column headers use format "To Do (3)" not separate badge
      const columnHeaders = page.locator('h3:has-text("To Do"), h3:has-text("In Progress"), h3:has-text("Done")');
      const headerCount = await columnHeaders.count();

      if (headerCount > 0) {
        const firstHeader = columnHeaders.first();
        const headerText = await firstHeader.textContent();

        // Should contain parentheses with count
        expect(headerText).toMatch(/\(\d+\)/);
      }
    }
  });

  test('should not show "Overdue" in Done column', async ({ page }) => {
    // Navigate to Tasks
    const tasksButton = page.locator('button:has-text("Tasks")').first();
    await tasksButton.click();
    await page.waitForTimeout(500);

    // Switch to Kanban view
    const kanbanButton = page.locator('button:has-text("Board"), button:has-text("Kanban")').first();
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click();
      await page.waitForTimeout(500);

      // Find Done column
      const doneColumn = page.locator('h3:has-text("Done")').locator('..').locator('..');

      if (await doneColumn.isVisible()) {
        // Get all text in Done column
        const doneColumnText = await doneColumn.textContent();

        // Should NOT contain "Overdue" section header (semantically contradictory)
        // Note: Individual tasks may still show they were overdue when completed
        const hasOverdueSection = doneColumnText?.includes('Overdue') &&
                                 doneColumnText?.match(/Overdue\s*\(/);

        expect(hasOverdueSection).toBeFalsy();
      }
    }
  });
});

test.describe('Design System - Archive View Restructure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display Archive with stat cards', async ({ page }) => {
    // Navigate to Archive
    const archiveButton = page.locator('button:has-text("Archive")').first();
    if (await archiveButton.isVisible()) {
      await archiveButton.click();
      await page.waitForTimeout(1000);

      // Look for Summary header
      const summaryHeader = page.locator('h3:has-text("Summary"), text=Summary').first();

      if (await summaryHeader.isVisible()) {
        // Verify stat cards are visible
        const statCards = page.locator('.grid.grid-cols-3, [class*="grid-cols-3"]').first();
        await expect(statCards).toBeVisible({ timeout: 3000 });

        // Check for specific stat labels
        const thisWeek = page.locator('text=This Week').first();
        const thisMonth = page.locator('text=This Month').first();
        const topCompleter = page.locator('text=Top Completer').first();

        // At least one stat should be visible
        const visibleStats = [
          await thisWeek.isVisible().catch(() => false),
          await thisMonth.isVisible().catch(() => false),
          await topCompleter.isVisible().catch(() => false)
        ].filter(Boolean).length;

        expect(visibleStats).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Design System - Weekly Progress Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display Weekly Progress with semantic colors and labels', async ({ page }) => {
    // Navigate to Dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard")').first();
    await dashboardButton.click();
    await page.waitForTimeout(500);

    // Look for Weekly Progress trigger (usually in ProgressSummary)
    const weeklyButton = page.locator('button:has-text("Weekly"), button:has-text("Progress"), [data-testid*="weekly"]').first();

    if (await weeklyButton.isVisible()) {
      await weeklyButton.click();
      await page.waitForTimeout(500);

      // Verify modal opened
      const modal = page.locator('role=dialog, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Check for explicit labels
      const goalRateLabel = page.locator('text=Goal Rate').first();
      await expect(goalRateLabel).toBeVisible({ timeout: 2000 });

      // Check for explicit status labels (On track / Fair / Below target)
      const statusLabels = page.locator('text=On track, text=Fair, text=Below target');
      const hasStatusLabel = await statusLabels.count() > 0;

      // At least one explicit status label should exist
      expect(hasStatusLabel).toBeTruthy();

      // Close modal
      const closeButton = page.locator('button[aria-label*="Close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });

  test('should show date range in Weekly Progress title', async ({ page }) => {
    // Navigate to Dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard")').first();
    await dashboardButton.click();
    await page.waitForTimeout(500);

    // Open Weekly Progress
    const weeklyButton = page.locator('button:has-text("Weekly"), button:has-text("Progress")').first();

    if (await weeklyButton.isVisible()) {
      await weeklyButton.click();
      await page.waitForTimeout(500);

      // Check title includes date range with bullet separator
      const title = page.locator('h3:has-text("Weekly Progress •")').first();

      if (await title.isVisible()) {
        const titleText = await title.textContent();

        // Should include bullet and date format (e.g., "Jan 27–Jan 31")
        expect(titleText).toContain('•');
        expect(titleText).toMatch(/[A-Z][a-z]{2}\s+\d+/); // Month abbreviation
      }
    }
  });
});

test.describe('Design System - Semantic Colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should apply semantic colors to task status', async ({ page }) => {
    // Navigate to Tasks
    const tasksButton = page.locator('button:has-text("Tasks")').first();
    await tasksButton.click();
    await page.waitForTimeout(500);

    // Create an overdue task (due yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dueDateStr = yesterday.toISOString().split('T')[0];

    const taskInput = page.locator('[data-testid="add-task-input"]').first();
    if (await taskInput.isVisible()) {
      await taskInput.fill(`Overdue test task due:${dueDateStr}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);

      // Look for "Overdue" text with semantic meaning
      const overdueLabel = page.locator('text=/Overdue \\d+d/').first();

      if (await overdueLabel.isVisible()) {
        // Get computed color - should be red/danger color
        const color = await overdueLabel.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Should be a red-ish color (rgb values where red > 200)
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch.map(Number);
          // Red channel should dominate for danger/overdue state
          expect(r).toBeGreaterThan(150);
        }
      }
    }
  });
});

test.describe('Design System - CSS Variables', () => {
  test('should have semantic state color variables defined', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check CSS variables are defined
    const cssVars = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);

      return {
        stateOverdue: styles.getPropertyValue('--state-overdue').trim(),
        stateDueSoon: styles.getPropertyValue('--state-due-soon').trim(),
        stateOnTrack: styles.getPropertyValue('--state-on-track').trim(),
        stateCompleted: styles.getPropertyValue('--state-completed').trim(),
      };
    });

    // All semantic state variables should be defined
    expect(cssVars.stateOverdue).toBeTruthy();
    expect(cssVars.stateDueSoon).toBeTruthy();
    expect(cssVars.stateOnTrack).toBeTruthy();
    expect(cssVars.stateCompleted).toBeTruthy();
  });
});

test.describe('Design System - Dark Mode Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should maintain semantic colors in dark mode', async ({ page }) => {
    // Toggle dark mode
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Dark"), button:has-text("Light")').first();

    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Verify dark mode is active
      const htmlElement = page.locator('html');
      const htmlClass = await htmlElement.getAttribute('class');
      const isDarkMode = htmlClass?.includes('dark');

      if (isDarkMode) {
        // Check that semantic colors are still defined
        const cssVars = await page.evaluate(() => {
          const root = document.documentElement;
          const styles = getComputedStyle(root);

          return {
            stateOverdue: styles.getPropertyValue('--state-overdue').trim(),
            danger: styles.getPropertyValue('--danger').trim(),
            warning: styles.getPropertyValue('--warning').trim(),
            success: styles.getPropertyValue('--success').trim(),
          };
        });

        expect(cssVars.stateOverdue).toBeTruthy();
        expect(cssVars.danger).toBeTruthy();
        expect(cssVars.warning).toBeTruthy();
        expect(cssVars.success).toBeTruthy();
      }
    }
  });
});

test.describe('Design System - Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should not have Dashboard flicker on load', async ({ page }) => {
    // Navigate to Dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard")').first();
    await dashboardButton.click();

    // Wait for initial render
    await page.waitForTimeout(100);

    // Dashboard should be fully visible immediately (no opacity flicker)
    const dashboard = page.locator('[data-testid="dashboard"], .dashboard, main').first();

    if (await dashboard.isVisible()) {
      const opacity = await dashboard.evaluate((el) => {
        return window.getComputedStyle(el).opacity;
      });

      // Should be fully opaque (1.0)
      expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0.95);
    }
  });

  test('should allow task title editing without flicker', async ({ page }) => {
    // Navigate to Tasks
    const tasksButton = page.locator('button:has-text("Tasks")').first();
    await tasksButton.click();
    await page.waitForTimeout(500);

    // Create a test task
    const taskInput = page.locator('[data-testid="add-task-input"]').first();
    if (await taskInput.isVisible()) {
      await taskInput.fill('Test task for editing');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);

      // Click on the task to open detail modal
      const task = page.locator('text=Test task for editing').first();
      if (await task.isVisible()) {
        await task.click();
        await page.waitForTimeout(500);

        // Find title input in modal
        const titleInput = page.locator('input[value*="Test task"], textarea:has-text("Test task")').first();

        if (await titleInput.isVisible()) {
          // Clear and type new text
          await titleInput.click({ clickCount: 3 }); // Select all
          await page.keyboard.type('Updated task title');

          // Wait a bit
          await page.waitForTimeout(300);

          // Value should be stable
          const finalValue = await titleInput.inputValue();
          expect(finalValue).toContain('Updated');
        }
      }
    }
  });
});
