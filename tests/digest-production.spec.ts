import { test, expect } from '@playwright/test';

const PROD_URL = 'https://shared-todo-list-production.up.railway.app';

test('Test digest on production', async ({ page }) => {
  // Log all API calls
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`REQUEST: ${request.method()} ${request.url()}`);
      const headers = request.headers();
      if (headers['x-user-name']) console.log('  X-User-Name:', headers['x-user-name']);
      if (headers['x-csrf-token']) console.log('  X-CSRF-Token:', headers['x-csrf-token']?.substring(0, 20) + '...');
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/ai/') || response.url().includes('/api/digest/')) {
      let body = '';
      try { body = await response.text(); } catch {}
      console.log(`RESPONSE: ${response.status()} ${response.url()}`);
      console.log('  Body:', body.substring(0, 300));
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  await page.goto(PROD_URL);
  await page.waitForLoadState('networkidle');

  // Check cookies
  const cookies = await page.context().cookies();
  console.log('Cookies:', cookies.map(c => c.name).join(', '));

  // Login as Derrick
  const userCard = page.locator('button').filter({ hasText: 'Derrick' }).first();
  if (await userCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await userCard.click();
    await page.waitForLoadState('networkidle');

    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }
    await page.waitForLoadState('networkidle');

    // Close welcome modal
    const viewTasksBtn = page.locator('button').filter({ hasText: 'View Tasks' });
    if (await viewTasksBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewTasksBtn.click();
    }
  }

  await page.waitForLoadState('networkidle');

  // Navigate to Dashboard
  const dashboardLink = page.locator('button, a').filter({ hasText: 'Dashboard' }).first();
  if (await dashboardLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await dashboardLink.click();
    await page.waitForLoadState('networkidle');
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/prod-digest-1.png', fullPage: true });

  // Look for Generate Now button
  const generateBtn = page.locator('button').filter({ hasText: 'Generate Now' });
  if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('\n=== Clicking Generate Now on PRODUCTION ===');
    await generateBtn.click();
    // Genuine timing wait: production digest generation takes time
    await page.waitForTimeout(15000);
    await page.screenshot({ path: 'test-results/prod-digest-2.png', fullPage: true });
  }

  // Check for error
  const errorText = page.locator('text=Unable to load');
  if (await errorText.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('ERROR: Digest failed to load on production');
    const authError = await page.locator('text=Authentication required').isVisible().catch(() => false);
    if (authError) console.log('ERROR TYPE: Authentication required');
  }
});
