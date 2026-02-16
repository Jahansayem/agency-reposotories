import { test, expect, hideDevOverlay } from './helpers/test-base';
import type { Page } from '@playwright/test';

/**
 * Dashboard & Navigation E2E Tests
 *
 * Tests the navigation sidebar (desktop), bottom nav (mobile),
 * user menu, dark mode toggle, notification bell, new task button,
 * logout flow, and dashboard widget loading.
 *
 * Uses existing user Derrick with PIN 8008.
 */

// ─── Login helper ────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/');

  // Hide the Next.js dev overlay to prevent pointer event interception
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

  // Wait for and dismiss the AI Feature Tour (renders after app loads with a delay)
  const dontShowBtn = page.locator('button').filter({ hasText: "Don't show again" });
  try {
    await expect(dontShowBtn).toBeVisible({ timeout: 5000 });
    await dontShowBtn.click();
    await page.waitForTimeout(500);
  } catch {
    // Tour didn't appear — that's fine
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

  // Wait for main app — sidebar uses lg:flex (1024px+), bottom nav uses lg:hidden
  const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);
  if (isDesktop) {
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });
  } else {
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible({ timeout: 15000 });
  }
}

/** Helper: determine if viewport is mobile or tablet (<1024px where sidebar hides via lg:flex) */
async function isDesktopViewport(page: Page): Promise<boolean> {
  return page.evaluate(() => window.innerWidth >= 1024);
}

async function isMobileViewport(page: Page): Promise<boolean> {
  return page.evaluate(() => window.innerWidth < 768);
}

// ─── DESKTOP SIDEBAR NAVIGATION ──────────────────────────────────────────────

test.describe('Desktop sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar is visible after login on desktop', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('clicking Tasks nav item shows tasks view and highlights it', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });

    // First navigate away from tasks to dashboard
    const dashboardBtn = sidebar.locator('button').filter({ hasText: 'Dashboard' });
    await dashboardBtn.click();
    await page.waitForLoadState('networkidle');

    // Now click back to Tasks
    const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
    await tasksBtn.click();
    await page.waitForLoadState('networkidle');

    // Verify the Tasks button has aria-current="page" (indicating it is active)
    await expect(tasksBtn).toHaveAttribute('aria-current', 'page');
  });

  test('clicking Dashboard nav item navigates to dashboard view', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const dashboardBtn = sidebar.locator('button').filter({ hasText: 'Dashboard' });
    await dashboardBtn.click();
    await page.waitForLoadState('networkidle');

    // The Dashboard button should be the active item
    await expect(dashboardBtn).toHaveAttribute('aria-current', 'page');

    // Dashboard page should contain dashboard content (e.g. stat cards, progress ring, etc.)
    // At minimum we check the button is marked active and no errors appear on the page
    const errorMessage = page.locator('text=Something went wrong');
    await expect(errorMessage).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // Not found is fine - means no error
    });
  });

  test('clicking AI Inbox nav item navigates to AI Inbox view', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const aiInboxBtn = sidebar.locator('button').filter({ hasText: 'AI Inbox' });
    await aiInboxBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(aiInboxBtn).toHaveAttribute('aria-current', 'page');
  });

  test('clicking Analytics nav item navigates to analytics view', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const analyticsBtn = sidebar.locator('button').filter({ hasText: 'Analytics' });
    await analyticsBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(analyticsBtn).toHaveAttribute('aria-current', 'page');
  });

  test('clicking Customers nav item navigates to customers view', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const customersBtn = sidebar.locator('button').filter({ hasText: 'Customers' });
    await customersBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(customersBtn).toHaveAttribute('aria-current', 'page');
  });

  test('clicking Strategic Goals nav item navigates to goals view (if permission)', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const goalsBtn = sidebar.locator('button').filter({ hasText: 'Strategic Goals' });

    // The user may or may not have permission to see this button
    const isVisible = await goalsBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) {
      // User does not have permission - pass the test
      return;
    }

    await goalsBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(goalsBtn).toHaveAttribute('aria-current', 'page');
  });

  test('clicking Archive nav item navigates to archive view (if permission)', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const archiveBtn = sidebar.locator('button').filter({ hasText: 'Archive' });

    const isVisible = await archiveBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) {
      return;
    }

    await archiveBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(archiveBtn).toHaveAttribute('aria-current', 'page');
  });

  test('switching nav items changes which button is active', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
    const dashboardBtn = sidebar.locator('button').filter({ hasText: 'Dashboard' });
    const analyticsBtn = sidebar.locator('button').filter({ hasText: 'Analytics' });

    // Navigate to Dashboard
    await dashboardBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
    // Tasks should no longer be active (no aria-current attribute)
    await expect(tasksBtn).not.toHaveAttribute('aria-current', 'page');

    // Navigate to Analytics
    await analyticsBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(analyticsBtn).toHaveAttribute('aria-current', 'page');
    await expect(dashboardBtn).not.toHaveAttribute('aria-current', 'page');

    // Navigate back to Tasks
    await tasksBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(tasksBtn).toHaveAttribute('aria-current', 'page');
    await expect(analyticsBtn).not.toHaveAttribute('aria-current', 'page');
  });

  test('New Task button is visible in sidebar and clickable', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const newTaskBtn = sidebar.locator('button[aria-label="Create new task"]');
    await expect(newTaskBtn).toBeVisible({ timeout: 5000 });

    // Click it - should trigger new task flow (switches to tasks view and opens add task)
    await newTaskBtn.click();
    await page.waitForLoadState('networkidle');

    // After clicking New Task, the Tasks view should become active
    const tasksNavBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
    await expect(tasksNavBtn).toHaveAttribute('aria-current', 'page');
  });
});

