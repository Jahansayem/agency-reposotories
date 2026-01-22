'use client';

/**
 * DailyDigestSkeleton
 *
 * Skeleton loading state for the Daily Digest panel.
 * Shows placeholder content matching the actual digest sections.
 */

interface SkeletonSectionProps {
  lines?: number;
}

function SkeletonSection({ lines = 3 }: SkeletonSectionProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={`skeleton-line-${i}`}
          className="h-4 bg-[var(--surface-3)] rounded animate-pulse"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

function SkeletonTaskItem() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--surface-3)]/30">
      <div className="w-2 h-2 rounded-full bg-[var(--surface-3)] animate-pulse" />
      <div className="flex-1 h-4 bg-[var(--surface-3)] rounded animate-pulse" />
      <div className="w-12 h-3 bg-[var(--surface-3)] rounded animate-pulse" />
    </div>
  );
}

export default function DailyDigestSkeleton() {
  return (
    <div className="space-y-5">
      {/* Greeting skeleton */}
      <div className="h-5 w-48 bg-[var(--surface-3)] rounded animate-pulse" />

      {/* Overdue section skeleton */}
      <div className="rounded-xl p-4 bg-red-500/5 border border-red-500/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-red-500/20 rounded animate-pulse" />
          <div className="h-4 w-32 bg-red-500/20 rounded animate-pulse" />
        </div>
        <SkeletonSection lines={2} />
        <div className="mt-3 space-y-2">
          <SkeletonTaskItem />
          <SkeletonTaskItem />
        </div>
      </div>

      {/* Today's tasks section skeleton */}
      <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-[var(--surface-3)] rounded animate-pulse" />
          <div className="h-4 w-28 bg-[var(--surface-3)] rounded animate-pulse" />
        </div>
        <SkeletonSection lines={2} />
        <div className="mt-3 space-y-2">
          <SkeletonTaskItem />
          <SkeletonTaskItem />
          <SkeletonTaskItem />
        </div>
      </div>

      {/* Team activity section skeleton */}
      <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-[#C9A227]/20 rounded animate-pulse" />
          <div className="h-4 w-24 bg-[var(--surface-3)] rounded animate-pulse" />
        </div>
        <SkeletonSection lines={3} />
      </div>

      {/* Focus suggestion section skeleton */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-[var(--brand-blue)]/5 to-[#C9A227]/5 border border-[var(--brand-blue)]/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-[var(--brand-blue)]/20 rounded animate-pulse" />
          <div className="h-4 w-24 bg-[var(--surface-3)] rounded animate-pulse" />
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-[#C9A227]/20 rounded animate-pulse flex-shrink-0" />
          <SkeletonSection lines={2} />
        </div>
      </div>
    </div>
  );
}
