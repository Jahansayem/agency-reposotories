import { test, expect, Page } from '@playwright/test';
import { loginAsUser } from './helpers/auth';
import { deleteTasksByPrefix } from './helpers/cleanup';

// Seeded test user (from 20260219_seed_e2e_test_data.sql)
const TEST_USER = 'Derrick';
const TEST_PIN = '8008';

// Prefix for tasks created by this test suite
const TASK_PREFIX = 'E2E_NewFeat_';

// Helper to check if app is loaded
async function isAppLoaded(page: Page): Promise<boolean> {
  const taskInput = page.getByRole('complementary', { name: 'Main navigation' });
  const configError = page.locator('text=Configuration Required');

  try {
    await page.waitForLoadState('networkidle');
    if (await configError.isVisible()) {
      return false;
    }
    return await taskInput.isVisible();
  } catch {
    return false;
  }
}

test.describe('PIN Authentication', () => {
  test('should show login screen on first visit', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1:has-text("Bealer Agency")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Task Management')).toBeVisible();
  });

  test('should show Add New User button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button:has-text("Add New User")')).toBeVisible({ timeout: 10000 });
  });

  test('should allow login with existing user PIN', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible();
  });
});

test.describe('Micro-Rewards (Celebration Effect)', () => {
  test.afterEach(async ({ page }) => {
    await deleteTasksByPrefix(page, TASK_PREFIX, 5);
  });

  test('should show celebration when completing a task via checkbox', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const taskName = `${TASK_PREFIX}Celebration_${Date.now()}`;
    const input = page.locator('[data-testid="add-task-input"]');
    await input.click();
    await input.fill(taskName);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskName}`)).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const checkbox = page.locator(`text=${taskName}`).locator('xpath=ancestor::div[contains(@class, "rounded-")]//button[1]');
    await checkbox.click();

    await expect(page.locator("text=You've got it covered!")).toBeVisible({ timeout: 5000 });
  });

  test('should auto-dismiss celebration after animation', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const taskName = `${TASK_PREFIX}AutoDismiss_${Date.now()}`;
    const input = page.locator('[data-testid="add-task-input"]');
    await input.click();
    await input.fill(taskName);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskName}`)).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const checkbox = page.locator(`text=${taskName}`).locator('xpath=ancestor::div[contains(@class, "rounded-")]//button[1]');
    await checkbox.click();

    await expect(page.locator("text=You've got it covered!")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=You've got it covered!")).not.toBeVisible({ timeout: 6000 });
  });
});