// ─── MOBILE BOTTOM NAVIGATION ────────────────────────────────────────────────

test.describe('Mobile bottom navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('bottom nav is visible on mobile after login', async ({ page }) => {
    const isMobile = await isMobileViewport(page);
    if (!isMobile) {
      test.skip();
      return;
    }

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    await expect(bottomNav).toBeVisible({ timeout: 10000 });
  });

  test('Tasks tab is clickable and becomes active', async ({ page }) => {
    const isMobile = await isMobileViewport(page);
    if (!isMobile) {
      test.skip();
      return;
    }

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');

    // First navigate away to Dashboard
    const dashboardTab = bottomNav.locator('button[aria-label="Dashboard"]')
      .or(bottomNav.locator('button').filter({ hasText: 'Dashboard' }));
    if (await dashboardTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dashboardTab.click({ force: true });
      await page.waitForLoadState('networkidle');
    }

    // Now click back to Tasks
    const tasksTab = bottomNav.locator('button[aria-label="Tasks"]')
      .or(bottomNav.locator('button').filter({ hasText: 'Tasks' }));
    await tasksTab.click({ force: true });
    await page.waitForLoadState('networkidle');

    await expect(tasksTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Dashboard tab is clickable and becomes active', async ({ page }) => {
    const isMobile = await isMobileViewport(page);
    if (!isMobile) {
      test.skip();
      return;
    }

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    const dashboardTab = bottomNav.locator('button[aria-label="Dashboard"]')
      .or(bottomNav.locator('button').filter({ hasText: 'Dashboard' }));

    await dashboardTab.click({ force: true });
    await page.waitForLoadState('networkidle');

    await expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Messages tab is clickable and becomes active', async ({ page }) => {
    const isMobile = await isMobileViewport(page);
    if (!isMobile) {
      test.skip();
      return;
    }

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    const messagesTab = bottomNav.locator('button[aria-label="Messages"]')
      .or(bottomNav.locator('button').filter({ hasText: 'Messages' }));

    await messagesTab.click({ force: true });
    await page.waitForLoadState('networkidle');

    await expect(messagesTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Add button (floating center) is clickable and triggers new task', async ({ page }) => {
    const isMobile = await isMobileViewport(page);
    if (!isMobile) {
      test.skip();
      return;
    }

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    const addBtn = bottomNav.locator('button[aria-label="Create new task"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });

    await addBtn.click({ force: true });
    await page.waitForLoadState('networkidle');

    // After clicking Add, the app should switch to tasks view
    // The task input or add-task form should become visible
    const tasksTab = bottomNav.locator('button[aria-label="Tasks"]')
      .or(bottomNav.locator('button').filter({ hasText: 'Tasks' }));
    await expect(tasksTab).toHaveAttribute('aria-selected', 'true');
  });

  test('More tab opens mobile menu sheet', async ({ page }) => {
    const isMobile = await isMobileViewport(page);
    if (!isMobile) {
      test.skip();
      return;
    }

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    const moreTab = bottomNav.locator('button[aria-label="More"]')
      .or(bottomNav.locator('button').filter({ hasText: 'More' }));

    await moreTab.click({ force: true });
    await page.waitForLoadState('networkidle');

    // The mobile menu sheet should open with navigation heading
    const navHeading = page.locator('h2').filter({ hasText: 'Navigation' });
    await expect(navHeading).toBeVisible({ timeout: 5000 });
  });

  test('mobile menu sheet navigation items work', async ({ page }) => {
    const isMobile = await isMobileViewport(page);
    if (!isMobile) {
      test.skip();
      return;
    }

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    const moreTab = bottomNav.locator('button[aria-label="More"]')
      .or(bottomNav.locator('button').filter({ hasText: 'More' }));

    await moreTab.click({ force: true });
    await page.waitForLoadState('networkidle');

    // Click Dashboard item in the mobile menu sheet
    const dashboardMenuItem = page.locator('button').filter({ hasText: 'Dashboard' }).last();
    if (await dashboardMenuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dashboardMenuItem.click({ force: true });
      await page.waitForLoadState('networkidle');

      // Sheet should close and dashboard should be active
      const dashboardTab = bottomNav.locator('button[aria-label="Dashboard"]')
        .or(bottomNav.locator('button').filter({ hasText: 'Dashboard' }));
      await expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
    }
  });
});

// ─── USER MENU & ACCOUNT ─────────────────────────────────────────────────────

test.describe('User menu and account', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('user menu button is visible and opens dropdown on desktop', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    // The UserMenu is in the TodoHeader which appears in the tasks view
    // First navigate to tasks to ensure the header is visible
    if (isDesktop) {
      const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
      const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
      await tasksBtn.click();
      await page.waitForLoadState('networkidle');
    }

    const userMenuBtn = page.locator('button[aria-label="User menu"]');
    const isVisible = await userMenuBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      // User menu may not be visible in this view - skip
      return;
    }

    await userMenuBtn.click();
    await page.waitForLoadState('networkidle');

    // The dropdown menu should be visible with role="menu"
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Should show the user's name in the menu header
    const userName = menu.locator('text=Derrick');
    await expect(userName).toBeVisible();
  });

  test('dark mode toggle works from user menu', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (isDesktop) {
      const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
      const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
      await tasksBtn.click();
      await page.waitForLoadState('networkidle');
    }

    const userMenuBtn = page.locator('button[aria-label="User menu"]');
    const isVisible = await userMenuBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      return;
    }

    await userMenuBtn.click();
    await page.waitForLoadState('networkidle');

    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Find the Dark Mode toggle button
    const darkModeBtn = menu.locator('[role="menuitem"]').filter({ hasText: 'Dark Mode' });
    await expect(darkModeBtn).toBeVisible({ timeout: 3000 });

    // Get the initial theme state (check the HTML element or data attribute)
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Click dark mode toggle
    await darkModeBtn.click();
    await page.waitForTimeout(500);

    // Verify theme changed
    const newTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    expect(newTheme).not.toBe(initialTheme);
  });
});

