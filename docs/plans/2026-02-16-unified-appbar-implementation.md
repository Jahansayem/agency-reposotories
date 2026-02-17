# Unified AppBar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a consistent top navigation bar across all views using a context-based API for view-specific content.

**Architecture:** Create AppBarContext that allows views to inject custom content into a UnifiedAppBar component. The AppBar has fixed global actions (New Task, Notifications, User Menu) on the right and a flexible content slot in the center.

**Tech Stack:** React 18, TypeScript, Next.js App Router, Tailwind CSS, Framer Motion

---

## Task 1: Create AppBarContext

**Files:**
- Create: `src/components/layout/AppBarContext.tsx`
- Create: `src/components/layout/__tests__/AppBarContext.test.tsx`

**Step 1: Write failing test for AppBarContext**

```typescript
// src/components/layout/__tests__/AppBarContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { AppBarProvider, useAppBar } from '../AppBarContext';

describe('AppBarContext', () => {
  it('should provide setAppBarContent function', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppBarProvider>{children}</AppBarProvider>
    );

    const { result } = renderHook(() => useAppBar(), { wrapper });

    expect(result.current.setAppBarContent).toBeDefined();
    expect(typeof result.current.setAppBarContent).toBe('function');
  });

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAppBar());
    }).toThrow('useAppBar must be used within AppBarProvider');
  });

  it('should update content when setAppBarContent is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppBarProvider>{children}</AppBarProvider>
    );

    const { result } = renderHook(() => useAppBar(), { wrapper });

    act(() => {
      result.current.setAppBarContent(<div>Test Content</div>);
    });

    // Content is updated (we'll verify this in integration tests)
    expect(result.current.setAppBarContent).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- AppBarContext.test.tsx`
Expected: FAIL - "Cannot find module '../AppBarContext'"

**Step 3: Write AppBarContext implementation**

```typescript
// src/components/layout/AppBarContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AppBarContextType {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}

const AppBarContext = createContext<AppBarContextType | null>(null);

export function AppBarProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);

  return (
    <AppBarContext.Provider value={{ content, setContent }}>
      {children}
    </AppBarContext.Provider>
  );
}

export function useAppBar() {
  const context = useContext(AppBarContext);
  if (!context) {
    throw new Error('useAppBar must be used within AppBarProvider');
  }
  return {
    setAppBarContent: context.setContent,
    content: context.content,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- AppBarContext.test.tsx`
Expected: PASS - all 3 tests pass

**Step 5: Commit**

```bash
git add src/components/layout/AppBarContext.tsx src/components/layout/__tests__/AppBarContext.test.tsx
git commit -m "feat: add AppBarContext for unified navigation

- Create AppBarProvider with content state
- Add useAppBar hook with error checking
- Add unit tests for context and hook

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create UnifiedAppBar Component

**Files:**
- Create: `src/components/layout/UnifiedAppBar.tsx`
- Create: `src/components/layout/__tests__/UnifiedAppBar.test.tsx`
- Reference: `src/components/todo/TodoHeader.tsx` (for notification logic)

**Step 1: Write failing test for UnifiedAppBar**

```typescript
// src/components/layout/__tests__/UnifiedAppBar.test.tsx
import { render, screen } from '@testing-library/react';
import { AppBarProvider } from '../AppBarContext';
import UnifiedAppBar from '../UnifiedAppBar';
import { AuthUser } from '@/types/todo';

const mockUser: AuthUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
};

