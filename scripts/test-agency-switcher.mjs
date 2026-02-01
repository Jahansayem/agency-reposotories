#!/usr/bin/env node
/**
 * Test script to verify AgencySwitcher dropdown functionality
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

console.log('🧪 Testing AgencySwitcher Dropdown\n');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Agency') || text.includes('agency') || text.includes('multi')) {
      console.log(`[Browser Console] ${msg.type()}: ${text}`);
    }
  });

  try {
    // Login
    await page.goto(APP_URL);
    await page.waitForSelector('text=Derrick', { timeout: 10000 });
    await page.click('text=Derrick');
    await page.waitForTimeout(1000);

    const pinInputs = page.locator('input[type="password"]');
    await pinInputs.first().fill('8');
    await pinInputs.nth(1).fill('0');
    await pinInputs.nth(2).fill('0');
    await pinInputs.nth(3).fill('8');
    await page.waitForTimeout(3000);

    // Close welcome modal
    const closeButton = page.locator('button:has-text("View Tasks"), [aria-label*="Close"]').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    const notNowButton = page.locator('button:has-text("Not now")').first();
    if (await notNowButton.isVisible().catch(() => false)) {
      await notNowButton.click();
      await page.waitForTimeout(500);
    }

    console.log('✅ Logged in successfully\n');

    // Check what the AgencySwitcher shows
    const agencySwitcher = page.locator('button:has-text("Select Agency"), button:has-text("Bealer Agency"), button:has-text("Test Agency")').first();
    const buttonText = await agencySwitcher.textContent();
    console.log(`📍 AgencySwitcher button text: "${buttonText}"\n`);

    // Click the AgencySwitcher to open dropdown
    console.log('🖱️  Clicking AgencySwitcher...');
    await agencySwitcher.click();
    await page.waitForTimeout(1000);

    // Check if dropdown opened
    const dropdown = page.locator('[role="listbox"]');
    const isDropdownVisible = await dropdown.isVisible().catch(() => false);

    if (isDropdownVisible) {
      console.log('✅ Dropdown opened!\n');

      // List all agencies in dropdown
      const agencyItems = await page.locator('[role="option"]').allTextContents();
      console.log('📋 Agencies in dropdown:');
      agencyItems.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.trim()}`);
      });

      // Take screenshot
      await page.screenshot({
        path: '/tmp/agency-dropdown-open.png',
        fullPage: true
      });
      console.log('\n📸 Screenshot saved to /tmp/agency-dropdown-open.png');

    } else {
      console.log('❌ Dropdown did not open\n');
      await page.screenshot({
        path: '/tmp/agency-dropdown-failed.png',
        fullPage: true
      });
    }

    // Wait to see
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/tmp/agency-test-error.png',
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
