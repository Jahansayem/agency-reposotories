/**
 * Cleanup helper for E2E tests
 *
 * Deletes tasks created during test runs to keep the test environment clean.
 */

import { Page } from '@playwright/test';

/**
 * Delete tasks whose text starts with the given prefix.
 * Clicks the delete button on up to `maxTasks` matching tasks.
 *
 * @param page - Playwright page instance
 * @param prefix - Task text prefix to match
 * @param maxTasks - Maximum number of tasks to delete (default 10)
 */
export async function deleteTasksByPrefix(page: Page, prefix: string, maxTasks = 10) {
  let deleted = 0;

  for (let i = 0; i < maxTasks; i++) {
    // Find a task row containing the prefix
    const taskRow = page.locator('li').filter({ hasText: prefix }).first();
    const isVisible = await taskRow.isVisible().catch(() => false);
    if (!isVisible) break;

    try {
      // Try right-click context menu approach
      await taskRow.click({ button: 'right' });
      const deleteOption = page.locator('text=Delete').first();
      if (await deleteOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteOption.click();
        // Confirm deletion if a confirmation dialog appears
        const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        deleted++;
        await page.waitForTimeout(500);
        continue;
      }

      // Fallback: click on task to open detail, then find delete button
      await taskRow.click();
      await page.waitForTimeout(500);

      const deleteBtn = page.locator('[aria-label="Delete task"], button:has-text("Delete")').first();
      if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteBtn.click();
        // Confirm deletion
        const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        deleted++;
        await page.waitForTimeout(500);
      }
    } catch {
      // If deletion fails, move on
      break;
    }
  }

  return deleted;
}
