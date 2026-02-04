# WebKit Compatibility - Quick Reference Card

**1-Page Developer Reference** | Print and keep at desk | Updated: 2026-01-31

---

## 🚨 The Problem (1 sentence)

React providers that return `null` during initial render cause Safari to show a blank page forever.

---

## ✅ The Solution (Code Pattern)

### ❌ WRONG (Causes Blank Page)
```typescript
export function Provider({ children }) {
  const [state, setState] = useState('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // initialization
  }, []);

  if (!mounted) return null;  // ← BREAKS SAFARI

  return <Context.Provider>{children}</Context.Provider>;
}
```

### ✅ RIGHT (Works Everywhere)
```typescript
export function Provider({ children }) {
  const [state, setState] = useState('default');

  useEffect(() => {
    // initialization
  }, []);

  return <Context.Provider>{children}</Context.Provider>;
}
```

---

## 🔍 Quick Diagnosis

```bash
# Find problematic patterns
grep -rn "if (!mounted)" src/
grep -rn "return null" src/contexts/

# Test in Safari
npx playwright test --project=webkit
```

---

## 🧪 Test Template

```typescript
// tests/webkit-check.spec.ts
import { test, expect } from '@playwright/test';

test('renders in WebKit', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit');
  await page.goto('http://localhost:3000');

  const snapshot = await page.accessibility.snapshot();
  expect(snapshot?.children?.length).toBeGreaterThan(0);
});
```

---

## 📋 3-Step Fix

1. **Remove** `mounted` state
2. **Remove** `if (!mounted) return null`
3. **Remove** `mounted` from useEffect dependencies

**That's it.** Children render immediately. Initialization still works.

---

## 🎯 Before/After

| Aspect | Before | After |
|--------|--------|-------|
| Safari | Blank page | ✅ Works |
| Chrome | Works | ✅ Works |
| Theme flash | None | < 16ms (imperceptible) |
| Code complexity | Higher | Lower |

---

## 🛡️ Why This Works

1. **First render:** Children appear with default state
2. **useEffect runs:** Loads saved state from localStorage
3. **Second render (if needed):** Updates to saved state
4. **Result:** 16ms flash vs. infinite blank page

---

## 🔗 Full Documentation

- **Detailed Guide:** `docs/WEBKIT_FIX_GUIDE.md`
- **Migration Steps:** `docs/WEBKIT_MIGRATION_CHECKLIST.md`
- **Project Docs:** `CLAUDE.md` (Browser Compatibility section)

---

## 💡 Remember

> "Always render. Never return null from providers. WebKit is not being difficult—it's being correct."

---

**Questions?** See `docs/WEBKIT_FIX_GUIDE.md` Section: Troubleshooting Guide
