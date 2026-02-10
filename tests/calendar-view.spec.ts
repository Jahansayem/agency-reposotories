import { test, expect, hideDevOverlay } from './helpers/test-base';
import type { Page } from '@playwright/test';

/**
 * Calendar View E2E Tests
 *
 * Tests the standalone calendar view accessible from the sidebar navigation.
 * Verifies navigation, rendering, month controls, category filters, and task display.
 *
 * Uses existing user Derrick with PIN 8008.
 */

// ─── Login helper ────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/');
  await hideDevOverlay(page);

  const userCard = page.locator('[data-testid="user-card-Derrick"]');
  await expect(userCard).toBeVisible({ timeout: 15000 });
  await userCard.click();

  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill('8008'[i]);
  }

  await page.waitForLoadState('networkidle');

  // Dismiss AI Feature Tour if it appears
  const dontShowBtn = page.locator('button').filter({ hasText: "Don't show again" });
  try {
    await expect(dontShowBtn).toBeVisible({ timeout: 5000 });
    await dontShowBtn.click();
    await page.waitForTimeout(500);
  } catch {
    // Tour didn't appear
  }

  // Dismiss any remaining modals/overlays
  for (let attempt = 0; attempt < 3; attempt++) {
    const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
    const dialog = page.locator('[role="dialog"]');
    if (await viewTasksBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await viewTasksBtn.click();
      await page.waitForTimeout(300);
    } else if (await dialog.isVisible({ timeout: 300 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      break;
    }
  }
}

// ─── Navigate to Calendar ────────────────────────────────────────────────────

async function navigateToCalendar(page: Page) {
  // Click Calendar in the sidebar
  const calendarBtn = page.locator('aside[aria-label="Main navigation"] button').filter({ hasText: 'Calendar' });
  await expect(calendarBtn).toBeVisible({ timeout: 5000 });
  await calendarBtn.click();
  await page.waitForTimeout(500);

  // Verify calendar view loaded
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible({ timeout: 10000 });
}

// ─── CALENDAR NAVIGATION ─────────────────────────────────────────────────────

test.describe('Calendar view navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. Calendar appears in sidebar and navigates to calendar view', async ({ page }) => {
    // Verify Calendar button exists in sidebar
    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    const calendarBtn = sidebar.locator('button').filter({ hasText: 'Calendar' });
    await expect(calendarBtn).toBeVisible({ timeout: 5000 });

    // Click it
    await calendarBtn.click();
    await page.waitForTimeout(500);

    // Should see the Calendar heading
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible({ timeout: 10000 });
    // Should see the subtitle
    await expect(page.getByText('View tasks by due date')).toBeVisible();
  });

  test('2. Calendar is positioned after Tasks in sidebar', async ({ page }) => {
    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    const navButtons = sidebar.locator('nav[aria-label="Primary"] button');

    // Get the text of all primary nav buttons
    const buttonTexts: string[] = [];
    const count = await navButtons.count();
    for (let i = 0; i < count; i++) {
      const text = await navButtons.nth(i).innerText();
      if (text.trim()) buttonTexts.push(text.trim());
    }

    // Tasks should come before Calendar
    const tasksIndex = buttonTexts.indexOf('Tasks');
    const calendarIndex = buttonTexts.indexOf('Calendar');
    expect(tasksIndex).toBeGreaterThanOrEqual(0);
    expect(calendarIndex).toBeGreaterThanOrEqual(0);
    expect(calendarIndex).toBe(tasksIndex + 1);
  });

  test('3. Can navigate from Calendar back to Tasks', async ({ page }) => {
    await navigateToCalendar(page);

    // Click Tasks in sidebar
    const tasksBtn = page.locator('aside[aria-label="Main navigation"] button').filter({ hasText: 'Tasks' });
    await tasksBtn.click();
    await page.waitForTimeout(500);

    // Should no longer see Calendar heading
    await expect(page.getByRole('heading', { name: 'Calendar' })).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── CALENDAR RENDERING ──────────────────────────────────────────────────────

test.describe('Calendar view rendering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCalendar(page);
  });

  test('4. Calendar displays current month name and year', async ({ page }) => {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    const year = now.getFullYear().toString();

    // Should show current month and year in the calendar header (h2)
    const calendarHeader = page.getByRole('heading', { level: 2 });
    await expect(calendarHeader).toContainText(monthName, { timeout: 5000 });
    await expect(calendarHeader).toContainText(year);
  });

  test('5. Calendar displays day-of-week headers', async ({ page }) => {
    // Should show weekday abbreviations
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of weekdays) {
      await expect(page.getByText(day, { exact: true }).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('6. Calendar displays day cells with numbers', async ({ page }) => {
    // Should have day cells. Look for "1" as a day number (every month has day 1)
    // The calendar grid should have multiple day cells
    const dayCells = page.locator('[class*="grid"] > div');
    const cellCount = await dayCells.count();
    // A month calendar grid should have at least 28 cells (4 weeks minimum)
    expect(cellCount).toBeGreaterThanOrEqual(28);
  });
});

// ─── CALENDAR MONTH NAVIGATION ───────────────────────────────────────────────

test.describe('Calendar month navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCalendar(page);
  });

  test('7. Previous month button navigates to prior month', async ({ page }) => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });

    // Find and click the previous month button (chevron left)
    const prevBtn = page.locator('button[aria-label*="previous" i], button[aria-label*="prev" i]').first();
    if (await prevBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prevBtn.click();
    } else {
      // Try clicking the left chevron button near the month name
      const chevronLeft = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
      await chevronLeft.click();
    }
    await page.waitForTimeout(500);

    // Should show a different month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const prevMonthName = prevMonth.toLocaleDateString('en-US', { month: 'long' });
    await expect(page.getByText(prevMonthName, { exact: false })).toBeVisible({ timeout: 3000 });
  });

  test('8. Next month button navigates to next month', async ({ page }) => {
    // Click next month button
    const nextBtn = page.locator('button[aria-label*="next" i]').first();
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
    } else {
      const chevronRight = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
      await chevronRight.click();
    }
    await page.waitForTimeout(500);

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long' });
    await expect(page.getByText(nextMonthName, { exact: false })).toBeVisible({ timeout: 3000 });
  });

  test('9. Can navigate forward then back to return to current month', async ({ page }) => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });

    // Use .first() to target the main header buttons (not mini calendar)
    // Go forward
    await page.locator('button[aria-label="Next month"]').first().click();
    await page.waitForTimeout(500);

    // Go back
    await page.locator('button[aria-label="Previous month"]').first().click();
    await page.waitForTimeout(500);

    // Should be back to current month in the calendar header
    const calendarHeader = page.getByRole('heading', { level: 2 });
    await expect(calendarHeader).toContainText(currentMonth, { timeout: 3000 });
  });
});

