import { test, expect, Page } from '@playwright/test';

/**
 * Core Flow Tests
 *
 * Tests the fundamental authentication and task management flows.
 * Uses existing users in the database (Derrick with PIN 8008).
 */

// Helper to login with an existing user by selecting them and entering PIN
async function loginAsExistingUser(page: Page, userName: string = 'Derrick', pin: string = '8008') {
  await page.goto('/');

  // Wait for login screen - look for either h1 or h2 with Bealer Agency (h1 is hidden on large screens)
  const header = page.locator('h1, h2').filter({ hasText: 'Bealer Agency' }).first();
  await expect(header).toBeVisible({ timeout: 15000 });

  // Wait for users list to load
  await page.waitForTimeout(1000);

  // Click on the user card to select them
  const userCard = page.locator('button').filter({ hasText: userName }).first();
  await expect(userCard).toBeVisible({ timeout: 10000 });
  await userCard.click();

  // Wait for PIN entry screen
  await page.waitForTimeout(500);

  // Enter PIN - look for 4 password inputs
  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });

  // Enter each digit of the PIN
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(pin[i]);
    await page.waitForTimeout(100); // Small delay between digits
  }

  // Wait for automatic login after PIN entry
  await page.waitForTimeout(2000);

  // Close welcome modal if present (click outside, X button, or View Tasks button)
  const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
  const closeModalBtn = page.locator('button[aria-label*="close"]').or(page.locator('button svg.lucide-x').locator('..'));

  // Try clicking View Tasks first (most reliable)
  if (await viewTasksBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await viewTasksBtn.click();
    await page.waitForTimeout(500);
  }
  // Or try clicking the close button
  else if (await closeModalBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeModalBtn.click();
    await page.waitForTimeout(500);
  }

  // Wait for main app to load
  await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });
}

test.describe('Core Functionality Tests', () => {
  test('Login with existing user and see main app', async ({ page }) => {
    await loginAsExistingUser(page, 'Derrick', '8008');

    // Verify we're in the main app - sidebar navigation should be visible
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 10000 });
    console.log('✓ User logged in and main app loaded');
  });

  test('Add a task successfully', async ({ page }) => {
    await loginAsExistingUser(page, 'Derrick', '8008');

    // Create a unique task name
    const taskName = `Task_${Date.now()}`;

    // Click the "New Task" button to open the add task modal/form
    const newTaskBtn = page.locator('button').filter({ hasText: 'New Task' }).first();
    await expect(newTaskBtn).toBeVisible({ timeout: 5000 });
    await newTaskBtn.click();
    await page.waitForTimeout(500);

    // Find the task input textarea
    const todoInput = page.locator('textarea[placeholder*="What needs to be done"]').first()
      .or(page.locator('[data-testid="add-task-input"]'));
    await expect(todoInput).toBeVisible({ timeout: 5000 });

    // Focus and fill input
    await todoInput.click();
    await todoInput.fill(taskName);

    // Submit with Enter
    await page.keyboard.press('Enter');

    // Wait for task to appear in the list
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/core-add-task.png', fullPage: true });

    // Verify task appears
    const taskLocator = page.locator(`text=${taskName}`);
    await expect(taskLocator).toBeVisible({ timeout: 10000 });
    console.log('✓ Task created and visible');
  });

  test('Task persists after page reload', async ({ page }) => {
    await loginAsExistingUser(page, 'Derrick', '8008');

    // Create a unique task
    const taskName = `Persist_${Date.now()}`;

    // Click the "New Task" button to open the add task form
    const newTaskBtn = page.locator('button').filter({ hasText: 'New Task' }).first();
    await newTaskBtn.click();
    await page.waitForTimeout(500);

    const todoInput = page.locator('textarea[placeholder*="What needs to be done"]').first()
      .or(page.locator('[data-testid="add-task-input"]'));
    await expect(todoInput).toBeVisible({ timeout: 5000 });

    await todoInput.click();
    await todoInput.fill(taskName);
    await page.keyboard.press('Enter');

    // Wait for task to appear
    await expect(page.locator(`text=${taskName}`)).toBeVisible({ timeout: 10000 });

    // Wait for Supabase to persist
    await page.waitForTimeout(3000);

    // Reload page
    await page.reload();

    // Wait for app to load again (should auto-login from session)
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Scroll down to find the task (it may be below the fold)
    const taskLocator = page.locator(`text=${taskName}`);

    // Try scrolling the task list to find the task
    for (let i = 0; i < 5; i++) {
      if (await taskLocator.isVisible().catch(() => false)) break;
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(500);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/core-persist-reload.png', fullPage: true });

    // Verify task still exists (may need longer timeout as data loads async)
    await expect(taskLocator).toBeVisible({ timeout: 15000 });
    console.log('✓ Task persisted after reload');
  });

  test('User switcher dropdown displays correctly', async ({ page }) => {
    // Login as Derrick
    await loginAsExistingUser(page, 'Derrick', '8008');

    // Find and click the user menu button in the header (shows "Derrick" text)
    const userBtn = page.locator('button').filter({ hasText: 'Derrick' }).last();

    await expect(userBtn).toBeVisible({ timeout: 5000 });
    await userBtn.click();
    await page.waitForTimeout(500);

    // Take screenshot of dropdown
    await page.screenshot({ path: 'test-results/core-user-dropdown.png', fullPage: true });

    // Verify dropdown shows logout option or user info
    const logoutBtn = page.locator('button').filter({ hasText: 'Logout' })
      .or(page.locator('button').filter({ hasText: 'Sign Out' }));
    const darkModeOption = page.locator('button').filter({ hasText: 'Dark Mode' });

    // At least one of these should be visible
    const isLogoutVisible = await logoutBtn.isVisible().catch(() => false);
    const isDarkModeVisible = await darkModeOption.isVisible().catch(() => false);

    expect(isLogoutVisible || isDarkModeVisible).toBeTruthy();
    console.log('✓ User dropdown displayed correctly');
  });

  test('Sign out returns to login screen', async ({ page }) => {
    await loginAsExistingUser(page, 'Derrick', '8008');

    // Find and click the user menu button
    const userBtn = page.locator('button').filter({ hasText: 'Derrick' }).last();

    await userBtn.click();
    await page.waitForTimeout(500);

    // Look for Logout button in dropdown (UI uses "Logout" not "Sign Out")
    const logoutBtn = page.locator('button').filter({ hasText: 'Logout' })
      .or(page.locator('button').filter({ hasText: 'Sign Out' }));

    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Wait for login screen
    await expect(page.locator('h1, h2').filter({ hasText: 'Bealer Agency' }).first()).toBeVisible({ timeout: 15000 });
    console.log('✓ Successfully signed out');
  });
});
