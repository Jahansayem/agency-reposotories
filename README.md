# Wavezly Todo List

A comprehensive real-time collaborative task management platform built for insurance agencies, featuring AI-powered workflows, team chat, strategic planning, multi-agency support, and native iOS app.

## Security Status (January 2026)

Security hardening has been completed to meet Allstate internal application requirements:

| Area | Status |
|------|--------|
| **Authentication** | Server-side lockout, session timeout, HttpOnly cookies |
| **Authorization** | Role-based access control (owner/manager/staff) |
| **Data Protection** | Field-level encryption (AES-256-GCM) for PII |
| **Logging** | Audit logging, security event monitoring, SIEM-ready |
| **CI/CD Security** | CodeQL, Semgrep, dependency scanning, secret detection |
| **Rate Limiting** | Redis-based, fail-closed design |

**Compliance: 81%** - See `docs/ALLSTATE_SECURITY_CHECKLIST.md` for details.

---

## Multi-Agency Production Readiness (February 2026)

✅ **READY FOR PRODUCTION** - Multi-agency launch preparation complete (14/14 tasks).

The application has been fully verified for multi-agency deployment supporting 5,000+ Allstate agencies:

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1: Critical Fixes** | ✅ Complete | RLS policies verified, setAgencyContext audit, AI endpoint auth, debug endpoint check |
| **Phase 2: API Hardening** | ✅ Complete | Goals endpoints audit, data routes audit, agencies endpoint verification |
| **Phase 3: Frontend Permissions** | ✅ Complete | Navigation PermissionGates, staff data scoping, invitation UI verification |
| **Phase 4: Testing** | ✅ Complete | E2E multi-agency isolation tests, manual verification checklist |

**Security Findings:**
- All 47 API routes properly protected with auth wrappers
- All 10 data tables have agency_id columns with proper RLS
- 21 granular permissions across owner/manager/staff roles
- Defense-in-depth: application-level + database-level filtering

**New Test Coverage:**
- `tests/multi-agency-isolation.spec.ts` - 12 E2E test cases for data isolation
- `docs/MULTI_AGENCY_MANUAL_VERIFICATION.md` - 45 manual test cases

See `docs/MULTI_AGENCY_LAUNCH_PLAN.md` for complete audit results.

---

## Features

### Core Task Management
- **Real-time sync** - Changes appear instantly across all connected clients
- **Multiple views** - Kanban board and filterable list view with advanced sorting
- **Advanced filtering** - Quick filter chips with keyboard shortcuts, live result counts, and mobile-optimized bottom sheet
- **Task priorities** - Low, Medium, High, and Urgent with color-coded indicators
- **Due dates & reminders** - Set deadlines with overdue warnings and notification reminders
- **Assignees** - Assign tasks to team members with quick filters
- **Subtasks** - Break down complex tasks with individual completion tracking
- **Task notes & attachments** - Rich text context and file uploads (25MB max)
- **Recurring tasks** - Daily, weekly, and monthly recurrence patterns
- **Bulk actions** - Multi-select for batch updates, deletion, and reassignment
- **Task templates** - Save and reuse common task patterns
- **Duplicate detection** - Smart detection of similar tasks with merge capability
- **Task reordering** - Drag-to-reorder with custom sort order persistence
- **Waiting for response** - Track tasks pending external replies

### AI-Powered Features
- **Smart parse** - Natural language task creation with automatic priority and subtask extraction
- **Email generation** - Generate professional customer emails from tasks with insurance agent tone
- **Voicemail transcription** - Convert voice recordings to tasks with OpenAI Whisper
- **File parsing** - Extract tasks from documents, images, and other file types
- **Task enhancement** - AI-powered task refinement and clarity improvement
- **Task breakdown** - Automatically generate detailed subtasks for complex tasks
- **Smart defaults** - AI-suggested priority, assignee, and due date based on task content
- **Daily digest** - AI-generated summary of team activity and priorities
- **Outlook Add-in** - Convert emails to tasks using AI (Claude)

