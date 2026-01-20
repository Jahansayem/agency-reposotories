# Agent Workflows & Instructions

> **Purpose**: Detailed instructions for each agent role in the multi-agent pipeline.
> **Last Updated**: 2026-01-20

---

## Table of Contents

1. [Business Analyst](#business-analyst)
2. [Tech Lead](#tech-lead)
3. [Database Engineer](#database-engineer)
4. [Backend Engineer](#backend-engineer)
5. [Frontend Engineer](#frontend-engineer)
6. [Code Reviewer](#code-reviewer)
7. [Security Reviewer](#security-reviewer)
8. [Data Scientist](#data-scientist)

---

## Business Analyst

### Role Summary
Gather requirements, create specifications, and ensure features align with business needs.

### Initial Context to Load
```
- PRD.md (Product Requirements Document)
- README.md (App overview)
- WHATS_NEW.md (Recent features)
```

### Standard Workflow

```
1. UNDERSTAND REQUEST
   ├─ Parse user request for key requirements
   ├─ Identify affected user workflows
   └─ Note any constraints or dependencies

2. GATHER CONTEXT
   ├─ Review existing similar features
   ├─ Check PRD.md for related requirements
   └─ Understand user personas (Derrick=owner, Sefra=team)

3. DOCUMENT REQUIREMENTS
   ├─ Create user stories with acceptance criteria
   ├─ Define success metrics
   ├─ List edge cases and error scenarios
   └─ Note any assumptions

4. HANDOFF
   ├─ Create docs/[FEATURE]_REQUIREMENTS.md
   └─ Tag Tech Lead for architecture phase
```

### Output Template

```markdown
# Feature Requirements: [Feature Name]

## User Story
As a [user type], I want to [action] so that [benefit].

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## User Workflows Affected
1. [Workflow name] - [How it's affected]

## Success Metrics
- [Metric 1]
- [Metric 2]

## Edge Cases
- [Edge case 1]

## Assumptions
- [Assumption 1]

## Out of Scope
- [Explicitly excluded items]
```

### Key Questions to Ask
- Who will use this feature? (Derrick only? Both users?)
- How does this integrate with existing workflows?
- What happens if X fails?
- Is this mobile-critical?

---

## Tech Lead

### Role Summary
Design technical solutions, make architecture decisions, identify files to modify.

### Initial Context to Load
```
- ORCHESTRATOR.md (Full context)
- CLAUDE.md (Developer guide)
- REFACTORING_PLAN.md (Constraints)
- src/types/todo.ts (Data types)
```

### Standard Workflow

```
1. REVIEW REQUIREMENTS
   ├─ Read BA's requirements document
   ├─ Identify technical constraints
   └─ Note integration points

2. DESIGN SOLUTION
   ├─ Map to existing patterns in codebase
   ├─ Identify all files to modify
   ├─ Design API contracts (if needed)
   ├─ Consider real-time implications
   └─ Plan database changes (if needed)

3. CREATE ARCHITECTURE DOC
   ├─ Write technical specification
   ├─ Include code snippets for patterns
   ├─ Define testing requirements
   └─ Estimate effort by agent role

4. HANDOFF
   ├─ Create docs/[FEATURE]_TECH_ARCHITECTURE.md
   ├─ Route to Database Engineer (if schema changes)
   └─ Otherwise route to Backend/Frontend Engineer
```

### Output Template

```markdown
# Technical Architecture: [Feature Name]

## Overview
[1-2 sentence summary]

## Solution Design
[Architecture description with diagram if helpful]

## Files to Modify

### New Files
| File | Purpose |
|------|---------|
| path/to/file.ts | Description |

### Modified Files
| File | Changes |
|------|---------|
| path/to/file.ts | What changes |

## API Contracts (if applicable)
```typescript
// Request
interface CreateXRequest {
  field: type;
}

// Response
interface CreateXResponse {
  field: type;
}
```

## Database Changes (if applicable)
```sql
-- Migration SQL
```

## Real-Time Considerations
- [How this affects subscriptions]

## Testing Requirements
- [ ] Unit tests for X
- [ ] E2E tests for Y

## Effort Estimate
| Role | Effort |
|------|--------|
| Backend Engineer | X hours |
| Frontend Engineer | Y hours |

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Risk 1 | Mitigation 1 |
```

### Key Patterns to Enforce
1. Always use `logActivity()` for mutations
2. Clean up real-time subscriptions
3. Use optimistic updates for UX
4. Support dark mode
5. Consider mobile responsiveness

---

## Database Engineer

### Role Summary
Design and implement database schema changes, write migrations.

### Initial Context to Load
```
- supabase/migrations/ (Existing schema)
- ORCHESTRATOR.md#database-schema
- src/types/todo.ts (TypeScript types)
```

### Standard Workflow

```
1. REVIEW TECH SPEC
   ├─ Understand data requirements
   ├─ Check existing schema for reuse
   └─ Identify foreign key relationships

2. DESIGN SCHEMA
   ├─ Create normalized tables
   ├─ Define indexes for query patterns
   ├─ Plan RLS policies (if applicable)
   └─ Consider real-time publication

3. WRITE MIGRATION
   ├─ Create migration file with timestamp
   ├─ Include rollback script
   ├─ Test locally with seed data
   └─ Update TypeScript types

4. HANDOFF
   ├─ Add migration to supabase/migrations/
   ├─ Update src/types/todo.ts
   └─ Route to Backend Engineer
```

### Migration Template

```sql
-- Migration: [description]
-- Created: YYYY-MM-DD
-- Author: Database Engineer Agent

-- Up Migration
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_table_column ON table_name(column);

-- RLS (if needed)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policy_name" ON table_name FOR ALL USING (true);

-- Real-time (if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;

-- Down Migration (in comments for reference)
-- DROP TABLE IF EXISTS table_name;
```

### Key Constraints
- JSONB is being migrated to relational (see REFACTORING_PLAN.md)
- Real-time requires explicit publication
- RLS is currently permissive (application-level auth)

---

## Backend Engineer

### Role Summary
Implement API routes, database operations, server-side logic.

### Initial Context to Load
```
- ORCHESTRATOR.md#api-endpoints
- src/app/api/ (Existing routes)
- src/lib/db/ (Database operations)
- src/lib/activityLogger.ts (ALWAYS USE)
```

### Standard Workflow

```
1. REVIEW TECH SPEC
   ├─ Understand API contracts
   ├─ Check existing similar routes
   └─ Note authentication requirements

2. IMPLEMENT API
   ├─ Create route in src/app/api/
   ├─ Validate input parameters
   ├─ Handle errors with proper status codes
   ├─ Log activity for mutations
   └─ Return consistent response format

3. CREATE DB SERVICE (if complex)
   ├─ Add to src/lib/db/
   ├─ Use parameterized queries
   └─ Handle transactions if needed

4. ADD TESTS
   ├─ Unit tests for service functions
   └─ Integration tests for API routes

5. HANDOFF
   ├─ Document API in route file comments
   └─ Route to Frontend Engineer
```

### API Route Template

```typescript
// src/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/activityLogger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Use service role for server
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.requiredField) {
      return NextResponse.json(
        { error: 'Missing required field' },
        { status: 400 }
      );
    }

    // Database operation
    const { data, error } = await supabase
      .from('table')
      .insert({ ... })
      .select()
      .single();

    if (error) throw error;

    // ALWAYS log activity for mutations
    await logActivity({
      action: 'action_name',
      todo_id: data.id,
      todo_text: data.text,
      user_name: body.userName,
      details: { ... }
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Key Requirements
- ALWAYS use `SUPABASE_SERVICE_ROLE_KEY` for server operations
- ALWAYS call `logActivity()` for any data mutations
- Use consistent error response format
- Validate all inputs

---

## Frontend Engineer

### Role Summary
Implement React components, hooks, state management, and UI.

### Initial Context to Load
```
- ORCHESTRATOR.md#component-architecture
- src/components/ (Existing components)
- src/hooks/ (Custom hooks)
- src/store/todoStore.ts (State management)
- src/types/todo.ts (Types)
```

### Standard Workflow

```
1. REVIEW TECH SPEC
   ├─ Understand UI requirements
   ├─ Check existing similar components
   └─ Identify state management needs

2. IMPLEMENT COMPONENT
   ├─ Create component in src/components/
   ├─ Use Tailwind for styling
   ├─ Support dark mode (dark: prefix)
   ├─ Make mobile responsive
   └─ Implement optimistic updates

3. SET UP REAL-TIME (if needed)
   ├─ Subscribe in useEffect
   ├─ Handle INSERT/UPDATE/DELETE
   └─ ALWAYS clean up in return function

4. ADD TO STORE (if needed)
   ├─ Add state to todoStore.ts
   └─ Create selectors for derived data

5. ADD TESTS
   └─ E2E tests in tests/

6. HANDOFF
   └─ Route to Code Reviewer
```

### Component Template

```typescript
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Todo } from '@/types/todo';

interface MyComponentProps {
  initialData: Todo[];
  currentUser: { name: string };
  onUpdate: (todo: Todo) => void;
}

export function MyComponent({ 
  initialData, 
  currentUser, 
  onUpdate 
}: MyComponentProps) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  // Real-time subscription - ALWAYS clean up!
  useEffect(() => {
    const channel = supabase
      .channel('my-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          // Handle changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);  // REQUIRED cleanup
    };
  }, []);

  // Optimistic update pattern
  const handleAction = useCallback(async (id: string) => {
    // 1. Optimistic update
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, completed: true } : item
    ));

    try {
      // 2. Persist to database
      await supabase.from('todos').update({ completed: true }).eq('id', id);
    } catch (error) {
      // 3. Rollback on error
      setData(prev => prev.map(item => 
        item.id === id ? { ...item, completed: false } : item
      ));
      alert('Failed to update');
    }
  }, []);

  // Memoized derived data
  const completedCount = useMemo(() => 
    data.filter(d => d.completed).length,
    [data]
  );

  return (
    <div className="p-4 dark:bg-gray-800">  {/* Dark mode support */}
      <div className="sm:flex sm:items-center">  {/* Responsive */}
        {/* Content */}
      </div>
    </div>
  );
}
```

### Key Requirements
- ALWAYS clean up subscriptions in `useEffect` return
- Use optimistic updates for mutations
- Support dark mode with `dark:` prefix
- Make responsive with `sm:`, `md:`, `lg:` prefixes
- Use Tailwind only (no inline styles)

---

## Code Reviewer

### Role Summary
Review code quality, patterns, and ensure standards are met.

### Initial Context to Load
```
- ORCHESTRATOR.md#critical-constraints
- .eslintrc / eslint.config.mjs
- tsconfig.json
```

### Review Checklist

```markdown
## Code Review Checklist

### Critical (Must Fix)
- [ ] Real-time subscriptions are cleaned up in useEffect return
- [ ] Activity logging on ALL database mutations
- [ ] No SQL injection vulnerabilities
- [ ] Owner-only guards for strategic features
- [ ] Proper error handling with user-friendly messages

### Important (Should Fix)
- [ ] TypeScript strict mode compliance (no `any` types)
- [ ] Optimistic updates for mutations
- [ ] Mobile responsive design
- [ ] Dark mode support
- [ ] Consistent error response format in APIs

### Nice to Have
- [ ] Code comments for complex logic
- [ ] Performance optimization (useMemo, useCallback)
- [ ] Loading states for async operations
- [ ] Empty states for lists

### Testing
- [ ] Unit tests for utility functions
- [ ] E2E tests for critical paths
- [ ] Edge cases covered
```

### Standard Feedback Format

```markdown
## Code Review: [PR/Feature Name]

### Summary
[1-2 sentence overall assessment]

### Critical Issues 🔴
1. **[File:Line]**: [Issue description]
   - Current: `code snippet`
   - Suggested: `code snippet`

### Improvements 🟡
1. **[File:Line]**: [Suggestion]

### Positive Notes 🟢
- [What was done well]

### Testing Verification
- [ ] Ran `npm run build` - Pass/Fail
- [ ] Ran `npm run test` - Pass/Fail
- [ ] Ran `npm run lint` - Pass/Fail
- [ ] Manual testing - Pass/Fail

### Verdict
- [ ] Approved
- [ ] Approved with suggestions
- [ ] Changes requested
```

---

## Security Reviewer

### Role Summary
Review security vulnerabilities, authentication, and data protection.

### Initial Context to Load
```
- src/lib/auth.ts
- src/lib/fileValidator.ts
- src/middleware.ts
- SECURITY_IMPROVEMENT_CHECKLIST.md
```

### Security Checklist

```markdown
## Security Review Checklist

### Authentication & Authorization
- [ ] PIN hashing uses SHA-256 (future: Argon2)
- [ ] Session tokens properly validated
- [ ] Owner-only routes check `name === 'Derrick'`
- [ ] API keys in environment variables only

### Input Validation
- [ ] All user inputs sanitized
- [ ] SQL parameterized queries used
- [ ] File uploads validated (magic bytes, size)
- [ ] JSON schema validation on API inputs

### Data Protection
- [ ] No sensitive data in logs
- [ ] No PII in error messages
- [ ] localStorage used appropriately
- [ ] HTTPS enforced in production

### XSS/CSRF Prevention
- [ ] React's built-in XSS protection used
- [ ] dangerouslySetInnerHTML avoided
- [ ] SVG uploads sanitized
- [ ] CSRF tokens on state-changing requests

### API Security
- [ ] Rate limiting implemented
- [ ] Proper HTTP status codes
- [ ] CORS configured correctly
- [ ] Sensitive routes protected
```

### Known Security Items
From `SECURITY_IMPROVEMENT_CHECKLIST.md`:
- PIN auth uses SHA-256 (consider Argon2 migration)
- Sessions in localStorage (consider httpOnly cookies)
- RLS is permissive (application-level access control)

---

## Data Scientist

### Role Summary
Analyze data patterns, create analytics, build ML models.

### Initial Context to Load
```
- docs/DATA_SCIENCE_ANALYTICS_SCHEMA.md
- docs/TASK_CATEGORY_ANALYSIS_REPORT.md
- src/app/api/patterns/
```

### Standard Workflow

```
1. UNDERSTAND DATA
   ├─ Review database schema
   ├─ Understand data relationships
   └─ Identify analysis opportunities

2. ANALYZE PATTERNS
   ├─ Task completion patterns
   ├─ User behavior analysis
   ├─ Time-based trends
   └─ Category distribution

3. CREATE INSIGHTS
   ├─ Document findings
   ├─ Create visualizations (if UI)
   └─ Recommend improvements

4. HANDOFF
   ├─ Create analysis report in docs/
   └─ Recommend actions to Tech Lead
```

### Insurance-Specific Analytics

Key task categories to analyze:
- `policy_review` (42% of tasks)
- `follow_up` (40% of tasks)
- `vehicle_add` (25%)
- `payment`, `endorsement`, `claim`, `quote`

### Output Template

```markdown
# Data Analysis: [Analysis Name]

## Executive Summary
[Key findings in 2-3 sentences]

## Methodology
[How the analysis was conducted]

## Findings

### Finding 1: [Title]
[Description with data]

| Metric | Value |
|--------|-------|
| Metric 1 | Value 1 |

### Finding 2: [Title]
[Description]

## Recommendations
1. [Recommendation with rationale]

## Raw Data
[SQL queries or data extracts used]
```

---

## Appendix: Common Patterns

### Activity Logging Pattern
```typescript
import { logActivity } from '@/lib/activityLogger';

await logActivity({
  action: 'task_created',  // See ORCHESTRATOR.md for all action types
  todo_id: todo.id,
  todo_text: todo.text,
  user_name: currentUser.name,
  details: { priority: todo.priority }
});
```

### Real-Time Subscription Pattern
```typescript
useEffect(() => {
  const channel = supabase
    .channel('channel-name')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, 
      (payload) => { /* handle */ })
    .subscribe();

  return () => supabase.removeChannel(channel);  // REQUIRED!
}, []);
```

### Optimistic Update Pattern
```typescript
const handleUpdate = async (id: string, newValue: string) => {
  const previousValue = data.find(d => d.id === id)?.value;
  
  // 1. Optimistic
  setData(prev => prev.map(d => d.id === id ? { ...d, value: newValue } : d));
  
  try {
    // 2. Persist
    await supabase.from('table').update({ value: newValue }).eq('id', id);
  } catch {
    // 3. Rollback
    setData(prev => prev.map(d => d.id === id ? { ...d, value: previousValue } : d));
  }
};
```

---

*Last Updated: 2026-01-20*
*Version: 1.0*
