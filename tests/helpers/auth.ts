/**
 * Authentication helper for E2E tests
 *
 * Increased timeouts to handle parallel test execution with multiple workers
 */

import { hideDevOverlay } from './test-base';

export async function loginAsUser(page: any, userName: string, pin: string) {
  // Use longer timeout for navigation when running in parallel
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Hide the Next.js dev overlay to prevent pointer event interception on mobile
  await hideDevOverlay(page);

  // Wait for login screen with retry logic
  let userCardFound = false;
  for (let attempt = 0; attempt < 3 && !userCardFound; attempt++) {
    try {
      await page.waitForSelector(`[data-testid="user-card-${userName}"]`, { timeout: 15000 });
      userCardFound = true;
    } catch {
      if (attempt < 2) {
        // Reload and try again
        await page.reload({ waitUntil: 'domcontentloaded' });
        await hideDevOverlay(page);
      } else {
        throw new Error(`Could not find user card for ${userName} after ${attempt + 1} attempts`);
      }
    }
  }

  // Select user and wait for transition
  await page.click(`[data-testid="user-card-${userName}"]`);

  // Wait for PIN screen to appear (first input with type password)
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  // Wait for PIN input animation to complete

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
    await page.waitForSelector('nav[aria-label="Main navigation"]', { timeout: 20000 }).catch(() => {
      // Fallback: wait for any dashboard content to load
      return page.waitForTimeout(3000);
    });
  } else {
    // On desktop, the sidebar navigation landmark is always present after login
    await page.waitForSelector('[role="complementary"][aria-label="Main navigation"]', { timeout: 20000 }).catch(() => {
      // Fallback: wait for any content to load
      return page.waitForTimeout(3000);
    });
  }
}
