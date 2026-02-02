# Claude Code Developer Guide

This document provides comprehensive context for AI assistants (like Claude Code) working on the Bealer Agency Todo List codebase.

> **For Multi-Agent Orchestrators**: See [ORCHESTRATOR.md](./ORCHESTRATOR.md) for a structured, quick-reference guide optimized for orchestrator agents.

---

## 🎉 Sprint 3 Complete (February 2026)

**Sprint 3: Polish & Completion** - All 6 major features successfully implemented:

- ✅ **Collaborative Editing Indicators** - Real-time editing presence
- ✅ **Version History UI** - View and restore previous task versions
- ✅ **Chat Image Attachments** - Share screenshots with auto-thumbnails
- ✅ **Push Notifications** - Browser notifications for tasks, mentions, assignments
- ✅ **Animation Polish** - Micro-interactions, GPU acceleration, performance optimization
- ✅ **Performance Monitoring Dashboard** - Real-time FPS, memory, latency tracking

**Documentation:**
- `docs/SPRINT_3_FEATURES.md` - Comprehensive feature guide (500+ lines)
- `docs/API_DOCUMENTATION.md` - Complete API reference (800+ lines)
- `docs/USER_GUIDE_SPRINT3.md` - User-friendly guide (600+ lines)

**See:** [Sprint 3 Features](#sprint-3-features-february-2026) section below for details.

---

## 🏢 Multi-Tenancy Execution Plan (February 2026)

**A 6-phase plan to enable 5,000+ Allstate agencies** with owner/manager/staff role hierarchy, invitation-based onboarding, and full data isolation. This is a multi-context-window effort.

> **📋 Full Plan:** See [docs/MULTI_TENANCY_EXECUTION_PLAN.md](./docs/MULTI_TENANCY_EXECUTION_PLAN.md) for the complete execution plan with file inventories, SQL migrations, verification checklists, and the 42-route API audit.

**Phases:**
1. **Database & Type Foundation** -- Fix RLS conflicts, upgrade roles (`admin`→`manager`, `member`→`staff`), expand permissions to 20 flags
2. **Auth Plumbing** -- Thread `agencyId` through session validator → login → API auth → frontend hooks
3. **API Route Hardening** -- Close 14 unauthenticated routes, add `agency_id` filtering to all data routes
4. **Frontend Permission Migration** -- Replace all `isOwner()`/`isAdmin()` with `usePermission()` hook and `PermissionGate` component
5. **Onboarding & Invitations** -- Self-service agency creation, invitation-based team building, server-side registration
6. **Polish & Email** -- Resend integration, error standardization, final verification

**Key findings:**
- RLS is neutralized (v3 `ELSE true` policies override agency policies)
- `currentUser.current_agency_role` is NEVER populated → `isOwner()` always falls to `name === 'Derrick'`
- 14 API routes have zero auth (including `todos/reorder`, all 7 AI routes, 2 debug endpoints)
- `withAgencyAuth` wrapper exists but only 1 of 42 routes uses it

---

## 🔒 Security Hardening Status (January 2026)

**Allstate security compliance work completed.** The following has been implemented:

### Completed
- ✅ **Server-side login lockout** - Redis-based, 5 attempts/5 min lockout (`serverLockout.ts`)
- ✅ **Role-based access control** - `isOwner()`/`isAdmin()` functions, database role column
- ✅ **Field-level encryption** - AES-256-GCM for PII fields (`fieldEncryption.ts`)
- ✅ **Security monitoring** - SIEM integration, webhook alerts (`securityMonitor.ts`)
- ✅ **CI/CD security scanning** - CodeQL, Semgrep, TruffleHog, npm audit (`.github/workflows/security.yml`)
- ✅ **Rate limiting** - Fail-closed design (`rateLimit.ts`)
- ✅ **Session security** - HttpOnly cookies, 30-min idle timeout (`sessionCookies.ts`, `sessionValidator.ts`)
- ✅ **Audit logging** - Database triggers, security event tables
- ✅ **CSP hardening** - Strict Content-Security-Policy (`next.config.ts`)
- ✅ **Log sanitization** - PII filtering in all logs (`logger.ts`)

### Documentation Created
- `docs/ALLSTATE_SECURITY_CHECKLIST.md` - Compliance checklist (81% complete)
- `docs/SECURITY_RUNBOOKS.md` - Incident response, key rotation, vendor assessment

### Pending (Business Decision)
- ❌ **MFA** - PIN authentication retained per user request
- ⚠️ **Webhook URL** - Set `SECURITY_WEBHOOK_URL` for Slack/Discord alerts

### Key Security Files
```
src/lib/serverLockout.ts      # Redis login lockout
src/lib/fieldEncryption.ts    # AES-256-GCM encryption
src/lib/securityMonitor.ts    # SIEM & alerting
src/lib/sessionCookies.ts     # HttpOnly session management
src/lib/sessionValidator.ts   # Session validation & timeout
src/app/api/security/events/  # Security dashboard API
src/app/api/todos/            # Encrypted todo API
```

---

## Table of Contents

1. [Sprint 3 Features (February 2026)](#sprint-3-features-february-2026) 🎉 **NEW**
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
4. [Tech Stack Details](#tech-stack-details)
5. [Database Schema Deep Dive](#database-schema-deep-dive)
6. [Component Architecture](#component-architecture)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Real-Time Sync Patterns](#real-time-sync-patterns)
9. [AI Integration](#ai-integration)
10. [Authentication & Security](#authentication--security)
11. [Common Patterns & Conventions](#common-patterns--conventions)
12. [Browser Compatibility](#browser-compatibility) 🌐
13. [Debugging & Troubleshooting](#debugging--troubleshooting)
14. [Testing Strategy](#testing-strategy)
15. [Deployment](#deployment)
16. [**🚀 Refactoring Plan**](#refactoring-plan) ⭐
17. [**🤖 Orchestrator Agent Guide**](#orchestrator-agent-guide) ⭐

---

## Sprint 3 Features (February 2026)

**Status:** ✅ Complete | **Duration:** 4 weeks | **Features:** 6 major + comprehensive polish

### Quick Reference

| Feature | Files Added | Lines of Code | Tests | Status |
|---------|-------------|---------------|-------|--------|
| **Collaborative Editing Indicators** | `useEditingIndicator.ts`, `EditingIndicator.tsx` | 279 | 335 | ✅ |
| **Version History UI** | `useVersionHistory.ts`, `VersionHistoryModal.tsx` | 580 | 438 | ✅ |
| **Chat Image Attachments** | `useChatAttachments.ts`, `ChatAttachments.tsx` + migration | 713 | 421 | ✅ |
| **Push Notifications** | `usePushNotifications.ts`, `PushNotificationSettings.tsx`, API + migration | 1,010 | 336 | ✅ |
| **Animation Polish** | `microInteractions.ts`, `animationPerformance.ts` | 850 | N/A | ✅ |
| **Performance Monitoring** | `usePerformanceMonitor.ts`, `PerformanceDashboard.tsx` | 1,281 | 391 | ✅ |
| **Documentation** | 3 comprehensive docs | 1,900+ | N/A | ✅ |

### Key Features

#### 1. Collaborative Editing Indicators
**What:** Real-time presence indicators showing who's editing which tasks
**Why:** Prevents edit conflicts and improves team awareness
**Tech:** Supabase Realtime Presence API, color-coded user avatars
**Files:**
- `src/hooks/useEditingIndicator.ts` - Presence management hook
- `src/components/EditingIndicator.tsx` - Visual indicator component

**Usage:**
```typescript
const { startEditing, stopEditing, editingUsers } = useEditingIndicator(todo.id, currentUser.name);
```

#### 2. Version History UI
**What:** Complete version history for every task with one-click restore
**Why:** Audit trail, mistake recovery, change tracking
**Tech:** PostgreSQL trigger auto-creates versions, field-by-field diffs
**Files:**
- `src/hooks/useVersionHistory.ts` - Version management
- `src/components/VersionHistoryModal.tsx` - Timeline UI
- `supabase/migrations/20260115_version_history.sql` - Database schema

**Database:** `todo_versions` table with trigger `create_todo_version`

#### 3. Chat Image Attachments
**What:** Share images in chat with auto-thumbnail generation
**Why:** Visual communication, screenshot sharing
**Tech:** Supabase Storage, Canvas API for thumbnails, lightbox viewer
**Files:**
- `src/hooks/useChatAttachments.ts` - Upload/thumbnail generation
- `src/components/ChatAttachments.tsx` - UI components
- `supabase/migrations/20260201_chat_attachments.sql` - Database + storage

**Storage:** New `chat-attachments` bucket (10MB limit per image)

#### 4. Push Notifications
**What:** Browser push notifications for tasks, mentions, assignments
**Why:** Stay updated without constantly checking the app
**Tech:** Web Push API, VAPID authentication, Service Worker
**Files:**
- `src/hooks/usePushNotifications.ts` - Subscription management
- `src/components/PushNotificationSettings.tsx` - Settings UI
- `src/app/api/push-notifications/send/route.ts` - Server delivery
- `supabase/migrations/20260201_push_subscriptions.sql` - Subscription storage

**Environment:** Requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

#### 5. Animation Polish
**What:** Smooth micro-interactions with GPU acceleration
**Why:** Professional feel, better UX, accessibility support
**Tech:** Framer Motion variants, CSS will-change, reduced motion detection
**Files:**
- `src/lib/microInteractions.ts` - Haptics, sounds, confetti, ripples
- `src/lib/animationPerformance.ts` - GPU hints, frame scheduling, lazy loading

**Features:**
- Success animations (confetti, pulse)
- Error feedback (shake, wiggle)
- Haptic feedback (mobile)
- Sound effects
- Battery-aware performance
- Reduced motion support

#### 6. Performance Monitoring Dashboard
**What:** Real-time metrics for FPS, memory, latency, render times
**Why:** Identify bottlenecks, optimize user experience
**Tech:** Performance API, requestAnimationFrame, Memory API
**Files:**
- `src/hooks/usePerformanceMonitor.ts` - Metrics collection
- `src/components/PerformanceDashboard.tsx` - Dashboard UI

**Metrics Tracked:**
- FPS (target: 60fps)
- Memory usage (JS heap)
- API latency
- Component render times
- Real-time connection status

### Documentation

**Comprehensive guides created:**
- `docs/SPRINT_3_FEATURES.md` (500+ lines) - Developer guide with usage examples
- `docs/API_DOCUMENTATION.md` (800+ lines) - Complete API reference
- `docs/USER_GUIDE_SPRINT3.md` (600+ lines) - User-friendly feature guide

### Database Changes

**New Tables:**
```sql
todo_versions          -- Version history (auto-created by trigger)
push_subscriptions     -- Browser push subscriptions
notification_log       -- Push notification tracking
```

**Modified Tables:**
```sql
messages.attachments   -- JSONB array for chat images
```

**New Storage Buckets:**
```sql
chat-attachments       -- 10MB limit, images only
```

### Migration Guide

**Upgrading to Sprint 3:**

1. **Run database migrations:**
   ```sql
   -- In Supabase SQL Editor:
   -- Run: supabase/migrations/20260115_version_history.sql
   -- Run: supabase/migrations/20260201_chat_attachments.sql
   -- Run: supabase/migrations/20260201_push_subscriptions.sql
   ```

2. **Add environment variables:**
   ```bash
   # Generate VAPID keys: npx web-push generate-vapid-keys
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   VAPID_SUBJECT=mailto:support@bealeragency.com
   ```

3. **Deploy:** Push to `main` branch (Railway auto-deploys)

### Performance Impact

**Build Size:** +500KB (gzipped)
**Bundle Analysis:**
- Framer Motion animations: +200KB
- Push notification libraries: +150KB
- Performance monitoring: +100KB
- Image handling: +50KB

**Runtime Performance:**
- FPS: Maintained 60fps on all devices
- Memory: <50MB increase (typical usage)
- First Load: +200ms (one-time cost)

### Testing Coverage

**Total E2E Tests:** 2,000+ across all Sprint 3 features
- Version History: 40+ tests
- Chat Attachments: 15+ tests
- Push Notifications: 25+ tests
- Performance Dashboard: 45+ tests
- Collaborative Editing: 20+ tests

### Known Limitations

1. **Chat Attachments:** Images only (no PDFs/documents yet)
2. **Push Notifications:** Requires HTTPS (except localhost)
3. **Memory API:** Only available in Chromium browsers
4. **Service Workers:** May not work in private/incognito mode

### Future Enhancements

**Planned for Sprint 4 (if applicable):**
- Document attachments in chat
- Granular notification controls
- Offline mode with sync
- Voice message transcription
- Custom performance alerts

### Troubleshooting

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Version history not creating | Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'create_todo_version'` |
| Image upload fails | Check storage bucket exists and RLS policies allow uploads |
| Push notifications not working | Verify VAPID keys set, browser supports, HTTPS enabled |
| Performance dashboard shows N/A | Memory API only available in Chrome/Edge |
| Animations stuttering | Check reduced motion preference, battery level |

**Debug Commands:**
```bash
# Check push subscription
SELECT * FROM push_subscriptions WHERE user_id = 'uuid';

# Check notification log
SELECT * FROM notification_log ORDER BY created_at DESC LIMIT 10;

# Check version history
SELECT * FROM todo_versions WHERE todo_id = 'uuid' ORDER BY version_number DESC;
```

### Related Documentation

- Full feature docs: `docs/SPRINT_3_FEATURES.md`
- API reference: `docs/API_DOCUMENTATION.md`
- User guide: `docs/USER_GUIDE_SPRINT3.md`
- Migration SQL: `supabase/migrations/2026*`

---

## Project Overview

### What This App Does

The Bealer Agency Todo List is a **comprehensive collaborative task management platform** built specifically for the Bealer Agency (Allstate insurance agency). It combines:

- **Task Management**: Full CRUD with subtasks, attachments, notes, recurrence
- **Team Collaboration**: Real-time chat, DMs, message reactions, presence tracking
- **Strategic Planning**: Owner-only goals dashboard with milestones and progress tracking
- **AI-Powered Workflows**: Smart parsing, transcription, email generation, task enhancement
- **Analytics**: Activity feed, dashboard with stats, weekly progress charts
- **Integration**: Outlook add-in for email-to-task conversion

### Target Users

- **Derrick** (Owner/Admin): Has access to Strategic Goals dashboard
- **Sefra** (Team Member): Standard user access
- Small insurance agency team (2-10 people)

### Key Differentiators

1. **Insurance-Specific Features**: Email generation with insurance agent tone
2. **AI-First**: Multiple AI endpoints for task parsing, transcription, enhancement
3. **Real-Time Everything**: Tasks, chat, activity all sync instantly
4. **Highly Polished UX**: Dark mode, animations, keyboard shortcuts, mobile-optimized

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js 16 App                        │
│                    (App Router + React 19)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard  │  │  Tasks View  │  │  Chat Panel  │    │
│  │   (Stats)    │  │ (List/Kanban)│  │  (Messages)  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Strategic   │  │  Activity    │  │  Outlook     │    │
│  │    Goals     │  │    Feed      │  │   Add-in     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                     API Routes (17)                         │
│  /api/outlook/* | /api/ai/* | /api/goals/* | /api/*       │
├─────────────────────────────────────────────────────────────┤
│                   Supabase Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │  Real-time   │  │   Storage    │    │
│  │  (9 tables)  │  │  Channels    │  │  (Files)     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │   External AI Services   │
              │  • Anthropic Claude API  │
              │  • OpenAI Whisper API    │
              └─────────────────────────┘
```

### Data Flow Pattern

```
User Action (Client)
    ↓
React Component State Update (Optimistic)
    ↓
Supabase Client API Call
    ↓
PostgreSQL Database Mutation
    ↓
Supabase Real-time Broadcast
    ↓
All Connected Clients Receive Update
    ↓
React Components Re-render
```

### App Router Structure

```
src/
├── app/
│   ├── page.tsx                    # Main entry (auth + app shell)
│   ├── layout.tsx                  # Root layout with theme provider
│   ├── api/                        # API routes
│   │   ├── ai/                     # 8 AI endpoints
│   │   ├── outlook/                # 3 Outlook endpoints
│   │   ├── templates/              # Template CRUD
│   │   ├── activity/               # Activity logging
│   │   ├── attachments/            # File uploads
│   │   ├── goals/                  # Goals CRUD
│   │   │   ├── categories/         # Goal categories
│   │   │   └── milestones/         # Goal milestones
│   └── outlook-setup/              # Outlook add-in instructions
└── components/                     # 32+ React components
```

---

## Tech Stack Details

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.10 | React framework with App Router |
| React | 19.2.0 | UI library |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 12.8.0 | Animations |
| @dnd-kit | 8.x | Drag-and-drop (Kanban) |
| lucide-react | Latest | Icon library (556 icons) |
| date-fns | 4.1.0 | Date utilities |
| uuid | 11.0.6 | Unique ID generation |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 16.0.10 | Server-side endpoints |
| Supabase JS | 2.48.0 | Database + real-time client |
| Anthropic SDK | 0.38.0 | Claude AI API |
| OpenAI SDK | Implicit | Whisper transcription |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL database, real-time subscriptions, file storage |
| Railway | Docker deployment platform |
| Anthropic | AI parsing, enhancement, email generation |
| OpenAI | Voice transcription (Whisper) |

### Development Tools

| Tool | Purpose |
|------|---------|
| Playwright | 1.57.0 - E2E testing |
| ESLint | 9.x - Code linting |
| PostCSS | Tailwind processing |
| Turbopack | Next.js 16 bundler |

---

## Database Schema Deep Dive

### Core Tables

#### `users` table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,  -- SHA-256 hash
  color TEXT DEFAULT '#0033A0',  -- User color for UI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  streak_count INTEGER DEFAULT 0,  -- Login streak
  streak_last_date DATE,
  welcome_shown_at TIMESTAMP WITH TIME ZONE  -- Last welcome notification
);
```

**Key Points:**
- No email/password - PIN-only authentication
- `pin_hash` is SHA-256 of 4-digit PIN (hashed client-side)
- `color` is one of 8 Allstate brand colors (assigned at registration)
- Streak tracking for gamification

#### `todos` table
```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'todo',  -- 'todo' | 'in_progress' | 'done'
  priority TEXT DEFAULT 'medium',  -- 'low' | 'medium' | 'high' | 'urgent'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL,  -- User name (not ID)
  assigned_to TEXT,  -- User name or NULL
  due_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  recurrence TEXT,  -- 'daily' | 'weekly' | 'monthly' | NULL
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,
  -- Advanced fields
  subtasks JSONB DEFAULT '[]'::jsonb,  -- Array of subtask objects
  attachments JSONB DEFAULT '[]'::jsonb,  -- Array of attachment metadata
  transcription TEXT,  -- Voicemail transcription
  merged_from UUID[]  -- IDs of tasks merged into this one
);
```

**Subtask Structure (JSONB):**
```json
{
  "id": "uuid-string",
  "text": "Subtask description",
  "completed": false,
  "priority": "medium",
  "estimatedMinutes": 30
}
```

**Attachment Structure (JSONB):**
```json
{
  "id": "uuid-string",
  "file_name": "document.pdf",
  "file_type": "pdf",  // "pdf" | "image" | "audio" | "video" | "document" | "archive"
  "file_size": 1048576,  // bytes
  "mime_type": "application/pdf",
  "storage_path": "todos/task-id/document.pdf",
  "uploaded_by": "Derrick",
  "uploaded_at": "2025-01-08T10:00:00Z"
}
```

#### `messages` table (Chat)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  created_by TEXT NOT NULL,  -- User name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  related_todo_id UUID,  -- NULL for general chat, UUID for task discussions
  recipient TEXT,  -- NULL for team chat, user name for DMs
  reactions JSONB DEFAULT '[]'::jsonb,  -- Array of reaction objects
  read_by TEXT[] DEFAULT '{}',  -- Array of user names who read
  reply_to_id UUID,  -- Parent message ID for threading
  reply_to_text TEXT,  -- Cached parent text
  reply_to_user TEXT,  -- Cached parent user
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete
  is_pinned BOOLEAN DEFAULT FALSE,
  pinned_by TEXT,
  pinned_at TIMESTAMP WITH TIME ZONE,
  mentions TEXT[] DEFAULT '{}'  -- Array of @mentioned user names
);
```

**Reaction Structure (JSONB):**
```json
{
  "type": "heart",  // "heart" | "thumbsup" | "thumbsdown" | "laugh" | "exclamation" | "question"
  "userName": "Derrick",
  "createdAt": "2025-01-08T10:00:00Z"
}
```

#### `activity_log` table
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,  -- Constrained to 15+ action types
  todo_id UUID,
  todo_text TEXT,
  user_name TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
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

**Details Structure (JSONB) - varies by action:**
```json
{
  "from": "medium",
  "to": "urgent"
}
```

#### `task_templates` table
```sql
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_priority TEXT DEFAULT 'medium',
  default_assigned_to TEXT,
  subtasks JSONB DEFAULT '[]'::jsonb,  -- Same structure as todos.subtasks
  created_by TEXT NOT NULL,
  is_shared BOOLEAN DEFAULT FALSE,  -- Shared with team or private
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Strategic Goals Tables

**`strategic_goals`:**
```sql
CREATE TABLE strategic_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES goal_categories(id),
  status TEXT DEFAULT 'not_started',  -- 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  priority TEXT DEFAULT 'medium',  -- 'low' | 'medium' | 'high' | 'critical'
  target_date DATE,
  target_value TEXT,  -- e.g., "$1M revenue"
  current_value TEXT,  -- e.g., "$750K"
  progress_percent INTEGER DEFAULT 0,  -- 0-100
  notes TEXT,
  display_order INTEGER,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**`goal_categories` (6 predefined):**
```sql
CREATE TABLE goal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,  -- Hex color
  icon TEXT,  -- Icon name
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Categories:
1. Revenue & Growth (🟢 Green)
2. Client Acquisition (🔵 Blue)
3. Team Development (🟣 Purple)
4. Operations (🟠 Orange)
5. Marketing (🩷 Pink)
6. Product Lines (🔷 Blue Diamond)

**`goal_milestones`:**
```sql
CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES strategic_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  target_date DATE,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `device_tokens` table (Push Notifications)
```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,  -- 'ios' | 'android' | 'web'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row-Level Security (RLS)

All tables have RLS enabled with permissive policies:
```sql
CREATE POLICY "Allow all operations" ON table_name
  FOR ALL USING (true) WITH CHECK (true);
```

**Access control is enforced at the application level, not database level.**

### Real-Time Publications

These tables are published for real-time subscriptions:
- `todos`
- `messages`
- `activity_log`
- `strategic_goals`
- `goal_milestones`

Enable real-time:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE todos;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- etc.
```

---

## Component Architecture

### Component Hierarchy

```
App Entry: page.tsx (auth state)
│
├── LoginScreen.tsx (if not authenticated)
│
└── MainApp.tsx (if authenticated)
    │
    ├── Dashboard.tsx (view === 'dashboard')
    │   ├── ProgressSummary.tsx
    │   └── WeeklyProgressChart.tsx
    │
    ├── TodoList.tsx (view === 'tasks')
    │   ├── AddTodo.tsx
    │   │   ├── SmartParseModal.tsx
    │   │   ├── TemplatePicker.tsx
    │   │   └── SaveTemplateModal.tsx
    │   │
    │   ├── TodoItem.tsx (list mode)
    │   │   ├── AttachmentList.tsx
    │   │   ├── DuplicateDetectionModal.tsx
    │   │   └── CustomerEmailModal.tsx
    │   │
    │   └── KanbanBoard.tsx (kanban mode)
    │       └── SortableTodoItem.tsx
    │
    ├── ChatPanel.tsx
    │   └── VoiceRecordingIndicator.tsx
    │
    ├── StrategicDashboard.tsx (owner only)
    │
    ├── ArchiveView.tsx (view === 'archive')
    │   └── ArchivedTaskModal.tsx
    │
    ├── ActivityFeed.tsx
    │
    └── Global UI Components
        ├── UserSwitcher.tsx
        ├── PullToRefresh.tsx
        ├── KeyboardShortcutsModal.tsx
        ├── ConfirmDialog.tsx
        ├── EmptyState.tsx
        └── CelebrationEffect.tsx
```

### Key Component Patterns

#### Real-Time Subscription Pattern
```typescript
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setTodos(prev => [payload.new as Todo, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTodos(prev => prev.map(t =>
            t.id === payload.new.id ? payload.new as Todo : t
          ));
        } else if (payload.eventType === 'DELETE') {
          setTodos(prev => prev.filter(t => t.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

#### State Management Pattern
```typescript
// Local state for UI
const [todos, setTodos] = useState<Todo[]>([]);
const [loading, setLoading] = useState(true);

// Memoized computed values
const completedCount = useMemo(() =>
  todos.filter(t => t.completed).length,
  [todos]
);

// Callback-wrapped handlers
const handleComplete = useCallback(async (id: string) => {
  // Optimistic update
  setTodos(prev => prev.map(t =>
    t.id === id ? { ...t, completed: !t.completed } : t
  ));

  // Persist to database
  await supabase
    .from('todos')
    .update({ completed: true })
    .eq('id', id);
}, []);
```

### Component File Sizes (Top 10)

1. `ChatPanel.tsx` - 2,062 lines
2. `StrategicDashboard.tsx` - 1,463 lines
3. `TodoList.tsx` - 1,200+ lines
4. `KanbanBoard.tsx` - 800+ lines
5. `Dashboard.tsx` - 662 lines
6. `ActivityFeed.tsx` - 505 lines
7. `TodoItem.tsx` - 450+ lines
8. `AddTodo.tsx` - 400+ lines
9. `LoginScreen.tsx` - 350+ lines
10. `CustomerEmailModal.tsx` - 300+ lines

---

## API Endpoints Reference

### Outlook Integration Endpoints

#### `GET /api/outlook/users`
- **Auth**: Requires `X-API-Key` header
- **Purpose**: List all registered users for Outlook add-in
- **Response**:
```json
{
  "users": [
    { "id": "uuid", "name": "Derrick", "color": "#0033A0" }
  ]
}
```

#### `POST /api/outlook/parse-email`
- **Auth**: Requires `X-API-Key` header
- **Purpose**: AI-powered email parsing to extract task details
- **Request**:
```json
{
  "subject": "Policy renewal for John Smith",
  "body": "Email body text...",
  "from": "customer@example.com",
  "users": ["Derrick", "Sefra"]
}
```
- **Response**:
```json
{
  "taskDescription": "Process policy renewal for John Smith",
  "assignedTo": "Derrick",
  "priority": "high",
  "dueDate": "2025-01-15",
  "notes": "Customer mentioned..."
}
```

#### `POST /api/outlook/create-task`
- **Auth**: Requires `X-API-Key` header
- **Purpose**: Create a new task from Outlook
- **Request**:
```json
{
  "text": "Task description",
  "priority": "high",
  "assignedTo": "Derrick",
  "dueDate": "2025-01-15",
  "notes": "Additional context",
  "createdBy": "Derrick"
}
```

### AI Endpoints

#### `POST /api/ai/smart-parse`
- **Auth**: None (internal)
- **Purpose**: Parse natural language text into task + subtasks
- **Request**:
```json
{
  "text": "Call John about his auto policy renewal by Friday. Need to: review coverage, calculate premium, prepare quote",
  "users": ["Derrick", "Sefra"]
}
```
- **Response**:
```json
{
  "mainTask": {
    "text": "Call John about auto policy renewal",
    "priority": "high",
    "assignedTo": "Derrick",
    "dueDate": "2025-01-12"
  },
  "subtasks": [
    { "text": "Review current coverage", "priority": "medium" },
    { "text": "Calculate new premium", "priority": "medium" },
    { "text": "Prepare renewal quote", "priority": "high" }
  ]
}
```

#### `POST /api/ai/enhance-task`
- **Purpose**: Improve task clarity and extract metadata
- **Request**:
```json
{
  "text": "call john asap about thing",
  "users": ["Derrick", "Sefra"]
}
```
- **Response**:
```json
{
  "enhancedText": "Call John about policy matter (urgent)",
  "priority": "urgent",
  "suggestions": {
    "assignedTo": "Derrick",
    "notes": "Follow up on policy-related issue"
  }
}
```

#### `POST /api/ai/breakdown-task`
- **Purpose**: Generate detailed subtasks for complex task
- **Request**:
```json
{
  "taskText": "Onboard new commercial client",
  "taskContext": "Large manufacturing company, 50 employees"
}
```
- **Response**:
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
    ...
  ]
}
```

#### `POST /api/ai/transcribe`
- **Purpose**: Transcribe audio to text using Whisper, optionally parse as tasks
- **Request**: Multipart form data with `audio` file
- **Query Params**:
  - `mode`: `'text'` (transcript only) or `'tasks'` (parse into tasks)
  - `users`: JSON array of user names (if mode=tasks)
- **Response (mode=text)**:
```json
{
  "transcription": "John called about his policy renewal..."
}
```
- **Response (mode=tasks)**:
```json
{
  "tasks": [
    {
      "text": "Follow up on John's policy renewal",
      "priority": "high",
      "transcription": "John called about..."
    }
  ]
}
```

#### `POST /api/ai/parse-voicemail`
- **Purpose**: Extract actionable task from voicemail transcription
- **Request**:
```json
{
  "transcription": "Hi this is Sarah, my policy number is 12345...",
  "users": ["Derrick", "Sefra"]
}
```
- **Response**: Same as `smart-parse`

#### `POST /api/ai/parse-file`
- **Purpose**: Extract text and tasks from uploaded documents
- **Request**: Multipart form data with `file`
- **Response**: Similar to `smart-parse` with extracted content

#### `POST /api/ai/parse-content-to-subtasks`
- **Purpose**: Convert bullet points or paragraphs into subtasks
- **Request**:
```json
{
  "content": "- Review policy\n- Calculate premium\n- Send quote",
  "parentTaskText": "Process renewal"
}
```
- **Response**:
```json
{
  "subtasks": [
    { "text": "Review policy", "priority": "medium" },
    { "text": "Calculate premium", "priority": "medium" },
    { "text": "Send quote", "priority": "high" }
  ]
}
```

#### `POST /api/ai/generate-email`
- **Purpose**: Generate professional customer email from task(s)
- **Request**:
```json
{
  "customerName": "John Smith",
  "tasks": [
    {
      "text": "Process auto policy renewal",
      "notes": "Discussed coverage options",
      "completed": true,
      "subtasks": [
        { "text": "Review coverage", "completed": true },
        { "text": "Calculate premium", "completed": true }
      ],
      "transcription": "Customer mentioned...",
      "attachments": [
        { "file_name": "quote.pdf", "file_type": "pdf" }
      ]
    }
  ],
  "tone": "friendly"  // or "formal" or "brief"
}
```
- **Response**:
```json
{
  "subject": "Update on Your Auto Policy Renewal",
  "body": "Hi John,\n\nI wanted to reach out regarding your auto policy renewal...",
  "warnings": [
    {
      "type": "date_promise",
      "message": "Email mentions 'by Friday' - verify this is achievable",
      "severity": "medium"
    }
  ]
}
```

**Warning Types**:
- `sensitive_info`: SSN, account numbers detected
- `date_promise`: Specific dates or deadlines mentioned
- `pricing`: Dollar amounts or pricing details
- `coverage_details`: Insurance coverage specifics
- `negative_news`: Denials, cancellations, bad news

### Data Management Endpoints

#### `GET /api/templates`
- **Purpose**: Fetch user's templates
- **Query**: `?userName=Derrick`
- **Response**: Array of `TaskTemplate` objects

#### `POST /api/templates`
- **Purpose**: Create new template
- **Request**: `TaskTemplate` object

#### `DELETE /api/templates`
- **Purpose**: Delete template
- **Query**: `?id=uuid`

#### `GET /api/activity`
- **Purpose**: Fetch activity log
- **Query**: `?userName=Derrick` (optional, filters to user's actions)
- **Response**: Array of `ActivityLogEntry` objects

#### `POST /api/activity`
- **Purpose**: Log new activity
- **Request**: `ActivityLogEntry` object

#### `POST /api/attachments`
- **Purpose**: Upload file attachment
- **Request**: Multipart form data
  - `file`: File to upload
  - `todoId`: UUID of parent task
  - `uploadedBy`: User name
- **Response**:
```json
{
  "attachment": {
    "id": "uuid",
    "file_name": "document.pdf",
    "storage_path": "todos/task-id/document.pdf",
    "file_size": 1048576,
    ...
  }
}
```

#### Goal Endpoints
- `GET /api/goals` - Fetch goals with categories and milestones
- `POST /api/goals` - Create goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `GET/POST /api/goals/categories` - Manage categories
- `GET/POST /api/goals/milestones` - Manage milestones

---

## Real-Time Sync Patterns

### Pattern 1: Simple Table Subscription

```typescript
useEffect(() => {
  const channel = supabase
    .channel('todos-channel')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      handleTodoChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

### Pattern 2: Filtered Subscription

```typescript
const channel = supabase
  .channel('my-todos')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'todos',
      filter: `assigned_to=eq.${currentUser.name}`
    },
    handleChange
  )
  .subscribe();
```

### Pattern 3: Multiple Table Subscription

```typescript
const channel = supabase
  .channel('dashboard-data')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'todos' },
    handleTodoChange
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'messages' },
    handleMessageChange
  )
  .subscribe();
```

### Pattern 4: Presence Tracking (Chat)

```typescript
const channel = supabase.channel('online-users', {
  config: { presence: { key: currentUser.name } }
});

// Track presence
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    setOnlineUsers(Object.keys(state));
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user: currentUser.name,
        online_at: new Date().toISOString()
      });
    }
  });
```

### Optimistic Updates Best Practice

```typescript
const handleComplete = async (todoId: string) => {
  // 1. Optimistic update (instant UI feedback)
  setTodos(prev => prev.map(t =>
    t.id === todoId ? { ...t, completed: true } : t
  ));

  try {
    // 2. Persist to database
    const { error } = await supabase
      .from('todos')
      .update({ completed: true, updated_at: new Date().toISOString() })
      .eq('id', todoId);

    if (error) throw error;

    // 3. Real-time broadcast will sync to other clients
    // No need to refetch - subscription will update us if needed

  } catch (error) {
    // 4. Rollback on error
    console.error('Failed to complete todo:', error);
    setTodos(prev => prev.map(t =>
      t.id === todoId ? { ...t, completed: false } : t
    ));
    alert('Failed to update task');
  }
};
```

---

## AI Integration

### Claude API Usage

All AI endpoints use the Anthropic Claude API (Sonnet 3.5 or similar).

**Common Pattern:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: `Parse this into a task: ${userInput}`
    }
  ]
});

const response = message.content[0].text;
const parsed = JSON.parse(response);
```

### System Prompts

**Smart Parse System Prompt:**
```
You are a task parsing assistant for an insurance agency.
Parse the input into a main task and 2-6 subtasks.
Extract:
- Priority (low/medium/high/urgent) - look for urgency indicators
- Due date - parse relative dates like "tomorrow", "next Friday"
- Assignee - match names from the provided user list
Return JSON format: { mainTask: {...}, subtasks: [...] }
```

**Email Generation System Prompt:**
```
You are writing an email on behalf of an insurance agent.
Tone: Professional, warm, relationship-focused.
Include:
- Reference any voicemail transcription naturally
- Acknowledge attached documents
- Show progress on subtasks to demonstrate thoroughness
- Use insurance terminology (policy, coverage, premium, carrier)
Flag warnings for:
- Sensitive data (SSN, account numbers)
- Date promises
- Pricing/coverage details
Return: { subject, body, warnings: [...] }
```

### OpenAI Whisper for Transcription

```typescript
const formData = new FormData();
formData.append('file', audioFile);
formData.append('model', 'whisper-1');

const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: formData
});

const { text } = await response.json();
// text is the transcription
```

---

## Authentication & Security

### PIN-Based Authentication Flow

1. **User Registration** (LoginScreen.tsx):
```typescript
const registerUser = async (name: string, pin: string) => {
  // Hash PIN client-side
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const pin_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Store in database
  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, pin_hash, color: randomColor() })
    .select()
    .single();

  return user;
};
```

2. **PIN Verification** (LoginScreen.tsx):
```typescript
const verifyPin = async (userId: string, pin: string) => {
  const pin_hash = await hashPin(pin);

  const { data: user } = await supabase
    .from('users')
    .select()
    .eq('id', userId)
    .eq('pin_hash', pin_hash)
    .single();

  return user !== null;
};
```

3. **Session Storage** (localStorage):
```typescript
interface StoredSession {
  userId: string;
  userName: string;
  loginAt: string;
}

localStorage.setItem('todoSession', JSON.stringify({
  userId: user.id,
  userName: user.name,
  loginAt: new Date().toISOString()
}));
```

4. **Lockout Mechanism**:
- 3 failed attempts → 30-second lockout
- Counter stored in component state (not persisted)

### API Key Authentication (Outlook)

Outlook endpoints require `X-API-Key` header:
```typescript
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== process.env.OUTLOOK_ADDON_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Access Control

**Owner-Only Features** (checked in component):
```typescript
const isOwner = currentUser?.name === 'Derrick';

{isOwner && (
  <button onClick={openStrategicDashboard}>
    Strategic Goals
  </button>
)}
```

**No row-level security at database level** - all access control is application-level.

---

## Common Patterns & Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `TodoList.tsx`)
- Utilities: `camelCase.ts` (e.g., `duplicateDetection.ts`)
- API routes: `route.ts` (Next.js App Router convention)

### Component Structure
```typescript
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Todo } from '@/types/todo';

interface MyComponentProps {
  todos: Todo[];
  onUpdate: (todo: Todo) => void;
}

export function MyComponent({ todos, onUpdate }: MyComponentProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Side effects
  }, []);

  const handleAction = async () => {
    // Event handlers
  };

  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### TypeScript Conventions
- All types defined in `src/types/todo.ts`
- Prefer interfaces over types for objects
- Use enums for string unions:
```typescript
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}
```

### Styling Conventions
- Tailwind utility classes for all styling
- CSS variables for theme colors:
  - `--brand-blue`: `#0033A0`
  - `--sky-blue`: `#72B5E8`
  - `--gold`: `#C9A227`
- Dark mode: `dark:` prefix in Tailwind classes
- Responsive: `sm:`, `md:`, `lg:` breakpoints

### Error Handling
```typescript
try {
  const { data, error } = await supabase.from('todos').select();
  if (error) throw error;
  setTodos(data);
} catch (error) {
  console.error('Failed to fetch todos:', error);
  // User-friendly error message
  alert('Failed to load tasks. Please refresh.');
}
```

### Activity Logging
```typescript
import { logActivity } from '@/lib/activityLogger';

await logActivity({
  action: 'task_created',
  todo_id: newTodo.id,
  todo_text: newTodo.text,
  user_name: currentUser.name,
  details: { priority: newTodo.priority }
});
```

---

## Browser Compatibility

### Supported Browsers

The Bealer Agency Todo List is tested and fully compatible with:

| Browser | Minimum Version | Platform | Status | Notes |
|---------|----------------|----------|--------|-------|
| **Safari** | 16+ | iOS/iPadOS | ✅ Fully Supported | 40% of mobile users |
| **Safari** | 16+ | macOS | ✅ Fully Supported | Primary macOS browser |
| **Chrome** | 100+ | All platforms | ✅ Fully Supported | Development primary |
| **Firefox** | 100+ | All platforms | ✅ Fully Supported | Full compatibility |
| **Edge** | 100+ | Windows/macOS | ✅ Fully Supported | Chromium-based |

### WebKit-Specific Considerations

**Important:** This app was previously affected by a WebKit rendering bug that caused blank pages in Safari. This has been **fully resolved** as of January 2026.

#### Historical Issue (RESOLVED)
- **Problem:** App rendered blank page in Safari/WebKit browsers
- **Cause:** ThemeProvider was returning `null` during initial render
- **Fix:** Removed conditional rendering logic, provider now always renders children
- **Result:** 100% compatibility with Safari on all platforms

#### Key Takeaways for Developers

1. **Never return `null` from context providers** - This causes hydration failures in WebKit
2. **Always test in Safari** - WebKit is stricter than Chromium about React patterns
3. **Use `useEffect` for initialization** - But render children immediately, don't wait for mount

#### Related Documentation
- **Detailed Fix Guide:** [docs/WEBKIT_FIX_GUIDE.md](./docs/WEBKIT_FIX_GUIDE.md)
- **Edge Compatibility:** [docs/EDGE_COMPATIBILITY_GUIDE.md](./docs/EDGE_COMPATIBILITY_GUIDE.md)
- **CSP Issue (separate):** [WEBKIT_BUG_REPORT.md](./WEBKIT_BUG_REPORT.md)

### Testing Across Browsers

**Automated Testing:**
```bash
# Run tests in all browsers
npx playwright test

# Run WebKit-specific tests
npx playwright test --project=webkit

# Run Edge-specific tests
npx playwright test --project=msedge

# Run with browser visible for debugging
npx playwright test --project=webkit --headed
npx playwright test --project=msedge --headed
```

**Manual Testing Checklist:**
- [ ] Safari on iOS (simulator or device)
- [ ] Safari on macOS
- [ ] Chrome on desktop
- [ ] Firefox on desktop
- [ ] Dark mode toggle works in all browsers
- [ ] Real-time sync works in all browsers
- [ ] File uploads work in all browsers

### Known Browser Limitations

#### iOS Safari
- **File Upload:** Limited to certain file types by iOS (not app limitation)
- **Audio Recording:** Requires HTTPS in production (works on localhost)
- **Notifications:** Requires user permission, limited in PWA mode

#### All Browsers
- **localStorage:** Disabled in private/incognito mode (theme won't persist - expected)
- **WebSockets:** May disconnect on mobile when app backgrounded (auto-reconnects)
- **Service Workers:** Not implemented yet (planned for offline support)

### Progressive Web App (PWA) Support

**Current Status:** Partial PWA support

**What Works:**
- ✅ Responsive design (mobile-optimized)
- ✅ Installable on mobile (Add to Home Screen)
- ✅ Theme persistence
- ✅ Real-time updates

**What's Missing:**
- ❌ Offline support (requires network connection)
- ❌ Push notifications (planned)
- ❌ Background sync (planned)

**Future Plans:** Full PWA support in [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) Phase 4

### Content Security Policy (CSP)

The app uses a strict CSP for security. **Important for development:**

```typescript
// In next.config.ts
// upgrade-insecure-requests is DISABLED in development
// This prevents TLS errors in WebKit when testing on localhost

const cspDirectives = {
  // ... other directives
  ...(isProduction ? { "upgrade-insecure-requests": [] } : {}),
};
```

**Why this matters:**
- Development uses `http://localhost:3000`
- Production uses `https://` (enforced by Railway)
- WebKit strictly enforces TLS validation
- Enabling `upgrade-insecure-requests` in dev breaks Safari testing

See [WEBKIT_BUG_REPORT.md](./WEBKIT_BUG_REPORT.md) for full CSP analysis.

### Performance Across Browsers

**Measured Performance (iPhone 13 Pro vs. Desktop Chrome):**

| Metric | Safari iOS | Chrome Desktop | Notes |
|--------|-----------|----------------|-------|
| **Time to First Render** | 45ms | 32ms | Acceptable |
| **Time to Interactive** | 320ms | 180ms | Mobile network factor |
| **Real-time Sync Latency** | 150ms | 120ms | WebSocket overhead |
| **Theme Toggle** | <16ms | <16ms | Imperceptible |

**Optimization Strategies:**
- Bundle size optimized with Next.js automatic code splitting
- Images use WebP with fallbacks
- Supabase connection pooling for mobile
- Lazy loading for non-critical components

---

## Debugging & Troubleshooting

### Common Issues

#### Real-Time Not Working
**Symptoms:** Changes don't appear on other clients

**Debug steps:**
1. Check Supabase dashboard → Database → Replication → Ensure tables are published
2. Console log in subscription handler to verify events are firing
3. Check channel subscription status:
```typescript
.subscribe((status) => {
  console.log('Channel status:', status);  // Should be 'SUBSCRIBED'
});
```
4. Verify `.removeChannel()` is called in cleanup

#### Authentication Fails
**Symptoms:** PIN correct but login fails

**Debug steps:**
1. Console log the hashed PIN and compare with database
2. Check for extra whitespace in PIN or username
3. Verify Supabase connection:
```typescript
const { data, error } = await supabase.from('users').select().limit(1);
console.log('Supabase connection:', data, error);
```

#### AI Endpoints Timeout
**Symptoms:** AI features hang or fail

**Debug steps:**
1. Check `ANTHROPIC_API_KEY` in Railway environment
2. Verify API key has credits (check Anthropic console)
3. Check rate limiting (max 60 req/min on tier 1)
4. Console log request/response:
```typescript
console.log('AI request:', { prompt, model });
const response = await anthropic.messages.create(...);
console.log('AI response:', response);
```

#### File Uploads Fail
**Symptoms:** Attachments don't upload

**Debug steps:**
1. Check `SUPABASE_SERVICE_ROLE_KEY` (not anon key!)
2. Verify storage bucket exists in Supabase dashboard
3. Check file size (25MB max)
4. Console log upload error:
```typescript
const { data, error } = await supabase.storage.from('todo-attachments').upload(...);
if (error) console.error('Upload error:', error);
```

#### Blank Page in Safari/WebKit
**Symptoms:** App loads fine in Chrome/Firefox but shows blank page in Safari

**Root Cause:** ThemeProvider returning `null` during initial render

**Quick Fix:**
1. Check `src/contexts/ThemeContext.tsx`
2. Ensure there is NO `if (!mounted) return null` logic
3. Component should always render children immediately

**Detailed Guide:** See [docs/WEBKIT_FIX_GUIDE.md](./docs/WEBKIT_FIX_GUIDE.md)

**Debug steps:**
1. Open Safari Developer Console (Develop → Show JavaScript Console)
2. Check for React hydration errors
3. Verify ThemeProvider is rendering children
4. Run WebKit tests: `npx playwright test --project=webkit`

**Prevention:**
- Never return `null` from providers to "wait for mount"
- Use `useEffect` for initialization, but render children immediately
- Test in Safari during development (not just Chrome)

### Console Debugging

Enable verbose logging:
```typescript
// In MainApp.tsx or wherever real-time is used
useEffect(() => {
  const channel = supabase.channel('todos-debug')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
      console.log('📨 Real-time event:', payload.eventType, payload.new || payload.old);
    })
    .subscribe((status) => {
      console.log('🔌 Channel status:', status);
    });

  return () => {
    console.log('🔌 Unsubscribing from channel');
    supabase.removeChannel(channel);
  };
}, []);
```

### Network Debugging

Use browser DevTools Network tab:
- Filter by `supabase.co` to see database requests
- Filter by `anthropic.com` to see AI requests
- Look for 401/403 errors (auth issues)
- Look for 429 errors (rate limiting)

---

## Testing Strategy

### CRITICAL: Production Data Protection

**All existing tasks in the Supabase database are OFF LIMITS.** This includes incomplete tasks, completed tasks, and archived tasks. When running E2E tests or any automated process:

- **NEVER delete real user tasks** from the database — not even "completed" or "old" ones
- **NEVER bulk-delete tasks** based on broad filters (e.g., `agency_id IS NULL`) without first verifying each task is a test artifact
- **Any tasks created during testing MUST be cleaned up** by the test itself (use `afterEach`/`afterAll` hooks) or identified by a clear naming convention (e.g., `E2E_Test_*`)
- **Before deleting any data**, always verify by checking the `text` field — real tasks contain customer names and insurance terminology; test tasks contain timestamps or generic text like "test"
- If a cleanup script is needed, it must target **only** tasks matching test patterns (e.g., `Task_\d+`, `Persist_\d+`, `E2E_Test_*`) and must log what it deletes

Violating this rule risks losing irreplaceable business data. When in doubt, **do not delete**.

### E2E Tests (Playwright)

**Test Files:** `tests/*.spec.ts`

**Run tests:**
```bash
npm run dev  # Start server
npx playwright test
npx playwright test --ui  # With UI
```

**Example test:**
```typescript
test('create and complete task', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Login
  await page.click('[data-testid="user-card-Derrick"]');
  await page.fill('[data-testid="pin-input"]', '8008');
  await page.click('[data-testid="login-button"]');

  // Create task
  await page.fill('[data-testid="task-input"]', 'Test task');
  await page.click('[data-testid="add-task-button"]');

  // Verify task appears
  await expect(page.locator('text=Test task')).toBeVisible();

  // Complete task
  await page.click('[data-testid="task-checkbox"]');
  await expect(page.locator('[data-testid="task-item"]')).toHaveClass(/completed/);
});
```

### Manual Testing Checklist

See `tests/MANUAL_EMAIL_TESTS.md` for comprehensive manual testing guide.

**Key flows to test:**
1. Authentication (login, user switching, PIN failure)
2. Task CRUD (create, edit, complete, delete)
3. Real-time sync (multi-tab testing)
4. Kanban drag-and-drop
5. Chat (messages, reactions, threading)
6. AI features (smart parse, email generation)
7. Attachments (upload, download, preview)
8. Dark mode toggle
9. Mobile responsiveness

### Integration Tests

**AI Endpoint Tests:** `tests/run-email-tests.ts`

Run with:
```bash
npm run dev
npx tsx tests/run-email-tests.ts
```

Covers:
- Email generation with all features
- Warning detection
- Tone variations
- Error handling

---

## Deployment

### Railway Deployment

**Setup:**
1. Push to GitHub
2. Connect Railway to repo
3. Add environment variables
4. Deploy

**Environment Variables (Railway):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
OUTLOOK_ADDON_API_KEY
```

**Build Command:** `npm run build`
**Start Command:** `npm start`

### Dockerfile

The project includes a `Dockerfile` for containerized deployment:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Post-Deployment Checklist

1. ✅ Verify all environment variables are set
2. ✅ Test login flow
3. ✅ Create a test task
4. ✅ Test real-time sync (open two tabs)
5. ✅ Test AI features (smart parse, email generation)
6. ✅ Test Outlook add-in (if applicable)
7. ✅ Check Supabase connection (query should work)
8. ✅ Verify file uploads work
9. ✅ Test dark mode toggle
10. ✅ Check mobile responsiveness

### Monitoring

**Key metrics to monitor:**
- API response times (should be <500ms)
- AI endpoint latency (should be <5s)
- Database query performance
- Real-time connection stability
- File upload success rate

**Error tracking:**
- Check Railway logs for server errors
- Monitor Supabase dashboard for database errors
- Check Anthropic/OpenAI dashboards for API errors

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev          # Start dev server on :3000
npm run build        # Production build
npm start            # Start production server

# Testing
npx playwright test           # Run E2E tests
npx playwright test --ui      # Run with UI
npx tsx tests/run-email-tests.ts  # Run AI integration tests

# Database
# Run migrations in Supabase SQL Editor
# Files: supabase/migrations/*.sql
```

### Key File Paths

```
src/app/page.tsx                      # App entry point
src/components/MainApp.tsx            # Main app shell
src/lib/supabase.ts                   # Supabase client
src/types/todo.ts                     # All TypeScript types
src/app/api/ai/generate-email/route.ts  # Email generation endpoint
supabase/migrations/                  # SQL migrations
```

### Important URLs

- **Production**: https://shared-todo-list-production.up.railway.app
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Railway Dashboard**: https://railway.app
- **Anthropic Console**: https://console.anthropic.com
- **OpenAI Console**: https://platform.openai.com

### Brand Colors (Allstate)

```css
--brand-blue: #0033A0
--sky-blue: #72B5E8
--gold: #C9A227
--navy: #003D7A
--muted-blue: #6E8AA7
```

### User Colors (8 total)

```typescript
const USER_COLORS = [
  '#0033A0',  // Brand Blue
  '#72B5E8',  // Sky Blue
  '#C9A227',  // Gold
  '#003D7A',  // Navy
  '#6E8AA7',  // Muted Blue
  '#5BA8A0',  // Teal
  '#E87722',  // Orange
  '#98579B'   // Purple
];
```

---

## Troubleshooting Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Real-time not syncing | Check table is in `supabase_realtime` publication |
| AI timeout | Verify `ANTHROPIC_API_KEY` is set and valid |
| File upload fails | Use `SUPABASE_SERVICE_ROLE_KEY` not anon key |
| Login fails | Check PIN hash matches (console log both) |
| Dark mode broken | Verify `ThemeContext` is wrapping app |
| Kanban drag broken | Check `@dnd-kit` version compatibility |
| Outlook add-in error | Verify `X-API-Key` header matches env var |
| Transcription fails | Check `OPENAI_API_KEY` is set |

---

## Best Practices for AI Assistants

When working on this codebase:

1. **Always read components before modifying** - Don't assume structure
2. **Preserve real-time subscriptions** - Don't break the subscription pattern
3. **Log activity for auditing** - Use `logActivity()` for all mutations
4. **Follow TypeScript strictly** - All types are in `src/types/todo.ts`
5. **Test real-time sync** - Open two browser tabs when testing
6. **Respect owner-only features** - Check `isOwner` for restricted features
7. **Use optimistic updates** - Update UI immediately, persist async
8. **Handle errors gracefully** - Always show user-friendly error messages
9. **Maintain brand colors** - Use Allstate color palette
10. **Test mobile responsiveness** - Use Chrome DevTools mobile view

---

## Refactoring Plan

### 📋 Comprehensive Improvement Roadmap

A **detailed 12-week plan** to address technical debt and architectural issues has been created. This zero-downtime refactoring plan includes:

**Key Improvements:**
- ✅ **OAuth 2.0 Authentication** (Google/Apple) alongside existing PIN system
- ✅ **Enhanced Security** (Argon2 hashing, server-side rate limiting, Row-Level Security)
- ✅ **Normalized Database Schema** (move from JSONB to proper relational tables)
- ✅ **Component Refactoring** (break 2,000+ line components into modular pieces)
- ✅ **State Management** (add Zustand for centralized state)
- ✅ **Comprehensive Testing** (achieve 80%+ test coverage)
- ✅ **Feature Flags** (gradual rollout without breaking existing functionality)

**See [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) for complete details.**

**Strategy:** All improvements use feature flags and dual-write patterns to ensure **zero user disruption** during migration. Old system continues working while new system is built in parallel.

**Timeline:** 12 weeks | **Risk:** Low | **Cost:** ~$36/month additional infrastructure

---

## Orchestrator Agent Guide

This section provides guidance for multi-agent orchestrator systems working on this codebase.

> **📚 Detailed Agent Instructions**: See [docs/AGENT_WORKFLOWS.md](./docs/AGENT_WORKFLOWS.md) for comprehensive role-specific workflows, templates, and checklists.

### Quick Agent Dispatch

```
User Request → Dispatch to Agent
─────────────────────────────────
"Fix bug..."      → Code Reviewer → Engineer
"Add feature..."  → Business Analyst → Tech Lead → Engineers
"Review PR..."    → Code Reviewer
"Security audit"  → Security Reviewer
"Analyze data..." → Data Scientist
"Deploy..."       → Tech Lead
```

### Agent Roles & Responsibilities

| Agent Type | Primary Focus | Key Files | Entry Document |
|------------|---------------|-----------|----------------|
| **Business Analyst** | Requirements, user stories | `PRD.md`, `docs/` | [AGENT_WORKFLOWS.md#business-analyst](./docs/AGENT_WORKFLOWS.md#business-analyst) |
| **Tech Lead** | Architecture, design decisions | `ORCHESTRATOR.md`, `REFACTORING_PLAN.md` | [AGENT_WORKFLOWS.md#tech-lead](./docs/AGENT_WORKFLOWS.md#tech-lead) |
| **Database Engineer** | Schema, migrations | `supabase/migrations/`, `src/types/todo.ts` | [AGENT_WORKFLOWS.md#database-engineer](./docs/AGENT_WORKFLOWS.md#database-engineer) |
| **Backend Engineer** | API routes, server logic | `src/app/api/`, `src/lib/db/` | [AGENT_WORKFLOWS.md#backend-engineer](./docs/AGENT_WORKFLOWS.md#backend-engineer) |
| **Frontend Engineer** | React components, UI/UX | `src/components/`, `src/hooks/`, `src/store/` | [AGENT_WORKFLOWS.md#frontend-engineer](./docs/AGENT_WORKFLOWS.md#frontend-engineer) |
| **Code Reviewer** | Code quality, patterns | All source files | [AGENT_WORKFLOWS.md#code-reviewer](./docs/AGENT_WORKFLOWS.md#code-reviewer) |
| **Security Reviewer** | Auth, vulnerabilities | `src/lib/auth.ts`, `src/middleware.ts` | [AGENT_WORKFLOWS.md#security-reviewer](./docs/AGENT_WORKFLOWS.md#security-reviewer) |
| **Data Scientist** | Analytics, patterns | `docs/DATA_SCIENCE_*.md` | [AGENT_WORKFLOWS.md#data-scientist](./docs/AGENT_WORKFLOWS.md#data-scientist) |

### Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: REQUIREMENTS  → Business Analyst                  │
│  Stage 2: ARCHITECTURE  → Tech Lead + Database Engineer     │
│  Stage 3: IMPLEMENTATION → Backend + Frontend Engineers     │
│  Stage 4: VALIDATION    → Code Reviewer + Security Reviewer │
│  Stage 5: ANALYSIS      → Data Scientist (optional)         │
└─────────────────────────────────────────────────────────────┘
```

### Agent Handoff Protocol

When completing work, create a handoff document in `docs/`:

```markdown
# Agent Handoff: [Feature Name]
**Date**: YYYY-MM-DD | **Agent**: [Role] | **Status**: [Complete/Blocked]

## Completed
- [List of completed items]

## Files Modified
| File | Changes |
|------|---------|

## Next Steps for [Next Agent Role]
1. [Specific instruction]

## Context for Next Agent
[Key information they need]
```

See [docs/PIPELINE_CONTEXT_NEXT_AGENT.md](./docs/PIPELINE_CONTEXT_NEXT_AGENT.md) for a real example.

### Critical Constraints

1. **Real-Time Sync is Critical**: Always clean up subscriptions in `useEffect` returns
2. **Activity Logging Required**: All mutations must call `logActivity()`
3. **Owner-Only Features**: Check `currentUser?.name === 'Derrick'` for restricted features
4. **Optimistic Updates**: Update UI first, persist async, rollback on error
5. **TypeScript Strict**: All types defined in `src/types/todo.ts`
6. **Tailwind Only**: No inline styles, use utility classes

### Before Making Changes

1. Read the relevant component/file first
2. Check for real-time subscription patterns
3. Understand the data flow (component → store → API → database → real-time → all clients)
4. Review related tests in `tests/`
5. Check if feature flags apply (`src/lib/featureFlags.ts`)

### Common Pitfalls to Avoid

| Pitfall | Why It's Bad | Correct Approach |
|---------|--------------|------------------|
| Forgetting activity logging | Audit trail is business requirement | Always call `logActivity()` after mutations |
| Not cleaning up subscriptions | Memory leaks, duplicate events | Return cleanup function in `useEffect` |
| Using anon key server-side | RLS blocks operations | Use `SUPABASE_SERVICE_ROLE_KEY` |
| Skipping optimistic updates | Poor UX, feels slow | Update local state first |
| Breaking TypeScript types | Runtime errors | Extend types in `src/types/todo.ts` |
| Ignoring mobile | 40% of users on mobile | Test with Chrome DevTools mobile view |

### Quick Reference: Key Patterns

```typescript
// Real-time subscription pattern
useEffect(() => {
  const channel = supabase.channel('name').on(...).subscribe();
  return () => supabase.removeChannel(channel);  // REQUIRED cleanup
}, []);

// Optimistic update pattern
const handleAction = async () => {
  setLocalState(newValue);           // Instant UI
  try {
    await supabase.from(...).update(...);
  } catch {
    setLocalState(oldValue);         // Rollback
  }
};

// Activity logging pattern
await logActivity({
  action: 'task_updated',
  todo_id: id,
  todo_text: text,
  user_name: currentUser.name,
  details: { from: old, to: new }
});
```

### Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| [ORCHESTRATOR.md](./ORCHESTRATOR.md) | Quick reference for orchestrator agents | First, for context |
| [CLAUDE.md](./CLAUDE.md) | Detailed developer guide | For deep implementation details |
| [PRD.md](./PRD.md) | Product requirements | For business context |
| [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) | Improvement roadmap | Before major changes |
| [SETUP.md](./SETUP.md) | Installation guide | For environment setup |
| [docs/](./docs/) | Architecture documents | For feature-specific context |

---

**Last Updated:** 2026-01-20
**Version:** 2.3 (Multi-Agent Enhanced)
**Maintained by:** Development Team

## Related Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](./README.md) | User-facing documentation | End users |
| [ORCHESTRATOR.md](./ORCHESTRATOR.md) | Quick reference for orchestrators | Multi-agent systems |
| [docs/AGENT_WORKFLOWS.md](./docs/AGENT_WORKFLOWS.md) | Detailed agent instructions | Individual agents |
| [PRD.md](./PRD.md) | Product requirements | Business Analysts |
| [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) | 12-week improvement roadmap | Tech Leads |
| [SETUP.md](./SETUP.md) | Installation instructions | New developers |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Deploy process | DevOps |
| [SECURITY_IMPROVEMENT_CHECKLIST.md](./SECURITY_IMPROVEMENT_CHECKLIST.md) | Security tasks | Security Reviewers |
| [docs/MULTI_TENANCY_EXECUTION_PLAN.md](./docs/MULTI_TENANCY_EXECUTION_PLAN.md) | 6-phase multi-tenancy plan | All agents (multi-context) |

For questions or issues, refer to this document first, then check the table above for specialized documentation.
