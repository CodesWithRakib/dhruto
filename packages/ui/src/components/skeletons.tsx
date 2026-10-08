import { cn } from "../lib/utils.js";
import { Skeleton } from "./skeleton.js";

function SkeletonText({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-4"
          style={{ width: `${index === lines - 1 ? 55 : 92 - ((index * 13) % 25)}%` }}
        />
      ))}
    </div>
  );
}

function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}

/**
 * Layout-matching loading placeholders. Compose these — never a generic
 * full-page spinner — so the skeleton resembles the final UI and avoids CLS.
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  showToolbar = true,
  className,
}: {
  rows?: number;
  columns?: number;
  showToolbar?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl border border-border/70 bg-surface shadow-soft", className)}
      aria-hidden="true"
    >
      {showToolbar ? (
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <Skeleton className="h-10 w-full sm:w-80" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      ) : null}
      <div className="space-y-0 divide-y divide-border/60 px-4 py-2 sm:px-5">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 py-3.5">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={col}
                className="h-4"
                style={{ width: `${Math.max(12, ((col * 37 + row * 11) % 60) + 18)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 sm:px-5">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-surface p-4 sm:p-5", className)} aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

export function KpiGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-3 sm:p-4"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden="true">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-32" />
      </div>
    </div>
  );
}

export function DetailsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden="true">
      <div className="rounded-2xl border border-border/70 bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-surface p-5">
          <SkeletonText lines={4} />
        </div>
        <div className="rounded-xl border border-border/70 bg-surface p-5">
          <SkeletonText lines={4} />
        </div>
      </div>
      <div className="rounded-xl border border-border/70 bg-surface p-5">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-surface p-5", className)} aria-hidden="true">
      <div className="flex items-center justify-between pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex h-48 items-end gap-2 sm:h-56">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + ((index * 37) % 65)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export { SkeletonText, SkeletonAvatar };
