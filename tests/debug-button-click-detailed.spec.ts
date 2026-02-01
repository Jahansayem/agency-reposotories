import { test } from '@playwright/test';

test.describe('Debug Button Click in Detail', () => {
  test('show exactly what happens when clicking agency switcher', async ({ page }) => {
    // Log all console messages
    page.on('console', msg => {
      console.log(`[BROWSER]:`, msg.text());
    });

    console.log('\n=== 1. LOGIN ===');
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

    console.log('\n=== 2. CLOSE ANY DIALOGS ===');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/tmp/step-1-after-escape.png', fullPage: true });

    console.log('\n=== 3. LOCATE AGENCY SWITCHER ===');

    // Find all buttons that might be the agency switcher
    const allButtons = await page.locator('aside button').all();
    console.log(`Found ${allButtons.length} buttons in sidebar`);

    let agencySwitcherButton = null;
    for (let i = 0; i < allButtons.length; i++) {
      const btn = allButtons[i];
      const text = await btn.textContent();
      const ariaExpanded = await btn.getAttribute('aria-expanded');
      const ariaHaspopup = await btn.getAttribute('aria-haspopup');

      console.log(`\nButton ${i + 1}:`);
      console.log(`  Text: "${text?.trim()}"`);
      console.log(`  aria-expanded: ${ariaExpanded}`);
      console.log(`  aria-haspopup: ${ariaHaspopup}`);

      if (text?.includes('Bealer') || ariaHaspopup === 'listbox') {
        console.log(`  ✅ This looks like the AgencySwitcher!`);
        agencySwitcherButton = btn;
      }
    }

    if (!agencySwitcherButton) {
      console.log('\n❌ ERROR: Could not find AgencySwitcher button!');
      return;
    }

    console.log('\n=== 4. CLICK THE BUTTON ===');

    // Check if button is enabled and visible
    const isVisible = await agencySwitcherButton.isVisible();
    const isEnabled = await agencySwitcherButton.isEnabled();
    const boundingBox = await agencySwitcherButton.boundingBox();

    console.log(`Button visible: ${isVisible}`);
    console.log(`Button enabled: ${isEnabled}`);
    console.log(`Button position:`, boundingBox);

    // Take screenshot before click
    await page.screenshot({ path: '/tmp/step-2-before-click.png', fullPage: true });

    // Add a click listener to see if the click actually happens
    await page.evaluate(() => {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        console.log(`[CLICK EVENT] Target: ${target.tagName} ${target.className}`);
      });
    });

    // Try clicking
    console.log('Attempting to click...');
    try {
      await agencySwitcherButton.click({ timeout: 5000 });
      console.log('✅ Click succeeded (no error thrown)');
    } catch (error) {
      console.log(`❌ Click failed: ${error}`);
    }

    await page.waitForTimeout(1500);

    // Take screenshot after click
    await page.screenshot({ path: '/tmp/step-3-after-click.png', fullPage: true });

    console.log('\n=== 5. CHECK IF DROPDOWN APPEARED ===');

    // Check aria-expanded attribute
    const ariaExpandedAfter = await agencySwitcherButton.getAttribute('aria-expanded');
    console.log(`aria-expanded after click: ${ariaExpandedAfter}`);

    // Look for dropdown/menu elements
    const dropdownSelectors = [
      '[role="menu"]',
      '[role="listbox"]',
      'div[class*="dropdown"]',
      'div[class*="popover"]',
      'div[class*="menu"]',
    ];

    for (const selector of dropdownSelectors) {
      const elements = await page.locator(selector).all();
      for (const el of elements) {
        const isVisible = await el.isVisible();
        if (isVisible) {
          const text = await el.textContent();
          console.log(`\n✅ Found visible ${selector}:`);
          console.log(`   Text (first 100 chars): "${text?.substring(0, 100)}"`);
        }
      }
    }

    // Check if any new elements appeared after clicking
    const bodyHtmlBefore = await page.evaluate(() => document.body.innerHTML.length);
    console.log(`\nDOM size before click: ${bodyHtmlBefore} chars`);

    await agencySwitcherButton.click();
    await page.waitForTimeout(500);

    const bodyHtmlAfter = await page.evaluate(() => document.body.innerHTML.length);
    console.log(`DOM size after click: ${bodyHtmlAfter} chars`);
    console.log(`Change: ${bodyHtmlAfter - bodyHtmlBefore} chars`);

    // Look for any text that suggests a dropdown opened
    const bodyText = await page.locator('body').textContent();
    const hasCreateText = bodyText?.includes('Create New Agency') || bodyText?.includes('Create Agency');
    const hasManageText = bodyText?.includes('Manage Members') || bodyText?.includes('Manage');

    console.log(`\nPage contains "Create New Agency": ${hasCreateText}`);
    console.log(`Page contains "Manage Members": ${hasManageText}`);

    // Final screenshot
    await page.screenshot({ path: '/tmp/step-4-final.png', fullPage: true });

    console.log('\n=== 6. SUMMARY ===');
    console.log('Screenshots saved:');
    console.log('  1. /tmp/step-1-after-escape.png - After pressing Escape');
    console.log('  2. /tmp/step-2-before-click.png - Before clicking button');
    console.log('  3. /tmp/step-3-after-click.png - After clicking button');
    console.log('  4. /tmp/step-4-final.png - Final state');

    // Keep browser open for 10 seconds so you can see
    console.log('\nKeeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
  });
});
