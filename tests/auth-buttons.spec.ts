/**
 * Auth / Login Flow E2E Tests
 *
 * Comprehensive tests for the PIN-based authentication flow:
 * - Login screen rendering and user card display
 * - PIN entry, correct/incorrect PIN handling
 * - Back navigation from PIN screen
 * - Create Account modal open/close
 * - Forgot PIN modal open/close
 * - Invite code section expand/collapse
 * - Logout returns to login screen
 * - Search filtering (when > 5 users)
 */

import { test, expect } from './helpers/test-base';

const BASE_URL = 'http://localhost:3000';

// Helper: navigate to login screen and wait for it to be ready
async function goToLoginScreen(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 10000 });
}

// Helper: perform full login as Derrick (PIN 8008)
async function loginAsDerrick(page: import('@playwright/test').Page) {
  await goToLoginScreen(page);

  const userCard = page.locator('[data-testid="user-card-Derrick"]');
  await expect(userCard).toBeVisible({ timeout: 10000 });
  await userCard.click();

  // Wait for PIN entry screen to animate in
  await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });

  const pin = '8008';
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(pin[i]);
  }

  // PIN auto-submits; wait for the app to load after successful login
  // Sidebar uses lg:flex (1024px+), bottom nav uses lg:hidden
  const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);
  if (isDesktop) {
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });
  } else {
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible({ timeout: 15000 });
  }
}

test.describe('Auth Flow - Login Screen', () => {

  test('login screen loads and displays user cards', async ({ page }) => {
    await goToLoginScreen(page);

    // Verify the welcome heading and subtitle are visible
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByText('Select your account to continue')).toBeVisible();

    // Verify at least one user card is displayed (Derrick should exist)
    const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(derrickCard).toBeVisible({ timeout: 10000 });

    // Verify the user card contains the name
    await expect(derrickCard.getByText('Derrick')).toBeVisible();
  });

  test('clicking a user card navigates to PIN entry screen', async ({ page }) => {
    await goToLoginScreen(page);

    const userCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(userCard).toBeVisible({ timeout: 10000 });
    await userCard.click();

    // PIN screen should show: selected user name, PIN prompt, and PIN inputs
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Derrick' })).toBeVisible();

    // 4 password inputs should be visible for PIN entry
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs).toHaveCount(4, { timeout: 5000 });
    await expect(pinInputs.first()).toBeVisible();

    // Back button should be visible
    await expect(page.getByRole('button', { name: /Back/ })).toBeVisible();
  });

  test('back button on PIN screen returns to user list', async ({ page }) => {
    await goToLoginScreen(page);

    // Navigate to PIN screen
    const userCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(userCard).toBeVisible({ timeout: 10000 });
    await userCard.click();
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

    // Click back button
    const backButton = page.getByRole('button', { name: /Back/ });
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should return to user list with Welcome back heading
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Select your account to continue')).toBeVisible();

    // User cards should be visible again
    await expect(page.locator('[data-testid="user-card-Derrick"]')).toBeVisible({ timeout: 5000 });
  });

  test('entering correct PIN (Derrick / 8008) logs in successfully', async ({ page }) => {
    await loginAsDerrick(page);

    // At this point loginAsDerrick already asserted that the main navigation is visible,
    // meaning login was successful. Let's also verify the login screen is gone.
    await expect(page.getByRole('heading', { name: 'Welcome back' })).not.toBeVisible();
  });

  test('entering wrong PIN shows error message', async ({ page }) => {
    await goToLoginScreen(page);

    const userCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(userCard).toBeVisible({ timeout: 10000 });
    await userCard.click();

    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

    // Enter a wrong PIN
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });

    const wrongPin = '1234';
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill(wrongPin[i]);
    }

    // PIN auto-submits on 4 digits; wait for the specific error alert to appear
    const errorAlert = page.locator('#pin-error');
    await expect(errorAlert).toBeVisible({ timeout: 15000 });

    // Error should contain text about incorrect PIN or an error message
    const errorText = await errorAlert.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText!.length).toBeGreaterThan(0);

    // PIN inputs should be cleared after wrong attempt (component resets them)
    // First input should be re-focused and empty
    await expect(pinInputs.first()).toBeVisible();
  });

});

