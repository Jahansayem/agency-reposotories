import { test, expect } from '@playwright/test';

test.describe('Debug Auth Session', () => {
  test('check why session is not being stored', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER]:`, msg.text()));

    console.log('\n=== Login Process ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Click Derrick
    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(500);

    // Enter PIN
    await page.fill('input[type="password"]', '8008');
    await page.keyboard.press('Enter');

    // Wait for login
    await page.waitForTimeout(3000);

    console.log('\n=== Check LocalStorage ===');
    const storage = await page.evaluate(() => {
      const data = {} as any;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });

    console.log('LocalStorage:', JSON.stringify(storage, null, 2));

    // Check if todoSession exists
    const hasSession = 'todoSession' in storage;
    console.log('\ntodoSession exists:', hasSession);

    if (hasSession) {
      console.log('Session data:', storage.todoSession);
    } else {
      console.log('❌ ERROR: todoSession NOT found in localStorage!');
      console.log('This is why the app is not showing the main interface.');
    }

    // Check what's actually rendered
    const bodyText = await page.locator('body').textContent();
    console.log('\nPage contains "Tasks":', bodyText?.includes('Tasks'));
    console.log('Page contains "Dashboard":', bodyText?.includes('Dashboard'));
    console.log('Page contains "Select your account":', bodyText?.includes('Select your account'));

    // Check for error messages in console
    console.log('\n=== Checking for React/Network Errors ===');

    await page.screenshot({ path: '/tmp/debug-session.png', fullPage: true });
  });
});
