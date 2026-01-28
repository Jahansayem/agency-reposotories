import { test, expect, Page } from '@playwright/test';

/**
 * Daily Digest Tests
 *
 * Tests the AI-powered daily digest functionality.
 */

// Helper to login with an existing user
async function loginAsExistingUser(page: Page, userName: string = 'Derrick', pin: string = '8008') {
  await page.goto('/');

  // Wait for login screen
  const header = page.locator('h1, h2').filter({ hasText: 'Bealer Agency' }).first();
  await expect(header).toBeVisible({ timeout: 15000 });

  // Wait for users list to load
  await page.waitForTimeout(1000);

  // Click on the user card
  const userCard = page.locator('button').filter({ hasText: userName }).first();
  await expect(userCard).toBeVisible({ timeout: 10000 });
  await userCard.click();

  // Wait for PIN entry screen
  await page.waitForTimeout(500);

  // Enter PIN
  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });

  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(pin[i]);
    await page.waitForTimeout(100);
  }

  // Wait for login
  await page.waitForTimeout(2000);

  // Close welcome modal if present
  const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
  if (await viewTasksBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await viewTasksBtn.click();
    await page.waitForTimeout(500);
  }

  // Wait for main app
  await page.waitForTimeout(1000);
}

test.describe('Daily Digest Tests', () => {
  test('Navigate to dashboard and check digest panel', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      }
    });

    // Log network requests to /api/
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        console.log(`API Response: ${response.status()} ${url}`);
      }
    });

    await loginAsExistingUser(page, 'Derrick', '8008');

    // Navigate to Dashboard
    const dashboardLink = page.locator('button, a').filter({ hasText: 'Dashboard' }).first();
    await expect(dashboardLink).toBeVisible({ timeout: 10000 });
    await dashboardLink.click();
    await page.waitForTimeout(2000);

    // Look for Daily Digest panel
    const digestPanel = page.locator('text=Daily Digest').first();
    await expect(digestPanel).toBeVisible({ timeout: 10000 });
    console.log('✓ Daily Digest panel found');

    // Take a screenshot
    await page.screenshot({ path: 'test-results/digest-panel.png', fullPage: true });

    // Check for error state
    const errorText = page.locator('text=Unable to load digest');
    const isError = await errorText.isVisible({ timeout: 3000 }).catch(() => false);

    if (isError) {
      console.log('✗ Digest shows error state');
      const errorMsg = await page.locator('text=Authentication required').isVisible().catch(() => false);
      if (errorMsg) {
        console.log('✗ Error: Authentication required');
      }
    }

    // Check for "Generate Now" button
    const generateBtn = page.locator('button').filter({ hasText: 'Generate Now' });
    const hasGenerateBtn = await generateBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasGenerateBtn) {
      console.log('✓ Generate Now button visible');

      // Click Generate Now and monitor network
      console.log('Clicking Generate Now...');
      await generateBtn.click();

      // Wait for response
      await page.waitForTimeout(5000);

      // Take screenshot of result
      await page.screenshot({ path: 'test-results/digest-after-generate.png', fullPage: true });

      // Check if still showing error
      const stillError = await page.locator('text=Unable to load digest').isVisible().catch(() => false);
      if (stillError) {
        console.log('✗ Still showing error after generate');
      } else {
        console.log('✓ Digest generated successfully');
      }
    }
  });

  test('Test digest API directly', async ({ request }) => {
    // Test the /api/digest/latest endpoint
    const latestResponse = await request.get('/api/digest/latest', {
      headers: {
        'X-User-Name': 'Derrick',
      },
    });

    console.log('GET /api/digest/latest status:', latestResponse.status());
    const latestData = await latestResponse.json();
    console.log('Response:', JSON.stringify(latestData, null, 2));

    expect(latestResponse.status()).toBe(200);
  });

  test('Test generate digest API directly', async ({ request }) => {
    // First get CSRF token by loading main page
    const pageResponse = await request.get('/');
    const cookies = pageResponse.headers()['set-cookie'];
    console.log('Cookies:', cookies);

    // Extract CSRF token
    let csrfToken = '';
    if (cookies) {
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      if (csrfMatch) {
        csrfToken = csrfMatch[1];
        console.log('CSRF Token:', csrfToken);
      }
    }

    // Test the /api/ai/daily-digest endpoint
    const generateResponse = await request.post('/api/ai/daily-digest', {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Name': 'Derrick',
        ...(csrfToken && {
          'X-CSRF-Token': csrfToken,
          'Cookie': `csrf_token=${csrfToken}`,
        }),
      },
      data: {
        userName: 'Derrick',
      },
    });

    console.log('POST /api/ai/daily-digest status:', generateResponse.status());
    const generateData = await generateResponse.json();
    console.log('Response:', JSON.stringify(generateData, null, 2).substring(0, 500));

    if (generateResponse.status() !== 200) {
      console.log('Full error response:', JSON.stringify(generateData, null, 2));
    }
  });
});
