"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceSkeleton() {
  return (
    <div className="space-y-3">
      {/* Skeleton for 3 workspace items */}
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="w-full bg-background rounded-lg p-4 border border-border animate-pulse"
          style={{
            animationDelay: `${index * 150}ms`,
            animationDuration: '1.5s'
          }}
        >
          <div className="flex items-start gap-3">
            {/* Avatar skeleton */}
            <div className="flex-shrink-0">
              <Skeleton className="w-10 h-10 rounded-lg" />
            </div>

            {/* Content skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title */}
              <Skeleton className={`h-5 ${index === 0 ? 'w-40' : index === 1 ? 'w-32' : 'w-36'}`} />
              
              {/* Description */}
              <Skeleton className={`h-4 ${index === 0 ? 'w-56' : index === 1 ? 'w-48' : 'w-52'}`} />
              
              {/* Details row */}
              <div className="flex items-center gap-4 mt-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
                {index === 0 && <Skeleton className="h-3 w-14" />}
              </div>
            </div>

            {/* Arrow skeleton */}
            <div className="flex items-center justify-center">
              <Skeleton className="h-5 w-5 rounded" />
            </div>
          </div>
        </div>
      ))}

      {/* Create new workspace button skeleton */}
      <div 
        className="w-full flex items-center justify-center p-4 border border-dashed border-border rounded-lg animate-pulse"
        style={{
          animationDelay: '450ms',
          animationDuration: '1.5s'
        }}
      >
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}