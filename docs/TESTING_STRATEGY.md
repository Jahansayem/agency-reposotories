# Comprehensive Testing Strategy
## Wavezly Todo List - Full Test Coverage Plan

**Created:** January 31, 2026
**Target Coverage:** 80%+ (currently ~40%)
**Testing Framework:** Playwright (E2E) + Vitest (Unit) + Axe-core (Accessibility)

---

## Table of Contents

1. [Testing Pyramid](#testing-pyramid)
2. [E2E Testing with Playwright](#e2e-testing-with-playwright)
3. [Unit Testing with Vitest](#unit-testing-with-vitest)
4. [Accessibility Testing](#accessibility-testing)
5. [Visual Regression Testing](#visual-regression-testing)
6. [Performance Testing](#performance-testing)
7. [CI/CD Integration](#cicd-integration)
8. [Test Data Management](#test-data-management)

---

## Testing Pyramid

```
        /\
       /  \        10% E2E Tests (Playwright)
      /____\       - Critical user journeys
     /      \      - Cross-browser compatibility
    /        \
   /__________\    30% Integration Tests (Vitest + Testing Library)
  /            \   - Component interactions
 /              \  - API integrations
/________________\ 60% Unit Tests (Vitest)
                   - Pure functions
                   - Utilities
                   - Hooks
```

**Target Distribution:**
- **Unit Tests:** 200+ tests
- **Integration Tests:** 100+ tests
- **E2E Tests:** 50+ tests
- **Total:** 350+ automated tests

---

## E2E Testing with Playwright

### Test Structure

```
tests/
├── e2e/
│   ├── authentication/
│   │   ├── registration.spec.ts
│   │   ├── login.spec.ts
│   │   ├── user-switching.spec.ts
│   │   └── lockout.spec.ts
│   ├── task-management/
│   │   ├── task-creation.spec.ts
│   │   ├── task-editing.spec.ts
│   │   ├── task-completion.spec.ts
│   │   ├── task-deletion.spec.ts
│   │   ├── kanban.spec.ts
│   │   └── bulk-operations.spec.ts
│   ├── chat/
│   │   ├── messaging.spec.ts
│   │   ├── reactions.spec.ts
│   │   ├── threading.spec.ts
│   │   └── chat-delete.spec.ts
│   ├── dashboard/
│   │   ├── dashboard-metrics.spec.ts
│   │   ├── daily-digest.spec.ts
│   │   └── responsive-dashboard.spec.ts
│   ├── ai-features/
│   │   ├── smart-parse.spec.ts
│   │   ├── email-generation.spec.ts
│   │   └── duplicate-detection.spec.ts
│   └── accessibility/
│       ├── keyboard-navigation.spec.ts
│       ├── screen-reader.spec.ts
│       └── color-contrast.spec.ts
```

### Playwright Configuration

**File:** `playwright.config.ts` (ENHANCED)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3004',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3004',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Critical User Journeys

**File:** `tests/e2e/critical-paths.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test('Complete task lifecycle - from creation to completion', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('text=Good morning')).toBeVisible();

    // 2. Create task
    await page.fill('[data-testid="task-input"]', 'Critical path test task');
    await page.selectOption('[data-testid="priority-select"]', 'high');
    await page.click('[data-testid="add-task-button"]');
    await expect(page.locator('text=Critical path test task')).toBeVisible();

    // 3. Edit task
    await page.click('text=Critical path test task');
    await page.fill('[data-testid="task-notes-input"]', 'Added notes via edit');
    await page.click('[data-testid="save-task-button"]');

    // 4. Add subtask
    await page.click('[data-testid="add-subtask-button"]');
    await page.fill('[data-testid="subtask-input"]', 'Subtask 1');
    await page.click('[data-testid="create-subtask-button"]');

    // 5. Complete subtask
    await page.click('[data-testid="subtask-checkbox"]:has-text("Subtask 1")');
    await expect(page.locator('[data-testid="subtask-1"]')).toHaveClass(/completed/);

    // 6. Complete main task
    await page.click('[data-testid="task-checkbox"]:has-text("Critical path test task")');

    // 7. Verify celebration
    await expect(page.locator('[data-testid="celebration-modal"]')).toBeVisible();

    // 8. Check archive
    await page.click('button:has-text("Archive")');
    await expect(page.locator('text=Critical path test task')).toBeVisible();
  });

  test('AI-powered task creation flow', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');

    // Use smart parse
    await page.fill('[data-testid="task-input"]',
      'Call John about his auto policy renewal by Friday. Need to review coverage, calculate premium, and prepare quote.'
    );
    await page.keyboard.press('Meta+Enter'); // Cmd+Enter

    // Wait for AI parsing
    await expect(page.locator('[data-testid="smart-parse-modal"]')).toBeVisible();

    // Verify AI extracted data
    await expect(page.locator('[data-testid="parsed-title"]')).toContainText('Call John');
    await expect(page.locator('[data-testid="parsed-priority"]')).toContainText('high');
    await expect(page.locator('[data-testid="subtask-list"]')).toContainText('Review coverage');

    // Create from AI suggestions
    await page.click('[data-testid="create-from-ai-button"]');

    // Verify task created
    await expect(page.locator('text=Call John')).toBeVisible();
  });

  test('Collaboration flow - chat, assign, complete', async ({ browser }) => {
    // Create two contexts for two users
    const derrickContext = await browser.newContext();
    const sefraContext = await browser.newContext();

    const derrickPage = await derrickContext.newPage();
    const sefraPage = await sefraContext.newPage();

    // Login as Derrick
    await derrickPage.goto('/');
    await derrickPage.click('[data-testid="user-card-Derrick"]');
    await derrickPage.fill('[data-testid="pin-input"]', '8008');
    await derrickPage.click('[data-testid="login-button"]');

    // Login as Sefra
    await sefraPage.goto('/');
    await sefraPage.click('[data-testid="user-card-Sefra"]');
    await sefraPage.fill('[data-testid="pin-input"]', '1234'); // Assuming Sefra's PIN
    await sefraPage.click('[data-testid="login-button"]');

    // Derrick creates task and assigns to Sefra
    await derrickPage.fill('[data-testid="task-input"]', 'Collaboration test task');
    await derrickPage.selectOption('[data-testid="assign-to-select"]', 'Sefra');
    await derrickPage.click('[data-testid="add-task-button"]');

    // Verify Sefra sees the task in real-time
    await expect(sefraPage.locator('text=Collaboration test task')).toBeVisible({ timeout: 3000 });

    // Sefra sends chat message about the task
    await sefraPage.click('button:has-text("Chat")');
    await sefraPage.fill('[data-testid="chat-input"]', '@Derrick I\'ll work on this now');
    await sefraPage.click('[data-testid="send-button"]');

    // Derrick sees the message
    await derrickPage.click('button:has-text("Chat")');
    await expect(derrickPage.locator('text=I\'ll work on this now')).toBeVisible({ timeout: 3000 });

    // Derrick reacts to message
    await derrickPage.hover('text=I\'ll work on this now');
    await derrickPage.click('[aria-label="Add reaction"]');
    await derrickPage.click('[data-testid="reaction-thumbsup"]');

    // Sefra sees the reaction
    await expect(sefraPage.locator('text=I\'ll work on this now').locator('..').locator('text=👍')).toBeVisible();

    // Sefra completes the task
    await sefraPage.click('button:has-text("Tasks")');
    await sefraPage.click('[data-testid="task-checkbox"]:has-text("Collaboration test task")');

    // Derrick sees completion in real-time
    await derrickPage.click('button:has-text("Tasks")');
    await expect(derrickPage.locator('[data-testid="task-item"]:has-text("Collaboration test task")')).toHaveClass(/completed/, { timeout: 3000 });

    await derrickContext.close();
    await sefraContext.close();
  });
});
```

### Cross-Browser Testing

**File:** `tests/e2e/cross-browser.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

// This test runs on all configured projects
test.describe('Cross-Browser Compatibility', () => {
  test('app loads and is interactive', async ({ page, browserName }) => {
    await page.goto('/');

    // Should show login screen
    await expect(page.locator('[data-testid="user-card-Derrick"]')).toBeVisible();

    // Login
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');

    // Should load main app
    await expect(page.locator('text=Good morning')).toBeVisible();

    // Test real-time subscription works
    await page.fill('[data-testid="task-input"]', `Test task ${browserName}`);
    await page.click('[data-testid="add-task-button"]');
    await expect(page.locator(`text=Test task ${browserName}`)).toBeVisible();

    // Test theme toggle
    await page.click('[data-testid="theme-toggle"]');
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');

    // Toggle back
    await page.click('[data-testid="theme-toggle"]');
    const darkClass = await page.locator('html').getAttribute('class');
    expect(darkClass).toContain('dark');
  });

  test('WebKit-specific: ThemeProvider renders correctly', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'WebKit-specific test');

    await page.goto('/');

    // Verify page is not blank (WebKit bug check)
    const isBlank = await page.evaluate(() => {
      return document.body.textContent?.trim() === '';
    });
    expect(isBlank).toBe(false);

    // Verify ThemeProvider is working
    await expect(page.locator('[data-testid="user-card-Derrick"]')).toBeVisible();
  });

  test('Edge-specific: nullish coalescing works', async ({ page, browserName }) => {
    test.skip(browserName !== 'msedge', 'Edge-specific test');

    await page.goto('/');

    // Test modern JS features
    const supportsModernJS = await page.evaluate(() => {
      const obj = { a: { b: 'works' } };
      const optionalChaining = obj?.a?.b;
      const nullishCoalescing = null ?? 'works';
      return optionalChaining === 'works' && nullishCoalescing === 'works';
    });

    expect(supportsModernJS).toBe(true);
  });
});
```

---

## Unit Testing with Vitest

### Configuration

**File:** `vitest.config.ts` (ENHANCED)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'dist/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup

**File:** `tests/setup.ts` (NEW)

```typescript
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;
```

### Utility Tests

**File:** `tests/unit/lib/utils.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { hashPin, formatDate, calculateStreak } from '@/lib/utils';

describe('hashPin', () => {
  it('should hash 4-digit PIN to SHA-256', async () => {
    const hash = await hashPin('1234');
    expect(hash).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
  });

  it('should produce consistent hashes', async () => {
    const hash1 = await hashPin('8008');
    const hash2 = await hashPin('8008');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different PINs', async () => {
    const hash1 = await hashPin('1234');
    const hash2 = await hashPin('5678');
    expect(hash1).not.toBe(hash2);
  });
});

describe('formatDate', () => {
  it('should format date as relative time', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    expect(formatDate(yesterday.toISOString())).toBe('1 day ago');
  });

  it('should show "today" for current day', () => {
    const now = new Date();
    expect(formatDate(now.toISOString())).toContain('today');
  });
});

describe('calculateStreak', () => {
  it('should return 0 for no streak', () => {
    expect(calculateStreak(null, 0)).toBe(0);
  });

  it('should continue streak for consecutive days', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(calculateStreak(yesterday.toISOString(), 5)).toBe(6);
  });

  it('should reset streak if gap > 1 day', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    expect(calculateStreak(threeDaysAgo.toISOString(), 5)).toBe(1);
  });
});
```

### Hook Tests

**File:** `tests/unit/hooks/useTodoData.test.ts` (NEW)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTodoData } from '@/hooks/useTodoData';

describe('useTodoData', () => {
  it('should fetch todos on mount', async () => {
    const { result } = renderHook(() => useTodoData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.todos).toBeDefined();
  });

  it('should subscribe to real-time updates', async () => {
    const { result } = renderHook(() => useTodoData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify subscription was called
    expect(vi.mocked(supabase.channel)).toHaveBeenCalled();
  });
});
```

### Component Tests

**File:** `tests/unit/components/TodoItem.test.tsx` (NEW)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TodoItem from '@/components/TodoItem';
import type { Todo } from '@/types/todo';

const mockTodo: Todo = {
  id: '123',
  text: 'Test task',
  completed: false,
  status: 'todo',
  priority: 'medium',
  created_at: new Date().toISOString(),
  created_by: 'Test User',
  updated_at: new Date().toISOString(),
};

describe('TodoItem', () => {
  it('should render task text', () => {
    render(<TodoItem todo={mockTodo} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('should call onComplete when checkbox clicked', () => {
    const onComplete = vi.fn();
    render(<TodoItem todo={mockTodo} onComplete={onComplete} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onComplete).toHaveBeenCalledWith('123');
  });

  it('should show priority badge', () => {
    render(<TodoItem todo={{ ...mockTodo, priority: 'urgent' }} />);
    expect(screen.getByText('URGENT')).toBeInTheDocument();
  });

  it('should show overdue indicator when past due', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    render(<TodoItem todo={{ ...mockTodo, due_date: yesterday.toISOString() }} />);
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });
});
```

---

## Accessibility Testing

### Axe-core Integration

**File:** `tests/accessibility/axe.test.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('login screen should not have accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('main app should not have accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('chat panel should be accessible', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');
    await page.click('button:has-text("Chat")');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### Keyboard Navigation Tests

Already covered in Sprint 1, but enhanced:

**File:** `tests/accessibility/keyboard-nav-complete.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete Keyboard Navigation', () => {
  test('should navigate entire app with keyboard only', async ({ page }) => {
    await page.goto('/');

    // Tab through login screen
    await page.keyboard.press('Tab'); // First user
    await page.keyboard.press('Tab'); // Second user
    await page.keyboard.press('Shift+Tab'); // Back to first
    await page.keyboard.press('Enter'); // Select user

    // Type PIN
    await page.keyboard.type('8008');
    await page.keyboard.press('Enter');

    // Navigate main app
    await page.keyboard.press('Tab'); // Sidebar
    await page.keyboard.press('Tab'); // First navigation item
    await page.keyboard.press('Enter'); // Open dashboard

    // All should work without mouse
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show visible focus indicators', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el!);
      return {
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
      };
    });

    // Should have visible focus ring
    expect(focusedElement.outlineWidth).not.toBe('0px');
    expect(focusedElement.outlineStyle).not.toBe('none');
  });

  test('should support Escape key to close modals', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');

    // Open a modal
    await page.click('[data-testid="add-task-button"]');

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible();
  });
});
```

---

## Visual Regression Testing

**File:** `tests/visual/snapshots.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('login screen matches snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('login-screen.png');
  });

  test('dashboard matches snapshot in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');
    await page.click('button:has-text("Dashboard")');

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="realtime-indicator"]')], // Mask dynamic elements
    });
  });

  test('dashboard matches snapshot in light mode', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="user-card-Derrick"]');
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('[data-testid="login-button"]');
    await page.click('[data-testid="theme-toggle"]'); // Switch to light
    await page.click('button:has-text("Dashboard")');

    await expect(page).toHaveScreenshot('dashboard-light.png', {
      fullPage: true,
    });
  });
});
```

---

## CI/CD Integration

**File:** `.github/workflows/test.yml` (NEW)

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run E2E tests
        run: npx playwright test --project=${{ matrix.browser }}
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results-${{ matrix.browser }}
          path: test-results/

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run accessibility tests
        run: npx playwright test tests/accessibility/

      - name: Generate accessibility report
        if: always()
        run: npx playwright show-report
```

