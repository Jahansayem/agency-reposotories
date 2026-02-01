# Bealer Agency Todo List

A comprehensive real-time collaborative task management platform built for small teams, featuring AI-powered workflows, team chat, strategic planning, and seamless Outlook integration.

## 🔒 Security Status (January 2026)

Security hardening has been completed to meet Allstate internal application requirements:

| Area | Status |
|------|--------|
| **Authentication** | ✅ Server-side lockout, session timeout, HttpOnly cookies |
| **Authorization** | ✅ Role-based access control (owner/admin/member) |
| **Data Protection** | ✅ Field-level encryption (AES-256-GCM) for PII |
| **Logging** | ✅ Audit logging, security event monitoring, SIEM-ready |
| **CI/CD Security** | ✅ CodeQL, Semgrep, dependency scanning, secret detection |
| **Rate Limiting** | ✅ Redis-based, fail-closed design |

**Compliance: 81%** - See `docs/ALLSTATE_SECURITY_CHECKLIST.md` for details.

**Pending:** MFA for admin accounts (PIN auth retained per business decision).

**To enable alerting:** Set `SECURITY_WEBHOOK_URL` env var to a Slack/Discord webhook.

## Features

### Core Task Management
- **Real-time sync** - Changes appear instantly across all connected clients via Supabase
- **Multiple views** - Kanban board and filterable list view with advanced sorting
- **Task priorities** - Low, Medium, High, and Urgent with color-coded indicators
- **Due dates** - Set and track task deadlines with overdue warnings
- **Assignees** - Assign tasks to team members with quick filters
- **Subtasks** - Break down complex tasks with individual completion tracking
- **Task notes** - Rich text context and detailed descriptions
- **Recurring tasks** - Daily, weekly, and monthly recurrence patterns
- **Bulk actions** - Multi-select for batch updates, deletion, and reassignment
- **Task templates** - Save and reuse common task patterns
- **Duplicate detection** - Smart detection of similar tasks with merge capability

### AI-Powered Features
- **Smart parse** - Natural language task creation with automatic priority and subtask extraction
- **Email generation** - Generate professional customer emails from tasks with insurance agent tone
- **Voicemail transcription** - Convert voice recordings to tasks with OpenAI Whisper
- **File parsing** - Extract tasks from documents, images, and other file types
- **Task enhancement** - AI-powered task refinement and clarity improvement
- **Task breakdown** - Automatically generate detailed subtasks for complex tasks
- **Outlook Add-in** - Convert emails to tasks using AI (Claude)

### Collaboration & Communication
- **Team chat** - Real-time messaging with direct messages and team channels
- **Chat image attachments** - Share screenshots and files with auto-thumbnail generation (Sprint 3)
- **Message reactions** - Tapback reactions (❤️ 👍 👎 😂 ❗ ❓)
- **Reply threads** - Nested message conversations
- **Message pinning** - Pin important messages for easy access
- **Read receipts** - See who has read your messages
- **Typing indicators** - Real-time typing status
- **User presence** - Online, away, DND, and offline status
- **Task discussions** - Link messages to specific tasks
- **Collaborative editing indicators** - See who's editing tasks in real-time (Sprint 3)
- **Push notifications** - Browser notifications for task reminders, mentions, assignments (Sprint 3)

### Archive Browser
- **Full-page archive view** - Dedicated view for completed tasks (auto-archived after 48 hours)
- **Advanced filtering** - Filter by date range, assignee, priority with presets (Last 7/30/90 days)
- **Multiple sort options** - Sort by completion date, name (A-Z), or priority
- **Search** - Real-time search through archived task names and content
- **Restore functionality** - One-click restore of archived tasks back to active
- **Bulk operations** - Select multiple tasks for bulk restore or permanent delete
- **Statistics header** - Archive metrics (this week, this month, top archiver)
- **CSV export** - Export filtered archive results to spreadsheet

