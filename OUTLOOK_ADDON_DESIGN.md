# Outlook Add-In Design: Email to Todo Converter

## Overview

This add-in allows users to convert emails into tasks in the Bealer Agency todo app using AI to extract task details.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Outlook Client                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Add-in Taskpane                       │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │  "Convert to Task" Button                           ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │  Draft Task Preview                                 ││   │
│  │  │  - Task: [AI-extracted description]                 ││   │
│  │  │  - Assignee: [Dropdown with users]                  ││   │
│  │  │  - Priority: [Dropdown]                             ││   │
│  │  │  - Due Date: [Date picker]                          ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │  [Cancel]                    [Add to Todo List]     ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Server (Next.js)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /api/outlook/parse-email                          │   │
│  │  - Receives email content                               │   │
│  │  - Calls Claude AI to extract task details              │   │
│  │  - Returns structured task draft                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /api/outlook/create-task                          │   │
│  │  - Validates API key                                    │   │
│  │  - Creates task in Supabase                             │   │
│  │  - Returns success/failure                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  GET /api/outlook/users                                 │   │
│  │  - Returns list of users for assignment dropdown        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  - todos table (existing)                                       │
│  - users table (existing)                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: API Endpoints (Add to existing Next.js app)

#### 1.1 Email Parsing Endpoint
```typescript
// src/app/api/outlook/parse-email/route.ts
POST /api/outlook/parse-email
Request:
{
  "subject": "Re: Q4 Budget Review",
  "body": "Hi Derek, Please have Sefra review the Q4 budget by Friday. Thanks!",
  "sender": "john@example.com",
  "receivedDate": "2025-12-08T10:30:00Z"
}

Response:
{
  "success": true,
  "draft": {
    "text": "Review Q4 budget",
    "suggestedAssignee": "Sefra",
    "priority": "medium",
    "dueDate": "2025-12-13",
    "context": "From email by john@example.com regarding Q4 Budget Review"
  }
}
```

#### 1.2 Create Task Endpoint
```typescript
// src/app/api/outlook/create-task/route.ts
POST /api/outlook/create-task
Headers: { "X-API-Key": "your-api-key" }
Request:
{
  "text": "Review Q4 budget",
  "assignedTo": "Sefra",
  "priority": "medium",
  "dueDate": "2025-12-13",
  "createdBy": "Derek"
}

Response:
{
  "success": true,
  "taskId": "uuid-here"
}
```

#### 1.3 Users List Endpoint
```typescript
// src/app/api/outlook/users/route.ts
GET /api/outlook/users

Response:
{
  "users": ["Derek", "Sefra", "John"]
}
```

### Phase 2: Outlook Add-In Structure

```
outlook-addin/
├── manifest.xml           # Add-in manifest for Office
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html  # Main UI
│   │   ├── taskpane.css   # Styles
│   │   └── taskpane.ts    # Logic
│   └── commands/
│       └── commands.ts    # Ribbon button commands
├── assets/
│   └── icon-*.png         # Add-in icons
├── webpack.config.js
└── package.json
```

### Phase 3: Add-In Manifest (manifest.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:type="MailApp">
  <Id>bealer-agency-todo-addin</Id>
  <Version>1.0.0</Version>
  <ProviderName>Bealer Agency</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="Bealer Todo"/>
  <Description DefaultValue="Convert emails to todo items"/>

  <Hosts>
    <Host Name="Mailbox"/>
  </Hosts>

  <Requirements>
    <Sets>
      <Set Name="Mailbox" MinVersion="1.1"/>
    </Sets>
  </Requirements>

  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://your-app.railway.app/outlook/taskpane.html"/>
        <RequestedHeight>450</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>

  <Permissions>ReadItem</Permissions>

  <Rule xsi:type="ItemIs" ItemType="Message" FormType="Read"/>
