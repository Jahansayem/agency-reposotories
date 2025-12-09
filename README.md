# Bealer Agency Todo List

A real-time collaborative task management app built for small teams, with an AI-powered Outlook add-in to convert emails into tasks.

## Features

- **Real-time sync** - Changes appear instantly across all connected clients via Supabase
- **PIN-based authentication** - Secure 4-digit PIN login per user
- **User switching** - Quickly switch between team members on shared devices
- **Kanban board** - Drag-and-drop task management with Todo/In Progress/Done columns
- **List view** - Traditional list view with filtering and sorting
- **Task priorities** - Low, Medium, High, and Urgent priority levels
- **Due dates** - Set and track task deadlines
- **Assignees** - Assign tasks to team members
- **Streak tracking** - Daily login streaks with welcome notifications
- **Outlook Add-in** - Convert emails to tasks using AI (Claude)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **AI**: Anthropic Claude API (for email parsing)
- **Deployment**: Railway

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
ANTHROPIC_API_KEY=your-anthropic-api-key
OUTLOOK_ADDON_API_KEY=your-secure-random-key
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

All Outlook API endpoints require the `X-API-Key` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/outlook/users` | GET | List registered users |
| `/api/outlook/parse-email` | POST | AI-powered email parsing |
| `/api/outlook/create-task` | POST | Create a new task |

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

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `OUTLOOK_ADDON_API_KEY` | Shared secret for Outlook add-in |

## Developer Notes (for Claude Code)

This section provides context for AI assistants working on this codebase.

### Current State (December 2024)

- **Production URL**: https://shared-todo-list-production.up.railway.app
- **Users**: Derrick (PIN: 8008) and Sefra (PIN: 7734) - only these two users in production
- **Database**: Supabase with `todos` and `users` tables
- **Deployment**: Railway auto-deploys from `main` branch

### Key Files to Know

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main app - handles auth state, fetches users/todos from Supabase |
| `src/components/TodoList.tsx` | Core UI - list/kanban views, filters, search, bulk actions, dark mode |
| `src/components/TodoItem.tsx` | Individual task - notes, recurrence, duplication, priority badges |
| `src/components/AddTodo.tsx` | Task creation - has AI enhance button (purple) and regular Add button |
| `src/components/KanbanBoard.tsx` | Drag-and-drop board with dnd-kit |
| `src/components/LoginScreen.tsx` | PIN entry with user cards |
| `src/lib/auth.ts` | SHA-256 PIN hashing (client-side) |
| `src/app/api/ai/enhance-task/route.ts` | AI task enhancement endpoint using Claude |
| `src/app/api/outlook/` | Outlook add-in APIs (parse-email, create-task, users) |
| `src/app/outlook-setup/page.tsx` | Installation instructions for Outlook add-in |

### Features Implemented

- Task CRUD with real-time Supabase subscriptions
- PIN-based auth with user switching
- List view with search, sort (created/due date/priority/A-Z), quick filters (My Tasks, Due Today, Overdue, Urgent)
- Kanban board with drag-and-drop between columns
- Task notes, recurring tasks (daily/weekly/monthly), bulk actions
- AI task enhancement (cleans up text, extracts dates/priority/assignee)
- Outlook add-in for email-to-task conversion
- Dark mode toggle
- Celebration animation on task completion
- Login streaks

### Database Schema

```sql
-- Users table
users (id UUID, name TEXT UNIQUE, pin_hash TEXT, color TEXT, created_at, last_login, streak_count, streak_last_date, welcome_shown_at)

-- Todos table
todos (id UUID, text TEXT, completed BOOLEAN, status TEXT, priority TEXT, created_at, created_by TEXT, assigned_to TEXT, due_date TEXT, notes TEXT, recurrence TEXT, updated_at, updated_by TEXT)
```

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
