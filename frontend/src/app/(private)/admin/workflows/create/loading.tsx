export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div>
        <div className="h-8 bg-muted rounded-lg w-56 mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded-lg w-64 animate-pulse"></div>
      </div>

      {/* Workflow Builder Skeleton */}
      <div className="bg-card rounded-lg border p-6">
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <div className="h-6 bg-muted rounded w-40 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-muted rounded-md animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                <div className="h-10 bg-muted rounded-md animate-pulse"></div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
              <div className="h-20 bg-muted rounded-md animate-pulse"></div>
            </div>
          </div>

          {/* Workflow Steps */}
          <div>
            <div className="h-6 bg-muted rounded w-36 mb-4 animate-pulse"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
                    <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                      <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                      <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-10 bg-muted rounded-md w-32 mt-4 animate-pulse"></div>
          </div>

          {/* Conditions & Rules */}
          <div>
            <div className="h-6 bg-muted rounded w-44 mb-4 animate-pulse"></div>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-muted/20 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                      <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                      <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                      <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
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
  );
}
