import { test, expect, Page } from '@playwright/test';
import { loginAsUser } from './helpers/auth';
import { deleteTasksByPrefix } from './helpers/cleanup';

// Seeded test user (from 20260219_seed_e2e_test_data.sql)
const TEST_USER = 'Derrick';
const TEST_PIN = '8008';

// Prefix for tasks created by this test suite
const TASK_PREFIX = 'E2E_CrossSell_';

test.describe('Cross-sell opportunity integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);
    // Navigate to Tasks view
    await page.click('button:has-text("Tasks"), [role="tab"]:has-text("Tasks")', { force: true });
    await page.waitForSelector('[aria-label="Create new task"]', { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // Clean up tasks created during this test
    await deleteTasksByPrefix(page, TASK_PREFIX, 5);
  });

  test('shows opportunity match banner after creating task with customer name', async ({ page }) => {
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('[role="dialog"] textarea, [role="dialog"] input[type="text"]', { timeout: 5000 });

    // James Wilson exists in seed data with HOT cross-sell opportunity
    const taskText = `${TASK_PREFIX}Call James Wilson about his upcoming renewal`;
    await page.fill('[role="dialog"] textarea, [role="dialog"] input[type="text"]', taskText);
    await page.keyboard.press('Enter');

    // Wait for banner to appear (Claude name extraction takes ~1–2s)
    const banner = page.locator('[role="alert"]').filter({ hasText: 'Looks like this is for' });
    await expect(banner).toBeVisible({ timeout: 10000 });

    await expect(banner.locator('text=James')).toBeVisible();
    await expect(banner.locator('button:has-text("Link")')).toBeVisible();
    await expect(banner.locator('button:has-text("Not")')).toBeVisible();
  });

  test('links customer and shows opportunity badge in list after confirming', async ({ page }) => {
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('input[placeholder*="task" i]', { timeout: 5000 });

    const taskText = `${TASK_PREFIX}Follow up with James Wilson on his policy`;
    await page.fill('input[placeholder*="task" i]', taskText);
    await page.keyboard.press('Enter');

    const banner = page.locator('[role="alert"]').filter({ hasText: 'Link' });
    await expect(banner).toBeVisible({ timeout: 10000 });

    await banner.locator('button:has-text("Link")').click();

    const taskRow = page.locator('li').filter({ hasText: `${TASK_PREFIX}Follow up with James Wilson` });
    await expect(taskRow.locator('[title*="opportunity" i]')).toBeVisible({ timeout: 5000 });
  });

  test('banner does not appear for tasks without customer names', async ({ page }) => {
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('input[placeholder*="task" i]', { timeout: 5000 });

    const taskText = `${TASK_PREFIX}Review quarterly reports`;
    await page.fill('input[placeholder*="task" i]', taskText);
    await page.keyboard.press('Enter');

    // Wait 6 seconds — if no banner appears within that time, test passes
    await page.waitForTimeout(6000);
    const banner = page.locator('[role="alert"]').filter({ hasText: 'Looks like this is for' });
    await expect(banner).not.toBeVisible();
  });

  test('opportunity callout appears in task detail modal for linked customer', async ({ page }) => {
    const taskWithBadge = page.locator('li').filter({ hasText: '' }).locator('[title*="opportunity" i]').first();

    const count = await taskWithBadge.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await taskWithBadge.click();

    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const callout = page.locator('[role="dialog"]').locator('text=opportunity');
    await expect(callout).toBeVisible({ timeout: 5000 });
  });
});