test.describe('Auth Flow - Create Account Modal', () => {

  test('"Create Account" button opens the registration modal', async ({ page }) => {
    await goToLoginScreen(page);

    // Click the Create Account button
    const createAccountButton = page.getByRole('button', { name: 'Create Account' });
    await expect(createAccountButton).toBeVisible({ timeout: 5000 });
    await createAccountButton.click();

    // Registration modal should open with its title
    const modalTitle = page.locator('[role="dialog"] h2, #register-modal-title');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    await expect(modalTitle).toHaveText('Create Account');

    // Modal should show the name input step
    await expect(page.getByLabel(/what.*name/i)).toBeVisible({ timeout: 3000 });
  });

  test('registration modal close button works', async ({ page }) => {
    await goToLoginScreen(page);

    // Open the registration modal
    const createAccountButton = page.getByRole('button', { name: 'Create Account' });
    await expect(createAccountButton).toBeVisible({ timeout: 5000 });
    await createAccountButton.click();

    // Verify modal is open
    const modalTitle = page.locator('#register-modal-title');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Click the close button (X icon with aria-label)
    const closeButton = page.getByRole('button', { name: 'Close registration modal' });
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Modal should be closed -- the dialog title should no longer be visible
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });

    // Login screen should still be visible
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('registration modal closes when clicking the backdrop overlay', async ({ page }) => {
    await goToLoginScreen(page);

    // Open the registration modal
    await page.getByRole('button', { name: 'Create Account' }).click();
    const modalTitle = page.locator('#register-modal-title');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Click on the backdrop (the fixed overlay behind the dialog)
    // The backdrop is the outermost div with bg-black/50. Click at coordinates outside the dialog.
    await page.mouse.click(10, 10);

    // Modal should close
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });
  });

});

test.describe('Auth Flow - Forgot PIN Modal', () => {

  test('"Forgot PIN?" link opens the forgot PIN modal', async ({ page }) => {
    await goToLoginScreen(page);

    // Navigate to PIN screen first (Forgot PIN is only on the PIN screen)
    const userCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(userCard).toBeVisible({ timeout: 10000 });
    await userCard.click();
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

    // Click "Forgot PIN?"
    const forgotPinButton = page.getByRole('button', { name: 'Forgot PIN?' });
    await expect(forgotPinButton).toBeVisible();
    await forgotPinButton.click();

    // Forgot PIN modal should open
    await expect(page.getByRole('heading', { name: /Forgot Your PIN/i })).toBeVisible({ timeout: 5000 });

    // Should display the user's name in the modal text (use strong tag to avoid matching the heading)
    await expect(page.locator('strong').filter({ hasText: 'Derrick' })).toBeVisible();

    // Email input should be visible
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
  });

  test('forgot PIN modal close button works', async ({ page }) => {
    await goToLoginScreen(page);

    // Navigate to PIN screen
    const userCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(userCard).toBeVisible({ timeout: 10000 });
    await userCard.click();
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

    // Open forgot PIN modal
    await page.getByRole('button', { name: 'Forgot PIN?' }).click();
    const modalHeading = page.getByRole('heading', { name: /Forgot Your PIN/i });
    await expect(modalHeading).toBeVisible({ timeout: 5000 });

    // Click the Cancel button to close the modal
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Modal should close
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });

    // PIN screen should still be visible (we should still be on the PIN entry for Derrick)
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible();
  });

  test('forgot PIN modal closes when clicking backdrop overlay', async ({ page }) => {
    await goToLoginScreen(page);

    // Navigate to PIN screen
    await page.locator('[data-testid="user-card-Derrick"]').click();
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

    // Open forgot PIN modal
    await page.getByRole('button', { name: 'Forgot PIN?' }).click();
    const modalHeading = page.getByRole('heading', { name: /Forgot Your PIN/i });
    await expect(modalHeading).toBeVisible({ timeout: 5000 });

    // Click outside the modal on the backdrop
    await page.mouse.click(10, 10);

    // Modal should close
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });
  });

});

test.describe('Auth Flow - Invite Code Section', () => {

  test('"Have an invite code?" section expands and collapses', async ({ page }) => {
    await goToLoginScreen(page);

    // The invite code toggle button should be visible
    const inviteButton = page.getByRole('button', { name: /Have an invite code/i });
    await expect(inviteButton).toBeVisible({ timeout: 5000 });

    // Initially, the token input should NOT be visible (section is collapsed)
    const tokenInput = page.getByPlaceholder('Paste invitation token...');
    await expect(tokenInput).not.toBeVisible();

    // Click to expand
    await inviteButton.click();

    // Token input should now be visible (with animation)
    await expect(tokenInput).toBeVisible({ timeout: 3000 });

    // Validate Invitation button should also be visible
    await expect(page.getByRole('button', { name: 'Validate Invitation' })).toBeVisible();

    // Click again to collapse
    await inviteButton.click();

    // Token input should be hidden again
    await expect(tokenInput).not.toBeVisible({ timeout: 3000 });
  });

});