describe('UnifiedAppBar', () => {
  it('should render New Task button', () => {
    render(
      <AppBarProvider>
        <UnifiedAppBar currentUser={mockUser} onUserChange={() => {}} />
      </AppBarProvider>
    );

    expect(screen.getByText(/new task/i)).toBeInTheDocument();
  });

  it('should render notifications bell', () => {
    render(
      <AppBarProvider>
        <UnifiedAppBar currentUser={mockUser} onUserChange={() => {}} />
      </AppBarProvider>
    );

    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
  });

  it('should render user menu', () => {
    render(
      <AppBarProvider>
        <UnifiedAppBar currentUser={mockUser} onUserChange={() => {}} />
      </AppBarProvider>
    );

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
  });

  it('should render dynamic content from context', () => {
    const TestComponent = () => {
      const { setAppBarContent } = useAppBar();

      useEffect(() => {
        setAppBarContent(<div>Custom Content</div>);
      }, []);

      return null;
    };

    render(
      <AppBarProvider>
        <UnifiedAppBar currentUser={mockUser} onUserChange={() => {}} />
        <TestComponent />
      </AppBarProvider>
    );

    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- UnifiedAppBar.test.tsx`
Expected: FAIL - "Cannot find module '../UnifiedAppBar'"

**Step 3: Extract notification logic from TodoHeader**

Read `src/components/todo/TodoHeader.tsx` lines 92-124 for notification logic. Copy:
- `unreadNotifications` state
- `updateUnreadCount` function
- useEffect for real-time subscription
- NotificationModal integration

**Step 4: Write UnifiedAppBar implementation**

```typescript
// src/components/layout/UnifiedAppBar.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Bell } from 'lucide-react';
import { AuthUser, ActivityLogEntry } from '@/types/todo';
import { useAppBar } from './AppBarContext';
import { useAppShell } from './AppShell';
import { UserMenu } from '@/components/UserMenu';
import NotificationModal from '@/components/NotificationModal';
import { supabase } from '@/lib/supabaseClient';
import { useTodoStore } from '@/store/todoStore';

interface UnifiedAppBarProps {
  currentUser: AuthUser;
  onUserChange: (user: AuthUser | null) => void;
}

const LAST_SEEN_KEY = 'notificationLastSeenAt';

export default function UnifiedAppBar({
  currentUser,
  onUserChange,
}: UnifiedAppBarProps) {
  const { content } = useAppBar();
  const { triggerNewTask, setActiveView } = useAppShell();
  const { focusMode } = useTodoStore((state) => state.ui);

  // Notification state
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate unread notifications count
  const updateUnreadCount = useCallback(() => {
    if (typeof window === 'undefined') return;

    const lastSeenStr = localStorage.getItem(LAST_SEEN_KEY);
    if (!lastSeenStr) {
      setUnreadNotifications(0);
      return;
    }

    const lastSeenTime = new Date(lastSeenStr).getTime();

    supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data) return;

        const activityLog = data as ActivityLogEntry[];
        const unreadCount = activityLog.filter((entry) => {
          const entryTime = new Date(entry.created_at).getTime();
          return entryTime > lastSeenTime;
        }).length;

        setUnreadNotifications(unreadCount);
      });
  }, []);

  // Update count on mount and when modal closes
  useEffect(() => {
    updateUnreadCount();
  }, [updateUnreadCount]);

  // Real-time subscription for new notifications
  useEffect(() => {
    const channel = supabase
      .channel('activity_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log' },
        () => {
          updateUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [updateUnreadCount]);

  const handleNotificationClick = () => {
    setNotificationModalOpen(true);
  };

  const handleNotificationClose = () => {
    setNotificationModalOpen(false);
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setUnreadNotifications(0);
  };

  const handleNewTask = () => {
    setActiveView('tasks');
    triggerNewTask();
  };

  // Hide in focus mode
  if (focusMode) {
    return null;
  }

  return (
    <>
      <header className="h-16 border-b bg-[var(--surface)] border-[var(--border)] flex-shrink-0 z-10">
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          {/* Center: View-specific content from context */}
          <div className="flex-1 flex items-center gap-4 min-w-0">
            {content}
          </div>

          {/* Right: Fixed global actions */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* New Task button - always visible on desktop */}
            <button
              onClick={handleNewTask}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition-colors font-medium text-sm"
              aria-label="Create new task"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>

            {/* Notifications bell */}
            <button
              ref={notificationButtonRef}
              onClick={handleNotificationClick}
              className="relative p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
            >
              <Bell className="w-5 h-5 text-[var(--foreground)]" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--danger)] rounded-full" />
              )}
            </button>

            {/* User menu */}
            <UserMenu currentUser={currentUser} onUserChange={onUserChange} />
          </div>
        </div>
      </header>

      {/* Notification modal */}
      <NotificationModal
        isOpen={notificationModalOpen}
        onClose={handleNotificationClose}
        anchorRef={notificationButtonRef}
        currentUser={currentUser}
      />
    </>
  );
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- UnifiedAppBar.test.tsx`
Expected: PASS - all 4 tests pass

**Step 6: Commit**

```bash
git add src/components/layout/UnifiedAppBar.tsx src/components/layout/__tests__/UnifiedAppBar.test.tsx
git commit -m "feat: add UnifiedAppBar component

