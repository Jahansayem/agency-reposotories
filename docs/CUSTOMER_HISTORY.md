# Customer History & Interaction Tracking

## Overview

Comprehensive audit log of all customer touchpoints including completed tasks and contact attempts. Provides timeline view in customer detail panel and retroactive linking tool for historical data.

## Features

### 1. Automatic Interaction Logging

**Task Completion:**
- Triggers when task is marked complete (via `trigger_log_task_completion` on `todos`)
- Logs `task_completed` interaction type
- Includes priority, due date, assignee in metadata
- Sets `completed_at` timestamp automatically
- Non-blocking: warnings only on error, never prevents task completion

**Contact Attempts:**
- Triggered by `trigger_log_contact_interaction` on `contact_history` inserts
- Logs contact method, outcome, notes
- Links via opportunity or direct customer reference

### 2. Timeline View

**Location:** Customer Detail Panel > "Interaction History" section

**Display:**
- Chronological (newest first)
- Icon-coded by type (checkmark for tasks, phone for contacts, note for notes)
- Relative timestamps ("Just now", "2h ago", "3d ago")
- Expandable contact details (method, outcome, notes)
- Pagination with "Load older interactions" button (20 per page)

### 3. Manual Interaction Logging

**API:** `POST /api/interactions/log`

Supports `contact_attempt` and `note_added` types for ad-hoc logging outside of automated triggers.

### 4. Retroactive Linking Tool

**Location:** `/customers/link-history` (admin only)

**Workflow:**
1. Click "Find Matches" to scan unlinked completed tasks
2. Review suggested customer matches with confidence scores
3. Filter by confidence level (High >= 70%, Medium 40-69%)
4. Approve individual matches or bulk-approve high confidence
5. Click "Apply Links" to create customer links + interaction records

**Confidence Scoring:**
- Full name match: +80%
- Last name match: +40%
- Email match: +70%
- Phone match: +60%

## API Endpoints

### GET `/api/customers/[id]/history`

Returns interaction timeline with pagination.

**Query Params:**
- `limit` (default: 50) - Items per page
- `offset` (default: 0) - Pagination offset

**Response:**
```json
{
  "interactions": [{
    "id": "uuid",
    "interactionType": "task_completed",
    "summary": "Completed: Call customer",
    "details": { "priority": "high" },
    "createdBy": "uuid",
    "createdByName": "Adrian",
    "createdAt": "2026-02-19T10:30:00Z",
    "relatedTask": { "id": "uuid", "text": "...", "completed": true }
  }],
  "pagination": {
    "total": 127,
    "hasMore": true,
    "offset": 0,
    "limit": 50
  }
}
```

### POST `/api/interactions/log`

Manual interaction logging (ad-hoc notes, contacts).

**Request:**
```json
{
  "customerId": "uuid",
  "type": "contact_attempt",
  "summary": "Called customer about renewal",
  "details": {
    "method": "phone",
    "outcome": "voicemail"
  }
}
```

### GET `/api/admin/retroactive-matches`

Find potential customer matches for unlinked completed tasks.

**Response:**
```json
{
  "matches": [{
    "taskId": "uuid",
    "customerId": "uuid",
    "customerName": "James Wilson",
    "taskText": "Call Wilson about policy",
    "confidence": 0.85,
    "matchedOn": "Full name match"
  }]
}
```

### POST `/api/admin/apply-retroactive-links`

Apply approved customer links.

**Request:**
```json
{
  "approvedMatches": [
    { "taskId": "uuid", "customerId": "uuid" }
  ]
}
```

**Response:**
```json
{
  "success": 15,
  "failed": 0,
  "errors": []
}
```

## Database Schema

### Table: `customer_interactions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agency_id | UUID | Agency isolation (RLS) |
| customer_id | UUID | FK to customer_insights |
| interaction_type | TEXT | task_completed, subtask_completed, contact_attempt, task_created, note_added |
| task_id | UUID | Related task (nullable) |
| subtask_id | UUID | Related subtask (nullable) |
| summary | TEXT | Human-readable summary |
| details | JSONB | Flexible metadata |
| created_by | UUID | FK to users |
| created_at | TIMESTAMPTZ | When it happened |
| search_vector | TSVECTOR | Full-text search (generated) |

### Triggers

**`trigger_log_task_completion`** (BEFORE UPDATE on `todos`):
- Fires when `completed` changes to `true`
- Sets `completed_at` timestamp
- Inserts interaction record if `customer_id` is present
- Looks up user UUID from `updated_by` name field

**`trigger_log_contact_interaction`** (AFTER INSERT on `contact_history`):
- Resolves customer via opportunity or direct link
- Inserts interaction record

## Testing

**Unit Tests:**
- `src/lib/retroactiveLinking.test.ts` — 26 tests for matching algorithm

**E2E Tests:**
- `tests/customer-history.spec.ts` — Timeline display, interaction logging, API endpoints

**Manual Testing:**
1. Complete a task linked to customer -> verify interaction appears in timeline
2. Log contact via contact form -> verify appears in timeline
3. Run retroactive matching -> verify matches found with correct confidence
4. Apply links -> verify tasks get customer_id and interactions created

## Troubleshooting

**Interactions not appearing:**
- Check `customer_id` is set on task before completion
- Verify triggers are enabled: `SELECT * FROM pg_trigger WHERE tgname LIKE '%log%';`
- Check for warnings in database logs

**Retroactive matching finds no matches:**
- Ensure customers exist in `customer_insights` table
- Verify completed tasks have `customer_id IS NULL`
- Check task text contains customer name/email/phone

**Performance:**
- Interactions table has indexes on `customer_id + created_at`, `agency_id`, `interaction_type`
- GIN index on `search_vector` for full-text search
- Pagination prevents loading too many interactions at once
