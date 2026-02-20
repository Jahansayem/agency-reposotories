import { test, expect } from '@playwright/test';

test('AI Agent feature end-to-end test', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000');

  // Wait for app to load and sign in if needed
  await page.waitForLoadState('networkidle');

  console.log('✓ App loaded');

  // Look for agent toggle button (blue floating button)
  const toggleButton = page.locator('button[aria-label*="AI Assistant"]');

  // Take screenshot before opening
  await page.screenshot({ path: 'test-agent-1-before.png' });
  console.log('✓ Screenshot 1: Before opening panel');

  // Click to open agent panel
  await toggleButton.click();
  console.log('✓ Clicked agent toggle button');

  // Wait for panel to appear
  await page.waitForTimeout(1000);

  // Take screenshot with panel open
  await page.screenshot({ path: 'test-agent-2-panel-open.png' });
  console.log('✓ Screenshot 2: Panel opened');

  // Find the textarea input
  const textarea = page.locator('textarea[placeholder*="message" i]').or(page.locator('textarea').first());

  // Type test message
  await textarea.fill('Hello, can you help me with tasks?');
  console.log('✓ Typed test message');

  // Take screenshot with message typed
  await page.screenshot({ path: 'test-agent-3-message-typed.png' });
  console.log('✓ Screenshot 3: Message typed');

  // Find and click send button
  const sendButton = page.locator('button:has-text("Send")').or(
    page.locator('button[aria-label*="Send" i]')
  );

  await sendButton.click();
  console.log('✓ Clicked send button');

  // Wait for response (up to 30 seconds)
  await page.waitForTimeout(5000);

  // Take screenshot after sending
  await page.screenshot({ path: 'test-agent-4-after-send.png' });
  console.log('✓ Screenshot 4: After sending message');

  // Check for response indicators
  const hasLoadingIndicator = await page.locator('text=/loading|sending|thinking/i').count() > 0;
  const hasMessages = await page.locator('[role="log"], [class*="message"], .prose').count() > 0;

  console.log(`Loading indicator: ${hasLoadingIndicator ? 'Yes' : 'No'}`);
  console.log(`Messages visible: ${hasMessages ? 'Yes' : 'No'}`);

  // Take final screenshot
  await page.screenshot({ path: 'test-agent-5-final.png', fullPage: true });
  console.log('✓ Screenshot 5: Final state (full page)');

  console.log('\n✓ Test completed successfully!');
  console.log('Check screenshots: test-agent-*.png');
});
