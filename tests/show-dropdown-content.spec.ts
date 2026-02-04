import { test } from '@playwright/test';

test.describe('Show Dropdown Content', () => {
  test('click agency switcher and show dropdown', async ({ page }) => {
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

    // Close dialogs
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('\n=== BEFORE CLICKING - AgencySwitcher button visible ===');
    await page.screenshot({ path: '/tmp/dropdown-before-click.png', fullPage: true });

    // Click the AgencySwitcher button
    const agencyButton = page.locator('button:has-text("Bealer Agency")').first();
    await agencyButton.click();

    console.log('\n=== AFTER CLICKING - Dropdown should be open ===');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/tmp/dropdown-after-click.png', fullPage: true });

    // Check what's in the dropdown
    const listbox = page.locator('[role="listbox"]');
    const listboxText = await listbox.textContent();

    console.log('\n=== DROPDOWN CONTENT ===');
    console.log(listboxText);

    console.log('\n=== SCREENSHOTS SAVED ===');
    console.log('Before click: /tmp/dropdown-before-click.png');
    console.log('After click:  /tmp/dropdown-after-click.png');

    console.log('\n✅ You should see:');
    console.log('  - Your Agencies (header)');
    console.log('  - Bealer Agency (with checkmark)');
    console.log('  - Test Agency 2');
    console.log('  - Manage Members');
    console.log('  - Create New Agency');

    // Keep browser open
    await page.waitForTimeout(8000);
  });
});
