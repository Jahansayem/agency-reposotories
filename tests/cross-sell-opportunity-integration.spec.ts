import { test, expect, Page } from '@playwright/test';

// Helper: log in as Derrick (known PIN: 8008)
async function loginAsDerrick(page: Page) {
  await page.goto('http://localhost:3001');
  await page.waitForSelector('[data-testid="user-card-Derrick"]', { timeout: 15000 });
  await page.click('[data-testid="user-card-Derrick"]');
  await page.waitForSelector('input', { timeout: 5000 });
  const inputs = await page.locator('input').all();
  for (const [i, digit] of ['8', '0', '0', '8'].entries()) {
    await inputs[i].fill(digit);
  }
  await page.waitForSelector('nav[aria-label="Main navigation"]', { timeout: 15000 });
}

test.describe('Cross-sell opportunity integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDerrick(page);
    // Navigate to Tasks view
    await page.click('button:has-text("Tasks")');
    await page.waitForSelector('[aria-label="Create new task"]', { timeout: 10000 });
  });

  test('shows opportunity match banner after creating task with customer name', async ({ page }) => {
    // Open add task modal
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('input[placeholder*="task" i], input[placeholder*="add" i]', { timeout: 5000 });

    // Type a task with a customer name that exists in the opportunities table
    // This test assumes a customer named something in the real DB — adjust to match test data
    const taskText = 'Call Janis Urich about her upcoming renewal';
    await page.fill('input[placeholder*="task" i], input[placeholder*="add" i]', taskText);

    // Submit (press Enter or click Add button)
    await page.keyboard.press('Enter');

    // Wait for banner to appear (up to 10s — Claude name extraction takes ~1–2s)
    const banner = page.locator('[role="alert"]').filter({ hasText: 'Looks like this is for' });
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Banner should show customer name and opportunity tier
    await expect(banner.locator('text=Janis')).toBeVisible();
    await expect(banner.locator('button:has-text("Link")')).toBeVisible();
    await expect(banner.locator('button:has-text("Not")')).toBeVisible();
  });

  test('links customer and shows opportunity badge in list after confirming', async ({ page }) => {
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('input[placeholder*="task" i]', { timeout: 5000 });

    const taskText = 'Follow up with Janis Urich on her policy';
    await page.fill('input[placeholder*="task" i]', taskText);
    await page.keyboard.press('Enter');

    const banner = page.locator('[role="alert"]').filter({ hasText: 'Link' });
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Click "Link" button
    await banner.locator('button:has-text("Link")').click();

    // After linking, check that the task row in the list now shows an opportunity badge
    const taskRow = page.locator('li').filter({ hasText: 'Follow up with Janis Urich' });
    await expect(taskRow.locator('[title*="opportunity" i]')).toBeVisible({ timeout: 5000 });
  });

  test('banner does not appear for tasks without customer names', async ({ page }) => {
    await page.click('[aria-label="Create new task"]');
    await page.waitForSelector('input[placeholder*="task" i]', { timeout: 5000 });

    await page.fill('input[placeholder*="task" i]', 'Review quarterly reports');
    await page.keyboard.press('Enter');

    // Wait 6 seconds — if no banner appears within that time, test passes
    await page.waitForTimeout(6000);
    const banner = page.locator('[role="alert"]').filter({ hasText: 'Looks like this is for' });
    await expect(banner).not.toBeVisible();
  });

  test('opportunity callout appears in task detail modal for linked customer', async ({ page }) => {
    // Find a task that already has a customer_id set (created from generate-tasks flow or previously linked)
    // Click on a task that has an opportunity badge
    const taskWithBadge = page.locator('li').filter({ hasText: '' }).locator('[title*="opportunity" i]').first();

    // If no badge exists yet, skip this test
    const count = await taskWithBadge.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await taskWithBadge.click(); // Opens task detail modal

    // Wait for modal and check for OpportunityCallout
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const callout = page.locator('[role="dialog"]').locator('text=opportunity');
    await expect(callout).toBeVisible({ timeout: 5000 });
  });
});
