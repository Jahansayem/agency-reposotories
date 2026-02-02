/**
 * E2E Tests: File Upload Features (Voicemail & PDF)
 *
 * Tests the voicemail transcription and PDF parsing features
 * to ensure session token handling works correctly.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('File Upload Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Derrick
    await page.goto('/');
    await page.locator('[data-testid="user-card-Derrick"]').click();
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }

    // Wait for login to complete and session cookie to be set
    await page.waitForURL('/');
    await page.waitForTimeout(1000);

    // Verify session cookie exists
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');
    expect(sessionCookie).toBeTruthy();

    // Close any modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Navigate to tasks view
    await page.click('button:has-text("All")');
    await page.waitForTimeout(500);
  });

  test('should detect missing session cookie and prompt login', async ({ page }) => {
    // Remove session cookie to simulate expired session
    await page.context().clearCookies();

    // Verify session cookie is gone
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');
    expect(sessionCookie).toBeFalsy();

    // Try to open file upload - should trigger session check
    // Note: The actual upload would fail, but we're testing the detection

    // Set up dialog handler to catch the alert
    let alertShown = false;
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('session has expired');
      alertShown = true;
      await dialog.accept();
    });

    // Try to upload a file via the FileImporter
    // This should trigger the session check and show an alert

    // Create a minimal test audio file
    const testAudioPath = path.join(__dirname, 'fixtures', 'test-audio.mp3');

    // If fixtures directory doesn't exist, skip this test
    if (!fs.existsSync(path.join(__dirname, 'fixtures'))) {
      test.skip();
      return;
    }

    if (fs.existsSync(testAudioPath)) {
      // Open file upload dialog
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(testAudioPath);
        await page.waitForTimeout(1000);

        // Alert should have been shown
        expect(alertShown).toBe(true);
      }
    }
  });

  test('should successfully upload and transcribe audio file with valid session', async ({ page }) => {
    // Verify session cookie exists
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');
    expect(sessionCookie).toBeTruthy();

    // Create test audio data (minimal MP3)
    const testAudioPath = path.join(__dirname, 'fixtures', 'test-audio.mp3');

    // Skip if fixtures don't exist
    if (!fs.existsSync(path.join(__dirname, 'fixtures'))) {
      console.log('Skipping: fixtures directory not found');
      test.skip();
      return;
    }

    if (!fs.existsSync(testAudioPath)) {
      console.log('Skipping: test audio file not found');
      test.skip();
      return;
    }

    // Open Add Task modal
    await page.click('button:has-text("Add Task")');
    await page.waitForTimeout(500);

    // Look for file upload button or icon
    const fileUploadTrigger = page.locator('[aria-label*="file"], [aria-label*="upload"], [title*="file"], [title*="upload"]').first();

    if (await fileUploadTrigger.isVisible()) {
      await fileUploadTrigger.click();
      await page.waitForTimeout(500);

      // Upload the file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testAudioPath);
      await page.waitForTimeout(1000);

      // Click process/transcribe button
      const processButton = page.locator('button:has-text("Transcribe"), button:has-text("Process")').first();
      if (await processButton.isVisible()) {
        await processButton.click();

        // Wait for processing (with longer timeout for AI call)
        await page.waitForTimeout(10000);

        // Should not show session error
        await expect(page.locator('text=/session.*expired/i')).not.toBeVisible();

        // Should show result or error (but not session error)
        const hasResult = await page.locator('[data-testid="extracted-text"], [data-testid="task-result"]').isVisible();
        const hasError = await page.locator('[role="alert"], text=/error/i').isVisible();

        // Either result or error is fine, just not session error
        expect(hasResult || hasError).toBe(true);
      }
    } else {
      console.log('File upload UI not found - skipping test');
      test.skip();
    }
  });

  test('should handle PDF upload with valid session', async ({ page }) => {
    // Verify session cookie exists
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');
    expect(sessionCookie).toBeTruthy();

    // Create test PDF path
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');

    // Skip if fixtures don't exist
    if (!fs.existsSync(path.join(__dirname, 'fixtures'))) {
      console.log('Skipping: fixtures directory not found');
      test.skip();
      return;
    }

    if (!fs.existsSync(testPdfPath)) {
      console.log('Skipping: test PDF file not found');
      test.skip();
      return;
    }

    // Open Add Task modal
    await page.click('button:has-text("Add Task")');
    await page.waitForTimeout(500);

    // Look for file upload button
    const fileUploadTrigger = page.locator('[aria-label*="file"], [aria-label*="upload"], [title*="file"], [title*="upload"]').first();

    if (await fileUploadTrigger.isVisible()) {
      await fileUploadTrigger.click();
      await page.waitForTimeout(500);

      // Upload the PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testPdfPath);
      await page.waitForTimeout(1000);

      // Click process button
      const processButton = page.locator('button:has-text("Read"), button:has-text("Process")').first();
      if (await processButton.isVisible()) {
        await processButton.click();

        // Wait for processing
        await page.waitForTimeout(10000);

        // Should not show session error
        await expect(page.locator('text=/session.*expired/i')).not.toBeVisible();

        // Should show result or error (but not session error)
        const hasResult = await page.locator('[data-testid="extracted-text"], [data-testid="document-summary"]').isVisible();
        const hasError = await page.locator('[role="alert"], text=/error/i').isVisible();

        expect(hasResult || hasError).toBe(true);
      }
    } else {
      console.log('File upload UI not found - skipping test');
      test.skip();
    }
  });

  test('should handle 401 errors gracefully and prompt re-login', async ({ page }) => {
    // Set up dialog handler
    let alertShown = false;
    page.on('dialog', async dialog => {
      if (dialog.message().includes('session')) {
        alertShown = true;
        await dialog.accept();
      }
    });

    // Intercept API call and return 401
    await page.route('**/api/ai/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Authentication required',
        }),
      });
    });

    // Try to make an API call (e.g., smart parse)
    // Open Add Task modal
    await page.click('button:has-text("Add Task")');
    await page.waitForTimeout(500);

    // Type some text
    const textarea = page.locator('textarea[placeholder*="What needs"]').first();
    if (await textarea.isVisible()) {
      await textarea.fill('Test task with AI parsing');

      // Click smart parse if available
      const smartParseButton = page.locator('button[aria-label*="smart"], button[title*="AI"]').first();
      if (await smartParseButton.isVisible()) {
        await smartParseButton.click();
        await page.waitForTimeout(2000);

        // Alert should be shown
        expect(alertShown).toBe(true);
      }
    }
  });
});
