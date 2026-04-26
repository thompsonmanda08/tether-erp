export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div>
        <div className="h-8 bg-muted rounded-lg w-56 mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded-lg w-64 animate-pulse"></div>
      </div>

      {/* Form Skeleton */}
      <div className="bg-card rounded-lg border p-6">
        <div className="space-y-6">
          {/* Basic Information Section */}
          <div>
            <div className="h-6 bg-muted rounded w-40 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Details Section */}
          <div>
            <div className="h-6 bg-muted rounded w-36 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="h-6 bg-muted rounded w-24 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-4 p-4 bg-muted/20 rounded"
                >
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                  <div className="h-10 bg-muted rounded-md animate-pulse"></div>
                </div>
              ))}
            </div>
            <div className="h-10 bg-muted rounded-md w-32 mt-4 animate-pulse"></div>
          </div>

          {/* Total Section */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="h-8 bg-muted rounded w-40 animate-pulse"></div>
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
