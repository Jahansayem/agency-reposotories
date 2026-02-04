/**
 * Persona-Based Test Utilities for Playwright
 *
 * Provides helper functions to test the app from the perspective
 * of different Allstate agency personas.
 */

import { Page, expect } from '@playwright/test';
import {
  AllstatePersona,
  ALL_PERSONAS,
  getPersona,
  PERSONAS_BY_ROLE,
  ARCHETYPE_MAPPING,
  type BehaviorArchetype,
} from '../fixtures/allstate-personas';

// ============================================================================
// LOGIN HELPERS
// ============================================================================

/**
 * Login as a specific persona
 */
export async function loginAsPersona(page: Page, persona: AllstatePersona): Promise<void> {
  // Navigate to login
  await page.goto('/');

  // Wait for user selection screen
  await page.waitForSelector('[data-testid="user-selection"]', { timeout: 10000 });

  // Check if user exists, if not create them
  const userCard = page.locator(`[data-testid="user-card-${persona.name.split(' ')[0].toLowerCase()}"]`);

  if (await userCard.count() === 0) {
    // Create new user
    await page.click('[data-testid="create-user-button"]');
    await page.fill('[data-testid="user-name-input"]', persona.name);
    await page.fill('[data-testid="user-pin-input"]', persona.pin);
    await page.click('[data-testid="user-color-picker"]');
    await page.click(`[data-color="${persona.color}"]`);
    await page.click('[data-testid="create-user-submit"]');
  } else {
    // Login as existing user
    await userCard.click();
    await page.fill('[data-testid="pin-input"]', persona.pin);
    await page.click('[data-testid="pin-submit"]');
  }

  // Dismiss welcome modal if shown
  const welcomeModal = page.locator('[data-testid="welcome-modal"]');
  if (await welcomeModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.click('[data-testid="welcome-modal-dismiss"]');
  }

  // Wait for main app to load
  await page.waitForSelector('[data-testid="main-app"]', { timeout: 10000 });
}

/**
 * Login as persona by ID
 */
export async function loginAsPersonaById(page: Page, personaId: string): Promise<void> {
  const persona = getPersona(personaId);
  if (!persona) {
    throw new Error(`Persona not found: ${personaId}`);
  }
  return loginAsPersona(page, persona);
}

/**
 * Quick login shortcuts for common test scenarios
 */
export const loginAs = {
  owner: (page: Page) => loginAsPersona(page, PERSONAS_BY_ROLE.owner[0]),
  manager: (page: Page) => loginAsPersona(page, PERSONAS_BY_ROLE.manager[0]),
  staff: (page: Page) => loginAsPersona(page, PERSONAS_BY_ROLE.staff[0]),
  seniorLSP: (page: Page) => loginAsPersonaById(page, 'dave-thompson'),
  juniorLSP: (page: Page) => loginAsPersonaById(page, 'jasmine-rodriguez'),
  bilingual: (page: Page) => loginAsPersonaById(page, 'carlos-mendez'),
  licensedCSR: (page: Page) => loginAsPersonaById(page, 'shelly-carter'),
  unlicensedCSR: (page: Page) => loginAsPersonaById(page, 'taylor-kim'),
  financialSpecialist: (page: Page) => loginAsPersonaById(page, 'rob-patterson'),
};

// ============================================================================
// DEVICE SIMULATION
// ============================================================================

/**
 * Configure viewport and device for persona's primary device
 */
export async function configureDeviceForPersona(page: Page, persona: AllstatePersona): Promise<void> {
  const deviceConfigs = {
    desktop: { width: 1920, height: 1080, isMobile: false },
    tablet: { width: 1024, height: 768, isMobile: false },
    mobile: { width: 375, height: 812, isMobile: true },
    'multi-device': { width: 1920, height: 1080, isMobile: false }, // Default to desktop
  };

  const config = deviceConfigs[persona.behavior.primaryDevice];
  await page.setViewportSize({ width: config.width, height: config.height });
}

/**
 * Test mobile experience for persona
 */
export async function testMobileExperience(page: Page, persona: AllstatePersona): Promise<void> {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: 'light' });
}

// ============================================================================
// BEHAVIOR SIMULATION
// ============================================================================

