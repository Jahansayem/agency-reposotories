/**
 * Authentication helper for E2E tests
 */

export async function loginAsUser(page: any, userName: string, pin: string) {
  await page.goto('http://localhost:3000');

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
  // The app loads on the Dashboard view by default
  await page.waitForSelector('text=Good morning', { timeout: 2000 }).catch(() =>
    page.waitForSelector('text=Good afternoon', { timeout: 2000 }).catch(() =>
      page.waitForSelector('text=Good evening', { timeout: 2000 })
    )
  ).catch(() => {
    // If greeting not found, just wait for any content to load
    return page.waitForTimeout(1000);
  });
}
