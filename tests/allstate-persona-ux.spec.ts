/**
 * Allstate Agency Persona UX Tests
 *
 * Tests the user experience from the perspective of different
 * Allstate agency personas to ensure the app works well for
 * all types of users.
 */

import { test, expect } from '@playwright/test';
import {
  ALL_PERSONAS,
  PERSONAS_BY_ROLE,
  MARCUS_BEALER,
  PAT_NGUYEN,
  DAVE_THOMPSON,
  JASMINE_RODRIGUEZ,
  CARLOS_MENDEZ,
  SHELLY_CARTER,
  TAYLOR_KIM,
  ROB_PATTERSON,
} from './fixtures/allstate-personas';
import {
  loginAsPersona,
  loginAs,
  configureDeviceForPersona,
  navigateToPreferredView,
  verifyPermissions,
  testPermissionBoundary,
  createTypicalTask,
  testAIFeatures,
  testAIEmailGeneration,
  testBehaviorArchetype,
  testTaskHandoff,
  getTypingDelay,
} from './helpers/persona-test-utils';

// ============================================================================
// TIER 1: AGENCY LEADERSHIP TESTS
// ============================================================================

test.describe('Agency Owner (Marcus Bealer)', () => {
  test.beforeEach(async ({ page }) => {
    await configureDeviceForPersona(page, MARCUS_BEALER);
  });

  test('can comprehend dashboard in under 10 seconds', async ({ page }) => {
    await loginAsPersona(page, MARCUS_BEALER);

    const startTime = Date.now();

    // Navigate to dashboard
    await navigateToPreferredView(page, MARCUS_BEALER);

    // Verify key metrics are visible
    await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-performance"]')).toBeVisible();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000); // Under 10 seconds
  });

  test('can access strategic goals feature', async ({ page }) => {
    await loginAsPersona(page, MARCUS_BEALER);

    // Strategic goals should be visible to owner
    const goalsSection = page.locator('[data-testid="strategic-goals-section"]');
    await expect(goalsSection).toBeVisible();

    // Can create new goal
    await page.click('[data-testid="add-goal-button"]');
    await expect(page.locator('[data-testid="goal-form"]')).toBeVisible();
  });

  test('can delegate tasks via assignment', async ({ page }) => {
    await loginAsPersona(page, MARCUS_BEALER);

    // Create and assign a task
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Review this policy renewal');

    // Open assignee dropdown
    await page.click('[data-testid="assign-dropdown"]');

    // Verify team members are available
    await expect(page.locator('[data-testid="assignee-list"]')).toBeVisible();
    const assignees = page.locator('[data-testid^="assign-"]');
    expect(await assignees.count()).toBeGreaterThan(0);
  });

  test('has all owner permissions', async ({ page }) => {
    await loginAsPersona(page, MARCUS_BEALER);
    await verifyPermissions(page, MARCUS_BEALER);
  });
});

test.describe('Office Manager (Pat Nguyen)', () => {
  test.beforeEach(async ({ page }) => {
    await configureDeviceForPersona(page, PAT_NGUYEN);
  });

  test('prefers and can use kanban view effectively', async ({ page }) => {
    await loginAsPersona(page, PAT_NGUYEN);

    // Navigate to kanban
    await page.click('[data-testid="view-kanban"]');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Verify columns exist
    const columns = page.locator('[data-testid^="kanban-column-"]');
    expect(await columns.count()).toBeGreaterThanOrEqual(3); // todo, in_progress, done
  });

  test('can perform bulk task assignment', async ({ page }) => {
    await loginAsPersona(page, PAT_NGUYEN);

    // Select multiple tasks
    await page.keyboard.down('Control');
    const tasks = page.locator('[data-testid^="task-"]');
    const taskCount = await tasks.count();

    if (taskCount >= 2) {
      await tasks.nth(0).click();
      await tasks.nth(1).click();
    }
    await page.keyboard.up('Control');

    // Open bulk actions
    await page.click('[data-testid="bulk-actions-button"]');
    await expect(page.locator('[data-testid="bulk-assign"]')).toBeVisible();
  });

  test('uses keyboard shortcuts efficiently', async ({ page }) => {
    await loginAsPersona(page, PAT_NGUYEN);

    // Test 'n' for new task
    await page.keyboard.press('n');
    await expect(page.locator('[data-testid="task-input"]')).toBeFocused();
    await page.keyboard.press('Escape');

    // Test 'f' for filter
    await page.keyboard.press('f');
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
  });

  test('cannot edit strategic goals', async ({ page }) => {
    await loginAsPersona(page, PAT_NGUYEN);

    // Can view but not edit goals
    const goalsSection = page.locator('[data-testid="strategic-goals-section"]');

    if (await goalsSection.isVisible()) {
      await goalsSection.click();
      const editButton = page.locator('[data-testid="edit-goal-button"]');
      await expect(editButton).not.toBeVisible();
    }
  });
});

