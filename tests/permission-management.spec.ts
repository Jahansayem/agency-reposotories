/**
 * Permission Management E2E Tests
 *
 * Tests the ability for agency owners to customize permissions for team members.
 */

import { test, expect } from '@playwright/test';

test.describe('Permission Management', () => {
  test('owner can access and use permission management UI', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot 1: Initial login page
    await page.screenshot({ path: 'tests/permission-screenshots/01-login-page.png', fullPage: true });

    // Click on Derrick (the owner)
    await page.click('text=Derrick');
    await page.waitForTimeout(500);

    // Screenshot 2: PIN entry screen
    await page.screenshot({ path: 'tests/permission-screenshots/02-pin-screen.png', fullPage: true });

    // Enter PIN using keyboard (the PIN inputs capture keystrokes)
    await page.keyboard.type('8008');
    await page.waitForTimeout(3000); // Wait for full load

    // Screenshot 3: After login
    await page.screenshot({ path: 'tests/permission-screenshots/03-after-login.png', fullPage: true });

    // First, click on the "Select Agency" or agency name dropdown to open it
    const agencySwitcher = page.locator('button').filter({ hasText: /Select Agency|Loading|Bealer/ }).first();
    if (await agencySwitcher.isVisible().catch(() => false)) {
      console.log('Found agency switcher, clicking...');
      await agencySwitcher.click();
      await page.waitForTimeout(500);
    }

    // Screenshot 4: After clicking agency switcher
    await page.screenshot({ path: 'tests/permission-screenshots/04-agency-dropdown.png', fullPage: true });

    // Look for "Bealer Agency" in the dropdown and click it
    const bealerAgency = page.locator('button, [role="menuitem"]').filter({ hasText: 'Bealer Agency' }).first();
    if (await bealerAgency.isVisible().catch(() => false)) {
      console.log('Found Bealer Agency, clicking to select...');
      await bealerAgency.click();
      await page.waitForTimeout(1500);
    }

    // Screenshot 5: After selecting agency
    await page.screenshot({ path: 'tests/permission-screenshots/05-agency-selected.png', fullPage: true });

    // Now open the agency dropdown again to find Manage Members
    const agencyButton = page.locator('button').filter({ hasText: 'Bealer' }).first();
    if (await agencyButton.isVisible().catch(() => false)) {
      console.log('Found agency button, clicking to open menu...');
      await agencyButton.click();
      await page.waitForTimeout(500);
    }

    // Screenshot 6: Agency menu open
    await page.screenshot({ path: 'tests/permission-screenshots/06-agency-menu.png', fullPage: true });

    // Look for "Manage Members" option and click it
    const manageMembers = page.locator('button, [role="menuitem"]').filter({ hasText: 'Manage Members' }).first();
    if (await manageMembers.isVisible().catch(() => false)) {
      console.log('Found Manage Members, clicking...');
      await manageMembers.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('Manage Members not visible');
    }

    // Screenshot 7: After clicking Manage Members
    await page.screenshot({ path: 'tests/permission-screenshots/07-members-modal.png', fullPage: true });

    // Check if modal is visible
    const modalTitle = page.locator('text=Agency Members');
    const modalVisible = await modalTitle.isVisible().catch(() => false);
    console.log(`Agency Members modal visible: ${modalVisible}`);
    expect(modalVisible).toBeTruthy();

    // Wait for members to load (spinner to disappear)
    await page.waitForTimeout(2000);

    // Screenshot 8: After modal loads
    await page.screenshot({ path: 'tests/permission-screenshots/08-modal-loaded.png', fullPage: true });

    // Look for the Settings/Customize button using aria-label or title
    const settingsButton = page.locator('button[aria-label*="Customize"][aria-label*="permissions"]').first();
    const settingsVisible = await settingsButton.isVisible().catch(() => false);
    console.log(`Settings button visible: ${settingsVisible}`);

    // Also try finding by title
    const settingsByTitle = page.locator('button[title="Customize permissions"]').first();
    const titleButtonVisible = await settingsByTitle.isVisible().catch(() => false);
    console.log(`Settings button (by title) visible: ${titleButtonVisible}`);

    // Screenshot 9: Current state with members
    await page.screenshot({ path: 'tests/permission-screenshots/09-members-list.png', fullPage: true });

    // Verify settings button exists (means there are non-owner members)
    expect(settingsVisible || titleButtonVisible).toBeTruthy();

    const btn = settingsVisible ? settingsButton : settingsByTitle;
    console.log('Clicking settings/customize button...');
    await btn.click();
    await page.waitForTimeout(500);

    // Screenshot 10: Permissions panel expanded
    await page.screenshot({ path: 'tests/permission-screenshots/10-permissions-panel.png', fullPage: true });

    // Check for permission categories
    const taskPermissions = await page.locator('text=Task Permissions').isVisible().catch(() => false);
    const teamPermissions = await page.locator('text=Team Permissions').isVisible().catch(() => false);
    const chatPermissions = await page.locator('text=Chat Permissions').isVisible().catch(() => false);
    const featurePermissions = await page.locator('text=Feature Permissions').isVisible().catch(() => false);

    console.log(`\n=== Permission Categories ===`);
    console.log(`Task Permissions visible: ${taskPermissions}`);
    console.log(`Team Permissions visible: ${teamPermissions}`);
    console.log(`Chat Permissions visible: ${chatPermissions}`);
    console.log(`Feature Permissions visible: ${featurePermissions}`);

    // Verify at least one permission category is visible
    expect(taskPermissions || teamPermissions || chatPermissions || featurePermissions).toBeTruthy();

    // Look for toggle switches
    const toggles = await page.locator('button[role="switch"]').count();
    console.log(`Found ${toggles} permission toggles`);
    expect(toggles).toBeGreaterThan(0);

    // Look for Reset to defaults button
    const resetButton = await page.locator('text=Reset to defaults').isVisible().catch(() => false);
    console.log(`Reset to defaults button visible: ${resetButton}`);
    expect(resetButton).toBeTruthy();

    // Screenshot 11: Final state
    await page.screenshot({ path: 'tests/permission-screenshots/11-final-state.png', fullPage: true });

    console.log('\n=== Permission Management UI Test PASSED ===');
    console.log('✅ Agency Members modal opens');
    console.log('✅ Members list displays');
    console.log('✅ Settings button visible for non-owner members');
    console.log('✅ Permissions panel expands on click');
    console.log('✅ Permission categories visible');
    console.log('✅ Toggle switches present');
    console.log('✅ Reset to defaults button visible');
  });
});
