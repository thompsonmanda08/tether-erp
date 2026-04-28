"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonPageProps {
  /** Layout preset: matches common page shapes. */
  variant?: "list" | "detail-split" | "form" | "dashboard";
  className?: string;
}

/**
 * Generic page-level skeleton matching the chrome of revamped surfaces.
 * Drop into route loading.tsx files for instant perceived navigation.
 */
export function SkeletonPage({ variant = "list", className }: SkeletonPageProps) {
  if (variant === "detail-split") {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-7 w-24" />
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="min-w-0 flex-1 space-y-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("max-w-3xl space-y-6", className)}>
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4 rounded-lg border border-divider bg-content1 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className={cn("space-y-6", className)}>
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-lg lg:col-span-2" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // default: list
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-lg border border-divider bg-content1">
        <div className="border-b border-divider p-3">
          <Skeleton className="h-9 w-72" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 border-b border-divider/60 p-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1 max-w-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
