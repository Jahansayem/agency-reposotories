import { test, expect } from '@playwright/test';

test.describe('Verify Agency Switcher', () => {
  test('should show agency switcher for Derrick after adding to agency', async ({ page }) => {
    console.log('\n=== 1. Navigate and Login ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Login as Derrick
    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(500);

    // Fill PIN
    const pinInputs = page.locator('input[type="password"], input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    console.log('\n=== 2. Wait for login to complete ===');
    await page.waitForTimeout(3000);

    // Wait for sidebar to appear
    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    console.log('\n=== 3. Look for Agency Switcher ===');

    // Take a screenshot before checking
    await page.screenshot({ path: '/tmp/before-agency-switcher-check.png', fullPage: true });

    // Look for the agency switcher button (should show "Bealer Agency" or agency name)
    const agencySwitcher = page.locator('button:has-text("Bealer"), button:has-text("Agency")').first();
    const agencySwitcherExists = await agencySwitcher.count() > 0;

    console.log(`\nAgency Switcher button found: ${agencySwitcherExists}`);

    if (agencySwitcherExists) {
      console.log('✅ SUCCESS! Agency Switcher is visible!');

      const buttonText = await agencySwitcher.textContent();
      console.log(`Button text: "${buttonText}"`);

      // Try clicking it to open dropdown
      console.log('\n=== 4. Click Agency Switcher ===');
      await agencySwitcher.click();
      await page.waitForTimeout(1000);

      // Look for dropdown menu
      const dropdown = page.locator('[role="menu"], .dropdown-menu, [data-radix-popper-content-wrapper]');
      const dropdownVisible = await dropdown.count() > 0;

      console.log(`Dropdown opened: ${dropdownVisible}`);

      if (dropdownVisible) {
        // Check for "Create New Agency" button
        const createButton = page.locator('button:has-text("Create New Agency"), button:has-text("Create Agency")');
        const hasCreateButton = await createButton.count() > 0;
        console.log(`"Create New Agency" button visible: ${hasCreateButton}`);

        // Check for "Manage Members" button
        const manageButton = page.locator('button:has-text("Manage Members"), button:has-text("Manage")');
        const hasManageButton = await manageButton.count() > 0;
        console.log(`"Manage Members" button visible: ${hasManageButton}`);

        await page.screenshot({ path: '/tmp/agency-switcher-dropdown.png', fullPage: true });
        console.log('\nDropdown screenshot: /tmp/agency-switcher-dropdown.png');
      }

    } else {
      console.log('❌ FAILED! Agency Switcher is NOT visible!');
      console.log('\nDebugging info:');

      // Check what's actually in the sidebar
      const sidebarHtml = await sidebar.innerHTML();
      console.log('Sidebar HTML (first 500 chars):', sidebarHtml.substring(0, 500));

      // Check all buttons in sidebar
      const buttons = await sidebar.locator('button').all();
      console.log(`\nButtons in sidebar (${buttons.length} total):`);
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].textContent();
        console.log(`  ${i + 1}. "${text?.trim()}"`);
      }

      // Check localStorage and context
      const debugInfo = await page.evaluate(() => {
        return {
          todoSession: localStorage.getItem('todoSession'),
          currentAgency: localStorage.getItem('bealer-current-agency'),
          cookies: document.cookie,
        };
      });
      console.log('\nDebug Info:', JSON.stringify(debugInfo, null, 2));
    }

    await page.screenshot({ path: '/tmp/final-state.png', fullPage: true });
    console.log('\nFinal screenshot: /tmp/final-state.png');

    // Assert that agency switcher should be visible
    expect(agencySwitcherExists).toBe(true);
  });
});
