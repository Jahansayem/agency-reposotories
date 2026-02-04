import { test } from '@playwright/test';

test.describe('Debug Dropdown State', () => {
  test('check if aria-expanded and dropdown visibility changes', async ({ page }) => {
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

    console.log('\n=== BEFORE CLICK ===');

    const agencyButton = page.locator('button[aria-haspopup="listbox"]');

    // Check initial state
    const ariaExpandedBefore = await agencyButton.getAttribute('aria-expanded');
    console.log(`aria-expanded BEFORE: ${ariaExpandedBefore}`);

    // Check if dropdown exists but is hidden
    const dropdownBefore = page.locator('[role="listbox"]');
    const dropdownCountBefore = await dropdownBefore.count();
    console.log(`Dropdown elements BEFORE: ${dropdownCountBefore}`);

    // Take screenshot before
    await page.screenshot({ path: '/tmp/state-before.png' });

    console.log('\n=== CLICKING BUTTON ===');
    await agencyButton.click();
    await page.waitForTimeout(500);

    console.log('\n=== AFTER CLICK ===');

    // Check state after click
    const ariaExpandedAfter = await agencyButton.getAttribute('aria-expanded');
    console.log(`aria-expanded AFTER: ${ariaExpandedAfter}`);

    // Check dropdown visibility
    const dropdownCountAfter = await dropdownBefore.count();
    console.log(`Dropdown elements AFTER: ${dropdownCountAfter}`);

    if (dropdownCountAfter > 0) {
      const isVisible = await dropdownBefore.isVisible();
      console.log(`Dropdown visible: ${isVisible}`);

      if (isVisible) {
        const dropdownText = await dropdownBefore.textContent();
        console.log(`Dropdown text: ${dropdownText?.substring(0, 200)}`);
      }
    }

    // Take screenshot after
    await page.screenshot({ path: '/tmp/state-after.png' });

    // Check the actual DOM
    const buttonHTML = await agencyButton.evaluate(el => el.outerHTML);
    console.log('\nButton HTML:', buttonHTML.substring(0, 300));

    // Check parent element
    const parentHTML = await agencyButton.evaluate(el => el.parentElement?.outerHTML.substring(0, 500));
    console.log('\nParent HTML:', parentHTML?.substring(0, 300));

    console.log('\n✅ If aria-expanded changed from "false" to "true", React state is updating');
    console.log('✅ If dropdown count increased, dropdown is being rendered');
    console.log('❌ If dropdown is rendered but not visible, CSS/animation issue');

    await page.waitForTimeout(5000);
  });
});
