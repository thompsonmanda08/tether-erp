export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div>
        <div className="h-8 bg-muted rounded-lg w-48 mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded-lg w-64 animate-pulse"></div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex space-x-4">
          <div className="flex-1 h-12 bg-muted rounded-md animate-pulse"></div>
          <div className="h-12 bg-muted rounded-md w-32 animate-pulse"></div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="bg-card rounded-lg border p-4">
        <div className="h-5 bg-muted rounded w-24 mb-4 animate-pulse"></div>
        <div className="flex flex-wrap gap-4">
          <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
          <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
          <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
          <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
        </div>
      </div>

      {/* Search Results Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-muted rounded w-40 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
        </div>

        {/* Results List */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="h-6 bg-muted rounded-full w-20 animate-pulse"></div>
                  <div className="h-5 bg-muted rounded w-48 animate-pulse"></div>
                </div>
                <div className="h-4 bg-muted rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
              </div>
              <div className="h-6 bg-muted rounded-full w-24 animate-pulse"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
              <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
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
