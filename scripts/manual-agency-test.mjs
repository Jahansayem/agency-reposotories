#!/usr/bin/env node
import { chromium } from 'playwright';

const APP_URL = 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('Opening app...');
  await page.goto(APP_URL);

  console.log('Waiting for login...');
  await page.waitForSelector('text=Derrick', { timeout: 10000 });
  await page.click('text=Derrick');
  await page.waitForTimeout(1000);

  console.log('Entering PIN...');
  const pinInputs = page.locator('input[type="password"]');
  await pinInputs.first().fill('8');
  await pinInputs.nth(1).fill('0');
  await pinInputs.nth(2).fill('0');
  await pinInputs.nth(3).fill('8');
  await page.waitForTimeout(3000);

  console.log('Closing modals...');
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

  console.log('\n✅ LOGGED IN!');
  console.log('👀 Look at the top-left of the sidebar');
  console.log('📍 You should see "Wavezly" button');
  console.log('🖱️  Click it to see the dropdown with both agencies\n');
  console.log('Press Ctrl+C when done...');

  await page.waitForTimeout(300000); // Wait 5 minutes or until Ctrl+C
}

main().catch(console.error);
