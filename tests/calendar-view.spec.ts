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

// ─── Viewport helper ────────────────────────────────────────────────────────

/** Returns true when the viewport is below the lg breakpoint (< 1024px) */
async function isMobileViewport(page: Page): Promise<boolean> {
  return page.evaluate(() => window.innerWidth < 1024);
}

// ─── Login helper ────────────────────────────────────────────────────────────

async function login(page: Page) {
  // Pre-dismiss the AI Feature Tour via localStorage so it never appears
  await page.addInitScript(() => {
    localStorage.setItem('ai_onboarding_state', JSON.stringify({
      currentStep: 0,
      completedSteps: [0, 1, 2, 3, 4, 5],
      dismissed: true,
      lastShown: new Date().toISOString(),
    }));
  });

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

  // Wait for the actual app shell to load (sidebar on desktop, bottom nav on mobile)
  // Use Promise.race because .first() always picks the hidden <aside> on mobile viewports
  await Promise.race([
    page.locator('aside[aria-label="Main navigation"]').waitFor({ state: 'visible', timeout: 20000 }),
    page.locator('nav[aria-label="Main navigation"]').waitFor({ state: 'visible', timeout: 20000 }),
  ]);

  // Let React finish hydration, data fetching, and initial render
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Safety net: dismiss any remaining dialogs (AI Feature Tour, etc.)
  // WebKit may not honor addInitScript localStorage, so we must handle the tour here
  for (let attempt = 0; attempt < 5; attempt++) {
    const skipTourBtn = page.locator('button[aria-label="Skip tour"]');
    const dontShowBtn = page.locator('button').filter({ hasText: "Don't show again" });
    const closeBtn = page.locator('button[aria-label="Close"]');
    const dialog = page.locator('[role="dialog"]');

    if (await skipTourBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await skipTourBtn.click({ force: true });
      await page.waitForTimeout(300);
    } else if (await dontShowBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await dontShowBtn.click({ force: true });
      await page.waitForTimeout(300);
    } else if (await closeBtn.first().isVisible({ timeout: 300 }).catch(() => false)) {
      await closeBtn.first().click({ force: true });
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

async function clickCalendarButton(page: Page) {
  const mobile = await isMobileViewport(page);

  if (mobile) {
    // Hide the floating chat button that overlaps the bottom nav "More" tab
    await page.locator('button[aria-label="Open chat"]').evaluate(
      (el) => (el as HTMLElement).style.display = 'none'
    ).catch(() => {});

    const moreBtn = page.locator('nav[aria-label="Main navigation"] button').filter({ hasText: 'More' });
    await expect(moreBtn).toBeVisible({ timeout: 5000 });
    await moreBtn.click();
    await page.waitForTimeout(1000);

    // The More menu sheet has a "Navigation" heading — scope to it to avoid matching "View Full Calendar" etc.
    const calendarItem = page.locator('button').filter({ hasText: /^📅\s*Calendar$/ }).or(
      page.locator('h2:text("Navigation")').locator('..').locator('button').filter({ hasText: 'Calendar' })
    );
    await expect(calendarItem.first()).toBeVisible({ timeout: 5000 });
    await calendarItem.first().click();
  } else {
    const calendarBtn = page.locator('aside[aria-label="Main navigation"] button').filter({ hasText: 'Calendar' });
    await expect(calendarBtn).toBeVisible({ timeout: 5000 });
    await calendarBtn.click();
  }
}

async function navigateToCalendar(page: Page) {
  const calendarHeading = page.getByRole('heading', { name: 'Calendar' });

  // Try clicking Calendar — retry once if the view doesn't switch
  for (let attempt = 0; attempt < 2; attempt++) {
    await clickCalendarButton(page);
    await page.waitForTimeout(500);

    // Check if Calendar heading appeared
    const visible = await calendarHeading.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) return;

    // If not visible after first attempt, wait and retry
    await page.waitForTimeout(1000);
  }

  // Final assertion with a clear error message
  await expect(calendarHeading).toBeVisible({ timeout: 10000 });
}

// ─── Switch to Month View ───────────────────────────────────────────────────

async function switchToMonthView(page: Page) {
  const monthTab = page.locator('[role="tablist"][aria-label="Calendar view"] button').filter({ hasText: 'Month' });
  await expect(monthTab).toBeVisible({ timeout: 5000 });
  await monthTab.click();
  await page.waitForTimeout(500);
}

// ─── CALENDAR NAVIGATION ─────────────────────────────────────────────────────

test.describe('Calendar view navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. Calendar appears in navigation and opens calendar view', async ({ page }) => {
    await navigateToCalendar(page);

    // Should see the Calendar heading and subtitle
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('View tasks by due date')).toBeVisible();
  });

  test('2. Calendar is positioned after Tasks in sidebar', async ({ page }) => {
    const mobile = await isMobileViewport(page);
    test.skip(mobile, 'Sidebar ordering only applies to desktop viewports');

    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    const navButtons = sidebar.locator('nav[aria-label="Primary"] button');

    const buttonTexts: string[] = [];
    const count = await navButtons.count();
    for (let i = 0; i < count; i++) {
      const text = await navButtons.nth(i).innerText();
      if (text.trim()) buttonTexts.push(text.trim());
    }

    const tasksIndex = buttonTexts.indexOf('Tasks');
    const calendarIndex = buttonTexts.indexOf('Calendar');
    expect(tasksIndex).toBeGreaterThanOrEqual(0);
    expect(calendarIndex).toBeGreaterThanOrEqual(0);
    expect(calendarIndex).toBe(tasksIndex + 1);
  });

  test('3. Can navigate from Calendar back to Tasks', async ({ page }) => {
    await navigateToCalendar(page);

    const mobile = await isMobileViewport(page);

    if (mobile) {
      const tasksTab = page.locator('nav[aria-label="Main navigation"] button').filter({ hasText: 'Tasks' });
      await tasksTab.click();
    } else {
      const tasksBtn = page.locator('aside[aria-label="Main navigation"] button').filter({ hasText: 'Tasks' });
      await tasksBtn.click();
    }
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Calendar' })).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── CALENDAR RENDERING ──────────────────────────────────────────────────────

test.describe('Calendar view rendering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCalendar(page);
    await switchToMonthView(page);
  });

  test('4. Calendar displays current month name and year', async ({ page }) => {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    const year = now.getFullYear().toString();

    const calendarHeader = page.locator('[role="navigation"][aria-label="Calendar navigation"] h2');
    await expect(calendarHeader).toContainText(monthName, { timeout: 5000 });
    await expect(calendarHeader).toContainText(year);
  });

  test('5. Calendar displays day-of-week headers', async ({ page }) => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of weekdays) {
      await expect(page.getByText(day, { exact: true }).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('6. Calendar displays day cells with numbers', async ({ page }) => {
    const dayCells = page.locator('[role="grid"] [role="row"] > div');
    const cellCount = await dayCells.count();
    expect(cellCount).toBeGreaterThanOrEqual(28);
  });
});

// ─── CALENDAR MONTH NAVIGATION ───────────────────────────────────────────────

test.describe('Calendar month navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToCalendar(page);
    await switchToMonthView(page);
  });

  test('7. Previous month button navigates to prior month', async ({ page }) => {
    const prevBtn = page.locator('button[aria-label="Previous month"]').first();
    await expect(prevBtn).toBeVisible({ timeout: 3000 });
    await prevBtn.click();
    await page.waitForTimeout(500);

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const prevMonthName = prevMonth.toLocaleDateString('en-US', { month: 'long' });
    const calendarHeader = page.locator('[role="navigation"][aria-label="Calendar navigation"] h2');
    await expect(calendarHeader).toContainText(prevMonthName, { timeout: 3000 });
  });

  test('8. Next month button navigates to next month', async ({ page }) => {
    const nextBtn = page.locator('button[aria-label="Next month"]').first();
    await expect(nextBtn).toBeVisible({ timeout: 3000 });
    await nextBtn.click();
    await page.waitForTimeout(500);

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long' });
    const calendarHeader = page.locator('[role="navigation"][aria-label="Calendar navigation"] h2');
    await expect(calendarHeader).toContainText(nextMonthName, { timeout: 3000 });
  });

  test('9. Can navigate forward then back to return to current month', async ({ page }) => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });

    await page.locator('button[aria-label="Next month"]').first().click();
    await page.waitForTimeout(500);

    await page.locator('button[aria-label="Previous month"]').first().click();
    await page.waitForTimeout(500);

    const calendarHeader = page.locator('[role="navigation"][aria-label="Calendar navigation"] h2');
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
    const filterBtn = page.locator('button').filter({ hasText: 'Filter' }).first();
    await expect(filterBtn).toBeVisible({ timeout: 5000 });
  });

  test('11. Clicking filter button shows category dropdown with options', async ({ page }) => {
    const filterBtn = page.locator('button').filter({ hasText: 'Filter' }).first();
    await filterBtn.click();
    await page.waitForTimeout(300);

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
    const mobile = await isMobileViewport(page);
    test.skip(mobile, 'Sidebar active state only applies to desktop viewports');

    await navigateToCalendar(page);

    const calendarBtn = page.locator('aside[aria-label="Main navigation"] button').filter({ hasText: 'Calendar' });
    await expect(calendarBtn).toHaveAttribute('aria-current', 'page');
  });

  test('13. Tasks button does not show active state when calendar is open', async ({ page }) => {
    const mobile = await isMobileViewport(page);
    test.skip(mobile, 'Sidebar active state only applies to desktop viewports');

    await navigateToCalendar(page);

    const tasksBtn = page.locator('aside[aria-label="Main navigation"] button').filter({ hasText: 'Tasks' });
    await expect(tasksBtn).not.toHaveAttribute('aria-current', 'page');
  });
});
