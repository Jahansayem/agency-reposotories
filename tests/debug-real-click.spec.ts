import { test } from '@playwright/test';

test.describe('Debug Real Click Behavior', () => {
  test('check what happens on real click', async ({ page }) => {
    console.log('\n=== LOGIN ===');
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

    // Close any welcome dialogs
    console.log('\n=== CLOSE DIALOGS ===');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('\n=== FIND BEALER AGENCY BUTTON ===');
    const agencyButton = page.locator('button:has-text("Bealer Agency")').first();

    // Log initial state
    const isVisible = await agencyButton.isVisible();
    const isEnabled = await agencyButton.isEnabled();
    const ariaExpanded = await agencyButton.getAttribute('aria-expanded');

    console.log(`Button visible: ${isVisible}`);
    console.log(`Button enabled: ${isEnabled}`);
    console.log(`aria-expanded BEFORE click: ${ariaExpanded}`);

    // Take screenshot before click
    await page.screenshot({ path: '/tmp/before-click.png', fullPage: true });

    // Add listeners for ALL events
    await page.evaluate(() => {
      const btn = document.querySelector('button');
      if (btn) {
        btn.addEventListener('click', () => console.log('[CLICK EVENT FIRED]'));
        btn.addEventListener('mousedown', () => console.log('[MOUSEDOWN EVENT FIRED]'));
        btn.addEventListener('mouseup', () => console.log('[MOUSEUP EVENT FIRED]'));
      }
    });

    // Listen for console logs
    page.on('console', msg => {
      if (msg.text().includes('EVENT FIRED') || msg.text().includes('ERROR')) {
        console.log(`[BROWSER]: ${msg.text()}`);
      }
    });

    console.log('\n=== CLICKING BUTTON ===');
    await agencyButton.click();

    // Wait a bit
    await page.waitForTimeout(1500);

    // Check state after click
    const ariaExpandedAfter = await agencyButton.getAttribute('aria-expanded');
    console.log(`aria-expanded AFTER click: ${ariaExpandedAfter}`);

    // Take screenshot after click
    await page.screenshot({ path: '/tmp/after-click.png', fullPage: true });

    // Look for the dropdown/listbox
    console.log('\n=== CHECKING FOR DROPDOWN ===');
    const listbox = page.locator('[role="listbox"]');
    const listboxVisible = await listbox.isVisible().catch(() => false);
    console.log(`Listbox visible: ${listboxVisible}`);

    if (listboxVisible) {
      const text = await listbox.textContent();
      console.log(`Listbox content: ${text?.substring(0, 200)}`);
    }

    // Check for any popover/portal elements
    const popovers = await page.locator('[data-radix-popper-content-wrapper], [data-state], .popover').all();
    console.log(`\nFound ${popovers.length} potential popover elements`);

    for (let i = 0; i < popovers.length; i++) {
      const popover = popovers[i];
      const visible = await popover.isVisible().catch(() => false);
      if (visible) {
        const state = await popover.getAttribute('data-state');
        const classes = await popover.getAttribute('class');
        console.log(`\nPopover ${i + 1}:`);
        console.log(`  data-state: ${state}`);
        console.log(`  classes: ${classes}`);
      }
    }

    // Try clicking again to see if it toggles
    console.log('\n=== CLICKING AGAIN (to toggle) ===');
    await agencyButton.click();
    await page.waitForTimeout(500);

    const ariaExpandedAfterSecond = await agencyButton.getAttribute('aria-expanded');
    console.log(`aria-expanded after 2nd click: ${ariaExpandedAfterSecond}`);

    await page.screenshot({ path: '/tmp/after-second-click.png', fullPage: true });

    console.log('\n=== SCREENSHOTS SAVED ===');
    console.log('1. /tmp/before-click.png');
    console.log('2. /tmp/after-click.png');
    console.log('3. /tmp/after-second-click.png');

    // Keep browser open
    await page.waitForTimeout(5000);
  });
});
