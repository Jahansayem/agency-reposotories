import { test } from '@playwright/test';

test.describe('Check Sidebar Rendering', () => {
  test('inspect what renders in sidebar after login', async ({ page }) => {
    console.log('\n=== NAVIGATE AND LOGIN ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

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

    console.log('\n=== CHECK WHAT IS IN THE SIDEBAR ===');

    // Get the entire sidebar HTML
    const sidebarHTML = await page.locator('aside').innerHTML();

    // Check if AgencySwitcher text exists anywhere
    const hasAgencyText = sidebarHTML.includes('Bealer Agency') || sidebarHTML.includes('Agency');
    console.log(`\nSidebar contains "Bealer Agency" or "Agency": ${hasAgencyText}`);

    // Check for the specific AgencySwitcher component
    const agencySwitcherButton = page.locator('button[aria-haspopup="listbox"]');
    const count = await agencySwitcherButton.count();
    console.log(`\nButtons with aria-haspopup="listbox": ${count}`);

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const btn = agencySwitcherButton.nth(i);
        const text = await btn.textContent();
        const ariaLabel = await btn.getAttribute('aria-label');
        console.log(`  Button ${i + 1}: "${text?.trim()}" [aria-label="${ariaLabel}"]`);
      }
    }

    // Check what's actually in the top part of sidebar (first 500 chars)
    const topContent = sidebarHTML.substring(0, 800);
    console.log('\nFirst 800 chars of sidebar HTML:');
    console.log(topContent);

    // Take screenshot
    await page.screenshot({ path: '/tmp/sidebar-state.png', fullPage: true });
    console.log('\nScreenshot saved: /tmp/sidebar-state.png');

    // Check AgencyContext state via browser console
    const contextState = await page.evaluate(() => {
      // Check localStorage
      const session = localStorage.getItem('todoSession');

      return {
        hasSession: !!session,
        sessionData: session ? JSON.parse(session) : null,
        url: window.location.href,
        innerWidth: window.innerWidth,
      };
    });

    console.log('\nContext state:', JSON.stringify(contextState, null, 2));

    // Keep browser open to inspect
    await page.waitForTimeout(5000);
  });
});
