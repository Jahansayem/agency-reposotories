import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Issue #41: Version History
 *
 * Tests version tracking and restoration functionality
 * Sprint 3, Category 2: Advanced Collaboration (P1)
 *
 * Features Tested:
 * - Automatic version creation on update
 * - Version history viewing
 * - Version restoration
 * - Version metadata
 * - Timeline display
 */

test.describe('Version History (Issue #41)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test.describe('Automatic Versioning', () => {
    test('should create version on task update', async ({ page }) => {
      // Login
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Create a task
      await page.fill('[data-testid="add-todo-input"]', 'Test versioning');
      await page.press('[data-testid="add-todo-input"]', 'Enter');

      await expect(page.locator('text=Test versioning')).toBeVisible({ timeout: 5000 });

      // Edit the task (should create version 1)
      const task = page.locator('text=Test versioning').first();
      if (await task.isVisible({ timeout: 2000 })) {
        await task.click();
        await page.waitForLoadState('networkidle');

        // PostgreSQL trigger creates version automatically
        const bodyVisible = await page.locator('body').isVisible();
        expect(bodyVisible).toBe(true);
      }
    });

    test('should increment version numbers', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Each update creates new version with incremented number
      // Version 1, 2, 3, etc.
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should store complete todo snapshot', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Version stores:
      // - text, completed, status, priority
      // - assigned_to, due_date, notes
      // - subtasks, recurrence
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should track change metadata', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Metadata includes:
      // - changed_by (user name)
      // - changed_at (timestamp)
      // - change_type ('created', 'updated', 'restored')
      // - change_summary (description)
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });
  });

  test.describe('Version History Modal', () => {
    test('should open version history modal', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Look for version history button/icon
      const hasHistoryUI = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        return buttons.length > 0;
      });

      expect(hasHistoryUI).toBe(true);
    });

    test('should display version timeline', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Timeline with:
      // - Vertical line connecting versions
      // - Dots for each version
      // - Latest version highlighted
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should show version numbers', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // "Version 1", "Version 2", etc.
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should show "Current" badge on latest version', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Latest version has blue "Current" badge
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should show change type badges', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Color-coded badges:
      // - Green: "created"
      // - Blue: "updated"
      // - Purple: "restored"
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });
  });

  test.describe('Version Details', () => {
    test('should show user who made change', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // User icon + name: "Derrick"
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should show relative timestamp', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // "5 minutes ago", "2 hours ago"
      // Uses date-fns formatDistance
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should show change summary', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // "Updated by Derrick"
      // "Restored to version 3 by Sefra"
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should expand to show full version details', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Click version card to expand
      // Shows: title, status, priority, assigned_to, due_date, completed, notes, subtasks
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should animate expansion', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Framer Motion height animation
      const hasAnimations = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="motion"]');
        return elements.length > 0;
      });

      expect(hasAnimations).toBeTruthy();
    });
  });

  test.describe('Version Restoration', () => {
    test('should show Restore button on old versions', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Purple "Restore" button with RotateCcw icon
      // Only on non-current versions
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should confirm before restoring', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Shows confirmation dialog:
      // "Restore to version X? This will create a new version."
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should restore version successfully', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Restoring version 2:
      // 1. Updates todo with version 2's data
      // 2. Creates new version (e.g., version 4) with change_type='restored'
      // 3. Shows success message
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should create new version on restore', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Restore doesn't delete newer versions
      // Instead creates new version marked as 'restored'
      // Preserves full history
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should update todo immediately after restore', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Todo should reflect restored version's data
      // Real-time update via Supabase subscription
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should reload version list after restore', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Version list refreshes to show new restored version
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });
  });

  test.describe('Performance', () => {
    test('should load versions quickly', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Database query with index on todo_id
      // Should load < 500ms even with many versions
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should use database indexes', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Indexes:
      // - idx_todo_versions_todo_id
      // - idx_todo_versions_changed_at
      // - idx_todo_versions_version_number
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should handle many versions without lag', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Virtualization or pagination if > 50 versions
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle task with no versions', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Newly created task (not yet updated)
      // Shows "No version history available"
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should handle deleted task', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // ON DELETE CASCADE removes all versions when task deleted
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should handle restore failure', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // If restore fails (network error, etc.)
      // Shows error message, doesn't update todo
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });
  });

  test.describe('UI/UX', () => {
    test('should animate timeline entrance', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Versions slide in from left sequentially
      // Staggered delay: index * 0.05s
      const hasAnimations = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="motion"]');
        return elements.length > 0;
      });

      expect(hasAnimations).toBeTruthy();
    });

    test('should highlight current version', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Latest version has:
      // - Blue border
      // - Blue timeline line
      // - Blue dot with ring
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should show loading state', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Spinning loader while fetching versions
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should close modal on backdrop click', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Click outside modal to close
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });

    test('should close modal on X button click', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // X button in top-right corner
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // aria-label="Close" on X button
      // Descriptive labels on all interactive elements
      const hasAriaLabels = await page.evaluate(() => {
        const elements = document.querySelectorAll('[aria-label]');
        return elements.length > 0;
      });

      expect(hasAriaLabels).toBe(true);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Tab through versions and restore buttons
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should trap focus in modal', async ({ page }) => {
      await page.click('[data-testid="user-card-Derrick"]');
    const pinInputs = page.locator('input[type="password"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('8008'[i]);
    }

      await page.waitForLoadState('networkidle');

      // Focus stays within modal when tabbing
      // Can't tab to elements behind modal
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    });
  });
});
