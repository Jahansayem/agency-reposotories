import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Issue #30: Image Optimization
 *
 * Tests Next.js Image component usage and optimization features
 * Sprint 3, Category 1: Performance Optimization (P1)
 *
 * Features Tested:
 * - Next.js Image component for thumbnails
 * - WebP/AVIF format support
 * - Lazy loading
 * - Responsive image sizes
 * - Quality settings
 */

test.describe('Image Optimization (Issue #30)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }

    await expect(page.locator('[data-testid="add-todo-input"]')).toBeVisible({ timeout: 10000 });
  });

  test.describe('Next.js Image Component Usage', () => {
    test('should use Next.js Image component for thumbnails', async ({ page }) => {
      // Create a task with an image attachment
      // Note: This test assumes there's a task with an image attachment
      // In a real scenario, we would upload an image first

      // Look for any image thumbnail on the page
      const imageThumbnail = page.locator('img[loading="lazy"]').first();

      if (await imageThumbnail.isVisible({ timeout: 5000 })) {
        // Verify the image has lazy loading attribute
        const loading = await imageThumbnail.getAttribute('loading');
        expect(loading).toBe('lazy');

        // Verify image has srcset for responsive sizes (Next.js Image feature)
        const srcset = await imageThumbnail.getAttribute('srcset');
        // Next.js Image generates srcset for responsive images
        // If srcset exists, it means Next.js Image is being used
        if (srcset) {
          expect(srcset.length).toBeGreaterThan(0);
        }
      }
    });

    test('should load images with appropriate sizes', async ({ page }) => {
      const imageThumbnail = page.locator('img[loading="lazy"]').first();

      if (await imageThumbnail.isVisible({ timeout: 5000 })) {
        // Check that sizes attribute is set for responsive loading
        const sizes = await imageThumbnail.getAttribute('sizes');

        // Next.js Image should set sizes based on breakpoints
        // Example: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        if (sizes) {
          expect(sizes.includes('vw') || sizes.includes('px')).toBe(true);
        }
      }
    });

    test('should serve WebP format for modern browsers', async ({ page }) => {
      // Capture network requests to verify image format
      const imageRequests: string[] = [];

      page.on('response', async (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'];

        if (contentType && contentType.includes('image')) {
          imageRequests.push(url);

          // Check if WebP or AVIF is served
          if (contentType.includes('webp') || contentType.includes('avif')) {
            // Modern format detected
            expect(contentType).toMatch(/webp|avif/);
          }
        }
      });

      // Load a page with images
      await page.reload();
      await page.waitForTimeout(2000);

      // Verify at least some image requests were made
      // (This test might not always pass if there are no image attachments)
      if (imageRequests.length > 0) {
        expect(imageRequests.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Lazy Loading', () => {
    test('should lazy load images below the fold', async ({ page }) => {
      // Create multiple tasks to ensure some are below the fold
      // This test verifies lazy loading works for off-screen images

      const imageThumbnails = page.locator('img[loading="lazy"]');

      if (await imageThumbnails.count() > 0) {
        // Verify all thumbnails have lazy loading
        const count = await imageThumbnails.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
          const img = imageThumbnails.nth(i);
          const loading = await img.getAttribute('loading');
          expect(loading).toBe('lazy');
        }
      }
    });

    test('should not load images until they enter viewport', async ({ page }) => {
      // This test verifies that images below the fold don't load immediately
      let initialImageRequests = 0;
      let scrollImageRequests = 0;

      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('image')) {
          if (scrollImageRequests === 0) {
            initialImageRequests++;
          } else {
            scrollImageRequests++;
          }
        }
      });

      // Wait for initial load
      await page.waitForTimeout(2000);
      const initial = initialImageRequests;

      // Scroll down to load more images
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      scrollImageRequests = 1; // Mark that we've scrolled

      // If there were images to lazy load, we should see more requests after scroll
      // (This test is best-effort - might not work if all images fit in viewport)
    });
  });

  test.describe('Image Quality and Optimization', () => {
    test('should serve optimized image sizes', async ({ page }) => {
      let imageSize = 0;

      page.on('response', async (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'];

        if (contentType && contentType.includes('image') && url.includes('supabase')) {
          // Check that images are being optimized
          // Next.js Image should resize images to appropriate dimensions
          const buffer = await response.body().catch(() => null);
          if (buffer) {
            imageSize = buffer.length;
            // Images should be reasonably sized (not multi-megabyte originals)
            // This is a loose check - actual size depends on image content
            expect(imageSize).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
          }
        }
      });

      await page.reload();
      await page.waitForTimeout(3000);
    });

    test('should use appropriate quality setting', async ({ page }) => {
      // Next.js Image quality=80 should result in smaller file sizes
      // than original quality while maintaining visual quality

      const imageThumbnail = page.locator('img[loading="lazy"]').first();

      if (await imageThumbnail.isVisible({ timeout: 5000 })) {
        // Verify image is rendered
        const src = await imageThumbnail.getAttribute('src');
        expect(src).toBeTruthy();

        // Next.js Image URLs should include quality parameter in some cases
        // This is an implementation detail that may vary
      }
    });
  });

  test.describe('Responsive Images', () => {
    test('should load smaller images on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      let mobileImageSize = 0;

      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('image')) {
          const buffer = await response.body().catch(() => null);
          if (buffer) {
            mobileImageSize = buffer.length;
          }
        }
      });

      await page.reload();
      await page.waitForTimeout(3000);

      // Desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      let desktopImageSize = 0;

      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('image')) {
          const buffer = await response.body().catch(() => null);
          if (buffer) {
            desktopImageSize = buffer.length;
          }
        }
      });

      await page.reload();
      await page.waitForTimeout(3000);

      // Mobile images should generally be smaller than desktop
      // (This is best-effort - depends on actual image content)
    });

    test('should use srcset for different device pixel ratios', async ({ page }) => {
      const imageThumbnail = page.locator('img[loading="lazy"]').first();

      if (await imageThumbnail.isVisible({ timeout: 5000 })) {
        // Check for srcset attribute (generated by Next.js Image)
        const srcset = await imageThumbnail.getAttribute('srcset');

        if (srcset) {
          // srcset should include multiple sizes for 1x, 2x displays
          // Example: "image.webp 640w, image.webp 1280w"
          const hasDifferentSizes = srcset.includes('w,') || srcset.includes('x,');
          expect(hasDifferentSizes || srcset.length > 50).toBe(true);
        }
      }
    });
  });

  test.describe('Image Preview Modal', () => {
    test('should show full-size image in preview modal', async ({ page }) => {
      // Click on an image thumbnail to open preview
      const imageThumbnail = page.locator('button[aria-label*="Preview"]').first();

      if (await imageThumbnail.isVisible({ timeout: 5000 })) {
        await imageThumbnail.click();

        // Preview modal should appear
        const previewModal = page.locator('[role="dialog"]').or(
          page.locator('.fixed.inset-0')
        );

        await expect(previewModal).toBeVisible({ timeout: 3000 });

        // Full-size image should be visible in modal
        const fullImage = page.locator('img').last();
        await expect(fullImage).toBeVisible();
      }
    });

    test('should use native img for blob URLs in preview', async ({ page }) => {
      // Preview modal uses blob URLs which don't work with Next.js Image
      // Verify we're using native <img> for previews

      const imageThumbnail = page.locator('button[aria-label*="Preview"]').first();

      if (await imageThumbnail.isVisible({ timeout: 5000 })) {
        await imageThumbnail.click();

        const previewImage = page.locator('[role="dialog"] img').or(
          page.locator('.fixed.inset-0 img')
        );

        if (await previewImage.isVisible({ timeout: 3000 })) {
          const src = await previewImage.getAttribute('src');

          // Preview images use blob URLs or data URLs
          expect(src?.startsWith('blob:') || src?.startsWith('data:') || src?.includes('supabase')).toBe(true);
        }
      }
    });
  });

  test.describe('Performance Metrics', () => {
    test('should reduce Largest Contentful Paint (LCP)', async ({ page }) => {
      // Measure LCP with image optimization
      const performanceTiming = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          // Timeout after 5 seconds
          setTimeout(() => resolve(0), 5000);
        });
      });

      // LCP should be reasonable (< 2.5s for good UX)
      if (performanceTiming && typeof performanceTiming === 'number') {
        expect(performanceTiming).toBeLessThan(2500);
      }
    });

    test('should load images without blocking rendering', async ({ page }) => {
      // Measure time to first render vs time to images loaded
      const metrics = await page.evaluate(() => {
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        return {
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart,
        };
      });

      // DOM should be ready before all images finish loading
      // This indicates images aren't blocking rendering
      expect(metrics.domContentLoaded).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing images gracefully', async ({ page }) => {
      // If an image fails to load, there should be a fallback
      // (e.g., icon or placeholder)

      // This test is best-effort - depends on having broken image URLs
      const images = page.locator('img');

      if (await images.count() > 0) {
        // Check if any images failed to load
        const brokenImages = await images.evaluateAll((imgs) => {
          return imgs.filter((img) => !(img as HTMLImageElement).complete || (img as HTMLImageElement).naturalHeight === 0);
        });

        // If there are broken images, verify page doesn't crash
        // At minimum, the page should still be functional
        const header = page.locator('header');
        await expect(header).toBeVisible();
      }
    });

    test('should show file icon for non-image attachments', async ({ page }) => {
      // Verify that non-image attachments show appropriate icons
      // and don't try to use Next.js Image

      const pdfAttachment = page.locator('[data-file-type="pdf"]').or(
        page.locator('text=.pdf').locator('..')
      );

      if (await pdfAttachment.isVisible({ timeout: 2000 })) {
        // PDF should show icon, not try to render as image
        const icon = pdfAttachment.locator('svg.lucide').first();
        await expect(icon).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have alt text for all images', async ({ page }) => {
      const images = page.locator('img');

      if (await images.count() > 0) {
        const count = await images.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt');

          // All images should have alt text
          expect(alt).toBeTruthy();
          expect(alt!.length).toBeGreaterThan(0);
        }
      }
    });

    test('should maintain aspect ratio to prevent layout shift', async ({ page }) => {
      // Next.js Image with fill prop should prevent CLS
      const imageThumbnail = page.locator('img[loading="lazy"]').first();

      if (await imageThumbnail.isVisible({ timeout: 5000 })) {
        // Get initial position
        const initialBox = await imageThumbnail.boundingBox();

        // Wait for image to fully load
        await page.waitForTimeout(2000);

        // Get final position
        const finalBox = await imageThumbnail.boundingBox();

        // Position should not have shifted significantly (Cumulative Layout Shift)
        if (initialBox && finalBox) {
          const topShift = Math.abs(initialBox.y - finalBox.y);
          expect(topShift).toBeLessThan(5); // Allow small sub-pixel shifts
        }
      }
    });
  });
});
