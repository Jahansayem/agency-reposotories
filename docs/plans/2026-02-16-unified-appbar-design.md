# Unified AppBar - Consistent Navigation Design

**Date:** 2026-02-16
**Author:** Claude (with Adrian Stier)
**Status:** Approved

## Problem Statement

The application currently has inconsistent top bar navigation across different views:
- **Tasks view** has TodoHeader with search, view toggle, new task button, notifications, and user menu
- **Other views** (Dashboard, Calendar, Analytics, etc.) have no top bar or different headers
- This creates a jarring, inconsistent user experience when navigating between views

## Goals

1. **Consistency**: Every view has the same top bar structure
2. **Flexibility**: Views can customize the center content area
3. **Maintainability**: Centralized logic for global actions (New Task, Notifications, User Menu)
4. **Incremental Migration**: Can be rolled out gradually without breaking existing views

## Design Overview

### Architecture

Create a unified top bar system with:
- **Fixed right section**: New Task button, Notifications bell, User menu (always visible)
- **Dynamic center section**: View-specific content (search, date pickers, filters, etc.)
- **Context-based API**: Views register their content using `useAppBar()` hook

```
AppShell
├── UnifiedAppBar (NEW)
│   ├── Center: View-specific content slot
│   ├── Right: Fixed global actions
│   │   ├── New Task button (always visible)
│   │   ├── Notifications bell
│   │   └── User menu
│   └── AppBarContext (provides setAppBarContent hook)
├── NavigationSidebar (existing, unchanged)
├── Main Content Area
│   └── {children} (TodoList, DashboardPage, etc.)
└── EnhancedBottomNav (existing, unchanged)
```

## Component Specifications

### 1. AppBarContext.tsx (NEW)

**Purpose**: Allows views to inject custom content into the app bar.

**Interface**:
```tsx
interface AppBarContextType {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}

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
  };
}
```

**State Management**:
- Single `content` field (ReactNode | null)
- Simple setter, no complex merging
- Updates trigger re-render of UnifiedAppBar only

### 2. UnifiedAppBar.tsx (NEW)

**Purpose**: Consistent top bar rendered across all views.

**Interface**:
```tsx
interface UnifiedAppBarProps {
  currentUser: AuthUser;
  onUserChange: (user: AuthUser | null) => void;
}
```

**Layout**:
```tsx
<header className="h-16 border-b bg-[var(--surface)] border-[var(--border)]">
  <div className="flex items-center justify-between h-full px-4">
    {/* Center: View-specific content from context */}
    <div className="flex-1 flex items-center gap-4">
      {content}
    </div>

    {/* Right: Fixed global actions */}
    <div className="flex items-center gap-2">
      <button onClick={onAddTask}>+ New Task</button>
      <NotificationBell count={unreadCount} onClick={openNotifications} />
      <UserMenu currentUser={currentUser} onUserChange={onUserChange} />
    </div>
  </div>
</header>
```

**Features**:
- Fixed height: 64px (16 Tailwind units)
- Responsive: Collapses on mobile (< 640px)
- Includes existing notification logic from TodoHeader
- Z-index: 10 (below modals which are 50+)

### 3. AppShell.tsx (UPDATED)

**Changes**:
```tsx
// Add AppBarProvider wrapper
<AppBarProvider>
  <div className="min-h-screen flex flex-col">
    {/* NEW: Add UnifiedAppBar at the top */}
    <UnifiedAppBar
      currentUser={currentUser}
      onUserChange={onUserChange}
    />

    {/* Existing layout */}
    <div className="flex-1 flex overflow-hidden">
      <NavigationSidebar ... />
      <main>{children}</main>
    </div>

    <EnhancedBottomNav />
    <FloatingChatButton />
    <CommandPalette />
  </div>
</AppBarProvider>
```

### 4. TodoList.tsx (UPDATED)

**Changes**: Remove TodoHeader, use UnifiedAppBar instead.

**Before**:
```tsx
<TodoHeader
  currentUser={currentUser}
  viewMode={viewMode}
  setViewMode={setViewMode}
  searchQuery={searchQuery}
  setSearchQuery={setSearchQuery}
  ...
/>
```

**After**:
```tsx
const { setAppBarContent } = useAppBar();

useEffect(() => {
  setAppBarContent(
    <div className="flex items-center gap-4">
      <SearchBar
        query={searchQuery}
        onChange={setSearchQuery}
      />
      <ViewToggle
        mode={viewMode}
        onChange={setViewMode}
      />
    </div>
  );

  // Cleanup: remove content when view unmounts
  return () => setAppBarContent(null);
}, [searchQuery, viewMode, setAppBarContent]);
```

### 5. Other Views (UPDATED)

Each view registers its custom content:

**DashboardPage.tsx**:
```tsx
useEffect(() => {
  setAppBarContent(null); // No custom content
  return () => setAppBarContent(null);
}, []);
```

**CalendarView.tsx**:
```tsx
useEffect(() => {
  setAppBarContent(
    <CalendarControls
      viewMode={calendarViewMode}
      onViewModeChange={setCalendarViewMode}
      currentDate={currentDate}
      onNavigate={handleDateNavigate}
    />
  );
  return () => setAppBarContent(null);
}, [calendarViewMode, currentDate]);
```

**AnalyticsPage.tsx**:
```tsx
useEffect(() => {
  setAppBarContent(
    <div className="flex gap-4">
      <DateRangePicker start={startDate} end={endDate} onChange={setDateRange} />
      <Button onClick={openCsvUpload}>Upload CSV</Button>
    </div>
  );
  return () => setAppBarContent(null);
}, [startDate, endDate]);
```