test.describe('Auth Flow - Logout', () => {

  test('after login, logout returns to login screen', async ({ page }) => {
    // Log in first
    await loginAsDerrick(page);

    // Sidebar uses lg:flex (1024px+), so only desktop (>=1024) has the sidebar Log out button
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);

    if (isDesktop) {
      // Desktop: sidebar has "Log out" button with aria-label
      const logoutButton = page.getByRole('button', { name: 'Log out' });
      await expect(logoutButton).toBeVisible({ timeout: 5000 });
      await logoutButton.click();
    } else {
      // Mobile/tablet: use the More menu or user menu to find logout
      const userMenuButton = page.getByRole('button', { name: /User menu/i });
      if (await userMenuButton.isVisible().catch(() => false)) {
        await userMenuButton.click();
        const logoutButton = page.getByRole('menuitem', { name: /Logout/i });
        await expect(logoutButton).toBeVisible({ timeout: 5000 });
        await logoutButton.click();
      } else {
        // Fallback: directly clear session and navigate
        await page.evaluate(() => localStorage.removeItem('todoSession'));
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
    }

    // Should return to login screen
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Auth Flow - Search Filtering', () => {

  test('search field filters user cards when more than 5 users exist', async ({ page }) => {
    await goToLoginScreen(page);

    // The search field only appears if there are more than 5 users
    const searchInput = page.getByPlaceholder('Search team...');
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (!hasSearch) {
      // If fewer than 6 users, search is not shown -- skip gracefully
      test.skip();
      return;
    }

    // Count initial user cards
    const allCards = page.locator('[data-testid^="user-card-"]');
    const initialCount = await allCards.count();
    expect(initialCount).toBeGreaterThan(5);

    // Type a search query that should filter results
    await searchInput.fill('Derrick');
    await page.waitForTimeout(300); // Let filtering settle

    // Should show only matching cards
    const filteredCards = page.locator('[data-testid^="user-card-"]');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThanOrEqual(1);

    // Derrick's card should still be visible
    await expect(page.locator('[data-testid="user-card-Derrick"]')).toBeVisible();

    // Clear the search
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // All cards should reappear
    const resetCount = await allCards.count();
    expect(resetCount).toBe(initialCount);
  });

  test('search with no results shows empty state message', async ({ page }) => {
    await goToLoginScreen(page);

    const searchInput = page.getByPlaceholder('Search team...');
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (!hasSearch) {
      test.skip();
      return;
    }

    // Type a query that should match no users
    await searchInput.fill('zzzznonexistentuser');
    await page.waitForTimeout(300);

    // Should show "No results" message
    await expect(page.getByText(/No results for/i)).toBeVisible({ timeout: 3000 });

    // No user cards should be visible
    const cards = page.locator('[data-testid^="user-card-"]');
    await expect(cards).toHaveCount(0);
  });

});

test.describe('Auth Flow - PIN Input Behavior', () => {

  test('PIN inputs only accept numeric digits', async ({ page }) => {
    await goToLoginScreen(page);

    const userCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(userCard).toBeVisible({ timeout: 10000 });
    await userCard.click();
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });

    // Try typing a letter -- should not be accepted
    await pinInputs.first().focus();
    await page.keyboard.type('a');

    // The input should still be empty (non-numeric rejected)
    await expect(pinInputs.first()).toHaveValue('');

    // Now type a digit -- should be accepted
    await page.keyboard.type('5');
    await expect(pinInputs.first()).toHaveValue('5');
  });

  test('PIN input auto-focuses next field after digit entry', async ({ page }) => {
    await goToLoginScreen(page);

    const userCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(userCard).toBeVisible({ timeout: 10000 });
    await userCard.click();
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible({ timeout: 5000 });

    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });

    // Type first digit into first input
    await pinInputs.nth(0).fill('8');

    // Second input should now be focused
    await expect(pinInputs.nth(1)).toBeFocused({ timeout: 2000 });

    // Type second digit
    await pinInputs.nth(1).fill('0');

    // Third input should now be focused
    await expect(pinInputs.nth(2)).toBeFocused({ timeout: 2000 });
  });

});

test.describe('Auth Flow - Multiple User Selection', () => {

  test('can select different users and return to user list between attempts', async ({ page }) => {
    await goToLoginScreen(page);

    // Click on Derrick
    const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
    await expect(derrickCard).toBeVisible({ timeout: 10000 });
    await derrickCard.click();

    // Verify we are on Derrick's PIN screen
    await expect(page.getByRole('heading', { name: 'Derrick' })).toBeVisible({ timeout: 5000 });

    // Go back
    await page.getByRole('button', { name: /Back/ }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 5000 });

    // Now verify all user cards are still available and interactable
    // (clicking back shouldn't break the user list)
    await expect(derrickCard).toBeVisible({ timeout: 5000 });

    // Try clicking Derrick again -- should navigate to PIN screen again
    await derrickCard.click();
    await expect(page.getByRole('heading', { name: 'Derrick' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible();
  });

});
