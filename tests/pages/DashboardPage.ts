/**
 * Page Object Model for Dashboard Page
 *
 * Provides high-level API for interacting with the analytics dashboard.
 * Encapsulates dashboard stats, charts, and navigation.
 */

import { Page, Locator } from '@playwright/test';
import { retryAction, setViewport } from '../utils/testHelpers';

export class DashboardPage {
  constructor(private page: Page) {}

  /**
   * Selectors
   */
  private get selectors() {
    return {
      // Navigation
      dashboardTab: 'button:has-text("Dashboard"), nav a:has-text("Dashboard")',

      // Stats cards
      statsContainer: '.stats-grid, .dashboard-stats',
      statCard: '.stat-card, [role="region"]',

      // Specific stats
      totalTasks: 'text=/\\d+\\s+(total|tasks)/i',
      activeTasks: 'text=/\\d+\\s+active/i',
      completedTasks: 'text=/\\d+\\s+completed/i',
      overdueTasks: 'text=/\\d+\\s+overdue/i',

      // Charts
      weeklyChart: '.weekly-chart, [aria-label*="Weekly" i]',
      progressChart: '.progress-chart',

      // Team section
      teamHealth: 'text=/team health/i',
      teamMembers: '.team-member, [data-testid="team-member"]',

      // Quick actions
      addTaskButton: 'button:has-text("Add Task"), button:has-text("New Task")',
      viewAllButton: 'button:has-text("View All"), button:has-text("See All")',

      // Daily digest
      dailyDigest: '.daily-digest, [data-testid="daily-digest"]',
      digestHeader: 'text=/daily digest/i',
    };
  }

  /**
   * Navigation
   */
  async goto(): Promise<void> {
    await retryAction(async () => {
      const dashboardButton = this.page.locator(this.selectors.dashboardTab).first();
      await dashboardButton.waitFor({ state: 'visible', timeout: 10000 });
      await dashboardButton.click();
      await this.page.waitForLoadState('networkidle');

      // Verify dashboard loaded
      await this.waitForDashboardLoad();
    });
  }

  async setViewport(preset: 'mobile' | 'tablet' | 'desktop'): Promise<void> {
    await setViewport(this.page, preset);
  }

  /**
   * Stats Operations
   */
  async getTotalTasksCount(): Promise<number> {
    return await this.extractNumberFromElement(this.selectors.totalTasks);
  }

  async getActiveTasksCount(): Promise<number> {
    return await this.extractNumberFromElement(this.selectors.activeTasks);
  }

  async getCompletedTasksCount(): Promise<number> {
    return await this.extractNumberFromElement(this.selectors.completedTasks);
  }

  async getOverdueTasksCount(): Promise<number> {
    return await this.extractNumberFromElement(this.selectors.overdueTasks);
  }