## Data Flow

### Registration Flow
```
1. View mounts (e.g., TodoList)
   ↓
2. View calls setAppBarContent(<SearchBar />)
   ↓
3. AppBarContext.content updates
   ↓
4. UnifiedAppBar re-renders with new content
```

### Cleanup Flow
```
1. View unmounts (user navigates away)
   ↓
2. Cleanup function runs: setAppBarContent(null)
   ↓
3. AppBarContext.content = null
   ↓
4. UnifiedAppBar shows empty center section
```

### No Race Conditions
- React guarantees cleanup runs before next effect
- Rapid navigation (A → B → C) works correctly
- Each view's cleanup removes its content before next view registers

## Error Handling

### Missing Context
```tsx
export function useAppBar() {
  const context = useContext(AppBarContext);
  if (!context) {
    throw new Error('useAppBar must be used within AppBarProvider');
  }
  return { setAppBarContent: context.setContent };
}
```

### Unmount Cleanup
- Every view MUST return cleanup function
- Prevents stale content from persisting
- ESLint rule can enforce this pattern

### Notification Errors
- Failed fetch → log error, show 0 count
- No user-facing error (fail silently)
- Existing error handling from TodoHeader moves to UnifiedAppBar

## Edge Cases

### Rapid Navigation
- User switches views quickly (Tasks → Dashboard → Calendar)
- Each view's cleanup runs in order
- No stale content or race conditions

### Modal Overlays
- UnifiedAppBar stays visible when modals open
- Z-index management: AppBar (10), Modals (50+)

### Mobile Behavior
- **< 640px**: UnifiedAppBar collapses
  - Show: User menu button only
  - Hide: New Task, Notifications (move to floating button)
  - Search/filters move to mobile sheet (existing pattern)

### Focus Mode
- When focus mode active, hide UnifiedAppBar entirely
- Consistent with existing behavior (focus mode hides sidebar too)

### Empty Content Slot
- Some views have no custom content (Dashboard, Archive)
- Center section renders null → empty space
- Fixed right actions always visible

## Migration Path

### Phase 1: Add New System (Parallel)
- Create AppBarContext.tsx
- Create UnifiedAppBar.tsx
- Add to AppShell (conditionally render based on feature flag)
- TodoHeader still works for views that haven't migrated

### Phase 2: Migrate TodoList
- Update TodoList to use `useAppBar()`
- Remove TodoHeader import/render
- Test thoroughly (search, view toggle, notifications)

### Phase 3: Migrate Remaining Views
- DashboardPage
- CalendarView
- AnalyticsPage
- CustomerLookupView
- AIInbox
- ChatView
- ArchiveView

### Phase 4: Cleanup
- Remove TodoHeader.tsx
- Remove feature flag from AppShell
- Update documentation

**Estimated effort**: 2-3 days for complete migration

## Testing Strategy

### Unit Tests
- **AppBarContext**: `setContent` updates state correctly
- **useAppBar**: Throws error when used outside provider
- **UnifiedAppBar**: Renders fixed actions + dynamic content slot

### Integration Tests
- **View registration**: TodoList registers search bar, appears in AppBar
- **View switching**: Navigate Tasks → Dashboard → content updates correctly
- **Cleanup**: Navigate away → stale content doesn't persist
- **New Task button**: Click from any view → opens modal, switches to tasks view

### Visual Regression Tests
- All views have consistent top bar height (64px)
- Mobile responsive breakpoints work correctly
- Focus mode hides app bar
- Dark mode styling correct

### Manual Testing Checklist
- [ ] Navigate between all views, verify top bar consistency
- [ ] Search works in Tasks view
- [ ] Calendar date picker works
- [ ] Analytics CSV upload button works
- [ ] New Task button works from every view
- [ ] Notifications bell works
- [ ] User menu works
- [ ] Mobile layout collapses correctly
- [ ] Focus mode hides app bar
- [ ] Dark mode looks correct

## Success Metrics

1. **Consistency**: 100% of views use UnifiedAppBar
2. **No regressions**: All existing features work (search, notifications, etc.)
3. **Performance**: No measurable performance degradation
4. **Mobile**: Responsive behavior matches existing patterns
5. **Accessibility**: ARIA labels, keyboard navigation work correctly

## Future Enhancements

### Breadcrumb Navigation (Optional)
- Add left section to AppBar for breadcrumbs
- Example: "Analytics / Customer Segments"
- Improves orientation in deep navigation

### Command Palette Integration
- Cmd+K from app bar search focuses command palette
- Unified search experience

### Keyboard Shortcuts in AppBar
- Show keyboard hint badges (e.g., "Cmd+K" next to search)
- Tooltip on hover

## Related Files

### New Files
- `src/components/layout/AppBarContext.tsx`
- `src/components/layout/UnifiedAppBar.tsx`

### Modified Files
- `src/components/layout/AppShell.tsx`
- `src/components/TodoList.tsx`
- `src/components/views/DashboardPage.tsx`
- `src/components/views/CalendarView.tsx`
- `src/components/views/AnalyticsPage.tsx`
- `src/components/views/CustomerLookupView.tsx`
- `src/components/views/AIInbox.tsx`
- `src/components/views/ChatView.tsx`
- `src/components/ArchiveView.tsx`

### Removed Files
- `src/components/todo/TodoHeader.tsx` (after migration complete)

## Notes

- This design maintains existing functionality while improving consistency
- The context-based API is similar to patterns in Next.js, React Navigation, etc.
- Mobile behavior preserves existing patterns (floating action button, mobile sheet)
- Feature flag allows safe rollout without breaking production
