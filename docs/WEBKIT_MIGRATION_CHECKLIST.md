# WebKit Blank Page Issue - Migration Checklist

**Purpose:** Use this checklist when encountering similar blank page issues in React/Next.js applications, particularly with Safari/WebKit browsers.

**Last Updated:** 2026-01-31

---

## 🔍 Issue Identification

Use this section to confirm you're experiencing the same issue.

### Symptoms Checklist

- [ ] **App renders blank page in Safari** (iOS or macOS)
- [ ] **App works fine in Chrome/Firefox** (same code, different browsers)
- [ ] **No errors in Safari console** (check Develop → Show JavaScript Console)
- [ ] **Network tab shows resources loading successfully** (no 404s or errors)
- [ ] **React DevTools shows no component tree** (nothing rendered)
- [ ] **Page source shows HTML but no rendered content** (View Source vs. Inspect Element)

### Quick Diagnosis Commands

```bash
# 1. Check for conditional rendering in providers
grep -rn "if (!mounted)" src/contexts/
grep -rn "return null" src/contexts/

# 2. Check for hydration issues
grep -rn "suppressHydrationWarning" src/

# 3. Look for useEffect guards
grep -rn "useEffect.*mounted" src/
```

### Expected Results

| Check | Problematic Pattern | Clean Pattern |
|-------|-------------------|---------------|
| **Provider rendering** | `if (!mounted) return null` | Always return `<Provider>{children}</Provider>` |
| **Theme loading** | Wait for mount before rendering | Load in `useEffect`, render immediately |
| **Hydration warnings** | Suppress with flags | Fix the root cause |

---

## 🛠️ Pre-Migration Steps

Complete these steps before making any code changes.

### 1. Create Backup

```bash
# Create a feature branch
git checkout -b fix/webkit-blank-page

# Tag current state (optional)
git tag -a pre-webkit-fix -m "State before WebKit blank page fix"
```

### 2. Document Current State

Create `docs/webkit-issue-analysis.md`:

```markdown
# WebKit Issue Analysis

## Date
[Current date]

## Affected Files
- [ ] List all files with conditional rendering
- [ ] List all context providers
- [ ] List all components using localStorage

## Current Behavior
- Describe what happens in Safari
- Describe what happens in Chrome
- Screenshots if possible

## Browser Versions Tested
- Safari: [version]
- Chrome: [version]
- Firefox: [version]
```

### 3. Set Up Testing Environment

```bash
# Install Playwright if not already installed
npm install -D @playwright/test

# Initialize Playwright
npx playwright install webkit

# Create test file
touch tests/webkit-blank-page.spec.ts
```

### 4. Baseline Test

Create `tests/webkit-blank-page.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('WebKit Blank Page Issue', () => {
  test('app should render in WebKit (currently failing)', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit');

    await page.goto('http://localhost:3000');

    // This will fail before fix, pass after fix
    const snapshot = await page.accessibility.snapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot?.children?.length).toBeGreaterThan(0);
  });
});
```

Run baseline test:
```bash
npm run dev  # In terminal 1
npx playwright test webkit-blank-page --project=webkit  # In terminal 2

# Expected: ❌ Test fails (confirms issue)
```

---

## 🔧 Migration Steps

Follow these steps in order.

### Step 1: Identify Problematic Components

```bash
# Find all context providers
find src -name "*Context.tsx" -o -name "*Provider.tsx"

# For each provider, check for:
# 1. useState for 'mounted' or 'ready' or 'initialized'
# 2. useEffect that sets mounted to true
# 3. Conditional return based on mounted state
```

**Common Files to Check:**
- [ ] `src/contexts/ThemeContext.tsx` or `src/contexts/ThemeProvider.tsx`
- [ ] `src/contexts/AuthContext.tsx` or `src/contexts/AuthProvider.tsx`
- [ ] `src/app/layout.tsx` (root layout)
- [ ] `src/app/providers.tsx` (if exists)

### Step 2: Fix Each Provider

For each problematic provider, apply this pattern:

