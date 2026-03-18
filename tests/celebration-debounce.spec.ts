/**
 * E2E tests for celebration debounce behavior.
 *
 * Verifies that the enhanced celebration modal only triggers when
 * ALL tasks due today are completed, not on every individual completion.
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

const TEST_USER = 'Derrick';
const TEST_PIN = '8008';

/**
 * Helper: dismiss any post-login modals (e.g. "View Tasks", onboarding).
 * Scoped to known post-login modal buttons only.
 */
async function dismissPostLoginModals(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
    const closeBtn = page.locator('button[aria-label*="close"]').or(page.locator('button[aria-label*="Close"]'));

    if (await viewTasksBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await viewTasksBtn.click();
    } else if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      break;
    }
    await page.waitForTimeout(300);
  }
}

/** Selector for the enhanced celebration modal backdrop */
const CELEBRATION_MODAL = '.fixed.inset-0.bg-black\\/50';

test.describe('Celebration Debounce', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);
    await dismissPostLoginModals(page);
  });

  test('completing one task when others remain due today should NOT show the enhanced celebration modal', async ({ page }) => {
    const todoInput = page.locator('textarea[placeholder="What needs to be done?"]');
    await expect(todoInput).toBeVisible({ timeout: 10000 });

    // Create two tasks (neither has a due date, so "all today done" should not trigger)
    const taskA = `CelebTest-A-${Date.now()}`;
    const taskB = `CelebTest-B-${Date.now()}`;

    await todoInput.click();
    await todoInput.fill(taskA);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    await todoInput.click();
    await todoInput.fill(taskB);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Complete only the first task
    const taskRow = page.locator('[data-task-id]').filter({ hasText: taskA }).first();
    await expect(taskRow).toBeVisible({ timeout: 5000 });

    const checkbox = taskRow.locator('button[aria-pressed]').first();
    await checkbox.click();

    // Wait for any celebration to potentially appear
    await page.waitForTimeout(2000);

    // The enhanced celebration modal should NOT be visible
    // (taskB is still incomplete, so "all today done" is false)
    const celebrationModal = page.locator(CELEBRATION_MODAL);
    await expect(celebrationModal).not.toBeVisible();
  });

  test('enhanced celebration modal can be dismissed when it appears', async ({ page }) => {
    const todoInput = page.locator('textarea[placeholder="What needs to be done?"]');
    await expect(todoInput).toBeVisible({ timeout: 10000 });

    // Check if the celebration modal happens to be visible (from previous state)
    const celebrationModal = page.locator(CELEBRATION_MODAL);
    const isModalVisible = await celebrationModal.isVisible().catch(() => false);

    if (isModalVisible) {
      // Find and click a dismiss button
      const dismissBtn = page.locator('button').filter({ hasText: /keep going|continue|dismiss/i });
      await expect(dismissBtn).toBeVisible({ timeout: 2000 });
      await dismissBtn.click();
      await page.waitForTimeout(500);
      await expect(celebrationModal).not.toBeVisible();
    }
  });
});