### Analytics & Monitoring
- **Dashboard** - Executive overview with completion stats and team workload
- **Weekly progress chart** - Visual 5-day (Mon-Fri) completion tracking
- **Activity feed** - Complete audit trail of all team actions
- **Streak tracking** - Daily login streaks with welcome notifications
- **Team stats** - Real-time task counts by status, priority, and assignee
- **Performance monitoring** - Real-time FPS, memory, latency, and render metrics (Sprint 3)
- **Version history** - View and restore previous versions of any task (Sprint 3)

### Strategic Planning (Owner Only)
- **Strategic goals** - Long-term planning with 6 predefined categories
- **Goal milestones** - Break down strategic objectives into trackable steps
- **Progress tracking** - Visual progress bars with target and current values
- **Multiple view modes** - List, board, and table views for goal management

### File Management
- **Attachments** - Upload documents, images, audio, video, and archives (25MB max)
- **Multiple formats** - Support for PDF, Word, Excel, PowerPoint, and 20+ file types
- **Visual previews** - Image and document previews in-app

### User Experience
- **PIN-based authentication** - Secure 4-digit PIN login per user
- **User switching** - Quickly switch between team members on shared devices
- **Dark mode** - Full dark/light theme toggle
- **Keyboard shortcuts** - Power user shortcuts for quick actions
- **Pull-to-refresh** - Mobile-optimized refresh gesture
- **Celebration effects** - Visual feedback on task completion
- **Empty states** - Contextual guidance when lists are empty
- **Enhanced animations** - Smooth micro-interactions with GPU acceleration (Sprint 3)
- **Reduced motion support** - Respects accessibility preferences and battery level (Sprint 3)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **AI**: Anthropic Claude API (parsing, enhancement, email generation) + OpenAI Whisper (transcription)
- **Storage**: Supabase Storage (file attachments)
- **Animation**: Framer Motion
- **Drag & Drop**: @dnd-kit
- **Testing**: Playwright E2E tests
- **Deployment**: Railway (Docker)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/adrianstier/shared-todo-list.git
cd shared-todo-list
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For file storage operations
ANTHROPIC_API_KEY=your-anthropic-api-key         # For AI features
OPENAI_API_KEY=your-openai-api-key               # For voice transcription
OUTLOOK_ADDON_API_KEY=your-secure-random-key     # For Outlook add-in

# Push Notifications (Sprint 3) - Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:support@bealeragency.com
```

### 3. Set Up Database

Run the SQL in `SETUP.md` in your Supabase SQL Editor to create the required tables.

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
shared-todo-list/
├── public/
│   └── outlook/              # Outlook add-in static files
│       ├── manifest.xml      # Web/New Outlook manifest
│       ├── manifest-desktop.xml  # Classic desktop manifest
│       ├── taskpane.html     # Add-in UI
│       └── icon-*.png        # Add-in icons
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main app page
│   │   ├── outlook-setup/    # Outlook installation instructions
│   │   └── api/
│   │       └── outlook/      # Outlook add-in API endpoints
│   ├── components/
│   │   ├── TodoList.tsx      # Main todo list component
│   │   ├── TodoItem.tsx      # Individual task item
│   │   ├── KanbanBoard.tsx   # Kanban board view
│   │   ├── AddTodo.tsx       # Add task form
│   │   ├── LoginScreen.tsx   # PIN authentication
│   │   └── UserSwitcher.tsx  # User switching dropdown
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   └── auth.ts           # PIN hashing utilities
│   └── types/
│       └── todo.ts           # TypeScript types
├── tests/                    # Playwright E2E tests
├── SETUP.md                  # Detailed setup instructions
└── package.json
```

## Outlook Add-in

The Outlook add-in allows you to convert emails into tasks with one click. The AI automatically extracts:

- **Task description** - Clear, actionable task from email content
- **Assignee** - Detects who should handle the task
- **Priority** - Identifies urgency from email content
- **Due date** - Parses deadlines like "by Friday" or "end of week"

### Installing the Add-in

1. Go to your deployed app's `/outlook-setup` page
2. Download the appropriate manifest (Web/New Outlook or Classic Desktop)
3. Go to https://aka.ms/olksideload
4. Upload the manifest file under "Custom Add-ins"

