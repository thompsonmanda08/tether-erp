export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 bg-muted rounded-lg w-48 mb-2 animate-pulse"></div>
          <div className="h-5 bg-muted rounded-lg w-64 animate-pulse"></div>
        </div>
        <div className="flex space-x-2">
          <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
          <div className="h-10 bg-muted rounded-md w-28 animate-pulse"></div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border">
        <div className="h-10 bg-muted rounded-md w-48 animate-pulse"></div>
        <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
        <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
      </div>

      {/* Notifications List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-4">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-muted rounded w-64 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                </div>
                <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                <div className="flex items-center space-x-4 mt-3">
                  <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
                  <div className="h-6 bg-muted rounded-full w-20 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
        <div className="flex space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 w-8 bg-muted rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