/**
 * Simulate persona's typical workflow speed
 */
export function getTypingDelay(persona: AllstatePersona): number {
  const delays: Record<string, number> = {
    low: 150,
    medium: 100,
    'medium-high': 75,
    high: 50,
    'very-high': 25,
  };
  return delays[persona.techComfort] || 100;
}

/**
 * Simulate keyboard shortcut usage based on persona
 */
export async function maybeUseKeyboardShortcut(
  page: Page,
  persona: AllstatePersona,
  shortcut: string,
  fallbackAction: () => Promise<void>
): Promise<void> {
  if (persona.behavior.usesKeyboardShortcuts) {
    await page.keyboard.press(shortcut);
  } else {
    await fallbackAction();
  }
}

/**
 * Navigate to persona's preferred view
 */
export async function navigateToPreferredView(page: Page, persona: AllstatePersona): Promise<void> {
  const viewSelectors: Record<string, string> = {
    list: '[data-testid="view-list"]',
    kanban: '[data-testid="view-kanban"]',
    dashboard: '[data-testid="view-dashboard"]',
    calendar: '[data-testid="view-calendar"]',
  };

  const selector = viewSelectors[persona.behavior.preferredView];
  if (selector) {
    await page.click(selector);
    await page.waitForLoadState('networkidle');
  }
}

// ============================================================================
// PERMISSION TESTING
// ============================================================================

/**
 * Verify persona has expected permissions
 */
export async function verifyPermissions(page: Page, persona: AllstatePersona): Promise<void> {
  // Check strategic goals visibility (owner only)
  const strategicGoalsVisible = await page.locator('[data-testid="strategic-goals-section"]').isVisible().catch(() => false);
  expect(strategicGoalsVisible).toBe(persona.permissions.can_view_strategic_goals);

  // Check team management visibility
  const teamManagementVisible = await page.locator('[data-testid="team-management-button"]').isVisible().catch(() => false);
  expect(teamManagementVisible).toBe(persona.permissions.can_manage_team);

  // Check bulk actions availability
  const bulkActionsVisible = await page.locator('[data-testid="bulk-actions-button"]').isVisible().catch(() => false);
  expect(bulkActionsVisible).toBe(persona.permissions.can_edit_all_tasks);
}

/**
 * Test that permission boundaries are enforced
 */
export async function testPermissionBoundary(
  page: Page,
  persona: AllstatePersona,
  action: string,
  shouldSucceed: boolean
): Promise<void> {
  const actions: Record<string, () => Promise<boolean>> = {
    'edit-others-task': async () => {
      const otherTask = page.locator('[data-testid^="task-"]:not([data-owner="' + persona.name + '"])').first();
      if (await otherTask.count() === 0) return true; // No other tasks to test
      await otherTask.click();
      const editButton = page.locator('[data-testid="edit-task-button"]');
      return editButton.isEnabled();
    },
    'delete-all-tasks': async () => {
      const deleteAllButton = page.locator('[data-testid="delete-all-tasks"]');
      return deleteAllButton.isVisible();
    },
    'assign-task': async () => {
      await page.click('[data-testid="add-task-button"]');
      const assignDropdown = page.locator('[data-testid="assign-dropdown"]');
      return assignDropdown.isVisible();
    },
    'edit-strategic-goals': async () => {
      const goalsSection = page.locator('[data-testid="strategic-goals-section"]');
      if (!(await goalsSection.isVisible())) return false;
      await goalsSection.click();
      const editButton = page.locator('[data-testid="edit-goal-button"]');
      return editButton.isVisible();
    },
  };

  const actionFn = actions[action];
  if (actionFn) {
    const result = await actionFn();
    expect(result).toBe(shouldSucceed);
  }
}

// ============================================================================
// TASK CREATION HELPERS
// ============================================================================

/**
 * Create a task typical for this persona's workflow
 */
