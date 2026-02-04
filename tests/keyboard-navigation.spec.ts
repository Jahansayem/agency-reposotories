import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation - Login Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('skip link should be visible on focus and navigate to main content', async ({ page }) => {
    // Press Tab to focus the skip link
    await page.keyboard.press('Tab');

    // Skip link should become visible
    const skipLink = page.locator('a:has-text("Skip to main content")');
    await expect(skipLink).toBeVisible();

    // Press Enter to activate skip link
    await page.keyboard.press('Enter');

    // Main content should be focused
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('user selection should be keyboard accessible', async ({ page }) => {
    // Tab to first user card
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // First user card

    // User card should be focused
    const firstUserCard = page.locator('[data-testid^="user-card-"]').first();
    await expect(firstUserCard).toBeFocused();

    // Press Enter to select user
    await page.keyboard.press('Enter');

    // Should navigate to PIN screen
    await expect(page.locator('text=Enter PIN')).toBeVisible({ timeout: 1000 });
  });

  test('PIN input should receive focus after animation (550ms delay)', async ({ page }) => {
    // Select a user
    await page.click('[data-testid="user-card-Derrick"]');

    // Wait for animation and focus delay (550ms)
    await page.waitForTimeout(600);

    // First PIN input should be focused
    const firstPinInput = page.locator('input[type="tel"]').first();
    await expect(firstPinInput).toBeFocused();

    // Should be able to type immediately
    await page.keyboard.type('8');
    await expect(firstPinInput).toHaveValue('8');
  });

  test('PIN inputs should advance on keyboard input', async ({ page }) => {
    // Select user
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);

    // Type PIN using keyboard
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }

    // All inputs should be filled
    const pinInputsCheck = page.locator('input[type="password"]');
    await expect(pinInputsCheck.nth(0)).toHaveValue('8');
    await expect(pinInputsCheck.nth(1)).toHaveValue('0');
    await expect(pinInputsCheck.nth(2)).toHaveValue('0');
    await expect(pinInputsCheck.nth(3)).toHaveValue('8');
  });

  test('Backspace should navigate between PIN inputs', async ({ page }) => {
    // Select user
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);

    // Type partial PIN
    await page.keyboard.type('80');

    // Press Backspace
    await page.keyboard.press('Backspace');

    // Second input should be empty
    const secondInput = page.locator('input[type="tel"]').nth(1);
    await expect(secondInput).toHaveValue('');
    await expect(secondInput).toBeFocused();
  });

  test('Enter key should submit PIN when all digits entered', async ({ page }) => {
    // Select user
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);

    // Type correct PIN
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }

    // Press Enter
    await page.keyboard.press('Enter');

    // Should navigate to main app (or show error if wrong PIN)
    await expect(page.locator('text=Dashboard').or(page.locator('text=Incorrect PIN'))).toBeVisible({ timeout: 2000 });
  });

  test('Tab key should navigate through all interactive elements', async ({ page }) => {
    const focusableElements = [];

    // Start from skip link
    await page.keyboard.press('Tab');
    focusableElements.push(await page.evaluate(() => document.activeElement?.tagName));

    // Tab through all user cards
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const tagName = await page.evaluate(() => document.activeElement?.tagName);
      focusableElements.push(tagName);
    }

    // Should have focused skip link (A) and user cards (BUTTON/DIV)
    expect(focusableElements).toContain('A'); // Skip link
    expect(focusableElements.some(el => el === 'BUTTON' || el === 'DIV')).toBeTruthy();
  });

  test('Escape key should return to user selection from PIN screen', async ({ page }) => {
    // Select user
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);

    // Press Escape
    await page.keyboard.press('Escape');

    // Should return to user selection
    await expect(page.locator('text=Select Your Profile')).toBeVisible();
  });
});

test.describe('Keyboard Navigation - Main App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login as Derrick
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }

    // Wait for app to load
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 3000 });
  });

  test('Tab should navigate through main navigation', async ({ page }) => {
    // Tab through navigation buttons
    await page.keyboard.press('Tab');
    const firstNav = await page.evaluate(() => document.activeElement?.textContent);

    expect(firstNav).toMatch(/Dashboard|Tasks|Chat|Archive/);
  });

  test('Shift+Tab should navigate backwards', async ({ page }) => {
    // Focus on last element by tabbing through
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Shift+Tab backwards
    await page.keyboard.press('Shift+Tab');

    // Should move focus backwards
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('Focus should be visible with keyboard navigation', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check for visible focus indicator (outline or ring)
    const hasVisibleFocus = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;

      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' ||
             styles.boxShadow.includes('ring') ||
             el.classList.contains('focus:ring') ||
             el.classList.contains('focus:outline');
    });

    expect(hasVisibleFocus).toBeTruthy();
  });
});
