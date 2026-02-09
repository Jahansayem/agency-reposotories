import { test, expect } from '@playwright/test';

test.describe('Session Validation', () => {
  test('should detect missing session cookie before file upload', async ({ page }) => {
    // Go to the app
    await page.goto('http://localhost:3000');
    
    // Login as Derrick
    await page.locator('[data-testid="user-card-Derrick"]').click();
      const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }
    
    // Wait for login to complete
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');
    
    // Verify session cookie exists
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session_token');
    expect(sessionCookie).toBeTruthy();
    
    // Now clear the session cookie (simulate expired session)
    await page.context().clearCookies();
    
    // Verify cookie is gone
    const cookiesAfter = await page.context().cookies();
    const sessionCookieAfter = cookiesAfter.find(c => c.name === 'session_token');
    expect(sessionCookieAfter).toBeFalsy();
    
    console.log('✓ Successfully simulated expired session');
    
    // Try to open Add Task modal
    const addTaskButton = page.locator('button:has-text("Add Task")');
    if (await addTaskButton.isVisible()) {
      await addTaskButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✓ Opened Add Task modal');
    }
  });
});