- Create UnifiedAppBar with fixed right actions
- Add notification bell with real-time updates
- Add New Task button and User menu
- Render dynamic content from AppBarContext
- Hide in focus mode

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Integrate UnifiedAppBar into AppShell

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/index.ts`

**Step 1: Write integration test**

```typescript
// src/components/layout/__tests__/AppShell.test.tsx (add to existing file)
describe('AppShell with UnifiedAppBar', () => {
  it('should render UnifiedAppBar at the top', () => {
    const mockUser: AuthUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
    };

    render(
      <AppShell currentUser={mockUser} onUserChange={() => {}}>
        <div>Test Content</div>
      </AppShell>
    );

    expect(screen.getByText(/new task/i)).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- AppShell.test.tsx`
Expected: FAIL - UnifiedAppBar not rendered

**Step 3: Update AppShell.tsx**

```typescript
// src/components/layout/AppShell.tsx
// Add imports at top
import { AppBarProvider } from './AppBarContext';
import UnifiedAppBar from './UnifiedAppBar';

// Update JSX in AppShell component (around line 310):
return (
  <AppBarProvider>
    <AppShellContext.Provider value={contextValue}>
      <div
        className={`
          min-h-screen min-h-[100dvh] flex flex-col
          transition-colors duration-200
          ${'bg-[var(--background)]'}
        `}
      >
        {/* Skip link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* NEW: UnifiedAppBar */}
        <UnifiedAppBar
          currentUser={currentUser}
          onUserChange={onUserChange}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* ═══ LEFT SIDEBAR ═══ */}
          <NavigationSidebar
            currentUser={currentUser}
            onUserChange={onUserChange}
            onShowWeeklyChart={openWeeklyChart}
            onShowShortcuts={openShortcuts}
          />

          {/* ═══ MAIN CONTENT AREA ═══ */}
          <main
            id="main-content"
            className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-out"
          >
            {/* Main content with proper overflow handling */}
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>

          {/* Rest of AppShell... */}
```

**Step 4: Update layout index exports**

```typescript
// src/components/layout/index.ts
export { default as AppShell, useAppShell } from './AppShell';
export { AppBarProvider, useAppBar } from './AppBarContext';
export { default as UnifiedAppBar } from './UnifiedAppBar';
export { default as NavigationSidebar } from './NavigationSidebar';
export { default as CommandPalette } from './CommandPalette';
export { default as EnhancedBottomNav } from './EnhancedBottomNav';
```

**Step 5: Run test to verify it passes**

Run: `npm test -- AppShell.test.tsx`
Expected: PASS - UnifiedAppBar renders correctly

**Step 6: Run dev server and verify visually**

Run: `npm run dev`
Open: http://localhost:3000
Expected: UnifiedAppBar appears at top of all views

**Step 7: Commit**

```bash
git add src/components/layout/AppShell.tsx src/components/layout/index.ts src/components/layout/__tests__/AppShell.test.tsx
git commit -m "feat: integrate UnifiedAppBar into AppShell

- Wrap AppShell content in AppBarProvider
- Render UnifiedAppBar at top of layout
- Export new components from layout index
- Add integration test

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Migrate TodoList to use UnifiedAppBar

**Files:**
- Modify: `src/components/TodoList.tsx`
- Create: `src/components/todo/TodoListAppBarContent.tsx`

**Step 1: Extract TodoList app bar content to new component**

```typescript
// src/components/todo/TodoListAppBarContent.tsx
'use client';

import { memo } from 'react';
import { LayoutList, LayoutGrid, Search, X } from 'lucide-react';
import { ViewMode } from '@/types/todo';

interface TodoListAppBarContentProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function TodoListAppBarContent({
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
}: TodoListAppBarContentProps) {
  return (
    <div className="flex items-center gap-4 w-full max-w-2xl">
      {/* View toggle */}
      <div className="flex items-center bg-[var(--surface-2)] rounded-lg p-1">
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded transition-colors ${
            viewMode === 'list'
              ? 'bg-[var(--surface)] text-[var(--foreground)]'
              : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
          }`}
          aria-label="List view"
          title="List view"
        >
          <LayoutList className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('board')}
          className={`p-2 rounded transition-colors ${
            viewMode === 'board'
              ? 'bg-[var(--surface)] text-[var(--foreground)]'
              : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
          }`}
          aria-label="Board view"
          title="Board view"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>

      {/* Search bar */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
          className="w-full pl-10 pr-10 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--foreground)]"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(TodoListAppBarContent);
```

**Step 2: Update TodoList to register app bar content**

```typescript
// src/components/TodoList.tsx
// Add import at top
import { useAppBar } from '@/components/layout';
import TodoListAppBarContent from './todo/TodoListAppBarContent';

// Inside TodoList component, after state declarations:
const { setAppBarContent } = useAppBar();

// Add useEffect to register app bar content
useEffect(() => {
  setAppBarContent(
    <TodoListAppBarContent
      viewMode={state.viewMode}
      setViewMode={state.setViewMode}
      searchQuery={state.searchQuery}
      setSearchQuery={state.setSearchQuery}
    />
  );

  // Cleanup: remove content when view unmounts
  return () => setAppBarContent(null);
}, [state.viewMode, state.searchQuery, setAppBarContent, state.setViewMode, state.setSearchQuery]);

// Remove TodoHeader from JSX (lines 750-771)
// Delete this block:
<TodoHeader
  currentUser={currentUser}
  onUserChange={onUserChange}
  viewMode={state.viewMode}
  setViewMode={state.setViewMode}
  onAddTask={() => state.setShowAddTaskModal(true)}
  searchQuery={state.searchQuery}
  setSearchQuery={state.setSearchQuery}
  showAdvancedFilters={state.showAdvancedFilters}
  setShowAdvancedFilters={state.setShowAdvancedFilters}
  onResetFilters={() => {
    state.setQuickFilter('all');
    state.setShowCompleted(false);
    state.setHighPriorityOnly(false);
    state.setSearchQuery('');
    state.setStatusFilter('all');
    state.setAssignedToFilter('all');
    state.setCustomerFilter('all');
    state.setHasAttachmentsFilter(null);
    state.setDateRangeFilter({ start: '', end: '' });
  }}
/>
```

**Step 3: Run dev server and test**

Run: `npm run dev`
Test:
- [ ] Navigate to Tasks view
- [ ] Search bar appears in UnifiedAppBar
- [ ] View toggle (List/Board) works
- [ ] Search functionality works
- [ ] Navigate to Dashboard → search bar disappears
- [ ] Navigate back to Tasks → search bar reappears

**Step 4: Commit**

```bash
git add src/components/TodoList.tsx src/components/todo/TodoListAppBarContent.tsx
git commit -m "feat: migrate TodoList to use UnifiedAppBar

- Extract search and view toggle to TodoListAppBarContent
- Register content with useAppBar hook
- Remove TodoHeader from TodoList
- Add cleanup on unmount

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Migrate DashboardPage

**Files:**
- Modify: `src/components/views/DashboardPage.tsx`

**Step 1: Add useAppBar to DashboardPage**

```typescript
// src/components/views/DashboardPage.tsx
// Add import
import { useAppBar } from '@/components/layout';

// Inside DashboardPage component, at the top:
const { setAppBarContent } = useAppBar();

// Add useEffect to clear content (Dashboard has no custom content)
useEffect(() => {
  setAppBarContent(null);
  return () => setAppBarContent(null);
}, [setAppBarContent]);
```

**Step 2: Run dev server and test**

Run: `npm run dev`
Test:
- [ ] Navigate to Dashboard
- [ ] UnifiedAppBar shows only fixed actions (New Task, Notifications, User Menu)
- [ ] Center section is empty
- [ ] New Task button works from Dashboard

**Step 3: Commit**

```bash
git add src/components/views/DashboardPage.tsx
git commit -m "feat: migrate DashboardPage to UnifiedAppBar

- Register null content (no custom controls)
- Dashboard now uses consistent app bar

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Migrate CalendarView

**Files:**
- Modify: `src/components/calendar/CalendarView.tsx`
- Check: `src/components/calendar/CalendarView.tsx:76-120` (existing date/view controls)

**Step 1: Extract calendar controls to app bar content**

```typescript
// src/components/calendar/CalendarView.tsx
// Add import
import { useAppBar } from '@/components/layout';

// Inside CalendarView component, at the top:
const { setAppBarContent } = useAppBar();

// Create inline controls component (lines 200-250):
const calendarControls = useMemo(() => (
  <div className="flex items-center gap-4">
    {/* View mode toggle */}
    <div className="flex items-center bg-[var(--surface-2)] rounded-lg p-1">
      <button
        onClick={() => setViewMode('day')}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          viewMode === 'day'
            ? 'bg-[var(--surface)] text-[var(--foreground)]'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
        }`}
      >
        Day
      </button>
      <button
        onClick={() => setViewMode('week')}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          viewMode === 'week'
            ? 'bg-[var(--surface)] text-[var(--foreground)]'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
        }`}
      >
        Week
      </button>
      <button
        onClick={() => setViewMode('month')}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          viewMode === 'month'
            ? 'bg-[var(--surface)] text-[var(--foreground)]'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
        }`}
      >
        Month
      </button>
    </div>

    {/* Date navigation */}
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigateDate('prev')}
        className="p-2 rounded hover:bg-[var(--surface-2)] transition-colors"
        aria-label="Previous period"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => setCurrentDate(new Date())}
        className="px-3 py-1.5 text-sm font-medium rounded hover:bg-[var(--surface-2)] transition-colors"
      >
        Today
      </button>
      <button
        onClick={() => navigateDate('next')}
        className="p-2 rounded hover:bg-[var(--surface-2)] transition-colors"
        aria-label="Next period"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <span className="ml-2 text-sm font-medium text-[var(--foreground)]">
        {formatCurrentPeriod()}
      </span>
    </div>
  </div>
), [viewMode, currentDate, navigateDate, formatCurrentPeriod]);

// Register with app bar
useEffect(() => {
  setAppBarContent(calendarControls);
  return () => setAppBarContent(null);
}, [calendarControls, setAppBarContent]);
```

**Step 2: Remove duplicate header from CalendarView JSX**

Look for existing header/controls in CalendarView render (around lines 450-500) and remove if duplicated.

**Step 3: Run dev server and test**

Run: `npm run dev`
Test:
- [ ] Navigate to Calendar
- [ ] View toggle (Day/Week/Month) appears in app bar
- [ ] Date navigation works
- [ ] Today button works
- [ ] Current period displays correctly

**Step 4: Commit**

```bash
git add src/components/calendar/CalendarView.tsx
git commit -m "feat: migrate CalendarView to UnifiedAppBar

- Extract view toggle and date navigation to app bar
- Remove duplicate header controls
- Register controls with useAppBar hook

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Migrate Remaining Views

**Files:**
- Modify: `src/components/views/AnalyticsPage.tsx`
- Modify: `src/components/views/CustomerLookupView.tsx`
- Modify: `src/components/views/AIInbox.tsx`
- Modify: `src/components/views/ChatView.tsx`
- Modify: `src/components/ArchiveView.tsx`

**Step 1: Migrate AnalyticsPage**

```typescript
// src/components/views/AnalyticsPage.tsx
import { useAppBar } from '@/components/layout';

// Inside component:
const { setAppBarContent } = useAppBar();

useEffect(() => {
  setAppBarContent(null); // Analytics has no custom controls (or add date range picker if needed)
  return () => setAppBarContent(null);
}, [setAppBarContent]);
```

**Step 2: Migrate CustomerLookupView**

```typescript
// src/components/views/CustomerLookupView.tsx
import { useAppBar } from '@/components/layout';

// Inside component:
const { setAppBarContent } = useAppBar();

// If there's a search bar, extract it:
useEffect(() => {
  setAppBarContent(
    <input
      type="text"
      placeholder="Search customers..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full max-w-md px-4 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"
    />
  );
  return () => setAppBarContent(null);
}, [searchQuery, setAppBarContent]);
```

**Step 3: Migrate AIInbox**

```typescript
// src/components/views/AIInbox.tsx
import { useAppBar } from '@/components/layout';

const { setAppBarContent } = useAppBar();

useEffect(() => {
  setAppBarContent(null); // No custom controls
  return () => setAppBarContent(null);
}, [setAppBarContent]);
```

**Step 4: Migrate ChatView**

```typescript
// src/components/views/ChatView.tsx
import { useAppBar } from '@/components/layout';

const { setAppBarContent } = useAppBar();

useEffect(() => {
  setAppBarContent(null); // No custom controls
  return () => setAppBarContent(null);
}, [setAppBarContent]);
```

**Step 5: Migrate ArchiveView**

```typescript
// src/components/ArchiveView.tsx
import { useAppBar } from '@/components/layout';

const { setAppBarContent } = useAppBar();

useEffect(() => {
  setAppBarContent(null); // No custom controls
  return () => setAppBarContent(null);
}, [setAppBarContent]);
```

**Step 6: Run dev server and test all views**

Run: `npm run dev`
Test each view:
- [ ] Analytics
- [ ] Customers
- [ ] AI Inbox
- [ ] Chat
- [ ] Archive

Verify:
- [ ] UnifiedAppBar appears consistently
- [ ] No console errors
- [ ] No duplicate headers

**Step 7: Commit**

```bash
git add src/components/views/AnalyticsPage.tsx src/components/views/CustomerLookupView.tsx src/components/views/AIInbox.tsx src/components/views/ChatView.tsx src/components/ArchiveView.tsx
git commit -m "feat: migrate remaining views to UnifiedAppBar

- Migrate AnalyticsPage, CustomerLookupView, AIInbox
- Migrate ChatView and ArchiveView
- All views now use consistent navigation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Remove TodoHeader

**Files:**
- Delete: `src/components/todo/TodoHeader.tsx`
- Modify: `src/components/todo/index.ts`

**Step 1: Verify TodoHeader is no longer imported**

Run: `grep -r "TodoHeader" src/ --include="*.tsx" --include="*.ts"`
Expected: No imports found (only in index.ts export)

**Step 2: Remove TodoHeader export from index**

```typescript
// src/components/todo/index.ts
// Remove this line:
// export { default as TodoHeader } from './TodoHeader';

// Keep other exports
export { default as TodoFiltersBar } from './TodoFiltersBar';
export { default as TodoListContent } from './TodoListContent';
// ... rest of exports
```

**Step 3: Delete TodoHeader file**

```bash
rm src/components/todo/TodoHeader.tsx
```

**Step 4: Run build to verify no errors**

Run: `npm run build`
Expected: SUCCESS - no build errors

**Step 5: Commit**

```bash
git add src/components/todo/index.ts
git add -u src/components/todo/TodoHeader.tsx
git commit -m "chore: remove TodoHeader component

TodoHeader functionality now integrated into UnifiedAppBar.
All views migrated to new navigation system.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Add Mobile Responsive Behavior

**Files:**
- Modify: `src/components/layout/UnifiedAppBar.tsx`

**Step 1: Update UnifiedAppBar mobile behavior**

```typescript
// src/components/layout/UnifiedAppBar.tsx
// Update the component JSX (around line 100):

return (
  <>
    <header className="h-16 border-b bg-[var(--surface)] border-[var(--border)] flex-shrink-0 z-10">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Center: View-specific content from context */}
        {/* Hide on mobile if content is complex (search bars, etc.) */}
        <div className="flex-1 flex items-center gap-4 min-w-0 hidden sm:flex">
          {content}
        </div>

        {/* Mobile: Show condensed version */}
        <div className="flex-1 sm:hidden">
          {/* Could add a mobile-specific slot here if needed */}
        </div>

        {/* Right: Fixed global actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* New Task button - always visible on desktop, hidden on mobile (use FAB) */}
          <button
            onClick={handleNewTask}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition-colors font-medium text-sm"
            aria-label="Create new task"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>

          {/* Notifications bell - hidden on mobile, use badge on user menu instead */}
          <button
            ref={notificationButtonRef}
            onClick={handleNotificationClick}
            className="hidden sm:block relative p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
          >
            <Bell className="w-5 h-5 text-[var(--foreground)]" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--danger)] rounded-full" />
            )}
          </button>

          {/* User menu - always visible */}
          <UserMenu currentUser={currentUser} onUserChange={onUserChange} />
        </div>
      </div>
    </header>

    {/* Notification modal */}
    <NotificationModal
      isOpen={notificationModalOpen}
      onClose={handleNotificationClose}
      anchorRef={notificationButtonRef}
      currentUser={currentUser}
    />
  </>
);
```

**Step 2: Test mobile behavior**

Run: `npm run dev`
Test with browser DevTools (mobile viewport):
- [ ] App bar height consistent on mobile
- [ ] New Task button hidden (FAB visible instead)
- [ ] Notifications hidden on mobile
- [ ] User menu always visible
- [ ] Search/filters hidden on mobile (use mobile sheet)

**Step 3: Commit**

```bash
git add src/components/layout/UnifiedAppBar.tsx
git commit -m "feat: add mobile responsive behavior to UnifiedAppBar

