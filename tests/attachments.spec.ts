import { test, expect, Page } from '@playwright/test';

// Helper to register a new user and login
async function registerAndLogin(page: Page, userName: string = 'Test User', pin: string = '1234') {
  await page.goto('/');

  // Wait for login screen to load
  await expect(page.locator('h1:has-text("Bealer Agency")')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Task Management')).toBeVisible({ timeout: 5000 });

  // Click "Add New User" button
  await page.locator('button:has-text("Add New User")').click();

  // Wait for registration screen
  await expect(page.locator('input[placeholder="Enter your name"]')).toBeVisible({ timeout: 5000 });

  // Fill in name
  await page.locator('input[placeholder="Enter your name"]').fill(userName);

  // Enter PIN (4 digit inputs)
  const pinInputs = page.locator('input[type="password"]');
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(pin[i]);
  }

  // Enter confirm PIN
  for (let i = 4; i < 8; i++) {
    await pinInputs.nth(i).fill(pin[i - 4]);
  }

  // Click Create Account button
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Wait for app to load
  await expect(page.locator('textarea[placeholder*="task"]')).toBeVisible({ timeout: 10000 });
}

// Generate unique test user name
function uniqueUserName() {
  return `T${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

test.describe('Attachment Feature', () => {
  test.beforeEach(async ({ page }) => {
    const userName = uniqueUserName();
    await registerAndLogin(page, userName);
  });

  test('should show attachments section when task is expanded', async ({ page }) => {
    // Add a task
    const taskText = `Task with attachments ${Date.now()}`;
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

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
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

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
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

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
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

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
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

    // Wait for task and expand it
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${taskText}`).click();

    // Should show empty state message
    await expect(page.locator('text=No attachments yet')).toBeVisible({ timeout: 3000 });
  });

  test('should show file size limit info in upload modal', async ({ page }) => {
    // Add a task
    const taskText = `Test size limit ${Date.now()}`;
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

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
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

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
  test.beforeEach(async ({ page }) => {
    const userName = uniqueUserName();
    await registerAndLogin(page, userName);
  });

  test('should not show attachment section for completed tasks', async ({ page }) => {
    // Add and complete a task
    const taskText = `Completed task ${Date.now()}`;
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

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
    await page.locator('textarea[placeholder*="task"]').fill(taskText);
    await page.locator('button:has-text("Add")').click();

    // Wait for task to appear
    await expect(page.locator(`text=${taskText}`)).toBeVisible({ timeout: 5000 });

    // Initially, no attachment indicator should be visible
    const taskItem = page.locator(`div:has-text("${taskText}")`).first();
    await expect(taskItem.locator('button:has(svg.lucide-paperclip)')).not.toBeVisible({ timeout: 2000 });
  });
});