// ─── CALENDAR FILTER ─────────────────────────────────────────────────────────

test.describe('Calendar category filter', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCalendar(page);
  });

  test('10. Filter button is visible', async ({ page }) => {
    // The CalendarView has a filter button with "Filter" text
    const filterBtn = page.locator('button').filter({ hasText: 'Filter' }).first();
    await expect(filterBtn).toBeVisible({ timeout: 5000 });
  });

  test('11. Clicking filter button shows category dropdown with options', async ({ page }) => {
    const filterBtn = page.locator('button').filter({ hasText: 'Filter' }).first();
    await filterBtn.click();
    await page.waitForTimeout(300);

    // The dropdown shows "Select All" and "Clear All" quick actions
    await expect(page.getByText('Select All')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Clear All')).toBeVisible();
  });
});

// ─── CALENDAR ACTIVE STATE ───────────────────────────────────────────────────

test.describe('Calendar sidebar active state', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('12. Calendar button shows active state when calendar view is open', async ({ page }) => {
    await navigateToCalendar(page);

    // The calendar nav button should have the active styling
    const calendarBtn = page.locator('aside[aria-label="Main navigation"] button').filter({ hasText: 'Calendar' });
    await expect(calendarBtn).toHaveAttribute('aria-current', 'page');
  });

  test('13. Tasks button does not show active state when calendar is open', async ({ page }) => {
    await navigateToCalendar(page);

    const tasksBtn = page.locator('aside[aria-label="Main navigation"] button').filter({ hasText: 'Tasks' });
    // Should not have aria-current when calendar is active
    await expect(tasksBtn).not.toHaveAttribute('aria-current', 'page');
  });
});