</OfficeApp>
```

### Phase 4: Taskpane UI (taskpane.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Bealer Todo</title>
  <link rel="stylesheet" href="taskpane.css">
  <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
</head>
<body>
  <div id="app">
    <!-- Initial State -->
    <div id="initial-view">
      <div class="logo">
        <div class="logo-icon">B</div>
        <h1>Bealer Agency</h1>
      </div>
      <p class="subtitle">Convert this email to a task</p>
      <button id="convert-btn" class="primary-btn">
        <span class="icon">✨</span>
        Analyze Email
      </button>
    </div>

    <!-- Loading State -->
    <div id="loading-view" class="hidden">
      <div class="spinner"></div>
      <p>Analyzing email with AI...</p>
    </div>

    <!-- Draft Preview State -->
    <div id="draft-view" class="hidden">
      <h2>Task Preview</h2>

      <div class="form-group">
        <label>Task Description</label>
        <textarea id="task-text" rows="3"></textarea>
      </div>

      <div class="form-group">
        <label>Assign To</label>
        <select id="assignee">
          <option value="">Unassigned</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Priority</label>
          <select id="priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div class="form-group">
          <label>Due Date</label>
          <input type="date" id="due-date">
        </div>
      </div>

      <div class="context-box">
        <small id="context-text"></small>
      </div>

      <div class="button-row">
        <button id="cancel-btn" class="secondary-btn">Cancel</button>
        <button id="create-btn" class="primary-btn">Add Task</button>
      </div>
    </div>

    <!-- Success State -->
    <div id="success-view" class="hidden">
      <div class="success-icon">✓</div>
      <h2>Task Created!</h2>
      <p>The task has been added to the todo list.</p>
      <button id="done-btn" class="primary-btn">Done</button>
    </div>
  </div>

  <script src="taskpane.js"></script>
</body>
</html>
```

### Phase 5: Taskpane Logic (taskpane.ts)

```typescript
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    initializeAddin();
  }
});

const API_BASE = 'https://your-app.railway.app/api/outlook';
const API_KEY = 'your-secure-api-key';

let currentDraft: TaskDraft | null = null;

interface TaskDraft {
  text: string;
  suggestedAssignee: string;
  priority: string;
  dueDate: string;
  context: string;
}

async function initializeAddin() {
  // Load users for dropdown
  await loadUsers();

  // Set up event listeners
  document.getElementById('convert-btn')?.addEventListener('click', analyzeEmail);
  document.getElementById('cancel-btn')?.addEventListener('click', resetView);
  document.getElementById('create-btn')?.addEventListener('click', createTask);
  document.getElementById('done-btn')?.addEventListener('click', resetView);
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    const data = await response.json();

    const select = document.getElementById('assignee') as HTMLSelectElement;
    data.users.forEach((user: string) => {
      const option = document.createElement('option');
      option.value = user;
      option.textContent = user;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

async function analyzeEmail() {
  showView('loading');

  try {
    // Get current email content using Office.js
    const item = Office.context.mailbox.item;

    const emailData = {
      subject: item?.subject || '',
      body: await getEmailBody(),
      sender: item?.from?.emailAddress || '',
      receivedDate: item?.dateTimeCreated?.toISOString() || ''
    };

    // Send to AI for parsing
    const response = await fetch(`${API_BASE}/parse-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(emailData)
    });

    const data = await response.json();

    if (data.success) {
      currentDraft = data.draft;
      populateDraftForm(data.draft);
      showView('draft');
    } else {
      alert('Failed to analyze email. Please try again.');
      showView('initial');
    }
  } catch (error) {
    console.error('Error analyzing email:', error);
    alert('Failed to analyze email. Please try again.');
    showView('initial');
  }
}

function getEmailBody(): Promise<string> {
  return new Promise((resolve) => {
    Office.context.mailbox.item?.body.getAsync(
      Office.CoercionType.Text,
      (result) => {
        resolve(result.value || '');
      }
    );
  });
}

function populateDraftForm(draft: TaskDraft) {
  (document.getElementById('task-text') as HTMLTextAreaElement).value = draft.text;
  (document.getElementById('assignee') as HTMLSelectElement).value = draft.suggestedAssignee;
  (document.getElementById('priority') as HTMLSelectElement).value = draft.priority;
  (document.getElementById('due-date') as HTMLInputElement).value = draft.dueDate;
  (document.getElementById('context-text') as HTMLElement).textContent = draft.context;
}

