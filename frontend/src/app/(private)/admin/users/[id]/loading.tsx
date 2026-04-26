export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-muted rounded-lg w-64 mb-2 animate-pulse"></div>
          <div className="h-5 bg-muted rounded-lg w-48 animate-pulse"></div>
        </div>
        <div className="flex space-x-2">
          <div className="h-10 bg-muted rounded-md w-24 animate-pulse"></div>
          <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 bg-muted rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-4">
            <div>
              <div className="h-6 bg-muted rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                  <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-card rounded-lg border">
        {/* Tab Headers */}
        <div className="flex border-b">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-6 py-3">
              <div className="h-5 bg-muted rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Personal Information */}
          <div className="space-y-6">
            <div>
              <div className="h-6 bg-muted rounded w-40 mb-4 animate-pulse"></div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                    <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role & Permissions */}
            <div>
              <div className="h-6 bg-muted rounded w-48 mb-4 animate-pulse"></div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <div className="h-10 bg-muted rounded-md w-24 animate-pulse"></div>
              <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