// ============================================================================
// TIER 2: LICENSED SALES PROFESSIONALS TESTS
// ============================================================================

test.describe('Senior LSP (Dave Thompson)', () => {
  test('mobile task completion flow works smoothly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsPersona(page, DAVE_THOMPSON);

    // Create a task
    await page.click('[data-testid="mobile-fab"]');
    await page.fill('[data-testid="task-input"]', 'Call back customer');
    await page.click('[data-testid="submit-task"]');

    // Complete the task
    const task = page.locator('text=Call back customer').first();
    await task.click();
    await page.click('[data-testid="complete-task"]');

    // Verify completion
    await expect(page.locator('[data-testid="task-completed"]')).toBeVisible();
  });

  test('AI email generation works for follow-ups', async ({ page }) => {
    await loginAsPersona(page, DAVE_THOMPSON);
    await testAIEmailGeneration(page, DAVE_THOMPSON);
  });

  test('waiting for response feature tracks follow-ups', async ({ page }) => {
    await loginAsPersona(page, DAVE_THOMPSON);

    // Create task with waiting flag
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Follow up with John about quote');

    // Enable waiting for response
    await page.click('[data-testid="waiting-toggle"]');
    await expect(page.locator('[data-testid="waiting-options"]')).toBeVisible();

    await page.click('[data-testid="submit-task"]');

    // Verify waiting indicator
    await expect(page.locator('[data-testid="waiting-indicator"]')).toBeVisible();
  });
});

test.describe('Junior LSP (Jasmine Rodriguez)', () => {
  test('onboarding experience is clear for new users', async ({ page }) => {
    await loginAsPersona(page, JASMINE_RODRIGUEZ);

    // Check for helpful onboarding elements
    const tooltips = page.locator('[data-testid="onboarding-tooltip"]');
    const helpButton = page.locator('[data-testid="help-button"]');

    // At least some guidance should be available
    expect(await tooltips.count() + (await helpButton.isVisible() ? 1 : 0)).toBeGreaterThan(0);
  });

  test('task templates help with common workflows', async ({ page }) => {
    await loginAsPersona(page, JASMINE_RODRIGUEZ);

    await page.click('[data-testid="add-task-button"]');

    // Templates should be accessible
    const templatesButton = page.locator('[data-testid="use-template"]');
    if (await templatesButton.isVisible()) {
      await templatesButton.click();
      await expect(page.locator('[data-testid="template-list"]')).toBeVisible();
    }
  });

  test('AI smart parse helps with natural language input', async ({ page }) => {
    await loginAsPersona(page, JASMINE_RODRIGUEZ);
    await testAIFeatures(page, JASMINE_RODRIGUEZ);
  });

  test('chat feature allows asking questions', async ({ page }) => {
    await loginAsPersona(page, JASMINE_RODRIGUEZ);

    // Open chat
    await page.click('[data-testid="chat-button"]');
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();

    // Can send message
    await page.fill('[data-testid="chat-input"]', 'Quick question about policy renewals');
    await page.click('[data-testid="send-message"]');

    await expect(page.locator('text=Quick question about policy renewals')).toBeVisible();
  });
});

