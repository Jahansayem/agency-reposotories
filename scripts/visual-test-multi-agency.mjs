#!/usr/bin/env node
/**
 * Visual Testing Script for Multi-Agency Implementation
 *
 * Takes screenshots of the app and saves them for Claude Vision analysis
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envContent = readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const APP_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/tmp/multi-agency-screenshots';

console.log('🎨 Multi-Agency Visual Testing\n');

async function main() {
  // Get Derrick's user info
  const { data: derrick } = await supabase
    .from('users')
    .select('id, name, pin_hash')
    .eq('name', 'Derrick')
    .single();

  if (!derrick) {
    console.error('❌ Could not find Derrick user');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    // 1. Screenshot: Login page
    console.log('📸 Screenshot 1: Login page');
    await page.goto(APP_URL);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-login-page.png`,
      fullPage: true
    });

    // 2. Login as Derrick
    console.log('🔐 Logging in as Derrick...');

    // Wait for user cards to appear
    await page.waitForSelector('text=Derrick', { timeout: 10000 });

    // Click Derrick's card
    const derrickCard = page.locator('text=Derrick').first();
    await derrickCard.click();
    await page.waitForTimeout(1000);

    // Enter PIN (8008) - login is automatic when 4 digits entered
    const pinInputs = page.locator('input[type="password"]');
    const count = await pinInputs.count();

    if (count > 0) {
      // Fill first input - it should auto-focus to next
      await pinInputs.first().fill('8');
      await page.waitForTimeout(100);
      await pinInputs.nth(1).fill('0');
      await page.waitForTimeout(100);
      await pinInputs.nth(2).fill('0');
      await page.waitForTimeout(100);
      await pinInputs.nth(3).fill('8');
    } else {
      // Fallback: single password input
      await page.fill('input[type="password"]', '8008');
    }

    // Wait for navigation/login to complete
    await page.waitForTimeout(3000);

    // Close any welcome modals or notifications
    console.log('🔍 Closing welcome modal and notifications...');

    // Try to close welcome modal (if present)
    const closeWelcomeButton = page.locator('button:has-text("View Tasks"), [aria-label*="Close"]').first();
    if (await closeWelcomeButton.isVisible().catch(() => false)) {
      await closeWelcomeButton.click();
      await page.waitForTimeout(500);
    }

    // Try to dismiss notifications (if present)
    const notNowButton = page.locator('button:has-text("Not now"), button:has-text("Dismiss")').first();
    if (await notNowButton.isVisible().catch(() => false)) {
      await notNowButton.click();
      await page.waitForTimeout(500);
    }

    // 3. Screenshot: Main dashboard after login
    console.log('📸 Screenshot 2: Dashboard (logged in as Derrick)');
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dashboard-derrick.png`,
      fullPage: true
    });

    // 4. Screenshot: Agency switcher (if visible)
    console.log('📸 Screenshot 3: Looking for agency switcher...');
    const agencySwitcher = await page.locator('text=Bealer Agency').first();
    const isVisible = await agencySwitcher.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Agency switcher is visible');
      await agencySwitcher.screenshot({
        path: `${SCREENSHOT_DIR}/03-agency-switcher.png`
      });
    } else {
      console.log('⚠️  Agency switcher not found on page');
      // Take a screenshot of the header area
      const header = await page.locator('header, nav, [role="banner"]').first();
      if (await header.isVisible().catch(() => false)) {
        await header.screenshot({
          path: `${SCREENSHOT_DIR}/03-header-area.png`
        });
      }
    }

    // 5. Screenshot: Create a test todo
    console.log('📸 Screenshot 4: Creating a test todo...');
    await page.fill('[placeholder*="Add"], [placeholder*="task"], input[type="text"]', 'Test multi-agency task');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-create-task-input.png`,
      fullPage: true
    });

    // 6. Screenshot: Task view
    console.log('📸 Screenshot 5: Tasks view');
    const tasksButton = await page.locator('button:has-text("Tasks"), [aria-label*="Tasks"]').first();
    if (await tasksButton.isVisible().catch(() => false)) {
      await tasksButton.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-tasks-view.png`,
      fullPage: true
    });

    // 7. Screenshot: Activity feed (if available)
    console.log('📸 Screenshot 6: Activity feed');
    const activityButton = await page.locator('button:has-text("Activity"), [aria-label*="Activity"]').first();
    if (await activityButton.isVisible().catch(() => false)) {
      await activityButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/06-activity-feed.png`,
        fullPage: true
      });
    }

    // 8. Screenshot: Browser console for errors
    console.log('📸 Screenshot 7: Checking console for errors...');
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`[ERROR] ${msg.text()}`);
      }
    });
    await page.waitForTimeout(1000);

    if (logs.length > 0) {
      console.log('\n⚠️  Console errors detected:');
      logs.forEach(log => console.log(log));
    } else {
      console.log('✅ No console errors');
    }

    console.log('\n✅ Screenshots saved to:', SCREENSHOT_DIR);
    console.log('\nScreenshots taken:');
    console.log('  1. 01-login-page.png');
    console.log('  2. 02-dashboard-derrick.png');
    console.log('  3. 03-agency-switcher.png (or header-area.png)');
    console.log('  4. 04-create-task-input.png');
    console.log('  5. 05-tasks-view.png');
    console.log('  6. 06-activity-feed.png (if available)');

  } catch (error) {
    console.error('\n❌ Error during visual testing:', error.message);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/error-state.png`,
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
