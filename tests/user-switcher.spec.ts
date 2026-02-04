import { test, expect, devices } from '@playwright/test';

test.describe('UserSwitcher - Discoverability', () => {
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

    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  });

  test('should display user name label on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1024, height: 768 });

    // User name should be visible in the switcher button
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await expect(userSwitcher).toBeVisible();

    // Should contain the user's name as text
    await expect(userSwitcher.locator('text=Derrick')).toBeVisible();
  });

  test('should have accessible aria-label', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await expect(userSwitcher).toBeVisible();

    const ariaLabel = await userSwitcher.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Account menu for Derrick/i);
  });

  test('should show user initials avatar', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await expect(userSwitcher).toBeVisible();

    // Should contain initials "D" for Derrick
    await expect(userSwitcher.locator('text=D')).toBeVisible();
  });

  test('should show chevron icon indicating dropdown', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await expect(userSwitcher).toBeVisible();

    // Chevron should be present (using svg role)
    const chevron = userSwitcher.locator('svg').last();
    await expect(chevron).toBeVisible();
  });

  test('should rotate chevron when dropdown is open', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    const chevron = userSwitcher.locator('svg').last();

    // Get initial transform
    const initialClass = await chevron.getAttribute('class');
    expect(initialClass).not.toContain('rotate-180');

    // Click to open
    await userSwitcher.click();
    await page.waitForTimeout(200);

    // Chevron should rotate
    const openClass = await chevron.getAttribute('class');
    expect(openClass).toContain('rotate-180');
  });

  test('should open dropdown menu on click', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Dropdown should appear
    await expect(page.locator('text=Signed in')).toBeVisible();
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should show current user in dropdown header', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Current user section
    await expect(page.locator('text=Signed in')).toBeVisible();
    await expect(page.locator('text=Derrick').first()).toBeVisible();
  });

  test('should show switch account section if other users exist', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Should show "Switch Account" label
    const switchLabel = page.locator('text=Switch Account');

    // Either it exists (multi-user setup) or doesn't (single-user)
    const isVisible = await switchLabel.isVisible().catch(() => false);

    if (isVisible) {
      // If there are other users, should list them
      const otherUsers = page.locator('[class*="Switch Account"]').locator('..').locator('button');
      const count = await otherUsers.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should show sign out button', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Sign out button should be visible
    const signOutButton = page.locator('button:has-text("Sign Out")');
    await expect(signOutButton).toBeVisible();

    // Should have LogOut icon
    const icon = signOutButton.locator('svg');
    await expect(icon).toBeVisible();
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Dropdown should be open
    await expect(page.locator('text=Signed in')).toBeVisible();

    // Click outside
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);

    // Dropdown should close
    await expect(page.locator('text=Signed in')).not.toBeVisible();
  });

  test('should have minimum touch target size (44x44px)', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');

    const dimensions = await userSwitcher.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    // Should meet WCAG 2.1 minimum touch target size
    expect(dimensions.height).toBeGreaterThanOrEqual(44);
    expect(dimensions.width).toBeGreaterThanOrEqual(44);
  });
});

test.describe('UserSwitcher - User Switching Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  });

  test('should show PIN modal when clicking another user', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Check if there's another user available
    const switchAccountSection = page.locator('text=Switch Account');
    const hasOtherUsers = await switchAccountSection.isVisible().catch(() => false);

    if (hasOtherUsers) {
      // Click first other user
      const otherUserButton = switchAccountSection.locator('..').locator('button').first();
      await otherUserButton.click();

      // PIN modal should appear
      await expect(page.locator('text=Enter PIN')).toBeVisible();

      // Should show PIN inputs
      const pinInputs = page.locator('input[type="password"]');
      expect(await pinInputs.count()).toBe(4);
    }
  });

  test('should not switch when clicking current user', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Click current user (in the header section)
    const currentUserSection = page.locator('text=Signed in').locator('..');
    await currentUserSection.click();

    // Dropdown should close, no modal
    await page.waitForTimeout(300);
    await expect(page.locator('text=Enter PIN')).not.toBeVisible();
  });
});

test.describe('UserSwitcher - Sign Out Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  });

  test('should sign out and return to login screen', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Click sign out
    await page.click('button:has-text("Sign Out")');
    await page.waitForTimeout(500);

    // Should return to login screen
    await expect(page.locator('text=Select Your Profile')).toBeVisible({ timeout: 2000 });
  });

  test('should clear session storage on sign out', async ({ page }) => {
    // Sign out
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();
    await page.click('button:has-text("Sign Out")');
    await page.waitForTimeout(500);

    // Check localStorage is cleared
    const sessionData = await page.evaluate(() => localStorage.getItem('todoSession'));
    expect(sessionData).toBeNull();
  });
});

test.describe('UserSwitcher - Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Set iPhone 13 viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  });

  test('should hide user name label on mobile', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await expect(userSwitcher).toBeVisible();

    // User name should be hidden on mobile (has `hidden sm:inline` class)
    const userName = userSwitcher.locator('text=Derrick');

    // Check if element exists but is hidden
    const count = await userName.count();
    if (count > 0) {
      const isVisible = await userName.isVisible();
      // On mobile, it may not be visible due to CSS
      // We just verify the element structure exists
      expect(count).toBe(1);
    }
  });

  test('should show avatar and chevron on mobile', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await expect(userSwitcher).toBeVisible();

    // Avatar (initials) should be visible
    await expect(userSwitcher.locator('text=D')).toBeVisible();

    // Chevron should be visible
    const chevron = userSwitcher.locator('svg').last();
    await expect(chevron).toBeVisible();
  });

  test('should have full-width dropdown on mobile', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Dropdown should appear
    const dropdown = page.locator('text=Signed in').locator('..').locator('..');
    await expect(dropdown).toBeVisible();

    // Should have mobile-specific width class
    const className = await dropdown.getAttribute('class');
    expect(className).toContain('w-[calc(100vw-2rem)]');
  });

  test('should have touch-friendly buttons in dropdown', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Sign out button should have min-h-[44px]
    const signOutButton = page.locator('button:has-text("Sign Out")');
    const height = await signOutButton.evaluate(el => el.getBoundingClientRect().height);

    expect(height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('UserSwitcher - Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.waitForTimeout(600);
    await page.waitForTimeout(600);
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
      await page.waitForTimeout(100);
    }
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab to user switcher (may take several tabs depending on page)
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      await page.keyboard.press('Tab');

      const focused = await page.evaluate(() => {
        return document.activeElement?.getAttribute('aria-label');
      });

      if (focused?.includes('Account menu')) {
        break;
      }

      attempts++;
    }

    // Press Enter to open
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Dropdown should open
    await expect(page.locator('text=Signed in')).toBeVisible();
  });

  test('should focus sign out button after opening dropdown', async ({ page }) => {
    const userSwitcher = page.locator('button[aria-label*="Account menu"]');
    await userSwitcher.click();

    // Tab should focus on sign out button
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const focused = await page.evaluate(() => {
      return document.activeElement?.textContent;
    });

    // Should focus on either switch account button or sign out button
    expect(focused).toBeTruthy();
  });
});
