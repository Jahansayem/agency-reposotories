import { test } from '@playwright/test';

test.describe('Check Users Load', () => {
  test('verify users are loaded on login screen', async ({ page }) => {
    console.log('Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\nChecking for user cards...');

    // Count how many user cards exist
    const userCards = page.locator('button:has-text("Derrick"), button:has-text("Sefra"), button:has-text("Admin")');
    const count = await userCards.count();
    console.log(`Found ${count} user card(s)`);

    // Get all button text on the page
    const allButtons = await page.locator('button').all();
    console.log(`\nAll buttons on page (${allButtons.length} total):`);
    for (let i = 0; i < Math.min(allButtons.length, 30); i++) {
      const text = await allButtons[i].textContent();
      console.log(`  ${i + 1}. "${text?.trim()}"`);
    }

    // Check if "Select your account" is shown
    const hasSelectText = await page.locator('text=Select your account').count() > 0;
    console.log(`\n"Select your account" shown: ${hasSelectText}`);

    // Try clicking Derrick if it exists
    if (count > 0) {
      console.log('\n✅ Derrick button exists, clicking it...');
      await page.getByText('Derrick', { exact: true }).click();
      await page.waitForTimeout(1000);

      // Check if PIN screen appeared
      const hasPinInput = await page.locator('input[type="password"]').count() > 0;
      console.log(`PIN input appeared: ${hasPinInput}`);

      if (hasPinInput) {
        // Check if selectedUser data is available in the UI
        const pinScreenText = await page.locator('body').textContent();
        console.log(`PIN screen shows Derrick name: ${pinScreenText?.includes('Derrick')}`);

        // Try to access selectedUser via browser context
        const userData = await page.evaluate(() => {
          // Try to find React state by inspecting DOM elements
          const pinScreen = document.querySelector('[data-testid="pin-screen"], .pin-screen, form');
          return {
            hasPinScreen: !!pinScreen,
            pinScreenHtml: pinScreen?.innerHTML.substring(0, 200),
          };
        });

        console.log('\nPIN Screen Data:', JSON.stringify(userData, null, 2));
      }
    } else {
      console.log('\n❌ No Derrick button found!');
      console.log('   Users are not loading from database.');
      console.log('   Check Supabase connection and users table.');
    }

    await page.screenshot({ path: '/tmp/debug-users.png', fullPage: true });
    console.log('\nScreenshot: /tmp/debug-users.png');
  });
});
