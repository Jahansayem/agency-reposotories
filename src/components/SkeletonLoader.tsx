'use client';

/**
 * Skeleton Loader Component
 *
 * Issue #27: Loading States Consistency (Sprint 2, Category 7)
 *
 * Provides consistent loading placeholders across the app:
 * - TodoList skeleton
 * - Dashboard skeleton
 * - ChatPanel skeleton
 * - Generic skeleton components
 *
 * Usage:
 * ```tsx
 * {loading ? <SkeletonTodoList /> : <TodoList todos={todos} />}
 * ```
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton element with shimmer animation
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[var(--surface-2)] via-[var(--surface-3)] to-[var(--surface-2)] bg-[length:200%_100%] rounded-[var(--radius-lg)] ${className}`}
      style={{
        animation: 'shimmer 2s ease-in-out infinite',
      }}
    />
  );
}

/**
 * Skeleton for a single todo item
 */
export function SkeletonTodoItem() {
  return (
    <div className="p-4 border-b border-[var(--border)] animate-pulse">
      <div className="flex items-start gap-3">
        {/* Checkbox skeleton */}
        <Skeleton className="w-5 h-5 flex-shrink-0 mt-0.5" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>

        {/* Action buttons skeleton */}
        <div className="flex items-center gap-1">
          <Skeleton className="w-8 h-8 rounded-[var(--radius-md)]" />
          <Skeleton className="w-8 h-8 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for todo list (3 items)
 */
export function SkeletonTodoList() {
  return (
    <div className="space-y-0" data-testid="skeleton-todo-list">
      <SkeletonTodoItem />
      <SkeletonTodoItem />
      <SkeletonTodoItem />
    </div>
  );
}

/**
 * Skeleton for a chat message
 */
export function SkeletonChatMessage({ isSent = false }: { isSent?: boolean }) {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3 animate-pulse`}>
      <div className={`max-w-[80%] ${isSent ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Sender name skeleton (only for received messages) */}
        {!isSent && <Skeleton className="h-3 w-16 mb-1" />}

        {/* Message bubble skeleton */}
        <div className={`p-3 rounded-[var(--radius-lg)] ${isSent ? 'bg-[var(--accent-light)]' : 'bg-[var(--surface-2)]'}`}>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Timestamp skeleton */}
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

/**
 * Skeleton for chat panel (5 messages)
 */
export function SkeletonChatPanel() {
  return (
    <div className="space-y-2" data-testid="skeleton-chat-panel">
      <SkeletonChatMessage isSent={false} />
      <SkeletonChatMessage isSent={true} />
      <SkeletonChatMessage isSent={false} />
      <SkeletonChatMessage isSent={true} />
      <SkeletonChatMessage isSent={false} />
    </div>
  );
}

/**
 * Skeleton for a dashboard stat card
 */
export function SkeletonStatCard() {
  return (
    <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)] animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-8 h-8 rounded-[var(--radius-md)]" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * Skeleton for dashboard (4 stat cards + chart)
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6" data-testid="skeleton-dashboard">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Chart skeleton */}
      <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)] animate-pulse">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>

      {/* Activity feed skeleton */}
      <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)] animate-pulse">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for a kanban column
 */
export function SkeletonKanbanColumn() {
  return (
    <div className="flex-1 min-w-[280px] animate-pulse">
      <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)]">
        {/* Column header */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-8 rounded-full" />
        </div>

        {/* Cards */}
        <div className="space-y-3">
          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)]">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)]">
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for kanban board (3 columns)
 */
export function SkeletonKanbanBoard() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" data-testid="skeleton-kanban-board">
      <SkeletonKanbanColumn />
      <SkeletonKanbanColumn />
      <SkeletonKanbanColumn />
    </div>
  );
}

/**
 * Generic text skeleton
 */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a list item (generic)
 */
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)] animate-pulse">
      <Skeleton className="w-10 h-10 rounded-[var(--radius-md)]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a list (5 items)
 */
export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-2" data-testid="skeleton-list">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a form
 */
export function SkeletonForm() {
  return (
    <div className="space-y-4 animate-pulse" data-testid="skeleton-form">
      {/* Form field 1 */}
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Form field 2 */}
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Form field 3 (textarea) */}
      <div>
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>

      {/* Submit button */}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/**
 * Add shimmer animation to global styles
 */
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
