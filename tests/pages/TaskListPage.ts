/**
 * Page Object Model for Task List Page
 *
 * Provides high-level API for interacting with the task list view.
 * Encapsulates selectors and common operations.
 */

import { Page, Locator } from '@playwright/test';
import { setViewport, retryAction } from '../utils/testHelpers';

export class TaskListPage {
  constructor(private page: Page) {}

  /**
   * Selectors - Centralized for easy maintenance
   */
  private get selectors() {
    return {
      // Task items
      taskItem: '[data-testid="todo-item"]',
      taskCheckbox: '[data-testid="todo-checkbox"]',
      taskText: '[data-testid="todo-text"]',

      // Add task
      addTaskButton: 'button:has-text("Add Task")',
      addTaskInput: 'input[placeholder*="task" i], input[placeholder*="todo" i]',
      addTaskSubmit: 'button:has-text("Add"), button[type="submit"]',

      // Views
      listView: '[data-view="list"], .task-list',
      boardView: '[data-view="board"], .kanban-board',
      tableView: '[data-view="table"], table',

      // View toggles
      viewToggle: 'button:has-text("List"), button:has-text("Board"), button:has-text("Table")',
      listViewButton: 'button:has-text("List")',
      boardViewButton: 'button:has-text("Board")',
      tableViewButton: 'button:has-text("Table")',

      // Filters
      searchInput: 'input[type="search"], input[placeholder*="Search" i]',
      filterButton: 'button:has-text("Filter")',

      // Stats
      taskCount: 'text=/\\d+\\s+(active|tasks|total)/i, [data-testid="task-count"]',
    };
  }

  /**
   * Navigation
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async setView(view: 'list' | 'board' | 'table') {
    const buttonMap = {
      list: this.selectors.listViewButton,
      board: this.selectors.boardViewButton,
      table: this.selectors.tableViewButton,
    };

    await retryAction(async () => {
      const button = this.page.locator(buttonMap[view]).first();
      await button.waitFor({ state: 'visible', timeout: 5000 });
      await button.click();
      await this.page.waitForLoadState('networkidle');
    });
  }

  async setViewport(preset: 'mobile' | 'tablet' | 'desktop') {
    await setViewport(this.page, preset);
  }

  /**
   * Task Operations
   */
  async getTasks(): Promise<Locator> {
    return this.page.locator(this.selectors.taskItem);
  }

  async getTaskCount(): Promise<number> {
    const tasks = await this.getTasks();
    return await tasks.count();
  }

  async getTaskByIndex(index: number): Promise<Locator> {
    const tasks = await this.getTasks();
    return tasks.nth(index);
  }

  async getTaskByText(text: string): Promise<Locator> {
    return this.page.locator(this.selectors.taskItem).filter({ hasText: text }).first();
  }

