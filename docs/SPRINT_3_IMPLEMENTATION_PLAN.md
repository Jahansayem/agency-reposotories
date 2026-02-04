# Sprint 3 Implementation Plan: Performance, PWA, and Advanced Features

**Status:** Planning
**Priority:** P1-P2 (High to Medium Priority)
**Duration:** 4 weeks (80 hours estimated)
**Sprint Goal:** Enhance performance, add offline support, implement advanced collaboration features

---

## Overview

Sprint 3 focuses on:
1. **Performance Optimization** - Improve app speed and responsiveness
2. **PWA Features** - Add offline support and installability
3. **Advanced Collaboration** - Real-time presence, typing indicators, read receipts
4. **Data Management** - Implement caching, lazy loading, and efficient data fetching
5. **Issue #25** - Chat Image Attachments (deferred from Sprint 2)

---

## Sprint 3 Issues (32 total)

### Category 1: Performance Optimization (20 hours)

#### Issue #29: Code Splitting and Lazy Loading (P1)
**Priority:** High
**Components:** Multiple
**Estimated Time:** 4 hours

**Problem:**
- Large initial bundle size (all components load upfront)
- Slow Time to Interactive on mobile
- Heavy components like KanbanBoard, StrategicDashboard load even when not used

**Solution:**
```tsx
// Lazy load heavy components
const KanbanBoard = dynamic(() => import('./KanbanBoard'), {
  loading: () => <SkeletonKanbanBoard />,
  ssr: false,
});

const StrategicDashboard = dynamic(() => import('./StrategicDashboard'), {
  loading: () => <SkeletonDashboard />,
  ssr: false,
});

const CustomerEmailModal = dynamic(() => import('./CustomerEmailModal'), {
  loading: () => <SkeletonForm />,
  ssr: false,
});
```

**Metrics:**
- Initial bundle size: Reduce by 30%+ (from ~450KB to ~315KB)
- Time to Interactive: Improve by 25%+
- First Contentful Paint: < 1.5s

**Test Cases:**
- Initial page load without Kanban → Kanban bundle not loaded
- Switch to Kanban view → Lazy load with skeleton
- Open email modal → Dynamic import with loading state
- Measure bundle sizes with `next build --profile`

---

#### Issue #30: Image Optimization (P1)
**Priority:** High
**Components:** `AttachmentList.tsx`, `ChatPanel.tsx`
**Estimated Time:** 3 hours

**Problem:**
- Unoptimized images slow down page load
- Large attachments not resized for thumbnails
- No WebP/AVIF support

**Solution:**
```tsx
// Use Next.js Image component for optimization
import Image from 'next/image';

// In AttachmentList thumbnail
<Image
  src={thumbnailUrl}
  alt={attachment.file_name}
  width={300}
  height={200}
  className="w-full h-full object-cover"
  loading="lazy"
  quality={80}
  placeholder="blur"
  blurDataURL={generateBlurDataURL(attachment.id)}
/>

// API: Generate thumbnails on upload
// POST /api/attachments
// - Resize images to 600x400 (thumbnail)
// - Convert to WebP for web delivery
// - Store original + thumbnail
```

**Test Cases:**
- Upload large image → thumbnail generated
- Thumbnails use WebP format
- Lazy loading works correctly
- Blur placeholder appears before load

---

#### Issue #31: React Query for Data Fetching (P1)
**Priority:** High
**Components:** Multiple
**Estimated Time:** 5 hours

**Problem:**
- Manual data fetching with useState/useEffect
- No caching (refetches on every mount)
- No optimistic updates standardized
- Stale data management inconsistent

**Solution:**
```tsx
// Install @tanstack/react-query
npm install @tanstack/react-query

// Setup QueryClient
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Use in components
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function TodoList() {
  const queryClient = useQueryClient();

  // Fetch todos with caching
  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: () => supabase.from('todos').select('*'),
  });

  // Optimistic update mutation
  const { mutate: completeTodo } = useMutation({
    mutationFn: (id: string) =>
      supabase.from('todos').update({ completed: true }).eq('id', id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['todos']);

      // Optimistic update
      queryClient.setQueryData(['todos'], (old) =>
        old.map(t => t.id === id ? { ...t, completed: true } : t)
      );

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context.previous);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

**Test Cases:**
- Data cached between component mounts
- Optimistic updates work correctly
- Rollback on error
- Stale data refetched properly

---

#### Issue #32: Memoization and Rendering Optimization (P1)
**Priority:** High
**Components:** `TodoList.tsx`, `ChatPanel.tsx`, `Dashboard.tsx`
**Estimated Time:** 4 hours

**Problem:**
- TodoList re-renders all items on any change
- Expensive computations recalculated on every render
- Large lists (100+ todos) cause lag

**Solution:**
```tsx
// Memoize expensive computations
const filteredTodos = useMemo(() => {
  return todos.filter(todo => {
    // Complex filtering logic
  });
}, [todos, filters]);

