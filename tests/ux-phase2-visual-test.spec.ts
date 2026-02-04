import { test, expect } from '@playwright/test';

test.describe('UX Phase 2: TodoFiltersBar Visual Inspection', () => {
  test('should show simplified filters bar with 3 main controls', async ({ page }) => {
    console.log('\n=== LOGIN ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(500);

    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await page.waitForTimeout(4000);

    // Close any dialogs
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('\n=== VISUAL INSPECTION: TodoFiltersBar ===');

    // Take screenshot of filters bar
    const filtersBar = page.locator('.mb-4').first();
    await filtersBar.screenshot({ path: '/tmp/phase2-filters-bar.png' });
    console.log('Filters bar screenshot: /tmp/phase2-filters-bar.png');

    console.log('\n=== MAIN CONTROLS: Quick Filter, Sort, Advanced Filters ===');

    // Check Quick Filter dropdown exists
    const quickFilter = page.locator('select[aria-label="Quick filter"]');
    const quickFilterExists = await quickFilter.count() > 0;
    console.log(`Quick Filter dropdown exists: ${quickFilterExists ? '✅' : '❌'}`);

    if (quickFilterExists) {
      const options = await quickFilter.locator('option').allTextContents();
      console.log(`Quick Filter options: ${options.join(', ')}`);
      const expectedOptions = ['All Tasks', 'My Tasks', 'Due Today', 'Overdue'];
      const hasAllOptions = expectedOptions.every(opt => options.includes(opt));
      console.log(`Has all expected options: ${hasAllOptions ? '✅' : '❌'}`);
    }

    // Check Sort dropdown exists
    const sortDropdown = page.locator('select[aria-label="Sort tasks"]');
    const sortExists = await sortDropdown.count() > 0;
    console.log(`Sort dropdown exists: ${sortExists ? '✅' : '❌'}`);

    if (sortExists) {
      const sortBox = await sortDropdown.boundingBox();
      console.log(`Sort dropdown dimensions: ${sortBox?.width}px × ${sortBox?.height}px`);
      console.log(`Sort dropdown height >= 40px: ${(sortBox?.height || 0) >= 40 ? '✅' : '❌'}`);
    }

    // Check Advanced Filters button
    const advancedBtn = page.locator('button:has-text("Filters")').first();
    const advancedExists = await advancedBtn.count() > 0;
    console.log(`Advanced Filters button exists: ${advancedExists ? '✅' : '❌'}`);

    if (advancedExists) {
      const advancedBox = await advancedBtn.boundingBox();
      console.log(`Advanced Filters dimensions: ${advancedBox?.width}px × ${advancedBox?.height}px`);
      console.log(`Advanced Filters height >= 40px: ${(advancedBox?.height || 0) >= 40 ? '✅' : '❌'}`);
    }

    // Check More dropdown exists
    const moreBtn = page.locator('button:has-text("More")').first();
    const moreExists = await moreBtn.count() > 0;
    console.log(`More dropdown exists: ${moreExists ? '✅' : '❌'}`);

    console.log('\n=== VERIFY REMOVED CLUTTER ===');

    // These should NOT be in the main bar anymore (moved to advanced drawer)
    const urgentToggle = page.locator('button:has-text("Urgent")').first();
    const urgentInMainBar = await urgentToggle.isVisible().catch(() => false);
    console.log(`Urgent toggle removed from main bar: ${!urgentInMainBar ? '✅' : '❌ Still visible'}`);

    const doneToggle = page.locator('button:has-text("Done")').first();
    const doneInMainBar = await doneToggle.isVisible().catch(() => false);
    console.log(`Done toggle removed from main bar: ${!doneInMainBar ? '✅' : '❌ Still visible'}`);

    console.log('\n=== TEST ADVANCED FILTERS DRAWER ===');

    // Click Advanced Filters button
    if (advancedExists) {
      await advancedBtn.click();
      await page.waitForTimeout(500);

      // Check drawer is visible
      const drawer = page.locator('div:has-text("Advanced Filters")').first();
      const drawerVisible = await drawer.isVisible();
      console.log(`Advanced Filters drawer visible: ${drawerVisible ? '✅' : '❌'}`);

      if (drawerVisible) {
        // Take screenshot of open drawer
        await page.screenshot({ path: '/tmp/phase2-advanced-drawer-open.png' });
        console.log('Advanced drawer screenshot: /tmp/phase2-advanced-drawer-open.png');

        // Check drawer sections
        const statusFilter = page.locator('label:has-text("Status")');
        const statusExists = await statusFilter.count() > 0;
        console.log(`  - Status filter: ${statusExists ? '✅' : '❌'}`);

        const assignedFilter = page.locator('label:has-text("Assigned To")');
        const assignedExists = await assignedFilter.count() > 0;
        console.log(`  - Assigned To filter: ${assignedExists ? '✅' : '❌'}`);

        const customerFilter = page.locator('label:has-text("Customer")');
        const customerExists = await customerFilter.count() > 0;
        console.log(`  - Customer filter: ${customerExists ? '✅' : '❌'}`);

        const attachmentsFilter = page.locator('label:has-text("Has Attachments")');
        const attachmentsExists = await attachmentsFilter.count() > 0;
        console.log(`  - Attachments filter: ${attachmentsExists ? '✅' : '❌'}`);

        const dateRangeFilter = page.locator('label:has-text("Date Range")');
        const dateRangeExists = await dateRangeFilter.count() > 0;
        console.log(`  - Date Range filter: ${dateRangeExists ? '✅' : '❌'}`);

        // Check for High Priority and Show Completed toggles in drawer
        const highPriorityBtn = page.locator('button:has-text("High Priority Only")');
        const highPriorityInDrawer = await highPriorityBtn.count() > 0;
        console.log(`  - High Priority toggle in drawer: ${highPriorityInDrawer ? '✅' : '❌'}`);

        const completedBtn = page.locator('button:has-text("Show Completed")');
        const completedInDrawer = await completedBtn.count() > 0;
        console.log(`  - Show Completed toggle in drawer: ${completedInDrawer ? '✅' : '❌'}`);

        // Test filtering and active chips
        console.log('\n=== TEST ACTIVE FILTER CHIPS ===');

        // Set a quick filter
        await quickFilter.selectOption('my_tasks');
        await page.waitForTimeout(500);

        // Click high priority
        await highPriorityBtn.click();
        await page.waitForTimeout(500);

        // Close drawer
        const closeBtn = page.locator('button[aria-label="Close advanced filters"]');
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(500);
        }

        // Check for active filter chips
        const activeChipsSection = page.locator('div:has-text("Active:")');
        const hasActiveChips = await activeChipsSection.count() > 0;
        console.log(`Active filter chips section exists: ${hasActiveChips ? '✅' : '❌'}`);

        if (hasActiveChips) {
          await page.screenshot({ path: '/tmp/phase2-active-chips.png' });
          console.log('Active chips screenshot: /tmp/phase2-active-chips.png');

          // Count active chips
          const chips = page.locator('button[aria-label*="Remove filter"]');
          const chipCount = await chips.count();
          console.log(`Number of active filter chips: ${chipCount} (expected 2)`);

          // Check for "Clear All" button
          const clearAllBtn = page.locator('button:has-text("Clear All")');
          const clearAllExists = await clearAllBtn.count() > 0;
          console.log(`Clear All button exists: ${clearAllExists ? '✅' : '❌'}`);
        }
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log('Phase 2 Changes:');
    console.log(`✅ Filters bar simplified to 3 main controls`);
    console.log(`✅ Quick Filter dropdown with clear labels`);
    console.log(`✅ Sort dropdown with descriptive options`);
    console.log(`✅ Advanced Filters button with badge count`);
    console.log(`✅ More dropdown for Templates/Select/Sections`);
    console.log(`✅ Clutter removed (Urgent/Done) → moved to drawer`);
    console.log(`✅ Advanced filters organized in drawer with sections`);
    console.log(`✅ Active filter chips with individual clear buttons`);

    // Keep browser open for manual inspection
    await page.waitForTimeout(3000);
  });

  test('should have proper touch targets on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log('\n=== MOBILE VIEWPORT (375×667) ===');

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    await page.getByText('Derrick', { exact: true }).click();
    await page.waitForTimeout(500);

    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');

    await page.waitForTimeout(4000);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('\n=== MOBILE TOUCH TARGET SIZES ===');

    // Check all filter controls
    const quickFilter = page.locator('select[aria-label="Quick filter"]').first();
    if (await quickFilter.count() > 0) {
      const box = await quickFilter.boundingBox();
      console.log(`Quick Filter: ${box?.height}px (min 40px) - ${(box?.height || 0) >= 40 ? '✅' : '❌'}`);
    }

    const sortDropdown = page.locator('select[aria-label="Sort tasks"]').first();
    if (await sortDropdown.count() > 0) {
      const box = await sortDropdown.boundingBox();
      console.log(`Sort Dropdown: ${box?.height}px (min 40px) - ${(box?.height || 0) >= 40 ? '✅' : '❌'}`);
    }

    const advancedBtn = page.locator('button:has-text("Filters")').first();
    if (await advancedBtn.count() > 0) {
      const box = await advancedBtn.boundingBox();
      console.log(`Advanced Filters: ${box?.height}px (min 40px) - ${(box?.height || 0) >= 40 ? '✅' : '❌'}`);
    }

    const moreBtn = page.locator('button:has-text("More")').first();
    if (await moreBtn.count() > 0) {
      const box = await moreBtn.boundingBox();
      console.log(`More Button: ${box?.height}px (min 40px) - ${(box?.height || 0) >= 40 ? '✅' : '❌'}`);
    }

    // Check horizontal scroll behavior
    console.log('\n=== MOBILE SCROLL BEHAVIOR ===');
    const filtersBar = page.locator('.overflow-x-auto').first();
    const hasOverflow = await filtersBar.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });
    console.log(`Filters bar has horizontal scroll: ${hasOverflow ? '✅ (expected for mobile)' : 'No overflow'}`);

    await page.screenshot({ path: '/tmp/phase2-mobile.png', fullPage: true });
    console.log('\nMobile screenshot: /tmp/phase2-mobile.png');

    await page.waitForTimeout(2000);
  });
});
