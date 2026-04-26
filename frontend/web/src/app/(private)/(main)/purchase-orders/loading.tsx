export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 bg-muted rounded-lg w-48 mb-2 animate-pulse"></div>
          <div className="h-5 bg-muted rounded-lg w-64 animate-pulse"></div>
        </div>
        <div className="h-10 bg-muted rounded-md w-40 animate-pulse"></div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border">
        <div className="h-10 bg-muted rounded-md w-48 animate-pulse"></div>
        <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
        <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
        <div className="h-10 bg-muted rounded-md w-24 animate-pulse"></div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-card rounded-lg border">
        {/* Table Header */}
        <div className="grid grid-cols-7 gap-4 p-4 border-b">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse"></div>
          ))}
        </div>

        {/* Table Rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
          <div
            key={row}
            className="grid grid-cols-7 gap-4 p-4 border-b last:border-b-0"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((col) => (
              <div
                key={col}
                className="h-4 bg-muted rounded animate-pulse"
              ></div>
            ))}
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
