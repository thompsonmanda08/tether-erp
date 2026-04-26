export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div>
        <div className="h-8 bg-muted rounded-lg w-40 mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded-lg w-64 animate-pulse"></div>
      </div>

      {/* Settings Tabs */}
      <div className="bg-card rounded-lg border">
        {/* Tab Headers */}
        <div className="flex border-b">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-6 py-3">
              <div className="h-5 bg-muted rounded w-20 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Settings */}
          <div className="space-y-6">
            <div>
              <div className="h-6 bg-muted rounded w-32 mb-4 animate-pulse"></div>
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-20 h-20 bg-muted rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 bg-muted rounded w-48 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                  <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                    <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Preferences */}
            <div>
              <div className="h-6 bg-muted rounded w-48 mb-4 animate-pulse"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-muted/20 rounded"
                  >
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-48 animate-pulse"></div>
                    </div>
                    <div className="w-12 h-6 bg-muted rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Settings */}
            <div>
              <div className="h-6 bg-muted rounded w-36 mb-4 animate-pulse"></div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-36 animate-pulse"></div>
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded">
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded w-40 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-56 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
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