See `SETUP.md` for detailed instructions.

## API Endpoints

### Outlook Integration
All Outlook API endpoints require the `X-API-Key` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/outlook/users` | GET | List registered users |
| `/api/outlook/parse-email` | POST | AI-powered email parsing |
| `/api/outlook/create-task` | POST | Create a new task |

### AI Features

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/smart-parse` | POST | Parse text into task + subtasks using Claude |
| `/api/ai/enhance-task` | POST | Improve task wording/structure |
| `/api/ai/breakdown-task` | POST | Generate subtasks for existing task |
| `/api/ai/transcribe` | POST | Transcribe audio using Whisper, optionally parse as tasks |
| `/api/ai/parse-voicemail` | POST | Extract task from voicemail transcription |
| `/api/ai/parse-file` | POST | Extract text and tasks from uploaded files |
| `/api/ai/parse-content-to-subtasks` | POST | Convert bullet points to subtasks |
| `/api/ai/generate-email` | POST | Generate professional email for customer contact |

### Data Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates` | GET/POST/DELETE | Task template management |
| `/api/activity` | GET/POST | Activity log recording/retrieval |
| `/api/attachments` | POST | File upload |
| `/api/goals` | GET/POST | Strategic goals management |
| `/api/goals/categories` | GET/POST | Goal categories |
| `/api/goals/milestones` | GET/POST | Goal milestones |
| `/api/push-notifications/send` | POST | Send push notifications (Sprint 3) |

## Running Tests

```bash
# Run all tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test tests/core-flow.spec.ts
```

## Deployment

The app is configured for Railway deployment:

1. Push to GitHub
2. Connect Railway to the repository
3. Add environment variables in Railway dashboard
4. Deploy

## Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Core functionality |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Core functionality |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | File uploads |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | AI features (smart parse, enhancement, email generation) |
| `OPENAI_API_KEY` | OpenAI API key | Voice transcription (Whisper) |
| `OUTLOOK_ADDON_API_KEY` | Shared secret for Outlook add-in | Outlook integration |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for push notifications | Push notifications (Sprint 3) |
| `VAPID_PRIVATE_KEY` | VAPID private key for push notifications | Push notifications (Sprint 3) |
| `VAPID_SUBJECT` | Contact email for VAPID | Push notifications (Sprint 3) |

## Developer Notes (for Claude Code)

This section provides context for AI assistants working on this codebase.

### Current State (February 2026)

- **Production URL**: https://shared-todo-list-production.up.railway.app
- **Primary Users**: Derrick (Owner/Admin) and Sefra (Team Member)
- **Database**: Supabase with 12 tables (users, todos, messages, activity_log, task_templates, strategic_goals, goal_categories, goal_milestones, device_tokens, todo_versions, push_subscriptions, notification_log)
- **Storage**: Supabase Storage buckets:
  - `todo-attachments` for task file uploads
  - `chat-attachments` for chat image attachments (Sprint 3)
- **Deployment**: Railway auto-deploys from `main` branch using Docker
- **Framework**: Next.js 16 with App Router and Turbopack
- **Latest Sprint**: Sprint 3 Complete (February 2026) - Version History, Chat Attachments, Push Notifications, Performance Monitoring

