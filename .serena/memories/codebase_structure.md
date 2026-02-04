# Codebase Structure

```
shared-todo-list/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main entry (auth + app shell)
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── globals.css               # Global styles
│   │   ├── join/[token]/             # Invitation acceptance
│   │   ├── signup/                   # Registration
│   │   ├── outlook-setup/            # Outlook add-in instructions
│   │   └── api/                      # API routes (46 endpoints)
│   │       ├── ai/                   # 11 AI endpoints
│   │       ├── auth/                 # Authentication (login, register)
│   │       ├── outlook/              # 3 Outlook endpoints
│   │       ├── todos/                # Task CRUD + reorder + waiting
│   │       ├── agencies/             # Multi-agency management
│   │       ├── invitations/          # Team invitations
│   │       ├── goals/                # Strategic goals (categories, milestones)
│   │       ├── push-notifications/   # Push delivery
│   │       ├── reminders/            # Reminder processing
│   │       ├── digest/               # Daily digest
│   │       ├── patterns/             # Insurance pattern analysis
│   │       ├── security/             # Security events
│   │       ├── templates/            # Task templates
│   │       ├── activity/             # Activity logging
│   │       └── attachments/          # File uploads
│   │
│   ├── components/                   # React components (100+)
│   │   ├── ui/                       # Reusable UI primitives (20+)
│   │   ├── chat/                     # Chat components (6)
│   │   ├── layout/                   # Layout components (9)
│   │   ├── task-detail/              # Task detail modal (10)
│   │   ├── todo/                     # Todo list components (10)
│   │   ├── dashboard/                # Dashboard components (8)
│   │   ├── kanban/                   # Kanban components (4)
│   │   ├── task/                     # Task card components (6)
│   │   ├── views/                    # Page-level views (4)
│   │   └── *.tsx                     # Top-level components (60+)
│   │
│   ├── hooks/                        # Custom React hooks (31)
│   │   ├── useTodoData.ts            # Todo fetching & mutations
│   │   ├── useFilters.ts             # Filter state management
│   │   ├── useBulkActions.ts         # Multi-select operations
│   │   ├── useChatMessages.ts        # Chat messaging
│   │   ├── usePresence.ts            # User presence
│   │   ├── usePushNotifications.ts   # Push notifications
│   │   ├── usePerformanceMonitor.ts  # Performance metrics
│   │   ├── useOfflineSupport.ts      # Offline sync
│   │   ├── usePermission.ts          # Permission checking
│   │   └── ...                       # And 22 more
│   │
│   ├── lib/                          # Utilities (45+)
│   │   ├── supabaseClient.ts         # Database client
│   │   ├── auth.ts                   # PIN authentication
│   │   ├── activityLogger.ts         # Audit logging
│   │   ├── duplicateDetection.ts     # Duplicate detection
│   │   ├── fileValidator.ts          # Upload security
│   │   ├── featureFlags.ts           # Feature toggles
│   │   ├── serverLockout.ts          # Redis lockout
│   │   ├── fieldEncryption.ts        # AES-256 encryption
│   │   ├── sessionValidator.ts       # Session management
│   │   ├── securityMonitor.ts        # SIEM integration
│   │   ├── insurancePatterns.ts      # Task categorization
│   │   ├── db/todoService.ts         # Database operations
│   │   └── ...                       # And 30+ more
│   │
│   ├── store/                        # State management
│   │   └── todoStore.ts              # Zustand store
│   │
│   ├── contexts/                     # React contexts (4)
│   │   ├── ThemeContext.tsx          # Dark mode
│   │   ├── UserContext.tsx           # Current user
│   │   ├── AgencyContext.tsx         # Multi-agency
│   │   └── ModalStateContext.tsx     # Modal management
│   │
│   ├── types/                        # TypeScript definitions
│   │   ├── todo.ts                   # Core types
│   │   └── agency.ts                 # Agency types
│   │
│   └── middleware.ts                 # Next.js middleware
│
├── ios-app/                          # Native iOS app (Swift/SwiftUI)
│   ├── SharedTodoList/
│   │   ├── Features/                 # Feature modules
│   │   ├── Data/                     # Models, services
│   │   └── Core/                     # Utilities
│   └── Widgets/                      # Home screen widgets
│
├── public/
│   ├── outlook/                      # Outlook add-in files
│   ├── sounds/                       # Notification sounds
│   └── sw.js                         # Service worker (PWA)
│
├── tests/                            # Test files
│   ├── unit/                         # Unit tests (Vitest)
│   ├── integration/                  # Integration tests
│   ├── e2e/                          # E2E tests (Playwright)
│   ├── factories/                    # Test factories
│   └── helpers/                      # Test utilities
│
├── supabase/
│   ├── migrations/                   # SQL migrations (30+)
│   └── functions/                    # Edge functions
│
├── scripts/                          # Utility scripts
├── docs/                             # Documentation (60+)
│
├── CLAUDE.md                         # Comprehensive developer guide
├── ORCHESTRATOR.md                   # Quick reference for AI agents
├── PRD.md                            # Product requirements
├── REFACTORING_PLAN.md               # Improvement roadmap
└── SETUP.md                          # Installation instructions
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | App entry - auth state, main routing |
| `src/components/MainApp.tsx` | Main shell - view orchestration, real-time |
| `src/store/todoStore.ts` | Zustand store - global state |
| `src/lib/supabaseClient.ts` | Supabase client initialization |
| `src/types/todo.ts` | All TypeScript interfaces and enums |
| `src/lib/activityLogger.ts` | Activity logging for audit trail |
| `src/contexts/AgencyContext.tsx` | Multi-agency context provider |
| `src/hooks/usePermission.ts` | Permission checking hook |
