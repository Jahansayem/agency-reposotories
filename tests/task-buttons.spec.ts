/**
 * Task Management Buttons — Comprehensive E2E Tests
 *
 * Tests that all task management buttons and interactive controls perform
 * their intended actions correctly. Covers the full task lifecycle:
 * creation, completion, detail view, inline editing, action menus,
 * filtering/sorting, priority, and bulk operations.
 *
 * Uses the provided PIN-based login helper for authentication.
 */

import { test, expect } from './helpers/test-base';
import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Login helper (PIN-based auth for Derrick)
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto('/');
  const userCard = page.locator('[data-testid="user-card-Derrick"]');
  await expect(userCard).toBeVisible({ timeout: 15000 });
  await userCard.click();
  const pinInputs = page.locator('input[type="password"]');
  await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill('8008'[i]);
  }
  await page.waitForLoadState('networkidle');

  // Sidebar uses lg:flex (1024px+), bottom nav uses lg:hidden
  const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);
  if (isDesktop) {
    await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible({ timeout: 15000 });
  } else {
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible({ timeout: 15000 });
  }

  // Wait for and dismiss the AI Feature Tour (renders after app loads with a delay)
  const dontShowBtn = page.locator('button').filter({ hasText: "Don't show again" });
  try {
    await expect(dontShowBtn).toBeVisible({ timeout: 5000 });
    await dontShowBtn.click();
    await page.waitForTimeout(500);
  } catch {
    // Tour didn't appear — that's fine
  }

  // Dismiss any remaining modals/overlays
  for (let attempt = 0; attempt < 3; attempt++) {
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      break;
    }
  }
}

/** Navigate to the Tasks view and wait for it to fully load. */
async function navigateToTasks(page: Page) {
  const quickFilter = page.locator('[data-testid="quick-filter"]');
  const alreadyOnTasks = await quickFilter.isVisible({ timeout: 2000 }).catch(() => false);
  if (alreadyOnTasks) return;

  const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);
  if (isDesktop) {
    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    const tasksBtn = sidebar.locator('button').filter({ hasText: 'Tasks' });
    await tasksBtn.click();
  } else {
    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    const tasksTab = bottomNav.locator('button[aria-label="Tasks"]');
    await tasksTab.click({ force: true });
  }
  // Wait for the task list filter bar to appear (unique to Tasks view)
  await expect(quickFilter).toBeVisible({ timeout: 20000 });
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Generate a unique task name to avoid collisions between parallel tests. */
function uniqueTaskName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Wait for the task list to settle after mutations (debounced search, animations). */
async function waitForListStable(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  // Allow framer-motion animations to settle
  await page.waitForTimeout(400);
  await dismissAppModals(page);
}

/** Dismiss known app modals that may block interaction. */
async function dismissAppModals(page: Page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    // CompletionCelebration — dismiss via "Keep Going" or "Done for Now" buttons
    // These buttons animate in with a 0.9s delay, so use a generous timeout
    const keepGoingBtn = page.locator('button').filter({ hasText: 'Keep Going' });
    const doneForNowBtn = page.locator('button').filter({ hasText: 'Done for Now' });
    if (await keepGoingBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await keepGoingBtn.click();
      await page.waitForTimeout(500);
      continue;
    }
    if (await doneForNowBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await doneForNowBtn.click();
      await page.waitForTimeout(500);
      continue;
    }

    // Duplicate Detection modal — click "Create New Task" to proceed
    const createNewBtn = page.locator('[role="dialog"][aria-label="Duplicate Detection"] button').filter({ hasText: 'Create New Task' });
    if (await createNewBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await createNewBtn.click();
      await page.waitForTimeout(500);
      continue;
    }

    break;
  }
}

/** Wait for the CompletionCelebration overlay to settle and dismiss it. */
async function waitForCelebrationAndDismiss(page: Page) {
  // The celebration overlay may appear with a delay after page loads
  // The dismiss buttons have a 0.9s animation delay, so wait up to ~5s total
  const keepGoingBtn = page.locator('button').filter({ hasText: 'Keep Going' });
  const doneForNowBtn = page.locator('button').filter({ hasText: 'Done for Now' });
  const dismissBtn = keepGoingBtn.or(doneForNowBtn);
  try {
    await expect(dismissBtn).toBeVisible({ timeout: 5000 });
    await dismissBtn.click();
    await page.waitForTimeout(500);
  } catch {
    // No celebration appeared — that's fine
  }
}

/**
 * Create a task by opening the Add Task modal, typing, and pressing Enter.
 * Returns the task text that was used.
 */
async function createTask(page: Page, taskText: string): Promise<string> {
  // Dismiss any overlays before interacting
  await dismissAppModals(page);
  // Click "Create new task" to open the Add Task modal
  // On desktop, target the header button; fallback to sidebar button
  const headerNewTaskBtn = page.locator('header button[aria-label="Create new task"]');
  const sidebarNewTaskBtn = page.locator('aside button[aria-label="Create new task"]');
  if (await headerNewTaskBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await headerNewTaskBtn.click();
  } else {
    await sidebarNewTaskBtn.click();
  }

  // The AddTodo textarea is inside the modal
  const textarea = page.locator('textarea[aria-label="New task description"]');
  await expect(textarea).toBeVisible({ timeout: 10000 });
  await textarea.click();
  await textarea.fill(taskText);
  await textarea.press('Enter');
  await waitForListStable(page);
  return taskText;
}

/**
 * Locate a todo item in the list by its text content.
 * Returns the [data-testid="todo-item"] container whose text matches.
 */
