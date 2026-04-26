"use client";

export default function Loading() {
  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-card rounded-lg p-8 space-y-6">
        {/* Logo/Title Skeleton */}
        <div className="text-left space-y-2 mb-8">
          <div className="h-8 bg-muted rounded-lg w-32 animate-pulse"></div>
          <div className="h-5 bg-muted rounded w-40 animate-pulse"></div>
        </div>

        {/* Form Skeleton */}
        <div className="space-y-4">
          {/* New Password field */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>

          {/* Confirm Password field */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>

          {/* Submit button */}
          <div className="h-10 bg-muted rounded-md animate-pulse"></div>

          {/* Back to login link */}
          <div className="text-center">
            <div className="h-4 bg-muted rounded w-28 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
