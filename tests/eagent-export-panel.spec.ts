/**
 * E2E tests for the eAgent Export Panel.
 *
 * Tests the queue + batch export flow for logging completed tasks
 * to Allstate's eAgent CRM: panel open/close, badge count,
 * copy-to-clipboard, mark as done, and already-logged section.
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsUser } from './helpers/auth';

const TEST_USER = 'Derrick';
const TEST_PIN = '8008';

/** Inject a test item into the eAgent queue via localStorage */
async function injectQueueItem(page: Page, options?: { exported?: boolean }) {
  await page.evaluate((opts) => {
    const item = {
      id: 'e2e-test-1',
      todoId: 'e2e-todo-1',
      todo: {
        id: 'e2e-todo-1',
        text: 'Call Test Customer about auto insurance renewal',
        customer_name: 'Test Customer',
        policy_type: 'auto',
        transcription: 'Hi, this is Test Customer calling about my auto renewal.',
        notes: 'Needs renewal quote by Friday',
        subtasks: [
          { id: 's1', text: 'Pull current policy', completed: true },
          { id: 's2', text: 'Run new quote', completed: true },
        ],
        completed: true,
      },
      completedBy: 'Derrick',
      completedAt: new Date().toISOString(),
      queuedAt: new Date().toISOString(),
      exported: opts?.exported ?? false,
    };

    localStorage.setItem(
      'eagent-queue',
      JSON.stringify({ state: { items: [item] }, version: 0 })
    );
  }, options ?? {});
}

/** Clear eAgent queue from localStorage */
async function clearQueue(page: Page) {
  await page.evaluate(() => localStorage.removeItem('eagent-queue'));
}

/** Dismiss any post-login modals (AI Feature Tour, daily summary, etc.) */
async function dismissPostLoginModals(page: Page) {
  for (let attempt = 0; attempt < 6; attempt++) {
    // AI Feature Tour — "Don't show again" or X button
    const dontShowBtn = page.locator('button').filter({ hasText: "Don't show again" });
    // Generic close buttons on modals
    const closeBtn = page
      .locator('button[aria-label*="close"]')
      .or(page.locator('button[aria-label*="Close"]'));
    // Daily summary "View Tasks" button
    const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });

    if (await dontShowBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await dontShowBtn.click();
    } else if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.first().click();
    } else if (await viewTasksBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await viewTasksBtn.click();
    } else {
      break;
    }
    await page.waitForTimeout(500);
  }
}

