# Customer History & Interaction Tracking - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-02-19
**Author:** Claude Code (with Adrian Stier)
**Status:** Approved

---

## Goal

Build a comprehensive customer history feature that tracks all customer interactions (completed tasks, subtasks, and contact attempts) with a timeline view in the Customers section. Enable retroactive linking of old completed tasks to customers via intelligent matching with manual review.

---

## Architecture

**Approach:** Event-Based History Table

Create a new `customer_interactions` table that serves as an audit log for all customer touchpoints. Database triggers automatically capture interactions when tasks complete or contacts are made. Frontend displays a chronological timeline of all interactions when viewing a customer.

**Key Design Decisions:**
- **Single source of truth:** All interactions logged to one table for fast queries
- **Non-blocking logging:** Interaction logging failures don't prevent task completion
- **Retroactive linking:** Intelligent name matching with confidence scoring + manual review UI
- **Timeline UI:** Chronological view (newest first) integrated into CustomerDetailPanel

---

## Tech Stack

**Backend:**
- PostgreSQL triggers for automatic interaction logging
- Supabase RLS policies for multi-agency isolation
- JSONB for flexible interaction metadata

**Frontend:**
- React Query for data fetching
- Collapsible timeline section in CustomerDetailPanel
- New admin page `/customers/link-history` for retroactive matching review

**Infrastructure:**
- Database migration for `customer_interactions` table
- Background repair job (cron) to catch missed interactions
- Full-text search on interaction summaries

---

## Database Schema

### New Table: `customer_interactions`

```sql
CREATE TABLE customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customer_insights(id) ON DELETE CASCADE,

  -- Interaction type
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'task_completed',
    'subtask_completed',
    'contact_attempt',
    'task_created',      -- Optional: log when tasks are first created
    'note_added'         -- Optional: for future manual notes
  )),

  -- References to related records
  task_id UUID REFERENCES todos(id) ON DELETE SET NULL,
  subtask_id UUID,  -- Reference to subtask (if tracked separately)

  -- Interaction details
  summary TEXT NOT NULL,  -- e.g., "Completed: Call James Wilson about renewal"
  details JSONB,          -- Flexible metadata (outcome, method, notes, etc.)

  -- Who and when
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', summary || ' ' || COALESCE(details::text, ''))
  ) STORED
);

-- Indexes
CREATE INDEX idx_customer_interactions_customer ON customer_interactions(customer_id, created_at DESC);
CREATE INDEX idx_customer_interactions_agency ON customer_interactions(agency_id);
CREATE INDEX idx_customer_interactions_type ON customer_interactions(interaction_type);
CREATE INDEX idx_customer_interactions_search ON customer_interactions USING GIN(search_vector);

-- RLS Policy
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency isolation for customer interactions" ON customer_interactions
  FOR ALL USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
```

### Schema Updates to Existing Tables

```sql
-- Add completed_at timestamp to todos (currently missing!)
ALTER TABLE todos ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Extend contact_history to support general customer contacts
ALTER TABLE contact_history
  ADD COLUMN customer_id UUID REFERENCES customer_insights(id),
  ALTER COLUMN opportunity_id DROP NOT NULL;  -- Make optional

-- Add index for customer lookup on contact_history
CREATE INDEX idx_contact_history_customer ON contact_history(customer_id);
```

---

## Data Collection

### Automatic Logging via Database Triggers

**Task Completion Trigger:**

```sql
CREATE OR REPLACE FUNCTION log_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when task transitions to completed
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    -- Update completed_at timestamp
    NEW.completed_at := NOW();

    -- Log interaction if task is linked to customer
    IF NEW.customer_id IS NOT NULL THEN
      BEGIN
        INSERT INTO customer_interactions (
          agency_id,
          customer_id,
          interaction_type,
          task_id,
          summary,
          details,
          created_by,
          created_at
        ) VALUES (
          NEW.agency_id,
          NEW.customer_id,
          CASE
            WHEN NEW.parent_id IS NOT NULL THEN 'subtask_completed'
            ELSE 'task_completed'
          END,
          NEW.id,
          CASE
            WHEN NEW.parent_id IS NOT NULL THEN 'Completed subtask: ' || NEW.text
            ELSE 'Completed: ' || NEW.text
          END,
          jsonb_build_object(
            'priority', NEW.priority,
            'due_date', NEW.due_date,
            'assigned_to', NEW.assigned_to
          ),
          NEW.updated_by,
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't block task completion
        RAISE WARNING 'Failed to log interaction for task %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_task_completion
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION log_task_completion();
```

