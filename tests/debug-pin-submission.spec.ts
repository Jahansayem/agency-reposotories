import { test } from '@playwright/test';

test.describe('Debug PIN Submission', () => {
  test('trace PIN submission flow', async ({ page }) => {
    // Override fetch to log all API calls
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      (window as any).fetch = async function(...args: any[]) {
        console.log(`[FETCH] ${args[0]}`);
        if (args[1]?.body) {
          console.log(`[FETCH BODY]`, args[1].body);
        }
        try {
          const response = await originalFetch.apply(this, args as any);
          console.log(`[FETCH RESPONSE] ${response.status} ${args[0]}`);
          return response;
        } catch (error) {
          console.log(`[FETCH ERROR] ${args[0]}:`, error);
          throw error;
        }
      };
    });

    // Log all console messages
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    });

    console.log('\n=== Navigate ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    console.log('\n=== Select Derrick ===');
    const derrickButton = page.getByText('Derrick', { exact: true });
    await derrickButton.click();
    await page.waitForTimeout(800);

    console.log('\n=== Enter PIN digit by digit ===');
    const pinInputs = page.locator('input[type="password"], input[inputmode="numeric"]');
    const inputCount = await pinInputs.count();
    console.log(`Found ${inputCount} PIN input(s)`);

    if (inputCount === 4) {
      // Fill each digit separately to trigger the useEffect
      console.log('Filling digit 1: 8');
      await pinInputs.nth(0).fill('8');
      await page.waitForTimeout(200);

      console.log('Filling digit 2: 0');
      await pinInputs.nth(1).fill('0');
      await page.waitForTimeout(200);

      console.log('Filling digit 3: 0');
      await pinInputs.nth(2).fill('0');
      await page.waitForTimeout(200);

      console.log('Filling digit 4: 8');
      await pinInputs.nth(3).fill('8');

      console.log('\n=== Waiting for auto-submit (5 seconds) ===');
      await page.waitForTimeout(5000);

    } else {
      // Fallback: single password input
      console.log('Filling single PIN input: 8008');
      await pinInputs.first().fill('8008');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(5000);
    }

    console.log('\n=== Check if login succeeded ===');
    const session = await page.evaluate(() => localStorage.getItem('todoSession'));
    console.log(`Session in localStorage: ${session ? 'YES' : 'NO'}`);

    if (!session) {
      console.log('\n❌ PIN submission did NOT call the API or set the session');
      console.log('Possible causes:');
      console.log('1. useEffect dependencies preventing handlePinSubmit() from running');
      console.log('2. selectedUser is null when PIN is submitted');
      console.log('3. isSubmitting is stuck true');
      console.log('4. lockoutSeconds > 0');
      console.log('5. isValidPin() returning false');
      console.log('6. Exception thrown before API call');
    }

    await page.screenshot({ path: '/tmp/debug-pin-submission.png', fullPage: true });
  });
});