### Allstate Analytics Integration (NEW)
- **Weekly data import** - Upload CSV exports from Allstate Book of Business
- **Cross-sell analysis** - Automatic priority scoring (HOT/HIGH/MEDIUM/LOW tiers)
- **Opportunity tracking** - Contact tracking, outcome recording, conversion metrics
- **Renewal calendar** - Visual calendar of upcoming renewals with cross-sell links
- **Task generation** - Auto-create follow-up tasks from high-priority opportunities
- **Talking points** - AI-generated sales talking points based on customer data
- **Performance metrics** - Conversion rates, premium potential, segment analysis

### Collaboration & Communication
- **Team chat** - Real-time messaging with direct messages and team channels
- **Chat image attachments** - Share screenshots and files with auto-thumbnail generation
- **Message reactions** - Tapback reactions (heart, thumbs, laugh, exclamation, question)
- **Reply threads** - Nested message conversations
- **Message pinning** - Pin important messages for easy access
- **Read receipts** - See who has read your messages
- **Typing indicators** - Real-time typing status
- **User presence** - Online, away, DND, and offline status
- **Task discussions** - Link messages to specific tasks
- **Collaborative editing indicators** - See who's editing tasks in real-time
- **Push notifications** - Browser notifications for task reminders, mentions, assignments

### Multi-Agency Support
- **Agency isolation** - Complete data separation between agencies
- **Role-based permissions** - Owner, manager, and staff roles with granular permissions
- **Agency switching** - Quick switch between multiple agencies
- **Invitation system** - Invite team members via email with role assignment
- **Agency creation** - Self-service agency onboarding workflow

### Archive Browser
- **Full-page archive view** - Dedicated view for completed tasks (auto-archived after 48 hours)
- **Advanced filtering** - Filter by date range, assignee, priority with presets
- **Multiple sort options** - Sort by completion date, name, or priority
- **Search** - Real-time search through archived task names and content
- **Restore functionality** - One-click restore of archived tasks back to active
- **Bulk operations** - Select multiple tasks for bulk restore or permanent delete
- **CSV export** - Export filtered archive results to spreadsheet

### Analytics & Monitoring
- **Dashboard** - Executive overview with completion stats and team workload
- **Weekly progress chart** - Visual 5-day (Mon-Fri) completion tracking
- **Activity feed** - Complete audit trail of all team actions
- **Streak tracking** - Daily login streaks with welcome notifications
- **Team stats** - Real-time task counts by status, priority, and assignee
- **Performance monitoring** - Real-time FPS, memory, latency, and render metrics
- **Version history** - View and restore previous versions of any task
- **Insurance pattern analysis** - Category detection for insurance workflows

### Strategic Planning (Owner Only)
- **Strategic goals** - Long-term planning with 6 predefined categories
- **Goal milestones** - Break down strategic objectives into trackable steps
- **Progress tracking** - Visual progress bars with target and current values
- **Multiple view modes** - List, board, and table views for goal management

### User Experience
- **PIN-based authentication** - Secure 4-digit PIN login per user
- **User switching** - Quickly switch between team members on shared devices
- **Dark mode** - Full dark/light theme toggle
- **Keyboard shortcuts** - Power user shortcuts including command palette (Cmd/Ctrl+K), filter shortcuts (`/` to search, `f` for filters, `m`/`t`/`o`/`a`/`p` for quick filters)
- **Mobile-optimized filters** - Bottom sheet filter panel with drag-to-dismiss on mobile devices
- **Pull-to-refresh** - Mobile-optimized refresh gesture
- **Celebration effects** - Visual feedback on task completion
- **Empty states** - Contextual guidance when lists are empty
- **Enhanced animations** - Smooth micro-interactions with GPU acceleration
- **Reduced motion support** - Respects accessibility preferences and battery level
- **Offline support** - IndexedDB caching with sync when reconnected