test.describe('eAgent Export Panel', () => {
  // Login + modal dismissal can take longer than the default 60s on slow dev servers
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);
    await dismissPostLoginModals(page);
  });

  test.afterEach(async ({ page }) => {
    await clearQueue(page);
  });

  test('panel shows empty state when no tasks are queued', async ({ page }) => {
    // Ensure queue is empty
    await clearQueue(page);

    const eAgentBtn = page.getByRole('button', { name: /log to eagent/i });
    await expect(eAgentBtn).toBeVisible({ timeout: 10000 });

    // Should not show a badge count
    await expect(eAgentBtn).not.toHaveAttribute('aria-label', /pending/);

    await eAgentBtn.click();

    const panel = page.getByRole('dialog', { name: /log to eagent/i });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('No tasks to log').first()).toBeVisible();
    await expect(
      panel.getByText('Customer-linked tasks will appear here when completed')
    ).toBeVisible();
  });

  test('badge shows pending count when items are queued', async ({ page }) => {
    await injectQueueItem(page);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const eAgentBtn = page.getByRole('button', { name: /log to eagent.*1 pending/i });
    await expect(eAgentBtn).toBeVisible({ timeout: 10000 });
  });

  test('panel displays queued task with customer info', async ({ page }) => {
    await injectQueueItem(page);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const eAgentBtn = page.getByRole('button', { name: /log to eagent/i });
    await expect(eAgentBtn).toBeVisible({ timeout: 10000 });
    await eAgentBtn.click();

    const panel = page.getByRole('dialog', { name: /log to eagent/i });
    await expect(panel).toBeVisible();

    // Verify customer name and task text
    await expect(panel.getByText('Test Customer', { exact: true })).toBeVisible();
    await expect(
      panel.getByText('Call Test Customer about auto insurance renewal')
    ).toBeVisible();

    // Verify action buttons
    await expect(
      panel.getByRole('button', { name: /copy eagent note/i })
    ).toBeVisible();
    await expect(
      panel.getByRole('button', { name: /mark.*logged/i })
    ).toBeVisible();

    // Verify call notes indicator and copy link
    await expect(panel.getByText('Call notes', { exact: true })).toBeVisible();
    await expect(
      panel.getByRole('button', { name: /copy call notes only/i })
    ).toBeVisible();
  });

  test('copy button shows feedback on click', async ({ page, context }) => {
    // Grant clipboard permission
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await injectQueueItem(page);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const eAgentBtn = page.getByRole('button', { name: /log to eagent/i });
    await expect(eAgentBtn).toBeVisible({ timeout: 10000 });
    await eAgentBtn.click();

    const panel = page.getByRole('dialog', { name: /log to eagent/i });
    const copyBtn = panel.getByRole('button', { name: /copy eagent note/i });
    await copyBtn.click();

    // Button should change to "Copied!" feedback
    await expect(copyBtn).toHaveText(/copied/i);

    // Live region should announce
    await expect(panel.getByText('Copied to clipboard')).toBeVisible();
  });

  test('copy call notes only shows feedback', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await injectQueueItem(page);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const eAgentBtn = page.getByRole('button', { name: /log to eagent/i });
    await expect(eAgentBtn).toBeVisible({ timeout: 10000 });
    await eAgentBtn.click();

    const panel = page.getByRole('dialog', { name: /log to eagent/i });
    const callNotesBtn = panel.getByRole('button', { name: /copy call notes only/i });
    await callNotesBtn.click();

    await expect(callNotesBtn).toHaveText(/call notes copied/i);
  });

  test('marking done moves item to Already Logged section', async ({ page }) => {
    await injectQueueItem(page);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const eAgentBtn = page.getByRole('button', { name: /log to eagent/i });
    await expect(eAgentBtn).toBeVisible({ timeout: 10000 });
    await eAgentBtn.click();

    const panel = page.getByRole('dialog', { name: /log to eagent/i });
    const doneBtn = panel.getByRole('button', { name: /mark.*logged/i });
    await doneBtn.click();

    // Header should now show "No tasks to log"
    await expect(panel.getByText('No tasks to log').first()).toBeVisible();

    // Already logged section should appear
    const alreadyLoggedBtn = panel.getByRole('button', { name: /already logged/i });
    await expect(alreadyLoggedBtn).toBeVisible();
    await alreadyLoggedBtn.click();

    // Should show the exported item
    await expect(panel.getByText('Test Customer', { exact: true })).toBeVisible();
    await expect(
      panel.getByRole('button', { name: /remove all logged/i })
    ).toBeVisible();
  });

  test('badge disappears after marking all items as done', async ({ page }) => {
    await injectQueueItem(page);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const eAgentBtnWithBadge = page.getByRole('button', {
      name: /log to eagent.*1 pending/i,
    });
    await expect(eAgentBtnWithBadge).toBeVisible({ timeout: 10000 });

    await eAgentBtnWithBadge.click();

    const panel = page.getByRole('dialog', { name: /log to eagent/i });
    const doneBtn = panel.getByRole('button', { name: /mark.*logged/i });
    await doneBtn.click();

    // Close panel
    await panel.getByRole('button', { name: /close/i }).click();

    // Badge should be gone — button label should not mention "pending"
    const eAgentBtnNoBadge = page.getByRole('button', { name: 'Log to eAgent' });
    await expect(eAgentBtnNoBadge).toBeVisible();
  });

  test('close button dismisses panel', async ({ page }) => {
    const eAgentBtn = page.getByRole('button', { name: /log to eagent/i });
    await expect(eAgentBtn).toBeVisible({ timeout: 10000 });
    await eAgentBtn.click();

    const panel = page.getByRole('dialog', { name: /log to eagent/i });
    await expect(panel).toBeVisible();

    const closeBtn = panel.getByRole('button', { name: /close/i });
    await closeBtn.click();

    await expect(panel).not.toBeVisible();
  });

  test('clear all logged removes exported items', async ({ page }) => {
    // Inject an already-exported item
    await injectQueueItem(page, { exported: true });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const eAgentBtn = page.getByRole('button', { name: /log to eagent/i });
    await expect(eAgentBtn).toBeVisible({ timeout: 10000 });
    await eAgentBtn.click();

    const panel = page.getByRole('dialog', { name: /log to eagent/i });

    // Expand "Already logged" section
    const alreadyLoggedBtn = panel.getByRole('button', { name: /already logged/i });
    await expect(alreadyLoggedBtn).toBeVisible();
    await alreadyLoggedBtn.click();

    // Clear all
    const clearBtn = panel.getByRole('button', { name: /remove all logged/i });
    await clearBtn.click();

    // "Already logged" section should disappear
    await expect(alreadyLoggedBtn).not.toBeVisible();
  });
});
