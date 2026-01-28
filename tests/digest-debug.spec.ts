import { test, expect } from '@playwright/test';

test('Debug digest API call in browser', async ({ page }) => {
  // Intercept the API call to see what headers are being sent
  const apiCalls: { url: string; headers: Record<string, string>; status: number; body?: string }[] = [];

  page.on('request', request => {
    if (request.url().includes('/api/ai/daily-digest') || request.url().includes('/api/digest/latest')) {
      const headers: Record<string, string> = {};
      request.headers();
      for (const [key, value] of Object.entries(request.headers())) {
        headers[key] = value;
      }
      console.log(`\n=== REQUEST to ${request.url()} ===`);
      console.log('Method:', request.method());
      console.log('Headers:', JSON.stringify(headers, null, 2));
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/ai/daily-digest') || response.url().includes('/api/digest/latest')) {
      let body = '';
      try {
        body = await response.text();
      } catch (e) {
        body = 'Could not read body';
      }
      console.log(`\n=== RESPONSE from ${response.url()} ===`);
      console.log('Status:', response.status());
      console.log('Body:', body.substring(0, 500));
      apiCalls.push({
        url: response.url(),
        headers: {},
        status: response.status(),
        body: body.substring(0, 500),
      });
    }
  });

  // Also log console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  await page.goto('/');

  // Wait for login screen
  await page.waitForTimeout(2000);

  // Check what's in cookies after page load
  const cookies = await page.context().cookies();
  console.log('\n=== COOKIES after page load ===');
  console.log(cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));

  // Click on Derrick
  const userCard = page.locator('button').filter({ hasText: 'Derrick' }).first();
  await expect(userCard).toBeVisible({ timeout: 10000 });
  await userCard.click();
  await page.waitForTimeout(500);

  // Enter PIN 8008
  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill('8008'[i]);
    await page.waitForTimeout(100);
  }

  await page.waitForTimeout(3000);

  // Close welcome modal
  const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
  if (await viewTasksBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await viewTasksBtn.click();
    await page.waitForTimeout(500);
  }

  // Check cookies again after login
  const cookiesAfterLogin = await page.context().cookies();
  console.log('\n=== COOKIES after login ===');
  console.log(cookiesAfterLogin.map(c => `${c.name}=${c.value.substring(0, 20)}...`));

  // Navigate to Dashboard
  const dashboardLink = page.locator('button, a').filter({ hasText: 'Dashboard' }).first();
  await expect(dashboardLink).toBeVisible({ timeout: 10000 });
  await dashboardLink.click();
  await page.waitForTimeout(3000);

  // Look for Daily Digest panel and click expand if collapsed
  const digestPanel = page.locator('text=Daily Digest').first();
  await expect(digestPanel).toBeVisible({ timeout: 10000 });

  // Wait for any auto-fetch to complete
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-digest-1.png', fullPage: true });

  // Look for Generate Now button
  const generateBtn = page.locator('button').filter({ hasText: 'Generate Now' });
  const hasGenerateBtn = await generateBtn.isVisible({ timeout: 3000 }).catch(() => false);

  if (hasGenerateBtn) {
    console.log('\n=== Clicking Generate Now ===');
    await generateBtn.click();
    await page.waitForTimeout(10000); // Wait for AI response
    await page.screenshot({ path: 'test-results/debug-digest-2.png', fullPage: true });
  }

  // Try Generate fresh if visible
  const generateFresh = page.locator('button').filter({ hasText: 'Generate fresh' });
  const hasGenerateFresh = await generateFresh.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasGenerateFresh) {
    console.log('\n=== Clicking Generate fresh ===');
    await generateFresh.click();
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'test-results/debug-digest-3.png', fullPage: true });
  }

  // Print summary
  console.log('\n=== API CALLS SUMMARY ===');
  for (const call of apiCalls) {
    console.log(`${call.status} ${call.url}`);
  }
});