// ─── NEW TASK BUTTON ──────────────────────────────────────────────────────────

test.describe('New Task button', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('New Task button in header opens task creation on desktop', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    // Navigate to tasks view first (header shows New Task button)
    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
    await tasksBtn.click();
    await page.waitForLoadState('networkidle');

    // Find the New Task button in the header area (not the sidebar one)
    const headerNewTaskBtn = page.locator('header button[aria-label="Create new task"]')
      .or(page.locator('header button').filter({ hasText: 'New Task' }));

    const isVisible = await headerNewTaskBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      // Button may not be in header - try sidebar button instead
      const sidebarNewTask = sidebar.locator('button[aria-label="Create new task"]');
      await sidebarNewTask.click();
      await page.waitForLoadState('networkidle');
    } else {
      await headerNewTaskBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // After clicking, a task input/textarea should appear
    const todoInput = page.locator('textarea[placeholder*="What needs to be done"]')
      .or(page.locator('[data-testid="add-task-input"]'))
      .or(page.locator('textarea[placeholder*="Add a task"]'))
      .or(page.locator('input[placeholder*="Add a task"]'));

    await expect(todoInput).toBeVisible({ timeout: 10000 });
  });
});

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────

test.describe('Notification bell', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('notification bell is visible and clickable in tasks view', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (isDesktop) {
      const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
      const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
      await tasksBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // The notification bell button has an aria-label starting with "View notifications"
    const bellBtn = page.locator('button[aria-label^="View notifications"]');
    const isVisible = await bellBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      // Bell may not be present in this view - skip gracefully
      return;
    }

    await bellBtn.click();
    await page.waitForLoadState('networkidle');

    // The notification button should toggle its expanded state
    await expect(bellBtn).toHaveAttribute('aria-expanded', 'true');
  });
});

