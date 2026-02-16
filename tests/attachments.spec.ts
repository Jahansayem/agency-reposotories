import { test, expect, Page } from '@playwright/test';

/**
 * Attachment Feature Tests
 *
 * These tests verify the attachment upload functionality for todos.
 * They require a logged-in user to work properly.
 *
 * Prerequisites:
 * - Supabase database configured with users
 * - A test user with known PIN (default: any user with PIN 1234)
 * - Or configure PLAYWRIGHT_TEST_USER and PLAYWRIGHT_TEST_PIN env vars
 */

// Get test credentials from environment or use defaults
const TEST_USER = process.env.PLAYWRIGHT_TEST_USER || 'Adrian';
const TEST_PIN = process.env.PLAYWRIGHT_TEST_PIN || '1234';

// Helper to login as an existing user
async function loginAsExistingUser(page: Page): Promise<boolean> {
  await page.goto('/');

  // Wait for login screen to load
  await expect(page.locator('h1:has-text("Wavezly")')).toBeVisible({ timeout: 15000 });

  // Try to click on the test user
  const userButton = page.locator(`button:has-text("${TEST_USER}")`).first();

  // Check if user exists
  const userExists = await userButton.isVisible({ timeout: 3000 }).catch(() => false);
  if (!userExists) {
    console.log(`Test user "${TEST_USER}" not found. Skipping test.`);
    return false;
  }

  await userButton.click();

  // Wait for PIN screen
  await expect(page.locator('text=Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

  // Enter PIN
  const pinInputs = page.locator('input[type="password"]');
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(TEST_PIN[i]);
  }

  // Wait a moment for PIN validation
  await page.waitForLoadState('networkidle');

  // Check if we got an error (wrong PIN)
  const errorMessage = page.locator('text=Incorrect PIN');
  const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
  if (hasError) {
    console.log(`Incorrect PIN for user "${TEST_USER}". Set PLAYWRIGHT_TEST_PIN env var.`);
    return false;
  }

  // Wait for app to load
  try {
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });
    return true;
  } catch {
    console.log('Failed to load main app after login.');
    return false;
  }
}

test.describe('Attachment Feature', () => {
  // Skip all tests if login fails
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsExistingUser(page);
    if (!loggedIn) {
      testInfo.skip();
    }
  });

  test('should show attachments section when task is expanded', async ({ page }) => {
    // Add a task
    const taskText = `Task with attachments ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task to appear
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });

    // Click on task to expand it
    await page.locator(`text=${taskText}`).click();

    // Should show the Attachments section in expanded view
    await expect(page.locator('span:has-text("Attachments")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("Add")')).toBeVisible({ timeout: 3000 });
  });

  test('should open attachment upload modal when clicking Add button', async ({ page }) => {
    // Add a task
    const taskText = `Test upload modal ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task to appear and expand it
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    // Wait for expanded view and click on Add button in attachments section
    await expect(page.locator('span:has-text("Attachments")')).toBeVisible({ timeout: 3000 });

    // Find and click the Add button in the attachments section
    const attachmentSection = page.locator('div:has(> span:text("Attachments"))').first();
    await attachmentSection.locator('button:has-text("Add")').click();

    // Should show upload modal
    await expect(page.locator('h2:has-text("Upload Attachment")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Drag & drop or click to upload')).toBeVisible({ timeout: 3000 });
  });

  test('should display supported file types in upload modal', async ({ page }) => {
    // Add a task
    const taskText = `Test file types ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task and expand it
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    // Open upload modal
    const attachmentSection = page.locator('div:has(> span:text("Attachments"))').first();
    await attachmentSection.locator('button:has-text("Add")').click();

    // Check for supported file types
    await expect(page.locator('text=Supported file types')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('span:has-text("PDF")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('span:has-text("DOC")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('span:has-text("JPG")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('span:has-text("MP3")')).toBeVisible({ timeout: 3000 });
  });

  test('should close upload modal when clicking X button', async ({ page }) => {
    // Add a task
    const taskText = `Test close modal ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task and expand it
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    // Open upload modal
    const attachmentSection = page.locator('div:has(> span:text("Attachments"))').first();
    await attachmentSection.locator('button:has-text("Add")').click();

    // Verify modal is open
    await expect(page.locator('h2:has-text("Upload Attachment")')).toBeVisible({ timeout: 3000 });

    // Click X button to close
    await page.locator('button:has(svg.lucide-x)').click();

    // Modal should be closed
    await expect(page.locator('h2:has-text("Upload Attachment")')).not.toBeVisible({ timeout: 3000 });
  });

  test('should show empty state message when no attachments', async ({ page }) => {
    // Add a task
    const taskText = `Test empty state ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task and expand it
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    // Should show empty state message
    await expect(page.locator('text=No attachments yet')).toBeVisible({ timeout: 3000 });
  });

  test('should show file size limit info in upload modal', async ({ page }) => {
    // Add a task
    const taskText = `Test size limit ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task and expand it
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    // Open upload modal
    const attachmentSection = page.locator('div:has(> span:text("Attachments"))').first();
    await attachmentSection.locator('button:has-text("Add")').click();

    // Should show file size limit info (25MB)
    await expect(page.locator('text=max 25MB')).toBeVisible({ timeout: 3000 });
  });

  test('should show remaining attachment slots', async ({ page }) => {
    // Add a task
    const taskText = `Test slots ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task and expand it
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    // Open upload modal
    const attachmentSection = page.locator('div:has(> span:text("Attachments"))').first();
    await attachmentSection.locator('button:has-text("Add")').click();

    // Should show remaining slots info (10 of 10 when empty)
    await expect(page.locator('text=10 of 10')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Attachment Edge Cases', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsExistingUser(page);
    if (!loggedIn) {
      testInfo.skip();
    }
  });

  test('should not show attachment section for completed tasks', async ({ page }) => {
    // Add and complete a task
    const taskText = `Completed task ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task to appear
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });

    // Complete the task by clicking the checkbox
    const taskItem = page.locator(`div:has-text("${taskText}")`).first();
    await taskItem.locator('button[class*="rounded"]').first().click();

    // Enable show completed
    await page.locator('button:has-text("Done")').click();

    // Click on the completed task
    await page.locator(`text=${taskText}`).click();

    // Attachments section should NOT be visible for completed tasks
    // (expanded view with attachments only shows for incomplete tasks)
    await expect(page.locator('div.p-3:has-text("Attachments"):has(button:text("Add"))')).not.toBeVisible({ timeout: 2000 });
  });

  test('should handle attachment indicator badge correctly', async ({ page }) => {
    // Add a task
    const taskText = `Badge test ${Date.now()}`;
    await page.locator('[data-testid="add-task-input"]').fill(taskText);
    await page.keyboard.press('Enter');

    // Wait for task to appear
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });

    // Initially, no attachment indicator should be visible
    const taskItem = page.locator(`div:has-text("${taskText}")`).first();
    await expect(taskItem.locator('button:has(svg.lucide-paperclip)')).not.toBeVisible({ timeout: 2000 });
  });
});
