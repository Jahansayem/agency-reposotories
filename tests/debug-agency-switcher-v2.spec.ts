import { test, expect } from '@playwright/test';

test.describe('Debug Agency Switcher V2', () => {
  test('debug login and agency switcher', async ({ page }) => {
    // Enable verbose console logging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    });

    console.log('\n=== STEP 1: Navigate to App ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot of login screen
    await page.screenshot({ path: '/tmp/debug-login-screen.png', fullPage: true });
    console.log('Login screen screenshot saved');

    console.log('\n=== STEP 2: Attempt Login as Derrick ===');

    // Wait for the page to be ready
    await page.waitForSelector('body', { state: 'attached' });

    // Try to find Derrick's card with multiple strategies
    console.log('Looking for Derrick user card...');

    // Strategy 1: Look for text "Derrick"
    const derrickText = page.getByText('Derrick', { exact: true });
    const derrickCount = await derrickText.count();
    console.log(`Found ${derrickCount} elements with text "Derrick"`);

    if (derrickCount > 0) {
      console.log('Clicking Derrick card...');
      await derrickText.first().click();
      await page.waitForTimeout(500);
    } else {
      console.log('ERROR: Could not find Derrick user card!');

      // Debug: List all buttons on the page
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons on the page`);
      for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
        const text = await allButtons[i].textContent();
        console.log(`  Button ${i + 1}: "${text?.trim()}"`);
      }
    }

    // Wait for PIN input
    console.log('Waiting for PIN input...');
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      console.log('PIN input found!');

      await page.fill('input[type="password"]', '8008');
      console.log('PIN entered');

      // Try to find and click login button
      const loginButton = page.locator('button:has-text("Verify PIN"), button:has-text("Login"), button[type="submit"]').first();
      if (await loginButton.count() > 0) {
        console.log('Clicking login button...');
        await loginButton.click();
      } else {
        console.log('Login button not found, pressing Enter...');
        await page.keyboard.press('Enter');
      }

      // Wait for navigation/login to complete
      console.log('Waiting for login to complete...');
      await page.waitForTimeout(3000);

    } catch (e) {
      console.log('ERROR: PIN input not found within 5 seconds');
      console.log('Error:', e);
    }

    // Take screenshot after login attempt
    await page.screenshot({ path: '/tmp/debug-after-login.png', fullPage: true });
    console.log('Post-login screenshot saved');

    console.log('\n=== STEP 3: Check if Login Succeeded ===');

    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Check for sidebar
    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    const hasSidebar = await sidebar.count() > 0;
    console.log('Sidebar exists:', hasSidebar);

    // Check for login screen elements
    const hasLoginScreen = await page.locator('text=Select your account').count() > 0;
    console.log('Still on login screen:', hasLoginScreen);

    if (hasLoginScreen) {
      console.log('\n❌ LOGIN FAILED - Still on login screen');

      // Check for error messages
      const errorMessages = await page.locator('.error, [role="alert"], .text-red-500, .text-red-600').all();
      console.log(`Found ${errorMessages.length} error elements`);
      for (const error of errorMessages) {
        const text = await error.textContent();
        console.log('  Error:', text?.trim());
      }

      return; // Exit early since login failed
    }

    console.log('\n✅ LOGIN SUCCEEDED');

    console.log('\n=== STEP 4: Look for Agency Switcher ===');

    if (hasSidebar) {
      // Get sidebar HTML
      const sidebarHtml = await sidebar.innerHTML();
      console.log('Sidebar HTML (first 2000 chars):');
      console.log(sidebarHtml.substring(0, 2000));

      // Look for agency switcher elements
      const agencyButton = page.locator('button:has-text("Bealer"), button:has-text("Agency")');
      const agencyButtonCount = await agencyButton.count();
      console.log(`\nFound ${agencyButtonCount} buttons with "Bealer" or "Agency" text`);

      if (agencyButtonCount > 0) {
        console.log('✅ Agency switcher button found!');
        const buttonText = await agencyButton.first().textContent();
        console.log('Button text:', buttonText);

        // Try clicking it
        console.log('Clicking agency switcher...');
        await agencyButton.first().click();
        await page.waitForTimeout(1000);

        // Check for dropdown
        const dropdown = page.locator('[role="menu"], .dropdown, [data-radix-popper-content-wrapper]');
        const hasDropdown = await dropdown.count() > 0;
        console.log('Dropdown opened:', hasDropdown);

        await page.screenshot({ path: '/tmp/debug-dropdown-open.png', fullPage: true });
        console.log('Dropdown screenshot saved');

      } else {
        console.log('❌ Agency switcher button NOT found');
      }

      // Check all buttons in sidebar
      const sidebarButtons = await sidebar.locator('button').all();
      console.log(`\nAll sidebar buttons (${sidebarButtons.length} total):`);
      for (let i = 0; i < sidebarButtons.length; i++) {
        const text = await sidebarButtons[i].textContent();
        const classes = await sidebarButtons[i].getAttribute('class');
        console.log(`  ${i + 1}. "${text?.trim()}" [${classes?.substring(0, 50)}...]`);
      }
    }

    console.log('\n=== STEP 5: Check Agency Context State ===');

    const agencyState = await page.evaluate(() => {
      const localStorage_data = {} as any;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            localStorage_data[key] = localStorage.getItem(key);
          }
        }
      } catch (e) {
        localStorage_data.error = String(e);
      }

      return {
        localStorage: localStorage_data,
        cookies: document.cookie,
      };
    });

    console.log('Agency State:', JSON.stringify(agencyState, null, 2));

    console.log('\n=== Test Complete ===');
    console.log('Check screenshots:');
    console.log('  - /tmp/debug-login-screen.png');
    console.log('  - /tmp/debug-after-login.png');
    console.log('  - /tmp/debug-dropdown-open.png');

    // Keep browser open for 10 seconds
    await page.waitForTimeout(10000);
  });
});
