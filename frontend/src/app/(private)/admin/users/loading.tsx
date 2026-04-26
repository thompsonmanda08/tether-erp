export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 bg-muted rounded-lg w-48 mb-2 animate-pulse"></div>
            <div className="h-5 bg-muted rounded-lg w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
        </div>
      </div>

      {/* User Management Tabs Skeleton */}
      <div className="container mx-auto px-4">
        <div className="bg-card rounded-lg border">
          {/* Tab Headers */}
          <div className="flex border-b">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-3">
                <div className="h-5 bg-muted rounded w-20 animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="h-10 bg-muted rounded-md w-48 animate-pulse"></div>
              <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
              <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
              <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-lg border">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 p-4 border-b">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-4 bg-muted rounded animate-pulse"
                  ></div>
                ))}
              </div>

              {/* Table Rows */}
              {[1, 2, 3, 4 , 5].map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-6 gap-4 p-4 border-b last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
                    </div>
                  </div>
                  {[1, 2, 3, 4, 5].map((col) => (
                    <div
                      key={col}
                      className="h-4 bg-muted rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
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
        </div>
      </div>
    </div>
  );
}
