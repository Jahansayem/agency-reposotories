# Zero-Downtime Refactoring Plan: Bealer Agency Todo List

**Version:** 1.0
**Created:** 2026-01-08
**Timeline:** 12 weeks
**Risk Level:** Low
**User Impact:** Zero disruption during migration

---

## Executive Strategy

This plan implements a **dual-track approach**:
1. **Background development branch** with all improvements
2. **Feature flags** for gradual rollout
3. **Database migrations** that maintain backward compatibility
4. **Comprehensive testing** before cutover
5. **Rollback capability** at every stage

**Key Principle:** Old system continues working while new system is built in parallel.

---

## Phase 1: Foundation & Safety Net (Weeks 1-2)

### Week 1: Setup & Monitoring

#### Task 1.1: Create Development Infrastructure
```bash
# Create parallel development branch
git checkout -b refactor/security-and-architecture
git push -u origin refactor/security-and-architecture

# Setup feature flag system
npm install @vercel/flags
```

**Feature Flag Service:**
```typescript
// src/lib/featureFlags.ts
export type FeatureFlag =
  | 'new_auth_system'
  | 'oauth_login'
  | 'normalized_schema'
  | 'refactored_components'
  | 'new_state_management'
  | 'server_rate_limiting';

export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  const flags = {
    new_auth_system: process.env.NEXT_PUBLIC_ENABLE_NEW_AUTH === 'true',
    oauth_login: process.env.NEXT_PUBLIC_ENABLE_OAUTH === 'true',
    normalized_schema: process.env.NEXT_PUBLIC_ENABLE_NEW_SCHEMA === 'true',
    refactored_components: process.env.NEXT_PUBLIC_ENABLE_NEW_COMPONENTS === 'true',
    new_state_management: process.env.NEXT_PUBLIC_ENABLE_ZUSTAND === 'true',
    server_rate_limiting: process.env.ENABLE_RATE_LIMITING === 'true',
  };

  return flags[flag] || false;
}
```

#### Task 1.2: Add Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

#### Task 1.3: Add Comprehensive Logging
```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.info(`[INFO] ${message}`, context);
  },
  error: (message: string, error: Error, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, error, context);
    Sentry.captureException(error, { extra: context });
  },
};
```

### Week 2: Testing Infrastructure

#### Task 2.1: Add Unit Testing Framework
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom happy-dom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

#### Task 2.2: Create Mock Data Factories
```typescript
// tests/factories/todoFactory.ts
import { faker } from '@faker-js/faker';
import { Todo } from '@/types/todo';

export const createMockTodo = (overrides?: Partial<Todo>): Todo => ({
  id: faker.string.uuid(),
  text: faker.lorem.sentence(),
  completed: false,
  status: 'todo',
  priority: 'medium',
  created_at: faker.date.recent().toISOString(),
  created_by: 'Test User',
  ...overrides,
});
```

---

## Phase 2: Critical Security Fixes (Weeks 3-5)

### Week 3-4: OAuth 2.0 Authentication (Google/Apple)

#### Task 3.1: Setup NextAuth.js with OAuth Providers
```bash
npm install next-auth @auth/supabase-adapter
```

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import { SupabaseAdapter } from '@auth/supabase-adapter';

export const authOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add user ID to session
      session.user.id = user.id;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### Task 3.2: Update Database Schema for OAuth
```sql
-- supabase/migrations/20250115_oauth_support.sql

-- Add OAuth fields to users table
ALTER TABLE users
  ADD COLUMN email TEXT UNIQUE,
  ADD COLUMN email_verified TIMESTAMP WITH TIME ZONE,
  ADD COLUMN image TEXT,
  ADD COLUMN auth_provider TEXT DEFAULT 'pin', -- 'pin', 'google', 'apple'
  ADD COLUMN provider_account_id TEXT;

-- Keep PIN auth for backward compatibility
-- auth_version = 1: PIN only
-- auth_version = 2: OAuth only
-- auth_version = 3: Both PIN and OAuth

-- Create accounts table for NextAuth
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Create sessions table for NextAuth
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
```

