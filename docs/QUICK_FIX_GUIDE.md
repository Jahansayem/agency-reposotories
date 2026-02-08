# Quick Fix Guide - P1-P4 Integration

**Last Updated**: 2026-02-07
**Status**: 2 high-priority fixes needed before production

---

## High Priority Fixes (Must Complete Before Production)

### [H1] Replace Hardcoded User ID

**File**: `src/components/analytics/panels/TodayOpportunitiesPanel.tsx`
**Line**: 130

**Current Code**:
```typescript
const request: ContactRequest = {
  contactMethod: 'phone',
  outcome,
  notes: notes || `Contact logged via Today panel: ${CONTACT_OUTCOME_CONFIG[outcome].label}`,
};

// ❌ PROBLEM: Hardcoded placeholder user ID
const response = await fetch(`/api/opportunities/${opportunityId}/contact`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: '00000000-0000-0000-0000-000000000000', // ❌ Placeholder
    contact_method: request.contactMethod,
    contact_outcome: request.outcome,
    notes: request.notes,
  }),
});
```

**Fixed Code**:
```typescript
import { useCurrentUser } from '@/contexts/UserContext'; // ✅ Add import

// Inside component:
const currentUser = useCurrentUser(); // ✅ Get real user

const handleLogContact = async (
  opportunityId: string,
  outcome: ContactOutcome,
  notes?: string
) => {
  setLoggingContact(opportunityId);

  try {
    const request: ContactRequest = {
      contactMethod: 'phone',
      outcome,
      notes: notes || `Contact logged via Today panel: ${CONTACT_OUTCOME_CONFIG[outcome].label}`,
    };

    // ✅ FIXED: Use real user ID from auth context
    const response = await fetch(`/api/opportunities/${opportunityId}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser?.id || '', // ✅ Real user ID
        contact_method: request.contactMethod,
        contact_outcome: request.outcome,
        notes: request.notes,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log contact');
    }

    setToastMessage({ type: 'success', message: `Contact logged: ${CONTACT_OUTCOME_CONFIG[outcome].label}` });
    setExpandedOutcomes(prev => {
      const next = new Set(prev);
      next.delete(opportunityId);
      return next;
    });
    refresh();
    setTimeout(() => setToastMessage(null), 3000);
  } catch (err) {
    logger.error('Failed to log contact', err); // ✅ Also fix console.error (see H2)
    setToastMessage({ type: 'error', message: 'Failed to log contact. Please try again.' });
    setTimeout(() => setToastMessage(null), 3000);
  } finally {
    setLoggingContact(null);
  }
};
```

**Estimated Time**: 5 minutes

---

### [H2] Replace console.log with logger.ts

**Files**: 6 instances across multiple files

**Import Required**:
```typescript
import { logger } from '@/lib/logger';
```

**Replacements**:

#### 1. TodayOpportunitiesPanel.tsx:152
```typescript
// ❌ Before
console.error('Failed to log contact:', err);

// ✅ After
logger.error('Failed to log contact', err, { component: 'TodayOpportunitiesPanel', opportunityId });
```

#### 2. TodayOpportunitiesPanel.tsx:202
```typescript
// ❌ Before
console.error('Failed to create task:', err);

// ✅ After
logger.error('Failed to create task', err, { component: 'TodayOpportunitiesPanel', opportunityId: opp.id });
```

#### 3. TodayOpportunitiesPanel.tsx:632
```typescript
// ❌ Before
console.log('Created task:', taskId);

// ✅ After
logger.info('Task created successfully', { component: 'TodayOpportunitiesPanel', taskId });
```

#### 4. TodayOpportunitiesPanel.tsx:637
```typescript
// ❌ Before
console.log('View task:', taskId);

// ✅ After
logger.info('Navigating to task', { component: 'TodayOpportunitiesPanel', taskId });
```

#### 5. CustomerSegmentationDashboard.tsx:131
```typescript
// ❌ Before
console.error('Failed to fetch segmentation:', error);

// ✅ After
logger.error('Failed to fetch segmentation', error, { component: 'CustomerSegmentationDashboard' });
```

#### 6. ConnectedBookOfBusinessDashboard.tsx:95
```typescript
// ❌ Before
console.error('Failed to fetch live data:', error);

// ✅ After
logger.error('Failed to fetch live data', error, { component: 'ConnectedBookOfBusinessDashboard' });
```

**Estimated Time**: 10 minutes

---

## Testing Checklist (After Fixes)

- [ ] Run `npm run build` - verify zero TypeScript errors
- [ ] Test TodayOpportunitiesPanel - verify contact logging uses real user
- [ ] Check production logs - verify structured logging appears
- [ ] Test multi-user scenario - verify different users log correctly
- [ ] Verify no console.log statements in production build

---

## Verification Commands

```bash
# 1. Verify TypeScript compilation
npm run build

# 2. Search for remaining console.log statements
grep -r "console\.\(log\|error\|warn\)" src/components/analytics/ src/components/views/ src/components/customer/

# 3. Verify logger import is present
grep -r "import.*logger" src/components/analytics/

# 4. Run production build
npm run build && npm start
```

---

## Deployment Checklist

- [ ] H1 Fixed: User ID from auth context
- [ ] H2 Fixed: All console.log replaced with logger
- [ ] TypeScript compilation: PASS
- [ ] Production build: SUCCESS
- [ ] Manual testing: contact logging works
- [ ] Code review: Re-run on fixed code
- [ ] Deploy to staging
- [ ] Smoke test on staging
- [ ] Deploy to production

**Estimated Total Time**: 15-20 minutes

---

**Questions?** See full review: `docs/INTEGRATION_CODE_REVIEW.md`
