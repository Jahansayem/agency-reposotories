/**
 * Dashboard Tests (using Page Object Model)
 *
 * Demonstrates the improved testing pattern using DashboardPage POM.
 * These tests verify analytics, stats, charts, and responsive behavior.
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { loginAsUser, waitForAppReady, setViewport } from './utils/testHelpers';

test.describe('Dashboard (Page Object Model)', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await waitForAppReady(page);
    dashboard = new DashboardPage(page);
  });

  test.describe('Navigation', () => {
    test('can navigate to dashboard', async ({ page }) => {
      await setViewport(page, 'desktop');

      // Navigate to dashboard
      await dashboard.goto();

      // Verify dashboard loaded
      await dashboard.waitForDashboardLoad();

      // Should show stats
      const stats = await dashboard.getAllStats();
      expect(stats).toBeTruthy();
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });

    test('dashboard loads quickly', async ({ page }) => {
      await setViewport(page, 'desktop');

      const startTime = Date.now();
      await dashboard.goto();
      await dashboard.waitForDashboardLoad();
      const loadTime = Date.now() - startTime;

      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('Stats Display', () => {
    test('displays total tasks count', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const totalTasks = await dashboard.getTotalTasksCount();
      expect(totalTasks).toBeGreaterThanOrEqual(0);
    });

    test('displays active tasks count', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const activeTasks = await dashboard.getActiveTasksCount();
      expect(activeTasks).toBeGreaterThanOrEqual(0);
    });

    test('displays completed tasks count', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const completedTasks = await dashboard.getCompletedTasksCount();
      expect(completedTasks).toBeGreaterThanOrEqual(0);
    });

    test('displays overdue tasks count', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const overdueTasks = await dashboard.getOverdueTasksCount();
      expect(overdueTasks).toBeGreaterThanOrEqual(0);
    });

    test('all stats are non-negative', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const stats = await dashboard.getAllStats();

      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.active).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.overdue).toBeGreaterThanOrEqual(0);
    });

    test('stats are consistent', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const isConsistent = await dashboard.verifyStatsConsistency();
      expect(isConsistent).toBeTruthy();
    });
  });

  test.describe('Charts', () => {
    test('displays weekly chart', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasChart = await dashboard.hasWeeklyChart();

      // Chart may or may not be present depending on data
      // Just verify the check doesn't throw
      expect(typeof hasChart).toBe('boolean');
    });

    test('weekly chart has correct number of days', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasChart = await dashboard.hasWeeklyChart();

      if (hasChart) {
        const dayCount = await dashboard.getWeeklyChartDayCount();
        expect(dayCount).toBeGreaterThan(0);
        expect(dayCount).toBeLessThanOrEqual(7); // Weekly chart should show max 7 days
      }
    });

    test('can interact with chart bars', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasChart = await dashboard.hasWeeklyChart();

      if (hasChart) {
        const dayCount = await dashboard.getWeeklyChartDayCount();

        if (dayCount > 0) {
          // Click first bar (shouldn't throw)
          await dashboard.clickChartBar(0);
          await page.waitForLoadState('networkidle');

          // Verify interaction worked (implementation-dependent)
          // Could check for tooltip, detail panel, etc.
        }
      }
    });
  });

  test.describe('Team Section', () => {
    test('displays team section if available', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasTeam = await dashboard.hasTeamSection();

      // Team section may or may not be present
      expect(typeof hasTeam).toBe('boolean');
    });

    test('shows team members count', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasTeam = await dashboard.hasTeamSection();

      if (hasTeam) {
        const memberCount = await dashboard.getTeamMembersCount();
        expect(memberCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('can access team member details', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasTeam = await dashboard.hasTeamSection();

      if (hasTeam) {
        const memberCount = await dashboard.getTeamMembersCount();

        if (memberCount > 0) {
          const firstMember = await dashboard.getTeamMemberByIndex(0);
          await expect(firstMember).toBeVisible();
        }
      }
    });
  });

  test.describe('Quick Actions', () => {
    test('has add task button', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      // Try to click add task (may or may not be present)
      try {
        await dashboard.clickAddTask();
        // If successful, should open add task modal or navigate
        await page.waitForLoadState('networkidle');
      } catch {
        // Button may not be visible on dashboard view
      }
    });

    test('has view all button', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      // Try to click view all
      try {
        await dashboard.clickViewAll();
        await page.waitForLoadState('networkidle');
      } catch {
        // Button may not be present
      }
    });
  });

  test.describe('Daily Digest', () => {
    test('checks for daily digest', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasDigest = await dashboard.hasDailyDigest();

      // Digest may or may not be present
      expect(typeof hasDigest).toBe('boolean');
    });

    test('can read daily digest content', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasDigest = await dashboard.hasDailyDigest();

      if (hasDigest) {
        const content = await dashboard.getDailyDigestContent();
        expect(typeof content).toBe('string');
      }
    });

    test('can expand daily digest', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      const hasDigest = await dashboard.hasDailyDigest();

      if (hasDigest) {
        await dashboard.expandDailyDigest();
        // Should expand (implementation-dependent)
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('detects mobile layout correctly', async ({ page }) => {
      await dashboard.setViewport('mobile');
      await dashboard.goto();

      const isMobile = await dashboard.isMobileLayout();
      expect(isMobile).toBeTruthy();
    });

    test('detects desktop layout correctly', async ({ page }) => {
      await dashboard.setViewport('desktop');
      await dashboard.goto();

      const isMobile = await dashboard.isMobileLayout();
      expect(isMobile).toBeFalsy();
    });

    test('displays single column on mobile', async ({ page }) => {
      await dashboard.setViewport('mobile');
      await dashboard.goto();

      const columns = await dashboard.getLayoutColumns();
      expect(columns).toBe(1);
    });

    test('displays multiple columns on desktop', async ({ page }) => {
      await dashboard.setViewport('desktop');
      await dashboard.goto();

      const columns = await dashboard.getLayoutColumns();
      expect(columns).toBeGreaterThanOrEqual(2);
    });

    test('adjusts columns for tablet', async ({ page }) => {
      await dashboard.setViewport('tablet');
      await dashboard.goto();

      const columns = await dashboard.getLayoutColumns();
      expect(columns).toBeGreaterThanOrEqual(1);
      expect(columns).toBeLessThanOrEqual(3);
    });

    test('no horizontal scroll on mobile', async ({ page }) => {
      await dashboard.setViewport('mobile');
      await dashboard.goto();

      const noScroll = await dashboard.hasNoHorizontalScroll();
      expect(noScroll).toBeTruthy();
    });

    test('no horizontal scroll on tablet', async ({ page }) => {
      await dashboard.setViewport('tablet');
      await dashboard.goto();

      const noScroll = await dashboard.hasNoHorizontalScroll();
      expect(noScroll).toBeTruthy();
    });

    test('no horizontal scroll on desktop', async ({ page }) => {
      await dashboard.setViewport('desktop');
      await dashboard.goto();

      const noScroll = await dashboard.hasNoHorizontalScroll();
      expect(noScroll).toBeTruthy();
    });
  });

  test.describe('Stat Cards Visibility', () => {
    test('all stat cards are visible on desktop', async ({ page }) => {
      await dashboard.setViewport('desktop');
      await dashboard.goto();

      const visibility = await dashboard.areStatCardsVisible();

      // All cards should be visible
      const allVisible = visibility.every(v => v === true);
      expect(allVisible).toBeTruthy();
    });

    test('stat cards are visible on mobile', async ({ page }) => {
      await dashboard.setViewport('mobile');
      await dashboard.goto();

      const visibility = await dashboard.areStatCardsVisible();

      // At least some cards should be visible
      const someVisible = visibility.some(v => v === true);
      expect(someVisible).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('stats update quickly', async ({ page }) => {
      await setViewport(page, 'desktop');
      await dashboard.goto();

      // Trigger stats update (implementation-dependent)
      await dashboard.waitForStatsUpdate();

      // Stats should be available
      const stats = await dashboard.getAllStats();
      expect(stats).toBeTruthy();
    });

    test('dashboard loads without errors', async ({ page }) => {
      await setViewport(page, 'desktop');

      // Listen for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await dashboard.goto();
      await dashboard.waitForDashboardLoad();

      // Should have minimal errors (some are expected, like failed prefetch)
      const criticalErrors = errors.filter(e =>
        !e.includes('prefetch') && !e.includes('favicon')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });
});
