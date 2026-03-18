import { test, expect, Page } from '@playwright/test';
import { loginAsUser } from './helpers/auth';
import { deleteTasksByPrefix } from './helpers/cleanup';

// Seeded test user (from 20260219_seed_e2e_test_data.sql)
const TEST_USER = 'Derrick';
const TEST_PIN = '8008';

// Prefix for tasks created by this test suite
const TASK_PREFIX = 'E2E_Import_';

test.describe('Content Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, TEST_USER, TEST_PIN);
  });

  test.afterEach(async ({ page }) => {
    await deleteTasksByPrefix(page, TASK_PREFIX, 10);
  });

  test('should show Import Email/Voicemail button when task is expanded', async ({ page }) => {
    const taskText = `${TASK_PREFIX}Q1 Planning ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });

    await page.locator(`text=${taskText}`).click();

    await expect(page.locator('button:has-text("Import Email/Voicemail")')).toBeVisible({ timeout: 3000 });
  });

  test('should open import modal when clicking Import Email/Voicemail button', async ({ page }) => {
    const taskText = `${TASK_PREFIX}Project Review ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });

    await page.locator(`text=${taskText}`).click();

    await page.locator('button:has-text("Import Email/Voicemail")').click();

    await expect(page.locator('text=Import as Subtasks')).toBeVisible({ timeout: 3000 });

    await expect(page.locator('p.font-medium:has-text("Paste Email")')).toBeVisible();
    await expect(page.locator('p.font-medium:has-text("Upload Audio")')).toBeVisible();
  });

  test('should close modal when clicking X button', async ({ page }) => {
    const taskText = `${TASK_PREFIX}Meeting Notes ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    await page.locator('button:has-text("Import Email/Voicemail")').click();
    await expect(page.locator('text=Import as Subtasks')).toBeVisible({ timeout: 3000 });

    await page.locator('button:has(svg.lucide-x)').click();

    await expect(page.locator('text=Import as Subtasks')).not.toBeVisible({ timeout: 3000 });
  });

  test('should switch between Email and Voicemail modes', async ({ page }) => {
    const taskText = `${TASK_PREFIX}Client Follow-up ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    await page.locator('button:has-text("Import Email/Voicemail")').click();
    await expect(page.locator('text=Import as Subtasks')).toBeVisible({ timeout: 3000 });

    await expect(page.locator('p.font-medium:has-text("Paste Email")')).toBeVisible();
    await expect(page.locator('p.font-medium:has-text("Upload Audio")')).toBeVisible();

    await page.locator('p.font-medium:has-text("Paste Email")').click();

    await expect(page.locator('textarea[placeholder*="Paste"]')).toBeVisible();

    await page.locator('text=← Back').click();

    await expect(page.locator('p.font-medium:has-text("Paste Email")')).toBeVisible();

    await page.locator('p.font-medium:has-text("Upload Audio")').click();

    await expect(page.locator('text=Click to upload audio file')).toBeVisible();
  });

  test('should parse email content and show extracted subtasks', async ({ page }) => {
    test.skip(process.env.ANTHROPIC_API_KEY === undefined, 'Requires ANTHROPIC_API_KEY');

    const taskText = `${TASK_PREFIX}Q1 Product Launch ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    await page.locator('button:has-text("Import Email/Voicemail")').click();
    await expect(page.locator('text=Import as Subtasks')).toBeVisible({ timeout: 3000 });

    await page.locator('p.font-medium:has-text("Paste Email")').click();

    const testEmail = `Hi Team,

Following up on our Monday meeting about the Q1 product launch.

First, the marketing brochures need to be finalized by January 15th.
Also, the social media calendar needs to be drafted.
Don't forget to complete the API documentation.
We also need to fix the authentication bug (ticket #4521).

Thanks,
Michael`;

    await page.locator('textarea[placeholder*="Paste"]').fill(testEmail);

    await page.locator('button:has-text("Extract Subtasks")').click();

    await expect(page.locator('text=Extracting action items')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=subtasks found')).toBeVisible({ timeout: 30000 });

    await expect(page.locator('button:has-text("Add"):has-text("Subtasks")')).toBeVisible();
  });

  test('should add selected subtasks to task', async ({ page }) => {
    test.skip(process.env.ANTHROPIC_API_KEY === undefined, 'Requires ANTHROPIC_API_KEY');

    const taskText = `${TASK_PREFIX}Team Meeting ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    await page.locator('button:has-text("Import Email/Voicemail")').click();
    await expect(page.locator('text=Import as Subtasks')).toBeVisible({ timeout: 3000 });

    await page.locator('p.font-medium:has-text("Paste Email")').click();

    const testEmail = `Please review the quarterly report by Friday. Also, schedule the team sync meeting for next week.`;

    await page.locator('textarea[placeholder*="Paste"]').fill(testEmail);

    await page.locator('button:has-text("Extract Subtasks")').click();

    await expect(page.locator('text=subtasks found')).toBeVisible({ timeout: 30000 });

    await page.locator('button:has-text("Add"):has-text("Subtask")').click();

    await expect(page.locator('text=Import as Subtasks')).not.toBeVisible({ timeout: 3000 });

    const taskRow = page.locator(`text=${taskText}`).locator('..').locator('..');
    await expect(taskRow.locator('button:has-text("/")')).toBeVisible({ timeout: 5000 });
  });

  test('should show Import button even when task has existing subtasks', async ({ page }) => {
    test.skip(process.env.ANTHROPIC_API_KEY === undefined, 'Requires ANTHROPIC_API_KEY');

    const taskText = `${TASK_PREFIX}Budget Review ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    await page.locator('button:has-text("Break into subtasks")').click();

    await expect(page.locator('text=Progress')).toBeVisible({ timeout: 30000 });

    await expect(page.locator('button:has-text("Import Email/Voicemail")')).toBeVisible();
  });
});

test.describe('Content Import API', () => {
  test('should return proper structure from parse-content-to-subtasks API', async ({ request }) => {
    test.skip(process.env.ANTHROPIC_API_KEY === undefined, 'Requires ANTHROPIC_API_KEY');

    const response = await request.post('/api/ai/parse-content-to-subtasks', {
      data: {
        content: 'Please finalize the budget by Friday. Also review the contract draft and send it to legal. Make sure to update the project timeline.',
        contentType: 'email',
        parentTaskText: 'Q1 Planning'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.subtasks).toBeDefined();
    expect(Array.isArray(data.subtasks)).toBe(true);
    expect(data.subtasks.length).toBeGreaterThanOrEqual(2);

    for (const subtask of data.subtasks) {
      expect(subtask.text).toBeDefined();
      expect(typeof subtask.text).toBe('string');
      expect(subtask.priority).toBeDefined();
      expect(['low', 'medium', 'high', 'urgent']).toContain(subtask.priority);
    }
  });

  test('should handle missing content gracefully', async ({ request }) => {
    const response = await request.post('/api/ai/parse-content-to-subtasks', {
      data: {}
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  test('should handle empty content gracefully', async ({ request }) => {
    const response = await request.post('/api/ai/parse-content-to-subtasks', {
      data: {
        content: '',
        contentType: 'email'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  test('should handle content with no action items', async ({ request }) => {
    test.skip(process.env.ANTHROPIC_API_KEY === undefined, 'Requires ANTHROPIC_API_KEY');

    const response = await request.post('/api/ai/parse-content-to-subtasks', {
      data: {
        content: 'Thanks for the update. Have a great day!',
        contentType: 'email',
        parentTaskText: 'Random email'
      }
    });

    const data = await response.json();
    expect(data.success).toBeDefined();
  });
});