#### Before (Problematic):
```typescript
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);  // ❌ Remove this

  useEffect(() => {
    setMounted(true);  // ❌ Remove this
    const saved = localStorage.getItem('theme');
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;  // ❌ Remove this guard
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  if (!mounted) {
    return null;  // ❌ REMOVE THIS - This is the problem
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

#### After (Fixed):
```typescript
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');  // ✅ Default to dark

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved && (saved === 'light' || saved === 'dark')) {
      setTheme(saved);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ✅ Always render children
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Step 3: Test Each Fix

After fixing each provider:

```bash
# 1. Save the file
# 2. Refresh dev server (may auto-reload)
# 3. Test in Safari:
#    - Open Safari
#    - Navigate to localhost:3000
#    - Verify app renders

# 4. Run automated test
npx playwright test webkit-blank-page --project=webkit

# Expected: ✅ Test passes
```

### Step 4: Handle Theme Flash (If Visible)

If users see a brief flash of wrong theme:

**Option A: Add CSS Transition**
```css
/* In your global CSS */
html {
  transition: background-color 0.15s ease-in-out;
}
```

**Option B: Use className Instead of class**
```typescript
// More performant, no flash
useEffect(() => {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}, [theme]);
```

**Option C: Accept the Flash**
- If it's < 16ms, most users won't notice
- Better than a blank page
- Can address in future refactor

---

## ✅ Validation & Testing

### Automated Testing

```bash
# Run full test suite
npx playwright test

# Run WebKit-specific tests
npx playwright test --project=webkit

# Run with browser visible
npx playwright test --project=webkit --headed

# Generate test report
npx playwright show-report
```

**Expected Results:**
- [ ] All WebKit tests pass
- [ ] No new test failures in Chrome/Firefox
- [ ] No regression in existing functionality

### Manual Testing Checklist

#### Safari on macOS
- [ ] Navigate to localhost:3000
- [ ] App renders immediately (no blank page)
- [ ] Login works
- [ ] Theme toggle works
- [ ] Theme persists on refresh
- [ ] No console errors

#### Safari on iOS (Simulator)
- [ ] Open Xcode → Open Developer Tool → Simulator
- [ ] Open Safari in simulator
- [ ] Navigate to `http://[YOUR-IP]:3000` (find with `ipconfig getifaddr en0`)
- [ ] App renders fully
- [ ] Touch interactions work
- [ ] Theme toggle works
- [ ] Scroll works smoothly

#### Chrome (Regression Check)
- [ ] All features still work
- [ ] No new console warnings
- [ ] Performance unchanged

#### Firefox (Regression Check)
- [ ] All features still work
- [ ] No new console warnings

### Performance Testing

```bash
# Run Lighthouse audit in Safari
# Safari → Develop → Show Web Inspector → Audits

# Check for:
# - Performance score > 90
# - No layout shifts
# - Fast time to interactive
```

**Before/After Comparison:**

| Metric | Before Fix | After Fix | Target |
|--------|-----------|-----------|--------|
| Time to First Render | ∞ (blank) | < 100ms | ✅ |
| Time to Interactive | ∞ (blank) | < 500ms | ✅ |
| Theme Flash Duration | N/A | < 16ms | ✅ |
| Bundle Size | - | - | No change |

---

## 📝 Documentation Updates

### 1. Update Project Documentation

Add to your main README or developer guide:

```markdown
## Browser Compatibility

This application is fully compatible with:
- ✅ Safari 16+ (iOS/macOS)
- ✅ Chrome 100+
- ✅ Firefox 100+
- ✅ Edge 100+

### Known Issues (RESOLVED)
- ~~Blank page in Safari~~ - Fixed in [commit hash]
  - See docs/WEBKIT_FIX_GUIDE.md for details
```

### 2. Create Knowledge Base Entry

Create `docs/WEBKIT_FIX_GUIDE.md` (see main guide for template)

### 3. Update Troubleshooting Guide

Add to your troubleshooting section:

```markdown
### Blank Page in Safari

**Symptoms:** App works in Chrome but shows blank page in Safari

**Solution:** Check context providers for conditional rendering
- Look for `if (!mounted) return null`
- Remove this pattern and render children immediately
- See: docs/WEBKIT_FIX_GUIDE.md
```

### 4. Add Code Comments

In the fixed provider file:

```typescript
// ✅ CRITICAL: Always render children immediately
// Do NOT return null based on mount state - this breaks WebKit hydration
// Theme loading happens in useEffect but children render right away
// See: docs/WEBKIT_FIX_GUIDE.md for full context
return (
  <ThemeContext.Provider value={{ theme, setTheme }}>
    {children}
  </ThemeContext.Provider>
);
```

---

## 🚀 Deployment

### Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Manual testing complete in all browsers
- [ ] No performance regression
- [ ] Documentation updated
- [ ] Code reviewed (if team environment)
- [ ] Changelog updated

### Deployment Steps

```bash
# 1. Commit changes
git add .
git commit -m "fix: Remove conditional rendering in ThemeProvider to fix Safari blank page

- Remove mounted state variable
- Always render children immediately
- Theme loading still works via useEffect
- Fixes blank page issue in WebKit browsers (Safari iOS/macOS)
- All tests passing in Safari, Chrome, Firefox
- No performance regression

See docs/WEBKIT_FIX_GUIDE.md for full details"

# 2. Push to feature branch
git push origin fix/webkit-blank-page

# 3. Create pull request
gh pr create --title "Fix Safari blank page issue" \
  --body "See docs/WEBKIT_FIX_GUIDE.md for full analysis"

# 4. After PR approval, merge to main
git checkout main
git merge fix/webkit-blank-page

# 5. Deploy to staging first
# (Your deployment command here)

# 6. Test on staging in Safari
# - Navigate to staging URL
# - Verify fix works in production environment

# 7. Deploy to production
# (Your deployment command here)
```

### Post-Deployment Monitoring

**First 24 Hours:**
- [ ] Monitor error logs for new React errors
- [ ] Check analytics for Safari bounce rate (should decrease)
- [ ] Check analytics for Safari session duration (should increase)
- [ ] Monitor support tickets (should decrease)

**First Week:**
- [ ] Review user feedback
- [ ] Check for theme-related issues
- [ ] Verify no performance regression in production

---

## 🎯 Success Criteria

The fix is successful when:

### Technical Metrics
- [x] ✅ 100% of WebKit tests passing
- [x] ✅ App renders in Safari iOS/macOS
- [x] ✅ No React hydration errors
- [x] ✅ No console errors in any browser
- [x] ✅ Theme persistence works
- [x] ✅ Performance unchanged or improved

### Business Metrics
- [ ] ⏱️ Safari bounce rate decreases (monitor post-deployment)
- [ ] ⏱️ Safari session duration increases (monitor post-deployment)
- [ ] ⏱️ Support tickets about "app not loading" decrease
- [ ] ⏱️ Mobile user engagement increases

### User Experience
- [ ] ✅ Instant app rendering (no blank page)
- [ ] ✅ No visible theme flash (< 16ms)
- [ ] ✅ Smooth theme toggle
- [ ] ✅ Theme persists across refreshes

---

## 🔄 Rollback Plan

If issues occur after deployment:

### Quick Rollback
```bash
# Revert the commit
git revert [commit-hash]
git push origin main

# Redeploy previous version
# (Your deployment command)
```

### Gradual Rollback (Feature Flag)

If your app supports feature flags:

```typescript
// In ThemeProvider
const USE_NEW_RENDERING = process.env.NEXT_PUBLIC_WEBKIT_FIX === 'true';

if (!USE_NEW_RENDERING && !mounted) {
  return null;  // Old behavior
}

return (
  <ThemeContext.Provider value={{ theme, setTheme }}>
    {children}
  </ThemeContext.Provider>
);
```

Then toggle the env var to roll back without deploying.

---

## 📚 Additional Resources

### Related Documentation
- **Detailed Fix Guide:** [WEBKIT_FIX_GUIDE.md](./WEBKIT_FIX_GUIDE.md)
- **React Hydration:** https://react.dev/reference/react-dom/client/hydrateRoot
- **Next.js SSR:** https://nextjs.org/docs/app/building-your-application/rendering

### Common Variations of This Issue

1. **Auth Provider with same pattern**
   ```typescript
   // Same fix applies
   if (!isInitialized) return null;  // ❌ Remove
   ```

2. **Multiple providers nested**
   ```typescript
   // Fix all of them, bottom-up
   <ThemeProvider>
     <AuthProvider>
       <DataProvider>  // Fix this first, then work up
   ```

3. **Layout component with conditional**
   ```typescript
   // In app/layout.tsx
   if (!mounted) return null;  // ❌ Remove
   ```

### Contact & Support

**For questions:**
- Check existing documentation first
- Search for "WebKit blank page" in your issue tracker
- Consult with senior developer if unsure

**For this specific codebase:**
- See `CLAUDE.md` for full developer guide
- See `docs/WEBKIT_FIX_GUIDE.md` for detailed analysis
- Check commit history for context: `git log --grep="webkit" --grep="safari" -i`

---

## ✨ Lessons Learned

### Do's
✅ **Always test in Safari during development** (not just Chrome)
✅ **Render children immediately** from context providers
✅ **Use useEffect for initialization** (but don't block rendering)
✅ **Accept minor theme flash** (better than blank page)
✅ **Add comments** explaining why you removed "anti-flash" patterns

### Don'ts
❌ **Don't return null** from providers to "prevent flash"
❌ **Don't assume Chrome behavior** = all browsers
❌ **Don't suppress React warnings** without understanding them
❌ **Don't skip manual testing** in multiple browsers
❌ **Don't optimize UX** at the expense of compatibility

### Key Insight
> "The pattern `if (!mounted) return null` is a common React anti-pattern that happens to work in Chromium but breaks WebKit. The correct approach is to render immediately and accept a brief (imperceptible) theme flash rather than no app at all."

---

**Checklist Version:** 1.0
**Last Updated:** 2026-01-31
**Maintained By:** Development Team