test.describe('Bilingual Sales Producer (Carlos Mendez)', () => {
  test('can create tasks with Spanish content', async ({ page }) => {
    await loginAsPersona(page, CARLOS_MENDEZ);

    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Llamar al cliente García sobre renovación de póliza');
    await page.click('[data-testid="submit-task"]');

    // Task should appear correctly with Spanish text
    await expect(page.locator('text=Llamar al cliente García')).toBeVisible();
  });

  test('AI email generation handles Spanish requests', async ({ page }) => {
    await loginAsPersona(page, CARLOS_MENDEZ);

    // Create Spanish task
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Enviar cotización al Sr. Rodríguez');
    await page.click('[data-testid="submit-task"]');

    // Select task and try AI email
    await page.locator('text=Enviar cotización').first().click();

    const emailButton = page.locator('[data-testid="generate-email-button"]');
    if (await emailButton.isVisible()) {
      await emailButton.click();
      await page.waitForSelector('[data-testid="generated-email"]', { timeout: 10000 });

      // Email should be generated (in Spanish ideally)
      const emailContent = await page.locator('[data-testid="generated-email-content"]').textContent();
      expect(emailContent).toBeTruthy();
    }
  });

  test('customer names with accents display correctly', async ({ page }) => {
    await loginAsPersona(page, CARLOS_MENDEZ);

    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="customer-name-input"]', 'José María García-López');
    await page.fill('[data-testid="task-input"]', 'Policy review');
    await page.click('[data-testid="submit-task"]');

    // Verify accents preserved
    await expect(page.locator('text=José María García-López')).toBeVisible();
  });
});

// ============================================================================
// TIER 3: CUSTOMER SERVICE REPRESENTATIVES TESTS
// ============================================================================

test.describe('Licensed CSR (Shelly Carter)', () => {
  test('rapid task creation during calls', async ({ page }) => {
    await loginAsPersona(page, SHELLY_CARTER);

    const startTime = Date.now();

    // Simulate rapid task creation
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Customer callback - billing question');
    await page.click('[data-testid="submit-task"]');

    const createTime = Date.now() - startTime;
    expect(createTime).toBeLessThan(3000); // Should be quick for call handling
  });

  test('recurring task patterns are easy to set up', async ({ page }) => {
    await loginAsPersona(page, SHELLY_CARTER);

    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Monthly billing review');

    // Set recurrence
    await page.click('[data-testid="recurrence-dropdown"]');
    await page.click('[data-testid="recurrence-monthly"]');

    await page.click('[data-testid="submit-task"]');

    // Verify recurrence indicator
    await expect(page.locator('[data-testid="recurrence-badge"]')).toBeVisible();
  });

  test('duplicate detection prevents redundant entries', async ({ page }) => {
    await loginAsPersona(page, SHELLY_CARTER);

    // Create first task
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Call John Smith about claim');
    await page.click('[data-testid="submit-task"]');

    // Try to create duplicate
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Call John Smith about claim');

    // Should see duplicate warning
    const duplicateWarning = page.locator('[data-testid="duplicate-warning"]');
    await expect(duplicateWarning).toBeVisible({ timeout: 3000 });
  });

  test('real-time sync works while on calls', async ({ page, context }) => {
    await loginAsPersona(page, SHELLY_CARTER);

    // Open second tab (simulating another browser window or device)
    const page2 = await context.newPage();
    await loginAsPersona(page2, SHELLY_CARTER);

    // Create task in first tab
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Sync test task');
    await page.click('[data-testid="submit-task"]');

    // Verify it appears in second tab (real-time sync)
    await expect(page2.locator('text=Sync test task')).toBeVisible({ timeout: 5000 });

    await page2.close();
  });
});

test.describe('Unlicensed CSR (Taylor Kim)', () => {
  test('task handoff to licensed staff works', async ({ page }) => {
    await loginAsPersona(page, TAYLOR_KIM);

    // Create task
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Customer needs policy quote - handoff to LSP');
    await page.fill('[data-testid="task-notes"]', 'Customer info: John Doe, 555-1234, needs auto quote');

    // Note: Taylor cannot assign, but can mention in notes
    await page.click('[data-testid="submit-task"]');

    // Verify task created
    await expect(page.locator('text=Customer needs policy quote')).toBeVisible();
  });

  test('file upload works for document management', async ({ page }) => {
    await loginAsPersona(page, TAYLOR_KIM);

    // Select a task
    const task = page.locator('[data-testid^="task-"]').first();
    if (await task.count() > 0) {
      await task.click();

      // Look for attachment option
      const attachButton = page.locator('[data-testid="attach-file-button"]');
      await expect(attachButton).toBeVisible();
    }
  });

  test('activity feed is accessible for monitoring', async ({ page }) => {
    await loginAsPersona(page, TAYLOR_KIM);

    // Open activity log
    await page.click('[data-testid="activity-log-button"]');
    await expect(page.locator('[data-testid="activity-log"]')).toBeVisible();
  });

  test('AI features are restricted', async ({ page }) => {
    await loginAsPersona(page, TAYLOR_KIM);

    // AI features should be hidden for unlicensed staff
    const aiButton = page.locator('[data-testid="ai-features-button"]');
    await expect(aiButton).not.toBeVisible();
  });
});