const sortedTodos = useMemo(() => {
  return [...filteredTodos].sort((a, b) => {
    // Sorting logic
  });
}, [filteredTodos, sortBy]);

// Memoize TodoItem to prevent unnecessary re-renders
const TodoItem = memo(({ todo, onToggle, onDelete }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.todo.id === nextProps.todo.id &&
         prevProps.todo.completed === nextProps.todo.completed &&
         prevProps.todo.text === nextProps.todo.text;
});

// Use React.memo for pure components
const ProgressSummary = memo(({ todos }) => {
  const stats = useMemo(() => calculateStats(todos), [todos]);
  return <div>{/* Render stats */}</div>;
});
```

**Test Cases:**
- TodoItem doesn't re-render when unrelated todo changes
- Expensive computations only run when dependencies change
- Performance profiling shows reduced render time
- 100+ todos scroll smoothly (60fps)

---

#### Issue #33: Virtual Scrolling for Large Lists (P2)
**Priority:** Medium
**Components:** `TodoList.tsx`, `ActivityFeed.tsx`
**Estimated Time:** 4 hours

**Problem:**
- Rendering 500+ todos causes lag
- ActivityFeed with 1000+ items slows down

**Solution:**
```tsx
// Install react-virtual
npm install @tanstack/react-virtual

import { useVirtualizer } from '@tanstack/react-virtual';

function TodoList({ todos }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: todos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated item height
    overscan: 5, // Render 5 items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TodoItem todo={todos[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Test Cases:**
- 1000+ todos render smoothly
- Only visible items in DOM
- Scroll performance at 60fps
- Search/filter updates virtual list correctly

---

### Category 2: Progressive Web App (PWA) (16 hours)

#### Issue #34: Service Worker Implementation (P1)
**Priority:** High
**Components:** Root
**Estimated Time:** 5 hours

**Problem:**
- App requires internet connection
- No offline fallback
- Not installable on mobile/desktop

**Solution:**
```ts
// Install next-pwa
npm install next-pwa

// next.config.ts
import withPWA from 'next-pwa';

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

// public/manifest.json
{
  "name": "Bealer Agency Todo List",
  "short_name": "Bealer Todo",
  "description": "Task management for Bealer Agency insurance team",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#0033A0",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "business"],
  "screenshots": [
    {
      "src": "/screenshot-mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-desktop.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

**Test Cases:**
- App installs on mobile (Add to Home Screen)
- App installs on desktop (Chrome, Edge)
- Offline fallback page shows when disconnected
- Service worker caches static assets
- Service worker updates on new deployment

---

#### Issue #35: Offline Mode with IndexedDB (P1)
**Priority:** High
**Components:** Multiple
**Estimated Time:** 6 hours

**Problem:**
- No offline task management
- Data lost if offline when creating task
- Poor experience in low-connectivity areas

**Solution:**
```tsx
// Install idb
npm install idb

// src/lib/offlineStorage.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TodoDB extends DBSchema {
  todos: {
    key: string;
    value: Todo;
    indexes: { 'by-created': string };
  };
  pendingActions: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      payload: any;
      createdAt: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<TodoDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TodoDB>('bealer-todo-db', 1, {
      upgrade(db) {
        const todoStore = db.createObjectStore('todos', { keyPath: 'id' });
        todoStore.createIndex('by-created', 'created_at');

        db.createObjectStore('pendingActions', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

// Sync todos to IndexedDB
export async function cacheTodos(todos: Todo[]) {
  const db = await getDB();
  const tx = db.transaction('todos', 'readwrite');
  await Promise.all(todos.map(todo => tx.store.put(todo)));
  await tx.done;
}

// Get cached todos
export async function getCachedTodos(): Promise<Todo[]> {
  const db = await getDB();
  return db.getAll('todos');
}

// Queue offline action
export async function queueAction(action: PendingAction) {
  const db = await getDB();
  await db.put('pendingActions', action);
}

// Sync pending actions when online
export async function syncPendingActions() {
  const db = await getDB();
  const actions = await db.getAll('pendingActions');

  for (const action of actions) {
    try {
      if (action.type === 'create') {
        await supabase.from('todos').insert(action.payload);
      } else if (action.type === 'update') {
        await supabase.from('todos').update(action.payload).eq('id', action.payload.id);
      } else if (action.type === 'delete') {
        await supabase.from('todos').delete().eq('id', action.payload.id);
      }

      // Remove from pending actions
      await db.delete('pendingActions', action.id);
    } catch (error) {
      console.error('Failed to sync action:', action, error);
    }
  }
}

// Use in TodoList
function TodoList() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from cache first, then sync with server
  useEffect(() => {
    async function loadTodos() {
      // Load from IndexedDB immediately
      const cached = await getCachedTodos();
      setTodos(cached);

      // Sync with server if online
      if (isOnline) {
        const { data } = await supabase.from('todos').select('*');
        if (data) {
          setTodos(data);
          await cacheTodos(data);
        }
      }
    }

    loadTodos();
  }, [isOnline]);

  // Create todo (offline-capable)
  const handleCreate = async (text: string) => {
    const newTodo = {
      id: uuidv4(),
      text,
      created_at: new Date().toISOString(),
      // ... other fields
    };

    // Optimistic update
    setTodos(prev => [newTodo, ...prev]);

    if (isOnline) {
      // Sync immediately if online
      await supabase.from('todos').insert(newTodo);
    } else {
      // Queue for later sync if offline
      await queueAction({
        id: uuidv4(),
        type: 'create',
        payload: newTodo,
        createdAt: new Date().toISOString(),
      });
    }

    // Cache locally
    await cacheTodos([newTodo, ...todos]);
  };
}
```

**Test Cases:**
- Create task while offline → queued for sync
- Go online → pending tasks sync automatically
- Offline indicator shows in UI
- Cached data loads instantly on app open
- Conflict resolution (local vs server changes)

---

#### Issue #36: Push Notifications (P2)
**Priority:** Medium
**Components:** Root
**Estimated Time:** 5 hours

**Problem:**
- No notifications for task assignments
- Miss important updates when app closed
- No reminders for due tasks

**Solution:**
```tsx
// Request notification permission
async function requestNotificationPermission() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: currentUser.id,
        }),
      });
    }
  }
}