**Contact History Trigger:**

```sql
CREATE OR REPLACE FUNCTION log_contact_interaction()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_agency_id UUID;
BEGIN
  -- Get customer_id and agency_id
  IF NEW.opportunity_id IS NOT NULL THEN
    -- Link via opportunity
    SELECT o.agency_id, ci.id INTO v_agency_id, v_customer_id
    FROM cross_sell_opportunities o
    JOIN customer_insights ci ON ci.customer_name = o.customer_name
    WHERE o.id = NEW.opportunity_id;
  ELSIF NEW.customer_id IS NOT NULL THEN
    -- Direct customer link
    SELECT agency_id INTO v_agency_id
    FROM customer_insights
    WHERE id = NEW.customer_id;
    v_customer_id := NEW.customer_id;
  END IF;

  -- Log interaction if we found customer
  IF v_customer_id IS NOT NULL THEN
    INSERT INTO customer_interactions (
      agency_id,
      customer_id,
      interaction_type,
      summary,
      details,
      created_by,
      created_at
    ) VALUES (
      v_agency_id,
      v_customer_id,
      'contact_attempt',
      format('Contact via %s: %s', NEW.contact_method, NEW.contact_outcome),
      jsonb_build_object(
        'method', NEW.contact_method,
        'outcome', NEW.contact_outcome,
        'notes', NEW.notes,
        'next_action', NEW.next_action
      ),
      NEW.user_id,
      NEW.contacted_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_contact_interaction
  AFTER INSERT ON contact_history
  FOR EACH ROW
  EXECUTE FUNCTION log_contact_interaction();
```

---

## Backend API

### New Endpoints

**1. GET `/api/customers/[customerId]/history`**

Returns paginated timeline of all interactions.

```typescript
Response: {
  interactions: Array<{
    id: string;
    type: 'task_completed' | 'subtask_completed' | 'contact_attempt';
    summary: string;
    details: object;
    createdBy: string;
    createdByName: string;
    createdAt: string;
    relatedTask?: { id: string; text: string };
  }>;
  pagination: {
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}
```

**2. POST `/api/interactions/log`**

Manual interaction logging (for ad-hoc notes, phone calls not in system).

```typescript
Request: {
  customerId: string;
  type: 'contact_attempt' | 'note_added';
  summary: string;
  details?: {
    method?: 'phone' | 'email' | 'in_person';
    outcome?: string;
    notes?: string;
  };
}
```

**3. GET `/api/customers/[customerId]/stats`**

Enhanced to include interaction statistics.

```typescript
Response: {
  totalInteractions: number;
  lastContactDate: string;
  completedTasks: number;
  recentActivity: Array<{ date: string; count: number }>;  // Last 7 days
  // ... existing stats
}
```

**4. GET `/api/admin/retroactive-matches`**

For retroactive linking tool (admin only).

```typescript
Response: {
  matches: Array<{
    taskId: string;
    customerId: string;
    customerName: string;
    taskText: string;
    confidence: number;  // 0-1
    matchedOn: string;   // "Full name match" | "Last name + context"
  }>;
}
```

**5. POST `/api/admin/apply-retroactive-links`**

Apply approved matches.

```typescript
Request: {
  approvedMatches: Array<{ taskId: string; customerId: string }>;
}
```

---

## Retroactive Linking Tool

### Matching Algorithm

**Confidence Scoring:**

```typescript
function calculateMatchConfidence(taskText: string, customer: Customer): number {
  let score = 0;
  const text = taskText.toLowerCase();

  // Full name exact match = very high confidence
  if (text.includes(customer.customer_name.toLowerCase())) {
    score += 0.8;
  }

  // Last name match = medium confidence
  const lastName = customer.customer_name.split(' ').pop()?.toLowerCase();
  if (lastName && lastName.length > 3 && text.includes(lastName)) {
    score += 0.4;
  }

  // Email match = high confidence
  if (customer.customer_email && text.includes(customer.customer_email.toLowerCase())) {
    score += 0.7;
  }

  // Phone match = high confidence
  if (customer.customer_phone) {
    const cleanPhone = customer.customer_phone.replace(/\D/g, '');
    if (text.includes(cleanPhone)) {
      score += 0.6;
    }
  }

  return Math.min(score, 1.0);
}
```

