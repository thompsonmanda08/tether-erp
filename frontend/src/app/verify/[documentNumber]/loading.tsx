export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border p-8 max-w-2xl w-full">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="text-center">
            <div className="h-8 bg-muted rounded-lg w-64 mx-auto mb-2 animate-pulse"></div>
            <div className="h-5 bg-muted rounded-lg w-48 mx-auto animate-pulse"></div>
          </div>

          {/* Verification Status */}
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-muted rounded w-40 mx-auto animate-pulse"></div>
          </div>

          {/* Document Details */}
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-40 animate-pulse"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                  <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Preview */}
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-36 animate-pulse"></div>
            <div className="h-48 bg-muted rounded-lg animate-pulse flex items-center justify-center">
              <div className="text-muted-foreground">Loading document...</div>
            </div>
          </div>

          {/* Verification History */}
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-40 animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex space-x-3 p-3 bg-muted/20 rounded">
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md w-28 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