#### Task 3.3: Backward-Compatible Login Screen
```typescript
// src/components/LoginScreen.tsx (updated)
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [authMode, setAuthMode] = useState<'pin' | 'oauth'>('pin');
  const useOAuth = await isFeatureEnabled('oauth_login');

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        {/* Existing PIN login */}
        {authMode === 'pin' && (
          <div>
            <h2>Login with PIN</h2>
            {/* Existing PIN input UI */}
          </div>
        )}

        {/* OAuth login (behind feature flag) */}
        {useOAuth && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="flex items-center justify-center px-4 py-2 border rounded-lg"
              >
                <GoogleIcon className="w-5 h-5 mr-2" />
                Google
              </button>

              <button
                onClick={() => signIn('apple', { callbackUrl: '/' })}
                className="flex items-center justify-center px-4 py-2 border rounded-lg"
              >
                <AppleIcon className="w-5 h-5 mr-2" />
                Apple
              </button>
            </div>
          </>
        )}

        {/* Link accounts option for existing users */}
        {useOAuth && user && user.auth_version === 1 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Link your Google or Apple account for faster login next time
            </p>
            <button
              onClick={() => setAuthMode('oauth')}
              className="mt-2 text-sm text-blue-600 underline"
            >
              Link Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Task 3.4: Session Management with NextAuth
```typescript
// src/app/page.tsx (updated)
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      // Try NextAuth session first (if OAuth enabled)
      if (session?.user) {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (user) {
          setCurrentUser(user);
          return;
        }
      }

      // Fall back to PIN session (backward compatibility)
      const pinSession = getStoredSession();
      if (pinSession) {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', pinSession.userId)
          .single();

        if (user) {
          setCurrentUser(user);
        }
      }
    };

    loadUser();
  }, [session]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return <MainApp currentUser={currentUser} />;
}
```

### Week 5: Server-Side Rate Limiting

#### Task 5.1: Setup Upstash Redis
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// src/lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiters = {
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
  }),
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
  }),
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
  }),
};

export async function withRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{ success: boolean; remaining?: number }> {
  const { success, remaining } = await limiter.limit(identifier);
  return { success, remaining };
}
```

#### Task 5.2: Apply to All API Routes
```typescript
// src/middleware.ts (new file)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiters, withRateLimit } from '@/lib/rateLimit';

export async function middleware(request: NextRequest) {
  // Skip rate limiting if feature flag is off
  if (process.env.ENABLE_RATE_LIMITING !== 'true') {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  // Apply rate limit
  const { success, remaining } = await withRateLimit(ip, rateLimiters.api);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': '60' }
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', remaining?.toString() || '0');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## Phase 3: Database Schema Normalization (Weeks 6-7)

### Week 6: Create Normalized Tables

#### Task 6.1: Add New Tables (Non-Breaking)
```sql
-- supabase/migrations/20250122_normalized_schema.sql

-- New subtasks table
CREATE TABLE subtasks_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  estimated_minutes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subtasks_v2_todo_id ON subtasks_v2(todo_id);

-- New attachments table
CREATE TABLE attachments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_v2_todo_id ON attachments_v2(todo_id);

-- User assignments table
CREATE TABLE user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(todo_id, user_id)
);

CREATE INDEX idx_user_assignments_todo ON user_assignments(todo_id);
CREATE INDEX idx_user_assignments_user ON user_assignments(user_id);
```

#### Task 6.2: Create Dual-Write Service Layer
```typescript
// src/lib/db/todoService.ts
export class TodoService {
  async createTodo(todo: Partial<Todo>): Promise<Todo> {
    const useNewSchema = await isFeatureEnabled('normalized_schema');

    // Always write to old schema (backward compatibility)
    const { data: newTodo } = await supabase
      .from('todos')
      .insert({ ...todo, subtasks: todo.subtasks || [] })
      .select()
      .single();

    // Also write to new schema if enabled
    if (useNewSchema && todo.subtasks?.length) {
      await supabase
        .from('subtasks_v2')
        .insert(
          todo.subtasks.map((st, idx) => ({
            todo_id: newTodo.id,
            text: st.text,
            completed: st.completed,
            priority: st.priority,
            display_order: idx,
          }))
        );
    }

    return newTodo;
  }
}
```

### Week 7: Background Data Migration

#### Task 7.1: Create Migration Script
```typescript
// scripts/migrate-to-normalized-schema.ts
import { createClient } from '@supabase/supabase-js';

const BATCH_SIZE = 100;

async function migrateTodos() {
  console.log('🚀 Starting migration...');

  const { count } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true });

  let offset = 0;

  while (offset < count!) {
    const { data: todos } = await supabase
      .from('todos')
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1);

    for (const todo of todos || []) {
      await migrateSingleTodo(todo);
    }

    offset += BATCH_SIZE;
    console.log(`✅ Migrated ${offset}/${count}`);
  }
}

