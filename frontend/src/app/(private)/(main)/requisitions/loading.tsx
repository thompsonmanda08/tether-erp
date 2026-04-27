const COLUMN_COUNT = 10; // matches requisitions table columns

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded-lg w-48 animate-pulse" />
          <div className="h-5 bg-muted rounded-lg w-96 animate-pulse" />
        </div>
        <div className="h-11 bg-muted rounded-md w-44 mt-2 animate-pulse" />
      </div>

      {/* Filters Skeleton */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="h-4 bg-muted rounded w-12 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search (spans 2 cols) */}
          <div className="col-span-2 space-y-2">
            <div className="h-3 bg-muted rounded w-12 animate-pulse" />
            <div className="h-10 bg-muted rounded-md animate-pulse" />
          </div>
          {/* Status */}
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-12 animate-pulse" />
            <div className="h-9 bg-muted rounded-md animate-pulse" />
          </div>
          {/* Department */}
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-20 animate-pulse" />
            <div className="h-9 bg-muted rounded-md animate-pulse" />
          </div>
          {/* Priority */}
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-14 animate-pulse" />
            <div className="h-9 bg-muted rounded-md animate-pulse" />
          </div>
          {/* Start Date */}
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
            <div className="h-9 bg-muted rounded-md animate-pulse" />
          </div>
          {/* End Date */}
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
            <div className="h-9 bg-muted rounded-md animate-pulse" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-card rounded-lg border">
        {/* Table Header */}
        <div className="grid grid-cols-10 gap-4 p-4 border-b">
          {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" />
          ))}
        </div>
        {/* Table Rows */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-10 gap-4 p-4 border-b last:border-b-0"
          >
            {Array.from({ length: COLUMN_COUNT }).map((_, col) => (
              <div key={col} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-muted rounded w-32 animate-pulse" />
        <div className="flex space-x-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