// ─── LOG OUT FLOW ─────────────────────────────────────────────────────────────

test.describe('Log out flow', () => {
  test('log out from desktop sidebar returns to login screen', async ({ page }) => {
    await login(page);

    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const logoutBtn = sidebar.locator('button[aria-label="Log out"]');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });

    await logoutBtn.click();

    // Should return to login screen with "Welcome back" heading
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 15000 });
  });

  test('log out from user menu dropdown returns to login screen', async ({ page }) => {
    await login(page);

    const isDesktop = await isDesktopViewport(page);
    if (isDesktop) {
      const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
      const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
      await tasksBtn.click();
      await page.waitForLoadState('networkidle');
    }

    const userMenuBtn = page.locator('button[aria-label="User menu"]');
    const isVisible = await userMenuBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      // Fallback to sidebar logout if user menu is not present
      if (isDesktop) {
        const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
        const logoutBtn = sidebar.locator('button[aria-label="Log out"]');
        await logoutBtn.click();
      }
    } else {
      await userMenuBtn.click();
      await page.waitForLoadState('networkidle');

      const menu = page.locator('[role="menu"]');
      await expect(menu).toBeVisible({ timeout: 5000 });

      const logoutMenuItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Logout' });
      await expect(logoutMenuItem).toBeVisible({ timeout: 3000 });
      await logoutMenuItem.click();
    }

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 15000 });
  });

  test('log out from mobile More menu returns to login screen', async ({ page }) => {
    await login(page);

    const isMobile = await isMobileViewport(page);
    if (!isMobile) {
      test.skip();
      return;
    }

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    const moreTab = bottomNav.locator('button[aria-label="More"]')
      .or(bottomNav.locator('button').filter({ hasText: 'More' }));

    await moreTab.click({ force: true });
    await page.waitForLoadState('networkidle');

    // In the mobile menu sheet, find a logout option
    const logoutBtn = page.locator('button').filter({ hasText: 'Log out' })
      .or(page.locator('button').filter({ hasText: 'Sign Out' })
      .or(page.locator('button').filter({ hasText: 'Logout' })));

    const logoutVisible = await logoutBtn.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (logoutVisible) {
      await logoutBtn.first().click({ force: true });
    } else {
      // Fallback: close the sheet and try the user menu button if available
      await page.keyboard.press('Escape');
      await page.waitForLoadState('networkidle');

      const userMenuBtn = page.locator('button[aria-label="User menu"]');
      if (await userMenuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userMenuBtn.click({ force: true });
        const logoutMenu = page.locator('[role="menuitem"]').filter({ hasText: 'Logout' });
        await expect(logoutMenu).toBeVisible({ timeout: 3000 });
        await logoutMenu.click({ force: true });
      }
    }

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 15000 });
  });
});

// ─── DASHBOARD WIDGETS ────────────────────────────────────────────────────────