async function migrateSingleTodo(todo: any) {
  // Migrate subtasks from JSONB to table
  if (todo.subtasks?.length) {
    await supabase.from('subtasks_v2').insert(
      todo.subtasks.map((st: any, idx: number) => ({
        id: st.id,
        todo_id: todo.id,
        text: st.text,
        completed: st.completed,
        priority: st.priority,
        display_order: idx,
      }))
    );
  }

  // Migrate attachments
  if (todo.attachments?.length) {
    await supabase.from('attachments_v2').insert(
      todo.attachments.map((att: any) => ({
        id: att.id,
        todo_id: todo.id,
        file_name: att.file_name,
        file_type: att.file_type,
        file_size: att.file_size,
        storage_path: att.storage_path,
        mime_type: att.mime_type,
        uploaded_by: att.uploaded_by,
      }))
    );
  }
}
```

---

## Phase 4: Component Refactoring (Weeks 8-10)

### Week 8-9: Break Down Mega Components

#### Task 8.1: Refactor TodoList (2,646 → 600 lines)

**Extract hooks:**
```typescript
// src/hooks/useTodoData.ts
export function useTodoData(currentUser: AuthUser) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch todos
    // Setup real-time subscription
  }, [currentUser]);

  return { todos, loading };
}
```

**Extract components:**
```typescript
// src/components/todo/TodoFilters.tsx
export function TodoFilters({ quickFilter, onFilterChange }: Props) {
  return (
    <div className="flex gap-2">
      {/* Filter UI */}
    </div>
  );
}
```

**Use with feature flag:**
```typescript
// src/components/TodoList.tsx
export default function TodoList() {
  const useNewComponents = process.env.NEXT_PUBLIC_USE_NEW_COMPONENTS === 'true';

  return useNewComponents ? <TodoListRefactored /> : <TodoListLegacy />;
}
```

### Week 10: Add State Management

#### Task 10.1: Setup Zustand
```bash
npm install zustand
```

```typescript
// src/store/todoStore.ts
import { create } from 'zustand';

interface TodoState {
  todos: Todo[];
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
}

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],
  setTodos: (todos) => set({ todos }),
  addTodo: (todo) => set((state) => ({ todos: [todo, ...state.todos] })),
  updateTodo: (id, updates) => set((state) => ({
    todos: state.todos.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
}));
```

---

## Phase 5: Testing & Documentation (Week 11)

### Week 11: Comprehensive Testing

#### Task 11.1: Unit Tests
```typescript
// tests/unit/hooks/useTodoData.test.ts
import { renderHook } from '@testing-library/react';
import { useTodoData } from '@/hooks/useTodoData';

describe('useTodoData', () => {
  it('should fetch todos on mount', async () => {
    const { result } = renderHook(() => useTodoData(mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.todos).toHaveLength(2);
  });
});
```

#### Task 11.2: Update Documentation
Create comprehensive documentation:
- MIGRATION_GUIDE.md
- OAUTH_SETUP.md
- ROLLBACK_GUIDE.md
- Updated README.md

---

## Phase 6: Gradual Rollout (Week 12)

### Week 12: Staged Deployment

#### Day 1-2: Security (100% rollout)
```bash
ENABLE_RATE_LIMITING=true
```

#### Day 3-5: OAuth (10% → 100%)
```bash
NEXT_PUBLIC_ENABLE_OAUTH=true
```

#### Day 6-7: Components (50% → 100%)
```bash
NEXT_PUBLIC_USE_NEW_COMPONENTS=true
```

---

## Rollback Procedures

### If OAuth Breaks
```bash
# Instant rollback
NEXT_PUBLIC_ENABLE_OAUTH=false
# Users continue with PIN login
```

### If Schema Migration Fails
```bash
# Stop migration
pkill -f migrate

# Restore from backup
psql $DATABASE_URL < backup.sql

# Disable new schema
NEXT_PUBLIC_ENABLE_NORMALIZED_SCHEMA=false
```

### If Components Break
```bash
# Instant rollback
NEXT_PUBLIC_USE_NEW_COMPONENTS=false
# Old components still work
```

---

## Success Metrics

### Security
- ✅ OAuth 2.0 login working
- ✅ Rate limiting blocks attacks
- ✅ Zero brute force successes

### Code Quality
- ✅ Component size < 300 lines
- ✅ Test coverage > 80%
- ✅ Bundle size < 800KB

### Performance
- ✅ Time to Interactive < 2s
- ✅ First Contentful Paint < 1s

---

## Cost Estimate

### Infrastructure
- Upstash Redis: $10/month
- Sentry: $26/month
- **Total: $36/month**

### Developer Time
- 12 weeks × 1 developer = **3 months FTE**
- Estimated: $30K-$50K

---

## Environment Variables Reference

```bash
# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-secret
NEXTAUTH_SECRET=random-secret-key
NEXTAUTH_URL=https://your-domain.com

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Feature Flags
NEXT_PUBLIC_ENABLE_OAUTH=false
NEXT_PUBLIC_ENABLE_NEW_AUTH=false
NEXT_PUBLIC_ENABLE_NORMALIZED_SCHEMA=false
NEXT_PUBLIC_USE_NEW_COMPONENTS=false
NEXT_PUBLIC_ENABLE_ZUSTAND=false
ENABLE_RATE_LIMITING=false
```

---

## Next Steps

**Phase 1 is ready to start immediately:**
1. Create feature flag system
2. Setup Sentry
3. Add Vitest
4. Create test factories

All work on `refactor/security-and-architecture` branch with **zero user impact**.
