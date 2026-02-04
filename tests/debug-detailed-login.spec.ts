import { test } from '@playwright/test';

test.describe('Detailed Login Debug', () => {
  test('catch all errors and state changes', async ({ page }) => {
    // Capture ALL console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(text);
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      const text = `[PAGE ERROR] ${error.message}`;
      pageErrors.push(text);
      console.log(text);
    });

    // Capture failed requests
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      const text = `[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`;
      failedRequests.push(text);
      console.log(text);
    });

    // Monitor localStorage changes
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      (localStorage as any).setItem = function(key: string, value: string) {
        console.log(`[LocalStorage SET] ${key} = ${value.substring(0, 100)}...`);
        return originalSetItem.call(this, key, value);
      };
    });

    console.log('\n========== NAVIGATING ==========');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    console.log('\n========== SELECTING USER ==========');
    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(800);

    console.log('\n========== ENTERING PIN ==========');
    await page.fill('input[type="password"]', '8008');

    console.log('\n========== SUBMITTING PIN ==========');
    await page.keyboard.press('Enter');

    // Wait longer for all async operations
    await page.waitForTimeout(5000);

    console.log('\n========== POST-LOGIN STATE ==========');

    // Check final state
    const finalState = await page.evaluate(() => {
      const session = localStorage.getItem('todoSession');
      return {
        hasSession: !!session,
        session: session,
        allLocalStorage: Object.fromEntries(
          Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
        ),
        cookies: document.cookie,
        currentUrl: window.location.href,
        bodyClasses: document.body.className,
      };
    });

    console.log('\nFinal State:', JSON.stringify(finalState, null, 2));

    console.log('\n========== SUMMARY ==========');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      console.log('Page Errors:', pageErrors);
    }
    console.log(`Failed requests: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
      console.log('Failed Requests:', failedRequests);
    }

    console.log(`\nSession Created: ${finalState.hasSession ? '✅ YES' : '❌ NO'}`);

    if (!finalState.hasSession) {
      console.log('\n🔍 DIAGNOSIS:');
      console.log('The session was not stored in localStorage.');
      console.log('Check the console messages above for errors in:');
      console.log('  1. CSRF token fetch');
      console.log('  2. /api/auth/login call');
      console.log('  3. setStoredSession() execution');
    }

    // Save screenshot
    await page.screenshot({ path: '/tmp/debug-detailed-login.png', fullPage: true });
    console.log('\nScreenshot: /tmp/debug-detailed-login.png');
  });
});
