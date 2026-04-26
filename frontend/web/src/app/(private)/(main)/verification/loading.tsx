export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="text-center">
        <div className="h-8 bg-muted rounded-lg w-56 mx-auto mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded-lg w-64 mx-auto animate-pulse"></div>
      </div>

      {/* QR Scanner Card */}
      <div className="bg-card rounded-lg border p-8 max-w-md mx-auto">
        <div className="text-center space-y-6">
          {/* QR Scanner Area */}
          <div className="w-64 h-64 bg-muted rounded-lg mx-auto animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Loading scanner...</div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <div className="h-5 bg-muted rounded w-48 mx-auto animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-56 mx-auto animate-pulse"></div>
          </div>

          {/* Manual Entry Option */}
          <div className="border-t pt-4">
            <div className="h-4 bg-muted rounded w-40 mx-auto mb-3 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 justify-center">
            <div className="h-10 bg-muted rounded-md w-24 animate-pulse"></div>
            <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-card rounded-lg border p-6 max-w-md mx-auto">
        <div className="h-6 bg-muted rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-muted/20 rounded"
            >
              <div className="space-y-1">
                <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-20 animate-pulse"></div>
              </div>
              <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
