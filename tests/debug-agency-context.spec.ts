import { test } from '@playwright/test';

test.describe('Debug Agency Context Loading', () => {
  test('check if agencies load in React context', async ({ page }) => {
    // Capture all console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    console.log('\n=== NAVIGATE TO APP ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('\n=== LOGIN ===');
    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(500);

    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await page.waitForTimeout(4000);

    // Close dialogs
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('\n=== CHECK AGENCY CONTEXT STATE ===');

    // Inject code to check React state
    const agencyContextState = await page.evaluate(() => {
      // Try to find the AgencySwitcher component in the DOM
      const agencyButton = document.querySelector('button[aria-haspopup="listbox"]');

      return {
        agencyButtonExists: !!agencyButton,
        agencyButtonText: agencyButton?.textContent || null,
        agencyButtonDisabled: agencyButton?.hasAttribute('disabled'),
        agencyButtonAriaExpanded: agencyButton?.getAttribute('aria-expanded'),

        // Check if multi-tenancy env var is set
        hasMultiTenancyEnv: typeof window !== 'undefined',

        // Check localStorage
        hasSession: !!localStorage.getItem('todoSession'),
        sessionData: localStorage.getItem('todoSession'),
      };
    });

    console.log('\nAgency Context State:', JSON.stringify(agencyContextState, null, 2));

    // Check for the AgencySwitcher component
    console.log('\n=== CHECK IF AGENCYSWITCHER IS RENDERED ===');
    const agencySwitcher = page.locator('button:has-text("Bealer Agency")');
    const exists = await agencySwitcher.count();
    console.log(`AgencySwitcher button count: ${exists}`);

    if (exists === 0) {
      // Check what's actually in the sidebar
      console.log('\n=== SIDEBAR CONTENT ===');
      const sidebar = page.locator('aside');
      const sidebarText = await sidebar.textContent();
      console.log('Sidebar text:', sidebarText);

      // Check all buttons in sidebar
      const buttons = await page.locator('aside button').all();
      console.log(`\nTotal buttons in sidebar: ${buttons.length}`);
      for (let i = 0; i < Math.min(buttons.length, 15); i++) {
        const text = await buttons[i].textContent();
        const ariaLabel = await buttons[i].getAttribute('aria-label');
        console.log(`  Button ${i + 1}: "${text?.trim()}" [aria-label="${ariaLabel}"]`);
      }
    }

    // Print all console logs from browser
    console.log('\n=== BROWSER CONSOLE LOGS ===');
    const errors = consoleLogs.filter(log => log.includes('[error]') || log.includes('Error'));
    const warnings = consoleLogs.filter(log => log.includes('[warning]') || log.includes('Warning'));

    if (errors.length > 0) {
      console.log('\nERRORS:');
      errors.forEach(e => console.log(e));
    }

    if (warnings.length > 0) {
      console.log('\nWARNINGS:');
      warnings.forEach(w => console.log(w));
    }

    await page.screenshot({ path: '/tmp/agency-context-debug.png', fullPage: true });
    console.log('\nScreenshot: /tmp/agency-context-debug.png');

    // Keep browser open to inspect
    await page.waitForTimeout(3000);
  });
});