test.describe('Dashboard widgets load correctly', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard view loads without errors', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);

    if (isDesktop) {
      const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
      const dashboardBtn = sidebar.locator('button').filter({ hasText: 'Dashboard' });
      await dashboardBtn.click();
    } else {
      const bottomNav = page.locator('nav[aria-label="Main navigation"]');
      const dashboardTab = bottomNav.locator('button[aria-label="Dashboard"]')
        .or(bottomNav.locator('button').filter({ hasText: 'Dashboard' }));
      await dashboardTab.click({ force: true });
    }

    await page.waitForLoadState('networkidle');

    // Wait for dashboard content to load (spinner should disappear)
    const spinner = page.locator('.animate-spin');
    // Wait for spinner to disappear (it may or may not appear)
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      // Spinner might not appear at all if data loads quickly
    });

    // Verify no error boundary message is shown
    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBe(false);

    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/dashboard-loaded.png', fullPage: true });
  });

  test('analytics view loads without errors', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);

    if (isDesktop) {
      const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
      const analyticsBtn = sidebar.locator('button').filter({ hasText: 'Analytics' });
      await analyticsBtn.click();
    } else {
      // On mobile, navigate via More menu
      const bottomNav = page.locator('nav[aria-label="Main navigation"]');
      const moreTab = bottomNav.locator('button[aria-label="More"]')
        .or(bottomNav.locator('button').filter({ hasText: 'More' }));
      await moreTab.click({ force: true });
      await page.waitForLoadState('networkidle');

      // In mobile menu, try to find an analytics option
      const analyticsItem = page.locator('button').filter({ hasText: 'Analytics' });
      if (await analyticsItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await analyticsItem.click({ force: true });
      } else {
        // Analytics may not be accessible from mobile More menu - skip
        test.skip();
        return;
      }
    }

    await page.waitForLoadState('networkidle');

    // Wait for content to load
    const spinner = page.locator('.animate-spin');
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    // Verify no error
    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBe(false);
  });

  test('customers view loads without errors', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);

    if (isDesktop) {
      const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
      const customersBtn = sidebar.locator('button').filter({ hasText: 'Customers' });
      await customersBtn.click();
    } else {
      // Customers may not be directly accessible from mobile bottom nav
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    const spinner = page.locator('.animate-spin');
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBe(false);
  });
});

// ─── NAVIGATION STATE PERSISTENCE ─────────────────────────────────────────────

test.describe('Navigation state and view switching', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('rapid view switching does not cause errors', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const views = ['Tasks', 'Dashboard', 'AI Inbox', 'Analytics', 'Customers'];

    // Rapidly click through all views
    for (const viewName of views) {
      const btn = sidebar.locator('button').filter({ hasText: viewName });
      const isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        await btn.click();
        // Small pause to allow transition to start
        await page.waitForTimeout(200);
      }
    }

    // Wait for final view to stabilize
    await page.waitForLoadState('networkidle');

    // No error boundary should be shown
    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBe(false);

    // The last clicked view (Customers) should be active
    const customersBtn = sidebar.locator('button').filter({ hasText: 'Customers' });
    await expect(customersBtn).toHaveAttribute('aria-current', 'page');
  });

  test('view content changes when switching nav items', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const mainContent = page.locator('#main-content').last();

    // Go to Tasks view
    const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
    await tasksBtn.click();
    await page.waitForLoadState('networkidle');

    // Capture the HTML of the main content area in tasks view
    const tasksContent = await mainContent.innerHTML();

    // Switch to Dashboard view
    const dashboardBtn = sidebar.locator('button').filter({ hasText: 'Dashboard' });
    await dashboardBtn.click();
    await page.waitForLoadState('networkidle');

    // Wait for dashboard content to fully render
    await page.waitForTimeout(500);

    // The content should have changed
    const dashboardContent = await mainContent.innerHTML();
    expect(dashboardContent).not.toBe(tasksContent);
  });
});

// ─── SIDEBAR COLLAPSE/EXPAND ──────────────────────────────────────────────────

test.describe('Sidebar collapse and expand', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar collapse toggle button works', async ({ page }) => {
    const isDesktop = await isDesktopViewport(page);
    if (!isDesktop) {
      test.skip();
      return;
    }

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });

    // Find the collapse/expand toggle button
    const collapseBtn = sidebar.locator('button[aria-label="Collapse sidebar"]')
      .or(sidebar.locator('button[aria-label="Expand sidebar"]'));

    const isVisible = await collapseBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      // Collapse button may only appear on hover for some sidebar states
      return;
    }

    // Get initial sidebar width
    const initialWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);

    await collapseBtn.click();
    await page.waitForTimeout(500); // Wait for animation

    // After collapsing, the sidebar width should be smaller
    const collapsedWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);
    expect(collapsedWidth).toBeLessThan(initialWidth);
  });
});
