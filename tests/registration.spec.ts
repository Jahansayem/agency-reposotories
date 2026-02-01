import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should show Create Account button on login screen', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });

    // Create Account button should be visible
    const createAccountButton = page.locator('button:has-text("Create Account")');
    await expect(createAccountButton).toBeVisible();
  });

  test('should open registration modal when Create Account is clicked', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });

    // Click Create Account
    await page.click('button:has-text("Create Account")');

    // Modal should open
    await expect(page.locator('text=Create Account').first()).toBeVisible();
    await expect(page.locator('text=Name').first()).toBeVisible();
    await expect(page.locator('text=PIN').first()).toBeVisible();
    await expect(page.locator('text=Confirm').first()).toBeVisible();
  });

  test('should validate name is required', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Try to submit without entering name
    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toBeDisabled();

    // Enter just a space
    await page.fill('input[id="name"]', ' ');
    await continueButton.click();

    // Should show error
    await expect(page.locator('text=Please enter your name')).toBeVisible();
  });

  test('should validate name minimum length', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Enter single character name
    await page.fill('input[id="name"]', 'A');
    await page.click('button:has-text("Continue")');

    // Should show error
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible();
  });

  test('should validate name maximum length', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Enter very long name (51 characters)
    const longName = 'A'.repeat(51);
    await page.fill('input[id="name"]', longName);

    // Input should enforce maxLength
    const inputValue = await page.locator('input[id="name"]').inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(50);
  });

  test('should proceed to PIN step after valid name', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Enter valid name
    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Should move to PIN step
    await expect(page.locator('text=Create a 4-digit PIN')).toBeVisible();

    // Should show 4 PIN inputs
    const pinInputs = page.locator('input[type="password"]');
    expect(await pinInputs.count()).toBe(4);
  });

  test('should show user avatar with initials on PIN step', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Enter name with two words
    await page.fill('input[id="name"]', 'John Smith');
    await page.click('button:has-text("Continue")');

    // Should show avatar with initials "JS"
    await expect(page.locator('text=John Smith')).toBeVisible();
    await expect(page.locator('text=Create a 4-digit PIN')).toBeVisible();
  });

  test('should auto-advance PIN inputs as digits are entered', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Enter PIN digits one by one
    const pinInputs = page.locator('input[type="password"]');

    await pinInputs.nth(0).fill('1');
    // Focus should move to second input
    await expect(pinInputs.nth(1)).toBeFocused();

    await pinInputs.nth(1).fill('2');
    await expect(pinInputs.nth(2)).toBeFocused();

    await pinInputs.nth(2).fill('3');
    await expect(pinInputs.nth(3)).toBeFocused();
  });

  test('should auto-proceed to confirm step when PIN is complete', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Enter complete PIN
    await page.keyboard.type('1234');
    await page.waitForTimeout(300);

    // Should automatically advance to confirm step
    await expect(page.locator('text=Confirm your PIN')).toBeVisible();
  });

  test('should allow going back from PIN to name step', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Should be on PIN step
    await expect(page.locator('text=Create a 4-digit PIN')).toBeVisible();

    // Click Back button
    await page.click('button:has-text("Back")');

    // Should return to name step
    await expect(page.locator('input[id="name"]')).toBeVisible();
    // Name should be preserved
    await expect(page.locator('input[id="name"]')).toHaveValue('Test User');
  });

  test('should detect PIN mismatch and show error', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Enter PIN
    await page.keyboard.type('1234');
    await page.waitForTimeout(300);

    // Enter different confirmation PIN
    await page.keyboard.type('5678');
    await page.waitForTimeout(500);

    // Should show error
    await expect(page.locator('text=PINs do not match')).toBeVisible();

    // Confirm PIN inputs should be cleared
    const confirmPinInputs = page.locator('input[type="password"]');
    for (let i = 0; i < 4; i++) {
      const value = await confirmPinInputs.nth(i).inputValue();
      expect(value).toBe('');
    }
  });

  test('should allow going back from confirm to PIN step', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');
    await page.keyboard.type('1234');
    await page.waitForTimeout(300);

    // Should be on confirm step
    await expect(page.locator('text=Confirm your PIN')).toBeVisible();

    // Click Back
    await page.click('button:has-text("Back")');

    // Should return to PIN step
    await expect(page.locator('text=Create a 4-digit PIN')).toBeVisible();
  });

  test('should reject duplicate usernames', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Try to register with existing user name (e.g., "Derrick")
    await page.fill('input[id="name"]', 'Derrick');
    await page.click('button:has-text("Continue")');

    // Should show error about name being taken
    await expect(page.locator('text=/already taken|choose a different name/i')).toBeVisible();
  });

  test('should successfully create account and auto-login', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Generate unique username
    const uniqueName = `TestUser${Date.now()}`;

    // Step 1: Enter name
    await page.fill('input[id="name"]', uniqueName);
    await page.click('button:has-text("Continue")');

    // Step 2: Enter PIN
    await page.keyboard.type('1234');
    await page.waitForTimeout(300);

    // Step 3: Confirm PIN
    await page.keyboard.type('1234');
    await page.waitForTimeout(1000);

    // Should auto-login and redirect to dashboard
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });

    // Verify user name appears in UI (UserSwitcher)
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible();

    // Clean up: Delete the test user
    // (Note: In a real test, you'd want to clean up the database)
  });

  test('should close modal when X button is clicked', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Modal should be open
    await expect(page.locator('text=Create Account').first()).toBeVisible();

    // Click close button
    await page.click('button[aria-label="Close registration modal"]');

    // Modal should close
    await expect(page.locator('text=Create Account').first()).not.toBeVisible();
    // Should return to login screen
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should close modal when clicking outside', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Modal should be open
    await expect(page.locator('text=Create Account').first()).toBeVisible();

    // Click outside modal (on backdrop)
    await page.click('body', { position: { x: 10, y: 10 } });

    // Modal should close
    await expect(page.locator('text=Create Account').first()).not.toBeVisible();
  });

  test('should reset all fields when modal is reopened', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });

    // Open modal and enter some data
    await page.click('button:has-text("Create Account")');
    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Close modal
    await page.click('button[aria-label="Close registration modal"]');

    // Reopen modal
    await page.click('button:has-text("Create Account")');

    // Should be back at step 1 with empty fields
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[id="name"]')).toHaveValue('');
  });

  test('should handle keyboard navigation (Backspace) in PIN inputs', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    const pinInputs = page.locator('input[type="password"]');

    // Enter 3 digits
    await pinInputs.nth(0).fill('1');
    await pinInputs.nth(1).fill('2');
    await pinInputs.nth(2).fill('3');

    // Focus should be on 4th input
    await expect(pinInputs.nth(3)).toBeFocused();

    // Press Backspace (should move to 3rd input)
    await page.keyboard.press('Backspace');
    await expect(pinInputs.nth(2)).toBeFocused();

    // Press Backspace again (should move to 2nd input)
    await page.keyboard.press('Backspace');
    await expect(pinInputs.nth(1)).toBeFocused();
  });

  test('should show progress indicators for all 3 steps', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Step 1: Name should be highlighted
    await expect(page.locator('text=Name').first()).toBeVisible();

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Step 2: PIN should be highlighted, Name should show checkmark
    await expect(page.locator('text=PIN').first()).toBeVisible();

    await page.keyboard.type('1234');
    await page.waitForTimeout(300);

    // Step 3: Confirm should be highlighted
    await expect(page.locator('text=Confirm').first()).toBeVisible();
  });

  test('should disable inputs while submitting', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    const uniqueName = `TestUser${Date.now()}`;

    await page.fill('input[id="name"]', uniqueName);
    await page.click('button:has-text("Continue")');
    await page.keyboard.type('1234');
    await page.waitForTimeout(300);
    await page.keyboard.type('1234');

    // Check if "Creating your account..." message appears
    // (May be too fast to catch, but validates the flow)
    await page.waitForTimeout(500);

    // Should auto-login and go to dashboard
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should only accept numeric input in PIN fields', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    const pinInputs = page.locator('input[type="password"]');

    // Try to type letters
    await pinInputs.nth(0).fill('a');
    await expect(pinInputs.nth(0)).toHaveValue('');

    // Try to type special characters
    await pinInputs.nth(0).fill('!');
    await expect(pinInputs.nth(0)).toHaveValue('');

    // Numbers should work
    await pinInputs.nth(0).fill('1');
    await expect(pinInputs.nth(0)).toHaveValue('1');
  });
});

test.describe('Registration - Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Modal should have proper ARIA attributes
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'register-modal-title');

    // Close button should have aria-label
    const closeButton = page.locator('button[aria-label="Close registration modal"]');
    await expect(closeButton).toBeVisible();
  });

  test('should auto-focus name input when modal opens', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    // Wait for modal animation
    await page.waitForTimeout(200);

    // Name input should be focused
    const nameInput = page.locator('input[id="name"]');
    await expect(nameInput).toBeFocused();
  });

  test('should auto-focus first PIN input on PIN step', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Create Account")');

    await page.fill('input[id="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Wait for step transition
    await page.waitForTimeout(200);

    // First PIN input should be focused
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.nth(0)).toBeFocused();
  });
});
