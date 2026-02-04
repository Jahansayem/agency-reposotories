# API Documentation

**Last Updated:** February 2026
**Version:** 3.0 (Sprint 3 Complete)

This document provides comprehensive API documentation for all endpoints in the Bealer Agency Todo List application.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Todo Endpoints](#todo-endpoints)
3. [AI Endpoints](#ai-endpoints)
4. [Outlook Integration](#outlook-integration)
5. [Chat & Messages](#chat--messages)
6. [Goals & Strategic Planning](#goals--strategic-planning)
7. [Push Notifications](#push-notifications)
8. [Activity & Analytics](#activity--analytics)
9. [File Attachments](#file-attachments)
10. [Templates](#templates)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

---

## Authentication

All API endpoints use session-based authentication via cookies. Users authenticate using their PIN, and a session is stored in localStorage.

### Session Structure
```typescript
interface Session {
  userId: string;
  userName: string;
  loginAt: string;
}
```

Stored in: `localStorage.getItem('todoSession')`

### Outlook Integration Authentication

Outlook endpoints require API key authentication via the `X-API-Key` header.

```typescript
headers: {
  'X-API-Key': process.env.OUTLOOK_ADDON_API_KEY
}
```

---

## Todo Endpoints

### GET /api/todos

Fetch all todos (optionally filtered).

**Query Parameters:**
- `userId` (optional): Filter by assigned user ID
- `status` (optional): Filter by status ('todo' | 'in_progress' | 'done')
- `completed` (optional): Filter by completion status (boolean)

**Response:**
```json
{
  "todos": [
    {
      "id": "uuid",
      "text": "Call John about policy renewal",
      "completed": false,
      "status": "in_progress",
      "priority": "high",
      "created_at": "2026-02-01T10:00:00Z",
      "created_by": "Derrick",
      "assigned_to": "Derrick",
      "due_date": "2026-02-05T17:00:00Z",
      "notes": "Customer prefers afternoon calls",
      "recurrence": null,
      "updated_at": "2026-02-01T11:00:00Z",
      "updated_by": "Derrick",
      "subtasks": [
        {
          "id": "uuid",
          "text": "Review current coverage",
          "completed": true,
          "priority": "medium",
          "estimatedMinutes": 15
        }
      ],
      "attachments": [
        {
          "id": "uuid",
          "file_name": "policy.pdf",
          "file_type": "pdf",
          "file_size": 1048576,
          "mime_type": "application/pdf",
          "storage_path": "todos/uuid/policy.pdf",
          "uploaded_by": "Derrick",
          "uploaded_at": "2026-02-01T10:30:00Z"
        }
      ],
      "transcription": null,
      "merged_from": null
    }
  ]
}
```

### POST /api/todos

Create a new todo.

**Request Body:**
```json
{
  "text": "Call John about policy renewal",
  "priority": "high",
  "assignedTo": "Derrick",
  "dueDate": "2026-02-05T17:00:00Z",
  "notes": "Customer prefers afternoon calls",
  "subtasks": [
    {
      "text": "Review current coverage",
      "priority": "medium",
      "estimatedMinutes": 15
    }
  ],
  "createdBy": "Derrick"
}
```

**Response:** Same as GET /api/todos (single todo object)

### PUT /api/todos/:id

Update an existing todo.

**Request Body:** Partial todo object (only fields to update)

**Response:** Updated todo object

### DELETE /api/todos/:id

Delete a todo.

**Response:**
```json
{
  "success": true
}
```

### GET /api/todos/waiting

Get todos waiting on external dependencies.

**Query Parameters:**
- `userId` (optional): Filter by user

**Response:** Array of todos with `waiting_on` field

### POST /api/todos/check-waiting

Check if any waiting todos can be updated based on dependencies resolved.

**Request Body:**
```json
{
  "completedTodoId": "uuid"
}
```

**Response:**
```json
{
  "updated": 3,  // Number of todos updated
  "todos": [...]
}
```

---

## AI Endpoints

### POST /api/ai/smart-parse

Parse natural language text into structured task + subtasks.

**Request Body:**
```json
{
  "text": "Call John about his auto policy renewal by Friday. Need to: review coverage, calculate premium, prepare quote",
  "users": ["Derrick", "Sefra"]
}
```

**Response:**
```json
{
  "mainTask": {
    "text": "Call John about auto policy renewal",
    "priority": "high",
    "assignedTo": "Derrick",
    "dueDate": "2026-02-07"
  },
  "subtasks": [
    {
      "text": "Review current coverage",
      "priority": "medium",
      "estimatedMinutes": 20
    },
    {
      "text": "Calculate new premium",
      "priority": "medium",
      "estimatedMinutes": 30
    },
    {
      "text": "Prepare renewal quote",
      "priority": "high",
      "estimatedMinutes": 45
    }
  ]
}
```

### POST /api/ai/enhance-task

Improve task clarity and extract metadata.

**Request Body:**
```json
{
  "text": "call john asap about thing",
  "users": ["Derrick", "Sefra"]
}
```

**Response:**
```json
{
  "enhancedText": "Call John about policy matter (urgent)",
  "priority": "urgent",
  "suggestions": {
    "assignedTo": "Derrick",
    "notes": "Follow up on policy-related issue - clarify specific topic before calling"
  }
}
```

### POST /api/ai/breakdown-task

Generate detailed subtasks for a complex task.

**Request Body:**
```json
{
  "taskText": "Onboard new commercial client",
  "taskContext": "Large manufacturing company, 50 employees, multiple coverage needs"
}
```

**Response:**
```json
{
  "subtasks": [
    {
      "text": "Collect business information and documentation",
      "priority": "high",
      "estimatedMinutes": 30
    },
    {
      "text": "Assess coverage needs and risk factors",
      "priority": "high",
      "estimatedMinutes": 45
    },
    {
      "text": "Obtain quotes from multiple carriers",
      "priority": "high",
      "estimatedMinutes": 60
    },
    {
      "text": "Prepare presentation for client",
      "priority": "medium",
      "estimatedMinutes": 40
    },
    {
      "text": "Schedule client meeting to review options",
      "priority": "medium",
      "estimatedMinutes": 15
    }
  ]
}
```

### POST /api/ai/transcribe

Transcribe audio to text using Whisper, optionally parse as tasks.

**Request:** Multipart form data
- `audio`: Audio file (WAV, MP3, M4A, etc.)

**Query Parameters:**
- `mode`: `'text'` (transcript only) or `'tasks'` (parse into tasks)
- `users`: JSON array of user names (if mode=tasks) - e.g., `["Derrick","Sefra"]`

**Response (mode=text):**
```json
{
  "transcription": "John called about his policy renewal. Needs quote by end of week."
}
```

**Response (mode=tasks):**
```json
{
  "tasks": [
    {
      "text": "Follow up on John's policy renewal request",
      "priority": "high",
      "assignedTo": "Derrick",
      "dueDate": "2026-02-07",
      "transcription": "John called about his policy renewal. Needs quote by end of week.",
      "notes": "Customer needs quote by end of week"
    }
  ]
}
```

### POST /api/ai/parse-voicemail

Extract actionable task from voicemail transcription.

**Request Body:**
```json
{
  "transcription": "Hi this is Sarah Johnson, policy number 12345. I need to add my daughter to my auto policy. Please call me back at 555-1234.",
  "users": ["Derrick", "Sefra"]
}
```

**Response:** Same as smart-parse (mainTask + subtasks)

### POST /api/ai/parse-file

Extract text and tasks from uploaded documents (PDF, Word, etc.).

**Request:** Multipart form data
- `file`: Document file

**Response:** Similar to smart-parse with extracted content

### POST /api/ai/parse-content-to-subtasks

Convert bullet points or paragraphs into subtasks.

**Request Body:**
```json
{
  "content": "- Review policy documents\n- Calculate premium\n- Send quote to customer",
  "parentTaskText": "Process renewal request"
}
```

**Response:**
```json
{
  "subtasks": [
    {
      "text": "Review policy documents",
      "priority": "high",
      "estimatedMinutes": 20
    },
    {
      "text": "Calculate premium",
      "priority": "medium",
      "estimatedMinutes": 30
    },
    {
      "text": "Send quote to customer",
      "priority": "high",
      "estimatedMinutes": 15
    }
  ]
}
```

### POST /api/ai/generate-email

Generate professional customer email from completed tasks.

**Request Body:**
```json
{
  "customerName": "John Smith",
  "tasks": [
    {
      "text": "Process auto policy renewal",
      "notes": "Discussed coverage options with customer",
      "completed": true,
      "subtasks": [
        {
          "text": "Review current coverage",
          "completed": true
        },
        {
          "text": "Calculate new premium",
          "completed": true
        },
        {
          "text": "Prepare renewal quote",
          "completed": true
        }
      ],
      "transcription": "Customer mentioned interest in higher liability limits",
      "attachments": [
        {
          "file_name": "renewal_quote.pdf",
          "file_type": "pdf"
        }
      ]
    }
  ],
  "tone": "friendly"  // or "formal" or "brief"
}
```

**Response:**
```json
{
  "subject": "Your Auto Policy Renewal Quote",
  "body": "Hi John,\n\nI wanted to reach out regarding your auto policy renewal that we discussed...",
  "warnings": [
    {
      "type": "date_promise",
      "message": "Email mentions 'by Friday' - verify this deadline is achievable",
      "severity": "medium"
    }
  ]
}
```

**Warning Types:**
- `sensitive_info`: SSN, account numbers detected
- `date_promise`: Specific dates or deadlines mentioned
- `pricing`: Dollar amounts or pricing details
- `coverage_details`: Insurance coverage specifics
- `negative_news`: Denials, cancellations, bad news

### POST /api/ai/translate-email

Translate customer email to another language (future feature).

### POST /api/ai/daily-digest

Generate daily briefing for user (summary of tasks, upcoming deadlines).

**Request Body:**
```json
{
  "userId": "uuid",
  "userName": "Derrick"
}
```

**Response:**
```json
{
  "summary": "Good morning! Here's your daily briefing...",
  "tasksDueToday": 3,
  "tasksDueSoon": 7,
  "tasksOverdue": 1,
  "newMessages": 5,
  "highlights": [
    "John Smith's renewal is due today",
    "Team meeting at 2 PM",
    "3 tasks waiting on external dependencies"
  ]
}
```

---

## Outlook Integration

### GET /api/outlook/users

List all registered users (for Outlook add-in dropdown).

**Headers Required:**
```
X-API-Key: your_api_key
```

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Derrick",
      "color": "#0033A0"
    },
    {
      "id": "uuid",
      "name": "Sefra",
      "color": "#72B5E8"
    }
  ]
}
```

### POST /api/outlook/parse-email

AI-powered email parsing to extract task details.

**Headers Required:**
```
X-API-Key: your_api_key
```

**Request Body:**
```json
{
  "subject": "Policy renewal for John Smith - Auto Policy #12345",
  "body": "Email body text...",
  "from": "john.smith@example.com",
  "users": ["Derrick", "Sefra"]
}
```

**Response:**
```json
{
  "taskDescription": "Process policy renewal for John Smith - Auto Policy #12345",
  "assignedTo": "Derrick",
  "priority": "high",
  "dueDate": "2026-02-10",
  "notes": "Customer inquiry from john.smith@example.com about auto policy renewal"
}
```

### POST /api/outlook/create-task

Create a task from Outlook add-in.

**Headers Required:**
```
X-API-Key: your_api_key
```

**Request Body:**
```json
{
  "text": "Follow up on policy renewal",
  "priority": "high",
  "assignedTo": "Derrick",
  "dueDate": "2026-02-10",
  "notes": "From Outlook email",
  "createdBy": "Derrick"
}
```

**Response:** Created todo object

---

## Chat & Messages

**Note:** Chat messages are primarily managed via Supabase real-time subscriptions. These are helper endpoints for specific operations.

### POST /api/messages (hypothetical - currently client-side only)

Send a chat message.

**Request Body:**
```json
{
  "text": "Hey @Derrick, can you review this quote?",
  "createdBy": "Sefra",
  "relatedTodoId": "uuid",  // optional
  "recipient": null,        // null for team chat, user name for DMs
  "replyToId": "uuid",      // optional
  "mentions": ["Derrick"],
  "attachments": [
    {
      "id": "uuid",
      "file_name": "screenshot.png",
      "file_type": "image",
      "storage_path": "chat-attachments/message-uuid/attachment-uuid.png"
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid",
  "text": "Hey @Derrick, can you review this quote?",
  "created_by": "Sefra",
  "created_at": "2026-02-01T14:30:00Z",
  "reactions": [],
  "read_by": ["Sefra"],
  "mentions": ["Derrick"],
  "attachments": [...]
}
```

---

## Goals & Strategic Planning

### GET /api/goals

Fetch all strategic goals with categories and milestones.

**Response:**
```json
{
  "goals": [
    {
      "id": "uuid",
      "title": "Increase Annual Revenue to $2M",
      "description": "Focus on new client acquisition and policy upgrades",
      "category_id": "uuid",
      "status": "in_progress",
      "priority": "critical",
      "target_date": "2026-12-31",
      "target_value": "$2,000,000",
      "current_value": "$1,650,000",
      "progress_percent": 82,
      "notes": "On track for Q4",
      "display_order": 1,
      "created_by": "Derrick",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-02-01T10:00:00Z",
      "category": {
        "id": "uuid",
        "name": "Revenue & Growth",
        "color": "#22C55E",
        "icon": "TrendingUp"
      },
      "milestones": [
        {
          "id": "uuid",
          "goal_id": "uuid",
          "title": "Reach $1.5M in revenue",
          "completed": true,
          "target_date": "2026-06-30",
          "display_order": 1
        }
      ]
    }
  ]
}
```

### POST /api/goals

Create a new strategic goal.

**Request Body:**
```json
{
  "title": "Expand Commercial Insurance Portfolio",
  "description": "Target small to medium businesses",
  "category_id": "uuid",
  "priority": "high",
  "target_date": "2026-12-31",
  "target_value": "50 new commercial clients",
  "created_by": "Derrick"
}
```

**Response:** Created goal object

### PUT /api/goals/:id

Update an existing goal.

**Request Body:** Partial goal object

**Response:** Updated goal object

### DELETE /api/goals/:id

Delete a goal.

**Response:**
```json
{
  "success": true
}
```

### GET /api/goals/categories

Fetch all goal categories.

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Revenue & Growth",
      "color": "#22C55E",
      "icon": "TrendingUp",
      "display_order": 1
    }
  ]
}
```

### POST /api/goals/categories

Create a new goal category.

### GET /api/goals/milestones

Fetch milestones for a goal.

**Query Parameters:**
- `goalId`: Goal UUID

### POST /api/goals/milestones

Create a new milestone for a goal.

**Request Body:**
```json
{
  "goal_id": "uuid",
  "title": "Reach 25 new commercial clients",
  "target_date": "2026-06-30",
  "display_order": 1
}
```

---

## Push Notifications

### POST /api/push-notifications/send

Send push notification to one or more users.

**Request Body:**
```json
{
  "userId": "uuid",  // or array of user IDs: ["uuid1", "uuid2"]
  "title": "Task Reminder",
  "body": "Your task \"Call John\" is due in 1 hour",
  "type": "task_reminder",  // 'task_reminder' | 'mention' | 'task_assigned' | 'daily_digest'
  "url": "/?task=uuid",     // optional - URL to navigate to on click
  "taskId": "uuid",         // optional - related task
  "messageId": "uuid",      // optional - related message
  "data": {},               // optional - additional data
  "requireInteraction": true  // optional - keep notification until user interacts
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2,     // Number of successful sends
  "failed": 0,   // Number of failed sends
  "results": [
    {
      "userId": "uuid",
      "success": true
    }
  ]
}
```

**Notification Types:**
- `task_reminder`: Task due soon or overdue
- `mention`: User mentioned in chat
- `task_assigned`: Task assigned to user
- `daily_digest`: Daily briefing notification

---

## Activity & Analytics

### GET /api/activity

Fetch activity log.

**Query Parameters:**
- `userName` (optional): Filter by user's actions
- `limit` (optional): Number of entries to return (default: 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "action": "task_created",
      "todo_id": "uuid",
      "todo_text": "Call John about renewal",
      "user_name": "Derrick",
      "details": {
        "priority": "high",
        "assigned_to": "Derrick"
      },
      "created_at": "2026-02-01T10:00:00Z"
    }
  ]
}
```

**Action Types:**
- `task_created`, `task_updated`, `task_deleted`
- `task_completed`, `task_reopened`
- `status_changed`, `priority_changed`, `assigned_to_changed`, `due_date_changed`
- `subtask_added`, `subtask_completed`, `subtask_deleted`
- `notes_updated`
- `template_created`, `template_used`
- `attachment_added`, `attachment_removed`
- `tasks_merged`

### POST /api/activity

Log a new activity (called automatically by app, rarely manual).

**Request Body:**
```json
{
  "action": "task_completed",
  "todo_id": "uuid",
  "todo_text": "Call John about renewal",
  "user_name": "Derrick",
  "details": {}
}
```

### GET /api/patterns/analyze

Analyze task patterns for insights (AI-powered).

**Query Parameters:**
- `userId` (optional): Analyze specific user's patterns
- `timeRange`: 'week' | 'month' | 'quarter' | 'year'

**Response:**
```json
{
  "insights": [
    {
      "type": "productivity_trend",
      "summary": "Your task completion rate has increased 15% this month",
      "details": {
        "current": 87,
        "previous": 72,
        "change": 15
      }
    },
    {
      "type": "time_allocation",
      "summary": "You spend 60% of time on client-facing tasks",
      "details": {
        "categories": {
          "client_facing": 60,
          "administrative": 25,
          "planning": 15
        }
      }
    }
  ]
}
```

### GET /api/patterns/suggestions

Get AI-powered suggestions for workflow improvements.

**Response:**
```json
{
  "suggestions": [
    {
      "type": "task_template",
      "title": "Create template for renewal process",
      "reason": "You've created 12 similar renewal tasks this month",
      "estimatedTimeSaved": "30 minutes per week"
    }
  ]
}
```

---

## File Attachments

### POST /api/attachments

Upload a file attachment for a todo.

**Request:** Multipart form data
- `file`: File to upload (max 25MB)
- `todoId`: UUID of parent task
- `uploadedBy`: User name

**Response:**
```json
{
  "attachment": {
    "id": "uuid",
    "file_name": "policy_document.pdf",
    "file_type": "pdf",
    "file_size": 2048576,
    "mime_type": "application/pdf",
    "storage_path": "todos/uuid/policy_document.pdf",
    "uploaded_by": "Derrick",
    "uploaded_at": "2026-02-01T10:30:00Z"
  }
}
```

**Supported File Types:**
- **Documents:** PDF, Word, Excel, PowerPoint, TXT
- **Images:** JPEG, PNG, GIF, WebP, SVG
- **Audio:** MP3, WAV, M4A, OGG
- **Video:** MP4, WebM, MOV
- **Archives:** ZIP, RAR, 7Z

---

## Templates

### GET /api/templates

Fetch user's task templates.

**Query Parameters:**
- `userName`: User name

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Policy Renewal Process",
      "description": "Standard workflow for processing policy renewals",
      "default_priority": "high",
      "default_assigned_to": "Derrick",
      "subtasks": [
        {
          "text": "Review current policy details",
          "priority": "high",
          "estimatedMinutes": 20
        },
        {
          "text": "Calculate new premium",
          "priority": "medium",
          "estimatedMinutes": 30
        }
      ],
      "created_by": "Derrick",
      "is_shared": true,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/templates

Create a new template.

**Request Body:**
```json
{
  "name": "New Client Onboarding",
  "description": "Checklist for onboarding new clients",
  "default_priority": "high",
  "default_assigned_to": "Derrick",
  "subtasks": [
    {
      "text": "Collect client information",
      "priority": "high",
      "estimatedMinutes": 30
    }
  ],
  "created_by": "Derrick",
  "is_shared": false
}
```

**Response:** Created template object

### DELETE /api/templates

Delete a template.

**Query Parameters:**
- `id`: Template UUID

**Response:**
```json
{
  "success": true
}
```

---

## Error Handling

All endpoints return standard error responses:

### Success Response
```json
{
  "data": { /* ... */ }
}
```

### Error Response
```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Error Codes
- `INVALID_INPUT`: Request validation failed
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: User lacks required permissions
- `NOT_FOUND`: Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `AI_SERVICE_ERROR`: Claude/OpenAI API error
- `STORAGE_ERROR`: File upload/download error
- `DATABASE_ERROR`: Database operation failed

---

## Rate Limiting

**Current Limits:**
- AI endpoints: 60 requests/minute per user
- File uploads: 100 requests/hour per user
- All other endpoints: 1000 requests/hour per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1643760000
```

**Rate Limit Error Response:**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 60,
    "window": "1 minute",
    "retryAfter": 45  // seconds
  }
}
```

---

## Versioning

API version is specified in Accept header:

```
Accept: application/vnd.bealer-todo.v1+json
```

Current version: `v1`

---

**Last Updated:** February 2026
**For Questions:** See [CLAUDE.md](../CLAUDE.md) or [SPRINT_3_FEATURES.md](./SPRINT_3_FEATURES.md)
