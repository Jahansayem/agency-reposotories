/**
 * Authentication helper for E2E tests
 */

export async function loginAsUser(page: any, userName: string, pin: string) {
  await page.goto('http://localhost:3000');

  // Wait for login screen
  await page.waitForSelector(`[data-testid="user-card-${userName}"]`, { timeout: 10000 });

  // Select user
  await page.click(`[data-testid="user-card-${userName}"]`);

  // Enter PIN
  await page.fill('[data-testid="pin-input"]', pin);
  await page.click('[data-testid="login-button"]');

  // Wait for main app to load
  await page.waitForSelector('[data-testid="add-task-input"]', { timeout: 10000 });
}