---

## Tech Stack

### Web Application
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **AI**: Anthropic Claude API (parsing, enhancement, email generation) + OpenAI Whisper (transcription)
- **Storage**: Supabase Storage (file attachments)
- **State Management**: Zustand
- **Animation**: Framer Motion
- **Drag & Drop**: @dnd-kit
- **Testing**: Playwright E2E + Vitest unit tests
- **Deployment**: Railway (Docker)

### iOS Application
- **Language**: Swift 6
- **UI Framework**: SwiftUI
- **Minimum iOS**: 17.0
- **Backend**: Shared Supabase backend
- **Push Notifications**: APNs

---

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
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Outlook Integration
OUTLOOK_ADDON_API_KEY=your-secure-random-key

# Push Notifications (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:support@yourdomain.com

# Optional: Security Monitoring
SECURITY_WEBHOOK_URL=your-slack-or-discord-webhook
```

### 3. Set Up Database

Run the SQL migrations in `supabase/migrations/` in your Supabase SQL Editor. See `SETUP.md` for detailed instructions.

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Project Structure

```
shared-todo-list/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main entry point
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── globals.css               # Global styles
│   │   ├── join/[token]/             # Invitation acceptance page
│   │   ├── signup/                   # Registration page
│   │   ├── outlook-setup/            # Outlook add-in instructions
│   │   └── api/                      # API routes (46 endpoints)
│   │       ├── ai/                   # AI endpoints (11)
│   │       ├── auth/                 # Authentication endpoints
│   │       ├── outlook/              # Outlook integration
│   │       ├── todos/                # Task CRUD + reorder
│   │       ├── goals/                # Strategic goals
│   │       ├── agencies/             # Multi-agency management
│   │       ├── invitations/          # Team invitations
│   │       ├── push-notifications/   # Push notification delivery
│   │       ├── reminders/            # Reminder processing
│   │       ├── digest/               # Daily digest generation
│   │       ├── patterns/             # Insurance pattern analysis
│   │       └── security/             # Security event logging
│   │
│   ├── components/                   # React components (100+)
│   │   ├── ui/                       # Reusable UI primitives
│   │   ├── chat/                     # Chat components
│   │   ├── layout/                   # Layout components
│   │   ├── task-detail/              # Task detail modal components
│   │   ├── todo/                     # Todo list components
│   │   ├── dashboard/                # Dashboard components
│   │   ├── kanban/                   # Kanban board components
│   │   ├── task/                     # Task card components
│   │   ├── views/                    # Page-level view components
│   │   └── *.tsx                     # Top-level components
│   │
│   ├── hooks/                        # Custom React hooks (31)
│   │   ├── useTodoData.ts            # Todo fetching & mutations
│   │   ├── useFilters.ts             # Filter state management
│   │   ├── useBulkActions.ts         # Multi-select operations
│   │   ├── useChatMessages.ts        # Chat messaging
│   │   ├── usePresence.ts            # User presence tracking
│   │   ├── usePushNotifications.ts   # Push notification management
│   │   ├── usePerformanceMonitor.ts  # Performance metrics
│   │   ├── useOfflineSupport.ts      # Offline/online sync
│   │   └── ...                       # And more
│   │
│   ├── lib/                          # Utilities (45+)
│   │   ├── supabaseClient.ts         # Database client
│   │   ├── auth.ts                   # PIN authentication
│   │   ├── activityLogger.ts         # Audit logging
│   │   ├── duplicateDetection.ts     # Duplicate task detection
│   │   ├── fileValidator.ts          # Upload security
│   │   ├── featureFlags.ts           # Feature toggles
│   │   ├── fieldEncryption.ts        # AES-256-GCM encryption
│   │   ├── serverLockout.ts          # Redis-based lockout
│   │   ├── sessionValidator.ts       # Session management
│   │   ├── securityMonitor.ts        # SIEM integration
│   │   ├── insurancePatterns.ts      # Insurance task categorization
│   │   ├── microInteractions.ts      # Haptics, sounds, effects
│   │   ├── db/todoService.ts         # Database operations
│   │   └── ...                       # And more
│   │
│   ├── store/                        # State management
│   │   └── todoStore.ts              # Zustand store
│   │
│   ├── contexts/                     # React contexts
│   │   ├── ThemeContext.tsx          # Dark mode
│   │   ├── UserContext.tsx           # Current user
│   │   ├── AgencyContext.tsx         # Multi-agency
│   │   └── ModalStateContext.tsx     # Modal management
│   │
│   ├── types/                        # TypeScript definitions
│   │   ├── todo.ts                   # Core data types
│   │   └── agency.ts                 # Agency types
│   │
│   └── middleware.ts                 # Next.js middleware
│
├── ios-app/                          # Native iOS application
│   ├── SharedTodoList/
│   │   ├── Features/                 # Feature modules
│   │   │   ├── Auth/                 # Login, registration
│   │   │   ├── TaskList/             # Task list view
│   │   │   ├── TaskDetail/           # Task detail view
│   │   │   ├── Kanban/               # Kanban board
│   │   │   ├── AddTask/              # Task creation
│   │   │   ├── Settings/             # App settings
│   │   │   └── Shared/               # Shared components
│   │   ├── Data/                     # Data layer
│   │   │   ├── Models/               # Swift models
│   │   │   ├── Services/             # API services
│   │   │   └── Repositories/         # Data repositories
│   │   └── Core/                     # Core utilities
│   └── Package.swift                 # Swift package definition
│
├── public/
│   ├── outlook/                      # Outlook add-in static files
│   ├── sounds/                       # Notification sounds
│   ├── sw.js                         # Service worker (PWA)
│   └── manifest.json                 # PWA manifest
│
├── tests/                            # Test files
│   ├── unit/                         # Unit tests (Vitest)
│   ├── integration/                  # Integration tests
│   ├── e2e/                          # E2E tests (Playwright)
│   ├── factories/                    # Test data factories
│   ├── fixtures/                     # Test fixtures
│   └── helpers/                      # Test utilities
│
├── supabase/
│   ├── migrations/                   # SQL schema migrations (30+)
│   └── functions/                    # Edge functions
│
├── scripts/                          # Utility scripts
├── docs/                             # Additional documentation (60+)
│
├── CLAUDE.md                         # Comprehensive developer guide
├── ORCHESTRATOR.md                   # Quick reference for AI agents
├── PRD.md                            # Product requirements
├── REFACTORING_PLAN.md               # Improvement roadmap
├── SETUP.md                          # Installation instructions
└── DEPLOYMENT_GUIDE.md               # Deployment process
```

---

## API Endpoints Reference

### AI Features (`/api/ai/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/smart-parse` | POST | Parse natural language into task + subtasks |
| `/api/ai/enhance-task` | POST | Improve task wording/structure |
| `/api/ai/breakdown-task` | POST | Generate subtasks for existing task |
| `/api/ai/transcribe` | POST | Transcribe audio using Whisper |
| `/api/ai/parse-voicemail` | POST | Extract task from voicemail transcription |
| `/api/ai/parse-file` | POST | Extract tasks from uploaded files |
| `/api/ai/parse-content-to-subtasks` | POST | Convert bullet points to subtasks |
| `/api/ai/generate-email` | POST | Generate professional email for customer |
| `/api/ai/translate-email` | POST | Translate email content |
| `/api/ai/suggest-defaults` | POST | Suggest priority, assignee, due date |
| `/api/ai/daily-digest` | POST | Generate daily activity digest |

### Outlook Integration (`/api/outlook/*`)

All Outlook API endpoints require the `X-API-Key` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/outlook/users` | GET | List registered users |
| `/api/outlook/parse-email` | POST | AI-powered email parsing |
| `/api/outlook/create-task` | POST | Create a new task |

### Task Management (`/api/todos/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/todos` | GET/POST/PATCH/DELETE | Task CRUD operations |
| `/api/todos/reorder` | POST | Update task display order |
| `/api/todos/waiting` | GET/POST | Manage waiting-for-response status |
| `/api/todos/check-waiting` | POST | Check and update waiting statuses |

### Data Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates` | GET/POST/DELETE | Task template management |
| `/api/activity` | GET/POST | Activity log recording/retrieval |
| `/api/attachments` | POST | File upload |
| `/api/goals` | GET/POST/PUT/DELETE | Strategic goals management |
| `/api/goals/categories` | GET/POST | Goal categories |
| `/api/goals/milestones` | GET/POST | Goal milestones |
| `/api/patterns/analyze` | POST | Analyze task patterns |
| `/api/patterns/suggestions` | GET | Get pattern-based suggestions |

### Multi-Agency (`/api/agencies/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agencies` | GET/POST | List/create agencies |
| `/api/agencies/[id]/members` | GET/POST/DELETE | Manage agency members |
| `/api/agencies/[id]/invitations` | GET/POST | Manage invitations |
| `/api/invitations/validate` | POST | Validate invitation token |
| `/api/invitations/accept` | POST | Accept invitation |

### Other

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/push-notifications/send` | POST | Send push notifications |
| `/api/reminders/process` | POST | Process due reminders |
| `/api/digest/generate` | POST | Generate daily digest |
| `/api/security/events` | GET/POST | Security event logging |

---

## Running Tests

```bash
# Run all unit tests
npm run test

# Run E2E tests
npx playwright test

# Run E2E tests with UI
npx playwright test --ui

# Run specific test file
npx playwright test tests/core-flow.spec.ts

# Run WebKit-specific tests
npx playwright test --project=webkit

# Run tests in watch mode
npm run test:watch
```

---

## iOS App

The native iOS app provides a mobile-optimized experience with offline support.

### Features
- Task list and Kanban views
- Task creation with AI smart parse
- Push notifications via APNs
- Offline support with sync
- Widget support for quick task viewing
- Share extension for creating tasks from other apps

### Setup

See `ios-app/README.md` for detailed iOS setup instructions.

```bash
cd ios-app
open SharedTodoList.xcodeproj
```

---

## Deployment

The app is configured for Railway deployment:

1. Push to GitHub
2. Connect Railway to the repository
3. Add environment variables in Railway dashboard
4. Deploy

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Yes (for AI) |
| `OPENAI_API_KEY` | OpenAI API key | Yes (for transcription) |
| `OUTLOOK_ADDON_API_KEY` | Outlook add-in secret | For Outlook |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key | For push |
| `VAPID_PRIVATE_KEY` | VAPID private key | For push |
| `VAPID_SUBJECT` | Contact email for VAPID | For push |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Optional (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Optional (rate limiting) |
| `SECURITY_WEBHOOK_URL` | Slack/Discord webhook | For alerts |
| `RESEND_API_KEY` | Resend email API key | Yes (for invitations) |
| `FIELD_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | Yes (for PII encryption) |
| `NEXT_PUBLIC_APP_URL` | Public application URL | For email links |

**Note:** Upstash Redis is optional for rate limiting on PIN lockout. If not configured, the app will fall back to in-memory rate limiting. Generate `FIELD_ENCRYPTION_KEY` with: `openssl rand -hex 32`

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Comprehensive developer guide |
| [ORCHESTRATOR.md](./ORCHESTRATOR.md) | Quick reference for AI agents |
| [PRD.md](./PRD.md) | Product requirements |
| [SETUP.md](./SETUP.md) | Installation instructions |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Deployment process |
| [ios-app/README.md](./ios-app/README.md) | iOS app setup |
| [docs/](./docs/) | Additional documentation |

---

## License

Private - Wavezly