### Key Files to Know

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main app entry - handles auth state, switches between Dashboard and Tasks views |
| `src/components/MainApp.tsx` | Main app shell - orchestrates Dashboard/Tasks switching, real-time sync |
| `src/components/TodoList.tsx` | List view - filters, search, bulk actions, sorting, drag-to-reorder |
| `src/components/KanbanBoard.tsx` | Kanban view - drag-and-drop with dnd-kit, 3 columns (Todo/In Progress/Done) |
| `src/components/Dashboard.tsx` | Executive dashboard - stats, weekly chart, team overview |
| `src/components/ChatPanel.tsx` | Team chat & DMs - messages, reactions, threading, presence |
| `src/components/StrategicDashboard.tsx` | Owner dashboard - long-term goals, milestones, progress tracking |
| `src/components/ActivityFeed.tsx` | Activity log - audit trail of all team actions |
| `src/components/ArchiveView.tsx` | Archive browser - filtering, sorting, restore, bulk ops, export |
| `src/components/TodoItem.tsx` | Task list item - inline editing, notes, subtasks, attachments |
| `src/components/SortableTodoItem.tsx` | Kanban card - drag-and-drop task with metadata |
| `src/components/AddTodo.tsx` | Task creation form - manual entry, templates, AI parsing |
| `src/components/LoginScreen.tsx` | PIN authentication - user selection, animated splash |
| `src/lib/auth.ts` | SHA-256 PIN hashing (client-side) |
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/lib/activityLogger.ts` | Activity logging helper for audit trail |
| `src/lib/duplicateDetection.ts` | Smart duplicate detection algorithm |
| `src/lib/animations.ts` | Framer Motion animation variants library |
| `src/lib/microInteractions.ts` | Micro-interactions (haptics, sounds, effects) - Sprint 3 |
| `src/lib/animationPerformance.ts` | Performance optimization utilities - Sprint 3 |
| `src/types/todo.ts` | All TypeScript interfaces and enums |
| `src/app/api/ai/` | 8 AI endpoints (smart-parse, enhance, transcribe, generate-email, etc.) |
| `src/app/api/outlook/` | Outlook add-in APIs (parse-email, create-task, users) |
| `src/app/outlook-setup/page.tsx` | Outlook add-in installation instructions |
| `supabase/migrations/` | SQL migration files for database schema |

### Features Implemented

**Core Task Management**
- Task CRUD with real-time Supabase subscriptions
- Subtasks with individual completion tracking and priorities
- Task notes, attachments (25MB max, 10 per task)
- Recurring tasks (daily/weekly/monthly)
- Bulk actions (multi-select, batch updates)
- Task templates (save & reuse patterns)
- Duplicate detection with merge capability
- Task merging (combine related tasks)

**Views & Navigation**
- List view with search, sort (created/due date/priority/A-Z/custom/urgency), quick filters
- Kanban board with drag-and-drop between columns (Todo/In Progress/Done)
- Dashboard with executive summary, stats, and weekly progress chart
- Strategic goals dashboard (owner-only: Derrick)

**AI-Powered Features**
- Smart parse (natural language → task + subtasks)
- Task enhancement (improves clarity, extracts metadata)
- Task breakdown (generates detailed subtasks)
- Voicemail transcription to tasks (Whisper + Claude)
- File parsing (extract tasks from documents)
- Email generation (professional customer emails with insurance agent tone)
- Outlook add-in for email-to-task conversion

**Collaboration**
- Team chat with direct messages
- Chat image attachments with thumbnails and lightbox (Sprint 3)
- Message reactions (6 tapback types)
- Reply threading
- Message pinning
- Read receipts
- Typing indicators
- User presence (online/away/DND/offline)
- Task-linked discussions
- Real-time editing indicators (Sprint 3)
- Push notifications for mentions, assignments, reminders (Sprint 3)

**Analytics & Tracking**
- Activity feed (complete audit trail with 15+ action types)
- Weekly progress chart (Mon-Fri completion)
- Team workload stats
- Login streaks with welcome notifications
- Performance monitoring dashboard (FPS, memory, latency, render metrics) - Sprint 3
- Version history with restore capability - Sprint 3

**UX & Polish**
- PIN-based auth with user switching
- Dark mode toggle
- Keyboard shortcuts
- Pull-to-refresh (mobile)
- Celebration animations on task completion
- Empty states with contextual guidance
- Mobile-optimized responsive design
- Enhanced micro-interactions (confetti, haptics, sounds) - Sprint 3
- GPU-accelerated animations with reduced motion support - Sprint 3
- Performance-optimized frame scheduling - Sprint 3

### Database Schema

```sql
-- Users table
users (
  id UUID, name TEXT UNIQUE, pin_hash TEXT, color TEXT,
  created_at, last_login, streak_count, streak_last_date, welcome_shown_at
)