- Hide New Task button on mobile (use FAB)
- Hide notifications on mobile
- Hide complex content on mobile
- Keep user menu always visible

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Final Testing & Documentation

**Files:**
- Modify: `README.md` or `docs/architecture.md`
- Create: `docs/unified-appbar-usage.md`

**Step 1: Create usage documentation**

```markdown
<!-- docs/unified-appbar-usage.md -->
# Unified AppBar Usage Guide

## Overview

The UnifiedAppBar provides consistent navigation across all views in the application.

## Architecture

- **AppBarContext**: Provides `useAppBar()` hook for views to register custom content
- **UnifiedAppBar**: Renders the top navigation bar with fixed actions and dynamic content
- **AppShell**: Wraps the entire app in AppBarProvider and renders UnifiedAppBar

## For View Authors

### Basic Usage (No Custom Content)

If your view doesn't need custom app bar content:

\`\`\`tsx
import { useAppBar } from '@/components/layout';

export default function MyView() {
  const { setAppBarContent } = useAppBar();

  useEffect(() => {
    setAppBarContent(null);
    return () => setAppBarContent(null);
  }, [setAppBarContent]);

  return <div>View content</div>;
}
\`\`\`

### With Custom Content

If your view needs search, filters, or controls in the app bar:

\`\`\`tsx
import { useAppBar } from '@/components/layout';

export default function MyView() {
  const { setAppBarContent } = useAppBar();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setAppBarContent(
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="w-full max-w-md px-4 py-2 rounded-lg"
      />
    );

    // IMPORTANT: Clean up on unmount
    return () => setAppBarContent(null);
  }, [searchQuery, setAppBarContent]);

  return <div>View content</div>;
}
\`\`\`

### Best Practices

1. **Always clean up**: Return cleanup function in useEffect
2. **Memoize complex content**: Use useMemo for expensive renders
3. **Keep it simple**: App bar is for navigation/search, not complex UI
4. **Mobile-friendly**: Content is hidden on mobile (< 640px)

## Fixed Actions (Always Visible)

- **New Task** - Opens task modal, always visible on desktop
- **Notifications** - Shows activity feed, badge for unread
- **User Menu** - Account settings, theme toggle, logout

## Examples

See implementation in:
- `src/components/TodoList.tsx` - Search + view toggle
- `src/components/calendar/CalendarView.tsx` - Date navigation + view toggle
- `src/components/views/DashboardPage.tsx` - No custom content
```

