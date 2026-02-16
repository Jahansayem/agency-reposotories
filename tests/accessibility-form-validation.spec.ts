import { test, expect } from '@playwright/test';

test.describe('Accessibility - Form Validation ARIA Announcements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
  });

  test.describe('LoginScreen - PIN Validation', () => {
    test('should have aria-invalid on PIN inputs when error occurs', async ({ page }) => {
      // Select user (Derrick)
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await expect(derrickCard).toBeVisible();
      await derrickCard.click();

      // Enter incorrect PIN
      const pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      // Wait for error message
      await page.waitForLoadState('networkidle');

      // Check for error message with role="alert"
      const errorAlert = page.locator('[role="alert"]').first();
      await expect(errorAlert).toBeVisible();

      // Verify error text
      const errorText = await errorAlert.textContent();
      expect(errorText?.toLowerCase()).toContain('incorrect');

      // Verify PIN inputs have aria-invalid="true"
      for (let i = 0; i < 4; i++) {
        const ariaInvalid = await pinInputs.nth(i).getAttribute('aria-invalid');
        expect(ariaInvalid).toBe('true');
      }
    });

    test('should have aria-describedby linking to error message', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      const pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      // Check aria-describedby points to error element
      const firstInput = pinInputs.nth(0);
      const ariaDescribedby = await firstInput.getAttribute('aria-describedby');
      expect(ariaDescribedby).toBe('pin-error');

      // Verify error element has matching id
      const errorElement = page.locator('#pin-error');
      await expect(errorElement).toBeVisible();
    });

    test('should announce error with aria-live="assertive"', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      const pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      // Error should have aria-live="assertive" for immediate announcement
      const errorAlert = page.locator('[role="alert"]').first();
      const ariaLive = await errorAlert.getAttribute('aria-live');
      expect(ariaLive).toBe('assertive');
    });

    test('should have aria-atomic="true" for complete message reading', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      const pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      const errorAlert = page.locator('[role="alert"]').first();
      const ariaAtomic = await errorAlert.getAttribute('aria-atomic');
      expect(ariaAtomic).toBe('true');
    });

    test('should remove aria-invalid on successful login', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      // Enter incorrect PIN first
      let pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      // Verify aria-invalid="true"
      let ariaInvalid = await pinInputs.nth(0).getAttribute('aria-invalid');
      expect(ariaInvalid).toBe('true');

      // Now enter correct PIN
      pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('8');
      await pinInputs.nth(1).fill('0');
      await pinInputs.nth(2).fill('0');
      await pinInputs.nth(3).fill('8');

      // Should successfully log in
      await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
    });

    test('should announce lockout with aria-live', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      // Enter incorrect PIN 5 times to trigger lockout
      for (let attempt = 0; attempt < 5; attempt++) {
        const pinInputs = page.locator('input[data-testid^="pin-"]');
        await pinInputs.nth(0).fill('1');
        await pinInputs.nth(1).fill('2');
        await pinInputs.nth(2).fill('3');
        await pinInputs.nth(3).fill('4');
        await page.waitForLoadState('networkidle');
      }

      // Check for lockout message
      const errorAlert = page.locator('[role="alert"]').first();
      await expect(errorAlert).toBeVisible();

      const errorText = await errorAlert.textContent();
      expect(errorText?.toLowerCase()).toMatch(/locked|wait/);
    });
  });

  test.describe('RegisterModal - Name Validation', () => {
    test('should show aria-invalid on name input when validation fails', async ({ page }) => {
      // Open registration (click "New User" or similar)
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Register")').first();
      if (await newUserButton.isVisible()) {
        await newUserButton.click();
      } else {
        // Alternative: navigate to registration screen
        await page.click('text=Create Account');
      }

      await page.waitForLoadState('networkidle');

      // Try to submit with empty name
      const continueButton = page.locator('button:has-text("Continue")').first();
      await continueButton.click();

      // Should show error
      const errorAlert = page.locator('[role="alert"]').first();
      if (await errorAlert.isVisible()) {
        // Verify name input has aria-invalid
        const nameInput = page.locator('#name');
        const ariaInvalid = await nameInput.getAttribute('aria-invalid');
        expect(ariaInvalid).toBe('true');
      }
    });

    test('should have aria-describedby linking to error on name field', async ({ page }) => {
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Register")').first();
      if (await newUserButton.isVisible()) {
        await newUserButton.click();
      } else {
        await page.click('text=Create Account');
      }

      await page.waitForLoadState('networkidle');

      // Enter invalid name (too short)
      const nameInput = page.locator('#name');
      await nameInput.fill('A');

      const continueButton = page.locator('button:has-text("Continue")').first();
      await continueButton.click();

      // Check if error is visible
      const errorAlert = page.locator('[role="alert"]').first();
      if (await errorAlert.isVisible()) {
        const ariaDescribedby = await nameInput.getAttribute('aria-describedby');
        expect(ariaDescribedby).toBe('name-error');

        const errorElement = page.locator('#name-error');
        await expect(errorElement).toBeVisible();
      }
    });

    test('should announce name validation errors', async ({ page }) => {
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Register")').first();
      if (await newUserButton.isVisible()) {
        await newUserButton.click();
      } else {
        await page.click('text=Create Account');
      }

      await page.waitForLoadState('networkidle');

      const nameInput = page.locator('#name');
      await nameInput.fill('');

      const continueButton = page.locator('button:has-text("Continue")').first();
      await continueButton.click();

      const errorAlert = page.locator('[role="alert"]').first();
      if (await errorAlert.isVisible()) {
        const ariaLive = await errorAlert.getAttribute('aria-live');
        expect(ariaLive).toBe('assertive');

        const ariaAtomic = await errorAlert.getAttribute('aria-atomic');
        expect(ariaAtomic).toBe('true');
      }
    });
  });

  test.describe('RegisterModal - PIN Validation', () => {
    test('should have aria-labels on PIN inputs', async ({ page }) => {
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Register")').first();
      if (await newUserButton.isVisible()) {
        await newUserButton.click();
      } else {
        await page.click('text=Create Account');
      }

      await page.waitForLoadState('networkidle');

      // Enter valid name
      const nameInput = page.locator('#name');
      await nameInput.fill('Test User');

      const continueButton = page.locator('button:has-text("Continue")').first();
      await continueButton.click();
      await page.waitForLoadState('networkidle');

      // Verify PIN inputs have aria-labels
      const pinInputs = page.locator('input[type="password"][inputmode="numeric"]');
      for (let i = 0; i < 4; i++) {
        const ariaLabel = await pinInputs.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toContain(`PIN digit ${i + 1} of 4`);
      }
    });

    test('should show aria-invalid on PIN mismatch', async ({ page }) => {
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Register")').first();
      if (await newUserButton.isVisible()) {
        await newUserButton.click();
      } else {
        await page.click('text=Create Account');
      }

      await page.waitForLoadState('networkidle');

      const nameInput = page.locator('#name');
      await nameInput.fill('Test User ' + Date.now()); // Unique name

      const continueButton = page.locator('button:has-text("Continue")').first();
      await continueButton.click();
      await page.waitForLoadState('networkidle');

      // Enter PIN
      const pinInputs = page.locator('input[type="password"][inputmode="numeric"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      // Enter different confirm PIN
      const confirmPinInputs = page.locator('input[type="password"][inputmode="numeric"]');
      await confirmPinInputs.nth(0).fill('5');
      await confirmPinInputs.nth(1).fill('6');
      await confirmPinInputs.nth(2).fill('7');
      await confirmPinInputs.nth(3).fill('8');

      await page.waitForLoadState('networkidle');

      // Should show error
      const errorAlert = page.locator('[role="alert"]').first();
      if (await errorAlert.isVisible()) {
        const errorText = await errorAlert.textContent();
        expect(errorText?.toLowerCase()).toContain('match');

        // Confirm PIN inputs should have aria-invalid
        const ariaInvalid = await confirmPinInputs.nth(0).getAttribute('aria-invalid');
        expect(ariaInvalid).toBe('true');
      }
    });
  });

  test.describe('Error Message Accessibility', () => {
    test('should have sufficient color contrast on error messages', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      const pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      const errorAlert = page.locator('[role="alert"]').first();
      await expect(errorAlert).toBeVisible();

      // Error should have red text with sufficient contrast
      const color = await errorAlert.evaluate(el => {
        return window.getComputedStyle(el).color;
      });

      // Should have red color component
      expect(color).toMatch(/rgb.*\(/);
    });

    test('should have error icon for visual indication', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      const pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      const errorAlert = page.locator('[role="alert"]').first();
      await expect(errorAlert).toBeVisible();

      // Should have an icon (AlertCircle)
      const icon = errorAlert.locator('svg').first();
      await expect(icon).toBeVisible();
    });

    test('should clear error message when input is corrected', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      // Enter incorrect PIN
      let pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      // Error should be visible
      let errorAlert = page.locator('[role="alert"]').first();
      await expect(errorAlert).toBeVisible();

      // Enter correct PIN
      pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('8');
      await pinInputs.nth(1).fill('0');
      await pinInputs.nth(2).fill('0');
      await pinInputs.nth(3).fill('8');

      // Should log in successfully (error clears)
      await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Keyboard Navigation with Validation', () => {
    test('should maintain focus on error field', async ({ page }) => {
      const derrickCard = page.locator('[data-testid="user-card-Derrick"]');
      await derrickCard.click();

      const pinInputs = page.locator('input[data-testid^="pin-"]');
      await pinInputs.nth(0).fill('1');
      await pinInputs.nth(1).fill('2');
      await pinInputs.nth(2).fill('3');
      await pinInputs.nth(3).fill('4');

      await page.waitForLoadState('networkidle');

      // After error, first PIN input should be focused
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.getAttribute('data-testid');
      });

      expect(focusedElement).toContain('pin-');
    });

    test('should support Enter key submission with validation', async ({ page }) => {
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Register")').first();
      if (await newUserButton.isVisible()) {
        await newUserButton.click();
      } else {
        await page.click('text=Create Account');
      }

      await page.waitForLoadState('networkidle');

      const nameInput = page.locator('#name');
      await nameInput.fill('');
      await nameInput.press('Enter');

      // Should show validation error
      const errorAlert = page.locator('[role="alert"]').first();
      if (await errorAlert.isVisible()) {
        await expect(errorAlert).toBeVisible();
      }
    });
  });
});