// Server-side: Send notification
// POST /api/push-send
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@bealeragency.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request: Request) {
  const { userId, title, body, url } = await request.json();

  // Get user's push subscriptions
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId);

  for (const { token } of tokens) {
    await webpush.sendNotification(
      JSON.parse(token),
      JSON.stringify({
        title,
        body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: { url },
      })
    );
  }
}

// Trigger notifications
// When task assigned to user
await fetch('/api/push-send', {
  method: 'POST',
  body: JSON.stringify({
    userId: task.assigned_to_id,
    title: 'New Task Assigned',
    body: `"${task.text}" assigned to you by ${currentUser.name}`,
    url: `/tasks/${task.id}`,
  }),
});

// When task due soon
// (cron job checks every hour)
const dueSoon = await supabase
  .from('todos')
  .select('*')
  .gte('due_date', new Date().toISOString())
  .lt('due_date', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString());

for (const task of dueSoon) {
  await fetch('/api/push-send', {
    method: 'POST',
    body: JSON.stringify({
      userId: task.assigned_to_id,
      title: 'Task Due Soon',
      body: `"${task.text}" is due in 2 hours`,
      url: `/tasks/${task.id}`,
    }),
  });
}
```

**Test Cases:**
- Notification permission prompt on first visit
- Push notification received when task assigned
- Notification click opens specific task
- Due date reminders sent 2 hours before
- Notifications work on mobile and desktop

---

### Category 3: Advanced Collaboration (18 hours)

#### Issue #37: Real-Time Presence Indicators (P1)
**Priority:** High
**Components:** `UserList.tsx`, `ChatPanel.tsx`
**Estimated Time:** 4 hours

**Problem:**
- Can't see who's online
- Don't know if teammate is actively working

**Solution:**
```tsx
// Track user presence
import { usePresence } from '@/hooks/usePresence';

