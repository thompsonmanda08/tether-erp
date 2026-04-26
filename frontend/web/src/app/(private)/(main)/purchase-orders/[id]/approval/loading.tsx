export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-muted rounded-lg w-72 mb-2 animate-pulse"></div>
          <div className="h-5 bg-muted rounded-lg w-48 animate-pulse"></div>
        </div>
        <div className="h-6 bg-muted rounded-full w-24 animate-pulse"></div>
      </div>

      {/* Approval Panel Skeleton */}
      <div className="bg-card rounded-lg border p-6">
        <div className="h-6 bg-muted rounded w-40 mb-6 animate-pulse"></div>

        {/* Approval Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
            <div className="h-20 bg-muted rounded-md animate-pulse"></div>
          </div>

          <div className="flex space-x-3">
            <div className="h-10 bg-muted rounded-md w-24 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md w-24 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Purchase Order Details Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <div className="h-6 bg-muted rounded w-48 mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="h-6 bg-muted rounded w-32 mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-4 p-3 bg-muted/20 rounded"
              >
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approval History Skeleton */}
      <div className="bg-card rounded-lg border p-6">
        <div className="h-6 bg-muted rounded w-40 mb-4 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3 p-3 bg-muted/10 rounded">
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