export async function createTypicalTask(
  page: Page,
  persona: AllstatePersona,
  options?: { category?: string; priority?: string }
): Promise<void> {
  const taskTexts: Record<string, string> = {
    'marcus-bealer': 'Review quarterly agency performance metrics',
    'pat-nguyen': 'Assign renewal follow-ups to team',
    'dave-thompson': 'Call back customer about auto quote',
    'jasmine-rodriguez': 'Follow up on yesterday\'s cold calls',
    'carlos-mendez': 'Llamar al cliente sobre la renovación de póliza',
    'shelly-carter': 'Process billing question - customer callback',
    'taylor-kim': 'Schedule policy review appointment for Mr. Johnson',
    'rob-patterson': 'Prepare retirement planning documents',
  };

  const taskText = taskTexts[persona.id] || 'Complete task assignment';

  // Open task creation
  await page.click('[data-testid="add-task-button"]');

  // Enter task text
  await page.fill('[data-testid="task-input"]', taskText);

  // Set category if persona typically uses specific ones
  if (options?.category || persona.behavior.taskCategories.length > 0) {
    const category = options?.category || persona.behavior.taskCategories[0];
    await page.click('[data-testid="category-dropdown"]');
    await page.click(`[data-testid="category-${category}"]`);
  }

  // Submit
  await page.click('[data-testid="submit-task"]');

  // Wait for task to appear
  await page.waitForSelector(`text=${taskText.substring(0, 20)}`);
}

// ============================================================================
// AI FEATURE TESTING
// ============================================================================

/**
 * Test AI features based on persona's AI usage
 */
export async function testAIFeatures(page: Page, persona: AllstatePersona): Promise<void> {
  if (!persona.permissions.can_use_ai_features) {
    // Verify AI features are hidden
    const aiButton = page.locator('[data-testid="ai-features-button"]');
    expect(await aiButton.isVisible()).toBe(false);
    return;
  }

  if (!persona.behavior.usesAIFeatures) {
    // Persona has access but doesn't use them - just verify they exist
    const aiButton = page.locator('[data-testid="ai-features-button"]');
    expect(await aiButton.isVisible()).toBe(true);
    return;
  }

  // Test smart parse
  await page.click('[data-testid="add-task-button"]');
  await page.fill('[data-testid="task-input"]', 'Call John Smith tomorrow about his auto renewal at 555-1234');
  await page.waitForSelector('[data-testid="ai-suggestions"]', { timeout: 5000 });

  // Verify AI detected insurance patterns
  const suggestions = page.locator('[data-testid="ai-suggestion-item"]');
  expect(await suggestions.count()).toBeGreaterThan(0);

  // Cancel task creation
  await page.keyboard.press('Escape');
}

/**
 * Test AI email generation for sales personas
 */
export async function testAIEmailGeneration(page: Page, persona: AllstatePersona): Promise<void> {
  if (!persona.behavior.usesAIFeatures) return;

  // Select a task
  const task = page.locator('[data-testid^="task-"]').first();
  await task.click();

  // Click AI email button
  const aiEmailButton = page.locator('[data-testid="generate-email-button"]');
  if (await aiEmailButton.isVisible()) {
    await aiEmailButton.click();

    // Wait for email generation
    await page.waitForSelector('[data-testid="generated-email"]', { timeout: 10000 });

    // Verify email content exists
    const emailContent = page.locator('[data-testid="generated-email-content"]');
    expect(await emailContent.textContent()).toBeTruthy();
  }
}

// ============================================================================
// ARCHETYPE TESTING
// ============================================================================

/**
 * Run tests appropriate for a behavioral archetype
 */
export async function testBehaviorArchetype(
  page: Page,
  archetype: BehaviorArchetype
): Promise<void> {
  const personas = ARCHETYPE_MAPPING[archetype];
  if (personas.length === 0) return;

  const persona = personas[0];
  await loginAsPersona(page, persona);

  switch (archetype) {
    case 'power-user':
      await testPowerUserWorkflow(page, persona);
      break;
    case 'mobile-first':
      await testMobileFirstWorkflow(page, persona);
      break;
    case 'reluctant-adopter':
      await testReluctantAdopterWorkflow(page, persona);
      break;
    case 'collaborative-communicator':
      await testCollaborativeWorkflow(page, persona);
      break;
    case 'data-driven':
      await testDataDrivenWorkflow(page, persona);
      break;
  }
}

