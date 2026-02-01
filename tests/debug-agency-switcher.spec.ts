import { test, expect } from '@playwright/test';

test.describe('Debug Agency Switcher', () => {
  test('investigate why agency switcher is not showing', async ({ page }) => {
    // Enable verbose console logging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    });

    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('\n=== STEP 1: Login as Derrick ===');

    // Click on Derrick's user card
    const derrickCard = page.locator('[data-testid="user-card-Derrick"], button:has-text("Derrick")').first();
    const derrickExists = await derrickCard.count() > 0;
    console.log('Derrick card exists:', derrickExists);

    if (derrickExists) {
      await derrickCard.click();
      await page.waitForTimeout(500);
    }

    // Enter PIN
    const pinInput = page.locator('input[type="password"], input[placeholder*="PIN"]').first();
    const pinExists = await pinInput.count() > 0;
    console.log('PIN input exists:', pinExists);

    if (pinExists) {
      await pinInput.fill('8008');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    console.log('\n=== STEP 2: Check Environment Variable ===');

    // Check the feature flags API
    const flagsResponse = await page.goto('http://localhost:3000/api/debug/feature-flags');
    const flagsData = await flagsResponse?.json();
    console.log('Feature Flags API Response:', JSON.stringify(flagsData, null, 2));

    // Go back to main app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== STEP 3: Inspect Sidebar Structure ===');

    // Take a screenshot
    await page.screenshot({ path: '/tmp/agency-switcher-debug-1.png', fullPage: true });
    console.log('Screenshot saved to /tmp/agency-switcher-debug-1.png');

    // Check if sidebar exists
    const sidebar = page.locator('aside, [aria-label="Main navigation"]').first();
    const sidebarExists = await sidebar.count() > 0;
    console.log('Sidebar exists:', sidebarExists);

    if (sidebarExists) {
      const sidebarHtml = await sidebar.innerHTML();
      console.log('\nSidebar HTML (first 1000 chars):', sidebarHtml.substring(0, 1000));
    }

    console.log('\n=== STEP 4: Look for AgencySwitcher Component ===');

    // Try different selectors for AgencySwitcher
    const selectors = [
      'button:has-text("Bealer Agency")',
      '[data-testid*="agency"]',
      'button[aria-label*="agency"]',
      'button[aria-label*="Agency"]',
      'div:has-text("Bealer Agency")',
      '.agency-switcher',
    ];

    for (const selector of selectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      console.log(`Selector "${selector}": ${count} elements found`);

      if (count > 0) {
        const text = await element.textContent();
        console.log(`  Text content: "${text}"`);
      }
    }

    console.log('\n=== STEP 5: Check React Context Values ===');

    // Execute JavaScript to check context values
    const contextInfo = await page.evaluate(() => {
      // Check if window has any agency-related data
      const info: any = {
        localStorage: {} as any,
        cookies: document.cookie,
        windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('agency')),
      };

      // Check localStorage
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('agency') || key.includes('Agency')) {
            info.localStorage[key] = localStorage.getItem(key);
          }
        });
      } catch (e) {
        info.localStorage = 'Error reading localStorage';
      }

      return info;
    });

    console.log('\nContext Info:', JSON.stringify(contextInfo, null, 2));

    console.log('\n=== STEP 6: Check for Multi-Tenancy Elements ===');

    // Look for any text mentioning agencies
    const bodyText = await page.locator('body').textContent();
    const hasAgencyText = bodyText?.includes('Agency') || bodyText?.includes('agency');
    console.log('Body contains "agency" text:', hasAgencyText);

    // Check all buttons in sidebar
    const sidebarButtons = await page.locator('aside button, [aria-label="Main navigation"] button').all();
    console.log(`\nFound ${sidebarButtons.length} buttons in sidebar:`);

    for (let i = 0; i < Math.min(sidebarButtons.length, 15); i++) {
      const button = sidebarButtons[i];
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      console.log(`  Button ${i + 1}: text="${text?.trim()}", aria-label="${ariaLabel}"`);
    }

    console.log('\n=== STEP 7: Check if Multi-Tenancy is Enabled in Client ===');

    // Check React component state
    const multiTenancyEnabled = await page.evaluate(() => {
      // Try to access the context via React DevTools hook
      const rootElement = document.querySelector('[data-reactroot], #__next, #root');
      return {
        envVarInClient: (window as any).NEXT_PUBLIC_ENABLE_MULTI_TENANCY,
        processEnv: typeof process !== 'undefined' ? (process as any).env?.NEXT_PUBLIC_ENABLE_MULTI_TENANCY : 'undefined',
        hasRootElement: !!rootElement,
      };
    });

    console.log('\nMulti-Tenancy Check:', JSON.stringify(multiTenancyEnabled, null, 2));

    console.log('\n=== STEP 8: Final Screenshot ===');
    await page.screenshot({ path: '/tmp/agency-switcher-debug-2.png', fullPage: true });
    console.log('Final screenshot saved to /tmp/agency-switcher-debug-2.png');

    // Keep browser open for manual inspection
    console.log('\n=== Pausing for manual inspection (30 seconds) ===');
    console.log('Browser will stay open. Check the screenshots at /tmp/agency-switcher-debug-*.png');
    await page.waitForTimeout(30000);
  });
});
