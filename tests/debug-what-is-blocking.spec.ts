import { test } from '@playwright/test';

test.describe('Debug What Is Blocking Clicks', () => {
  test('find out what modal/overlay is open', async ({ page }) => {
    console.log('\n=== Login ===');
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

    console.log('\n=== Check for blocking elements ===');

    // Look for modal backdrops
    const backdrops = await page.locator('.fixed.inset-0, [class*="backdrop"], [class*="overlay"]').all();
    console.log(`\nFound ${backdrops.length} potential backdrop elements`);

    for (let i = 0; i < backdrops.length; i++) {
      const backdrop = backdrops[i];
      const isVisible = await backdrop.isVisible();
      const classes = await backdrop.getAttribute('class');
      const zIndex = await backdrop.evaluate(el => window.getComputedStyle(el).zIndex);

      console.log(`\nBackdrop ${i + 1}:`);
      console.log(`  Visible: ${isVisible}`);
      console.log(`  Classes: ${classes}`);
      console.log(`  Z-index: ${zIndex}`);

      if (isVisible) {
        const parent = backdrop.locator('xpath=..');
        const parentTag = await parent.evaluate(el => el.tagName);
        const parentClass = await parent.getAttribute('class');
        console.log(`  Parent: <${parentTag}> class="${parentClass}"`);
      }
    }

    // Look for open modals/dialogs
    const dialogs = await page.locator('[role="dialog"], .modal, [class*="modal"]').all();
    console.log(`\n\nFound ${dialogs.length} modal/dialog elements`);

    for (let i = 0; i < dialogs.length; i++) {
      const dialog = dialogs[i];
      const isVisible = await dialog.isVisible();
      const text = await dialog.textContent();

      console.log(`\nDialog ${i + 1}:`);
      console.log(`  Visible: ${isVisible}`);
      console.log(`  Text (first 200 chars): "${text?.substring(0, 200)}"`);
    }

    // Check for tooltips
    const tooltips = await page.locator('[role="tooltip"], .tooltip, [class*="tooltip"]').all();
    console.log(`\n\nFound ${tooltips.length} tooltip elements`);

    for (const tooltip of tooltips) {
      const isVisible = await tooltip.isVisible();
      if (isVisible) {
        const text = await tooltip.textContent();
        console.log(`  Visible tooltip: "${text}"`);
      }
    }

    await page.screenshot({ path: '/tmp/debug-blocking.png', fullPage: true });
    console.log('\n\nScreenshot: /tmp/debug-blocking.png');

    // Try to close any open modals by pressing Escape
    console.log('\n=== Attempting to close modals with Escape ===');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/tmp/after-escape.png', fullPage: true });
    console.log('After Escape screenshot: /tmp/after-escape.png');

    // Check again for backdrops
    const backdropsAfter = await page.locator('.fixed.inset-0[class*="backdrop"], [class*="backdrop"]').all();
    const visibleBackdrops = [];
    for (const backdrop of backdropsAfter) {
      if (await backdrop.isVisible()) {
        visibleBackdrops.push(backdrop);
      }
    }

    console.log(`\nBackdrops still visible after Escape: ${visibleBackdrops.length}`);

    // Now try clicking AgencySwitcher
    console.log('\n=== Try clicking AgencySwitcher ===');
    const agencySwitcher = page.locator('button:has-text("Bealer Agency")').first();

    try {
      await agencySwitcher.click({ timeout: 5000 });
      console.log('✅ Successfully clicked AgencySwitcher!');

      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/after-click.png', fullPage: true });
      console.log('After click screenshot: /tmp/after-click.png');

    } catch (error) {
      console.log(`❌ Failed to click: ${error}`);
    }
  });
});
