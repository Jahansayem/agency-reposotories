import { test } from '@playwright/test';

test.describe('Debug Login API', () => {
  test('intercept and log login API calls', async ({ page }) => {
    // Intercept all network requests
    page.on('request', request => {
      if (request.url().includes('/api/auth/')) {
        console.log(`>>> REQUEST: ${request.method()} ${request.url()}`);
        console.log(`    Headers:`, request.headers());
        if (request.postData()) {
          console.log(`    Body:`, request.postData());
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/auth/')) {
        console.log(`<<< RESPONSE: ${response.status()} ${response.url()}`);
        try {
          const body = await response.json();
          console.log(`    Body:`, JSON.stringify(body, null, 2));
        } catch (e) {
          console.log(`    Could not parse response as JSON`);
        }
      }
    });

    // Also log console messages
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning' || msg.text().includes('session') || msg.text().includes('login')) {
        console.log(`[BROWSER ${type}]:`, msg.text());
      }
    });

    console.log('\n=== Navigate to app ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n=== Select Derrick ===');
    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(500);

    console.log('\n=== Enter PIN ===');
    await page.fill('input[type="password"]', '8008');

    console.log('\n=== Submit (watching for API call) ===');
    await page.keyboard.press('Enter');

    // Wait for the API call to complete
    await page.waitForTimeout(5000);

    console.log('\n=== Check localStorage after login ===');
    const storage = await page.evaluate(() => {
      return {
        todoSession: localStorage.getItem('todoSession'),
        allKeys: Object.keys(localStorage)
      };
    });

    console.log('todoSession:', storage.todoSession);
    console.log('All localStorage keys:', storage.allKeys);

    if (!storage.todoSession) {
      console.log('\n❌ ERROR: todoSession was NOT set in localStorage!');
      console.log('   This means either:');
      console.log('   1. The login API call failed');
      console.log('   2. The login API call succeeded but setStoredSession() wasnt called');
      console.log('   3. setStoredSession() was called but failed silently');
    } else {
      console.log('\n✅ todoSession WAS set:', storage.todoSession);
    }

    // Check what's rendered
    const bodyText = await page.locator('body').textContent();
    console.log('\nPage shows Tasks menu:', bodyText?.includes('Tasks'));
    console.log('Page shows Select your account:', bodyText?.includes('Select your account'));

    await page.screenshot({ path: '/tmp/debug-login-api.png', fullPage: true });
  });
});