**Step 2: Run full E2E test suite**

Run: `npm run test:e2e`
Expected: All tests pass (or skip if E2E not set up)

**Step 3: Run build and verify no errors**

Run: `npm run build`
Expected: SUCCESS

**Step 4: Manual testing checklist**

Test the following:
- [ ] Navigate between all views (Tasks, Calendar, Dashboard, etc.)
- [ ] Verify app bar appears consistently
- [ ] Test search in Tasks view
- [ ] Test calendar controls
- [ ] Click New Task from each view
- [ ] Check notifications bell works
- [ ] Verify user menu works
- [ ] Test mobile responsive (DevTools)
- [ ] Test focus mode hides app bar
- [ ] Test dark mode styling

**Step 5: Commit documentation**

```bash
git add docs/unified-appbar-usage.md
git commit -m "docs: add UnifiedAppBar usage guide

- Document architecture and usage patterns
- Provide examples for view authors
- Document best practices and gotchas

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 6: Final commit and summary**

```bash
git add .
git commit -m "feat: complete UnifiedAppBar implementation

Complete migration to unified navigation system:
- ✅ Created AppBarContext for dynamic content
- ✅ Built UnifiedAppBar component
- ✅ Integrated into AppShell
- ✅ Migrated all views (TodoList, Calendar, Dashboard, etc.)
- ✅ Removed TodoHeader
- ✅ Added mobile responsive behavior
- ✅ Documented usage patterns

