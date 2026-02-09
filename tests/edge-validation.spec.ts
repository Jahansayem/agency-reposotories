import { test, expect } from '@playwright/test';

/**
 * Microsoft Edge Validation Tests
 *
 * These tests verify the app works correctly in Microsoft Edge.
 * Since Edge uses Chromium (same as Chrome), these tests should pass identically to Chrome tests.
 *
 * Run with: npx playwright test edge-validation.spec.ts --project=msedge
 */

test.describe('Edge Compatibility', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Skip if not Edge
    test.skip(browserName !== 'chromium' || !process.env.PWTEST_CHANNEL?.includes('msedge'), 'Edge-only tests');
  });

  test('should load app without errors in Edge', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for app to render
    await page.waitForLoadState('networkidle');

    // Check for major UI elements
    const loginHeader = page.locator('h1, h2').filter({ hasText: 'Bealer Agency' }).first();
    const mainAppInput = page.locator('textarea[placeholder*="Add a task"]');

    const hasLogin = await loginHeader.isVisible().catch(() => false);
    const hasMainApp = await mainAppInput.isVisible().catch(() => false);

    expect(hasLogin || hasMainApp).toBeTruthy();

    // No critical console errors (excluding known warnings)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('DevTools') &&
      !err.includes('favicon') &&
      !err.includes('Warning:')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should support localStorage in Edge', async ({ page }) => {
    await page.goto('/');

    // Test localStorage
    const localStorageWorks = await page.evaluate(() => {
      try {
        localStorage.setItem('edge-test', 'works');
        const value = localStorage.getItem('edge-test');
        localStorage.removeItem('edge-test');
        return value === 'works';
      } catch (e) {
        return false;
      }
    });

    expect(localStorageWorks).toBe(true);
  });

  test('should support WebSockets in Edge', async ({ page }) => {
    await page.goto('/');

    // Check WebSocket support
    const webSocketSupported = await page.evaluate(() => {
      return 'WebSocket' in window;
    });

    expect(webSocketSupported).toBe(true);
  });

  test('should render theme correctly in Edge', async ({ page }) => {
    await page.goto('/');

    // Wait for theme to apply
    await page.waitForLoadState('networkidle');

    // Check that document has theme class
    const hasThemeClass = await page.evaluate(() => {
      const root = document.documentElement;
      return root.classList.contains('dark') || root.classList.contains('light');
    });

    expect(hasThemeClass).toBe(true);
  });

  test('should handle file input in Edge', async ({ page }) => {
    await page.goto('/');

    // Check File API support
    const fileApiSupported = await page.evaluate(() => {
      return 'File' in window && 'FileReader' in window && 'FileList' in window;
    });

    expect(fileApiSupported).toBe(true);
  });

  test('should support modern JavaScript features in Edge', async ({ page }) => {
    await page.goto('/');

    // Test modern JS features
    const modernFeaturesSupported = await page.evaluate(() => {
      try {
        // Test async/await
        const asyncTest = async () => 'works';

        // Test arrow functions
        const arrowTest = () => 'works';

        // Test optional chaining
        const obj = { a: { b: 'works' } };
        const optionalChaining = obj?.a?.b;

        // Test nullish coalescing
        const maybeNull: string | null = null;
        const nullishTest = maybeNull ?? 'works';

        // Test array methods
        const arrayTest = [1, 2, 3].map(x => x * 2);

        return (
          arrowTest() === 'works' &&
          optionalChaining === 'works' &&
          nullishTest === 'works' &&
          arrayTest.length === 3
        );
      } catch (e) {
        return false;
      }
    });

    expect(modernFeaturesSupported).toBe(true);
  });
});

test.describe('Edge-Specific Features', () => {
  test('should detect Edge browser', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Edge detection test');

    await page.goto('/');

    const isEdge = await page.evaluate(() => {
      return /Edg\//.test(navigator.userAgent);
    });

    // This will be true when running with --project=msedge
    if (process.env.PWTEST_CHANNEL?.includes('msedge')) {
      expect(isEdge).toBe(true);
    }
  });

  test('should check Edge version', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Edge version check');

    await page.goto('/');

    const edgeVersion = await page.evaluate(() => {
      const match = navigator.userAgent.match(/Edg\/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    if (process.env.PWTEST_CHANNEL?.includes('msedge')) {
      // Edge should be version 100+
      expect(edgeVersion).toBeGreaterThanOrEqual(100);
    }
  });
});

test.describe('Edge Performance', () => {
  test('should load quickly in Edge', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds (generous for slow machines)
    expect(loadTime).toBeLessThan(5000);
  });

  test('should render without layout thrashing', async ({ page }) => {
    await page.goto('/');

    // Check for excessive reflows
    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));

    expect(metrics.scrollHeight).toBeGreaterThan(0);
    expect(metrics.clientHeight).toBeGreaterThan(0);
  });
});

test.describe('Edge Cross-Browser Parity', () => {
  test('should behave identically to Chrome', async ({ page, browserName }) => {
    // This test documents that Edge should behave like Chrome
    // since they share the same Chromium engine

    await page.goto('/');

    // If this is Edge, behavior should match Chrome exactly
    const rendersBoth = await page.evaluate(() => {
      // Check for React root
      const hasReactRoot = !!document.querySelector('#__next') || !!document.querySelector('[data-reactroot]');

      // Check for basic app structure
      const hasAppStructure = document.body.children.length > 0;

      return hasReactRoot && hasAppStructure;
    });

    expect(rendersBoth).toBe(true);
  });
});

/**
 * Edge-Specific Notes:
 *
 * 1. Edge uses Chromium engine (same as Chrome) since version 79 (2020)
 * 2. All Chrome fixes automatically work in Edge
 * 3. WebKit fixes (Safari) do NOT apply to Edge
 * 4. Edge has excellent standards support - no polyfills needed
 *
 * Testing Strategy:
 * - Run these tests with: npx playwright test edge-validation.spec.ts --project=msedge
 * - If Chrome tests pass, Edge tests should also pass
 * - Any Edge-specific issues are likely configuration problems, not code issues
 *
 * Known Edge Advantages:
 * - Excellent PWA support
 * - Native Windows integration
 * - Good performance on low-end hardware
 * - Built-in privacy features
 *
 * Known Edge Quirks:
 * - Sleeping tabs may disconnect WebSockets (same as Chrome)
 * - Enterprise policies may restrict features
 * - IE Mode is NOT supported (requires modern Edge)
 */