-- Todos table
todos (
  id UUID, text TEXT, completed BOOLEAN, status TEXT, priority TEXT,
  created_at, created_by TEXT, assigned_to TEXT, due_date TIMESTAMPTZ,
  notes TEXT, recurrence TEXT, updated_at, updated_by TEXT,
  subtasks JSONB[], attachments JSONB[], transcription TEXT, merged_from UUID[]
)

-- Messages table (Chat)
messages (
  id UUID, text TEXT, created_by TEXT, created_at, related_todo_id UUID,
  recipient TEXT, reactions JSONB[], read_by TEXT[], reply_to_id UUID,
  reply_to_text TEXT, reply_to_user TEXT, edited_at, deleted_at,
  is_pinned BOOLEAN, pinned_by TEXT, pinned_at, mentions TEXT[],
  attachments JSONB[]  -- Sprint 3: Chat image attachments
)

-- Activity log table
activity_log (
  id UUID, action TEXT, todo_id UUID, todo_text TEXT,
  user_name TEXT, details JSONB, created_at
)

-- Task templates table
task_templates (
  id UUID, name TEXT, description TEXT, default_priority TEXT,
  default_assigned_to TEXT, subtasks JSONB[], created_by TEXT,
  is_shared BOOLEAN, created_at, updated_at
)

-- Strategic goals tables
strategic_goals (
  id UUID, title TEXT, description TEXT, category_id UUID,
  status TEXT, priority TEXT, target_date DATE, target_value TEXT,
  current_value TEXT, progress_percent INT, notes TEXT,
  display_order INT, created_by TEXT, created_at, updated_at
)

goal_categories (
  id UUID, name TEXT, color TEXT, icon TEXT, display_order INT, created_at
)

goal_milestones (
  id UUID, goal_id UUID, title TEXT, completed BOOLEAN,
  target_date DATE, display_order INT, created_at
)

-- Device tokens table (Push notifications)
device_tokens (
  id UUID, user_id UUID, token TEXT, platform TEXT,
  created_at, updated_at
)

-- Version history table (Sprint 3)
todo_versions (
  id UUID, todo_id UUID, version_number INT, text TEXT, completed BOOLEAN,
  status TEXT, priority TEXT, assigned_to TEXT, due_date TIMESTAMPTZ,
  notes TEXT, subtasks JSONB[], attachments JSONB[], change_type TEXT,
  change_summary TEXT, changed_by TEXT, created_at
)

-- Push subscriptions table (Sprint 3)
push_subscriptions (
  id UUID, user_id UUID, endpoint TEXT UNIQUE, p256dh_key TEXT, auth_key TEXT,
  is_active BOOLEAN, last_used_at TIMESTAMPTZ, created_at, updated_at
)

-- Notification log table (Sprint 3)
notification_log (
  id UUID, user_id UUID, notification_type TEXT, title TEXT, body TEXT,
  task_id UUID, message_id UUID, status TEXT, sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ, dismissed_at TIMESTAMPTZ, error_message TEXT,
  data JSONB, created_at
)
```

For full schema with constraints and indexes, see `supabase/migrations/`.

### Common Tasks

**Update a user's PIN:**
```sql
-- Generate hash: echo -n "1234" | shasum -a 256
UPDATE users SET pin_hash = 'hash_here' WHERE name = 'Username';
```

**Add a new user:**
```sql
INSERT INTO users (name, pin_hash, color) VALUES ('Name', 'sha256_hash', '#0033A0');
```

**Deploy changes:**
```bash
git add -A && git commit -m "message" && git push
# Railway auto-deploys from main
```

### Brand Colors

- Primary blue: `#0033A0`
- Gold accent: `#D4A853`

### Things to Watch Out For

1. **Supabase real-time**: TodoList uses `supabase.channel()` for live updates - don't break the subscription
2. **PIN hashing**: Done client-side with SHA-256, stored as hex string
3. **Outlook manifests**: Two versions - `manifest.xml` for web/new and `manifest-desktop.xml` for classic
4. **AI API key**: `ANTHROPIC_API_KEY` needed for task enhancement and email parsing

## License

Private - Bealer Agency
