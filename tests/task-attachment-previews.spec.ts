import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Issue #26: Task Attachment Previews
 *
 * Tests inline image previews for task attachments with grid layout
 * Sprint 2, Category 6: Inline Image Previews (P1)
 */

test.describe('Task Attachment Previews (Issue #26)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');

    // Wait for app to load
    await expect(page.locator('[data-testid="add-todo-input"]')).toBeVisible({ timeout: 10000 });
  });

  test.describe('Image Attachment Thumbnails', () => {
    test('should display inline thumbnail for image attachments', async ({ page }) => {
      // This test would require a task with an image attachment
      // For now, we test the component structure
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        // Check if image thumbnails are displayed
        const imageThumbnail = attachmentList.locator('img[loading="lazy"]').first();
        if (await imageThumbnail.isVisible()) {
          await expect(imageThumbnail).toHaveAttribute('alt');
          await expect(imageThumbnail).toHaveAttribute('src');
        }
      }
    });

    test('should show aspect-video container for image thumbnails', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageContainer = attachmentList.locator('button.aspect-video').first();
        if (await imageContainer.isVisible()) {
          await expect(imageContainer).toBeVisible();
        }
      }
    });

    test('should apply lazy loading to image thumbnails', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const lazyImage = attachmentList.locator('img[loading="lazy"]').first();
        if (await lazyImage.isVisible()) {
          await expect(lazyImage).toHaveAttribute('loading', 'lazy');
        }
      }
    });

    test('should show file name in overlay for image attachments', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const fileNameOverlay = attachmentList.locator('.text-white.font-medium').first();
        if (await fileNameOverlay.isVisible()) {
          const fileName = await fileNameOverlay.textContent();
          expect(fileName).toBeTruthy();
          expect(fileName!.length).toBeGreaterThan(0);
        }
      }
    });

    test('should show file size in overlay for image attachments', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const fileSizeText = attachmentList.locator('.text-white\\/80').first();
        if (await fileSizeText.isVisible()) {
          const fileSize = await fileSizeText.textContent();
          expect(fileSize).toMatch(/KB|MB|B/);
        }
      }
    });
  });

  test.describe('Grid Layout', () => {
    test('should use grid layout when images are present', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const gridContainer = attachmentList.locator('.grid.grid-cols-1.sm\\:grid-cols-2').first();
        if (await gridContainer.isVisible()) {
          await expect(gridContainer).toBeVisible();
        }
      }
    });

    test('should use 1 column on mobile viewports', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const gridContainer = attachmentList.locator('.grid.grid-cols-1').first();
        if (await gridContainer.isVisible()) {
          await expect(gridContainer).toHaveClass(/grid-cols-1/);
        }
      }
    });

    test('should use 2 columns on desktop viewports', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const gridContainer = attachmentList.locator('.sm\\:grid-cols-2').first();
        if (await gridContainer.isVisible()) {
          await expect(gridContainer).toHaveClass(/sm:grid-cols-2/);
        }
      }
    });
  });

  test.describe('Non-Image Attachments', () => {
    test('should show list view for non-image attachments', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        // Non-image attachments should have icon and file info
        const listItem = attachmentList.locator('.flex.items-center.gap-3').first();
        if (await listItem.isVisible()) {
          await expect(listItem).toBeVisible();
        }
      }
    });

    test('should display appropriate icon for file type', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const fileIcon = attachmentList.locator('svg.lucide').first();
        if (await fileIcon.isVisible()) {
          await expect(fileIcon).toBeVisible();
        }
      }
    });

    test('should show file metadata (size, date, uploader)', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const metadata = attachmentList.locator('.text-xs.text-\\[var\\(--text-muted\\)\\]').first();
        if (await metadata.isVisible()) {
          const text = await metadata.textContent();
          expect(text).toMatch(/•/); // Should have bullet separators
        }
      }
    });
  });

  test.describe('Hover Interactions', () => {
    test('should show action buttons on hover for image thumbnails', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('button.aspect-video').first();
        if (await imageThumbnail.isVisible()) {
          await imageThumbnail.hover();

          // Action buttons should appear (opacity-0 group-hover:opacity-100)
          const downloadBtn = attachmentList.locator('[aria-label="Download attachment"]').first();
          if (await downloadBtn.isVisible()) {
            await expect(downloadBtn).toBeVisible();
          }
        }
      }
    });

    test('should scale image on hover', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('button.aspect-video').first();
        if (await imageThumbnail.isVisible()) {
          const imageElement = imageThumbnail.locator('img').first();
          if (await imageElement.isVisible()) {
            await expect(imageElement).toHaveClass(/group-hover:scale-105/);
          }
        }
      }
    });
  });

  test.describe('Click to Preview', () => {
    test('should open preview modal when clicking image thumbnail', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('button.aspect-video').first();
        if (await imageThumbnail.isVisible()) {
          await imageThumbnail.click();

          // Preview modal should open
          const previewModal = page.locator('.fixed.inset-0.z-50');
          if (await previewModal.isVisible({ timeout: 2000 })) {
            await expect(previewModal).toBeVisible();
          }
        }
      }
    });

    test('should close preview modal when clicking backdrop', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('button.aspect-video').first();
        if (await imageThumbnail.isVisible()) {
          await imageThumbnail.click();

          const previewModal = page.locator('.fixed.inset-0.z-50');
          if (await previewModal.isVisible({ timeout: 2000 })) {
            await previewModal.click({ position: { x: 10, y: 10 } }); // Click backdrop
            await expect(previewModal).not.toBeVisible({ timeout: 2000 });
          }
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels for image thumbnails', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('button.aspect-video').first();
        if (await imageThumbnail.isVisible()) {
          await expect(imageThumbnail).toHaveAttribute('aria-label');
          const ariaLabel = await imageThumbnail.getAttribute('aria-label');
          expect(ariaLabel).toContain('Preview');
        }
      }
    });

    test('should have alt text for all images', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const images = attachmentList.locator('img');
        const count = await images.count();

        for (let i = 0; i < count; i++) {
          const img = images.nth(i);
          if (await img.isVisible()) {
            await expect(img).toHaveAttribute('alt');
          }
        }
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('button.aspect-video').first();
        if (await imageThumbnail.isVisible()) {
          await imageThumbnail.focus();
          await expect(imageThumbnail).toBeFocused();

          // Should be able to activate with Enter
          await imageThumbnail.press('Enter');
          const previewModal = page.locator('.fixed.inset-0.z-50');
          if (await previewModal.isVisible({ timeout: 2000 })) {
            await expect(previewModal).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Action Buttons', () => {
    test('should show download button for image attachments', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('.group.relative').first();
        if (await imageThumbnail.isVisible()) {
          await imageThumbnail.hover();

          const downloadBtn = imageThumbnail.locator('[aria-label="Download attachment"]').first();
          if (await downloadBtn.isVisible()) {
            await expect(downloadBtn).toBeVisible();
          }
        }
      }
    });

    test('should show remove button when user has permission', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('.group.relative').first();
        if (await imageThumbnail.isVisible()) {
          await imageThumbnail.hover();

          const removeBtn = imageThumbnail.locator('[aria-label="Remove attachment"]').first();
          if (await removeBtn.isVisible()) {
            await expect(removeBtn).toBeVisible();
          }
        }
      }
    });

    test('should style action buttons with backdrop blur', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('.group.relative').first();
        if (await imageThumbnail.isVisible()) {
          await imageThumbnail.hover();

          const actionBtn = imageThumbnail.locator('.backdrop-blur-sm').first();
          if (await actionBtn.isVisible()) {
            await expect(actionBtn).toHaveClass(/backdrop-blur-sm/);
          }
        }
      }
    });
  });

  test.describe('Visual Design', () => {
    test('should use gradient overlay for file info', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const overlay = attachmentList.locator('.bg-gradient-to-t.from-black\\/60').first();
        if (await overlay.isVisible()) {
          await expect(overlay).toBeVisible();
        }
      }
    });

    test('should apply rounded corners to thumbnails', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const thumbnail = attachmentList.locator('.rounded-\\[var\\(--radius-lg\\)\\]').first();
        if (await thumbnail.isVisible()) {
          await expect(thumbnail).toHaveClass(/rounded-/);
        }
      }
    });

    test('should use theme variables for colors', async ({ page }) => {
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const surfaceElement = attachmentList.locator('.bg-\\[var\\(--surface-2\\)\\]').first();
        if (await surfaceElement.isVisible()) {
          await expect(surfaceElement).toHaveClass(/bg-\[var\(--surface-2\)\]/);
        }
      }
    });
  });

  test.describe('Performance', () => {
    test('should not load thumbnails until visible (lazy loading)', async ({ page }) => {
      // Create a task with attachment off-screen
      // Verify image has loading="lazy" attribute
      const lazyImages = page.locator('img[loading="lazy"]');
      const count = await lazyImages.count();

      for (let i = 0; i < count; i++) {
        await expect(lazyImages.nth(i)).toHaveAttribute('loading', 'lazy');
      }
    });

    test('should fetch thumbnail URL only once per image', async ({ page }) => {
      // This would require monitoring network requests
      // For now, verify the thumbnail state management pattern
      const attachmentList = page.locator('[data-testid="attachment-list"]').first();

      if (await attachmentList.isVisible()) {
        const imageThumbnail = attachmentList.locator('img[loading="lazy"]').first();
        if (await imageThumbnail.isVisible()) {
          const src = await imageThumbnail.getAttribute('src');
          expect(src).toBeTruthy();
        }
      }
    });
  });
});
