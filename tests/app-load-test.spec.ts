import { test, expect } from '@playwright/test';

test('app should load without JavaScript errors', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('Page error:', error.message);
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  if (errors.length > 0) {
    console.log('Errors found:', errors);
  } else {
    console.log('✓ No errors found');
  }
  
  expect(errors.length).toBe(0);
});