// ============================================================================
// TIER 4: SPECIALISTS TESTS
// ============================================================================

test.describe('Financial Specialist (Rob Patterson) - Reluctant Adopter', () => {
  test('minimal workflow is simple enough', async ({ page }) => {
    await loginAsPersona(page, ROB_PATTERSON);

    // Just the basics: create and complete a task
    await page.click('[data-testid="add-task-button"]');

    // Input should be simple and obvious
    await expect(page.locator('[data-testid="task-input"]')).toBeFocused();

    await page.fill('[data-testid="task-input"]', 'Review Johnson retirement plan');
    await page.click('[data-testid="submit-task"]');

    // Complete it
    const task = page.locator('text=Review Johnson retirement plan');
    await task.locator('[data-testid="task-checkbox"]').click();

    await expect(page.locator('[data-testid="task-completed"]')).toBeVisible();
  });

  test('interface is not overwhelming', async ({ page }) => {
    await loginAsPersona(page, ROB_PATTERSON);

    // Count visible action buttons - should be reasonable
    const actionButtons = page.locator('[data-testid^="action-"]');
    const buttonCount = await actionButtons.count();

    // For a reluctant adopter, there shouldn't be too many visible options
    expect(buttonCount).toBeLessThan(10);
  });

  test('error messages are clear and helpful', async ({ page }) => {
    await loginAsPersona(page, ROB_PATTERSON);

    // Try to trigger an error
    await page.click('[data-testid="add-task-button"]');
    await page.click('[data-testid="submit-task"]'); // Submit empty

    // Error should be clear
    const errorMessage = page.locator('[data-testid="error-message"]');
    if (await errorMessage.isVisible()) {
      const text = await errorMessage.textContent();
      expect(text).toContain('Please'); // Should be polite and clear
    }
  });

  test('print/export is available', async ({ page }) => {
    await loginAsPersona(page, ROB_PATTERSON);

    // Look for print or export options
    const printButton = page.locator('[data-testid="print-button"]');
    const exportButton = page.locator('[data-testid="export-button"]');

    // At least one should be available
    const printVisible = await printButton.isVisible().catch(() => false);
    const exportVisible = await exportButton.isVisible().catch(() => false);

    expect(printVisible || exportVisible).toBe(true);
  });
});

// ============================================================================
// CROSS-PERSONA TESTS
// ============================================================================

test.describe('Permission Boundaries', () => {
  test('staff cannot edit others tasks', async ({ page }) => {
    // First create a task as owner
    await loginAs.owner(page);
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-input"]', 'Owner task');
    await page.click('[data-testid="submit-task"]');
    await page.click('[data-testid="logout-button"]');

    // Login as staff
    await loginAs.staff(page);

    // Try to edit owner's task
    const ownerTask = page.locator('text=Owner task');
    if (await ownerTask.isVisible()) {
      await ownerTask.click();
      const editButton = page.locator('[data-testid="edit-task-button"]');
      await expect(editButton).not.toBeVisible();
    }
  });

  test('manager can assign tasks but staff cannot', async ({ page }) => {
    await loginAs.manager(page);

    await page.click('[data-testid="add-task-button"]');
    const assignDropdown = page.locator('[data-testid="assign-dropdown"]');
    await expect(assignDropdown).toBeVisible();

    await page.keyboard.press('Escape');
    await page.click('[data-testid="logout-button"]');

    await loginAs.staff(page);
    await page.click('[data-testid="add-task-button"]');
    const staffAssignDropdown = page.locator('[data-testid="assign-dropdown"]');
    await expect(staffAssignDropdown).not.toBeVisible();
  });
});

test.describe('Task Handoff Workflows', () => {
  test('manager to staff handoff works', async ({ page }) => {
    await testTaskHandoff(page, PAT_NGUYEN, DAVE_THOMPSON);
  });
});

test.describe('Behavioral Archetypes', () => {
  test('power user workflow', async ({ page }) => {
    await testBehaviorArchetype(page, 'power-user');
  });

  test('mobile-first workflow', async ({ page }) => {
    await testBehaviorArchetype(page, 'mobile-first');
  });

  test('reluctant adopter workflow', async ({ page }) => {
    await testBehaviorArchetype(page, 'reluctant-adopter');
  });
});
