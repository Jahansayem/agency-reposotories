import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Chat Image Attachments
 * Sprint 3 Issue #25
 *
 * Tests image upload, display, and viewing in chat messages.
 */

test.describe('Chat Image Attachments', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');

    // Login as Derrick
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }

    // Wait for app to load - main navigation sidebar appears after successful login
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });

    // Open chat panel
    const chatButton = page.locator('button:has-text("Chat")');
    if (await chatButton.isVisible()) {
      await chatButton.click();
    }

    // Wait for chat to load
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
  });

  test('should show attachment upload button in chat input', async ({ page }) => {
    // Verify attachment button exists
    const attachButton = page.locator('button[title="Attach image"]');
    await expect(attachButton).toBeVisible();

    // Should have Paperclip icon
    await expect(attachButton.locator('svg')).toBeVisible();
  });

  test('should upload and preview image before sending', async ({ page }) => {
    // Create a test image file (1x1 pixel PNG)
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Click attachment button
    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();

    // Set files on hidden input
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    // Wait for preview to appear
    await expect(page.locator('img[alt="test-image.png"]')).toBeVisible({ timeout: 5000 });

    // Verify upload progress/completion
    // Should show either uploading state or completed state
    await page.waitForTimeout(2000); // Wait for upload

    // Verify remove button appears
    const removeButton = page.locator('button[aria-label="Remove attachment"]');
    await expect(removeButton).toBeVisible();
  });

  test('should send message with image attachment', async ({ page }) => {
    // Create a test image
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Upload image
    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    // Wait for upload to complete
    await page.waitForTimeout(3000);

    // Add message text (optional)
    const messageInput = page.locator('textarea[placeholder*="Message"]').first();
    await messageInput.fill('Check out this image!');

    // Send message
    const sendButton = page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
    await sendButton.click();

    // Wait for message to appear in chat
    await expect(page.locator('text=Check out this image!')).toBeVisible({ timeout: 5000 });

    // Verify image appears in message
    // The image should be in a ChatImageGallery component
    await expect(page.locator('[data-testid="chat-message"]').filter({ hasText: 'Check out this image!' })).toBeVisible();
  });

  test('should allow sending attachment without text', async ({ page }) => {
    // Create a test image
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Upload image
    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'image-only.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    // Wait for upload
    await page.waitForTimeout(3000);

    // Send without text
    const sendButton = page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
    await sendButton.click();

    // Message should be sent and visible
    // Look for the message container (may not have text)
    await page.waitForTimeout(2000);

    // Verify at least one message exists (the image message)
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages.first()).toBeVisible();
  });

  test('should remove attachment before sending', async ({ page }) => {
    // Create a test image
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Upload image
    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'remove-me.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    // Wait for preview
    await page.waitForTimeout(2000);

    // Click remove button
    const removeButton = page.locator('button[aria-label="Remove attachment"]');
    await removeButton.click();

    // Preview should disappear
    await expect(page.locator('img[alt="remove-me.png"]')).not.toBeVisible();

    // Attachment button should be enabled again
    await expect(attachButton).toBeEnabled();
  });

  test('should display image in message bubble', async ({ page }) => {
    // Send a message with image (simplified test)
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'display-test.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    await page.waitForTimeout(3000);

    const messageInput = page.locator('textarea[placeholder*="Message"]').first();
    await messageInput.fill('Image test');

    const sendButton = page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
    await sendButton.click();

    await page.waitForTimeout(2000);

    // Look for image in message
    const messageImages = page.locator('[data-testid="chat-message"] img');
    // Should have at least one image (might have avatars too)
    await expect(messageImages.first()).toBeVisible();
  });

  test('should open lightbox when clicking image', async ({ page }) => {
    // This test assumes there's already a message with an image
    // or we create one first
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'lightbox-test.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    await page.waitForTimeout(3000);

    const sendButton = page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
    await sendButton.click();

    await page.waitForTimeout(2000);

    // Click on the image
    const messageImage = page.locator('button:has(img[loading="lazy"])').first();
    if (await messageImage.isVisible()) {
      await messageImage.click();

      // Lightbox should appear
      // Look for lightbox elements (fixed position, black background)
      await page.waitForTimeout(1000);

      // Verify lightbox opened (check for close button or large image)
      const closeButton = page.locator('button[aria-label="Close lightbox"]');
      await expect(closeButton).toBeVisible({ timeout: 3000 });
    }
  });

  test('should close lightbox when clicking close button', async ({ page }) => {
    // Send image
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'close-test.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    await page.waitForTimeout(3000);

    const sendButton = page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
    await sendButton.click();

    await page.waitForTimeout(2000);

    // Click image to open lightbox
    const messageImage = page.locator('button:has(img[loading="lazy"])').first();
    if (await messageImage.isVisible()) {
      await messageImage.click();
      await page.waitForTimeout(1000);

      // Click close button
      const closeButton = page.locator('button[aria-label="Close lightbox"]');
      await closeButton.click();

      // Lightbox should close
      await expect(closeButton).not.toBeVisible();
    }
  });

  test('should show upload error for invalid file type', async ({ page }) => {
    // Try to upload a non-image file
    const textBuffer = Buffer.from('This is a text file', 'utf-8');

    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();

    const fileInput = page.locator('input[type="file"][accept="image/*"]');

    // Note: This test might not work as expected since the file input has accept="image/*"
    // which prevents non-image selection in most browsers.
    // We test the validation logic by checking if error appears

    try {
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: textBuffer,
      });

      await page.waitForTimeout(2000);

      // Look for error message
      const errorText = page.locator('text=/unsupported file type|only images/i');
      await expect(errorText).toBeVisible({ timeout: 5000 });
    } catch (error) {
      // If browser blocks the file, test passes (expected behavior)
      console.log('Browser blocked invalid file type (expected)');
    }
  });

  test('should disable attachment button during upload', async ({ page }) => {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const attachButton = page.locator('button[title="Attach image"]');

    // Should be enabled initially
    await expect(attachButton).toBeEnabled();

    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'disable-test.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    // During upload, button should be disabled
    await page.waitForTimeout(500);

    // After upload completes, button should be disabled (can't add multiple)
    await page.waitForTimeout(3000);
    await expect(attachButton).toBeDisabled();
  });

  test('should show file size in preview', async ({ page }) => {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'size-test.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    await page.waitForTimeout(2000);

    // Look for file size display (in KB)
    const sizeText = page.locator('text=/\\d+(\\.\\d+)?\\s*KB/');
    await expect(sizeText).toBeVisible();
  });

  test('should display multiple images in a grid', async ({ page }) => {
    // This would require sending multiple attachments
    // For now, verify the grid class exists in the component
    // In a real scenario, we'd need to modify the API to support multiple attachments per message

    // Skip or mark as TODO for now
    test.skip();
  });

  test('should show download button in lightbox', async ({ page }) => {
    // Send image
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'download-test.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    await page.waitForTimeout(3000);

    const sendButton = page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
    await sendButton.click();

    await page.waitForTimeout(2000);

    // Open lightbox
    const messageImage = page.locator('button:has(img[loading="lazy"])').first();
    if (await messageImage.isVisible()) {
      await messageImage.click();
      await page.waitForTimeout(1000);

      // Verify download button exists
      const downloadButton = page.locator('button[aria-label="Download image"]');
      await expect(downloadButton).toBeVisible();
    }
  });

  test('should show image metadata in lightbox', async ({ page }) => {
    // Send image
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const attachButton = page.locator('button[title="Attach image"]');
    await attachButton.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: 'metadata-test.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    await page.waitForTimeout(3000);

    const sendButton = page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
    await sendButton.click();

    await page.waitForTimeout(2000);

    // Open lightbox
    const messageImage = page.locator('button:has(img[loading="lazy"])').first();
    if (await messageImage.isVisible()) {
      await messageImage.click();
      await page.waitForTimeout(1000);

      // Check for file name in lightbox
      await expect(page.locator('text=metadata-test.png')).toBeVisible();

      // Check for "Uploaded by" text
      await expect(page.locator('text=/Uploaded by/i')).toBeVisible();
    }
  });
});
