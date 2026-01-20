# Codebase Structure

```
shared-todo-list/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main entry (auth + app shell)
│   │   ├── layout.tsx                # Root layout with theme provider
│   │   ├── api/                      # API routes (17 endpoints)
│   │   │   ├── ai/                   # 8 AI endpoints
│   │   │   │   ├── smart-parse/      # Natural language → task
│   │   │   │   ├── enhance-task/     # Improve task clarity
│   │   │   │   ├── breakdown-task/   # Generate subtasks
│   │   │   │   ├── transcribe/       # Whisper transcription
│   │   │   │   ├── parse-voicemail/  # Voicemail → task
│   │   │   │   ├── parse-file/       # Document → tasks
│   │   │   │   ├── parse-content-to-subtasks/
│   │   │   │   └── generate-email/   # Task → customer email
│   │   │   ├── outlook/              # 3 Outlook endpoints
│   │   │   ├── templates/            # Template CRUD
│   │   │   ├── activity/             # Activity logging
│   │   │   ├── attachments/          # File uploads
│   │   │   └── goals/                # Strategic goals (categories, milestones)
│   │   └── outlook-setup/            # Outlook add-in instructions
│   │
│   ├── components/                   # 32+ React components
│   │   ├── MainApp.tsx               # Main app shell
│   │   ├── TodoList.tsx              # List view (~1,200 lines)
│   │   ├── KanbanBoard.tsx           # Kanban view (~800 lines)
│   │   ├── Dashboard.tsx             # Executive dashboard
│   │   ├── ChatPanel.tsx             # Team chat (~2,000 lines)
│   │   ├── StrategicDashboard.tsx    # Owner goals (~1,400 lines)
│   │   ├── ActivityFeed.tsx          # Audit trail
│   │   ├── TodoItem.tsx              # Task list item
│   │   ├── AddTodo.tsx               # Task creation form
│   │   ├── LoginScreen.tsx           # PIN authentication
│   │   └── ...
│   │
│   ├── lib/                          # Utilities
│   │   ├── supabase.ts               # Supabase client
│   │   ├── auth.ts                   # PIN hashing
│   │   ├── activityLogger.ts         # Activity logging helper
│   │   └── duplicateDetection.ts     # Duplicate detection
│   │
│   ├── types/
│   │   └── todo.ts                   # All TypeScript interfaces
│   │
│   ├── hooks/                        # Custom React hooks
│   ├── store/                        # State management
│   ├── contexts/                     # React contexts
│   └── middleware.ts                 # Next.js middleware
│
├── public/
│   └── outlook/                      # Outlook add-in static files
│
├── tests/                            # Playwright E2E tests
├── supabase/
│   └── migrations/                   # SQL migration files
│
├── docs/                             # Documentation
├── CLAUDE.md                         # Comprehensive developer guide
├── ORCHESTRATOR.md                   # Quick reference for orchestrators
├── PRD.md                            # Product requirements
├── REFACTORING_PLAN.md               # 12-week improvement roadmap
└── SETUP.md                          # Installation instructions
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | App entry - auth state, switches Dashboard/Tasks |
| `src/components/MainApp.tsx` | Main shell - orchestrates views, real-time sync |
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/types/todo.ts` | All TypeScript interfaces and enums |
| `src/lib/activityLogger.ts` | Activity logging for audit trail |