async function createTask() {
  const taskData = {
    text: (document.getElementById('task-text') as HTMLTextAreaElement).value,
    assignedTo: (document.getElementById('assignee') as HTMLSelectElement).value || null,
    priority: (document.getElementById('priority') as HTMLSelectElement).value,
    dueDate: (document.getElementById('due-date') as HTMLInputElement).value || null,
    createdBy: await getCurrentUserName()
  };

  try {
    const response = await fetch(`${API_BASE}/create-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(taskData)
    });

    const data = await response.json();

    if (data.success) {
      showView('success');
    } else {
      alert('Failed to create task. Please try again.');
    }
  } catch (error) {
    console.error('Error creating task:', error);
    alert('Failed to create task. Please try again.');
  }
}

async function getCurrentUserName(): Promise<string> {
  // Try to get from Office profile, fallback to stored preference
  const profile = Office.context.mailbox.userProfile;
  return profile?.displayName || 'Outlook User';
}

function showView(view: 'initial' | 'loading' | 'draft' | 'success') {
  ['initial', 'loading', 'draft', 'success'].forEach(v => {
    document.getElementById(`${v}-view`)?.classList.toggle('hidden', v !== view);
  });
}

function resetView() {
  currentDraft = null;
  showView('initial');
}
```

### Phase 6: AI Parsing Logic (API Route)

```typescript
// src/app/api/outlook/parse-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { subject, body, sender, receivedDate } = await request.json();

    const prompt = `You are a task extraction assistant. Analyze this email and extract a clear, actionable task.

Email Subject: ${subject}
Email Body: ${body}
From: ${sender}
Received: ${receivedDate}

Extract the following information and respond in JSON format:
{
  "text": "A clear, concise task description (action-oriented, start with a verb)",
  "suggestedAssignee": "Name of person who should do this task (if mentioned), or empty string",
  "priority": "low|medium|high|urgent based on urgency indicators",
  "dueDate": "YYYY-MM-DD format if a deadline is mentioned, or empty string",
  "context": "Brief note about where this task came from"
}

Rules:
- Task text should be clear and actionable
- Look for names mentioned as assignees (e.g., "have Sefra do...", "ask Derek to...")
- Look for deadline words like "by Friday", "end of week", "ASAP", "urgent"
- If ASAP or urgent is mentioned, set priority to "urgent"
- Keep the context brief but informative`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const draft = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error) {
    console.error('Error parsing email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse email' },
      { status: 500 }
    );
  }
}
```

## Deployment Steps

### 1. Add API Routes to Next.js App
Create the three API routes in your existing app.

### 2. Deploy Updated App
Push to Railway - the API routes will be available at your existing domain.

### 3. Build Outlook Add-In
```bash
cd outlook-addin
npm install
npm run build
```

### 4. Host Add-In Files
The taskpane HTML/CSS/JS can be hosted:
- On Railway alongside your Next.js app (in /public/outlook/)
- On a separate static host

### 5. Register Add-In
**For Development/Testing:**
- Go to Outlook.com or Outlook desktop
- Settings > Manage add-ins > My add-ins
- Upload custom add-in (manifest.xml)

**For Organization-Wide Deployment:**
- Admin uploads to Microsoft 365 admin center
- Can deploy to all users in the organization

## Security Considerations

1. **API Key Authentication**: All API routes require X-API-Key header
2. **CORS**: Configure CORS to only allow requests from Office hosts
3. **Rate Limiting**: Implement rate limiting on API routes
4. **Input Validation**: Sanitize email content before processing
5. **HTTPS Required**: All communications must be over HTTPS

## Environment Variables Needed

```env
# Add to your existing .env.local
ANTHROPIC_API_KEY=your-anthropic-api-key
OUTLOOK_ADDON_API_KEY=a-secure-random-key
```

## User Flow

1. **Derek opens an email** in Outlook (Mac or PC)
2. **Clicks "Bealer Todo"** button in ribbon or reads pane
3. **Add-in taskpane opens** with "Analyze Email" button
4. **Derek clicks "Analyze Email"**
5. **AI processes email** and extracts task details
6. **Draft preview shown** with:
   - Pre-filled task description
   - Suggested assignee (e.g., Sefra)
   - Detected priority
   - Detected due date
7. **Derek reviews and adjusts** if needed
8. **Clicks "Add Task"**
9. **Task appears** in the Bealer Agency todo app instantly (real-time sync)
10. **Sefra sees the task** on her next app visit

## Estimated Implementation Time

| Phase | Description | Time |
|-------|-------------|------|
| 1 | API Endpoints | 2-3 hours |
| 2-5 | Add-In UI & Logic | 3-4 hours |
| 6 | AI Integration | 1-2 hours |
| 7 | Testing & Deployment | 2-3 hours |
| **Total** | | **8-12 hours** |

## Next Steps

1. Confirm this design meets your requirements
2. Set up Anthropic API key for AI parsing
3. Implement API routes
4. Build and test add-in locally
5. Deploy to production
6. Register add-in with Microsoft 365

Would you like me to start implementing any of these phases?