function UserList({ users }) {
  const { onlineUsers, userActivity } = usePresence(users);

  return (
    <div className="user-list">
      {users.map(user => (
        <div key={user.id} className="user-item">
          <div className="relative">
            <Avatar user={user} />
            {/* Online indicator */}
            {onlineUsers.includes(user.id) && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
          <span>{user.name}</span>
          {/* Activity status */}
          {userActivity[user.id] && (
            <span className="text-xs text-muted">
              {userActivity[user.id] === 'typing' && 'typing...'}
              {userActivity[user.id] === 'viewing-task' && 'viewing task'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// src/hooks/usePresence.ts
export function usePresence(users: User[]) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [userActivity, setUserActivity] = useState<Record<string, string>>({});

  useEffect(() => {
    const channel = supabase.channel('presence', {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = Object.keys(state);
        setOnlineUsers(online);

        // Extract activity
        const activity: Record<string, string> = {};
        for (const [userId, presences] of Object.entries(state)) {
          const latest = presences[0] as { activity?: string };
          if (latest.activity) {
            activity[userId] = latest.activity;
          }
        }
        setUserActivity(activity);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
            activity: 'idle',
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [users]);

  return { onlineUsers, userActivity };
}

// Update activity when user does something
function broadcastActivity(activity: string) {
  const channel = supabase.channel('presence');
  channel.track({
    user_id: currentUser.id,
    activity,
    updated_at: new Date().toISOString(),
  });
}

// Usage
<input
  onFocus={() => broadcastActivity('editing-task')}
  onBlur={() => broadcastActivity('idle')}
/>
```

**Test Cases:**
- User shows as online when logged in
- User shows as offline when app closed
- Activity updates in real-time
- Multiple users' presence tracked correctly
- Presence syncs across tabs

---

#### Issue #38: Enhanced Typing Indicators (P2)
**Priority:** Medium
**Components:** `ChatPanel.tsx`
**Estimated Time:** 3 hours

**Problem:**
- Typing indicator already exists but basic
- Shows "User is typing..." for all messages
- Doesn't show in DMs vs team chat differently

**Solution:**
```tsx
// Enhanced typing indicator with user avatars
function TypingIndicator({ typingUsers }: { typingUsers: TypingUser[] }) {
  if (typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      {/* Show avatars of typing users */}
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user) => (
          <Avatar
            key={user.id}
            user={user}
            size="sm"
            className="border-2 border-white"
          />
        ))}
      </div>

      {/* Typing text */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted">
          {typingUsers.length === 1 && `${typingUsers[0].name} is typing`}
          {typingUsers.length === 2 && `${typingUsers[0].name} and ${typingUsers[1].name} are typing`}
          {typingUsers.length > 2 && `${typingUsers.length} people are typing`}
        </span>
        <div className="flex gap-0.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-current"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-current"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-current"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
```

**Test Cases:**
- Shows correct user names when typing
- Multiple users typing shows "X people are typing"
- Typing indicator disappears after 3 seconds of inactivity
- Works in both team chat and DMs

---

#### Issue #39: Read Receipts (P2)
**Priority:** Medium
**Components:** `ChatPanel.tsx`, `ChatMessageList.tsx`
**Estimated Time:** 4 hours

**Problem:**
- Can't tell if message was read
- No "seen by" functionality
- Unclear if team saw important update

**Solution:**
```tsx
// Database: Add read_by column to messages (already exists)
// UI: Show read indicators

function ChatMessage({ message, users }) {
  const readByUsers = users.filter(u => message.read_by?.includes(u.name));

  return (
    <div className="message">
      <div className="message-content">{message.text}</div>

      {/* Read receipts */}
      {message.created_by === currentUser.name && readByUsers.length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          {/* Checkmark icon */}
          <div className="flex -space-x-1">
            {readByUsers.slice(0, 3).map((user) => (
              <Avatar
                key={user.id}
                user={user}
                size="xs"
                className="w-4 h-4 border border-white"
                title={`Seen by ${user.name}`}
              />
            ))}
          </div>
          {readByUsers.length > 3 && (
            <span className="text-xs text-muted">
              +{readByUsers.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Mark message as read when scrolled into view
function ChatMessageList({ messages }) {
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            markAsRead(messageId);
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const markAsRead = async (messageId: string) => {
    const { data: message } = await supabase
      .from('messages')
      .select('read_by')
      .eq('id', messageId)
      .single();

    if (!message.read_by?.includes(currentUser.name)) {
      await supabase
        .from('messages')
        .update({
          read_by: [...(message.read_by || []), currentUser.name],
        })
        .eq('id', messageId);
    }
  };

  return (
    <div>
      {messages.map((message) => (
        <div
          key={message.id}
          data-message-id={message.id}
          ref={(el) => {
            if (el) observerRef.current?.observe(el);
          }}
        >
          <ChatMessage message={message} users={users} />
        </div>
      ))}
    </div>
  );
}
```

**Test Cases:**
- Message marked as read when scrolled into view
- Read receipts show avatars of readers
- Own messages show who has read
- Others' messages don't show read receipts to sender

---

#### Issue #40: Collaborative Editing Indicators (P2)
**Priority:** Medium
**Components:** `TodoItem.tsx`
**Estimated Time:** 4 hours

**Problem:**
- Two users can edit same task simultaneously
- Changes overwrite each other
- No indication someone else is viewing/editing

**Solution:**
```tsx
// Show who's currently viewing/editing a task
function TodoItem({ todo }) {
  const { viewingUsers, editingUsers } = useTaskPresence(todo.id);

  return (
    <div className="todo-item">
      <div className="todo-content">{todo.text}</div>

      {/* Show who's viewing/editing */}
      {(viewingUsers.length > 0 || editingUsers.length > 0) && (
        <div className="flex items-center gap-2 mt-2">
          {editingUsers.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {editingUsers.map((user) => (
                  <Avatar
                    key={user.id}
                    user={user}
                    size="xs"
                    className="w-5 h-5 border-2 border-amber-500"
                  />
                ))}
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400">
                editing
              </span>
            </div>
          )}

          {viewingUsers.length > 0 && editingUsers.length === 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {viewingUsers.map((user) => (
                  <Avatar
                    key={user.id}
                    user={user}
                    size="xs"
                    className="w-5 h-5"
                  />
                ))}
              </div>
              <span className="text-xs text-muted">viewing</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Track task presence
function useTaskPresence(taskId: string) {
  const [viewingUsers, setViewingUsers] = useState<User[]>([]);
  const [editingUsers, setEditingUsers] = useState<User[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`task-${taskId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const viewing: User[] = [];
        const editing: User[] = [];

        for (const [userId, presences] of Object.entries(state)) {
          const latest = presences[0] as { mode: 'viewing' | 'editing'; user: User };
          if (latest.mode === 'editing') {
            editing.push(latest.user);
          } else {
            viewing.push(latest.user);
          }
        }

        setViewingUsers(viewing);
        setEditingUsers(editing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user: currentUser,
            mode: 'viewing',
            taskId,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  const setMode = (mode: 'viewing' | 'editing') => {
    const channel = supabase.channel(`task-${taskId}`);
    channel.track({
      user: currentUser,
      mode,
      taskId,
    });
  };

  return { viewingUsers, editingUsers, setMode };
}

// Usage in edit modal
function TaskDetailModal({ task }) {
  const { setMode } = useTaskPresence(task.id);

  return (
    <Modal>
      <input
        onFocus={() => setMode('editing')}
        onBlur={() => setMode('viewing')}
      />
    </Modal>
  );
}
```

**Test Cases:**
- Users viewing task show with avatar badges
- Users editing task show with amber border
- Presence updates in real-time
- Presence cleared when user leaves task

---

#### Issue #41: Version History (P2)
**Priority:** Medium
**Components:** `TodoItem.tsx`
**Estimated Time:** 3 hours

**Problem:**
- Can't see previous versions of task
- Don't know what changed
- Can't undo accidental edits

**Solution:**
```tsx
// Database: Create task_history table
CREATE TABLE task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL, -- Full task state
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_type TEXT NOT NULL -- 'created', 'updated', 'completed', 'deleted'
);

// Trigger to auto-create history on update
CREATE OR REPLACE FUNCTION create_task_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_history (task_id, snapshot, changed_by, changed_at, change_type)
  VALUES (
    OLD.id,
    row_to_json(OLD),
    NEW.updated_by,
    NOW(),
    CASE
      WHEN OLD.completed = false AND NEW.completed = true THEN 'completed'
      WHEN OLD.completed = true AND NEW.completed = false THEN 'reopened'
      ELSE 'updated'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_history_trigger
AFTER UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION create_task_history();

// UI: Show version history
function VersionHistoryModal({ task }: { task: Todo }) {
  const [history, setHistory] = useState<TaskHistory[]>([]);

  useEffect(() => {
    async function loadHistory() {
      const { data } = await supabase
        .from('task_history')
        .select('*')
        .eq('task_id', task.id)
        .order('changed_at', { ascending: false });

      setHistory(data || []);
    }

    loadHistory();
  }, [task.id]);

  const restoreVersion = async (version: TaskHistory) => {
    await supabase
      .from('todos')
      .update(version.snapshot)
      .eq('id', task.id);
  };

  return (
    <Modal>
      <h2>Version History</h2>
      <div className="space-y-2">
        {history.map((version) => (
          <div key={version.id} className="version-item">
            <div className="flex items-center gap-2">
              <Avatar user={version.changed_by} size="sm" />
              <div>
                <p className="font-medium">{version.change_type}</p>
                <p className="text-xs text-muted">
                  {formatDistanceToNow(new Date(version.changed_at))} ago
                </p>
              </div>
            </div>

            {/* Show what changed */}
            <div className="mt-2 text-sm">
              {version.snapshot.text !== task.text && (
                <div>
                  <span className="text-muted">Text:</span>{' '}
                  <span className="line-through">{task.text}</span> →{' '}
                  <span>{version.snapshot.text}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => restoreVersion(version)}
              className="mt-2 text-sm text-accent"
            >
              Restore this version
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

**Test Cases:**
- History created automatically on task update
- Can view all previous versions
- Can restore previous version
- Shows who made each change
- Shows what changed (diff)

---

### Category 4: Deferred from Sprint 2 (2 hours)

#### Issue #25: Chat Image Attachments (P1)
**Priority:** High
**Components:** `ChatPanel.tsx`, `ChatMessageList.tsx`
**Estimated Time:** 2 hours

**Problem:**
- Chat messages can't include images
- No way to share screenshots/photos in chat
- Database schema doesn't support message attachments

**Solution:**
```sql
-- Add attachments column to messages table
ALTER TABLE messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Same structure as task attachments
{
  "id": "uuid",
  "file_name": "screenshot.png",
  "file_type": "image",
  "file_size": 1048576,
  "mime_type": "image/png",
  "storage_path": "messages/message-id/screenshot.png",
  "uploaded_by": "Derrick",
  "uploaded_at": "2026-02-01T12:00:00Z"
}
```

```tsx
// UI: Add file upload to chat input
function ChatInput() {
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(files);
  };

  const handleSend = async () => {
    // Upload attachments first
    const uploadedAttachments = await Promise.all(
      attachments.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('messageId', 'temp-id');

        const response = await fetch('/api/chat/attachments', {
          method: 'POST',
          body: formData,
        });

        return response.json();
      })
    );

    // Create message with attachments
    await supabase.from('messages').insert({
      text: inputValue,
      attachments: uploadedAttachments,
      created_by: currentUser.name,
    });
  };

  return (
    <div>
      <input type="text" value={inputValue} onChange={...} />
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />
      {attachments.length > 0 && (
        <div className="attachment-preview">
          {attachments.map((file) => (
            <img key={file.name} src={URL.createObjectURL(file)} />
          ))}
        </div>
      )}
      <button onClick={handleSend}>Send</button>
    </div>
  );
}

// Display image attachments inline (from Sprint 2 Issue #25 spec)
function ChatMessage({ message }) {
  return (
    <div>
      <p>{message.text}</p>

      {message.attachments?.map((attachment) => (
        <div key={attachment.id} className="mt-2">
          {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.file_name) ? (
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={attachment.url}
                alt={attachment.file_name}
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                loading="lazy"
              />
            </a>
          ) : (
            <a
              href={attachment.url}
              download={attachment.file_name}
              className="flex items-center gap-2 p-2 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-sm">{attachment.file_name}</span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Test Cases:**
- Upload image in chat → appears inline
- Multiple images in one message
- Non-image files → download link
- Click image → open full size
- Lazy loading works

---

### Category 5: Additional Improvements (6 hours)

#### Issue #42: Animation Polish (P2)
**Priority:** Medium
**Components:** Multiple
**Estimated Time:** 2 hours

**Solution:**
- Add spring animations to modals
- Improve task completion animation
- Add celebration confetti for milestone completion
- Stagger list item animations
- Add micro-interactions (button press, checkbox toggle)

---

#### Issue #43: Performance Monitoring Dashboard (P2)
**Priority:** Medium
**Components:** New
**Estimated Time:** 2 hours

**Solution:**
- Add `/admin/performance` route (owner-only)
- Display Core Web Vitals (LCP, FID, CLS)
- Show bundle size over time
- Track API response times
- Monitor real-time connection stability

---

#### Issue #44: Documentation Updates (P2)
**Priority:** Medium
**Components:** Docs
**Estimated Time:** 2 hours

**Solution:**
- Update CLAUDE.md with Sprint 3 features
- Create PWA_GUIDE.md for offline mode
- Document performance optimization techniques
- Update API documentation
- Create TROUBLESHOOTING.md

---

## Implementation Order

### Week 1: Performance Optimization
- Issue #29: Code Splitting (4h)
- Issue #30: Image Optimization (3h)
- Issue #31: React Query (5h)
- Issue #32: Memoization (4h)
**Total:** 16 hours

### Week 2: PWA Foundation
- Issue #34: Service Worker (5h)
- Issue #35: Offline Mode (6h)
- Issue #33: Virtual Scrolling (4h)
**Total:** 15 hours

### Week 3: Advanced Collaboration
- Issue #37: Presence Indicators (4h)
- Issue #38: Enhanced Typing (3h)
- Issue #39: Read Receipts (4h)
- Issue #40: Collaborative Editing (4h)
- Issue #41: Version History (3h)
**Total:** 18 hours

### Week 4: Polish & Completion
- Issue #25: Chat Attachments (2h)
- Issue #36: Push Notifications (5h)
- Issue #42: Animation Polish (2h)
- Issue #43: Performance Dashboard (2h)
- Issue #44: Documentation (2h)
- Testing and bug fixes (8h)
**Total:** 21 hours

---

## Success Criteria

### Sprint 3 Complete When:
- ✅ Initial bundle size reduced by 30%+
- ✅ App installable as PWA on mobile and desktop
- ✅ Offline mode functional with IndexedDB caching
- ✅ Push notifications working for assignments and reminders
- ✅ Presence indicators show online users
- ✅ Read receipts implemented in chat
- ✅ Virtual scrolling handles 1000+ items smoothly
- ✅ React Query integrated for data fetching
- ✅ Chat image attachments working
- ✅ 30+ new E2E tests passing

### Metrics to Track:
- **Bundle Size:** 450KB → 315KB (30% reduction)
- **Time to Interactive:** 3.5s → 2.5s (Mobile 3G)
- **First Contentful Paint:** 2.1s → 1.4s
- **Lighthouse Performance Score:** 75 → 90+
- **Offline Capability:** 0% → 80% of features
- **Install Rate:** 0% → 20% of mobile users

---

## Risk Assessment

### Medium Risk:
- Service Worker conflicts with Next.js hot reload
- IndexedDB sync conflicts with Supabase real-time
- Push notifications require VAPID keys and setup
- Virtual scrolling may break existing UI layouts

### Low Risk:
- Code splitting with Next.js dynamic imports
- Image optimization with Next/Image
- React Query integration (well-documented)
- Presence indicators (already using Supabase presence)

### Mitigation:
- Test service worker in production mode only
- Implement conflict resolution for offline sync
- Gradual rollout of push notifications (opt-in)
- Feature flags for virtual scrolling
- Comprehensive E2E tests before deployment

---

## Dependencies

### External Libraries:
- `@tanstack/react-query` - Data fetching
- `@tanstack/react-virtual` - Virtual scrolling
- `next-pwa` - PWA support
- `idb` - IndexedDB wrapper
- `web-push` - Push notifications
- `workbox` - Service worker utilities

### Infrastructure:
- VAPID keys for push notifications
- Service worker registration
- manifest.json for PWA
- PWA icons (192x192, 512x512)

---

## Rollout Plan

### Phase 1 (Week 1): Performance
- Deploy code splitting
- Deploy image optimization
- Deploy React Query
- Monitor performance improvements

### Phase 2 (Week 2): PWA Core
- Deploy service worker
- Deploy offline mode
- Enable app installation
- Beta test with Derrick & Sefra

### Phase 3 (Week 3): Collaboration
- Deploy presence indicators
- Deploy read receipts
- Deploy collaborative editing
- Monitor real-time performance

### Phase 4 (Week 4): Complete & Polish
- Deploy chat attachments
- Deploy push notifications
- Deploy animations
- Full rollout to all users

---

**End of Sprint 3 Implementation Plan**
