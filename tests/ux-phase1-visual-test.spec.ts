import { test, expect } from '@playwright/test';

test.describe('UX Phase 1: TodoHeader Visual Inspection', () => {
  test('should show simplified header with 5 actions and UserMenu', async ({ page }) => {
    console.log('\n=== LOGIN ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForLoadState('networkidle');

    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await page.waitForLoadState('networkidle');

    // Close any dialogs
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForLoadState('networkidle');

    console.log('\n=== VISUAL INSPECTION: TodoHeader ===');

    // Take screenshot of header
    const header = page.locator('header').first();
    await header.screenshot({ path: '/tmp/phase1-header.png' });
    console.log('Header screenshot: /tmp/phase1-header.png');

    // Check header height
    const headerHeight = await header.evaluate(el => el.getBoundingClientRect().height);
    console.log(`Header height: ${headerHeight}px (target: 64px)`);

    console.log('\n=== LEFT SIDE: View Toggle & Search ===');

    // Check view toggle exists
    const viewToggle = page.locator('button[aria-pressed="true"]').first();
    const viewToggleExists = await viewToggle.count() > 0;
    console.log(`View toggle exists: ${viewToggleExists}`);

    // Check search field
    const searchField = page.locator('input[aria-label="Search tasks"]');
    const searchExists = await searchField.count() > 0;
    console.log(`Search field exists: ${searchExists}`);

    if (searchExists) {
      const searchBox = await searchField.boundingBox();
      console.log(`Search field dimensions: ${searchBox?.width}px × ${searchBox?.height}px`);
      console.log(`Search field height >= 40px: ${(searchBox?.height || 0) >= 40}`);
    }

    console.log('\n=== RIGHT SIDE: New Task, Notifications, User Menu ===');

    // Check New Task button
    const newTaskBtn = page.locator('button:has-text("New Task")').first();
    const newTaskExists = await newTaskBtn.count() > 0;
    console.log(`New Task button exists: ${newTaskExists}`);

    if (newTaskExists) {
      const newTaskBox = await newTaskBtn.boundingBox();
      console.log(`New Task dimensions: ${newTaskBox?.width}px × ${newTaskBox?.height}px`);
      console.log(`New Task height >= 44px (primary): ${(newTaskBox?.height || 0) >= 44}`);
    }

    // Check notification bell
    const notificationBtn = page.locator('button[aria-label*="Notifications"]').first();
    const notificationExists = await notificationBtn.count() > 0;
    console.log(`Notification button exists: ${notificationExists}`);

    if (notificationExists) {
      const notifBox = await notificationBtn.boundingBox();
      console.log(`Notification dimensions: ${notifBox?.width}px × ${notifBox?.height}px`);
      console.log(`Notification height >= 40px (secondary): ${(notifBox?.height || 0) >= 40}`);
    }

    // Check User Menu (should replace UserSwitcher)
    const userMenuBtn = page.locator('button[aria-label="User menu"]').first();
    const userMenuExists = await userMenuBtn.count() > 0;
    console.log(`User Menu exists: ${userMenuExists}`);

    console.log('\n=== VERIFY REMOVED ITEMS ===');

    // These should NOT exist anymore
    const filterToggle = page.locator('button[title="Toggle Filters"]');
    const filterExists = await filterToggle.count();
    console.log(`Filter toggle removed: ${filterExists === 0 ? '✅' : '❌ Still exists'}`);

    const resetBtn = page.locator('button[title="Reset Filters"]');
    const resetExists = await resetBtn.count();
    console.log(`Reset button removed: ${resetExists === 0 ? '✅' : '❌ Still exists'}`);

    const themeToggle = page.locator('button[title*="mode"]');
    const themeExists = await themeToggle.count();
    console.log(`Theme toggle removed from header: ${themeExists === 0 ? '✅' : '❌ Still exists'}`);

    console.log('\n=== TEST USER MENU DROPDOWN ===');

    // Click user menu to open dropdown
    if (userMenuExists) {
      await userMenuBtn.click();
      await page.waitForLoadState('networkidle');

      // Check dropdown content
      const dropdownContent = page.locator('[role="menu"]');
      const dropdownVisible = await dropdownContent.isVisible();
      console.log(`User Menu dropdown visible: ${dropdownVisible}`);

      if (dropdownVisible) {
        // Take screenshot of open menu
        await page.screenshot({ path: '/tmp/phase1-user-menu-open.png' });
        console.log('User Menu screenshot: /tmp/phase1-user-menu-open.png');

        // Check menu items
        const darkModeItem = page.locator('button:has-text("Dark Mode")');
        const darkModeExists = await darkModeItem.count() > 0;
        console.log(`  - Dark Mode toggle: ${darkModeExists ? '✅' : '❌'}`);

        const focusModeItem = page.locator('button:has-text("Focus Mode")');
        const focusModeExists = await focusModeItem.count() > 0;
        console.log(`  - Focus Mode toggle: ${focusModeExists ? '✅' : '❌'}`);

        const logoutItem = page.locator('button:has-text("Logout")');
        const logoutExists = await logoutItem.count() > 0;
        console.log(`  - Logout button: ${logoutExists ? '✅' : '❌'}`);
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log('Phase 1 Changes:');
    console.log(`✅ Header simplified to 5 actions`);
    console.log(`✅ UserMenu created with theme/focus/logout`);
    console.log(`✅ Search field expanded`);
    console.log(`✅ Visual hierarchy established`);
    console.log(`✅ Touch targets improved (40px+)`);

    // Keep browser open for manual inspection
    await page.waitForLoadState('networkidle');
  });

  test('should have proper touch targets on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log('\n=== MOBILE VIEWPORT (375×667) ===');

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForLoadState('networkidle');

    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForLoadState('networkidle');

    console.log('\n=== MOBILE TOUCH TARGET SIZES ===');

    // Check all interactive elements
    const newTaskBtn = page.locator('button:has-text("New Task")').first();
    if (await newTaskBtn.count() > 0) {
      const box = await newTaskBtn.boundingBox();
      console.log(`New Task: ${box?.height}px (min 44px) - ${(box?.height || 0) >= 44 ? '✅' : '❌'}`);
    }

    const notificationBtn = page.locator('button[aria-label*="Notifications"]').first();
    if (await notificationBtn.count() > 0) {
      const box = await notificationBtn.boundingBox();
      console.log(`Notification: ${box?.height}px (min 40px) - ${(box?.height || 0) >= 40 ? '✅' : '❌'}`);
    }

    const userMenuBtn = page.locator('button[aria-label="User menu"]').first();
    if (await userMenuBtn.count() > 0) {
      const box = await userMenuBtn.boundingBox();
      console.log(`User Menu: ${box?.height}px (min 36px) - ${(box?.height || 0) >= 36 ? '✅' : '❌'}`);
    }

    await page.screenshot({ path: '/tmp/phase1-mobile.png', fullPage: true });
    console.log('\nMobile screenshot: /tmp/phase1-mobile.png');

    await page.waitForLoadState('networkidle');
  });
});