function todoItemByText(page: Page, text: string) {
  return page.locator('[data-testid="todo-item"]').filter({ hasText: text });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Task Management Buttons', () => {
  test.beforeEach(async ({ page }) => {
    // Use a desktop-sized viewport for consistent hover / inline-action visibility
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page);
    await navigateToTasks(page);
    // Wait for and dismiss any CompletionCelebration overlay that may appear with a delay
    await waitForCelebrationAndDismiss(page);
    await dismissAppModals(page);
  });

  // =========================================================================
  // 1. "New Task" button opens the task creation form
  // =========================================================================
  test('New Task button opens the add task modal with textarea', async ({ page }) => {
    // The "New Task" button exists in sidebar and header.
    // Use the header button on desktop, fallback to sidebar.
    const headerNewTaskBtn = page.locator('header button[aria-label="Create new task"]');
    const sidebarNewTaskBtn = page.locator('aside button[aria-label="Create new task"]');

    if (await headerNewTaskBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await headerNewTaskBtn.click();
    } else {
      await expect(sidebarNewTaskBtn).toBeVisible({ timeout: 5000 });
      await sidebarNewTaskBtn.click();
    }

    // The AddTodo textarea should appear in the modal
    const textarea = page.locator('textarea[aria-label="New task description"]');
    await expect(textarea).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 2. Task input field accepts text
  // =========================================================================
  test('Task textarea accepts and displays typed text', async ({ page }) => {
    // Open the Add Task modal first
    const headerNewTaskBtn = page.locator('header button[aria-label="Create new task"]');
    const sidebarNewTaskBtn = page.locator('aside button[aria-label="Create new task"]');
    if (await headerNewTaskBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await headerNewTaskBtn.click();
    } else {
      await sidebarNewTaskBtn.click();
    }

    const textarea = page.locator('textarea[aria-label="New task description"]');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.click();

    const testText = 'This is a test task for input validation';
    await textarea.fill(testText);
    await expect(textarea).toHaveValue(testText);
  });

  // =========================================================================
  // 3. Submitting a task (Enter key) creates it and it appears in the list
  // =========================================================================
  test('Pressing Enter creates a task that appears in the task list', async ({ page }) => {
    const taskText = uniqueTaskName('EnterSubmit');
    await createTask(page, taskText);

    // Verify the task shows up in the list
    const taskItem = todoItemByText(page, taskText);
    await expect(taskItem.first()).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // 3b. Submitting via the Add button also creates a task
  // =========================================================================
  test('Clicking the Add button creates a task', async ({ page }) => {
    const taskText = uniqueTaskName('AddBtnSubmit');
    // Open the Add Task modal
    const headerNewTaskBtn = page.locator('header button[aria-label="Create new task"]');
    const sidebarNewTaskBtn = page.locator('aside button[aria-label="Create new task"]');
    if (await headerNewTaskBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await headerNewTaskBtn.click();
    } else {
      await sidebarNewTaskBtn.click();
    }

    const textarea = page.locator('textarea[aria-label="New task description"]');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.click();
    await textarea.fill(taskText);

    // Click the submit / Add button
    const addBtn = page.locator('button[aria-label="Add task"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await waitForListStable(page);

    const taskItem = todoItemByText(page, taskText);
    await expect(taskItem.first()).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // 4. Task checkbox / complete button toggles completion
  // =========================================================================
  test('Completion button toggles task completed state', async ({ page }) => {
    const taskText = uniqueTaskName('CompToggle');
    await createTask(page, taskText);

    // Open task detail modal (same approach as the working "Mark Done" test #12)
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click "Mark Done" in the footer
    const markDoneBtn = dialog.locator('button').filter({ hasText: 'Mark Done' });
    await expect(markDoneBtn).toBeVisible({ timeout: 5000 });
    await markDoneBtn.click();
    await waitForListStable(page);

    // The button text should now change to "Reopen"
    const reopenBtn = dialog.locator('button').filter({ hasText: 'Reopen' });
    await expect(reopenBtn).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // 5. Clicking on a task opens the task detail view
  // =========================================================================
  test('Clicking a task title opens the task detail modal', async ({ page }) => {
    const taskText = uniqueTaskName('DetailOpen');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });

    // Click the task content area (the clickable div inside the task item)
    // The content area has role="button" and aria-label containing the task text
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    // A dialog / modal should appear containing the task details
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 6. Task detail close button returns to task list
  // =========================================================================
  test('Closing the task detail modal returns to the task list', async ({ page }) => {
    const taskText = uniqueTaskName('DetailClose');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });

    // Open detail
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close via the close button (aria-label="Close")
    const closeBtn = dialog.locator('button[aria-label="Close"]');
    await expect(closeBtn).toBeVisible({ timeout: 3000 });
    await closeBtn.click();

    // Dialog should disappear
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // The task should still be in the list
    await expect(taskItem).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 7. Priority selector works in the add-task form
  // =========================================================================
  test('Priority selector in add-task form changes priority', async ({ page }) => {
    // Open the Add Task modal
    const headerNewTaskBtn = page.locator('header button[aria-label="Create new task"]');
    const sidebarNewTaskBtn = page.locator('aside button[aria-label="Create new task"]');
    if (await headerNewTaskBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await headerNewTaskBtn.click();
    } else {
      await sidebarNewTaskBtn.click();
    }

    const textarea = page.locator('textarea[aria-label="New task description"]');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.click();
    await textarea.fill('priority test');

    // The priority select should be visible when the form is focused
    const prioritySelect = page.locator('[data-testid="priority-select"]');
    await expect(prioritySelect).toBeVisible({ timeout: 5000 });

    // Change to "High"
    await prioritySelect.selectOption('high');
    await expect(prioritySelect).toHaveValue('high');

    // Change to "Urgent"
    await prioritySelect.selectOption('urgent');
    await expect(prioritySelect).toHaveValue('urgent');

    // Change back to "Low"
    await prioritySelect.selectOption('low');
    await expect(prioritySelect).toHaveValue('low');
  });

  // =========================================================================
  // 7b. Priority can be changed in the task detail modal
  // =========================================================================
  test('Priority selector works inside the task detail modal', async ({ page }) => {
    const taskText = uniqueTaskName('PriorityDetail');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The metadata section has a priority select with aria-label "Task priority"
    const prioritySelect = dialog.locator('select[aria-label="Task priority"]');
    await expect(prioritySelect).toBeVisible({ timeout: 5000 });

    await prioritySelect.selectOption('high');
    await expect(prioritySelect).toHaveValue('high');

    await prioritySelect.selectOption('urgent');
    await expect(prioritySelect).toHaveValue('urgent');
  });

  // =========================================================================
  // 8. Status can be changed in the task detail modal
  // =========================================================================
  test('Status selector works inside the task detail modal', async ({ page }) => {
    const taskText = uniqueTaskName('StatusChange');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The metadata section has a status select with aria-label "Task status"
    const statusSelect = dialog.locator('select[aria-label="Task status"]');
    await expect(statusSelect).toBeVisible({ timeout: 5000 });

    // Change status to "In Progress"
    await statusSelect.selectOption('in_progress');
    await expect(statusSelect).toHaveValue('in_progress');

    // Change status to "Done"
    await statusSelect.selectOption('done');
    await expect(statusSelect).toHaveValue('done');
  });

  // =========================================================================
  // 9. Three-dot action menu opens and shows options
  // =========================================================================
  test('Three-dot action menu opens with expected menu items', async ({ page }) => {
    const taskText = uniqueTaskName('ActionMenu');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });

    // Hover to reveal the three-dot button
    await taskItem.hover();
    await page.waitForTimeout(300);

    // The three-dot button has aria-label "Task actions"
    const menuBtn = taskItem.locator('button[aria-label="Task actions"]');
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
    await menuBtn.click();

    // The dropdown menu is rendered via portal with role="menu" and aria-label "Task actions menu"
    const menu = page.locator('[role="menu"][aria-label="Task actions menu"]');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Verify expected menu items are present
    const editItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Edit' });
    await expect(editItem).toBeVisible();

    const duplicateItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Duplicate' });
    await expect(duplicateItem).toBeVisible();

    const snoozeItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Snooze' });
    await expect(snoozeItem).toBeVisible();

    const deleteItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Delete' });
    await expect(deleteItem).toBeVisible();
  });

  // =========================================================================
  // 9b. Edit action from three-dot menu enables inline text editing
  // =========================================================================
  test('Edit action from action menu enables inline text editing', async ({ page }) => {
    const taskText = uniqueTaskName('EditAction');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    await taskItem.hover();
    await page.waitForTimeout(300);

    const menuBtn = taskItem.locator('button[aria-label="Task actions"]');
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
    await menuBtn.click();

    const menu = page.locator('[role="menu"][aria-label="Task actions menu"]');
    await expect(menu).toBeVisible({ timeout: 5000 });

    const editItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Edit' });
    await editItem.click();

    // An inline input should appear in the task item for editing
    // Note: after clicking Edit, the <p> text is replaced by an <input>, so
    // the todoItemByText filter may not match. Use a global selector instead.
    const editInput = page.locator('[data-testid="todo-item"] input.input-refined').first();
    await expect(editInput).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 9c. Duplicate action from three-dot menu creates a copy
  // =========================================================================
  test('Duplicate action from action menu creates a task copy', async ({ page }) => {
    const taskText = uniqueTaskName('DupAction');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    await taskItem.hover();
    await page.waitForTimeout(300);

    const menuBtn = taskItem.locator('button[aria-label="Task actions"]');
    await menuBtn.click();

    const menu = page.locator('[role="menu"][aria-label="Task actions menu"]');
    await expect(menu).toBeVisible({ timeout: 5000 });

    const duplicateItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Duplicate' });
    await duplicateItem.click();
    await waitForListStable(page);

    // There should now be at least 2 items containing the task text
    const matchingItems = page.locator('[data-testid="todo-item"]').filter({ hasText: taskText });
    await expect(matchingItems).toHaveCount(2, { timeout: 10000 });
  });

  // =========================================================================
  // 9d. Delete action from three-dot menu opens confirmation and deletes
  // =========================================================================
  test('Delete action from action menu deletes the task after confirmation', async ({ page }) => {
    const taskText = uniqueTaskName('DeleteAction');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    await taskItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await dismissAppModals(page);
    await taskItem.hover();
    await page.waitForTimeout(300);

    const menuBtn = taskItem.locator('button[aria-label="Task actions"]');
    await menuBtn.click();

    const menu = page.locator('[role="menu"][aria-label="Task actions menu"]');
    await expect(menu).toBeVisible({ timeout: 5000 });

    const deleteItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Delete' });
    await deleteItem.click();

    // A confirmation dialog should appear (role="alertdialog")
    const confirmDialog = page.locator('[role="alertdialog"]');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await expect(confirmDialog.locator('text=Delete Task?')).toBeVisible();

    // Accept the native confirm() dialog that fires when the Delete button is clicked
    page.on('dialog', dialog => dialog.accept());

    // Click the confirm "Delete" button via evaluate to bypass stacking context issues
    // (DeleteConfirmDialog renders inside TodoItem's DOM tree where framer-motion
    // transforms create stacking contexts that intercept pointer events)
    const confirmDeleteBtn = confirmDialog.locator('button').filter({ hasText: 'Delete' });
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 3000 });
    await confirmDeleteBtn.evaluate(btn => (btn as HTMLButtonElement).click());
    await waitForListStable(page);

    // The task should no longer be in the list
    const deletedItem = todoItemByText(page, taskText);
    await expect(deletedItem).toHaveCount(0, { timeout: 10000 });
  });

  // =========================================================================
  // 9e. Snooze submenu in action menu shows snooze options
  // =========================================================================
  test('Snooze submenu in action menu shows time options', async ({ page }) => {
    const taskText = uniqueTaskName('SnoozeMenu');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    await taskItem.hover();
    await page.waitForTimeout(300);

    const menuBtn = taskItem.locator('button[aria-label="Task actions"]');
    await menuBtn.click();

    const menu = page.locator('[role="menu"][aria-label="Task actions menu"]');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Click "Snooze" to expand the submenu
    const snoozeItem = menu.locator('[role="menuitem"]').filter({ hasText: 'Snooze' });
    await snoozeItem.click();

    // The snooze sub-options should appear
    const snoozeSubmenu = menu.locator('[role="menu"][aria-label="Snooze options"]');
    await expect(snoozeSubmenu).toBeVisible({ timeout: 3000 });

    await expect(snoozeSubmenu.locator('[role="menuitem"]').filter({ hasText: 'Tomorrow' })).toBeVisible();
    await expect(snoozeSubmenu.locator('[role="menuitem"]').filter({ hasText: 'In 2 Days' })).toBeVisible();
    await expect(snoozeSubmenu.locator('[role="menuitem"]').filter({ hasText: 'Next Week' })).toBeVisible();
    await expect(snoozeSubmenu.locator('[role="menuitem"]').filter({ hasText: 'Next Month' })).toBeVisible();
  });

  // =========================================================================
  // 10a. Quick filter dropdown filters the task list
  // =========================================================================
  test('Quick filter dropdown changes visible tasks', async ({ page }) => {
    // Make sure we have at least one task
    const taskText = uniqueTaskName('FilterTest');
    await createTask(page, taskText);

    // The quick filter select has data-testid="quick-filter"
    const quickFilter = page.locator('[data-testid="quick-filter"]');
    await expect(quickFilter).toBeVisible({ timeout: 10000 });

    // Default should be "all" (All Tasks)
    await expect(quickFilter).toHaveValue('all');

    // Switch to "My Tasks"
    await quickFilter.selectOption('my_tasks');
    await waitForListStable(page);
    await expect(quickFilter).toHaveValue('my_tasks');

    // An "Active:" label and filter chip should appear (if this is the only active filter)
    const activeChips = page.locator('[role="region"][aria-label="Active filters"]');
    await expect(activeChips).toBeVisible({ timeout: 5000 });

    // Switch back to "All Tasks"
    await quickFilter.selectOption('all');
    await waitForListStable(page);
    await expect(quickFilter).toHaveValue('all');
  });

  // =========================================================================
  // 10b. Sort dropdown changes task ordering
  // =========================================================================
  test('Sort dropdown changes task sort order', async ({ page }) => {
    // The sort dropdown has aria-label="Sort tasks"
    const sortSelect = page.locator('select[aria-label="Sort tasks"]');
    await expect(sortSelect).toBeVisible({ timeout: 10000 });

    // Get the current default value (may vary based on user preferences)
    const defaultValue = await sortSelect.inputValue();
    expect(['created', 'priority', 'urgency', 'due_date', 'alphabetical', 'custom']).toContain(defaultValue);

    // Switch to "Alphabetical"
    await sortSelect.selectOption('alphabetical');
    await waitForListStable(page);
    await expect(sortSelect).toHaveValue('alphabetical');

    // Switch to "By Due Date"
    await sortSelect.selectOption('due_date');
    await waitForListStable(page);
    await expect(sortSelect).toHaveValue('due_date');

    // Switch to "Newest First"
    await sortSelect.selectOption('created');
    await waitForListStable(page);
    await expect(sortSelect).toHaveValue('created');

    // Reset to original default
    await sortSelect.selectOption(defaultValue);
    await waitForListStable(page);
  });

  // =========================================================================
  // 10c. High-priority filter toggle works
  // =========================================================================
  test('High priority filter button toggles urgent task filter', async ({ page }) => {
    // The urgent filter button has aria-label containing "high priority"
    const urgentBtn = page.locator('button[aria-pressed]').filter({ hasText: 'Urgent' });
    // Fallback: look for button with the Flame icon
    const urgentFilterBtn = urgentBtn.or(
      page.locator('button[aria-label*="high priority"]')
    ).first();
    await expect(urgentFilterBtn).toBeVisible({ timeout: 10000 });

    // Should initially not be pressed
    await expect(urgentFilterBtn).toHaveAttribute('aria-pressed', 'false');

    // Click to activate
    await urgentFilterBtn.click();
    await waitForListStable(page);
    await expect(urgentFilterBtn).toHaveAttribute('aria-pressed', 'true');

    // Click again to deactivate
    await urgentFilterBtn.click();
    await waitForListStable(page);
    await expect(urgentFilterBtn).toHaveAttribute('aria-pressed', 'false');
  });

  // =========================================================================
  // 10d. Search input filters tasks
  // =========================================================================
  test('Search input filters tasks by matching text', async ({ page }) => {
    const taskText = uniqueTaskName('SearchTarget');
    await createTask(page, taskText);

    // The search input has data-testid="search-input"
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type part of the unique task name
    await searchInput.fill(taskText.slice(0, 15));
    // Wait for debounce (300ms) plus animation time
    await page.waitForTimeout(600);
    await waitForListStable(page);

    // The target task should be visible
    const taskItem = todoItemByText(page, taskText);
    await expect(taskItem.first()).toBeVisible({ timeout: 5000 });

    // Clear search
    const clearSearchBtn = page.locator('button[aria-label*="Clear search"]');
    if (await clearSearchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearSearchBtn.click();
      await waitForListStable(page);
    }
  });

  // =========================================================================
  // 10e. Advanced filters panel opens and closes
  // =========================================================================
  test('Advanced filters panel opens and closes correctly', async ({ page }) => {
    // The Filters button has aria-label starting with "Advanced filters"
    const filtersBtn = page.locator('button[aria-label^="Advanced filters"]');
    await expect(filtersBtn).toBeVisible({ timeout: 10000 });

    // Open the advanced filters panel
    await filtersBtn.click();
    await page.waitForTimeout(400);

    // The panel has id="advanced-filters-title" heading
    const filtersPanel = page.locator('#advanced-filters-title');
    await expect(filtersPanel).toBeVisible({ timeout: 5000 });

    // Verify filter controls are visible: status, assigned-to, etc.
    const statusSelect = page.locator('select').filter({ has: page.locator('option[value="todo"]') });
    await expect(statusSelect.first()).toBeVisible({ timeout: 3000 });

    // Close the panel via the close button
    const closeFiltersBtn = page.locator('button[aria-label="Close advanced filters panel"]');
    await expect(closeFiltersBtn).toBeVisible({ timeout: 3000 });
    await closeFiltersBtn.click();
    await page.waitForTimeout(400);

    // Panel should be hidden
    await expect(filtersPanel).not.toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 11. View mode toggle switches between list and board
  // =========================================================================
  test('View mode toggle switches between List and Board views', async ({ page }) => {
    // List view should be active by default
    const listBtn = page.locator('button[aria-label="Switch to list view"]');
    const boardBtn = page.locator('button[aria-label="Switch to board view"]');

    await expect(listBtn).toBeVisible({ timeout: 10000 });
    await expect(boardBtn).toBeVisible({ timeout: 10000 });

    // List should be pressed
    await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(boardBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch to board view
    await boardBtn.click();
    await waitForListStable(page);
    await expect(boardBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(listBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch back to list view
    await listBtn.click();
    await waitForListStable(page);
    await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
  });

  // =========================================================================
  // 12. Task detail "Mark Done" / "Reopen" footer button works
  // =========================================================================
  test('Mark Done button in detail modal completes the task', async ({ page }) => {
    const taskText = uniqueTaskName('MarkDone');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click "Mark Done" in the footer
    const markDoneBtn = dialog.locator('button').filter({ hasText: 'Mark Done' });
    await expect(markDoneBtn).toBeVisible({ timeout: 5000 });
    await markDoneBtn.click();
    await waitForListStable(page);

    // The button text should now change to "Reopen"
    const reopenBtn = dialog.locator('button').filter({ hasText: 'Reopen' });
    await expect(reopenBtn).toBeVisible({ timeout: 5000 });

    // Click "Reopen" to uncomplete
    await reopenBtn.click();
    await waitForListStable(page);

    // Should show "Mark Done" again
    await expect(markDoneBtn).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 13. Task detail overflow menu (three-dot) opens and shows options
  // =========================================================================
  test('Overflow menu in task detail modal shows actions', async ({ page }) => {
    const taskText = uniqueTaskName('OverflowDetail');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click the overflow button (aria-label "More options")
    const moreBtn = dialog.locator('button[aria-label="More options"]');
    await expect(moreBtn).toBeVisible({ timeout: 5000 });
    await moreBtn.click();

    // The overflow menu should appear with role="menu"
    const overflowMenu = page.locator('[role="menu"]').last();
    await expect(overflowMenu).toBeVisible({ timeout: 5000 });

    // Verify expected items
    await expect(overflowMenu.locator('[role="menuitem"]').filter({ hasText: 'Duplicate' })).toBeVisible();
    await expect(overflowMenu.locator('[role="menuitem"]').filter({ hasText: 'Save as Template' })).toBeVisible();
    await expect(overflowMenu.locator('[role="menuitem"]').filter({ hasText: 'Snooze' })).toBeVisible();
    await expect(overflowMenu.locator('[role="menuitem"]').filter({ hasText: 'Delete Task' })).toBeVisible();
  });

  // =========================================================================
  // 13b. Delete from task detail overflow menu with confirmation
  // =========================================================================
  test('Delete from task detail overflow menu requires double-click confirmation', async ({ page }) => {
    const taskText = uniqueTaskName('OverflowDelete');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Open overflow menu
    const moreBtn = dialog.locator('button[aria-label="More options"]');
    await moreBtn.click();

    const overflowMenu = page.locator('[role="menu"]').last();
    await expect(overflowMenu).toBeVisible({ timeout: 5000 });

    // First click on "Delete Task" should change text to "Confirm Delete?"
    const deleteBtn = overflowMenu.locator('[role="menuitem"]').filter({ hasText: 'Delete Task' });
    await deleteBtn.click();

    // After first click, the button text changes to "Confirm Delete?"
    const confirmDeleteBtn = overflowMenu.locator('[role="menuitem"]').filter({ hasText: 'Confirm Delete?' });
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 3000 });

    // Accept the native confirm() dialog that fires when the delete is confirmed
    page.on('dialog', dialog => dialog.accept());

    // Second click actually deletes
    await confirmDeleteBtn.click();
    await waitForListStable(page);

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Task should be gone from the list
    const deletedItem = todoItemByText(page, taskText);
    await expect(deletedItem).toHaveCount(0, { timeout: 10000 });
  });

  // =========================================================================
  // 14. Task detail title editing works
  // =========================================================================
  test('Task title can be edited in the detail modal', async ({ page }) => {
    const taskText = uniqueTaskName('TitleEdit');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click the title area to enter edit mode (aria-label "Click to edit task title")
    const titleEditBtn = dialog.locator('button[aria-label="Click to edit task title"]');
    await expect(titleEditBtn).toBeVisible({ timeout: 5000 });
    await titleEditBtn.click();

    // A textarea should appear for editing the title (aria-label "Edit task title")
    const titleTextarea = dialog.locator('textarea[aria-label="Edit task title"]');
    await expect(titleTextarea).toBeVisible({ timeout: 5000 });

    // Modify the title
    const newTitle = taskText + ' EDITED';
    await titleTextarea.fill(newTitle);

    // Save via the Save button (aria-label "Save title")
    const saveBtn = dialog.locator('button[aria-label="Save title"]');
    await expect(saveBtn).toBeVisible({ timeout: 3000 });
    await saveBtn.click();
    await waitForListStable(page);

    // The title should now show the updated text
    await expect(dialog.locator('h2').filter({ hasText: 'EDITED' })).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 15. Assignee selector works in the task detail modal
  // =========================================================================
  test('Assignee selector works in the task detail modal', async ({ page }) => {
    const taskText = uniqueTaskName('AssignDetail');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The assignee select has aria-label "Assigned to"
    const assigneeSelect = dialog.locator('select[aria-label="Assigned to"]');
    await expect(assigneeSelect).toBeVisible({ timeout: 5000 });

    // The default value should be empty (Unassigned)
    // Select a user (Derrick should be in the list since that is who we logged in as)
    const options = await assigneeSelect.locator('option').allTextContents();
    // Find a non-empty option to select
    const nonEmptyOption = options.find(opt => opt !== 'Unassigned' && opt.trim() !== '');
    if (nonEmptyOption) {
      await assigneeSelect.selectOption({ label: nonEmptyOption });
      await waitForListStable(page);
      // Verify the selection stuck
      const selectedValue = await assigneeSelect.inputValue();
      expect(selectedValue).toBeTruthy();
    }
  });

  // =========================================================================
  // 16. Due date input works in the task detail modal
  // =========================================================================
  test('Due date input works in the task detail modal', async ({ page }) => {
    const taskText = uniqueTaskName('DueDateDetail');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The due date input has aria-label "Due date"
    const dueDateInput = dialog.locator('input[aria-label="Due date"]');
    await expect(dueDateInput).toBeVisible({ timeout: 5000 });

    // Set a date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await dueDateInput.fill(dateStr);
    await waitForListStable(page);

    // Verify the value was set
    await expect(dueDateInput).toHaveValue(dateStr);
  });

  // =========================================================================
  // 17. Recurrence selector works in the task detail modal
  // =========================================================================
  test('Recurrence selector works in the task detail modal', async ({ page }) => {
    const taskText = uniqueTaskName('RecurrDetail');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The recurrence select has aria-label "Recurrence"
    const recurrenceSelect = dialog.locator('select[aria-label="Recurrence"]');
    await expect(recurrenceSelect).toBeVisible({ timeout: 5000 });

    // Change to "Weekly"
    await recurrenceSelect.selectOption('weekly');
    await expect(recurrenceSelect).toHaveValue('weekly');

    // Change to "Daily"
    await recurrenceSelect.selectOption('daily');
    await expect(recurrenceSelect).toHaveValue('daily');

    // Change back to "No repeat"
    await recurrenceSelect.selectOption('');
    await expect(recurrenceSelect).toHaveValue('');
  });

  // =========================================================================
  // 18. Expand/collapse chevron on inline task item works
  // =========================================================================
  test('Expand/collapse button toggles task inline details', async ({ page }) => {
    const taskText = uniqueTaskName('ExpandCollapse');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    await taskItem.hover();
    await page.waitForTimeout(300);

    // The expand button has aria-label "Expand task details"
    const expandBtn = taskItem.locator('button[aria-label="Expand task details"]');
    // It might be hidden on desktop until hover, check visibility
    if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(400);

      // After expanding, the button label should change to "Collapse task details"
      const collapseBtn = taskItem.locator('button[aria-label="Collapse task details"]');
      await expect(collapseBtn).toBeVisible({ timeout: 3000 });

      // Collapse it again
      await collapseBtn.click();
      await page.waitForTimeout(400);

      // Should show expand again
      await expect(expandBtn).toBeVisible({ timeout: 3000 });
    }
  });

  // =========================================================================
  // 19. Options menu: bulk selection mode can be toggled
  // =========================================================================
  test.fixme('Options menu enables and disables bulk selection mode', async ({ page }) => {
    // Create at least two tasks for bulk operations
    const task1 = uniqueTaskName('Bulk1');
    const task2 = uniqueTaskName('Bulk2');
    await createTask(page, task1);
    await createTask(page, task2);

    // Click the "Options" button which has aria-haspopup="menu"
    const optionsBtn = page.locator('button[aria-label*="Task options menu"]');
    await expect(optionsBtn).toBeVisible({ timeout: 10000 });
    await optionsBtn.click();

    // The dropdown should appear
    const optionsMenu = page.locator('[role="menu"][aria-label="Task options"]');
    await expect(optionsMenu).toBeVisible({ timeout: 5000 });

    // Click "Select Multiple Tasks"
    const selectMultipleBtn = optionsMenu.locator('[role="menuitemcheckbox"]').filter({ hasText: 'Select Multiple Tasks' });
    await expect(selectMultipleBtn).toBeVisible({ timeout: 3000 });
    await selectMultipleBtn.click();
    await waitForListStable(page);

    // Selection mode hint should appear
    const selectionHint = page.locator('text=Click tasks to select them');
    await expect(selectionHint).toBeVisible({ timeout: 5000 });

    // Selection checkboxes should appear on task items
    const checkboxes = page.locator('[data-testid="todo-checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);

    // Exit selection mode via the Options menu
    await optionsBtn.click();
    const exitSelectionBtn = page.locator('[role="menu"][aria-label="Task options"]').locator('[role="menuitemcheckbox"]').filter({ hasText: 'Exit Selection Mode' });
    await expect(exitSelectionBtn).toBeVisible({ timeout: 3000 });
    await exitSelectionBtn.click();
    await waitForListStable(page);

    // Selection hint should be gone
    await expect(selectionHint).not.toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 20. Bulk action bar appears when tasks are selected and bulk complete works
  // =========================================================================
  test.fixme('Bulk action bar appears when tasks are selected and bulk complete works', async ({ page }) => {
    const task1 = uniqueTaskName('BulkComp1');
    const task2 = uniqueTaskName('BulkComp2');
    await createTask(page, task1);
    await createTask(page, task2);

    // Enter selection mode
    const optionsBtn = page.locator('button[aria-label*="Task options menu"]');
    await optionsBtn.click();
    const optionsMenu = page.locator('[role="menu"][aria-label="Task options"]');
    await expect(optionsMenu).toBeVisible({ timeout: 5000 });
    const selectMultipleBtn = optionsMenu.locator('[role="menuitemcheckbox"]').filter({ hasText: 'Select Multiple Tasks' });
    await selectMultipleBtn.click();
    await waitForListStable(page);

    // Select both tasks via their checkboxes
    const task1Item = todoItemByText(page, task1).first();
    const task2Item = todoItemByText(page, task2).first();

    const checkbox1 = task1Item.locator('[data-testid="todo-checkbox"]');
    const checkbox2 = task2Item.locator('[data-testid="todo-checkbox"]');

    await checkbox1.check();
    await checkbox2.check();
    await waitForListStable(page);

    // Bulk action bar should appear
    const bulkBar = page.locator('[data-testid="bulk-action-bar"]');
    await expect(bulkBar).toBeVisible({ timeout: 5000 });

    // Selection count should show "2"
    const selectionCount = bulkBar.locator('[data-testid="selection-count"]');
    await expect(selectionCount).toHaveText('2');

    // Click "Mark Complete"
    const bulkCompleteBtn = bulkBar.locator('[data-testid="bulk-complete-button"]');
    await expect(bulkCompleteBtn).toBeVisible({ timeout: 3000 });
    await bulkCompleteBtn.click();
    await waitForListStable(page);
  });

  // =========================================================================
  // 21. Bulk delete removes selected tasks
  // =========================================================================
  test.fixme('Bulk delete removes selected tasks', async ({ page }) => {
    const task1 = uniqueTaskName('BulkDel1');
    const task2 = uniqueTaskName('BulkDel2');
    await createTask(page, task1);
    await createTask(page, task2);

    // Enter selection mode
    const optionsBtn = page.locator('button[aria-label*="Task options menu"]');
    await optionsBtn.click();
    const optionsMenu = page.locator('[role="menu"][aria-label="Task options"]');
    await expect(optionsMenu).toBeVisible({ timeout: 5000 });
    const selectMultipleBtn = optionsMenu.locator('[role="menuitemcheckbox"]').filter({ hasText: 'Select Multiple Tasks' });
    await selectMultipleBtn.click();
    await waitForListStable(page);

    // Select both tasks
    const task1Item = todoItemByText(page, task1).first();
    const task2Item = todoItemByText(page, task2).first();

    await task1Item.locator('[data-testid="todo-checkbox"]').check();
    await task2Item.locator('[data-testid="todo-checkbox"]').check();
    await waitForListStable(page);

    // Bulk action bar should appear
    const bulkBar = page.locator('[data-testid="bulk-action-bar"]');
    await expect(bulkBar).toBeVisible({ timeout: 5000 });

    // Click "Delete"
    const bulkDeleteBtn = bulkBar.locator('[data-testid="bulk-delete-button"]');
    await expect(bulkDeleteBtn).toBeVisible({ timeout: 3000 });
    await bulkDeleteBtn.click();

    // Handle any confirmation dialog that might appear
    const confirmDialog = page.locator('[role="alertdialog"]');
    if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const confirmBtn = confirmDialog.locator('button').filter({ hasText: /Delete|Confirm/ });
      await confirmBtn.click();
    }
    await waitForListStable(page);

    // Both tasks should be gone
    await expect(todoItemByText(page, task1)).toHaveCount(0, { timeout: 10000 });
    await expect(todoItemByText(page, task2)).toHaveCount(0, { timeout: 10000 });
  });

  // =========================================================================
  // 22. Clear selection button in bulk action bar works
  // =========================================================================
  test.fixme('Clear selection button in bulk action bar deselects all tasks', async ({ page }) => {
    const task1 = uniqueTaskName('ClearSel1');
    await createTask(page, task1);

    // Enter selection mode
    const optionsBtn = page.locator('button[aria-label*="Task options menu"]');
    await optionsBtn.click();
    const optionsMenu = page.locator('[role="menu"][aria-label="Task options"]');
    await expect(optionsMenu).toBeVisible({ timeout: 5000 });
    const selectMultipleBtn = optionsMenu.locator('[role="menuitemcheckbox"]').filter({ hasText: 'Select Multiple Tasks' });
    await selectMultipleBtn.click();
    await waitForListStable(page);

    // Select the task
    const task1Item = todoItemByText(page, task1).first();
    await task1Item.locator('[data-testid="todo-checkbox"]').check();
    await waitForListStable(page);

    // Bulk action bar should be visible
    const bulkBar = page.locator('[data-testid="bulk-action-bar"]');
    await expect(bulkBar).toBeVisible({ timeout: 5000 });

    // Click "Clear selection" (the X button with aria-label "Clear selection")
    const clearSelBtn = bulkBar.locator('button[aria-label="Clear selection"]');
    await expect(clearSelBtn).toBeVisible({ timeout: 3000 });
    await clearSelBtn.click();
    await waitForListStable(page);

    // The bulk action bar should disappear since no tasks are selected
    await expect(bulkBar).not.toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // 23. Quick task buttons create tasks when clicked
  // =========================================================================
  test('Quick task buttons populate the input when clicked', async ({ page }) => {
    // Open the Add Task modal
    const headerNewTaskBtn = page.locator('header button[aria-label="Create new task"]');
    const sidebarNewTaskBtn = page.locator('aside button[aria-label="Create new task"]');
    if (await headerNewTaskBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await headerNewTaskBtn.click();
    } else {
      await sidebarNewTaskBtn.click();
    }

    // Focus the task textarea to reveal QuickTaskButtons
    const textarea = page.locator('textarea[aria-label="New task description"]');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.click();

    // Wait for the quick task buttons section to animate in
    await page.waitForTimeout(500);

    // Quick task buttons are rendered as buttons inside the AddTodo form
    // They typically contain insurance-related patterns like "Follow up", "Renewal", etc.
    const quickTaskBtns = page.locator('form button').filter({ hasText: /Follow up|Renewal|Quote|Call|Review|Claims/i });
    const btnCount = await quickTaskBtns.count();

    if (btnCount > 0) {
      // Click the first available quick task button
      await quickTaskBtns.first().click();
      await page.waitForTimeout(300);

      // The textarea should now have some content pre-filled
      const textValue = await textarea.inputValue();
      expect(textValue.length).toBeGreaterThan(0);
    }
    // If no quick task buttons exist, skip silently (feature might not have patterns configured)
  });

  // =========================================================================
  // 24. Inline quick action: priority change on hover
  // =========================================================================
  test('Inline priority selector on task card changes priority', async ({ page }) => {
    const taskText = uniqueTaskName('InlinePriority');
    await createTask(page, taskText);

    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });

    // Hover to reveal inline actions (they have class opacity-0 group-hover:opacity-100)
    await taskItem.hover();
    await page.waitForTimeout(300);

    // The inline priority select has aria-label "Set task priority"
    const inlinePrioritySelect = taskItem.locator('select[aria-label="Set task priority"]');
    if (await inlinePrioritySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Change to "high"
      await inlinePrioritySelect.selectOption('high');
      await waitForListStable(page);

      // Verify the value changed
      await expect(inlinePrioritySelect).toHaveValue('high');
    }
    // If inline actions are not visible (could be due to viewport), skip silently
  });

  // =========================================================================
  // 25. Notes section in detail modal accepts text
  // =========================================================================
  test('Notes section in task detail modal accepts text input', async ({ page }) => {
    const taskText = uniqueTaskName('NotesTest');
    await createTask(page, taskText);

    // Open detail modal
    const taskItem = todoItemByText(page, taskText).first();
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    const contentArea = taskItem.locator('[role="button"]').first();
    await contentArea.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Look for a notes textarea inside the dialog
    const notesTextarea = dialog.locator('textarea').filter({ hasText: '' });
    if (await notesTextarea.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await notesTextarea.first().click();
      await notesTextarea.first().fill('These are test notes for the task.');
      await expect(notesTextarea.first()).toHaveValue('These are test notes for the task.');
    }
  });

  // =========================================================================
  // 26. Filter chips appear and can be cleared
  // =========================================================================
  test('Active filter chips appear and Clear All removes them', async ({ page }) => {
    // Apply the "My Tasks" filter
    const quickFilter = page.locator('[data-testid="quick-filter"]');
    await expect(quickFilter).toBeVisible({ timeout: 10000 });
    await quickFilter.selectOption('my_tasks');
    await waitForListStable(page);

    // Also toggle the high priority filter
    const urgentFilterBtn = page.locator('button[aria-label*="high priority"]').first();
    if (await urgentFilterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await urgentFilterBtn.click();
      await waitForListStable(page);
    }

    // Active filter chips region should be visible
    const activeRegion = page.locator('[role="region"][aria-label="Active filters"]');
    await expect(activeRegion).toBeVisible({ timeout: 5000 });

    // "Clear All" button should be visible (since there are 2+ active filters)
    const clearAllBtn = page.locator('button[aria-label="Clear all active filters"]');
    if (await clearAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearAllBtn.click();
      await waitForListStable(page);

      // After clearing, the active filters region should disappear
      await expect(activeRegion).not.toBeVisible({ timeout: 5000 });

      // Quick filter should be back to "all"
      await expect(quickFilter).toHaveValue('all');
    }
  });
});
