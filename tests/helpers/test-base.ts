/**
 * Custom Playwright Test Base
 *
 * Extends the default Playwright test with fixtures that:
 * 1. Hide the Next.js dev overlay (<nextjs-portal>) to prevent pointer event interception
 * 2. This is especially important for mobile emulators where the overlay can block clicks
 *
 * Usage: Import { test, expect } from './helpers/test-base' instead of '@playwright/test'
 */

import { test as base, expect } from '@playwright/test';

/**
 * CSS to hide the Next.js dev overlay and prevent it from intercepting pointer events.
 * The <nextjs-portal> element contains the error overlay and dev indicators.
 * On mobile viewports, this element can intercept touch events causing test failures.
 */
const HIDE_DEV_OVERLAY_CSS = `
  /* Hide Next.js dev overlay to prevent pointer event interception */
  nextjs-portal {
    display: none !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }

  /* Also hide the script that may contain dev overlay triggers */
  script[data-nextjs-dev-overlay] {
    display: none !important;
  }

  /* Hide any error overlay containers */
  [data-nextjs-error-overlay],
  [data-nextjs-error] {
    display: none !important;
    pointer-events: none !important;
  }
`;

/**
 * Script to remove the dev overlay element entirely from the DOM.
 * This runs before each navigation to ensure the overlay doesn't interfere.
 */
const REMOVE_DEV_OVERLAY_SCRIPT = `
  // Remove Next.js dev overlay to prevent pointer event interception
  (function hideDevOverlay() {
    const removeOverlay = () => {
      const portal = document.querySelector('nextjs-portal');
      if (portal) {
        portal.style.display = 'none';
        portal.style.pointerEvents = 'none';
        portal.style.visibility = 'hidden';
      }
    };

    // Run immediately
    removeOverlay();

    // Also run after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', removeOverlay);
    }

    // Run on any mutations in case the overlay is added later
    const observer = new MutationObserver((mutations) => {
      removeOverlay();
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Clean up observer after 5 seconds (overlay should be loaded by then)
    setTimeout(() => observer.disconnect(), 5000);
  })();
`;

/**
 * Extended test fixture that automatically hides the Next.js dev overlay.
 */
export const test = base.extend({
  page: async ({ page }, useFixture) => {
    // Inject the CSS to hide dev overlay before any navigation
    await page.addStyleTag({ content: HIDE_DEV_OVERLAY_CSS });

    // Add init script that runs before page load
    await page.addInitScript(REMOVE_DEV_OVERLAY_SCRIPT);

    // Re-inject CSS after each navigation
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        try {
          await page.addStyleTag({ content: HIDE_DEV_OVERLAY_CSS });
        } catch {
          // Page might be navigating, ignore errors
        }
      }
    });

    // Use the page as normal
    await useFixture(page);
  },
});

export { expect };

/**
 * Helper to manually hide the dev overlay if needed.
 * Call this after page.goto() if the automatic injection didn't work.
 */
export async function hideDevOverlay(page: any) {
  await page.addStyleTag({ content: HIDE_DEV_OVERLAY_CSS });
  await page.evaluate(() => {
    const portal = document.querySelector('nextjs-portal');
    if (portal) {
      (portal as HTMLElement).style.display = 'none';
      (portal as HTMLElement).style.pointerEvents = 'none';
    }
  });
}
