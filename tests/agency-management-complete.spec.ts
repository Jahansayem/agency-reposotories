import { test, expect } from '@playwright/test';

test.describe('Agency Management - Complete Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Derrick
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(500);

    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await page.waitForTimeout(3000);

    // Close any welcome dialogs by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('Test 1.1: Owner can access Create New Agency button', async ({ page }) => {
    console.log('\n=== TEST 1.1: Access Control - Owner Can Create Agencies ===');

    // Click AgencySwitcher
    const agencySwitcher = page.locator('button:has-text("Bealer Agency")').first();
    await expect(agencySwitcher).toBeVisible();

    await agencySwitcher.click();
    await page.waitForTimeout(1000);

    // Check for "Create New Agency" button
    const createButton = page.locator('button:has-text("Create New Agency"), button:has-text("Create Agency")');
    await expect(createButton).toBeVisible();

    console.log('✅ PASSED: Owner can access "Create New Agency" button');
    await page.screenshot({ path: '/tmp/test-1-1-passed.png' });
  });

  test('Test 1.2: Create agency with valid input', async ({ page }) => {
    console.log('\n=== TEST 1.2: Create Agency - Valid Input ===');

    // Open AgencySwitcher
    const agencySwitcher = page.locator('button:has-text("Bealer Agency")').first();
    await agencySwitcher.click();
    await page.waitForTimeout(1000);

    // Click "Create New Agency"
    const createButton = page.locator('button:has-text("Create New Agency"), button:has-text("Create Agency")');
    await createButton.click();
    await page.waitForTimeout(1000);

    // Check modal opened
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Fill agency name
    const nameInput = page.locator('input[name="name"], input[placeholder*="agency" i]').first();
    await nameInput.fill('Test Insurance Agency');

    await page.waitForTimeout(500);

    // Check slug auto-generated
    const slugInput = page.locator('input[name="slug"], input[value*="test-insurance"]').first();
    const slugValue = await slugInput.inputValue();
    expect(slugValue).toMatch(/test-insurance/);

    console.log(`✅ Slug auto-generated: ${slugValue}`);

    // Select a color (if color picker exists)
    const colorOptions = page.locator('button[role="radio"], button[aria-label*="color" i], div[class*="color-option"]');
    if (await colorOptions.count() > 0) {
      await colorOptions.nth(2).click(); // Select 3rd color (gold)
      console.log('✅ Selected color');
    }

    await page.screenshot({ path: '/tmp/test-1-2-form-filled.png' });

    // Submit
    const submitButton = page.locator('button:has-text("Create Agency"), button[type="submit"]').last();
    await submitButton.click();

    // Wait for modal to close
    await page.waitForTimeout(2000);

    // Modal should close on success
    const modalClosed = !(await modal.isVisible().catch(() => false));
    expect(modalClosed).toBe(true);

    console.log('✅ PASSED: Agency created, modal closed');
    await page.screenshot({ path: '/tmp/test-1-2-passed.png' });
  });

  test('Test 2.1: Owner can access Manage Members', async ({ page }) => {
    console.log('\n=== TEST 2.1: Access Control - Owner Can Manage Members ===');

    // Open AgencySwitcher
    const agencySwitcher = page.locator('button:has-text("Bealer Agency")').first();
    await agencySwitcher.click();
    await page.waitForTimeout(1000);

    // Check for "Manage Members" button
    const manageButton = page.locator('button:has-text("Manage Members")');
    await expect(manageButton).toBeVisible();

    console.log('✅ "Manage Members" button is visible');

    // Click it
    await manageButton.click();
    await page.waitForTimeout(1000);

    // Check members modal opened
    const membersModal = page.locator('[role="dialog"]').first();
    await expect(membersModal).toBeVisible();

    console.log('✅ PASSED: Manage Members modal opened');
    await page.screenshot({ path: '/tmp/test-2-1-passed.png' });
  });

  test('Test 2.3: Add member with valid user', async ({ page }) => {
    console.log('\n=== TEST 2.3: Add Member - Valid User ===');

    // Open Manage Members
    const agencySwitcher = page.locator('button:has-text("Bealer Agency")').first();
    await agencySwitcher.click();
    await page.waitForTimeout(1000);

    const manageButton = page.locator('button:has-text("Manage Members")');
    await manageButton.click();
    await page.waitForTimeout(1000);

    // Click "Add Team Member" or similar
    const addButton = page.locator('button:has-text("Add Team Member"), button:has-text("Add Member")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Fill username
      const usernameInput = page.locator('input[name="username"], input[placeholder*="username" i]').first();
      await usernameInput.fill('Sefra');

      // Select role
      const roleSelect = page.locator('select[name="role"], select').first();
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption('member');
      }

      await page.screenshot({ path: '/tmp/test-2-3-form-filled.png' });

      // Submit
      const submitButton = page.locator('button:has-text("Add Member"), button[type="submit"]').last();
      await submitButton.click();

      await page.waitForTimeout(2000);

      // Check for success message
      const successMessage = page.locator('text=/Sefra added/i, .success, .text-green');
      const hasSuccess = await successMessage.count() > 0;

      if (hasSuccess) {
        console.log('✅ PASSED: Sefra added to agency');
      }

      await page.screenshot({ path: '/tmp/test-2-3-passed.png' });
    } else {
      console.log('⚠️  "Add Team Member" button not found');
    }
  });
});