async function testPowerUserWorkflow(page: Page, persona: AllstatePersona): Promise<void> {
  // Test keyboard shortcuts
  await page.keyboard.press('n'); // New task
  await page.waitForSelector('[data-testid="task-input"]');
  await page.keyboard.press('Escape');

  // Test bulk operations
  await page.keyboard.press('Control+a'); // Select all
  const selectedCount = await page.locator('[data-testid="selected-count"]').textContent();

  // Test rapid filtering
  await page.keyboard.press('f'); // Open filter
  await page.waitForSelector('[data-testid="filter-panel"]');
}

async function testMobileFirstWorkflow(page: Page, persona: AllstatePersona): Promise<void> {
  // Switch to mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });

  // Test pull to refresh
  await page.touchscreen.tap(187, 100);

  // Test swipe gestures
  const task = page.locator('[data-testid^="task-"]').first();
  const box = await task.boundingBox();
  if (box) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  // Test FAB (floating action button)
  const fab = page.locator('[data-testid="mobile-fab"]');
  expect(await fab.isVisible()).toBe(true);
}

async function testReluctantAdopterWorkflow(page: Page, persona: AllstatePersona): Promise<void> {
  // Test minimal workflow - just create and complete a task
  await page.click('[data-testid="add-task-button"]');
  await page.fill('[data-testid="task-input"]', 'Simple test task');
  await page.click('[data-testid="submit-task"]');

  // Complete the task
  const checkbox = page.locator('[data-testid="task-checkbox"]').first();
  await checkbox.click();

  // Verify completion
  await page.waitForSelector('[data-testid="task-completed"]');
}

async function testCollaborativeWorkflow(page: Page, persona: AllstatePersona): Promise<void> {
  // Open chat
  await page.click('[data-testid="chat-button"]');
  await page.waitForSelector('[data-testid="chat-panel"]');

  // Send a message
  await page.fill('[data-testid="chat-input"]', 'Quick question about the Johnson account');
  await page.click('[data-testid="send-message"]');

  // Verify message sent
  await page.waitForSelector('text=Quick question about the Johnson account');

  // Test @mentions
  await page.fill('[data-testid="chat-input"]', '@Pat can you help?');
  await page.waitForSelector('[data-testid="mention-suggestions"]');
}

async function testDataDrivenWorkflow(page: Page, persona: AllstatePersona): Promise<void> {
  // Navigate to dashboard
  await page.click('[data-testid="view-dashboard"]');
  await page.waitForSelector('[data-testid="dashboard-metrics"]');

  // Verify metrics are visible
  const metrics = page.locator('[data-testid="metric-card"]');
  expect(await metrics.count()).toBeGreaterThan(0);

  // Test archive browser
  await page.click('[data-testid="archive-button"]');
  await page.waitForSelector('[data-testid="archive-browser"]');

  // Test export
  const exportButton = page.locator('[data-testid="export-csv"]');
  expect(await exportButton.isVisible()).toBe(true);
}

// ============================================================================
// SCENARIO HELPERS
// ============================================================================

/**
 * Set up a realistic agency scenario with multiple personas
 */
export async function setupAgencyScenario(page: Page): Promise<void> {
  // Login as owner first to set up the agency
  await loginAs.owner(page);

  // Create sample tasks from owner perspective
  await createTypicalTask(page, PERSONAS_BY_ROLE.owner[0]);

  // Logout
  await page.click('[data-testid="logout-button"]');
}

/**
 * Test task handoff between personas
 */
export async function testTaskHandoff(
  page: Page,
  fromPersona: AllstatePersona,
  toPersona: AllstatePersona
): Promise<void> {
  // Login as assigner
  await loginAsPersona(page, fromPersona);

  // Create and assign task
  await page.click('[data-testid="add-task-button"]');
  await page.fill('[data-testid="task-input"]', `Handoff task for ${toPersona.name}`);

  // Assign to recipient
  if (fromPersona.permissions.can_assign_tasks) {
    await page.click('[data-testid="assign-dropdown"]');
    await page.click(`[data-testid="assign-${toPersona.name.split(' ')[0].toLowerCase()}"]`);
  }

  await page.click('[data-testid="submit-task"]');

  // Logout and login as recipient
  await page.click('[data-testid="logout-button"]');
  await loginAsPersona(page, toPersona);

  // Verify task is visible
  await page.waitForSelector(`text=Handoff task for ${toPersona.name}`);
}