---

## Test Data Management

**File:** `tests/fixtures/testData.ts` (NEW)

```typescript
import type { Todo, AuthUser, Message } from '@/types/todo';

export const testUsers: AuthUser[] = [
  {
    id: 'test-user-1',
    name: 'Test Derrick',
    color: '#0033A0',
    role: 'owner',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'test-user-2',
    name: 'Test Sefra',
    color: '#72B5E8',
    role: 'member',
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const testTodos: Todo[] = [
  {
    id: 'todo-1',
    text: 'Test task 1',
    completed: false,
    status: 'todo',
    priority: 'high',
    created_at: '2025-01-15T10:00:00Z',
    created_by: 'Test Derrick',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'todo-2',
    text: 'Test task 2',
    completed: true,
    status: 'done',
    priority: 'medium',
    created_at: '2025-01-14T10:00:00Z',
    created_by: 'Test Sefra',
    assigned_to: 'Test Sefra',
    updated_at: '2025-01-15T15:00:00Z',
  },
];

export const testMessages: Message[] = [
  {
    id: 'msg-1',
    text: 'Test message 1',
    created_by: 'Test Derrick',
    created_at: '2025-01-15T10:00:00Z',
    reactions: [],
    read_by: ['Test Derrick'],
  },
];

// Database seeding function
export async function seedTestData(supabase: any) {
  // Clear existing test data
  await supabase.from('todos').delete().ilike('text', 'Test%');
  await supabase.from('messages').delete().ilike('text', 'Test%');

  // Insert test data
  await supabase.from('todos').insert(testTodos);
  await supabase.from('messages').insert(testMessages);
}

// Database cleanup function
export async function cleanupTestData(supabase: any) {
  await supabase.from('todos').delete().ilike('text', 'Test%');
  await supabase.from('messages').delete().ilike('text', 'Test%');
  await supabase.from('users').delete().ilike('name', 'Test%');
}
```

