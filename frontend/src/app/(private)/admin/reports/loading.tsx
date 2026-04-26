export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div>
        <div className="h-8 bg-muted rounded-lg w-40 mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded-lg w-64 animate-pulse"></div>
      </div>

      {/* Report Filters */}
      <div className="bg-card rounded-lg border p-6">
        <div className="h-6 bg-muted rounded w-32 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>
          <div className="flex items-end">
            <div className="h-10 bg-muted rounded-md w-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-muted rounded w-20 mb-2 animate-pulse"></div>
                <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
              </div>
              <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
              <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
            </div>
            <div className="h-[300px] bg-muted rounded-lg animate-pulse flex items-center justify-center">
              <div className="text-muted-foreground">Loading chart...</div>
            </div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
            <div className="flex space-x-2">
              <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
              <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 p-4 border-b">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse"></div>
          ))}
        </div>

        {/* Table Rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
          <div
            key={row}
            className="grid grid-cols-6 gap-4 p-4 border-b last:border-b-0"
          >
            {[1, 2, 3, 4, 5, 6].map((col) => (
              <div
                key={col}
                className="h-4 bg-muted rounded animate-pulse"
              ></div>
            ))}
          </div>
        ))}
      </div>

      {/* Export Options */}
      <div className="flex justify-end space-x-2">
        <div className="h-10 bg-muted rounded-md w-24 animate-pulse"></div>
        <div className="h-10 bg-muted rounded-md w-28 animate-pulse"></div>
        <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
      </div>
    </div>
  );
}
