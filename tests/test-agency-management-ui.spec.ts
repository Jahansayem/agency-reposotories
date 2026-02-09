import { test, expect } from '@playwright/test';

test.describe('Agency Management UI - Full Workflow', () => {
  test('Test 1.1-1.2: Owner can create agencies', async ({ page }) => {
    console.log('\n========== LOGIN AS DERRICK ==========');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Login
    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForLoadState('networkidle');

    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/test-1-logged-in.png' });

    console.log('\n========== TEST 1.1: Access Control - Owner Can Create Agencies ==========');

    // Wait for sidebar
    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Find and click AgencySwitcher
    const agencySwitcher = page.locator('button', { hasText: 'Bealer Agency' }).or(
      page.locator('button', { hasText: 'Agency' })
    ).first();

    console.log('Looking for AgencySwitcher button...');
    await expect(agencySwitcher).toBeVisible({ timeout: 5000 });
    console.log('✅ AgencySwitcher button is visible');

    await agencySwitcher.click();
    console.log('Clicked AgencySwitcher');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: '/tmp/test-1-dropdown-open.png' });

    // Check for "Create New Agency" button in dropdown
    const createButton = page.locator('button:has-text("Create New Agency"), button:has-text("Create Agency")');
    const createButtonVisible = await createButton.isVisible().catch(() => false);

    console.log(`"Create New Agency" button visible: ${createButtonVisible}`);

    if (!createButtonVisible) {
      // Debug: show what's actually visible
      const allButtons = await page.locator('button:visible').all();
      console.log('\nAll visible buttons:');
      for (const btn of allButtons.slice(0, 20)) {
        const text = await btn.textContent();
        console.log(`  - "${text?.trim()}"`);
      }
    }

    expect(createButtonVisible).toBe(true);
    console.log('✅ TEST 1.1 PASSED: Owner can access "Create New Agency" button');

    console.log('\n========== TEST 1.2: Create Agency - Valid Input ==========');

    // Click Create New Agency
    await createButton.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: '/tmp/test-2-create-modal.png' });

    // Check modal opened
    const modal = page.locator('[role="dialog"], .modal, div:has-text("Create New Agency")').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log('✅ Create Agency modal opened');

    // Fill in agency name
    const nameInput = page.locator('input[name="name"], input[placeholder*="Agency"], input[placeholder*="name"]').first();
    await nameInput.fill('Test Insurance Agency');
    console.log('Filled agency name: "Test Insurance Agency"');

    await page.waitForLoadState('networkidle');

    // Check slug auto-generated
    const slugInput = page.locator('input[name="slug"], input[value*="test-insurance"]').first();
    const slugValue = await slugInput.inputValue();
    console.log(`Auto-generated slug: "${slugValue}"`);
    expect(slugValue).toContain('test-insurance');

    // Select a color (click on a color swatch)
    const colorSwatch = page.locator('button[class*="color"], div[class*="color"]').first();
    if (await colorSwatch.count() > 0) {
      await colorSwatch.click();
      console.log('Selected color');
    }

    await page.screenshot({ path: '/tmp/test-3-filled-form.png' });

    // Submit
    const submitButton = page.locator('button:has-text("Create Agency"), button[type="submit"]').last();
    await submitButton.click();
    console.log('Clicked Create Agency button');

    // Wait for modal to close (indicates success)
    await page.waitForLoadState('networkidle');

    const modalStillVisible = await modal.isVisible().catch(() => false);
    console.log(`Modal still visible: ${modalStillVisible}`);

    if (!modalStillVisible) {
      console.log('✅ TEST 1.2 PASSED: Agency created successfully, modal closed');
    } else {
      // Check for error messages
      const errorText = await page.locator('.text-red-500, .text-red-600, [role="alert"]').textContent().catch(() => '');
      console.log(`Error message: "${errorText}"`);
    }

    await page.screenshot({ path: '/tmp/test-4-after-create.png' });

    console.log('\n========== TEST 2.1: Owner Can Manage Members ==========');

    // Reopen AgencySwitcher
    await agencySwitcher.click();
    await page.waitForLoadState('networkidle');

    // Look for "Manage Members" button
    const manageButton = page.locator('button:has-text("Manage Members"), button:has-text("Manage")');
    const manageButtonVisible = await manageButton.isVisible().catch(() => false);

    console.log(`"Manage Members" button visible: ${manageButtonVisible}`);
    expect(manageButtonVisible).toBe(true);
    console.log('✅ TEST 2.1 PASSED: Owner can access "Manage Members" button');

    // Click Manage Members
    await manageButton.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: '/tmp/test-5-manage-members.png' });

    // Check members modal opened
    const membersModal = page.locator('[role="dialog"]:has-text("Manage"), div:has-text("Team Members"), div:has-text("Members")').first();
    const membersModalVisible = await membersModal.isVisible().catch(() => false);

    console.log(`Members modal visible: ${membersModalVisible}`);

    if (membersModalVisible) {
      console.log('✅ Members management modal opened');

      // Count members shown
      const memberItems = page.locator('[class*="member"], li, div[role="listitem"]');
      const memberCount = await memberItems.count();
      console.log(`Members shown: ${memberCount}`);
    }

    console.log('\n========== TEST SUMMARY ==========');
    console.log('✅ TEST 1.1: Owner can access "Create New Agency"');
    console.log(`${!modalStillVisible ? '✅' : '❌'} TEST 1.2: Create agency with valid input`);
    console.log('✅ TEST 2.1: Owner can access "Manage Members"');

    console.log('\nScreenshots saved:');
    console.log('  1. /tmp/test-1-logged-in.png');
    console.log('  2. /tmp/test-1-dropdown-open.png');
    console.log('  3. /tmp/test-2-create-modal.png');
    console.log('  4. /tmp/test-3-filled-form.png');
    console.log('  5. /tmp/test-4-after-create.png');
    console.log('  6. /tmp/test-5-manage-members.png');
  });
});