**Thresholds:**
- **>= 0.7:** High confidence (show with green indicator, bulk approve option)
- **0.4 - 0.69:** Medium confidence (show with yellow indicator, require individual review)
- **< 0.4:** Low confidence (don't show, avoid noise)

### Review UI

New admin page: `/customers/link-history`

**Features:**
- Table showing potential matches sorted by confidence
- Filter by confidence level (High / Medium / All)
- Preview of task text and customer name
- Bulk actions: "Approve All High Confidence", "Approve Selected", "Reject Selected"
- Individual approve/reject buttons per row
- Undo capability (in case of accidental approval)

**Workflow:**
1. Admin clicks "Find Matches" button
2. System scans all completed tasks without `customer_id`
3. Displays matches in table with confidence indicators
4. Admin reviews and approves matches
5. System applies links and creates retroactive interaction records

---

## Frontend Components

### Updated CustomerDetailPanel

Add fourth collapsible section for "Interaction History":

```typescript
<CollapsibleSection
  title="Interaction History"
  count={historyStats?.totalInteractions || 0}
  expanded={expandedSection === 'history'}
  onToggle={() => setExpandedSection(expandedSection === 'history' ? null : 'history')}
  icon={History}
  iconColor="text-gray-500"
>
  <InteractionTimeline
    customerId={customerId}
    onViewTask={onViewTask}
  />
</CollapsibleSection>
```

### InteractionTimeline Component

**Features:**
- Chronological display (newest first)
- Icon and color coding by interaction type
- Relative timestamps ("2h ago", "3d ago")
- Expandable details for contact attempts
- "View task" links for task-related interactions
- Infinite scroll / "Load more" pagination
- Empty state when no interactions

**Visual Design:**
```
[Icon] Summary                    Relative Time
       Metadata (user, method, outcome)
       [Expandable notes if present]
       [View task link if applicable]
       ─────────────────────────────────
```

**Icon Colors:**
- ✅ Task completed: Green CheckCircle
- ✅ Subtask completed: Blue CheckCircle
- 📞 Contact attempt: Purple Phone
- 📝 Note added: Gray Note (future)

---

## Error Handling

### Non-Blocking Logging

**Problem:** Interaction logging failure shouldn't prevent task completion.

**Solution:** Wrap logging in `EXCEPTION` block within trigger (see trigger code above).

### Background Repair Job

Daily cron job to catch missed interactions:

```typescript
async function repairMissingInteractions() {
  // Find completed tasks with customer_id but no interaction record
  const { data: missed } = await supabase.rpc('find_missing_interactions', {
    since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()  // Last 24h
  });

  for (const task of missed) {
    await supabase.from('customer_interactions').insert({
      customer_id: task.customer_id,
      interaction_type: task.parent_id ? 'subtask_completed' : 'task_completed',
      task_id: task.id,
      summary: `Completed: ${task.text}`,
      details: { repaired: true },
      created_at: task.completed_at || task.updated_at,
      created_by: task.updated_by
    });
  }
}
```

### UI Error States

- **Loading:** Skeleton placeholders
- **Error:** Red banner with "Try again" button
- **Empty:** "No interactions recorded yet" message with friendly icon

---

## Testing Strategy

### Unit Tests

**Trigger Logic:**
```typescript
test('logs task completion interaction', async () => {
  const task = await createTask({ customer_id: customerId });
  await completeTask(task.id);

  const interactions = await getInteractions(customerId);
  expect(interactions[0].interaction_type).toBe('task_completed');
  expect(interactions[0].summary).toContain('Completed:');
});

test('logs subtask separately from parent', async () => {
  const parent = await createTask({ customer_id: customerId });
  const subtask = await createSubtask(parent.id);
  await completeTask(subtask.id);

  const interactions = await getInteractions(customerId);
  expect(interactions[0].interaction_type).toBe('subtask_completed');
});

test('does not fail task completion if logging fails', async () => {
  // Simulate constraint violation in interactions table
  await supabase.rpc('break_interactions_table');

  const task = await completeTask(taskId);
  expect(task.completed).toBe(true);  // Task still completed
});
```

**Matching Algorithm:**
```typescript
test('high confidence for full name match', () => {
  const match = calculateMatchConfidence(
    'Call James Wilson about renewal',
    { customer_name: 'James Wilson' }
  );
  expect(match).toBeGreaterThanOrEqual(0.7);
});

test('medium confidence for last name only', () => {
  const match = calculateMatchConfidence(
    'Follow up with Wilson',
    { customer_name: 'James Wilson' }
  );
  expect(match).toBeGreaterThan(0.3);
  expect(match).toBeLessThan(0.7);
});
```

### E2E Tests

**Timeline Display:**
```typescript
test('shows completed tasks in customer history', async ({ page }) => {
  await loginAs(page, 'Admin');
  await createTask(page, { customerName: 'James Wilson', text: 'Call about renewal' });
  await completeTask(page);

  await page.click('[data-customer="James Wilson"]');
  await page.click('text=Interaction History');

  await expect(page.locator('text=Completed: Call about renewal')).toBeVisible();
  await expect(page.locator('text=Just now')).toBeVisible();
});
```

**Retroactive Linking:**
```typescript
test('matches and links old tasks to customers', async ({ page }) => {
  // Create unlinked task
  await createTaskWithoutCustomer(page, 'Call James Wilson');
  await completeTask(page);

  // Run retroactive matching
  await page.goto('/customers/link-history');
  await page.click('text=Find Matches');

  await expect(page.locator('text=James Wilson').first()).toBeVisible();
  await expect(page.locator('[data-confidence="high"]')).toBeVisible();

  await page.click('text=Approve All High Confidence');

  // Verify link was created
  await page.goto('/customers');
  await page.click('[data-customer="James Wilson"]');
  await page.click('text=Interaction History');
  await expect(page.locator('text=Call James Wilson')).toBeVisible();
});
```

---

## Migration Path

### Phase 1: Foundation (Week 1)
1. Create `customer_interactions` table
2. Add `completed_at` to `todos`
3. Set up database triggers
4. Deploy with logging enabled but no UI

### Phase 2: Timeline UI (Week 1-2)
1. Build InteractionTimeline component
2. Add History section to CustomerDetailPanel
3. Create API endpoints
4. Deploy to production

### Phase 3: Retroactive Linking (Week 2)
1. Build matching algorithm
2. Create admin review UI
3. Test on staging data
4. Run one-time migration on production

### Phase 4: Enhancements (Future)
- Contact form integration for easier logging
- Manual note-adding UI
- Export history to PDF/CSV
- Activity heatmap visualization

---

## Success Metrics

**Post-Launch (30 days):**
- 100% of completed customer-linked tasks logged as interactions
- Average of 5+ interactions per active customer
- <1% trigger failure rate (monitored via warnings)
- Retroactive linking connects 60%+ of old completed tasks

**User Feedback:**
- Agents find history useful for customer context
- Reduced duplicate work (checking past interactions)
- Faster response to "what did we discuss last time?" questions

---

## Open Questions

1. **Historical data scope:** How far back should retroactive matching go? (Recommend: 6 months)
2. **Permissions:** Should all users see full history or filter by their own interactions?
3. **Retention:** Should we archive/delete old interactions after X years?
4. **Notifications:** Alert assigned agent when contact attempt is logged by someone else?

---

## Appendices

### A. Database Functions Reference

```sql
-- Find tasks missing interaction records (for repair job)
CREATE OR REPLACE FUNCTION find_missing_interactions(since TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  task_id UUID,
  customer_id UUID,
  text TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  parent_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.customer_id, t.text, t.completed_at, t.parent_id
  FROM todos t
  LEFT JOIN customer_interactions ci ON ci.task_id = t.id
  WHERE t.completed = true
    AND t.customer_id IS NOT NULL
    AND t.completed_at >= since
    AND ci.id IS NULL;
END;
$$ LANGUAGE plpgsql;
```

### B. Type Definitions

```typescript
interface CustomerInteraction {
  id: string;
  customerId: string;
  interactionType: 'task_completed' | 'subtask_completed' | 'contact_attempt' | 'note_added';
  summary: string;
  details: {
    priority?: string;
    due_date?: string;
    method?: 'phone' | 'email' | 'in_person';
    outcome?: string;
    notes?: string;
    retroactive_link?: boolean;
  };
  taskId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

interface MatchReviewItem {
  taskId: string;
  customerId: string;
  customerName: string;
  taskText: string;
  confidence: number;
  matchedOn: string;
  status: 'pending' | 'approved' | 'rejected';
}
```

---

**End of Design Document**