  async addTask(text: string): Promise<void> {
    await retryAction(async () => {
      // Find add task button
      const addButton = this.page.locator(this.selectors.addTaskButton).first();

      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addButton.click();
        await this.page.waitForLoadState('networkidle');
      }

      // Find input
      const input = this.page.locator(this.selectors.addTaskInput).first();
      await input.waitFor({ state: 'visible', timeout: 5000 });
      await input.fill(text);
      await input.press('Enter');

      // Wait for task to appear
      await this.page.waitForLoadState('networkidle');
    });
  }

  async completeTask(index: number): Promise<void> {
    await retryAction(async () => {
      const task = await this.getTaskByIndex(index);
      const checkbox = task.locator('input[type="checkbox"], button[role="checkbox"]').first();
      await checkbox.waitFor({ state: 'visible', timeout: 5000 });
      await checkbox.click();
      await this.page.waitForLoadState('networkidle');
    });
  }

  async completeTaskByText(text: string): Promise<void> {
    await retryAction(async () => {
      const task = await this.getTaskByText(text);
      const checkbox = task.locator('input[type="checkbox"], button[role="checkbox"]').first();
      await checkbox.waitFor({ state: 'visible', timeout: 5000 });
      await checkbox.click();
      await this.page.waitForLoadState('networkidle');
    });
  }

  async deleteTask(index: number): Promise<void> {
    await retryAction(async () => {
      const task = await this.getTaskByIndex(index);
      const deleteButton = task.locator('button[aria-label*="Delete" i], button:has-text("Delete")').first();

      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
      } else {
        // Try opening context menu or overflow menu
        const moreButton = task.locator('button[aria-label*="More" i], button:has-text("⋮")').first();
        if (await moreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await moreButton.click();

          const deleteOption = this.page.locator('button:has-text("Delete")').first();
          await deleteOption.waitFor({ state: 'visible', timeout: 3000 });
          await deleteOption.click();
        }
      }
    });
  }

  async openTaskDetail(index: number): Promise<void> {
    await retryAction(async () => {
      const task = await this.getTaskByIndex(index);
      await task.click();
      await this.page.waitForLoadState('networkidle');

      // Verify modal/detail panel opened
      const modal = this.page.locator('[role="dialog"], .detail-panel, .task-detail').first();
      await modal.waitFor({ state: 'visible', timeout: 5000 });
    });
  }

  /**
   * Search & Filter
   */
  async search(query: string): Promise<void> {
    const searchInput = this.page.locator(this.selectors.searchInput).first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(query);
    // Wait for search debounce (500ms) to complete
    await this.page.waitForTimeout(500);
  }

  async clearSearch(): Promise<void> {
    const searchInput = this.page.locator(this.selectors.searchInput).first();
    await searchInput.fill('');
    // Wait for search debounce to clear
    await this.page.waitForTimeout(500);
  }

  /**
   * Bulk Operations
   */
  async selectTasks(indices: number[]): Promise<void> {
    for (const index of indices) {
      const task = await this.getTaskByIndex(index);
      const selectionCheckbox = task.locator(this.selectors.taskCheckbox).first();

      if (await selectionCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selectionCheckbox.check();
      }
    }
  }

  async bulkComplete(): Promise<void> {
    const bulkCompleteButton = this.page.locator('button:has-text("Complete Selected"), button:has-text("Mark Complete")').first();
    await bulkCompleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await bulkCompleteButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async bulkDelete(): Promise<void> {
    const bulkDeleteButton = this.page.locator('button:has-text("Delete Selected")').first();
    await bulkDeleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await bulkDeleteButton.click();
    await this.page.waitForLoadState('networkidle');

    // Confirm if dialog appears
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  /**
   * Assertions - Helper methods for common checks
   */
  async hasTask(text: string): Promise<boolean> {
    const task = this.page.locator(this.selectors.taskItem).filter({ hasText: text });
    return await task.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isTaskCompleted(index: number): Promise<boolean> {
    const task = await this.getTaskByIndex(index);
    const completedClass = await task.getAttribute('class');
    return completedClass?.includes('completed') || false;
  }

  async getVisibleTaskTexts(): Promise<string[]> {
    const tasks = await this.getTasks();
    const count = await tasks.count();
    const texts: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await tasks.nth(i).textContent();
      if (text) texts.push(text.trim());
    }

    return texts;
  }

  /**
   * Wait helpers
   */
  async waitForTasksToLoad(): Promise<void> {
    await retryAction(async () => {
      // Wait for either tasks or empty state
      const hasTasks = await this.page.locator(this.selectors.taskItem).first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasEmptyState = await this.page.locator('text=/no tasks/i, text=/empty/i').first().isVisible({ timeout: 1000 }).catch(() => false);

      if (!hasTasks && !hasEmptyState) {
        throw new Error('Tasks not loaded');
      }
    });
  }

  async waitForViewChange(targetView: 'list' | 'board' | 'table'): Promise<void> {
    const viewSelectors = {
      list: this.selectors.listView,
      board: this.selectors.boardView,
      table: this.selectors.tableView,
    };

    await this.page.locator(viewSelectors[targetView]).first().waitFor({
      state: 'visible',
      timeout: 10000
    });

    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
}