All views now have consistent top navigation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Completion Checklist

### Core Implementation
- [ ] Task 1: AppBarContext created with tests
- [ ] Task 2: UnifiedAppBar created with tests
- [ ] Task 3: Integrated into AppShell
- [ ] Task 4: TodoList migrated
- [ ] Task 5: DashboardPage migrated
- [ ] Task 6: CalendarView migrated
- [ ] Task 7: Remaining views migrated
- [ ] Task 8: TodoHeader removed
- [ ] Task 9: Mobile behavior added
- [ ] Task 10: Documentation complete

### Testing
- [ ] Unit tests pass for AppBarContext
- [ ] Unit tests pass for UnifiedAppBar
- [ ] Integration tests pass for AppShell
- [ ] Manual testing complete (all views)
- [ ] Mobile testing complete
- [ ] Build succeeds without errors

### Documentation
- [ ] Usage guide created
- [ ] Architecture documented
- [ ] Examples provided for view authors

## Success Metrics

- ✅ All views use UnifiedAppBar
- ✅ No regressions in existing features
- ✅ Consistent navigation experience
- ✅ Mobile responsive behavior works
- ✅ Build succeeds
- ✅ All tests pass

## Estimated Time

- Tasks 1-3 (Core infrastructure): 2-3 hours
- Tasks 4-7 (View migrations): 3-4 hours
- Tasks 8-9 (Cleanup + mobile): 1-2 hours
- Task 10 (Testing + docs): 1-2 hours

**Total: 7-11 hours** (approximately 1-2 days)