test.describe('Progress Summary', () => {
  test('should show Progress button in header', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    await expect(page.locator('button').filter({ has: page.locator('svg.lucide-trophy') })).toBeVisible();
  });

  test('should open Progress Summary modal when clicking Progress button', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    await page.locator('button').filter({ has: page.locator('svg.lucide-trophy') }).click();
    await expect(page.locator('text=Your Progress')).toBeVisible({ timeout: 3000 });
  });

  test('should display streak count in Progress Summary', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    await page.locator('button').filter({ has: page.locator('svg.lucide-trophy') }).click();
    await expect(page.locator('text=Streak')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=days active')).toBeVisible();
  });

  test('should display completion rate in Progress Summary', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    await page.locator('button').filter({ has: page.locator('svg.lucide-trophy') }).click();
    await expect(page.locator('text=completion rate')).toBeVisible({ timeout: 3000 });
  });

  test('should close Progress Summary when clicking Keep Going button', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    await page.locator('button').filter({ has: page.locator('svg.lucide-trophy') }).click();
    await expect(page.locator('text=Your Progress')).toBeVisible({ timeout: 3000 });

    await page.locator('button:has-text("Keep Going!")').click();
    await expect(page.locator('text=Your Progress')).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('Cloud Storage Integration', () => {
  test.afterEach(async ({ page }) => {
    await deleteTasksByPrefix(page, TASK_PREFIX, 5);
  });

  test('should persist tasks across page reloads', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const uniqueTask = `${TASK_PREFIX}Persistence_${Date.now()}`;
    const input = page.locator('[data-testid="add-task-input"]');
    await input.fill(uniqueTask);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text=${uniqueTask}`)).toBeVisible({ timeout: 5000 });

    await page.reload();

    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${uniqueTask}`)).toBeVisible({ timeout: 5000 });
  });

  test('should persist user session across reloads', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    await page.reload();
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('User Switcher', () => {
  test('should show user dropdown in header', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const userDropdown = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-down') }).last();
    await userDropdown.click();

    await expect(page.locator('text=Log Out')).toBeVisible({ timeout: 3000 });
  });

  test('should logout when clicking Log Out', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const userDropdown = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-down') }).last();
    await userDropdown.click();

    await page.locator('button:has-text("Log Out")').click();
    await expect(page.locator('text=Task Management')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Real-time Connection', () => {
  test('should show Live or Offline status', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const liveStatus = page.locator('text=Live');
    const offlineStatus = page.locator('text=Offline');
    await expect(liveStatus.or(offlineStatus)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Stats Dashboard', () => {
  test('should show all three stat cards', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    await expect(page.locator('text=Total Tasks')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Overdue')).toBeVisible();
  });

  test('should update Total Tasks when adding a task', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const totalStat = page.locator('text=Total Tasks').locator('..').locator('p').first();
    const initialCount = parseInt(await totalStat.textContent() || '0');

    const taskName = `${TASK_PREFIX}Stats_${Date.now()}`;
    const input = page.locator('[data-testid="add-task-input"]');
    await input.fill(taskName);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text=${taskName}`)).toBeVisible({ timeout: 5000 });

    await page.waitForLoadState('networkidle');
    const newCount = parseInt(await totalStat.textContent() || '0');
    expect(newCount).toBe(initialCount + 1);

    // Cleanup
    await deleteTasksByPrefix(page, TASK_PREFIX, 3);
  });
});

test.describe('View Modes', () => {
  test('should switch to Kanban view', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const kanbanButton = page.locator('button').filter({ has: page.locator('svg.lucide-layout-grid') });
    await kanbanButton.click();

    await expect(page.locator('h3:has-text("To Do")')).toBeVisible();
    await expect(page.locator('h3:has-text("In Progress")')).toBeVisible();
    await expect(page.locator('h3:has-text("Done")')).toBeVisible();
  });

  test('should switch back to List view', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const kanbanButton = page.locator('button').filter({ has: page.locator('svg.lucide-layout-grid') });
    await kanbanButton.click();
    await expect(page.locator('h3:has-text("To Do")')).toBeVisible();

    const listButton = page.locator('button').filter({ has: page.locator('svg.lucide-layout-list') });
    await listButton.click();

    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Active")')).toBeVisible();
  });
});

test.describe('Task Filters', () => {
  test.afterEach(async ({ page }) => {
    await deleteTasksByPrefix(page, TASK_PREFIX, 5);
  });

  test('should filter to Active tasks only', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const input = page.locator('[data-testid="add-task-input"]');

    const activeTask = `${TASK_PREFIX}Active_${Date.now()}`;
    await input.fill(activeTask);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text=${activeTask}`)).toBeVisible({ timeout: 5000 });

    const taskToComplete = `${TASK_PREFIX}Complete_${Date.now()}`;
    await input.fill(taskToComplete);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text=${taskToComplete}`)).toBeVisible({ timeout: 5000 });

    const taskItem = page.locator(`text=${taskToComplete}`).locator('..').locator('..');
    await taskItem.locator('button').first().click();
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("Active")').click();

    await expect(page.locator(`text=${activeTask}`)).toBeVisible();
    await expect(page.locator(`text=${taskToComplete}`)).not.toBeVisible();
  });

  test('should filter to Completed tasks only', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const input = page.locator('[data-testid="add-task-input"]');
    const taskName = `${TASK_PREFIX}FilterComplete_${Date.now()}`;
    await input.fill(taskName);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text=${taskName}`)).toBeVisible({ timeout: 5000 });

    const taskItem = page.locator(`text=${taskName}`).locator('..').locator('..');
    await taskItem.locator('button').first().click();
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("Completed")').click();
    await expect(page.locator(`text=${taskName}`)).toBeVisible();
  });
});

test.describe('Task CRUD Operations', () => {
  test('should create a task', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const taskName = `${TASK_PREFIX}Create_${Date.now()}`;
    const input = page.locator('[data-testid="add-task-input"]');
    await input.fill(taskName);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskName}`)).toBeVisible({ timeout: 5000 });

    // Cleanup
    await deleteTasksByPrefix(page, TASK_PREFIX, 3);
  });

  test('should delete a task', async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);

    if (!(await isAppLoaded(page))) {
      test.skip();
      return;
    }

    const taskName = `${TASK_PREFIX}Delete_${Date.now()}`;
    const input = page.locator('[data-testid="add-task-input"]');
    await input.fill(taskName);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text=${taskName}`)).toBeVisible({ timeout: 5000 });

    const taskItem = page.locator(`text=${taskName}`).locator('..').locator('..').locator('..');
    await taskItem.hover();

    const deleteButton = taskItem.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
    await deleteButton.click();

    await expect(page.locator(`text=${taskName}`)).not.toBeVisible({ timeout: 3000 });
  });
});
