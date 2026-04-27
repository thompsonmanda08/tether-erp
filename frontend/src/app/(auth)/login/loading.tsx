"use client";

export default function Loading() {
  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-card rounded-lg p-8 space-y-6">
        {/* Logo/Title Skeleton */}
        <div className="text-left space-y-2 mb-8">
          <div className="h-8 bg-muted rounded-lg w-32 animate-pulse"></div>
        </div>

        {/* Login Form Skeleton */}
        <div className="space-y-4">
          {/* Email field */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
          </div>

          {/* Login button */}
          <div className="h-10 bg-muted rounded-md animate-pulse"></div>

          {/* Links */}
          <div className="text-center space-y-2">
            <div className="h-4 bg-muted rounded w-32 mx-auto animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-40 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