---

## Running Tests

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:accessibility": "playwright test tests/accessibility/",
    "test:visual": "playwright test tests/visual/",
    "test:coverage": "vitest run --coverage",
    "test:all": "npm run test:unit && npm run test:e2e",
    "test:watch": "vitest --watch"
  }
}
```

### Daily Development Workflow

```bash
# Run unit tests in watch mode while developing
npm run test:watch

# Run specific test file
npx vitest tests/unit/lib/utils.test.ts

# Run E2E tests with UI
npm run test:e2e:ui

# Run accessibility tests
npm run test:accessibility

# Generate coverage report
npm run test:coverage
```

---

## Success Metrics

### Coverage Targets

- **Unit Tests:** 85% line coverage
- **Integration Tests:** 75% line coverage
- **E2E Tests:** 100% of critical paths
- **Accessibility:** 0 WCAG violations

### Test Execution Time

- **Unit Tests:** <30 seconds
- **Integration Tests:** <2 minutes
- **E2E Tests (single browser):** <5 minutes
- **Full Test Suite (all browsers):** <15 minutes

### Maintenance

- **Flaky Test Rate:** <5%
- **Test Update Frequency:** With every PR
- **Visual Snapshot Updates:** Monthly or on design changes

---

**Testing is Production-Ready when:**
- ✅ All P0 fixes have passing tests
- ✅ Code coverage meets 80% threshold
- ✅ 0 accessibility violations
- ✅ All browsers pass E2E tests
- ✅ CI/CD pipeline is green
- ✅ Manual QA checklist complete
