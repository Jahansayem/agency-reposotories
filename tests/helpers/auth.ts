/**
 * Authentication helper for E2E tests
 */

import { hideDevOverlay } from './test-base';

export async function loginAsUser(page: any, userName: string, pin: string) {
  await page.goto('http://localhost:3000');

  // Hide the Next.js dev overlay to prevent pointer event interception on mobile
  await hideDevOverlay(page);

  // Wait for login screen
  await page.waitForSelector(`[data-testid="user-card-${userName}"]`, { timeout: 10000 });

  // Select user and wait for transition
  await page.click(`[data-testid="user-card-${userName}"]`);

  // Wait for PIN screen to appear (first input with type password)
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.waitForTimeout(500); // Wait for animation

  // Enter PIN - each digit in separate input
  const pinDigits = pin.split('');
  for (let i = 0; i < pinDigits.length; i++) {
    const input = page.locator('input[type="password"]').nth(i);
    await input.fill(pinDigits[i]);
  }

  // Wait for auto-submit and main app to load
  // On mobile, the sidebar navigation is not visible, so we need to check for the bottom nav instead
  const isMobile = await page.evaluate(() => window.innerWidth < 768);

  if (isMobile) {
    // On mobile, wait for the bottom navigation bar
    await page.waitForSelector('nav[aria-label="Main navigation"]', { timeout: 15000 }).catch(() => {
      // Fallback: wait for any dashboard content to load
      return page.waitForTimeout(2000);
    });
  } else {
    // On desktop, the sidebar navigation landmark is always present after login
    await page.waitForSelector('[role="complementary"][aria-label="Main navigation"]', { timeout: 15000 }).catch(() => {
      // Fallback: wait for any content to load
      return page.waitForTimeout(2000);
    });
  }
}