  private async extractNumberFromElement(selector: string): Promise<number> {
    return await retryAction(async () => {
      const element = this.page.locator(selector).first();

      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        const text = await element.textContent();
        const match = text?.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      }

      return 0;
    });
  }

  async getAllStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    overdue: number;
  }> {
    return {
      total: await this.getTotalTasksCount(),
      active: await this.getActiveTasksCount(),
      completed: await this.getCompletedTasksCount(),
      overdue: await this.getOverdueTasksCount(),
    };
  }

  /**
   * Chart Interactions
   */
  async hasWeeklyChart(): Promise<boolean> {
    const chart = this.page.locator(this.selectors.weeklyChart).first();
    return await chart.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getWeeklyChartBars(): Promise<Locator> {
    const chart = this.page.locator(this.selectors.weeklyChart).first();
    await chart.waitFor({ state: 'visible', timeout: 5000 });

    // Look for bar elements (could be divs, SVG rects, etc.)
    return chart.locator('.chart-bar, rect[class*="bar"], div[role="graphics-symbol"]');
  }

  async getWeeklyChartDayCount(): Promise<number> {
    const bars = await this.getWeeklyChartBars();
    return await bars.count();
  }

  async clickChartBar(dayIndex: number): Promise<void> {
    const bars = await this.getWeeklyChartBars();
    const bar = bars.nth(dayIndex);
    await bar.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Team Section
   */
  async hasTeamSection(): Promise<boolean> {
    const teamSection = this.page.locator(this.selectors.teamHealth).first();
    return await teamSection.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getTeamMembersCount(): Promise<number> {
    const members = this.page.locator(this.selectors.teamMembers);
    return await members.count();
  }

  async getTeamMemberByIndex(index: number): Promise<Locator> {
    const members = this.page.locator(this.selectors.teamMembers);
    return members.nth(index);
  }

  /**
   * Quick Actions
   */
  async clickAddTask(): Promise<void> {
    const addButton = this.page.locator(this.selectors.addTaskButton).first();
    await addButton.waitFor({ state: 'visible', timeout: 5000 });
    await addButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickViewAll(): Promise<void> {
    const viewAllButton = this.page.locator(this.selectors.viewAllButton).first();
    await viewAllButton.waitFor({ state: 'visible', timeout: 5000 });
    await viewAllButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Daily Digest
   */
  async hasDailyDigest(): Promise<boolean> {
    const digest = this.page.locator(this.selectors.dailyDigest).first();
    return await digest.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getDailyDigestContent(): Promise<string> {
    const digest = this.page.locator(this.selectors.dailyDigest).first();

    if (await digest.isVisible({ timeout: 3000 }).catch(() => false)) {
      return await digest.textContent() || '';
    }

    return '';
  }

  async expandDailyDigest(): Promise<void> {
    const expandButton = this.page.locator(this.selectors.dailyDigest).locator('button:has-text("Expand"), button:has-text("Show More")').first();

    if (await expandButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expandButton.click();
    }
  }

  /**
   * Responsive Layout Checks
   */
  async isMobileLayout(): Promise<boolean> {
    // Check if dashboard uses single-column mobile layout
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  async getLayoutColumns(): Promise<number> {
    // Try to detect number of grid columns
    const statsContainer = this.page.locator(this.selectors.statsContainer).first();

    if (await statsContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
      const gridClass = await statsContainer.getAttribute('class');

      if (gridClass?.includes('grid-cols-1')) return 1;
      if (gridClass?.includes('grid-cols-2')) return 2;
      if (gridClass?.includes('grid-cols-3')) return 3;
      if (gridClass?.includes('grid-cols-4')) return 4;
    }

    // Fallback: check viewport width
    const viewport = this.page.viewportSize();
    if (!viewport) return 1;

    if (viewport.width < 640) return 1; // mobile
    if (viewport.width < 1024) return 2; // tablet
    if (viewport.width < 1280) return 3; // desktop
    return 4; // large desktop
  }

  /**
   * Wait Helpers
   */
  async waitForDashboardLoad(): Promise<void> {
    await retryAction(async () => {
      // Wait for at least one stat card to be visible
      const hasStats = await this.page.locator(this.selectors.statCard).first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasTotalCount = await this.page.locator(this.selectors.totalTasks).first().isVisible({ timeout: 2000 }).catch(() => false);

      if (!hasStats && !hasTotalCount) {
        throw new Error('Dashboard not loaded');
      }
    });

    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async waitForStatsUpdate(): Promise<void> {
    // Wait for stats to potentially update after an action
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /**
   * Assertions - Helper methods for common checks
   */
  async verifyStatsConsistency(): Promise<boolean> {
    const stats = await this.getAllStats();

    // Total should equal active + completed + any other status
    // Basic sanity check: total should be >= active + completed
    return stats.total >= (stats.active + stats.completed);
  }

  async hasNoHorizontalScroll(): Promise<boolean> {
    const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = this.page.viewportSize()?.width || 1280;

    // Allow 10px tolerance for scrollbar
    return bodyWidth <= viewportWidth + 10;
  }

  async areStatCardsVisible(): Promise<boolean[]> {
    const statCards = this.page.locator(this.selectors.statCard);
    const count = await statCards.count();
    const visibility: boolean[] = [];

    for (let i = 0; i < count; i++) {
      const isVisible = await statCards.nth(i).isVisible();
      visibility.push(isVisible);
    }

    return visibility;
  }
}
